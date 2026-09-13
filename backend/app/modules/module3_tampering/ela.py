"""
Module 3 — Error Level Analysis (ELA)

ELA reveals regions of an image that were digitally modified after initial
compression by comparing the original against a re-compressed version at a
known quality level. Areas with higher-than-expected error levels appear bright
in the difference map — a signature of pixel-level tampering.
"""
from __future__ import annotations

import io
import os
from pathlib import Path

import numpy as np
from PIL import Image

from app.utils.logging import get_logger

logger = get_logger("module3.ela")

_RESAVE_QUALITY = 90    # JPEG quality for the reference re-compression
_TOP_PERCENTILE  = 95   # percentile of the difference used as the ELA score
_HEATMAP_SCALE   = 10   # multiply difference for visual clarity in the heatmap


def run_ela(
    image_path: str,
    evidence_dir: str,
    scan_id: str,
) -> dict[str, object]:
    """
    Run Error Level Analysis on a document image.

    Parameters
    ----------
    image_path  : path to the source document image
    evidence_dir: directory to write the ELA heatmap PNG
    scan_id     : used to name the output file

    Returns
    -------
    dict with:
        ela_score     : float 0–100 — mean pixel value at the top percentile
        flagged_regions: list[str]  — human-readable region descriptions
        heatmap_path  : str | None  — absolute path to the saved heatmap PNG
    """
    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as exc:
        logger.error("ELA: failed to open image %s: %s", image_path, exc)
        return {"ela_score": 0.0, "flagged_regions": [], "heatmap_path": None}

    # Re-save to in-memory buffer at fixed quality
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=_RESAVE_QUALITY)
    buf.seek(0)
    recompressed = Image.open(buf).convert("RGB")

    # Absolute pixel difference
    original_arr    = np.array(img, dtype=np.float32)
    recompressed_arr = np.array(recompressed, dtype=np.float32)
    diff = np.abs(original_arr - recompressed_arr)

    # ELA score: mean of the brightest N% pixels (per-channel max)
    diff_max = diff.max(axis=2)   # collapse RGB → single channel
    threshold = np.percentile(diff_max, _TOP_PERCENTILE)
    high_error_mask = diff_max >= threshold
    ela_score = float(diff_max[high_error_mask].mean()) if high_error_mask.any() else 0.0
    # Normalise to 0–100 (raw values are 0–255)
    ela_score = min(ela_score / 2.55, 100.0)

    # Identify flagged regions by segmenting the image into a 3×4 grid
    flagged_regions: list[str] = []
    if ela_score > 15:   # only bother with region attribution if score is notable
        flagged_regions = _identify_flagged_regions(diff_max, img.size)

    # Save heatmap
    heatmap_path = _save_heatmap(diff_max, evidence_dir, scan_id)

    logger.info(
        "ELA: scan=%s ela_score=%.2f flagged_regions=%d",
        scan_id, ela_score, len(flagged_regions),
    )

    return {
        "ela_score": round(ela_score, 2),
        "flagged_regions": flagged_regions,
        "heatmap_path": heatmap_path,
    }


def _identify_flagged_regions(diff_max: np.ndarray, img_size: tuple[int, int]) -> list[str]:
    """
    Divide the image into a 3-row × 4-column grid.
    Any cell whose mean error exceeds the 85th percentile of the full image
    is added to the flagged regions list with a human-readable label.
    """
    h, w = diff_max.shape
    rows, cols = 3, 4
    rh, cw = h // rows, w // cols
    global_threshold = np.percentile(diff_max, 85)

    _ROW_LABELS = ["Top", "Middle", "Bottom"]
    _COL_LABELS = ["Left", "Centre-Left", "Centre-Right", "Right"]

    flagged: list[str] = []
    for r in range(rows):
        for c in range(cols):
            cell = diff_max[r * rh:(r + 1) * rh, c * cw:(c + 1) * cw]
            if cell.mean() > global_threshold * 1.5:
                region_label = f"{_ROW_LABELS[r]} {_COL_LABELS[c]} region"
                flagged.append(region_label)

    return flagged


def _save_heatmap(diff_max: np.ndarray, evidence_dir: str, scan_id: str) -> str | None:
    """Save an amplified greyscale ELA heatmap and return its file path."""
    try:
        Path(evidence_dir).mkdir(parents=True, exist_ok=True)
        heatmap_arr = np.clip(diff_max * _HEATMAP_SCALE, 0, 255).astype(np.uint8)
        heatmap_img = Image.fromarray(heatmap_arr, mode="L").convert("RGB")
        out_path = os.path.join(evidence_dir, f"{scan_id}_ela.png")
        heatmap_img.save(out_path, format="PNG")
        return out_path
    except Exception as exc:
        logger.error("ELA: failed to save heatmap: %s", exc)
        return None
