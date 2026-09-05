#!/usr/bin/env python3
"""Re-lock E02's qwen variants with content-aware paste (v2).

Root cause of the broken mouths/blinks in V1: the v1 lock pasted the whole
measured rect from qwen's full-frame re-render, and qwen re-renders ALL skin
and fur inside that rect (blush, tone shift), so the patch flashed at 12fps.

v2: inside the measured rough rect, find where the qwen full render differs
STRONGLY from the base (that cluster IS the new mouth/eyelid content), take
its bbox, expand 4px, feather 4px, and paste only that. Position is decided
by the variant's own pixels (auto-aligns), re-rendered skin is excluded.

Inputs:  assets/keyframes/<base>.png + tmp/qwen_edits/<base>_<variant>_full.png
Outputs: assets/{mouth,eye}_variants/<base>_<variant>_locked_v2.png
         + prints the content rect per rig (used to rebuild *_rigs.json).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

EP = Path(__file__).resolve().parents[1]
A = EP / "assets"
FULL = EP / "tmp" / "qwen_edits"
DIFF_THRESH = 60
EXPAND = 4
FEATHER = 4

# rig name -> (out_dir, base, variant, rough rect from the v1 JOBS table)
JOBS = {
    "girl_frame03_entry4": ("mouth_variants", "frame_03", "half", (1112, 165, 52, 42)),
    "girl_frame03_entry4#open": ("mouth_variants", "frame_03", "open", (1112, 165, 52, 42)),
    "girl_frame06_entry8": ("mouth_variants", "frame_06", "half", (812, 165, 50, 40)),
    "girl_frame06_entry8#open": ("mouth_variants", "frame_06", "open", (812, 165, 50, 40)),
    "girl_frame11_entry11": ("mouth_variants", "frame_11", "half", (725, 272, 60, 46)),
    "girl_frame11_entry11#open": ("mouth_variants", "frame_11", "open", (725, 272, 60, 46)),
    "girl_frame16_entry14": ("mouth_variants", "frame_16", "half", (670, 390, 56, 44)),
    "girl_frame16_entry14#open": ("mouth_variants", "frame_16", "open", (670, 390, 56, 44)),
    "cat_frame02_meow": ("mouth_variants", "frame_02", "half", (990, 375, 75, 52)),
    "cat_frame02_meow#open": ("mouth_variants", "frame_02", "open", (990, 375, 75, 52)),
    "cat_frame05_meow": ("mouth_variants", "frame_05", "half", (850, 465, 70, 50)),
    "cat_frame05_meow#open": ("mouth_variants", "frame_05", "open", (850, 465, 70, 50)),
    "cat_frame13_meow": ("mouth_variants", "frame_13", "half", (605, 430, 80, 54)),
    "cat_frame13_meow#open": ("mouth_variants", "frame_13", "open", (605, 430, 80, 54)),
    "girl_frame01_blink": ("eye_variants", "frame_01", "closed", (505, 190, 130, 65)),
    "girl_frame03_blink": ("eye_variants", "frame_03", "closed", (1085, 118, 100, 55)),
    "girl_frame06_blink": ("eye_variants", "frame_06", "closed", (795, 118, 92, 54)),
    "girl_frame11_blink": ("eye_variants", "frame_11", "closed", (695, 208, 105, 60)),
    "girl_frame14_blink": ("eye_variants", "frame_14", "closed", (490, 285, 105, 55)),
    "girl_frame16_blink": ("eye_variants", "frame_16", "closed", (635, 258, 85, 75)),
    "cat_frame02_blink": ("eye_variants", "frame_02", "closed", (955, 305, 145, 70)),
    "cat_frame05_blink": ("eye_variants", "frame_05", "closed", (835, 415, 105, 62)),
    "cat_frame10_blink": ("eye_variants", "frame_10", "closed", (800, 380, 62, 56)),
    "cat_frame13_blink": ("eye_variants", "frame_13", "closed", (570, 370, 155, 65)),
}


def content_bbox(base: np.ndarray, var: np.ndarray, rect: tuple[int, int, int, int]) -> list[int]:
    x, y, w, h = rect
    b = base[y:y + h, x:x + w]
    v = var[y:y + h, x:x + w]
    d = np.abs(v - b).sum(axis=2)
    m = d > DIFF_THRESH
    if m.sum() == 0:
        raise RuntimeError("no strong diff inside rough rect")
    ys, xs = m.nonzero()
    W, H = base.shape[1], base.shape[0]
    x0 = max(0, x + int(xs.min()) - EXPAND)
    y0 = max(0, y + int(ys.min()) - EXPAND)
    x1 = min(W, x + int(xs.max()) + EXPAND + 1)
    y1 = min(H, y + int(ys.max()) + EXPAND + 1)
    return [x0, y0, x1 - x0, y1 - y0]


def paste(base: Image.Image, var: Image.Image, rect: list[int]) -> Image.Image:
    x, y, w, h = rect
    region = var.crop((x, y, x + w, y + h))
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=max(2, min(w, h) // 3), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    out = base.copy()
    out.paste(region, (x, y), mask)
    return out


def main() -> None:
    rects: dict[str, list[int]] = {}
    for key, (out_dir, base_name, variant, rough) in JOBS.items():
        stem = f"{base_name}_{variant}"
        full_path = FULL / f"{stem}_full.png"
        if not full_path.is_file():
            print(f"SKIP {stem}: {full_path.name} missing")
            continue
        base_img = Image.open(A / "keyframes" / f"{base_name}.png").convert("RGB")
        var_img = Image.open(full_path).convert("RGB")
        if var_img.size != base_img.size:
            var_img = var_img.resize(base_img.size, Image.LANCZOS)
        base = np.asarray(base_img, dtype=np.int16)
        var = np.asarray(var_img, dtype=np.int16)
        rect = content_bbox(base, var, rough)
        out = paste(base_img, var_img, rect)
        out_path = A / out_dir / f"{stem}_locked_v2.png"
        out.save(out_path)
        rects[key] = rect
        print(f"OK {stem}: content rect={rect}")
    (EP / "tmp" / "relock_rects.json").write_text(
        json.dumps(rects, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote tmp/relock_rects.json ({len(rects)} rects)")


if __name__ == "__main__":
    main()
