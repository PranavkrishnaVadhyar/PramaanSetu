"""Synthetic identity-anchor matching for cross-document consistency checks.

This module never contacts UIDAI and never persists an Aadhaar number.  It is
intended only for the project's synthetic/demo identity provider.
"""
from __future__ import annotations

import hashlib
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any

from app.config import get_settings


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^A-Za-z0-9\s]", " ", text).upper()
    return " ".join(text.split())


def normalize_dob(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) != 8:
        return None
    # OCR documents use DD/MM/YYYY; ISO anchors use YYYY-MM-DD.
    if str(value).strip()[:4].isdigit() and str(value).strip()[4:5] in "-/":
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:]}"
    return f"{digits[4:]}-{digits[2:4]}-{digits[:2]}"


def cosine_similarity(left: list[float] | None, right: list[float] | None) -> float | None:
    if not left or not right or len(left) != len(right):
        return None
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = sum(a * a for a in left) ** 0.5
    right_norm = sum(b * b for b in right) ** 0.5
    if not left_norm or not right_norm:
        return None
    return max(0.0, min(1.0, numerator / (left_norm * right_norm)))


def compare_identity_fields(anchor: dict[str, Any], document: dict[str, Any]) -> dict[str, Any]:
    """Compare non-sensitive identity attributes with dynamic weight renormalization."""
    settings = get_settings()
    anchor_name, document_name = normalize_text(anchor.get("name")), normalize_text(document.get("name"))
    name_similarity = (
        round(SequenceMatcher(None, anchor_name, document_name).ratio(), 4)
        if anchor_name and document_name else None
    )
    anchor_dob, document_dob = normalize_dob(anchor.get("dob")), normalize_dob(document.get("dob"))
    dob_match = anchor_dob == document_dob if anchor_dob and document_dob else None
    anchor_gender, document_gender = normalize_text(anchor.get("gender")), normalize_text(document.get("gender"))
    gender_match = anchor_gender == document_gender if anchor_gender and document_gender else None

    face_similarity = document.get("face_similarity")
    if face_similarity is None:
        face_similarity = cosine_similarity(anchor.get("face_embedding"), document.get("face_embedding"))
    if face_similarity is not None:
        face_similarity = round(max(0.0, min(1.0, float(face_similarity))), 4)

    weighted = []
    if name_similarity is not None:
        weighted.append((name_similarity, settings.identity_name_weight))
    if dob_match is not None:
        weighted.append((1.0 if dob_match else 0.0, settings.identity_dob_weight))
    if gender_match is not None:
        weighted.append((1.0 if gender_match else 0.0, settings.identity_gender_weight))
    if face_similarity is not None:
        weighted.append((face_similarity, settings.identity_face_weight))

    if not weighted:
        overall_score, status = None, "insufficient_data"
    else:
        total_weight = sum(weight for _, weight in weighted)
        overall_score = round(sum(value * weight for value, weight in weighted) / total_weight, 4)
        if dob_match is False or gender_match is False or overall_score < 0.60:
            status = "mismatch"
        elif overall_score < 0.85:
            status = "review"
        else:
            status = "consistent"

    return {
        "name_similarity": name_similarity,
        "dob_match": dob_match,
        "gender_match": gender_match,
        "face_similarity": face_similarity,
        "overall_score": overall_score,
        "status": status,
        "face_status": "reference_face_not_available" if face_similarity is None else "compared",
    }


# Hash lookup prevents the mock provider from using an Aadhaar number as an
# application identity key or returning it in an API response. This value is a
# synthetic demo credential only.
_MOCK_PROFILES = {
    hashlib.sha256(b"177589178390").hexdigest(): {
        "identity_id": "ID-8F92A1", "name": "AYAAN BALA", "dob": "1988-11-19", "gender": "M",
    },
}


def verify_mock_aadhaar(aadhaar_number: str) -> dict[str, Any] | None:
    normalized = re.sub(r"\D", "", aadhaar_number)
    if len(normalized) != 12:
        return None
    return _MOCK_PROFILES.get(hashlib.sha256(normalized.encode()).hexdigest())
