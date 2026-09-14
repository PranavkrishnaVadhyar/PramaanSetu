from __future__ import annotations

import os
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.utils.logging import get_logger

logger = get_logger("utils.image_io")


async def save_upload(
    upload: UploadFile,
    base_dir: str,
    sub_dir: str = "uploads",
    max_bytes: int = 10 * 1024 * 1024,
    max_pixels: int = 20_000_000,
) -> str:
    """
    Save an UploadFile to disk. Returns the path to the saved file.
    The filename is randomised to avoid collisions.
    """
    content = await upload.read(max_bytes + 1)
    if not content or len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds the permitted upload size.")

    try:
        with Image.open(BytesIO(content)) as probe:
            if probe.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("unsupported image format")
            if getattr(probe, "n_frames", 1) != 1:
                raise ValueError("animated images are not accepted")
            width, height = probe.size
            if width < 64 or height < 64 or width * height > max_pixels:
                raise ValueError("image dimensions are outside the permitted range")
            # Decode the full image before persisting it, rejecting truncated
            # payloads and normalising away user-controlled EXIF metadata.
            probe.load()
            normalized = probe.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Upload must be a valid non-animated JPEG, PNG, or WebP image.") from exc

    filename = f"{uuid.uuid4().hex}.jpg"
    out_dir = Path(base_dir) / sub_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / filename
    normalized.save(out_path, format="JPEG", quality=95, optimize=True)

    logger.info("Saved validated upload: %s (%d bytes)", out_path, len(content))
    return str(out_path)


def load_image(path: str) -> Image.Image:
    """Load an image from disk, convert to RGB."""
    return Image.open(path).convert("RGB")
