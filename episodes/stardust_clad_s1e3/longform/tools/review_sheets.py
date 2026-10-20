"""Arrange actual review frames in trace order. No scoring or image generation."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

p = argparse.ArgumentParser()
p.add_argument("folder", type=Path)
p.add_argument("--per-page", type=int, default=6)
args = p.parse_args()
trace = json.loads((args.folder / "trace.json").read_text(encoding="utf-8"))
shots = trace["shots"]
font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 18)
for start in range(0, len(shots), args.per_page):
    group = shots[start:start + args.per_page]
    sheet = Image.new("RGB", (1280, ((len(group) + 1) // 2) * 388), "#17212a")
    draw = ImageDraw.Draw(sheet)
    for i, shot in enumerate(group):
        file = args.folder / (shot.get("filename") or shot["name"] + ".jpg")
        with Image.open(file) as im:
            im = im.resize((640, 360))
            x, y = i % 2 * 640, i // 2 * 388
            sheet.paste(im, (x, y + 28))
            draw.text((x + 10, y + 5), f'{shot.get("name", file.stem)}  t={shot["t"]:.3f}', font=font, fill="white")
    sheet.save(args.folder / f"sheet_{start // args.per_page + 1:02}.jpg", quality=93)
print(f"{len(shots)} frames arranged into {(len(shots)+args.per_page-1)//args.per_page} sheets")
