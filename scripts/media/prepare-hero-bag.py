"""Trim and optimize the background-free supplier photos (PhotoRoom exports).

Requires Pillow. The references stay in references/; no background removal is
needed because the supplier already delivered them with transparency.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'public' / 'images'
jobs = [
    ('original bolsa mix-Photoroom.png', 'bolsa-mix.webp', 1408, 90),
    ('ositos-Photoroom.png', 'ositos-bolsa.webp', 1000, 89),
]
for source, filename, maxdim, quality in jobs:
    image = Image.open(ROOT / 'references' / source).convert('RGBA')
    box = image.getchannel('A').point(lambda value: 255 if value > 12 else 0).getbbox()
    if not box:
        raise RuntimeError(f'Empty cutout: {source}')
    image = image.crop((max(0, box[0] - 8), max(0, box[1] - 8), min(image.width, box[2] + 8), min(image.height, box[3] + 8)))
    factor = min(maxdim / image.width, maxdim / image.height, 1)
    image = image.resize((round(image.width * factor), round(image.height * factor)), Image.Resampling.LANCZOS)
    image.save(OUTPUT / filename, 'WEBP', quality=quality, method=6)
    print(filename, image.size, (OUTPUT / filename).stat().st_size, 'bytes')
