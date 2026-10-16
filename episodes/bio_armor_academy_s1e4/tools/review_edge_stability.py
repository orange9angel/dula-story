"""Matched-motion raster review against a 4x spatial sampling reference.

The residual metrics compare sampling error, not aesthetic quality or a general
percentage of perceived flicker. All images are 1280x720 at identical times.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import binary_dilation

EP = Path(__file__).resolve().parents[1]
ROOT = EP / 'tmp/edge_stability'
BOXES = {'male_hair': (40, 155, 220, 315), 'female_hair': (515, 195, 730, 385),
         'male_shirt': (35, 305, 310, 490), 'female_sleeve': (640, 360, 790, 465)}
NAMES = ['legacy', 'lossless', 'supersample', 'stable', 'reference']
def read(name, i):
    return Image.open(ROOT / name / f'{i:03d}.{"jpg" if name == "legacy" else "png"}').convert('RGB')
def crop_sequence(name, box):
    return np.stack([np.asarray(read(name, i).crop(box), dtype=np.float32) for i in range(30)])
results = {}
states = {n: json.loads((ROOT / n / 'states.json').read_text()) for n in NAMES}
assert all(states[n] == states['legacy'] for n in NAMES), 'Motion/camera changed in a raster comparison'
for part, box in BOXES.items():
    ref = crop_sequence('reference', box)
    mask = np.zeros(ref.shape[:3], dtype=bool)
    mask[:, 1:] |= np.max(np.abs(ref[:, 1:] - ref[:, :-1]), axis=-1) > 24
    mask[:, :, 1:] |= np.max(np.abs(ref[:, :, 1:] - ref[:, :, :-1]), axis=-1) > 24
    mask = np.stack([binary_dilation(m, iterations=1) for m in mask])
    results[part] = {}
    for name in NAMES[:-1]:
        error = crop_sequence(name, box) - ref
        temporal_error = np.diff(error, axis=0)
        results[part][name] = {'edgeMAE_0_255': float(np.abs(error)[mask].mean()),
                              'temporalResidualRMSE_0_255': float(np.sqrt(np.square(temporal_error)[mask[1:] | mask[:-1]].mean()))}
report = {'times': [624/30, 653/30], 'frames': 30, 'outputSize': [1280, 720],
          'reference': '4x spatial rendering, PNG; same motion/camera, not aesthetic ground truth',
          'metric': 'Edge RGB error and first temporal difference of error relative to 4x reference',
          'identicalMotionStates': True, 'results': results,
          'fixedTimeRepeat': {n: json.loads((ROOT/n/'report.json').read_text())['repeatStable'] for n in NAMES}}
assert report['fixedTimeRepeat']['stable']
(ROOT/'comparison.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 20)
sheet = Image.new('RGB', (1280, 992), '#e8e8e5'); draw = ImageDraw.Draw(sheet)
for j, (part, box) in enumerate(BOXES.items()):
    for i, (name, label) in enumerate([('legacy','原版'), ('lossless','仅移除 JPEG'), ('stable','本次：2 倍采样'), ('reference','4 倍采样参考')]):
        draw.text((i*320+8, j*248+5), label+' / '+part, font=font, fill='#26352f')
        im = read(name, 6).crop(box); im.thumbnail((312, 210), Image.Resampling.LANCZOS)
        # Keep each row identically scaled; never stretch different anatomy.
        scale = min(312/(box[2]-box[0]), 210/(box[3]-box[1]))
        im = read(name, 6).crop(box).resize((round((box[2]-box[0])*scale), round((box[3]-box[1])*scale)), Image.Resampling.NEAREST)
        sheet.paste(im, (i*320+(320-im.width)//2, j*248+34))
sheet.save(ROOT/'comparison.png')
print(json.dumps(report, ensure_ascii=False))
