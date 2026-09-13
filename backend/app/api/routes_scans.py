"""
API routes — Scans

POST   /api/scans                     — submit a new document for screening
GET    /api/scans                     — paginated history with filtering
GET    /api/scans/{scan_id}/status    — live pipeline status (polled by frontend)
GET    /api/scans/{scan_id}/result    — full result once pipeline is done
POST   /api/scans/{scan_id}/action    — record officer decision
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_flexible
from app.config import get_settings
from app.db import crud
from app.db.models import ApiKey, User
from app.db.session import get_db
from app.pipeline.orchestrator import run_pipeline
from app.pipeline.stages import PipelineStage
from app.schemas.scan import (
    ActionResponse,
    OfficerActionPayload,
    ScanCreatedResponse,
    ScanHistoryItem,
    ScanResultResponse,
    ScanStatusResponse,
    ExtractedField,
    ValidationResult,
    TamperingResult,
    FaceVerificationResult,
    IdentityRiskResult,
    RiskModelResult,
    ReportResult,
)
from app.utils.image_io import save_upload
from app.utils.logging import get_logger

router = APIRouter(prefix="/api/scans", tags=["scans"])
logger = get_logger("api.scans")
_settings = get_settings()


# ── POST /api/scans ───────────────────────────────────────────────────────────

@router.post("", response_model=ScanCreatedResponse, status_code=202)
async def submit_scan(
    request: Request,
    background_tasks: BackgroundTasks,
    document_type: str = Form(...),
    document_image: UploadFile = File(...),
    live_capture_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    auth: Tuple[User, Optional[ApiKey]] = Depends(get_current_user_flexible),
) -> ScanCreatedResponse:
    """
    Accept a document image, persist it, create the scan record,
    and kick off the 6-module pipeline as a background task.
    Requires JWT or API key authentication.
    """
    current_user, api_key = auth

    if document_type not in ("passport", "aadhaar", "pan"):
        raise HTTPException(status_code=422, detail=f"Invalid document_type: {document_type}")

    # Save uploaded files
    doc_path = await save_upload(document_image, _settings.storage_path, "uploads")
    live_path: str | None = None
    if live_capture_image and live_capture_image.filename:
        live_path = await save_upload(live_capture_image, _settings.storage_path, "uploads")

    # Create DB record with user attribution
    scan = await crud.create_scan(
        db,
        document_type=document_type,
        document_image_path=doc_path,
        live_capture_path=live_path,
        user_id=current_user.id,
        api_key_id=api_key.id if api_key else None,
    )
    scan_id = str(scan.id)
    await db.commit()

    logger.info("New scan created: %s doc_type=%s user=%s", scan_id, document_type, current_user.email)

    # Launch pipeline in background
    background_tasks.add_task(run_pipeline, scan_id, document_type, doc_path, live_path)

    return ScanCreatedResponse(scan_id=scan_id)


# ── GET /api/scans/{scan_id}/status ──────────────────────────────────────────

@router.get("/{scan_id}/status", response_model=ScanStatusResponse)
async def get_scan_status(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
) -> ScanStatusResponse:
    scan = await crud.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

    # A scan is committed as `pending` before the background pipeline gets a
    # chance to set its first concrete stage. Clients are allowed to poll as
    # soon as POST /api/scans returns 202, so expose that transient state as
    # the first public stage rather than leaking an internal value that the
    # response schema does not permit.
    current = "ocr" if scan.status == "pending" else scan.status
    active_stages = [s.value for s in PipelineStage.active_stages()]

    # Compute which stages are completed based on current status
    stages_completed: list[str] = []
    if current in active_stages:
        idx = active_stages.index(current)
        stages_completed = active_stages[:idx]
    elif current == PipelineStage.DONE:
        stages_completed = active_stages
    elif current == PipelineStage.FAILED:
        stages_completed = []

    return ScanStatusResponse(
        scan_id=scan_id,
        current_stage=current,  # type: ignore[arg-type]
        stages_completed=stages_completed,  # type: ignore[arg-type]
        error="Pipeline failed — check server logs." if current == "failed" else None,
    )


# ── GET /api/scans/{scan_id}/result ──────────────────────────────────────────

@router.get("/{scan_id}/result", response_model=ScanResultResponse)
async def get_scan_result(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
) -> ScanResultResponse:
    scan = await crud.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

    if scan.status not in ("done", "failed"):
        raise HTTPException(
            status_code=425,
            detail=f"Pipeline not yet complete. Current stage: {scan.status}",
        )

    sr = await crud.get_scan_result(db, scan_id)
    if sr is None:
        raise HTTPException(status_code=404, detail="Scan result record not found")

    # Build response from JSONB columns
    extracted = {
        k: ExtractedField(text=v.get("text", ""))
        for k, v in (sr.extracted_fields or {}).items()
    }

    val = sr.validation or {}
    validation = ValidationResult(
        mrz_checksum_pass=val.get("mrz_checksum_pass"),
        verhoeff_checksum_pass=val.get("verhoeff_checksum_pass"),
        qr_signature_valid=val.get("qr_signature_valid"),
        qr_field_match=val.get("qr_field_match"),
        pan_structure_valid=val.get("pan_structure_valid"),
        field_consistency_pass=val.get("field_consistency_pass"),
    )

    tamp = sr.tampering or {}
    tampering = TamperingResult(
        ela_score=float(tamp.get("ela_score", 0)),
        flagged_regions=tamp.get("flagged_regions", []),
        metadata_anomalies=tamp.get("metadata_anomalies", []),
        ela_heatmap_url=tamp.get("ela_heatmap_url"),
    )

    face: FaceVerificationResult | None = None
    if sr.face_verification:
        face = FaceVerificationResult(
            match=bool(sr.face_verification.get("match")),
            confidence=float(sr.face_verification.get("confidence", 0.0)),
        )

    ir = sr.identity_risk or {}
    identity_risk = IdentityRiskResult(
        registry_status=ir.get("registry_status", "clear"),  # type: ignore[arg-type]
        document_expired=bool(ir.get("document_expired", False)),
        issuing_authority=ir.get("issuing_authority", "Unknown"),
        identity_correlation=ir.get("identity_correlation"),
    )

    risk_model = RiskModelResult(
        score=float(sr.risk_score or 0),
        band=sr.risk_band or "low",  # type: ignore[arg-type]
        top_features=sr.top_features or [],
    )

    report = ReportResult(
        text_en=sr.report_text_en or "Report not yet generated.",
        text_hi=sr.report_text_hi,
    )

    return ScanResultResponse(
        scan_id=scan_id,
        document_type=scan.document_type,  # type: ignore[arg-type]
        created_at=scan.created_at.isoformat(),
        extracted_fields=extracted,
        validation=validation,
        tampering=tampering,
        face_verification=face,
        identity_risk=identity_risk,
        risk_model=risk_model,
        report=report,
    )


# ── GET /api/scans (history) ─────────────────────────────────────────────────

@router.get("", response_model=list[ScanHistoryItem])
async def list_scans(
    request: Request,
    q: Optional[str] = None,
    document_type: Optional[str] = None,
    from_dt: Optional[str] = None,
    to_dt: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth: Tuple[User, Optional[ApiKey]] = Depends(get_current_user_flexible),
) -> list[ScanHistoryItem]:
    """List scans for the current user only — users never see each other's history."""
    current_user, _ = auth
    from_parsed = datetime.fromisoformat(from_dt) if from_dt else None
    to_parsed   = datetime.fromisoformat(to_dt) if to_dt else None

    items = await crud.list_scans(
        db,
        q=q,
        document_type=document_type,
        from_dt=from_parsed,
        to_dt=to_parsed,
        user_id=current_user.id,
    )
    return [ScanHistoryItem(**item) for item in items]


# ── POST /api/scans/{scan_id}/action ─────────────────────────────────────────

@router.post("/{scan_id}/action", response_model=ActionResponse)
async def submit_officer_action(
    scan_id: str,
    payload: OfficerActionPayload,
    db: AsyncSession = Depends(get_db),
) -> ActionResponse:
    scan = await crud.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

    await crud.record_officer_action(db, scan_id, payload.action)
    await db.commit()

    logger.info("Officer action recorded: scan=%s action=%s", scan_id, payload.action)
    return ActionResponse(
        ok=True,
        message=f"Action '{payload.action}' recorded for scan {scan_id}",
    )
