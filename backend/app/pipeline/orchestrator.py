"""
Pipeline Orchestrator
=====================
Runs Modules 1–6 in sequence as a FastAPI BackgroundTask.
Updates scans.status after each stage so the frontend polling endpoint
can show live progress. Persists all results into scan_results.
On any unrecoverable error, sets status='failed' with a recorded error message.
"""
from __future__ import annotations

import os
import time
from typing import Any

from app.config import get_settings
from app.db.crud import (
    get_scan,
    update_scan_status,
    upsert_scan_result,
    get_scan_result,
)
from app.db.session import AsyncSessionLocal
from app.modules.module1_ocr.extraction import extract_fields_async, result_to_api_dict
from app.modules.module2_validation.mrz import validate_mrz
from app.modules.module2_validation.verhoeff import validate_aadhaar
from app.modules.module2_validation.pan_structure import validate_pan
from app.modules.module2_validation.registry_lookup import registry_lookup
from app.modules.module3_tampering.ela import run_ela
from app.modules.module3_tampering.metadata_forensics import analyse_metadata
from app.modules.module3_tampering.font_alignment import analyse_font_alignment
from app.modules.module3_tampering.qr_print_mismatch import check_qr_mismatch
from app.modules.module4_face.verification import verify_faces
from app.modules.module5_risk.feature_vector import build_feature_vector
from app.modules.module5_risk.model import score_risk
from app.modules.module6_report.generator import generate_report
from app.pipeline.stages import PipelineStage
from app.utils.logging import get_logger

logger = get_logger("pipeline.orchestrator")
_settings = get_settings()


async def run_pipeline(
    scan_id: str,
    doc_type: str,
    doc_image_path: str,
    live_capture_path: str | None,
) -> None:
    """
    Full 6-module pipeline. Called as a BackgroundTask from POST /api/scans.
    Uses its own DB session (not the request session, which has already closed).
    """
    t_start = time.monotonic()
    logger.info("Pipeline start: scan_id=%s doc_type=%s", scan_id, doc_type)

    async with AsyncSessionLocal() as db:
        try:
            # ── Stage 1: OCR ─────────────────────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.OCR)
            await db.commit()

            ocr_result = await extract_fields_async(doc_image_path, doc_type)
            ocr_api_dict = result_to_api_dict(ocr_result)
            ocr_meta = {
                "document_type":           doc_type,
                "ocr_confidence_variance": 0.0,
                "fallback_fields":         ocr_result.fallback_fields,
                "qr_data":                 ocr_result.qr_data,
            }

            await upsert_scan_result(db, scan_id, extracted_fields=ocr_api_dict)
            await db.commit()
            logger.info("[%s] OCR done: %d fields", scan_id, len(ocr_api_dict))

            # ── Stage 2: Validation ──────────────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.VALIDATION)
            await db.commit()

            validation = await _run_validation(db, scan_id, doc_type, ocr_result, ocr_meta)
            await upsert_scan_result(db, scan_id, validation=validation["checks"])
            await db.commit()
            logger.info("[%s] Validation done", scan_id)

            # ── Stage 3: Tampering ───────────────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.TAMPERING)
            await db.commit()

            tampering = _run_tampering(
                scan_id, doc_type, doc_image_path, ocr_result, ocr_api_dict
            )
            await upsert_scan_result(db, scan_id, tampering=tampering)
            await db.commit()
            logger.info("[%s] Tampering done: ela_score=%.2f", scan_id, tampering["ela_score"])

            # ── Stage 4: Face Verification ───────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.FACE_VERIFICATION)
            await db.commit()

            face_result = await verify_faces(doc_image_path, live_capture_path)
            face_dict = (
                {"match": face_result.match, "confidence": face_result.confidence}
                if face_result else None
            )
            await upsert_scan_result(db, scan_id, face_verification=face_dict)
            await db.commit()
            logger.info(
                "[%s] Face verification done: %s",
                scan_id,
                f"match={face_result.match}" if face_result else "skipped",
            )

            # ── Stage 5: Risk Scoring ────────────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.RISK_SCORING)
            await db.commit()

            feature_vector = build_feature_vector(
                ocr_result=ocr_meta,
                validation_result=validation["checks"],
                tampering_result=tampering,
                face_result=face_dict,
                registry_result=validation["registry"],
                extracted_fields=ocr_api_dict,
            )
            risk = score_risk(feature_vector, doc_type, ocr_api_dict)

            # Identity risk info assembled from registry lookup
            identity_risk = {
                "registry_status": validation["registry"].get("status", "clear"),
                "document_expired": bool(validation["registry"].get("document_expired", False)),
                "issuing_authority": validation["registry"].get("issuing_authority", "Unknown"),
            }

            await upsert_scan_result(
                db, scan_id,
                identity_risk=identity_risk,
                risk_score=risk.score,
                risk_band=risk.band,
                top_features=risk.top_features,
            )
            await db.commit()
            logger.info("[%s] Risk scoring done: score=%.1f band=%s", scan_id, risk.score, risk.band)

            # ── Stage 6: Report Generation ───────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.REPORT_GENERATION)
            await db.commit()

            scan_summary = _build_report_summary(
                scan_id, doc_type,
                ocr_api_dict, validation["checks"], tampering,
                face_dict, identity_risk, risk,
            )
            report = await generate_report(scan_summary)
            await upsert_scan_result(
                db, scan_id,
                report_text_en=report.text_en,
                report_text_hi=report.text_hi,
            )
            await db.commit()
            logger.info("[%s] Report generated", scan_id)

            # ── Done ─────────────────────────────────────────────────────────
            await update_scan_status(db, scan_id, PipelineStage.DONE, completed=True)
            await db.commit()

            elapsed = time.monotonic() - t_start
            logger.info("Pipeline complete: scan_id=%s elapsed=%.2fs", scan_id, elapsed)

        except Exception as exc:
            logger.error("Pipeline FAILED: scan_id=%s error=%s", scan_id, exc, exc_info=True)
            try:
                await update_scan_status(db, scan_id, PipelineStage.FAILED)
                await db.commit()
            except Exception:
                pass


# ── Validation helper ─────────────────────────────────────────────────────────

async def _run_validation(
    db: Any,
    scan_id: str,
    doc_type: str,
    ocr_result: Any,
    ocr_meta: dict[str, Any],
) -> dict[str, Any]:
    """Run Module 2 validators appropriate for the document type."""
    fields = ocr_result.fields
    checks: dict[str, Any] = {
        "mrz_checksum_pass":     None,
        "verhoeff_checksum_pass": None,
        "qr_signature_valid":    None,
        "qr_field_match":        None,
        "pan_structure_valid":   None,
        "field_consistency_pass": None,
    }

    mrz_result: dict[str, Any] | None = None
    if doc_type == "passport":
        mrz1 = fields.get("mrz_line_1")
        mrz2 = fields.get("mrz_line_2")
        if mrz1 and mrz2 and mrz1.text and mrz2.text:
            mrz_result = validate_mrz(mrz1.text, mrz2.text)
            checks["mrz_checksum_pass"] = mrz_result.get("overall_pass")

    elif doc_type == "aadhaar":
        uid_field = fields.get("aadhaar_number")
        if uid_field and uid_field.text:
            checks["verhoeff_checksum_pass"] = validate_aadhaar(uid_field.text)

        # QR mismatch
        qr_check = check_qr_mismatch(
            qr_data=ocr_meta.get("qr_data"),
            ocr_fields={k: {"text": v.text} for k, v in fields.items()},
            doc_type=doc_type,
        )
        checks["qr_signature_valid"] = qr_check.get("qr_signature_valid")
        checks["qr_field_match"]     = qr_check.get("qr_field_match")

    elif doc_type == "pan":
        pan_field = fields.get("pan_number")
        if pan_field and pan_field.text:
            pan_result = validate_pan(pan_field.text)
            checks["pan_structure_valid"] = pan_result.get("valid")

    checks["field_consistency_pass"] = check_field_consistency(
        doc_type,
        {key: {"text": value.text} for key, value in fields.items()},
        qr_data=ocr_meta.get("qr_data"),
        mrz_data=(mrz1.text, mrz2.text) if doc_type == "passport" and mrz_result else None,
    )

    # Registry lookup — use the primary ID field for each doc type
    id_field_map = {
        "passport": "passport_number",
        "aadhaar":  "aadhaar_number",
        "pan":      "pan_number",
    }
    id_field = fields.get(id_field_map.get(doc_type, ""))
    id_number = id_field.text if id_field else ""

    registry = await registry_lookup(db, doc_type, id_number)
    registry_dict = {
        "status":            registry.status,
        "issuing_authority": registry.issuing_authority,
        "document_expired":  registry.document_expired,
        "name":              registry.name,
    }

    return {"checks": checks, "registry": registry_dict}


def check_field_consistency(
    document_type: str,
    extracted_fields: dict[str, dict[str, Any]],
    qr_data: dict[str, Any] | None = None,
    mrz_data: tuple[str, str] | None = None,
) -> bool | None:
    """Return True/False only when an independent source was actually checked."""
    critical_field_map = {"aadhaar": "aadhaar_number", "passport": "passport_number", "pan": "pan_number"}
    critical_field = critical_field_map.get(document_type)
    critical_text = str((extracted_fields.get(critical_field or "") or {}).get("text", "")).strip()
    if critical_field and not critical_text:
        return False

    if document_type == "aadhaar":
        if not qr_data:
            return None
        qr_check = check_qr_mismatch(qr_data, extracted_fields, document_type)
        return qr_check.get("qr_field_match")  # type: ignore[return-value]

    if document_type == "passport":
        if not mrz_data:
            return None
        mrz_line2 = mrz_data[1].replace(" ", "").upper()
        if len(mrz_line2) != 44:
            return None
        printed_number = "".join(ch for ch in critical_text.upper() if ch.isalnum())
        mrz_number = mrz_line2[:9].replace("<", "")
        comparisons = [printed_number == mrz_number] if printed_number and mrz_number else []
        printed_dob = "".join(ch for ch in str((extracted_fields.get("dob") or {}).get("text", "")) if ch.isdigit())
        mrz_dob = mrz_line2[13:19]
        if printed_dob and mrz_dob:
            comparisons.append(printed_dob.endswith(mrz_dob))
        return all(comparisons) if comparisons else None

    return None


# ── Tampering helper ──────────────────────────────────────────────────────────

def _run_tampering(
    scan_id: str,
    doc_type: str,
    image_path: str,
    ocr_result: Any,
    ocr_api_dict: dict[str, Any],
) -> dict[str, Any]:
    """Run Module 3 tampering checks and assemble the output dict."""
    evidence_dir = os.path.join(_settings.storage_path, "evidence")

    ela        = run_ela(image_path, evidence_dir, scan_id)
    metadata   = analyse_metadata(image_path)
    font_align = analyse_font_alignment(image_path)

    # Merge flagged regions from ELA and font alignment
    flagged_regions: list[str] = list(ela.get("flagged_regions", []))
    flagged_regions += font_align.get("flagged_regions", [])

    # Heatmap URL: relative path served as static file
    heatmap_path = ela.get("heatmap_path")
    ela_heatmap_url: str | None = None
    if heatmap_path and os.path.isfile(heatmap_path):
        # Serve as /evidence/{scan_id}_ela.png via static mount in main.py
        ela_heatmap_url = f"/evidence/{scan_id}_ela.png"

    return {
        "ela_score":          ela["ela_score"],
        "flagged_regions":    flagged_regions,
        "metadata_anomalies": metadata.get("anomalies", []),
        "ela_heatmap_url":    ela_heatmap_url,
    }


# ── Report summary builder ────────────────────────────────────────────────────

def _build_report_summary(
    scan_id: str,
    doc_type: str,
    extracted_fields: dict,
    validation: dict,
    tampering: dict,
    face_result: dict | None,
    identity_risk: dict,
    risk: Any,
) -> dict[str, Any]:
    return {
        "scan_id":         scan_id,
        "document_type":   doc_type,
        "extracted_fields": extracted_fields,
        "validation":      validation,
        "tampering": {
            "ela_score":          tampering["ela_score"],
            "flagged_regions":    tampering["flagged_regions"],
            "metadata_anomalies": tampering["metadata_anomalies"],
        },
        "face_verification": face_result,
        "identity_risk":   identity_risk,
        "risk_model": {
            "score":        risk.score,
            "band":         risk.band,
            "top_features": risk.top_features,
            "overrides":    risk.overrides,
        },
    }
