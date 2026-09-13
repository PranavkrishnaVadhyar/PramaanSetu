
"""
Module 4 — Face Verification

1:1 biometric match between the photo on the document and a live capture image.
Uses DeepFace with the ArcFace model for cosine-similarity face embedding
comparison.

DeepFace is the only face-verification backend.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from app.utils.logging import get_logger

logger = get_logger("module4.face")


# ---------------------------------------------------------------------------
# DeepFace availability
# ---------------------------------------------------------------------------

try:
    from deepface import DeepFace  # type: ignore

    _DEEPFACE_AVAILABLE = True

except ImportError:
    _DEEPFACE_AVAILABLE = False
    logger.warning(
        "DeepFace is not installed — face verification unavailable"
    )


# ---------------------------------------------------------------------------
# Result object
# ---------------------------------------------------------------------------

@dataclass
class FaceVerificationResult:
    match: bool
    confidence: float   # 0.0–1.0 cosine similarity
    error: str | None = None


# ---------------------------------------------------------------------------
# Async entry point
# ---------------------------------------------------------------------------

async def verify_faces(
    doc_image_path: str | None,
    live_capture_path: str | None,
) -> FaceVerificationResult | None:
    """
    Async entry point.

    Returns None when live_capture_path is not supplied.

    DeepFace verification is CPU-bound, so it is executed in a worker
    thread to avoid blocking the async event loop.
    """

    if live_capture_path is None or doc_image_path is None:
        logger.info(
            "face_verification: skipped (no live capture)"
        )
        return None

    return await asyncio.to_thread(
        _verify_sync,
        doc_image_path,
        live_capture_path,
    )


# ---------------------------------------------------------------------------
# Synchronous verification
# ---------------------------------------------------------------------------

def _verify_sync(
    doc_image_path: str,
    live_capture_path: str,
) -> FaceVerificationResult:
    """
    Synchronous face verification using DeepFace + ArcFace.
    """

    if not _DEEPFACE_AVAILABLE:
        logger.error(
            "face_verification: DeepFace is unavailable"
        )

        return FaceVerificationResult(
            match=False,
            confidence=0.0,
            error=(
                "DeepFace is not installed. "
                "Install it with: pip install deepface"
            ),
        )

    return _verify_deepface(
        doc_image_path,
        live_capture_path,
    )


# ---------------------------------------------------------------------------
# DeepFace + ArcFace
# ---------------------------------------------------------------------------

def _verify_deepface(
    doc_path: str,
    live_path: str,
) -> FaceVerificationResult:
    """
    Compare document photo and live capture using DeepFace + ArcFace.

    ArcFace produces face embeddings which DeepFace compares using
    cosine distance.

    Lower cosine distance = more similar faces.
    """

    try:

        result = DeepFace.verify(
            img1_path=doc_path,
            img2_path=live_path,

            # Face recognition model
            model_name="ArcFace",

            # Similarity metric
            distance_metric="cosine",

            # Do not fail immediately if face detection is imperfect
            enforce_detection=False,
        )

        # DeepFace returns cosine distance.
        distance = float(
            result.get("distance", 1.0)
        )

        # Convert distance into an intuitive 0–1 similarity score.
        confidence = max(
            0.0,
            min(1.0, 1.0 - distance),
        )

        verified = bool(
            result.get("verified", False)
        )

        logger.info(
            "face_verification: "
            "deepface match=%s confidence=%.3f distance=%.3f",
            verified,
            confidence,
            distance,
        )

        return FaceVerificationResult(
            match=verified,
            confidence=round(confidence, 4),
        )

    except Exception as exc:

        logger.error(
            "face_verification: DeepFace error: %s",
            exc,
        )

        return FaceVerificationResult(
            match=False,
            confidence=0.0,
            error=str(exc),
        )

