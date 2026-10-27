#!/usr/bin/env python3
"""把 T1 走拍参考帧拼成 2x2 宫格 sheet，供 m07_walk_strip 作姿势参考。

用法：python make_walk_sheet.py   （幂等，产物存在则跳过）
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent              # hybrid/tools
EP = HERE.parents[1]                                # episodes/tomorrow_still_bright
T2R = EP / "storyboard" / "t1" / "t2ref"
OUT = HERE.parent / "assets" / "cels" / "walk_sheet.png"

CELL = (960, 540)  # 每格尺寸（与 T1 1280x720 同比例缩小）

def main() -> None:
    if OUT.exists():
        print(f"skip {OUT}")
        return
    sheet = Image.new("RGB", (CELL[0] * 2, CELL[1] * 2), (24, 28, 36))
    for i in range(4):
        im = Image.open(T2R / f"walk_p{i + 1}.jpg").convert("RGB").resize(CELL, Image.LANCZOS)
        sheet.paste(im, ((i % 2) * CELL[0], (i // 2) * CELL[1]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT)
    print(f"OK {OUT}")

if __name__ == "__main__":
    main()
