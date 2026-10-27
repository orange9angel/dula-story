#!/usr/bin/env python3
"""长廊"灯光逐段熄灭后"亮度态：由 plates/plate_corridor.png 合成压暗生成
plates/plate_corridor_dim.png（不用文生图，保证布局逐像素一致）。

方案（记录在 NOTES.md T2 节）：整体曝光压低 + 纵深渐变（近端亮、远端没入黑暗）
+ 轻微降饱和，模拟灯灭后只剩远端应急微光的状态。T3 逐镜可再调曲线。

用法：python dim_corridor.py [--force]
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PLATES = HERE.parent / "assets" / "plates"
SRC = PLATES / "plate_corridor.png"
OUT = PLATES / "plate_corridor_dim.png"

BASE_EXPOSURE = 0.52   # 近端保留亮度
FAR_EXPOSURE = 0.24    # 远端灭灯区
DESAT = 0.82           # 降饱和系数


def main() -> None:
    if OUT.exists() and "--force" not in sys.argv:
        print(f"skip {OUT}")
        return
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im).astype(np.float32) / 255.0
    H, W, _ = a.shape
    # 纵深渐变：以画面水平中线附近的灭点为锚，按到灭点的径向距离压暗
    cx, cy = W * 0.5, H * 0.42
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - cx) / W) ** 2 + ((yy - cy) / H) ** 2)
    d = np.clip(d / d.max(), 0, 1)
    exposure = BASE_EXPOSURE + (FAR_EXPOSURE - BASE_EXPOSURE) * (d ** 0.8)
    a *= exposure[..., None]
    # 灯箱灭灯：暖色高亮（R 明显大于 B 且亮度够）额外压掉，只留一丝余晖
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = a.mean(axis=2)
    warm = np.clip((r - b) * 4.0, 0, 1) * np.clip((lum - 0.10) * 6.0, 0, 1)
    a *= (1.0 - 0.72 * warm)[..., None]
    gray = a.mean(axis=2, keepdims=True)
    a = gray + (a - gray) * DESAT
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    out.save(OUT)
    print(f"OK {OUT}")

if __name__ == "__main__":
    main()
