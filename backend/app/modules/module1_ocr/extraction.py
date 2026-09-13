from __future__ import annotations

import asyncio
import json
import re
import tempfile
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

try:
    from paddleocr import TextRecognition

    _PADDLEOCR_AVAILABLE = True
except ImportError:
    _PADDLEOCR_AVAILABLE = False

from app.config import get_settings
from app.modules.module1_ocr.templates import DEFAULT_TEMPLATES
from app.utils.logging import get_logger

logger = get_logger("module1_ocr.extraction")
_settings = get_settings()

_MRZ_ALPHABET = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<")


try:
    from pyzbar import pyzbar as _pyzbar  # type: ignore

    _PYZBAR_AVAILABLE = True
except ImportError:
    _PYZBAR_AVAILABLE = False
    logger.warning("pyzbar not installed — QR decode unavailable")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class FieldResult:
    text: str
    source: str = "paddleocr"
    # "paddleocr" | "qr_decode" | "blank" | "error"


@dataclass
class OcrExtractionResult:
    document_type: str
    fields: dict[str, FieldResult] = field(default_factory=dict)
    qr_data: dict[str, Any] | None = None
    fallback_fields: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def _load_image(image_path: str) -> Image.Image:
    return Image.open(image_path).convert("RGB")


def _crop_region(
    img: Image.Image,
    region: tuple[float, float, float, float],
) -> Image.Image:
    w, h = img.size

    x1 = int(region[0] * w)
    y1 = int(region[1] * h)
    x2 = int(region[2] * w)
    y2 = int(region[3] * h)

    return img.crop(
        (
            x1,
            y1,
            max(x2, x1 + 4),
            max(y2, y1 + 4),
        )
    )


def _is_blank(
    crop: Image.Image,
    threshold: float = 250.0,
) -> bool:
    arr = np.array(crop.convert("L"))

    return (
        arr.size == 0
        or float(arr.mean()) > threshold
    )


# ---------------------------------------------------------------------------
# Primary OCR — local PP-OCRv5 Mobile recognition
# ---------------------------------------------------------------------------

def _preprocess_crop(crop: Image.Image) -> np.ndarray:
    """
    Upscale a template crop while retaining pixels for neural OCR.
    """

    rgb = np.asarray(crop.convert("RGB"))

    if rgb.size == 0:
        return rgb

    # The supplied document templates contain small,
    # single-line text fields.
    #
    # Enlarging them gives the recognizer clearer glyph
    # edges without destructive binarisation.
    return cv2.resize(
        rgb,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC,
    )


@lru_cache(maxsize=1)
def _get_recognizer() -> Any:
    """
    Load the locally provisioned PP-OCRv5 recognition model.

    The model name and model directory come directly from
    application settings so PaddleOCR does not have to infer
    the model type from the directory.
    """

    if not _PADDLEOCR_AVAILABLE:
        raise RuntimeError(
            "PaddleOCR is not installed. "
            "Install backend requirements first."
        )

    model_dir = Path(
        _settings.paddle_ocr_model_dir
    )

    if not model_dir.is_dir() or not any(model_dir.iterdir()):
        raise RuntimeError(
            "Local PP-OCR model is missing at "
            f"'{model_dir}'. "
            "Provision the approved PP-OCRv5 model first."
        )

    logger.info(
        "Loading local PaddleOCR recognition model: %s",
        model_dir.resolve(),
    )

    logger.info(
        "Configured PaddleOCR model name: %s",
        _settings.paddle_ocr_model_name,
    )

    return TextRecognition(
        model_name=_settings.paddle_ocr_model_name,
        model_dir=str(model_dir),
        device=_settings.paddle_ocr_device,
        enable_mkldnn=_settings.paddle_ocr_enable_mkldnn,
    )


# ---------------------------------------------------------------------------
# PaddleOCR result handling
# ---------------------------------------------------------------------------

def _prediction_payload(
    prediction: Any,
) -> dict[str, Any]:
    """
    Read PaddleOCR v3 result objects without depending
    on presentation APIs.
    """

    payload = getattr(
        prediction,
        "json",
        prediction,
    )

    if callable(payload):
        payload = payload()

    if isinstance(payload, str):
        payload = json.loads(payload)

    if not isinstance(payload, dict):
        raise ValueError(
            "Unexpected PaddleOCR prediction payload"
        )

    result = payload.get(
        "res",
        payload,
    )

    if not isinstance(result, dict):
        raise ValueError(
            "Unexpected PaddleOCR recognition result"
        )

    return result


# ---------------------------------------------------------------------------
# Field cleanup
# ---------------------------------------------------------------------------

def _clean_field_text(
    text: str,
    field_name: str,
) -> str:

    text = (
        " ".join(
            text.replace("\n", " ").split()
        )
        .strip()
    )

    # Aadhaar
    if field_name == "aadhaar_number":
        digits = re.sub(
            r"\D",
            "",
            text,
        )

        return " ".join(
            digits[i:i + 4]
            for i in range(
                0,
                len(digits),
                4,
            )
        )

    # PAN
    if field_name == "pan_number":
        return re.sub(
            r"[^A-Z0-9]",
            "",
            text.upper(),
        )

    # Passport
    if field_name == "passport_number":
        return re.sub(
            r"[^A-Z0-9-]",
            "",
            text.upper(),
        )

    # Gender / nationality
    if field_name in {
        "gender",
        "nationality",
    }:
        return re.sub(
            r"[^A-Z]",
            "",
            text.upper(),
        )

    return text


# ---------------------------------------------------------------------------
# OCR field extraction
# ---------------------------------------------------------------------------

def ocr_field(
    crop: Any,
    lang: str = "en",
    field_name: str = "",
) -> dict[str, Any]:
    """
    Run the local PP-OCRv5 recognition model
    on one template crop.
    """

    # NumPy array validation
    if isinstance(crop, np.ndarray):

        if crop.size == 0:
            return {
                "text": "",
            }

    # PIL image validation
    elif hasattr(crop, "size"):

        if (
            crop.size[0] == 0
            or crop.size[1] == 0
        ):
            return {
                "text": "",
            }

    try:

        arr = _preprocess_crop(crop)

        if arr.size == 0:
            return {
                "text": "",
            }

        recognizer = _get_recognizer()

        prediction = next(
            iter(
                recognizer.predict(
                    arr,
                    batch_size=1,
                )
            )
        )

        payload = _prediction_payload(
            prediction
        )

        text = str(
            payload.get(
                "rec_text",
                "",
            )
        )

        score = payload.get(
            "rec_score"
        )

        cleaned_text = _clean_field_text(
            text,
            field_name,
        )

        logger.debug(
            "OCR field='%s' raw='%s' cleaned='%s' confidence=%s",
            field_name,
            text,
            cleaned_text,
            score,
        )

        return {
            "text": cleaned_text,
            "confidence": score,
        }

    except Exception as exc:

        logger.error(
            "PaddleOCR crop extraction error "
            "for field '%s': %s",
            field_name,
            exc,
        )

        return {
            "text": "",
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# MRZ cleanup
# ---------------------------------------------------------------------------

def _clean_mrz(
    text: str,
) -> str:

    text = (
        text.upper()
        .replace(" ", "")
        .replace("\n", "")
    )

    text = "".join(
        c
        if c in _MRZ_ALPHABET
        else "<"
        for c in text
    )

    if len(text) < 44:
        text = text.ljust(
            44,
            "<",
        )

    return text[:44]


# ---------------------------------------------------------------------------
# QR decode (Aadhaar)
# ---------------------------------------------------------------------------

def _decode_qr(
    img: Image.Image,
) -> dict[str, Any] | None:

    if not _PYZBAR_AVAILABLE:
        return None

    arr = np.array(img)

    if arr.size == 0:
        return None

    codes = _pyzbar.decode(arr)

    if not codes:
        return None

    raw = codes[0].data.decode(
        "utf-8",
        errors="replace",
    )

    qr: dict[str, Any] = {
        "raw": raw
    }

    for attr in [
        "name",
        "dob",
        "gender",
        "co",
        "house",
        "street",
        "lm",
        "loc",
        "vtc",
        "dist",
        "state",
        "pc",
        "uid",
    ]:

        match = re.search(
            rf'{attr}="([^"]*)"',
            raw,
            re.IGNORECASE,
        )

        if match:
            qr[attr] = match.group(1)

    return qr


def _inject_qr_fields(
    result: OcrExtractionResult,
) -> None:

    qr = result.qr_data

    if not qr:
        return

    qr_map = {
        "full_name": qr.get("name"),
        "dob": qr.get("dob"),
        "gender": qr.get("gender"),
        "aadhaar_number": qr.get("uid"),
    }

    for field_name, qr_val in qr_map.items():

        if not qr_val:
            continue

        existing = result.fields.get(
            field_name
        )

        if (
            existing is None
            or not existing.text
        ):
            result.fields[field_name] = FieldResult(
                text=str(qr_val),
                source="qr_decode",
            )


# ---------------------------------------------------------------------------
# Pipeline entry points
# ---------------------------------------------------------------------------

async def extract_fields_async(
    image_path: str,
    doc_type: str,
    template: list[dict[str, Any]] | None = None,
    save_debug_crops: bool = False,
) -> OcrExtractionResult:
    """
    Async wrapper — offloads CPU-bound OCR
    to the thread pool.
    """

    loop = asyncio.get_running_loop()

    return await loop.run_in_executor(
        None,
        _extract_fields_sync,
        image_path,
        doc_type,
        template,
        save_debug_crops,
    )


def extract_document(
    image_path: str,
    doc_type: str,
    template: list[dict[str, Any]] | None = None,
    save_debug_crops: bool = False,
) -> OcrExtractionResult:
    """
    Synchronously extract a document and optionally
    save every template crop.
    """

    return _extract_fields_sync(
        image_path,
        doc_type,
        template,
        save_debug_crops,
    )


# ---------------------------------------------------------------------------
# Main extraction pipeline
# ---------------------------------------------------------------------------

def _extract_fields_sync(
    image_path: str,
    doc_type: str,
    template: list[dict[str, Any]] | None = None,
    save_debug_crops: bool = False,
) -> OcrExtractionResult:

    doc_type = doc_type.lower().strip()

    if doc_type not in DEFAULT_TEMPLATES:
        raise ValueError(
            f"Unknown doc_type '{doc_type}'"
        )

    result = OcrExtractionResult(
        document_type=doc_type
    )

    img = _load_image(
        image_path
    )

    field_templates = (
        template
        if template is not None
        else DEFAULT_TEMPLATES[doc_type]
    )

    debug_dir: Path | None = None

    if save_debug_crops:

        debug_dir = (
            Path(tempfile.gettempdir())
            / f"debug_crops_{doc_type}"
        )

        debug_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        logger.info(
            "Saving OCR debug crops to %s",
            debug_dir,
        )

    # -----------------------------------------------------------------------
    # Aadhaar QR
    # -----------------------------------------------------------------------

    if doc_type == "aadhaar":
        result.qr_data = _decode_qr(img)

        if result.qr_data:
            logger.info(
                "Aadhaar QR code decoded successfully."
            )
        else:
            logger.info(
                "No Aadhaar QR code detected."
            )

    # -----------------------------------------------------------------------
    # Template-based OCR
    # -----------------------------------------------------------------------

    for fdef in field_templates:

        fname: str = fdef["name"]
        lang: str = fdef["lang"]

        crop = _crop_region(
            img,
            fdef["region"],
        )

        if debug_dir is not None:

            crop.save(
                debug_dir
                / f"{fname}.png"
            )

        if _is_blank(crop):

            result.fields[fname] = FieldResult(
                text="",
                source="blank",
            )

            continue

        res = ocr_field(
            crop,
            lang,
            fname,
        )

        text = res.get(
            "text",
            "",
        )

        if fname.startswith("mrz"):
            text = _clean_mrz(text)

        source = (
            "error"
            if res.get("error")
            else "paddleocr"
        )

        result.fields[fname] = FieldResult(
            text=text,
            source=source,
        )

    # -----------------------------------------------------------------------
    # Aadhaar QR fallback
    # -----------------------------------------------------------------------

    if (
        doc_type == "aadhaar"
        and result.qr_data
    ):
        _inject_qr_fields(result)

    return result


# ---------------------------------------------------------------------------
# API serialization
# ---------------------------------------------------------------------------

def result_to_api_dict(
    result: OcrExtractionResult,
) -> dict[str, Any]:

    return {
        fname: {
            "text": fr.text,
        }
        for fname, fr in result.fields.items()
    }