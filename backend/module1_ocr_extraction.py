"""Standalone entry point for PramaanSetu's local PP-OCRv5 extraction.

This module intentionally delegates to the API's OCR implementation so command
line runs and production scans use identical templates, preprocessing, model
settings, and field normalisation. It performs no network OCR calls.

Usage:
    python module1_ocr_extraction.py <image_path> <passport|aadhaar|pan>
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

from app.modules.module1_ocr.extraction import extract_document


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python module1_ocr_extraction.py <image_path> <passport|aadhaar|pan>")
        return 2

    image_path, document_type = sys.argv[1:]
    if not Path(image_path).is_file():
        print(f"Image file not found: {image_path}", file=sys.stderr)
        return 2

    try:
        result = extract_document(image_path, document_type)
    except (RuntimeError, ValueError, OSError) as exc:
        print(f"OCR failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(asdict(result), indent=2, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
