"""Trim and downsample the supplied transparent cutouts. Requires Pillow."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "images" / "mix"
OUTPUT.mkdir(parents=True, exist_ok=True)

# The fourth reference includes a background; use the four supplied cutouts.
for source, name in [(1, "amber"), (2, "ruby"), (3, "citrus"), (5, "gold")]:
    image = Image.open(ROOT / "references" / f"osito {source}.png").convert("RGBA")
    bounds = image.getchannel("A").point(lambda alpha: 255 if alpha > 12 else 0).getbbox()
    image = image.crop(bounds)
    image.thumbnail((192, 256), Image.Resampling.LANCZOS)
    image.save(OUTPUT / f"bear-{name}.webp", "WEBP", quality=88, method=6)
    print(f"{name}: {image.size}, {(OUTPUT / f'bear-{name}.webp').stat().st_size:,} bytes")
