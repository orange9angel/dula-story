#!/usr/bin/env python3
"""2D→3D 材质化：从文生图 albedo 派生切线空间法线图（亮度 Sobel 梯度）。

文生图不含 3D 信息，但材质纹理的亮度变化与表面起伏强相关（沟壑暗、凸起亮），
亮度梯度转法线可让纹理在场景灯光下产生真实明暗起伏——这是"贴皮"和"材质化"的分界。

产出 assets3d/tex/<name>_normal.png（skip-if-exists；源图改了删产物重跑）。

用法：.venv/Scripts/python.exe episodes/bio_armor_academy_s1e2/tools/derive_maps.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[1]
TEX = EP / "assets3d/tex"

# (名称, 法线强度) —— 布料弱、泥地/混凝土中、锈钢强
JOBS = [("ground", 2.2), ("concrete", 1.6), ("steel", 2.6), ("tarp", 1.2), ("sand", 1.4)]


def normal_from_luma(img: Image.Image, strength: float) -> Image.Image:
    h = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    # 边缘 wrap，配合 MirroredRepeatWrapping 不产生接缝法线
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
