"""
Module 3 — QR / Printed-Field Mismatch Detection (Aadhaar)

Compares the fields decoded from the Aadhaar QR code against the OCR-extracted
printed fields. A mismatch indicates the visible printed data has been altered
without regenerating the QR code, or the QR has been substituted.
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher

from app.utils.logging import get_logger

logger = get_logger("module3.qr_mismatch")

# Similarity threshold below which a field is flagged as mismatched
_SIMILARITY_THRESHOLD = 0.75


def _normalise(text: str) -> str:
    """Normalise text for comparison: lowercase, collapse whitespace, strip punctuation."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalise(a), _normalise(b)).ratio()


def check_qr_mismatch(
    qr_data: dict[str, str] | None,
    ocr_fields: dict[str, dict[str, object]],
    doc_type: str,
) -> dict[str, object]:
    """
    Compare QR-decoded fields against OCR-extracted fields (Aadhaar only).

    Parameters
    ----------
    qr_data   : dict from pyzbar decode (keys: name, dob, gender, uid, ...)
    ocr_fields: OCR extraction result dict (field_name → {text, ...})
    doc_type  : document type string

    Returns
    -------
    dict with:
        qr_present:       bool
        qr_field_match:   bool | None  (None = not applicable)
        qr_signature_valid: bool | None (None = cannot verify without UIDAI pubkey)
        mismatched_fields: list[str]
    """
    if doc_type != "aadhaar":
        return {
            "qr_present": None,
            "qr_field_match": None,
            "qr_signature_valid": None,
            "mismatched_fields": [],
        }

    if qr_data is None:
        logger.info("qr_mismatch: no QR decoded — flagging absence")
        return {
            "qr_present": False,
            "qr_field_match": False,
            "qr_signature_valid": None,
            "mismatched_fields": ["QR code not found or unreadable"],
        }

    # ── Field comparison ──────────────────────────────────────────────────
    # Map QR key → OCR field name
    compare_map = {
        "name":   "full_name",
        "dob":    "dob",
        "gender": "gender",
    }

    mismatched: list[str] = []
    matched = 0
    total = 0

    for qr_key, ocr_key in compare_map.items():
        qr_val  = qr_data.get(qr_key, "")
        ocr_val = (ocr_fields.get(ocr_key) or {}).get("text", "")  # type: ignore[union-attr]

        if not qr_val or not ocr_val:
            continue   # can't compare if one side is missing

        total += 1
        sim = _similarity(qr_val, ocr_val)
        if sim >= _SIMILARITY_THRESHOLD:
            matched += 1
        else:
            mismatched.append(
                f"{ocr_key}: QR='{qr_val}' vs OCR='{ocr_val}' (similarity={sim:.2f})"
            )
            logger.info(
                "qr_mismatch: field=%s QR='%s' OCR='%s' sim=%.2f",
                ocr_key, qr_val, ocr_val, sim,
            )

    qr_field_match = len(mismatched) == 0 if total > 0 else None

    # ── QR signature verification ─────────────────────────────────────────
    # Full UIDAI PKI verification requires the official public key and is
    # out of scope for a hackathon build. We set qr_signature_valid = None
    # to indicate "not verified" rather than claiming pass or fail.
    # A production system would verify the SHA-1 / RSA signature embedded
    # in the QR payload against the UIDAI root certificate.
    qr_signature_valid = None

    return {
        "qr_present": True,
        "qr_field_match": qr_field_match,
        "qr_signature_valid": qr_signature_valid,
        "mismatched_fields": mismatched,
    }
