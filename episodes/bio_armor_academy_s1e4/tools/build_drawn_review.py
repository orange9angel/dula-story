from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json

ep = Path(__file__).resolve().parents[1]
root = ep / 'storyboard/hybrid_character'
src = root / 'anime_review'
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', n)
sheet = Image.new('RGB', (1800, 1140), '#e7e1d6')
d = ImageDraw.Draw(sheet)
cols = [('aoi', 'original', '葵 · 原 Tripo'), ('aoi', 'anime', '葵 · 手绘融合候选'), ('lei', 'original', '雷晓 · 原 Tripo'), ('lei', 'anime', '雷晓 · 手绘融合候选')]
for i, (actor, mode, title) in enumerate(cols):
    x = i * 450
    d.text((x + 16, 16), title, font=font(25), fill='#283c36')
    face = Image.open(src / f'{actor}_{mode}_front.png').convert('RGB')
    sheet.paste(face.resize((450, 450)), (x, 60))
    body = Image.open(src / f'{actor}_{mode}_body.png').convert('RGB')
    sheet.paste(body.crop((200, 0, 700, 900)).resize((330, 594)), (x + 60, 525))
d.text((20, 1110), '同机位、同姿势；新五官 / 发束 / 衣料色块。造型候选，未替换原整片。', font=font(20), fill='#283c36')
sheet.save(root / 'anime_character_comparison.jpg', quality=94)
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
    after = Image.open(root / 'anime_final' / f'original_{name}.jpg').convert('RGB')
    diff = ImageChops.difference(before, after)
    regression[name] = {'maxChannelDifference': max(b for a, b in diff.getextrema()), 'changedBounds': diff.getbbox()}
(src / 'default_regression.json').write_text(json.dumps(regression, indent=2), encoding='utf8')
print(json.dumps(regression))
