from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Shared primitives ─────────────────────────────────────────────────────────

DocumentType = Literal["passport", "aadhaar", "pan"]
PipelineStageStr = Literal[
    "ocr", "validation", "tampering", "face_verification",
    "risk_scoring", "report_generation", "done", "failed",
]
RiskBand = Literal["low", "medium", "high"]
OfficerAction = Literal["clear", "review", "escalate"]


# ── POST /api/scans response ──────────────────────────────────────────────────

class ScanCreatedResponse(BaseModel):
    scan_id: str


# ── GET /api/scans/{scan_id}/status ──────────────────────────────────────────

class ScanStatusResponse(BaseModel):
    scan_id: str
    current_stage: PipelineStageStr
    stages_completed: list[PipelineStageStr]
    error: str | None = None


# ── GET /api/scans/{scan_id}/result ──────────────────────────────────────────

class ExtractedField(BaseModel):
    text: str
    confidence: float | None = None


class ValidationResult(BaseModel):
    mrz_checksum_pass: bool | None
    verhoeff_checksum_pass: bool | None
    qr_signature_valid: bool | None
    qr_field_match: bool | None
    pan_structure_valid: bool | None
    field_consistency_pass: bool | None


class TamperingResult(BaseModel):
    ela_score: float
    flagged_regions: list[str]
    metadata_anomalies: list[str]
    ela_heatmap_url: str | None = None


class FaceVerificationResult(BaseModel):
    match: bool
    confidence: float


class IdentityRiskResult(BaseModel):
    registry_status: Literal["clear", "blacklisted", "under_investigation"]
    document_expired: bool
    issuing_authority: str
    identity_correlation: dict[str, Any] | None = None


class RiskModelResult(BaseModel):
    score: float = Field(ge=0, le=100)
    band: RiskBand
    top_features: list[str]


class ReportResult(BaseModel):
    text_en: str
    text_hi: str | None = None


class ScanResultResponse(BaseModel):
    scan_id: str
    document_type: DocumentType
    created_at: str
    extracted_fields: dict[str, ExtractedField]
    validation: ValidationResult
    tampering: TamperingResult
    face_verification: FaceVerificationResult | None
    identity_risk: IdentityRiskResult
    risk_model: RiskModelResult
    report: ReportResult


# ── GET /api/scans (history) ─────────────────────────────────────────────────

class ScanHistoryItem(BaseModel):
    scan_id: str
    document_type: DocumentType
    name: str
    created_at: str
    risk_score: float
    risk_band: RiskBand


# ── POST /api/scans/{scan_id}/action ────────────────────────────────────────

class OfficerActionPayload(BaseModel):
    action: OfficerAction
    notes: str | None = None


class ActionResponse(BaseModel):
    ok: bool
    message: str | None = None
