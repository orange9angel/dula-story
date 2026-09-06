#!/usr/bin/env python3
"""Color-match I2V cels to their source keyframe's palette (E07 V3).

Seedance full-tier output shifts darker/more saturated vs the codex
keyframe it was given (E07: mean RGB [85,146,148] -> [69,125,127]),
visible as a color jump at the clip boundary. Reinhard per-channel
mean/std match against the first-frame keyframe fixes it.

Usage: match_i2v_color.py <cel_dir> <reference.png>   (in-place rewrite)
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def stats(img: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    return img.mean(axis=(0, 1)), img.std(axis=(0, 1))


def main() -> int:
    cel_dir, ref_path = Path(sys.argv[1]), Path(sys.argv[2])
    ref = np.array(Image.open(ref_path).convert("RGB").resize((480, 270)),
                   dtype=np.float64)
    ref_mean, ref_std = stats(ref)
    cels = sorted(cel_dir.glob("f_*.png"))
    if not cels:
        print(f"no cels in {cel_dir}")
        return 1
    for cel_path in cels:
        img = Image.open(cel_path).convert("RGB")
        small = np.array(img.resize((480, 270)), dtype=np.float64)
        cel_mean, cel_std = stats(small)
        arr = np.array(img, dtype=np.float64)
        arr = (arr - cel_mean) * (ref_std / np.maximum(cel_std, 1.0)) + ref_mean
        Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(cel_path)
    print(f"matched {len(cels)} cels in {cel_dir.name} to {ref_path.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
