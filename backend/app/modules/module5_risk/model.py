"""
Module 5 — Risk Scoring

Uses the trained India document fraud classifier when available.

ML model:
    document_type
    +
    11 forensic/validation/biometric numeric features

Registry status and document expiry are deliberately excluded from the
trained classifier and handled separately as deterministic identity-risk
signals.

If the trained model is unavailable, a deterministic rule-based scorer
is used as fallback.
"""

from __future__ import annotations

import os
import math
from dataclasses import dataclass
from typing import Any

import pandas as pd

from app.config import get_settings
from app.utils.logging import get_logger


logger = get_logger("module5.risk")

_settings = get_settings()


# ============================================================================
# MODEL LOADING
# ============================================================================

_model = None
_model_loaded = False


def _load_model() -> Any | None:
    """
    Lazy-load the trained fraud classifier.
    """

    global _model
    global _model_loaded

    if _model_loaded:
        return _model

    _model_loaded = True

    path = _settings.risk_model_path

    if not os.path.isfile(path):
        logger.warning(
            "Risk model not found at '%s'. "
            "Using rule-based fallback scorer.",
            path,
        )
        return None

    try:
        import joblib

        _model = joblib.load(path)

        logger.info(
            "Risk classifier loaded successfully from %s",
            path,
        )

        return _model

    except Exception as exc:

        logger.exception(
            "Failed to load risk model: %s. "
            "Using rule-based fallback.",
            exc,
        )

        return None


# ============================================================================
# RESULT TYPE
# ============================================================================

@dataclass
class RiskResult:

    score: float

    band: str

    top_features: list[str]

    overrides: list[str]


# ============================================================================
# EXACT TRAINING FEATURE SCHEMA
# ============================================================================

_MODEL_NUMERIC_COLS = [
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


_MODEL_CATEGORICAL_COLS = [
    "document_type",
]


# ============================================================================
# HELPERS
# ============================================================================

def _is_missing(value: Any) -> bool:
    """
    Check whether a value is None or NaN.
    """

    if value is None:
        return True

    try:
        return bool(math.isnan(float(value)))
    except (TypeError, ValueError):
        return False


def _band(score: float) -> str:

    if score < 35:
        return "low"

    if score < 65:
        return "medium"

    return "high"


# ============================================================================
# SAFETY OVERRIDES
# ============================================================================

def apply_safety_overrides(
    document_type: str,
    extracted_fields: dict[str, Any],
    risk_score: float,
    risk_band: str,
) -> tuple[float, str, list[str]]:
    """
    Deterministic safety checks.

    These can escalate risk but never reduce the ML model's score.
    """

    critical_field_map = {
        "aadhaar": "aadhaar_number",
        "passport": "passport_number",
        "pan": "pan_number",
    }

    document_type = str(document_type or "").lower()

    critical_field = critical_field_map.get(document_type)

    if not critical_field:
        return risk_score, risk_band, []

    field_value = extracted_fields.get(
        critical_field,
        "",
    )

    if isinstance(field_value, dict):
        field_text = str(
            field_value.get("text", "") or ""
        ).strip()
    else:
        field_text = str(
            field_value or ""
        ).strip()

    if field_text:
        return risk_score, risk_band, []

    override = (
        f"Primary identifier field '{critical_field}' "
        "could not be extracted — risk escalated."
    )

    risk_score = max(
        float(risk_score),
        60.0,
    )

    risk_band = _band(risk_score)

    return risk_score, risk_band, [override]


# ============================================================================
# PUBLIC API
# ============================================================================

def score_risk(
    feature_vector: dict[str, Any],
    document_type: str = "",
    extracted_fields: dict[str, Any] | None = None,
) -> RiskResult:
    """
    Score document fraud risk.

    ML model is preferred.
    Rule-based scorer is used only when the ML model is unavailable
    or fails.
    """

    model = _load_model()

    if model is not None:

        raw_result = _score_ml(
            feature_vector,
            model,
        )

    else:

        raw_result = _score_rules(
            feature_vector,
        )

    score, band, overrides = apply_safety_overrides(
        document_type=document_type,
        extracted_fields=extracted_fields or {},
        risk_score=raw_result.score,
        risk_band=raw_result.band,
    )

    return RiskResult(
        score=round(
            score,
            1,
        ),
        band=band,
        top_features=(
            overrides
            + raw_result.top_features
        ),
        overrides=overrides,
    )


# ============================================================================
# ML SCORING
# ============================================================================

def _score_ml(
    fv: dict[str, Any],
    model: Any,
) -> RiskResult:
    """
    Score using the trained scikit-learn pipeline.

    CRITICAL:
    Missing values remain NaN so the trained SimpleImputer can process them.

    We DO NOT replace missing values with 0.
    """

    try:

        # --------------------------------------------------------------------
        # Document type
        # --------------------------------------------------------------------

        document_type = str(
            fv.get(
                "document_type",
                fv.get(
                    "_document_type",
                    "unknown",
                ),
            )
        ).strip().lower()

        if not document_type:
            document_type = "unknown"

        # --------------------------------------------------------------------
        # Build exactly the same columns used during training
        # --------------------------------------------------------------------

        row: dict[str, Any] = {
            "document_type": document_type,
        }

        for feature_name in _MODEL_NUMERIC_COLS:

            value = fv.get(
                feature_name,
                float("nan"),
            )

            if value is None:
                value = float("nan")

            try:

                value = float(value)

                if math.isnan(value) or math.isinf(value):
                    value = float("nan")

            except (TypeError, ValueError):

                value = float("nan")

            row[feature_name] = value

        df = pd.DataFrame(
            [row],
            columns=[
                "document_type",
                *_MODEL_NUMERIC_COLS,
            ],
        )

        # --------------------------------------------------------------------
        # Diagnostics
        # --------------------------------------------------------------------

        logger.info(
            "Module 5 inference document_type=%s",
            document_type,
        )

        logger.info(
            "Module 5 inference features=%s",
            {
                key: (
                    None
                    if _is_missing(value)
                    else round(float(value), 5)
                )
                for key, value in row.items()
                if key != "document_type"
            },
        )

        # --------------------------------------------------------------------
        # Prediction
        # --------------------------------------------------------------------

        proba = model.predict_proba(df)[0]

        classes = list(
            getattr(
                model,
                "classes_",
                [],
            )
        )

        logger.info(
            "Module 5 model classes=%s probabilities=%s",
            classes,
            [
                round(float(prob), 6)
                for prob in proba
            ],
        )

        # --------------------------------------------------------------------
        # Determine tampered-class probability
        # --------------------------------------------------------------------

        tampered_probability = _get_tampered_probability(
            classes,
            proba,
        )

        score = tampered_probability * 100.0

        score = max(
            0.0,
            min(
                100.0,
                score,
            ),
        )

        band = _band(score)

        top_features = _top_features_from_fv(
            fv,
        )

        logger.info(
            "ML risk score=%.2f band=%s "
            "tampered_probability=%.6f",
            score,
            band,
            tampered_probability,
        )

        return RiskResult(
            score=round(
                score,
                1,
            ),
            band=band,
            top_features=top_features,
            overrides=[],
        )

    except Exception as exc:

        logger.exception(
            "ML scoring failed: %s. "
            "Falling back to rule-based scoring.",
            exc,
        )

        return _score_rules(fv)


# ============================================================================
# CLASS PROBABILITY MAPPING
# ============================================================================

def _get_tampered_probability(
    classes: list[Any],
    probabilities: Any,
) -> float:
    """
    Determine P(is_tampered = 1).

    The training target is binary:
        0 = genuine
        1 = tampered

    Therefore class 1 must be used explicitly instead of blindly
    taking the last probability.

    Also supports string class labels as a defensive measure.
    """

    # ------------------------------------------------------------------------
    # Standard training case: [0, 1]
    # ------------------------------------------------------------------------

    if 1 in classes:

        index = classes.index(1)

        return float(
            probabilities[index]
        )

    # ------------------------------------------------------------------------
    # Defensive support for string labels
    # ------------------------------------------------------------------------

    string_classes = [
        str(value).strip().lower()
        for value in classes
    ]

    possible_tampered_labels = {
        "tampered",
        "fraud",
        "fake",
        "high",
        "1",
    }

    for label in possible_tampered_labels:

        if label in string_classes:

            index = string_classes.index(
                label
            )

            return float(
                probabilities[index]
            )

    # ------------------------------------------------------------------------
    # Defensive fallback
    # ------------------------------------------------------------------------

    if len(probabilities) == 2:

        logger.warning(
            "Could not explicitly identify tampered class. "
            "Using second binary class probability. classes=%s",
            classes,
        )

        return float(
            probabilities[1]
        )

    if len(probabilities) >= 3:

        logger.warning(
            "Unexpected multiclass risk model. "
            "Using highest-risk probability. classes=%s",
            classes,
        )

        return float(
            max(probabilities)
        )

    return float(
        probabilities[-1]
    )


# ============================================================================
# RULE-BASED FALLBACK
# ============================================================================

_RULES = [

    (
        "registry_blacklisted",
        lambda v: v == 1.0,
        35,
        "Identity registry status: BLACKLISTED",
    ),

    (
        "registry_under_investigation",
        lambda v: v == 1.0,
        15,
        "Identity registry status: UNDER INVESTIGATION",
    ),

    (
        "verhoeff_checksum_pass",
        lambda v: v == 0.0,
        20,
        "Verhoeff checksum failure on Aadhaar UID",
    ),

    (
        "mrz_checksum_pass",
        lambda v: v == 0.0,
        20,
        "ICAO MRZ check digit failure",
    ),

    (
        "ela_score",
        lambda v: v > 50,
        20,
        "High ELA variance — likely digital tampering",
    ),

    (
        "ela_score",
        lambda v: 25 < v <= 50,
        10,
        "Moderate ELA variance",
    ),

    (
        "qr_field_match",
        lambda v: v == 0.0,
        10,
        "QR code field mismatch vs printed text",
    ),

    (
        "metadata_anomaly",
        lambda v: v > 0,
        10,
        "Image editing software detected in metadata",
    ),

    (
        "face_match",
        lambda v: v == 0.0,
        10,
        "Biometric face verification failed",
    ),

    (
        "document_expired",
        lambda v: v == 1.0,
        5,
        "Document is expired",
    ),

    # Evidence of authenticity
    (
        "mrz_checksum_pass",
        lambda v: v == 1.0,
        -10,
        "ICAO MRZ checksum validated",
    ),

    (
        "verhoeff_checksum_pass",
        lambda v: v == 1.0,
        -10,
        "Verhoeff checksum passed",
    ),

    (
        "face_match",
        lambda v: v == 1.0,
        -5,
        "Biometric face match confirmed",
    ),

    (
        "ela_score",
        lambda v: v < 10,
        -5,
        "Low ELA variance",
    ),
]


def _score_rules(
    fv: dict[str, Any],
) -> RiskResult:
    """
    Explainable deterministic fallback scorer.
    """

    score = 20.0

    fired: list[tuple[float, str]] = []

    for (
        feature,
        condition,
        delta,
        explanation,
    ) in _RULES:

        value = fv.get(
            feature,
            float("nan"),
        )

        # Missing / N/A features are ignored.
        if _is_missing(value):
            continue

        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            continue

        if condition(numeric_value):

            score += delta

            fired.append(
                (
                    delta,
                    explanation,
                )
            )

    score = max(
        0.0,
        min(
            100.0,
            score,
        ),
    )

    band = _band(score)

    fired.sort(
        key=lambda item: abs(item[0]),
        reverse=True,
    )

    top_features = [
        explanation
        for _, explanation in fired[:5]
    ]

    logger.info(
        "Rule-based risk score=%.1f band=%s fired_rules=%d",
        score,
        band,
        len(fired),
    )

    return RiskResult(
        score=round(
            score,
            1,
        ),
        band=band,
        top_features=top_features,
        overrides=[],
    )


# ============================================================================
# EXPLAINABILITY
# ============================================================================

def _top_features_from_fv(
    fv: dict[str, Any],
) -> list[str]:
    """
    Generate human-readable explanations.

    These explanations do not affect the ML score.
    """

    lines: list[str] = []

    # ------------------------------------------------------------------------
    # Registry
    # ------------------------------------------------------------------------

    if fv.get(
        "registry_blacklisted",
        0.0,
    ) == 1.0:

        lines.append(
            "Identity registry status: BLACKLISTED"
        )

    if fv.get(
        "registry_under_investigation",
        0.0,
    ) == 1.0:

        lines.append(
            "Identity registry status: UNDER INVESTIGATION"
        )

    # ------------------------------------------------------------------------
    # Aadhaar
    # ------------------------------------------------------------------------

    if fv.get(
        "verhoeff_checksum_pass",
        float("nan"),
    ) == 0.0:

        lines.append(
            "Verhoeff checksum failure on Aadhaar UID"
        )

    if fv.get(
        "qr_signature_valid",
        float("nan"),
    ) == 0.0:

        lines.append(
            "Aadhaar QR signature validation failed"
        )

    if fv.get(
        "qr_field_match",
        float("nan"),
    ) == 0.0:

        lines.append(
            "Aadhaar QR fields do not match printed fields"
        )

    # ------------------------------------------------------------------------
    # Passport
    # ------------------------------------------------------------------------

    if fv.get(
        "mrz_checksum_pass",
        float("nan"),
    ) == 0.0:

        lines.append(
            "ICAO MRZ check digit failure"
        )

    # ------------------------------------------------------------------------
    # PAN
    # ------------------------------------------------------------------------

    if fv.get(
        "pan_structure_valid",
        float("nan"),
    ) == 0.0:

        lines.append(
            "PAN structural validation failed"
        )

    # ------------------------------------------------------------------------
    # Tampering
    # ------------------------------------------------------------------------

    ela_score = fv.get(
        "ela_score",
        float("nan"),
    )

    if not _is_missing(ela_score):

        ela_score = float(
            ela_score
        )

        if ela_score > 50:

            lines.append(
                f"High ELA score: {ela_score:.1f}"
            )

        elif ela_score > 25:

            lines.append(
                f"Moderate ELA score: {ela_score:.1f}"
            )

    metadata_anomaly = fv.get(
        "metadata_anomaly",
        0.0,
    )

    if not _is_missing(metadata_anomaly):

        if float(metadata_anomaly) > 0:

            lines.append(
                "Image metadata contains anomalies"
            )

    photo_anomaly = fv.get(
        "photo_region_anomaly",
        0.0,
    )

    if not _is_missing(photo_anomaly):

        if float(photo_anomaly) > 0:

            lines.append(
                "Photo/document region anomaly detected"
            )

    # ------------------------------------------------------------------------
    # Face
    # ------------------------------------------------------------------------

    face_match = fv.get(
        "face_match",
        float("nan"),
    )

    if face_match == 0.0:

        lines.append(
            "Biometric face verification failed"
        )

    face_confidence = fv.get(
        "face_match_confidence",
        float("nan"),
    )

    if not _is_missing(face_confidence):

        face_confidence = float(
            face_confidence
        )

        if face_confidence < 0.363:

            lines.append(
                f"Low face similarity confidence: "
                f"{face_confidence:.3f}"
            )

    # ------------------------------------------------------------------------
    # Missing critical field
    # ------------------------------------------------------------------------

    if fv.get(
        "critical_field_missing",
        0.0,
    ) == 1.0:

        lines.append(
            "Critical document identifier could not be extracted"
        )

    return (
        lines[:5]
        or [
            "No significant risk indicators detected"
        ]
    )