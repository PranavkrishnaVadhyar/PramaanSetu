from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image

from app.utils.logging import get_logger

logger = get_logger("utils.image_io")


async def save_upload(
    upload: UploadFile,
    base_dir: str,
    sub_dir: str = "uploads",
) -> str:
    """
    Save an UploadFile to disk. Returns the path to the saved file.
    The filename is randomised to avoid collisions.
    """
    ext = Path(upload.filename or "image.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    out_dir = Path(base_dir) / sub_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / filename

    content = await upload.read()
    out_path.write_bytes(content)

    logger.info("Saved upload: %s (%d bytes)", out_path, len(content))
    return str(out_path)


def load_image(path: str) -> Image.Image:
    """Load an image from disk, convert to RGB."""
    return Image.open(path).convert("RGB")
