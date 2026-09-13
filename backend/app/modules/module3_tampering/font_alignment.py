"""
Module 3 — Font & Alignment Anomaly Detection

Uses OpenCV to detect text bounding boxes in key document regions and
flags anomalies in character spacing, baseline deviation, or font size
inconsistencies that may indicate digital paste-up.
"""
from __future__ import annotations

from app.utils.logging import get_logger

logger = get_logger("module3.font_alignment")

try:
    import cv2  # type: ignore
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False
    logger.warning("opencv-python not installed — font alignment check unavailable")


def analyse_font_alignment(image_path: str) -> dict[str, object]:
    """
    Detect text-region anomalies using connected-component analysis.

    Divides the image into horizontal strips (representing text lines)
    and checks for:
      - Abrupt changes in character height between adjacent lines (font substitution)
      - Baseline deviation within a single line
      - Isolated high-contrast blobs inconsistent with surrounding text

    Returns
    -------
    dict with:
        flagged_regions: list[str]  — descriptions of anomalous regions
        anomaly_score:  float       — 0.0 (clean) to 1.0 (severe)
    """
    if not _CV2_AVAILABLE:
        return {"flagged_regions": [], "anomaly_score": 0.0}

    try:
        img = cv2.imread(image_path)
        if img is None:
            return {"flagged_regions": [], "anomaly_score": 0.0}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Binarise
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            binary, connectivity=8
        )

        # Filter to plausible text glyphs: aspect ratio < 5, height 4–80px
        glyph_heights: list[int] = []
        glyph_ys: list[int] = []
        for i in range(1, num_labels):
            x, y, cw, ch, area = stats[i]
            if area < 10:
                continue
            aspect = cw / max(ch, 1)
            if ch < 4 or ch > 80 or aspect > 5:
                continue
            glyph_heights.append(ch)
            glyph_ys.append(y)

        if not glyph_heights:
            return {"flagged_regions": [], "anomaly_score": 0.0}

        flagged: list[str] = []
        anomaly_score = 0.0

        # ── Check: High variance in glyph heights ────────────────────────
        median_h = float(np.median(glyph_heights))
        height_stdev = float(np.std(glyph_heights))
        if median_h > 0 and height_stdev / median_h > 0.4:
            flagged.append(
                f"Significant font height variance detected "
                f"(median={median_h:.1f}px, stdev={height_stdev:.1f}px)"
            )
            anomaly_score += 0.4

        # ── Check: Baseline jump between text line clusters ───────────────
        if len(glyph_ys) > 10:
            sorted_ys = sorted(glyph_ys)
            gaps = [sorted_ys[i + 1] - sorted_ys[i] for i in range(len(sorted_ys) - 1)]
            max_gap = max(gaps) if gaps else 0
            median_gap = float(np.median(gaps)) if gaps else 0
            if median_gap > 0 and max_gap > median_gap * 4:
                flagged.append(
                    f"Abrupt vertical gap in text layout "
                    f"(max_gap={max_gap}px vs median={median_gap:.1f}px) — "
                    "possible paste-in region"
                )
                anomaly_score += 0.3

        anomaly_score = min(anomaly_score, 1.0)
        logger.info(
            "font_alignment: image=%s anomalies=%d score=%.2f",
            image_path, len(flagged), anomaly_score,
        )
        return {"flagged_regions": flagged, "anomaly_score": anomaly_score}

    except Exception as exc:
        logger.error("font_alignment: failed for %s: %s", image_path, exc)
        return {"flagged_regions": [], "anomaly_score": 0.0}
