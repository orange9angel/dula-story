"""Compose labeled diagnostic evidence; never mark a candidate as accepted."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import numpy as np

EP = Path(__file__).resolve().parents[1]
ROOT = EP / 'storyboard/hybrid_character'
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
sheet = Image.new('RGB', (1920, 1030), '#202b33')
draw = ImageDraw.Draw(sheet)
draw.text((24, 12), '千堂葵外观分层对照：同机位、同姿势；后三列均为试验', font=font, fill='white')
modes = [('original', '原版'), ('toon', '只换光影'), ('painted', '绘制色块（原网格）'), ('graphic', '替换发束（未通过）')]
for i, (mode, title) in enumerate(modes):
    x = i * 480
    draw.text((x + 14, 56), title, font=font, fill='#f5dd9a')
    front = Image.open(ROOT / 'look' / f'{mode}_front.jpg').crop((340, 100, 1000, 700)).resize((480, 436))
    sheet.paste(front, (x, 96))
    half = Image.open(ROOT / 'look' / f'{mode}_half.jpg').resize((480, 270))
    sheet.paste(half, (x, 555))
notes = [
    ['PBR 与原始颜色纹理', '保留当前比较基线'],
    ['去法线/高光，简化光影', '发丝、衣褶的烘焙明暗仍在'],
    ['头发底色与高光带、部分肤色', '尚有分区边界与五官风格差异'],
    ['连续发壳、宽发束', '发际线碎片、发饰与动态待修'],
]
for i, lines in enumerate(notes):
    for j, text in enumerate(lines):
        draw.text((i * 480 + 14, 850 + j * 34), text, font=small, fill='white')
draw.text((24, 960), '试验结论：能做二维整理；换材质不足以完成造型。当前没有选定新角色定稿。', font=font, fill='#f5dd9a')
sheet.save(ROOT / 'look_comparison.jpg', quality=94)

before = json.loads((ROOT / 'baseline/wrist_audit.json').read_text())
after = json.loads((ROOT / 'wrist_r6/wrist_audit.json').read_text())
regression = json.loads((ROOT / 'default_regression/wrist_audit.json').read_text())
checks = {}
for name in ['t17.jpg', 't22.jpg', 't26.jpg', 't33.jpg', 't37.jpg', 't59.2.jpg', 't65.067.jpg', 't67.2.jpg', 't71.5.jpg']:
    a = Image.open(ROOT / 'baseline' / name)
    b = Image.open(ROOT / 'default_regression' / name)
    diff = ImageChops.difference(a, b)
    delta = np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16)).max(axis=2)
    checks[name] = {'pixel_identical': diff.getbbox() is None, 'pixels_over_16': int((delta > 16).sum()), 'max_difference': int(delta.max()), 'within_existing_jpeg_tolerance': int((delta > 16).sum()) <= 64}
stats = {key: {metric: {'before': before['summary'][key][metric], 'candidate': after['summary'][key][metric], 'default': regression['summary'][key][metric]}
               for metric in ['maxBend', 'maxLocalRotation', 'maxStep']} for key in before['summary']}
report = {'status': 'experimental-not-promoted', 'default_frame_regression': checks, 'wrist_degrees': stats,
          'motion_coverage': '82 seconds at 30Hz; angle diagnosis is not collision or artistic acceptance',
          'look_coverage': 'front/three-quarter/half-body/scene static views; graphic hair still has visible defects'}
(ROOT / 'review_summary.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'default_frames': checks, 'sheet': str(ROOT / 'look_comparison.jpg')}, ensure_ascii=False))
