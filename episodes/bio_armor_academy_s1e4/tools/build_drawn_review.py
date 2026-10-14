from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json
import argparse

ep = Path(__file__).resolve().parents[1]
root = ep / 'storyboard/hybrid_character'
parser = argparse.ArgumentParser(description='Build same-camera character review sheets.')
parser.add_argument('--source', type=Path, default=root / 'anime_review')
parser.add_argument('--before', type=Path, help='Compare the anime candidate in this directory against --source.')
parser.add_argument('--output', type=Path, default=root / 'anime_character_comparison.jpg')
parser.add_argument('--scene-source', type=Path, default=root / 'anime_final')
args = parser.parse_args()
src = args.source
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', n)
sheet = Image.new('RGB', (1800, 1140), '#e7e1d6')
d = ImageDraw.Draw(sheet)
before_src, before_mode = (args.before, 'anime') if args.before else (src, 'original')
before_title = '上一版' if args.before else '原 Tripo'
cols = [('aoi', before_mode, before_src, f'葵 · {before_title}'), ('aoi', 'anime', src, '葵 · 新版'), ('lei', before_mode, before_src, f'雷晓 · {before_title}'), ('lei', 'anime', src, '雷晓 · 新版')]
for i, (actor, mode, directory, title) in enumerate(cols):
    x = i * 450
    d.text((x + 16, 16), title, font=font(25), fill='#283c36')
    face = Image.open(directory / f'{actor}_{mode}_front.png').convert('RGB')
    sheet.paste(face.resize((450, 450)), (x, 60))
    body = Image.open(directory / f'{actor}_{mode}_body.png').convert('RGB')
    sheet.paste(body.crop((200, 0, 700, 900)).resize((330, 594)), (x + 60, 525))
d.text((20, 1110), '同机位、同姿势；眼型与虹膜 / 发束轮廓 / 衣料配色。造型候选，未替换原整片。', font=font(20), fill='#283c36')
args.output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(args.output, quality=94)
names = ['neutral', 'listen', 'concern', 'firm', 'half_blink', 'closed', 'left', 'right', 'profile', 'back', 'down', 'up']
for actor in ['aoi', 'lei']:
    c = Image.new('RGB', (1440, 1120), '#e7e1d6')
    d = ImageDraw.Draw(c)
    for i, name in enumerate(names):
        im = Image.open(src / f'{actor}_{name}.png').resize((360, 340))
        x, y = i % 4 * 360, i // 4 * 365
        c.paste(im, (x, y + 25))
        d.text((x + 10, y), name, font=font(18), fill='#283c36')
    c.save(src / f'{actor}_sheet.jpg', quality=93)
regression = {}
for name in ['front', 'threequarter', 'half', 'scene']:
    before = Image.open(root / 'look' / f'original_{name}.jpg').convert('RGB')
    after = Image.open(args.scene_source / f'original_{name}.jpg').convert('RGB')
    diff = ImageChops.difference(before, after)
    regression[name] = {'maxChannelDifference': max(b for a, b in diff.getextrema()), 'changedBounds': diff.getbbox()}
(src / 'default_regression.json').write_text(json.dumps(regression, indent=2), encoding='utf8')
print(json.dumps(regression))
