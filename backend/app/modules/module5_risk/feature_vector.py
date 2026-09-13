"""
Module 5 — Feature Vector Assembly

Builds the exact feature schema expected by the trained India document
fraud classifier.

IMPORTANT:
- Model features must match the training notebook.
- Non-applicable document-specific features are represented as NaN.
- Registry / expiry information is intentionally kept OUT of the ML model.
- OCR confidence variance is NOT a model feature.
"""

from __future__ import annotations

from typing import Any
import math


# ---------------------------------------------------------------------------
# Model schema
# ---------------------------------------------------------------------------

MODEL_NUMERIC_FEATURES = [
    "mrz_checksum_pass",
    "verhoeff_checksum_pass",
    "qr_signature_valid",
    "qr_field_match",
    "pan_structure_valid",
    "field_consistency_pass",
    "ela_score",
    "metadata_anomaly",
    "font_alignment_deviation",
    "photo_region_anomaly",
    "face_match_confidence",
]

MODEL_CATEGORICAL_FEATURES = [
    "document_type",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tri(value: Any) -> float:
    """
    Convert boolean validation values into the representation used by
    the training dataset.

    True  -> 1.0
    False -> 0.0
    None  -> NaN

    NaN is deliberately used instead of -1 or 0 because the training
    pipeline uses an imputer for missing/non-applicable values.
    """
    if value is True:
        return 1.0

    if value is False:
        return 0.0

    return float("nan")


def _safe_float(value: Any, default: float = float("nan")) -> float:
    """
    Safely convert a value to float.

    None, invalid strings and empty values become NaN.
    """
    if value is None:
        return default

    try:
        result = float(value)

        if math.isnan(result) or math.isinf(result):
            return default

        return result

    except (TypeError, ValueError):
        return default


def _count_list(value: Any) -> float:
    """
    Return the number of items in a list-like value.
    """
    if value is None:
        return 0.0

    if isinstance(value, (list, tuple, set)):
        return float(len(value))

    return 0.0


def _extract_field_text(
    extracted_fields: dict[str, Any],
    field_name: str,
) -> str:
    """
    Extract OCR text from the standard field structure.
    """
    value = extracted_fields.get(field_name, "")

    if isinstance(value, dict):
        return str(value.get("text", "") or "").strip()

    return str(value or "").strip()


# ---------------------------------------------------------------------------
# Main feature builder
# ---------------------------------------------------------------------------

def build_feature_vector(
    ocr_result: dict[str, Any],
    validation_result: dict[str, Any],
    tampering_result: dict[str, Any],
    face_result: dict[str, Any] | None,
    registry_result: dict[str, Any],
    extracted_fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Build the feature vector consumed by Module 5.

    The ML model receives:

        document_type
        + 11 numeric features

    Registry status and document expiry are retained separately for
    downstream deterministic risk aggregation and are NOT sent to
    the trained classifier.
    """

    val = validation_result or {}
    tampering = tampering_result or {}
    face = face_result or {}
    registry = registry_result or {}
    fields = extracted_fields or {}

    document_type = str(
        ocr_result.get("document_type", "")
    ).strip().lower()

    # -----------------------------------------------------------------------
    # Critical identifier information
    # -----------------------------------------------------------------------

    critical_field_map = {
        "aadhaar": "aadhaar_number",
        "passport": "passport_number",
        "pan": "pan_number",
    }

    critical_field = critical_field_map.get(document_type)

    critical_text = (
        _extract_field_text(fields, critical_field)
        if critical_field
        else ""
    )

    # -----------------------------------------------------------------------
    # Model feature vector
    # -----------------------------------------------------------------------

    fv: dict[str, Any] = {

        # -------------------------------------------------------------------
        # Categorical model feature
        # -------------------------------------------------------------------

        "document_type": document_type,
        "_document_type": document_type,

        # -------------------------------------------------------------------
        # Module 2 — deterministic validation
        #
        # Non-applicable values are NaN.
        # -------------------------------------------------------------------

        "mrz_checksum_pass": _tri(
            val.get("mrz_checksum_pass")
        ),

        "verhoeff_checksum_pass": _tri(
            val.get("verhoeff_checksum_pass")
        ),

        "qr_signature_valid": _tri(
            val.get("qr_signature_valid")
        ),

        "qr_field_match": _tri(
            val.get("qr_field_match")
        ),

        "pan_structure_valid": _tri(
            val.get("pan_structure_valid")
        ),

        "field_consistency_pass": _tri(
            val.get("field_consistency_pass")
        ),

        # -------------------------------------------------------------------
        # Module 3 — forensic/tamper features
        # -------------------------------------------------------------------

        "ela_score": _safe_float(
            tampering.get("ela_score"),
            default=0.0,
        ),

        "metadata_anomaly": _count_list(
            tampering.get("metadata_anomalies", [])
        ),

        "font_alignment_deviation": _safe_float(
            tampering.get("font_alignment_deviation"),
            default=0.0,
        ),

        "photo_region_anomaly": _count_list(
            tampering.get("flagged_regions", [])
        ),

        # -------------------------------------------------------------------
        # Module 4 — face verification
        #
        # IMPORTANT:
        # Missing face verification is NaN, NOT 0.
        # 0 means the system actually performed verification and failed.
        # -------------------------------------------------------------------

        "face_match_confidence": (
            _safe_float(face.get("confidence"))
            if face
            else float("nan")
        ),

        # -------------------------------------------------------------------
        # Explainability / downstream features
        #
        # These are intentionally NOT part of MODEL_NUMERIC_FEATURES.
        # -------------------------------------------------------------------

        "face_match": (
            _tri(face.get("match"))
            if face
            else float("nan")
        ),

        "metadata_anomaly_count": _count_list(
            tampering.get("metadata_anomalies", [])
        ),

        "flagged_region_count": _count_list(
            tampering.get("flagged_regions", [])
        ),

        "critical_field_missing": (
            1.0
            if critical_field and not critical_text
            else 0.0
        ),

        # -------------------------------------------------------------------
        # Identity-risk features
        #
        # These remain outside the ML model.
        # -------------------------------------------------------------------

        "registry_blacklisted": (
            1.0
            if registry.get("status") == "blacklisted"
            else 0.0
        ),

        "registry_under_investigation": (
            1.0
            if registry.get("status") == "under_investigation"
            else 0.0
        ),

        "document_expired": (
            1.0
            if registry.get("document_expired") is True
            else 0.0
        ),
    }

    # -----------------------------------------------------------------------
    # Backward-compatible aliases
    #
    # These are NOT additional model inputs.
    # -----------------------------------------------------------------------

    fv["metadata_anomaly_count"] = fv["metadata_anomaly"]
    fv["flagged_region_count"] = fv["photo_region_anomaly"]
    fv["face_confidence"] = fv["face_match_confidence"]

    # -----------------------------------------------------------------------
    # Debug logging
    # -----------------------------------------------------------------------

    model_values = {
        key: fv.get(key)
        for key in MODEL_NUMERIC_FEATURES
    }

    print(
        "[Module 5] Document type:",
        document_type,
    )

    print(
        "[Module 5] Model feature vector:",
        model_values,
    )

    return fv