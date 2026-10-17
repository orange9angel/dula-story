#!/usr/bin/env python3
"""2D→3D 材质化：从文生图 albedo 派生切线空间法线图（亮度 Sobel 梯度）。

亮度梯度只是表面细节近似（色斑/烘焙阴影不等于真实高度）；边缘 wrap padding
配合 MirroredRepeatWrapping 不出接缝法线。产出 assets3d/tex/<name>_normal.png
（skip-if-exists；源图改了删产物重跑）。

用法：.venv/Scripts/python.exe episodes/stardust_clad_op/tools/derive_maps.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[1]
TEX = EP / "assets3d/tex"

# (名称, 法线强度) —— 石材 1.6 / 地面 2.0（材质分档参考 hybrid-craft-scene SKILL）
JOBS = [("floor", 2.0), ("stone", 1.6)]


def normal_from_luma(img: Image.Image, strength: float) -> Image.Image:
    h = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    gy, gx = np.gradient(np.pad(h, 1, mode="wrap"))
    gy, gx = gy[1:-1, 1:-1] * strength, gx[1:-1, 1:-1] * strength
    n = np.stack([-gx, gy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def main() -> int:
    for name, strength in JOBS:
        src, out = TEX / f"{name}.png", TEX / f"{name}_normal.png"
        if out.exists():
            print(f"skip {name}")
            continue
        if not src.exists():
            print(f"missing {src}")
            return 1
        normal_from_luma(Image.open(src), strength).save(out)
        print(f"OK {name}_normal.png strength={strength}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
