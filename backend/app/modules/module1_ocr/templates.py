from __future__ import annotations
from typing import Any

# ---------------------------------------------------------------------------
# Document field templates (mirrored from module1_ocr_extraction.py)
#
# Each field entry:
#   name:     field key in the output dict
#   region:   (x1_frac, y1_frac, x2_frac, y2_frac) — fractions of image W/H
#   lang:     "en" | "en+hi"
#   required: if True, empty text counts as a hard extraction gap
# ---------------------------------------------------------------------------
DEFAULT_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "passport": [
        # Calibrated against the 1200×760 synthetic passport layout.  These
        # crops deliberately begin right of the printed labels and above the
        # diagonal watermark's densest area.
        {"name": "full_name",       "region": (0.24, 0.24, 0.68, 0.30), "lang": "en", "required": True},
        {"name": "passport_number", "region": (0.24, 0.32, 0.68, 0.38), "lang": "en", "required": True},
        {"name": "nationality",     "region": (0.24, 0.41, 0.52, 0.47), "lang": "en", "required": True},
        {"name": "dob",             "region": (0.24, 0.49, 0.52, 0.55), "lang": "en", "required": True},
        {"name": "gender",          "region": (0.24, 0.58, 0.38, 0.64), "lang": "en", "required": False},
        {"name": "expiry_date",     "region": (0.24, 0.66, 0.52, 0.72), "lang": "en", "required": True},
        {"name": "mrz_line_1",      "region": (0.05, 0.79, 0.95, 0.85), "lang": "en", "required": True},
        {"name": "mrz_line_2",      "region": (0.05, 0.85, 0.95, 0.91), "lang": "en", "required": True},
    ],
    "aadhaar": [
        {"name": "aadhaar_number", "region": (0.04, 0.31, 0.30, 0.37), "lang": "en",    "required": True},
        {"name": "full_name",      "region": (0.23, 0.41, 0.54, 0.48), "lang": "en+hi", "required": True},
        {"name": "dob",            "region": (0.23, 0.49, 0.47, 0.55), "lang": "en",    "required": True},
        {"name": "gender",         "region": (0.23, 0.56, 0.38, 0.62), "lang": "en+hi", "required": False},
        {"name": "address",        "region": (0.23, 0.70, 0.75, 0.77), "lang": "en+hi", "required": False},
    ],
    "pan": [
        {"name": "pan_number",  "region": (0.28, 0.27, 0.55, 0.34), "lang": "en", "required": True},
        {"name": "full_name",   "region": (0.28, 0.37, 0.62, 0.44), "lang": "en", "required": True},
        {"name": "father_name", "region": (0.28, 0.47, 0.65, 0.54), "lang": "en", "required": False},
        {"name": "dob",         "region": (0.28, 0.57, 0.52, 0.64), "lang": "en", "required": True},
    ],
}
