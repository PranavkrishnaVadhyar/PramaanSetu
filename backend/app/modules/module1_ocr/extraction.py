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
    from paddleocr import PaddleOCR, TextRecognition
    _PADDLEOCR_AVAILABLE = True
except ImportError:
    PaddleOCR = None  # type: ignore
    TextRecognition = None  # type: ignore
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
    _pyzbar = None
    _PYZBAR_AVAILABLE = False
    logger.warning("pyzbar not installed — QR decode unavailable")


@dataclass
class FieldResult:
    text: str
    source: str = "paddleocr"
    confidence: float | None = None
    bbox: list[int] | None = None


@dataclass
class OcrExtractionResult:
    document_type: str
    fields: dict[str, FieldResult] = field(default_factory=dict)
    qr_data: dict[str, Any] | None = None
    fallback_fields: list[str] = field(default_factory=list)


@dataclass
class OcrToken:
    text: str
    confidence: float
    bbox: list[int]
    center_x: float
    center_y: float


def _setting(name: str, default: Any = None) -> Any:
    return getattr(_settings, name, default)


def _load_image(image_path: str) -> Image.Image:
    return Image.open(image_path).convert("RGB")


def _crop_region(
    img: Image.Image,
    region: tuple[float, float, float, float],
    padding: float = 0.0,
) -> Image.Image:
    w, h = img.size
    x1 = max(0, int((region[0] - padding) * w))
    y1 = max(0, int((region[1] - padding) * h))
    x2 = min(w, int((region[2] + padding) * w))
    y2 = min(h, int((region[3] + padding) * h))
    return img.crop((x1, y1, max(x2, x1 + 4), max(y2, y1 + 4)))


def _is_blank(crop: Image.Image, threshold: float = 250.0) -> bool:
    arr = np.asarray(crop.convert("L"))
    return arr.size == 0 or float(arr.mean()) > threshold


# ---------------------------------------------------------------------------
# PaddleOCR models
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_full_ocr() -> Any:
    """Load full-document PaddleOCR detection + recognition.

    oneDNN is deliberately disabled here. The current Windows/Paddle runtime
    was failing in the full-page detector with a PIR/oneDNN attribute error.
    The recognition-only fallback keeps the application's configured setting.
    """
    if not _PADDLEOCR_AVAILABLE or PaddleOCR is None:
        raise RuntimeError("PaddleOCR is not installed. Install backend requirements first.")

    # IMPORTANT: do not inherit the application's oneDNN flag for this model.
    # Full-page PaddleOCR was failing with:
    # ConvertPirAttribute2RuntimeAttribute ... ArrayAttribute<DoubleAttribute>
    kwargs: dict[str, Any] = {
        "device": _setting("paddle_ocr_device", "cpu"),
        "enable_mkldnn": False,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
    }

    det_dir = _setting("paddle_ocr_det_model_dir")
    if det_dir and Path(det_dir).is_dir():
        kwargs["text_detection_model_dir"] = str(Path(det_dir))

    rec_dir = _setting("paddle_ocr_rec_model_dir", _setting("paddle_ocr_model_dir"))
    if rec_dir and Path(rec_dir).is_dir():
        kwargs["text_recognition_model_dir"] = str(Path(rec_dir))

    rec_name = _setting("paddle_ocr_model_name", "PP-OCRv5_mobile_rec")
    if rec_name:
        kwargs["text_recognition_model_name"] = rec_name

    logger.info("Loading PaddleOCR full-document pipeline: %s", kwargs)
    return PaddleOCR(**kwargs)


@lru_cache(maxsize=1)
def _get_recognizer() -> Any:
    """Load the existing local PP-OCRv5 Mobile recognition model."""
    if not _PADDLEOCR_AVAILABLE or TextRecognition is None:
        raise RuntimeError("PaddleOCR is not installed. Install backend requirements first.")

    model_dir = Path(_setting("paddle_ocr_model_dir", ""))
    if not model_dir.is_dir() or not any(model_dir.iterdir()):
        raise RuntimeError(f"Local PP-OCR model is missing at '{model_dir}'.")

    return TextRecognition(
        model_name=_setting("paddle_ocr_model_name", "PP-OCRv5_mobile_rec"),
        model_dir=str(model_dir),
        device=_setting("paddle_ocr_device", "cpu"),
        enable_mkldnn=bool(_setting("paddle_ocr_enable_mkldnn", True)),
    )


# ---------------------------------------------------------------------------
# PaddleOCR result handling
# ---------------------------------------------------------------------------

def _prediction_payload(prediction: Any) -> dict[str, Any]:
    payload = getattr(prediction, "json", prediction)
    if callable(payload):
        payload = payload()
    if isinstance(payload, str):
        payload = json.loads(payload)
    if not isinstance(payload, dict):
        raise ValueError("Unexpected PaddleOCR prediction payload")
    result = payload.get("res", payload)
    if not isinstance(result, dict):
        raise ValueError("Unexpected PaddleOCR result payload")
    return result


def _extract_tokens(prediction: Any) -> list[OcrToken]:
    payload = _prediction_payload(prediction)
    texts = payload.get("rec_texts", []) or []
    scores = payload.get("rec_scores", []) or []
    boxes = payload.get("rec_boxes") or payload.get("rec_polys") or payload.get("dt_polys") or []

    tokens: list[OcrToken] = []
    for i, raw_text in enumerate(texts):
        text = str(raw_text).strip()
        if not text:
            continue
        try:
            confidence = float(scores[i])
        except (IndexError, TypeError, ValueError):
            confidence = 0.0
        try:
            pts = np.asarray(boxes[i]).reshape(-1, 2)
            x1, y1 = int(np.min(pts[:, 0])), int(np.min(pts[:, 1]))
            x2, y2 = int(np.max(pts[:, 0])), int(np.max(pts[:, 1]))
        except (IndexError, TypeError, ValueError):
            continue
        if x2 <= x1 or y2 <= y1:
            continue
        tokens.append(
            OcrToken(
                text=text,
                confidence=max(0.0, min(1.0, confidence)),
                bbox=[x1, y1, x2, y2],
                center_x=(x1 + x2) / 2,
                center_y=(y1 + y2) / 2,
            )
        )
    return tokens


# ---------------------------------------------------------------------------
# Field cleanup / validation hints
# ---------------------------------------------------------------------------

def _clean_field_text(text: str, field_name: str) -> str:
    text = " ".join(text.replace("\n", " ").split()).strip()

    if field_name == "aadhaar_number":
        digits = re.sub(r"\D", "", text)
        return " ".join(digits[i:i + 4] for i in range(0, len(digits), 4))

    if field_name == "pan_number":
        return re.sub(r"[^A-Z0-9]", "", text.upper())

    if field_name == "passport_number":
        return re.sub(r"[^A-Z0-9]", "", text.upper())

    if field_name in {"gender", "nationality"}:
        return re.sub(r"[^A-Z]", "", text.upper())

    return text


def _looks_like_field(text: str, field: str) -> bool:
    t = text.upper().strip()
    compact = re.sub(r"[^A-Z0-9]", "", t)

    if field == "aadhaar_number":
        return len(re.sub(r"\D", "", t)) >= 10
    if field == "pan_number":
        return bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", compact))
    if field == "passport_number":
        return bool(re.fullmatch(r"[A-Z][A-Z0-9]{5,8}", compact))
    if field == "dob":
        return bool(re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", t))
    if field == "gender":
        return t in {"M", "F", "MALE", "FEMALE"} or "MALE" in t or "FEMALE" in t
    if field == "nationality":
        return t in {"IND", "INDIAN", "INDIA"} or "IND" in t
    return bool(t)


def _region_pixels(
    size: tuple[int, int],
    region: tuple[float, float, float, float],
) -> tuple[float, float, float, float]:
    w, h = size
    return region[0] * w, region[1] * h, region[2] * w, region[3] * h


def _overlap(bbox: list[int], region: tuple[float, float, float, float]) -> float:
    x1, y1, x2, y2 = bbox
    rx1, ry1, rx2, ry2 = region
    ix1, iy1 = max(x1, rx1), max(y1, ry1)
    ix2, iy2 = min(x2, rx2), min(y2, ry2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    return ((ix2 - ix1) * (iy2 - iy1)) / max(1.0, (x2 - x1) * (y2 - y1))


def _inside(token: OcrToken, region: tuple[float, float, float, float]) -> bool:
    return region[0] <= token.center_x <= region[2] and region[1] <= token.center_y <= region[3]



def _normalize_label(text: str) -> str:
    """Normalize OCR text for semantic label matching."""
    return re.sub(r"[^A-Z ]", "", text.upper()).strip()


_FIELD_LABELS: dict[str, tuple[str, ...]] = {
    "full_name": ("NAME", "FULL NAME", "SURNAME", "GIVEN NAMES", "SURNAME GIVEN NAMES"),
    "dob": ("DATE OF BIRTH", "DOB", "BIRTH DATE"),
    "gender": ("GENDER", "SEX"),
    "nationality": ("NATIONALITY",),
    "address": ("ADDRESS",),
    "aadhaar_number": ("TEST RESIDENT NUMBER", "AADHAAR", "AADHAAR NUMBER", "UID"),
    "pan_number": ("PAN", "PERMANENT ACCOUNT NUMBER"),
    "passport_number": ("PASSPORT NUMBER", "PASSPORT NO", "DOCUMENT NUMBER"),
}


def _is_label_token(text: str, field_name: str | None = None) -> bool:
    n = _normalize_label(text)
    if field_name and any(n == label or label in n for label in _FIELD_LABELS.get(field_name, ())):
        return True
    all_labels = [label for labels in _FIELD_LABELS.values() for label in labels]
    return any(n == label or label in n for label in all_labels)


def _semantic_candidate_score(token: OcrToken, field_name: str, anchor: OcrToken) -> tuple[float, bool]:
    """Score a value token relative to a nearby field label."""
    raw = token.text.strip()
    compact = re.sub(r"[^A-Z0-9]", "", raw.upper())
    type_match = _looks_like_field(raw, field_name)

    dx = token.center_x - anchor.center_x
    dy = token.center_y - anchor.center_y
    # Generated and most ID cards put the value below the label. Also allow a
    # value to the right of a label for real-world layouts.
    below = dy >= 0 and dy <= 180
    right = dx >= -30 and dx <= 650 and abs(dy) <= 100
    if not (below or right):
        return -999.0, False

    distance_penalty = (abs(dy) / 120.0) + (abs(dx) / 800.0)
    score = token.confidence - 0.25 * distance_penalty
    if below:
        score += 0.25
    if right:
        score += 0.20
    if type_match:
        score += 3.0

    # Labels themselves must never become values.
    if _is_label_token(raw):
        score -= 5.0

    if field_name == "aadhaar_number":
        digits = re.sub(r"\D", "", raw)
        if len(digits) == 12:
            score += 4.0
            if _aadhaar_verhoeff_valid(digits):
                score += 3.0
    elif field_name == "dob" and type_match:
        score += 2.0
    elif field_name == "gender" and type_match:
        score += 2.0
    elif field_name == "nationality" and type_match:
        score += 2.0
    elif field_name in {"pan_number", "passport_number"} and type_match:
        score += 2.5

    return score, type_match


def _semantic_assign_field(tokens: list[OcrToken], field_name: str) -> tuple[str, float | None, list[int] | None]:
    """Assign a field using label -> nearby value semantics.

    This is deliberately used before spatial template assignment. A template
    can tell us roughly where a field lives, but semantic labels prevent the
    classic failure where the label itself (or the next field's value) is
    returned as the field value.
    """
    labels = _FIELD_LABELS.get(field_name, ())
    label_tokens: list[OcrToken] = []
    for token in tokens:
        n = _normalize_label(token.text)
        if any(n == label or label in n for label in labels):
            label_tokens.append(token)

    if not label_tokens:
        return "", None, None

    # Prefer the most confident label, with a slight preference for labels
    # that are exact rather than substrings.
    anchor = max(
        label_tokens,
        key=lambda t: (t.confidence, max((1 if _normalize_label(t.text) == x else 0) for x in labels)),
    )

    candidates: list[tuple[float, OcrToken, bool]] = []
    for token in tokens:
        if token is anchor or _is_label_token(token.text):
            continue
        score, type_match = _semantic_candidate_score(token, field_name, anchor)
        if score > -900:
            candidates.append((score, token, type_match))

    if not candidates:
        return "", None, None

    candidates.sort(key=lambda item: item[0], reverse=True)

    # Structured fields should be a single token. Name/address may contain
    # multiple tokens, so collect a short same-line group after choosing the
    # best candidate.
    best_score, best, best_type = candidates[0]

    if field_name in {"aadhaar_number", "pan_number", "passport_number", "dob", "gender", "nationality"}:
        if field_name == "aadhaar_number" and len(re.sub(r"\D", "", best.text)) != 12:
            # Search globally for a valid 12-digit candidate as a final
            # semantic rescue. This is particularly useful when the label and
            # value are far apart in a card layout.
            valid = [t for t in tokens if len(re.sub(r"\D", "", t.text)) == 12]
            if valid:
                best = max(valid, key=lambda t: (_aadhaar_verhoeff_valid(re.sub(r"\D", "", t.text)), t.confidence))
                best_score = best.confidence + 4.0 + (3.0 if _aadhaar_verhoeff_valid(re.sub(r"\D", "", best.text)) else 0.0)
            else:
                return "", None, None
        text = _clean_field_text(best.text, field_name)
        return text, best.confidence, best.bbox

    if field_name == "full_name":
        selected = [best]
        for score, token, _ in candidates[1:]:
            if token.center_y <= best.center_y + 18 and abs(token.center_x - best.center_x) < 500:
                selected.append(token)
            if len(selected) >= 4:
                break
        selected.sort(key=lambda t: t.bbox[0])
        text = _clean_field_text(" ".join(t.text for t in selected), field_name)
    elif field_name == "address":
        selected = [best]
        for score, token, _ in candidates[1:]:
            if token.center_y >= best.center_y and token.center_y <= best.center_y + 90 and abs(token.center_x - best.center_x) < 700:
                selected.append(token)
            if len(selected) >= 6:
                break
        selected.sort(key=lambda t: (t.center_y, t.bbox[0]))
        text = _clean_field_text(" ".join(t.text for t in selected), field_name)
    else:
        text = _clean_field_text(best.text, field_name)
        selected = [best]

    if not text:
        return "", None, None
    bbox = [
        min(t.bbox[0] for t in selected),
        min(t.bbox[1] for t in selected),
        max(t.bbox[2] for t in selected),
        max(t.bbox[3] for t in selected),
    ]
    return text, float(np.mean([t.confidence for t in selected])), bbox


def _assign_field(
    tokens: list[OcrToken],
    field_name: str,
    region: tuple[float, float, float, float],
) -> tuple[str, float | None, list[int] | None]:
    candidates: list[tuple[float, OcrToken]] = []

    for token in tokens:
        inside = _inside(token, region)
        overlap = _overlap(token.bbox, region)
        if not inside and overlap < 0.05:
            continue

        type_match = _looks_like_field(token.text, field_name)
        score = (
            (6.0 if inside else 0.0)
            + 4.0 * overlap
            + (4.0 if type_match else 0.0)
            + token.confidence
        )
        candidates.append((score, token))

    if not candidates:
        return "", None, None

    # Avoid pulling unrelated words into compact structured fields.
    if field_name in {
        "aadhaar_number", "pan_number", "passport_number", "dob",
        "gender", "nationality",
    }:
        matching = [item for item in candidates if _looks_like_field(item[1].text, field_name)]
        if matching:
            candidates = matching

    candidates.sort(key=lambda item: item[0], reverse=True)
    selected = [token for _, token in candidates[:3]]

    # For single-value fields, one token is normally preferable.
    if field_name not in {"full_name", "address", "mrz_line_1", "mrz_line_2"}:
        selected = selected[:1]

    selected.sort(key=lambda token: (token.center_y, token.bbox[0]))
    text = " ".join(token.text for token in selected).strip()
    if not text:
        return "", None, None

    confidence = float(np.mean([token.confidence for token in selected]))
    bbox = [
        min(token.bbox[0] for token in selected),
        min(token.bbox[1] for token in selected),
        max(token.bbox[2] for token in selected),
        max(token.bbox[3] for token in selected),
    ]
    return text, confidence, bbox


# ---------------------------------------------------------------------------
# MRZ handling
# ---------------------------------------------------------------------------

def _mrz_normalize(text: str) -> str:
    text = text.upper().replace(" ", "").replace("\n", "")
    # Common OCR confusions in MRZ. Do not convert < because it is valid MRZ data.
    replacements = {
        "«": "<", "‹": "<", "|": "<", "I": "I",
    }
    text = "".join(replacements.get(c, c) for c in text)
    return "".join(c if c in _MRZ_ALPHABET else "<" for c in text)


def _mrz_quality(line: str) -> float:
    compact = _mrz_normalize(line)
    if not compact:
        return 0.0
    non_fill = sum(c != "<" for c in compact)
    alnum = sum(c.isalnum() for c in compact)
    return (0.6 * min(len(compact), 44) / 44.0) + (0.4 * min(alnum, 20) / 20.0)


def _clean_mrz(text: str) -> str:
    text = _mrz_normalize(text)
    return text.ljust(44, "<")[:44]


def _looks_readable_mrz(text: str) -> bool:
    compact = _mrz_normalize(text)
    # A line consisting almost entirely of filler is not useful OCR.
    if len(compact) < 20:
        return False
    return sum(c != "<" for c in compact) >= 8


def _mrz_tokens(tokens: list[OcrToken], image_height: int) -> list[OcrToken]:
    """Prefer tokens in the lower part of a passport where the MRZ lives."""
    lower = [t for t in tokens if t.center_y >= image_height * 0.62]
    return sorted(lower, key=lambda t: (t.center_y, t.bbox[0]))


def _assemble_mrz_from_tokens(tokens: list[OcrToken], image_height: int) -> tuple[str, str]:
    candidates = _mrz_tokens(tokens, image_height)
    if not candidates:
        return "", ""

    # Group by vertical proximity. Passport MRZ has exactly two horizontal lines.
    median_height = float(np.median([max(1, t.bbox[3] - t.bbox[1]) for t in candidates]))
    groups: list[list[OcrToken]] = []

    for token in candidates:
        placed = False
        for group in groups:
            center_y = float(np.mean([x.center_y for x in group]))
            if abs(token.center_y - center_y) <= max(12.0, median_height * 1.5):
                group.append(token)
                placed = True
                break
        if not placed:
            groups.append([token])

    groups.sort(key=lambda g: float(np.mean([t.center_y for t in g])))
    groups = groups[-2:]

    lines: list[str] = []
    for group in groups:
        group.sort(key=lambda t: t.bbox[0])
        lines.append(_mrz_normalize("".join(t.text for t in group)))

    if len(lines) == 1:
        return lines[0], ""
    return lines[0], lines[1]


# ---------------------------------------------------------------------------
# Recognition-only fallback
# ---------------------------------------------------------------------------

def _preprocess_crop(crop: Image.Image, variant: int = 0) -> np.ndarray:
    rgb = np.asarray(crop.convert("RGB"))
    if rgb.size == 0:
        return rgb

    # MRZ/text crops benefit from enlargement. Keep RGB because the recognizer
    # was trained on natural RGB inputs.
    scale = 4 if variant == 0 else 5
    enlarged = cv2.resize(rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    if variant == 1:
        gray = cv2.cvtColor(enlarged, cv2.COLOR_RGB2GRAY)
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        return cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)

    if variant == 2:
        gray = cv2.cvtColor(enlarged, cv2.COLOR_RGB2GRAY)
        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        sharp = cv2.addWeighted(gray, 1.5, blur, -0.5, 0)
        return cv2.cvtColor(sharp, cv2.COLOR_GRAY2RGB)

    return enlarged


def _aadhaar_verhoeff_valid(value: str) -> bool | None:
    """Local checksum hint used only to choose among OCR candidates."""
    digits = re.sub(r"\D", "", value)
    if len(digits) != 12 or not digits.isdigit():
        return None

    d = (
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    )
    perm = (
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    )
    c = 0
    for i, digit in enumerate(reversed(digits)):
        c = d[c][perm[i % 8][int(digit)]]
    return c == 0


def _candidate_profile(field_name: str, text: str, confidence: float) -> tuple[float, bool]:
    """Score an OCR candidate using field structure without inventing text."""
    cleaned = _clean_mrz(text) if field_name.startswith("mrz") else _clean_field_text(text, field_name)
    compact = re.sub(r"[^A-Z0-9]", "", cleaned.upper())
    score = float(confidence)
    valid = False

    if field_name == "aadhaar_number":
        digits = re.sub(r"\D", "", cleaned)
        if len(digits) == 12:
            valid = True
            score += 0.35
            if _aadhaar_verhoeff_valid(digits):
                score += 0.45

    elif field_name == "pan_number":
        valid = bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", compact))
        if valid:
            score += 0.45

    elif field_name == "passport_number":
        valid = bool(re.fullmatch(r"[A-Z][A-Z0-9]{6,8}", compact))
        if valid:
            score += 0.35

    elif field_name == "dob":
        match = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b", cleaned)
        if match:
            try:
                day, month = int(match.group(1)), int(match.group(2))
                valid = 1 <= day <= 31 and 1 <= month <= 12
            except ValueError:
                valid = False
            if valid:
                score += 0.30

    elif field_name == "gender":
        valid = cleaned.upper() in {"M", "F", "MALE", "FEMALE"}
        if valid:
            score += 0.30

    elif field_name == "nationality":
        valid = cleaned.upper() in {"IND", "INDIAN", "INDIA"}
        if valid:
            score += 0.30

    elif field_name.startswith("mrz"):
        valid = _looks_readable_mrz(cleaned)
        if valid:
            score += 0.25

    else:
        valid = bool(cleaned)

    return score, valid


def _preprocess_variants(crop: Image.Image, field_name: str) -> list[np.ndarray]:
    """Generate OCR-safe variants; no aggressive binarisation by default."""
    rgb = np.asarray(crop.convert("RGB"))
    if rgb.size == 0:
        return []

    # Preserve aspect ratio. Small fields need enlargement, while MRZ benefits
    # from additional horizontal resolution.
    scale = 5 if field_name.startswith("mrz") else 4
    enlarged = cv2.resize(rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    variants = [enlarged]

    gray = cv2.cvtColor(enlarged, cv2.COLOR_RGB2GRAY)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    variants.append(cv2.cvtColor(clahe, cv2.COLOR_GRAY2RGB))

    denoised = cv2.fastNlMeansDenoising(gray, None, 7, 7, 21)
    variants.append(cv2.cvtColor(denoised, cv2.COLOR_GRAY2RGB))

    # A lightly sharpened version helps small printed characters without the
    # artifacts produced by hard thresholding.
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    sharp = cv2.addWeighted(gray, 1.6, blur, -0.6, 0)
    variants.append(cv2.cvtColor(sharp, cv2.COLOR_GRAY2RGB))

    if field_name.startswith("mrz"):
        # MRZ is black text on a light background. Otsu is useful as an
        # additional candidate, but never used as the sole OCR input.
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(cv2.cvtColor(otsu, cv2.COLOR_GRAY2RGB))

    return variants


def _recognize_crop(crop: Image.Image, field_name: str) -> dict[str, Any]:
    if _is_blank(crop):
        return {"text": ""}

    recognizer = _get_recognizer()
    candidates: list[dict[str, Any]] = []

    for variant, arr in enumerate(_preprocess_variants(crop, field_name)):
        try:
            prediction = next(iter(recognizer.predict(arr, batch_size=1)))
            payload = _prediction_payload(prediction)
            raw_text = str(payload.get("rec_text", ""))
            try:
                confidence = float(payload.get("rec_score", 0.0))
            except (TypeError, ValueError):
                confidence = 0.0

            text = (
                _clean_mrz(raw_text)
                if field_name.startswith("mrz")
                else _clean_field_text(raw_text, field_name)
            )
            rank, structurally_valid = _candidate_profile(field_name, text, confidence)

            candidate = {
                "text": text,
                "confidence": confidence,
                "rank": rank,
                "valid": structurally_valid,
                "variant": variant,
            }
            candidates.append(candidate)

            logger.info(
                "OCR candidate field='%s' variant=%d text='%s' confidence=%.3f valid=%s rank=%.3f",
                field_name, variant, text, confidence, structurally_valid, rank,
            )
        except Exception as exc:
            logger.warning(
                "PaddleOCR fallback failed field='%s' variant=%d: %s",
                field_name, variant, exc,
            )

    if not candidates:
        return {"text": ""}

    nonempty = [c for c in candidates if c["text"]]
    if not nonempty:
        return {"text": ""}

    # Prefer structurally valid candidates. For Aadhaar this also rewards a
    # candidate that passes Verhoeff, which is a strong OCR-correction signal.
    valid_candidates = [c for c in nonempty if c["valid"]]
    pool = valid_candidates if valid_candidates else nonempty
    best = max(pool, key=lambda c: (c["rank"], c["confidence"]))

    # If several variants agree exactly, increase confidence modestly. This is
    # a consensus signal, not a replacement for the model's own confidence.
    same_text = [c for c in nonempty if c["text"] == best["text"]]
    if len(same_text) >= 2:
        best = dict(best)
        best["confidence"] = min(0.99, float(best["confidence"]) + 0.05)

    return {
        "text": best["text"],
        "confidence": float(best["confidence"]),
        "candidate_valid": bool(best["valid"]),
        "variant": int(best["variant"]),
    }


# Backwards-compatible public helper.
def ocr_field(crop: Any, lang: str = "en", field_name: str = "") -> dict[str, Any]:
    if isinstance(crop, np.ndarray):
        if crop.size == 0:
            return {"text": ""}
        crop = Image.fromarray(crop.astype(np.uint8))
    return _recognize_crop(crop, field_name)


# ---------------------------------------------------------------------------
# Full-page OCR
# ---------------------------------------------------------------------------

def _run_full_document_ocr(image_path: str) -> list[OcrToken]:
    prediction = next(iter(_get_full_ocr().predict(image_path)))
    tokens = _extract_tokens(prediction)

    logger.info("Full-document PaddleOCR detected %d text regions", len(tokens))
    for idx, token in enumerate(tokens):
        logger.info(
            "OCR token[%d] text='%s' confidence=%.3f bbox=%s",
            idx, token.text, token.confidence, token.bbox,
        )
    return tokens


# ---------------------------------------------------------------------------
# Aadhaar QR
# ---------------------------------------------------------------------------

def _decode_qr(img: Image.Image) -> dict[str, Any] | None:
    if not _PYZBAR_AVAILABLE or _pyzbar is None:
        return None
    arr = np.asarray(img)
    if arr.size == 0:
        return None
    try:
        codes = _pyzbar.decode(arr)
    except Exception as exc:
        logger.warning("QR decode failed: %s", exc)
        return None
    if not codes:
        return None

    raw = codes[0].data.decode("utf-8", errors="replace")
    qr: dict[str, Any] = {"raw": raw}
    for attr in [
        "name", "dob", "gender", "co", "house", "street", "lm", "loc",
        "vtc", "dist", "state", "pc", "uid", "aadhaar_number",
    ]:
        match = re.search(rf'{attr}="([^"]*)"', raw, re.IGNORECASE)
        if match:
            qr[attr] = match.group(1)
    return qr


def _inject_qr_fields(result: OcrExtractionResult) -> None:
    if not result.qr_data:
        return
    qr_map = {
        "full_name": result.qr_data.get("name"),
        "dob": result.qr_data.get("dob"),
        "gender": result.qr_data.get("gender"),
        "aadhaar_number": result.qr_data.get("uid") or result.qr_data.get("aadhaar_number"),
    }
    for name, value in qr_map.items():
        if value and (name not in result.fields or not result.fields[name].text):
            result.fields[name] = FieldResult(
                text=_clean_field_text(str(value), name),
                source="qr_decode",
            )


# ---------------------------------------------------------------------------
# Extraction orchestration
# ---------------------------------------------------------------------------

def _needs_fallback(fdef: dict[str, Any], current: FieldResult) -> bool:
    name = str(fdef["name"])

    if not current.text:
        return True

    if name.startswith("mrz"):
        return not _looks_readable_mrz(current.text)

    if current.confidence is None or current.confidence < 0.80:
        return True

    if name == "aadhaar_number":
        digits = re.sub(r"\D", "", current.text)
        return len(digits) != 12

    if name == "pan_number":
        return not bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", current.text.upper()))

    if name == "passport_number":
        return not bool(re.fullmatch(r"[A-Z][A-Z0-9]{6,8}", current.text.upper()))

    if name == "dob":
        return not bool(re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", current.text))

    if name == "gender":
        return current.text.upper() not in {"M", "F", "MALE", "FEMALE"}

    if name == "nationality":
        return current.text.upper() not in {"IND", "INDIAN", "INDIA"}

    return False


def _extract_fields_sync(
    image_path: str,
    doc_type: str,
    template: list[dict[str, Any]] | None = None,
    save_debug_crops: bool = False,
) -> OcrExtractionResult:
    doc_type = doc_type.lower().strip()
    if doc_type not in DEFAULT_TEMPLATES:
        raise ValueError(f"Unknown doc_type '{doc_type}'")

    result = OcrExtractionResult(document_type=doc_type)
    img = _load_image(image_path)
    field_templates = template if template is not None else DEFAULT_TEMPLATES[doc_type]

    debug_dir: Path | None = None
    if save_debug_crops:
        debug_dir = Path(tempfile.gettempdir()) / f"debug_crops_{doc_type}"
        debug_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Saving OCR debug crops to %s", debug_dir)

    if doc_type == "aadhaar":
        result.qr_data = _decode_qr(img)
        logger.info("Aadhaar QR decode: %s", "success" if result.qr_data else "not detected")

    try:
        tokens = _run_full_document_ocr(image_path)
    except Exception as exc:
        logger.exception("Full-document PaddleOCR failed: %s", exc)
        tokens = []

    # First pass: field assignment from the complete document OCR.
    for fdef in field_templates:
        name = str(fdef["name"])
        region = _region_pixels(img.size, tuple(fdef["region"]))

        # Semantic label/value assignment is the primary path for ordinary
        # fields. Spatial templates remain the fallback because real documents
        # can omit labels or use unusual layouts.
        text, confidence, bbox = ("", None, None)
        if tokens and not name.startswith("mrz"):
            text, confidence, bbox = _semantic_assign_field(tokens, name)
        if not text:
            text, confidence, bbox = _assign_field(tokens, name, region)

        if name.startswith("mrz"):
            text = _clean_mrz(text) if text else ""
        else:
            text = _clean_field_text(text, name)

        result.fields[name] = FieldResult(
            text=text,
            source="paddleocr" if text else "blank",
            confidence=confidence,
            bbox=bbox,
        )

    # Passport MRZ gets a second full-page reconstruction before crop fallback.
    if doc_type == "passport" and tokens:
        mrz1, mrz2 = _assemble_mrz_from_tokens(tokens, img.size[1])
        for name, assembled in (("mrz_line_1", mrz1), ("mrz_line_2", mrz2)):
            if name not in result.fields:
                continue
            current = result.fields[name]
            if _looks_readable_mrz(assembled) and (
                not _looks_readable_mrz(current.text)
                or _mrz_quality(assembled) > _mrz_quality(current.text)
            ):
                result.fields[name] = FieldResult(
                    text=_clean_mrz(assembled),
                    source="paddleocr_fullpage_mrz",
                    confidence=current.confidence,
                    bbox=current.bbox,
                )

    # Targeted recognition is fallback only. MRZ is deliberately allowed to
    # use it because generic full-page OCR often struggles with tiny MRZ glyphs.
    for fdef in field_templates:
        name = str(fdef["name"])
        current = result.fields[name]
        if not _needs_fallback(fdef, current):
            continue

        try:
            # Add modest padding; this is more robust than an exact template crop.
            padding = 0.015 if name.startswith("mrz") else 0.01
            crop = _crop_region(img, tuple(fdef["region"]), padding=padding)

            if save_debug_crops and debug_dir is not None:
                crop.save(debug_dir / f"{name}_fallback.png")

            if _is_blank(crop):
                continue

            fallback = _recognize_crop(crop, name)
            fallback_text = fallback.get("text", "")
            fallback_conf = fallback.get("confidence")
            fallback_valid = bool(fallback.get("candidate_valid", False))

            if not fallback_text:
                continue

            current_rank, current_valid = _candidate_profile(
                name, current.text, float(current.confidence or 0.0)
            )
            fallback_rank, _ = _candidate_profile(
                name, fallback_text, float(fallback_conf or 0.0)
            )

            if name.startswith("mrz"):
                fallback_ok = _looks_readable_mrz(fallback_text)
                current_ok = _looks_readable_mrz(current.text)
                replace = fallback_ok and (
                    not current_ok
                    or _mrz_quality(fallback_text) > _mrz_quality(current.text)
                    or float(fallback_conf or 0.0) > float(current.confidence or 0.0) + 0.10
                )
            else:
                # A structurally valid fallback beats a malformed full-page
                # candidate even if its raw OCR confidence is slightly lower.
                replace = (
                    not current.text
                    or (fallback_valid and not current_valid)
                    or fallback_rank > current_rank + 0.03
                )

            if replace:
                result.fields[name] = FieldResult(
                    text=fallback_text,
                    source="paddleocr_fallback",
                    confidence=float(fallback_conf) if fallback_conf is not None else None,
                )
                if name not in result.fallback_fields:
                    result.fallback_fields.append(name)
        except Exception as exc:
            logger.exception("Fallback processing failed for '%s': %s", name, exc)

    if doc_type == "aadhaar" and result.qr_data:
        _inject_qr_fields(result)

    return result


async def extract_fields_async(
    image_path: str,
    doc_type: str,
    template: list[dict[str, Any]] | None = None,
    save_debug_crops: bool = False,
) -> OcrExtractionResult:
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
    return _extract_fields_sync(image_path, doc_type, template, save_debug_crops)


def result_to_api_dict(result: OcrExtractionResult) -> dict[str, Any]:
    return {
        name: {
            "text": field.text,
            "confidence": field.confidence,
        }
        for name, field in result.fields.items()
    }
