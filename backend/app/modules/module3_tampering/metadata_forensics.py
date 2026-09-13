"""
Module 3 — Metadata Forensics

Inspects EXIF/image metadata for anomalies that indicate post-processing:
  - Presence of image editing software (Photoshop, GIMP, etc.)
  - EXIF date inconsistencies
  - Missing scanner/camera metadata expected in genuine document scans
"""
from __future__ import annotations

from datetime import datetime

from PIL import Image
from PIL.ExifTags import TAGS

from app.utils.logging import get_logger

logger = get_logger("module3.metadata")

# Software strings that suggest the image was processed by an editing tool
_EDITING_SOFTWARE_KEYWORDS = [
    "photoshop", "gimp", "affinity", "lightroom", "capture one",
    "pixelmator", "paint.net", "corel", "inkscape",
]

# Expected EXIF tags for a genuine scanner output
_SCANNER_TAGS = {"Make", "Model", "Software"}


def analyse_metadata(image_path: str) -> dict[str, object]:
    """
    Analyse EXIF metadata of a document image.

    Returns
    -------
    dict with:
        anomalies: list[str]  — human-readable anomaly descriptions
        raw_exif:  dict       — extracted EXIF key-value pairs (for logging)
    """
    anomalies: list[str] = []
    raw_exif: dict[str, str] = {}

    try:
        img = Image.open(image_path)
        exif_data = img._getexif()  # type: ignore[attr-defined]
    except Exception as exc:
        logger.warning("metadata: could not read EXIF from %s: %s", image_path, exc)
        return {"anomalies": anomalies, "raw_exif": raw_exif}

    if exif_data is None:
        # No EXIF at all — common for PNGs and some scans; not itself an anomaly
        return {"anomalies": anomalies, "raw_exif": raw_exif}

    # Decode EXIF tags
    for tag_id, value in exif_data.items():
        tag_name = TAGS.get(tag_id, str(tag_id))
        raw_exif[tag_name] = str(value)

    # ── Check 1: Editing software signature ──────────────────────────────
    software = raw_exif.get("Software", "").lower()
    if software:
        for kw in _EDITING_SOFTWARE_KEYWORDS:
            if kw in software:
                anomalies.append(
                    f"Software signature: {raw_exif['Software']} (image editing tool detected)"
                )
                break

    # ── Check 2: Date inconsistencies ────────────────────────────────────
    date_original = raw_exif.get("DateTimeOriginal")
    date_modified = raw_exif.get("DateTime")

    if date_original and date_modified:
        try:
            fmt = "%Y:%m:%d %H:%M:%S"
            dt_orig = datetime.strptime(date_original, fmt)
            dt_mod  = datetime.strptime(date_modified, fmt)
            delta_days = (dt_mod - dt_orig).days
            if delta_days > 30:
                anomalies.append(
                    f"EXIF modification date is {delta_days} days after original "
                    f"({date_original} → {date_modified})"
                )
        except ValueError:
            pass

    # ── Check 3: Suspiciously recent modification ─────────────────────────
    if date_modified:
        try:
            fmt = "%Y:%m:%d %H:%M:%S"
            dt_mod = datetime.strptime(date_modified, fmt)
            if dt_mod.year >= datetime.now().year:
                anomalies.append(
                    f"EXIF creation date postdates nominal issue date ({date_modified})"
                )
        except ValueError:
            pass

    # ── Check 4: Missing scanner metadata ────────────────────────────────
    missing = _SCANNER_TAGS - set(raw_exif.keys())
    if len(missing) == len(_SCANNER_TAGS):
        anomalies.append("Original scanning device metadata missing (Make/Model/Software absent)")

    logger.info(
        "metadata: image=%s anomalies=%d",
        image_path, len(anomalies),
    )

    return {"anomalies": anomalies, "raw_exif": raw_exif}
