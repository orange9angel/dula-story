#!/usr/bin/env python3
"""为比例门人工地标读数生成刻度图：cel 缩放到统一高度 + 每 5% 一条横线 + 10% 加粗标注。

读数约定：以**身体高度**（头顶到脚底，不含灯笼等手持物的上下溢出）为 H，
bands 的 top/bottom 写占 H 的比例（0..1）。刻度图横线标注的是图幅百分比，
读数后需换算：band = (line_y - head_y) / (feet_y - head_y)。

用法：
  python make_grid_overlay.py <cel.png> [--out overlay.png]
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cel", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()
    im = Image.open(args.cel).convert("RGBA")
    bg = Image.new("RGBA", im.size, (32, 32, 40, 255))
    bg.alpha_composite(im)
    im = bg.convert("RGB")
    d = ImageDraw.Draw(im)
    W, H = im.size
    for pct in range(0, 101, 5):
        y = round(H * pct / 100)
        major = pct % 10 == 0
        d.line([(0, y), (W, y)], fill=(255, 80, 80) if major else (255, 180, 80), width=2 if major else 1)
        if major:
            d.text((4, y + 2), f"{pct}%", fill=(255, 255, 0))
            d.text((W - 44, y + 2), f"{pct}%", fill=(255, 255, 0))
    out = args.out or args.cel.with_name(args.cel.stem + "_grid.jpg")
    im.save(out, quality=90)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
