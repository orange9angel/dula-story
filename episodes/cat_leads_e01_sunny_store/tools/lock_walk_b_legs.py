#!/usr/bin/env python3
"""Rebuild frame_06 walk contact B so only the leg swap differs from contact A.

The v6 A/B pair were both full-image regenerations, so the repainted road
dapple pattern around the calves flickered at 3.2fps cel switches. Color
segmentation proved unreliable here (cream dapple blobs read as skin, blue
road shadow reads as dark clothing), so the swap mask is a hand-measured
rounded rect hugging both calves/shoes in either pose (dark-pixel histogram
of A/B puts socks+shoes at x 575-705, y 660-870). Inside the mask the output
is B; outside it is pixel-identical to A, so no background around the calves
can flicker.

Usage:
    python tools/lock_walk_b_legs.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets" / "action_inbetweens"
BASE = ASSETS / "frame_06_walk_contact_a_full-v6.png"
VARIANT = ASSETS / "frame_06_walk_contact_b_full-v6.png"
OUTPUT = ASSETS / "frame_06_walk_contact_b_full-v7.png"

# Swap mask (original 1672x940 coordinates): two overlapping rounded rects —
# a tight thigh band starting just under the skirt hem, and the calf/shoe
# rect — so B's thigh→calf junction stays inside the mask and the leg reads
# as one connected piece. Cut lines sit in the hem shadow and on the road.
RECTS = [
    (568, 556, 712, 664),  # thighs (x0, y0, x1, y1)
    (562, 648, 716, 895),  # calves + shoes
]
RADIUS = 24
FEATHER = 4.0
LEAK_PAD = 16                  # verification pad around mask
# B's lower body is repainted ~3px left of A's (measured by local
# registration of thighs/skirt; background is aligned). Roll the variant
# right before compositing so pasted legs connect to A's hips.
ALIGN_DX = 3


def main() -> None:
    base = Image.open(BASE).convert("RGB")
    variant = Image.open(VARIANT).convert("RGB")
    if variant.size != base.size:
        raise SystemExit(f"SIZE MISMATCH: {variant.size} vs {base.size}")
    if ALIGN_DX:
        rolled = np.roll(np.asarray(variant), ALIGN_DX, axis=1)
        rolled[:, :ALIGN_DX] = np.asarray(base)[:, :ALIGN_DX]  # no wrap-around
        variant = Image.fromarray(rolled)

    mask_img = Image.new("L", base.size, 0)
    draw = ImageDraw.Draw(mask_img)
    for rect in RECTS:
        draw.rounded_rectangle(rect, radius=RADIUS, fill=255)
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=FEATHER))

    locked = Image.composite(variant, base, mask_img)
    locked.save(OUTPUT, format="PNG", optimize=True)

    # Verification: outside the mask + feather pad the output must be
    # pixel-identical to A.
    A = np.asarray(base, dtype=np.int16)
    L = np.asarray(locked, dtype=np.int16)
    out_diff = np.abs(L - A).sum(axis=2)
    pad = LEAK_PAD + int(FEATHER * 3)
    inside = np.zeros(out_diff.shape, dtype=bool)
    for x0, y0, x1, y1 in RECTS:
        inside[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = True
    leaked = int((out_diff * ~inside > 0).sum())
    print(f"swap rects {RECTS}, leak px outside rects+pad: {leaked}")
    if leaked:
        raise SystemExit("LEAK: locked variant differs outside the feather zone")
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
