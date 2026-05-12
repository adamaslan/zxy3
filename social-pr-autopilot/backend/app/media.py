import os
import uuid
from pathlib import Path

from PIL import Image

# Canonical directory for operator-supplied images
MEDIA_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public"


def local_path_to_public_jpeg(local_path: str) -> str:
    """Convert a local image file to JPEG in MEDIA_DIR and return its filename.

    Accepts absolute paths or filenames relative to MEDIA_DIR.
    Returns the JPEG filename (not a URL — the caller builds the URL).
    """
    src = Path(local_path)
    if not src.is_absolute():
        src = MEDIA_DIR / local_path
    src = src.resolve()

    if not src.exists():
        raise FileNotFoundError(f"Image not found: {src}")

    # If already a JPEG in MEDIA_DIR, return as-is
    if src.suffix.lower() in (".jpg", ".jpeg") and src.parent == MEDIA_DIR:
        return src.name

    # Convert to JPEG
    dest_name = f"{uuid.uuid4().hex}.jpg"
    dest = MEDIA_DIR / dest_name

    with Image.open(src) as img:
        rgb = img.convert("RGB")
        _validate_dimensions(rgb)
        rgb.save(dest, "JPEG", quality=92, optimize=True)

    return dest_name


def _validate_dimensions(img: Image.Image) -> None:
    """Raise ValueError if the image falls outside Meta's supported aspect ratio range."""
    w, h = img.size
    if h == 0:
        raise ValueError("Image has zero height")
    ratio = w / h
    # Meta requires 4:5 (0.8) to 1.91:1 (1.91)
    if ratio < 0.8 or ratio > 1.91:
        raise ValueError(
            f"Aspect ratio {ratio:.2f} is outside Meta's supported range (4:5 to 1.91:1). "
            f"Image is {w}x{h}px."
        )


def media_dir() -> Path:
    return MEDIA_DIR
