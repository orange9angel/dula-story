#!/usr/bin/env python3
"""《9章》片尾彩蛋：后山坠坑青绿光脉冲 + 心跳 + 淡黑（3s，程序化零生成费）。
底图=引子 frame_00（城市黄昏天际线，后山在画面中上部）。
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

W, H = 1280, 720
FPS = 24
N = 72  # 3s
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp" / "sting" / "frames"
OUT.mkdir(parents=True, exist_ok=True)

BG = Image.open(ROOT / "assets" / "keyframes" / "frame_00.png").convert("RGB").resize((W, H), Image.LANCZOS)

# 光脉冲位置：后山（画面上部偏左的远山轮廓处）
GX, GY = int(W * 0.30), int(H * 0.34)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
dist = np.sqrt((xx - GX) ** 2 + (yy - GY) ** 2)

for n in range(N):
    t = n / FPS
    im = ImageEnhance.Brightness(BG).enhance(0.82)
    arr = np.asarray(im).astype(np.float32)
    # 两次呼吸脉冲：0.4-1.2s 与 1.5-2.3s
    glow = np.zeros((H, W), dtype=np.float32)
    for t0 in (0.4, 1.5):
        if t0 <= t < t0 + 0.8:
            p = (t - t0) / 0.8
            r = 30 + 150 * p
            band = np.exp(-((dist - r) ** 2) / (2 * (22 + 26 * p) ** 2))
            glow += band * np.sin(np.pi * p)
    glow = np.clip(glow, 0, 1)
    for c, v in enumerate((61, 255, 200)):
        arr[..., c] = np.clip(arr[..., c] + glow * v * 0.85, 0, 255)
    im = Image.fromarray(arr.astype(np.uint8))
    # 光核
    core = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dc = ImageDraw.Draw(core)
    pulse_a = int(200 * glow[int(GY), int(GX)])
    if pulse_a > 6:
        dc.ellipse((GX - 9, GY - 9, GX + 9, GY + 9), fill=(180, 255, 230, pulse_a))
        core = core.filter(ImageFilter.GaussianBlur(6))
        im = Image.alpha_composite(im.convert("RGBA"), core).convert("RGB")
    # 收尾淡黑 2.4s 起
    if t >= 2.4:
        q = (t - 2.4) / 0.6
        im = ImageEnhance.Brightness(im).enhance(max(0.0, 1 - q))
    im.save(OUT / f"f_{n:03d}.png")
print(f"sting frames: {N}")
