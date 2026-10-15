"""Cut out round-02 packshots (Chamoy Mega + secreto) and merge into mix assets.

Requires Pillow, numpy, scipy and rembg. Source generations stay in .higgsfield.
Tajin from round 01 is preserved untouched.
"""
import json
from pathlib import Path
from shutil import copyfile

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '.higgsfield' / 'onkys-seasoning-bottles-02'
OUTPUT = ROOT / 'public' / 'images' / 'mix'
OUTPUT.mkdir(parents=True, exist_ok=True)
session = new_session('u2net')
manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
# Fractional coordinates in each reviewed original: central dispensing opening.
pivots = {'chamoy-mega': (.496, .075), 'secreto': (.50, .11)}
results = []
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
    public = 'chamoy' if name == 'chamoy-mega' else 'secreto'
    filename = f'bottle-{public}.webp'
    cropped.save(OUTPUT / filename, 'WEBP', quality=91, method=6)
    pivot = {'x': round((pivots[name][0] * image.width - left) * factor, 3), 'y': round((pivots[name][1] * image.height - top) * factor, 3)}
    results.append({'name': public, 'image': f'/images/mix/{filename}', 'width': size[0], 'height': size[1], 'pivot': pivot, 'source': subject.get('reference'), 'generated': True})
    print(public, size, pivot, (OUTPUT / filename).stat().st_size, 'bytes')

previous = json.loads((OUTPUT / 'seasoning-bottles.json').read_text(encoding='utf-8'))
tajin = next(asset for asset in previous['assets'] if asset['name'] == 'tajin')
merged = {'round': f"{previous['round']} + {manifest['round']}", 'model': manifest['model'], 'generated': True,
          'assets': [next(asset for asset in results if asset['name'] == 'chamoy'), tajin, next(asset for asset in results if asset['name'] == 'secreto')]}
(OUTPUT / 'seasoning-bottles.json').write_text(json.dumps(merged, indent=2), encoding='utf-8')
copyfile(OUTPUT / 'seasoning-bottles.json', ROOT / 'src' / 'config' / 'seasoning-bottles.json')
print('merged seasoning-bottles.json; tajin preserved')
