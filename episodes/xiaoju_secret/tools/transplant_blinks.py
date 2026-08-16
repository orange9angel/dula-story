#!/usr/bin/env python3
"""Transplant the AI-drawn closed cat eyes from the V3 salvage
(tmp/gen/frame_09_blink.png) onto other cat shots (20/21/03/17).

Per eye: scale the source closed-eye strip to the target eye size, rotate to
the eye tilt, tone-match to the target frame's fur (per-channel mean/std
transfer sampled above the target eye), then feather-paste.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

EPISODE = Path(__file__).resolve().parents[1]
V3 = Image.open(EPISODE / "tmp/gen/frame_09_blink.png").convert("RGB")
# closed-eye strips in the V3 salvage (full-size source pixels)
STRIPS = {
    "L": (350, 515, 695, 612),
    "R": (985, 510, 1198, 608),
}


def tone_match(strip: np.ndarray, ref: np.ndarray) -> np.ndarray:
    out = np.empty_like(strip, dtype=np.float64)
    for c in range(3):
        s = strip[:, :, c].astype(np.float64)
        r = ref[:, :, c].astype(np.float64)
        out[:, :, c] = (s - s.mean()) * (r.std() / (s.std() + 1e-6)) + r.mean()
    return np.clip(out, 0, 255)


def transplant(base: Image.Image, side: str, center, size, angle_deg, fur_sample, feather=5):
    """Return a copy of base with the V3 closed eye pasted at center."""
    sw = int((STRIPS[side][2] - STRIPS[side][0]))
    sh = int((STRIPS[side][3] - STRIPS[side][1]))
    strip = V3.crop(STRIPS[side]).resize((size[0], size[1]), Image.LANCZOS)

    # tone-match the strip to the fur around the target eye
    fx, fy, fw, fh = fur_sample
    ref = np.asarray(base.crop((fx, fy, fx + fw, fy + fh)))
    matched = Image.fromarray(tone_match(np.asarray(strip), ref).astype(np.uint8))

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    mask = Image.new("L", (size[0], size[1]), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([4, 4, size[0] - 4, size[1] - 4], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    layer.paste(matched, (center[0] - size[0] // 2, center[1] - size[1] // 2), mask)
    layer = layer.rotate(angle_deg, resample=Image.BICUBIC, center=center)
    out = base.convert("RGBA")
    out.alpha_composite(layer)
    return out.convert("RGB")


def main() -> None:
    jobs = {
        # frame: list of (side, center, size, angle, fur_sample)
        "21": [
            ("L", (877, 652), (64, 54), -6, (866, 580, 50, 40)),
            ("R", (986, 674), (66, 56), 7, (960, 598, 54, 40)),
        ],
        "20": [
            ("L", (968, 528), (68, 56), -3, (940, 452, 58, 40)),
            ("R", (1040, 524), (60, 52), 5, (1014, 450, 54, 38)),
        ],
    }
    for frame, eyes in jobs.items():
        base = Image.open(EPISODE / f"assets/keyframes/frame_{frame}.png").convert("RGB")
        out = base
        for side, center, size, ang, fur in eyes:
            out = transplant(out, side, center, size, ang, fur)
        out.save(EPISODE / f"assets/eye_variants/frame_{frame}_cat_eyes_closed_locked_v1.png")
        print(frame, "transplanted")


if __name__ == "__main__":
    main()
