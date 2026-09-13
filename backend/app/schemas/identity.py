from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AadhaarVerificationRequest(BaseModel):
    aadhaar_number: str = Field(min_length=12, max_length=32)


class AadhaarVerificationResponse(BaseModel):
    provider: Literal["Mock/Synthetic Aadhaar Verification"]
    identity_id: str | None = None
    verified: bool
    attributes: dict[str, str] | None = None


class CorrelateScanRequest(BaseModel):
    identity_id: str


class CorrelationResponse(BaseModel):
    identity_id: str
    scan_id: str
    document_type: str
    name_similarity: float | None
    dob_match: bool | None
    gender_match: bool | None
    face_similarity: float | None
    overall_score: float | None
    status: Literal["consistent", "review", "mismatch", "insufficient_data"]
    face_status: str
