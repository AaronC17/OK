"""Cut out the round-03 lemon pitcher and merge it into mix assets.

Requires Pillow, numpy, scipy and rembg. Source generations stay in .higgsfield.
Chamoy Mega and Tajin are preserved untouched; the secreto bottle is retired.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '.higgsfield' / 'onkys-seasoning-bottles-03'
OUTPUT = ROOT / 'public' / 'images' / 'mix'
OUTPUT.mkdir(parents=True, exist_ok=True)
session = new_session('u2net')
manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
# Fractional coordinates in the reviewed original: tip of the pouring spout.
pivots = {'limon': (.205, .143)}
for subject in manifest['subjects']:
    name = subject['name']
    image = Image.open(SOURCE / subject['file']).convert('RGB')
    rgba = remove(image, session=session, post_process_mask=True).convert('RGBA')
    rgb = np.asarray(image).astype(np.float32)
    white = rgb.min(axis=2) > 244
    seed = np.zeros(white.shape, dtype=bool)
    seed[0, :] = seed[-1, :] = True
    seed[:, 0] = seed[:, -1] = True
    background = ndimage.binary_propagation(seed & white, mask=white)
    alpha = np.array(rgba.getchannel('A'))
    alpha[background] = 0
    rgba.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.3)))
    bounds = rgba.getchannel('A').point(lambda value: 255 if value > 20 else 0).getbbox()
    if not bounds:
        raise RuntimeError(f'Empty cutout: {name}')
    left, top, right, bottom = bounds
    padding = 7
    left, top = max(0, left - padding), max(0, top - padding)
    right, bottom = min(image.width, right + padding), min(image.height, bottom + padding)
    cropped = rgba.crop((left, top, right, bottom))
    factor = min(384 / cropped.width, 768 / cropped.height, 1)
    size = (round(cropped.width * factor), round(cropped.height * factor))
    cropped = cropped.resize(size, Image.Resampling.LANCZOS)
    filename = f'bottle-{name}.webp'
    cropped.save(OUTPUT / filename, 'WEBP', quality=91, method=6)
    pivot = {'x': round((pivots[name][0] * image.width - left) * factor, 3), 'y': round((pivots[name][1] * image.height - top) * factor, 3)}
    limon = {'name': name, 'image': f'/images/mix/{filename}', 'width': size[0], 'height': size[1], 'pivot': pivot, 'generated': True}
    print(name, size, pivot, (OUTPUT / filename).stat().st_size, 'bytes')

previous = json.loads((OUTPUT / 'seasoning-bottles.json').read_text(encoding='utf-8'))
kept = [asset for asset in previous['assets'] if asset['name'] in ('chamoy', 'tajin')]
merged = {'round': f"{previous['round']} + {manifest['round']}", 'model': manifest['model'], 'generated': True, 'assets': [*kept, limon]}
(OUTPUT / 'seasoning-bottles.json').write_text(json.dumps(merged, indent=2), encoding='utf-8')
print('merged seasoning-bottles.json; secreto retired')
