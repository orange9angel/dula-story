#!/usr/bin/env python3
"""2D→3D 材质化（《借走月光的女孩》P3）：从文生图 albedo 派生切线空间法线图（亮度 Sobel 梯度）。

亮度梯度只近似补充表面细节，不是深度重建；法线强度按材质分档（过强会像浮雕）。
梯度边缘 wrap padding，配合 MirroredRepeatWrapping 才不出接缝法线。

产出 assets3d/tex/<name>_normal.png（skip-if-exists；源图改了删产物重跑）。

用法：.venv/Scripts/python.exe episodes/borrowed_moonlight/tools/derive_maps.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[1]
TEX = EP / "assets3d/tex"

# (名称, 法线强度) —— 雪/冰晶/绸弱，木/瓦中，黄铜旧化强；镜面地板最弱（要保"镜面"读感）
JOBS = [
    ("snow", 1.4), ("woodwall", 1.6), ("roof_tile", 1.6), ("brass", 2.2),
    ("woodplank", 1.6), ("ice_crystal", 1.2), ("veil_silk", 1.2),
    ("mirror_floor", 0.8), ("meadow", 1.4),
]


def normal_from_luma(img: Image.Image, strength: float) -> Image.Image:
    h = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    # 边缘 wrap，配合 MirroredRepeatWrapping 不产生接缝法线
    gy, gx = np.gradient(np.pad(h, 1, mode="wrap"))
    gy, gx = gy[1:-1, 1:-1] * strength, gx[1:-1, 1:-1] * strength
    n = np.stack([-gx, gy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def main() -> int:
    rc = 0
    for name, strength in JOBS:
        src, out = TEX / f"{name}.png", TEX / f"{name}_normal.png"
        if out.exists():
            print(f"skip {name}")
            continue
        if not src.exists():
            print(f"missing {src}")
            rc = 1
            continue
        normal_from_luma(Image.open(src), strength).save(out)
        print(f"OK {name}_normal.png strength={strength}")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
