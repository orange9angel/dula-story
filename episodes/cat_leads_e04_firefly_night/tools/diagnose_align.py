#!/usr/bin/env python3
"""Measure geometric drift of seedream variants vs base frames.

Registers the face-box context (feature box masked out) between base and each
variant by exhaustive integer translation search (+-6px). If the variant's
feature sits at a different position than the base's, mouth cels will appear
to jump when states alternate at 12fps — the "misaligned expression" symptom.
"""
from pathlib import Path

import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[1]

FACE = {
    "frame_01": (400, 235, 190, 215), "frame_02": (470, 220, 270, 240),
    "frame_03": (510, 105, 180, 200), "frame_04": (655, 80, 200, 220),
  "frame_06": (600, 160, 220, 220), "frame_08": (990, 215, 220, 215),
    "frame_11": (405, 80, 155, 180), "frame_12": (650, 145, 300, 265),
    "frame_13": (415, 170, 140, 150), "frame_14": (675, 165, 130, 135),
    "frame_16": (610, 220, 210, 350),
}
FEATURE = {  # feature box to mask out (mouth or eyes) within face box
    "frame_01": (462, 334, 42, 35), "frame_02": (593, 349, 73, 61),
    "frame_03": (558, 183, 85, 70), "frame_04": (722, 169, 47, 39),
    "frame_06": (662, 247, 73, 81), "frame_08": (1089, 335, 91, 88),
    "frame_11": (469, 161, 62, 58), "frame_12": (758, 306, 118, 96),
    "frame_13": (462, 184, 74, 73), "frame_14": (705, 182, 62, 68),
    "frame_16": (681, 471, 89, 87),
}


def best_shift(b, v, mask, rng=6):
    best = None

    H, W = b.shape
    for dy in range(-rng, rng + 1):
        for dx in range(-rng, rng + 1):
            shifted = np.roll(np.roll(v, dy, 0), dx, 1)
            edge = np.zeros_like(mask)
            edge[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = True
            m = mask & edge
            if not m.any():
                continue
            err = np.abs(b - shifted)[m].mean()
            if best is None or err < best[0]:
                best = (err, dx, dy)
    return best


def measure(frame, variant_path, tag):
    fx, fy, fw, fh = FACE[frame]
    base = np.asarray(Image.open(EP / f"assets/keyframes/{frame}.png").convert("L"), dtype=np.float32)
    var = np.asarray(Image.open(variant_path).convert("L"), dtype=np.float32)
    if var.shape != base.shape:
        var = np.asarray(Image.open(variant_path).convert("L").resize((base.shape[1], base.shape[0])), dtype=np.float32)
    b = base[fy:fy + fh, fx:fx + fw]
    v = var[fy:fy + fh, fx:fx + fw]
    mask = np.ones_like(b, dtype=bool)
    mx, my, mw, mh = FEATURE[frame]
    # mask out feature box + margin, relative  to face box
    x0, y0 = max(0, mx - fx - 15), max(0, my - fy - 15)
    x1, y1 = min(fw, mx - fx + mw + 15), min(fh, my - fy + mh + 15)
    mask[y0:y1, x0:x1] = False
    err, dx, dy = best_shift(b, v, mask)
    print(f"{frame} {tag}: context shift dx={dx} dy={dy} meanErr={err:.1f}")


for frame in ["frame_06", "frame_11", "frame_16", "frame_02", "frame_08", "frame_12"]:
    measure(frame, EP / f"assets/mouth_variants/{frame}_open.png", "mouth_open")
for frame in ["frame_16", "frame_08", "frame_12", "frame_04"]:
    measure(frame, EP / f"assets/eye_variants/{frame}_closed.png", "eye_closed")
