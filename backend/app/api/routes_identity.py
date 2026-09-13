"""Mock-only Aadhaar anchor and cross-document identity consistency APIs."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import crud
from app.db.models import ApiKey, IdentityCorrelation, IdentityDocument, IdentityProfile, User
from app.db.session import get_db
from app.auth.dependencies import get_current_user_flexible
from app.modules.identity_correlation import compare_identity_fields, verify_mock_aadhaar
from app.modules.module6_report.generator import generate_report
from app.schemas.identity import AadhaarVerificationRequest, AadhaarVerificationResponse, CorrelateScanRequest, CorrelationResponse

router = APIRouter(prefix="/api/identity", tags=["identity correlation"])


def _field_text(fields: dict[str, Any], key: str) -> str:
    value = fields.get(key, {})
    return str(value.get("text", "")) if isinstance(value, dict) else str(value or "")


async def _owned_profile(
    db: AsyncSession, identity_id: str, user: User,
) -> IdentityProfile:
    profile = await db.get(IdentityProfile, identity_id)
    # Return 404 for unauthorized IDs rather than confirming that another
    # tenant's synthetic identity anchor exists.
    if profile is None or profile.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Synthetic identity anchor not found.")
    return profile


@router.post("/aadhaar/verify", response_model=AadhaarVerificationResponse)
async def verify_aadhaar(
    payload: AadhaarVerificationRequest,
    db: AsyncSession = Depends(get_db),
    auth: tuple[User, ApiKey | None] = Depends(get_current_user_flexible),
) -> AadhaarVerificationResponse:
    """Verify only against the local synthetic provider; never contacts UIDAI."""
    synthetic = verify_mock_aadhaar(payload.aadhaar_number)
    if synthetic is None:
        return AadhaarVerificationResponse(provider="Mock/Synthetic Aadhaar Verification", verified=False)

    user, _ = auth
    # The provider's static demo identifier is namespaced per tenant. This
    # prevents one API user from reading another user's anchor/graph.
    identity_id = f"{synthetic['identity_id']}-{str(user.id)[:8]}"
    profile = await db.get(IdentityProfile, identity_id)
    if profile is None:
        profile = IdentityProfile(
            id=identity_id, owner_user_id=user.id, normalized_name=synthetic["name"],
            dob=synthetic["dob"], gender=synthetic["gender"], aadhaar_verified=True,
        )
        db.add(profile)
        await db.flush()
    return AadhaarVerificationResponse(
        provider="Mock/Synthetic Aadhaar Verification", identity_id=profile.id, verified=True,
        attributes={"name": profile.normalized_name, "dob": profile.dob, "gender": profile.gender},
    )


@router.post("/correlate/{scan_id}", response_model=CorrelationResponse)
async def correlate_scan(
    scan_id: str,
    payload: CorrelateScanRequest,
    db: AsyncSession = Depends(get_db),
    auth: tuple[User, ApiKey | None] = Depends(get_current_user_flexible),
) -> CorrelationResponse:
    user, _ = auth
    profile = await _owned_profile(db, payload.identity_id, user)
    if not profile.aadhaar_verified:
        raise HTTPException(status_code=404, detail="Synthetic identity anchor not found or not verified.")
    scan = await crud.get_scan(db, scan_id)
    scan_result = await crud.get_scan_result(db, scan_id)
    if scan is None or scan_result is None:
        raise HTTPException(status_code=404, detail="Scan result not found.")
    if scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan result not found.")
    if scan.status != "done":
        raise HTTPException(status_code=status.HTTP_425_TOO_EARLY, detail="Scan is not complete.")

    fields = scan_result.extracted_fields or {}
    comparison = compare_identity_fields(
        {"name": profile.normalized_name, "dob": profile.dob, "gender": profile.gender, "face_embedding": profile.face_embedding},
        {"name": _field_text(fields, "full_name"), "dob": _field_text(fields, "dob"), "gender": _field_text(fields, "gender")},
    )
    document = (await db.execute(select(IdentityDocument).where(IdentityDocument.scan_id == scan.id))).scalar_one_or_none()
    if document is None:
        document = IdentityDocument(identity_profile_id=profile.id, scan_id=scan.id, document_type=scan.document_type, status=comparison["status"], correlation_score=comparison["overall_score"])
        db.add(document)
        await db.flush()
    else:
        document.status, document.correlation_score = comparison["status"], comparison["overall_score"]

    correlation = IdentityCorrelation(identity_profile_id=profile.id, target_document_id=document.id, **{key: comparison[key] for key in ("name_similarity", "dob_match", "gender_match", "face_similarity", "overall_score", "status")})
    db.add(correlation)

    # Separate, deterministic risk aggregation. It never changes the ML input vector.
    component = 0.0 if comparison["overall_score"] is None else (1.0 - comparison["overall_score"]) * get_settings().identity_correlation_risk_max
    if comparison["status"] == "mismatch":
        component = max(component, get_settings().identity_correlation_risk_max)
    identity_risk = dict(scan_result.identity_risk or {})
    identity_risk["identity_correlation"] = {"identity_id": profile.id, **comparison, "risk_component": round(component, 1), "provider": "Mock/Synthetic Aadhaar Verification"}
    final_score = min(100.0, float(scan_result.risk_score) + component)
    final_band = "high" if final_score >= 65 else "medium" if final_score >= 35 else "low"
    top_features = list(scan_result.top_features or [])
    if component:
        top_features.insert(0, f"Cross-document identity consistency risk: +{component:.1f}")
    await crud.upsert_scan_result(db, scan_id, identity_risk=identity_risk, risk_score=round(final_score, 1), risk_band=final_band, top_features=top_features[:6])
    # Regenerate the deterministic report so it distinguishes forensic risk
    # from the new synthetic-anchor consistency finding.
    report = await generate_report({
        "scan_id": scan_id,
        "document_type": scan.document_type,
        "extracted_fields": fields,
        "validation": scan_result.validation or {},
        "tampering": scan_result.tampering or {},
        "face_verification": scan_result.face_verification,
        "identity_risk": identity_risk,
        "risk_model": {"score": final_score, "band": final_band, "top_features": top_features[:6]},
    })
    await crud.upsert_scan_result(db, scan_id, report_text_en=report.text_en, report_text_hi=report.text_hi)

    return CorrelationResponse(identity_id=profile.id, scan_id=scan_id, document_type=scan.document_type, **comparison)


@router.get("/{identity_id}")
async def get_identity(identity_id: str, db: AsyncSession = Depends(get_db), auth: tuple[User, ApiKey | None] = Depends(get_current_user_flexible)) -> dict[str, Any]:
    profile = await _owned_profile(db, identity_id, auth[0])
    return {"identity_id": profile.id, "provider": "Mock/Synthetic Aadhaar Verification", "verified": profile.aadhaar_verified, "attributes": {"name": profile.normalized_name, "dob": profile.dob, "gender": profile.gender}}


@router.get("/{identity_id}/documents")
async def get_documents(identity_id: str, db: AsyncSession = Depends(get_db), auth: tuple[User, ApiKey | None] = Depends(get_current_user_flexible)) -> list[dict[str, Any]]:
    await _owned_profile(db, identity_id, auth[0])
    documents = (await db.execute(select(IdentityDocument).where(IdentityDocument.identity_profile_id == identity_id))).scalars().all()
    return [{"scan_id": str(item.scan_id), "document_type": item.document_type, "score": item.correlation_score, "status": item.status} for item in documents]


@router.get("/{identity_id}/correlations")
async def get_correlations(identity_id: str, db: AsyncSession = Depends(get_db), auth: tuple[User, ApiKey | None] = Depends(get_current_user_flexible)) -> list[dict[str, Any]]:
    await _owned_profile(db, identity_id, auth[0])
    rows = (await db.execute(
        select(IdentityCorrelation, IdentityDocument)
        .join(IdentityDocument, IdentityCorrelation.target_document_id == IdentityDocument.id)
        .where(IdentityCorrelation.identity_profile_id == identity_id)
        .order_by(IdentityCorrelation.created_at.desc())
    )).all()
    return [{"scan_id": str(document.scan_id), "source": "anchor", "target": str(document.scan_id), "name_similarity": row.name_similarity, "dob_match": row.dob_match, "gender_match": row.gender_match, "face_similarity": row.face_similarity, "overall_score": row.overall_score, "status": row.status} for row, document in rows]


@router.get("/{identity_id}/graph")
async def get_graph(identity_id: str, db: AsyncSession = Depends(get_db), auth: tuple[User, ApiKey | None] = Depends(get_current_user_flexible)) -> dict[str, Any]:
    profile = await _owned_profile(db, identity_id, auth[0])
    documents = (await db.execute(select(IdentityDocument).where(IdentityDocument.identity_profile_id == identity_id))).scalars().all()
    document_items = [{"scan_id": str(item.scan_id), "document_type": item.document_type, "score": item.correlation_score, "status": item.status} for item in documents]
    rows = (await db.execute(select(IdentityCorrelation, IdentityDocument).join(IdentityDocument, IdentityCorrelation.target_document_id == IdentityDocument.id).where(IdentityCorrelation.identity_profile_id == identity_id).order_by(IdentityCorrelation.created_at.desc()))).all()
    correlations = [{"scan_id": str(document.scan_id), "source": "anchor", "target": str(document.scan_id), "name_similarity": row.name_similarity, "dob_match": row.dob_match, "gender_match": row.gender_match, "face_similarity": row.face_similarity, "overall_score": row.overall_score, "status": row.status} for row, document in rows]
    nodes = [{"id": "anchor", "document_type": "aadhaar", "status": "anchor", "score": 1.0}, *[{"id": item["scan_id"], **item} for item in document_items]]
    return {"identity_id": identity_id, "anchor": "synthetic_aadhaar", "provider": "Mock/Synthetic Aadhaar Verification", "nodes": nodes, "edges": correlations}
