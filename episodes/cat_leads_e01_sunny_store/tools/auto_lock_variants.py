#!/usr/bin/env python3
"""Auto-lock locally-edited variants back onto their base frames.

For each variant PNG (mouth/eye), diff against the base frame, take the
changed-region bbox (expanded + feathered), composite only that region onto
the base, and verify zero change outside. Output: *_locked_v1.png next to the
variant. Mirrors the rainy_rooftop_cat lock_region_variant.py discipline
(PIL pixel diff, change confined to a small rect) but auto-detects the rect.

Usage: python tools/auto_lock_variants.py
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

EP = Path(__file__).resolve().parent.parent
K = EP / "assets" / "keyframes"
THRESH = 30
EXPAND = 12
FEATHER = 6

PAIRS = []  # (base, variant_path)


def collect():
    mv = EP / "assets" / "mouth_variants"
    ev = EP / "assets" / "eye_variants"
    for d in (mv, ev):
        if not d.exists():
            continue
        for v in sorted(d.glob("*.png")):
            if v.stem.endswith("_locked_v1"):
                continue
            base_name = v.stem.split("_")[0] + "_" + v.stem.split("_")[1]  # frame_XX
            base = K / f"{base_name}.png"
            if base.exists():
                PAIRS.append((base, v))
            else:
                print(f"SKIP {v.name}: base {base_name}.png not found")


def lock_one(base_path: Path, variant_path: Path):
    base = Image.open(base_path).convert("RGB")
    var = Image.open(variant_path).convert("RGB")
    if var.size != base.size:
        var = var.resize(base.size)
    diff = ImageChops.difference(base, var)
    mask = diff.convert("L").point(lambda p: 255 if p > THRESH else 0)
    bbox = mask.getbbox()
    if not bbox:
        print(f"FAIL {variant_path.name}: no change detected")
        return False
    x0, y0, x1, y1 = bbox
    w, h = base.size
    x0, y0 = max(0, x0 - EXPAND), max(0, y0 - EXPAND)
    x1, y1 = min(w, x1 + EXPAND), min(h, y1 + EXPAND)
    rect = (x0, y0, x1, y1)

    region_mask = Image.new("L", base.size, 0)
    region_mask.paste(255, rect)
    region_mask = region_mask.filter(ImageFilter.GaussianBlur(FEATHER))

    locked = Image.composite(var, base, region_mask)
    out = variant_path.with_name(variant_path.stem + "_locked_v1.png")
    locked.save(out)

    # verify: outside rect + feather halo, locked must equal base exactly
    check = ImageChops.difference(base, locked).convert("L")
    inv = Image.new("L", base.size, 255)
    halo = (max(0, x0 - 2 * FEATHER), max(0, y0 - 2 * FEATHER),
            min(w, x1 + 2 * FEATHER), min(h, y1 + 2 * FEATHER))
    inv.paste(0, halo)
    outside = ImageChops.multiply(check, inv)
    extrema = outside.getextrema()
    area = (x1 - x0) * (y1 - y0)
    ok = extrema[1] == 0
    print(f"{'OK  ' if ok else 'FAIL'} {variant_path.name}: rect={rect} "
          f"({area / (w * h) * 100:.1f}% of frame), outside max diff={extrema[1]}")
    return ok


def main():
    collect()
    if not PAIRS:
        print("no variants to lock")
        return 0
    fails = sum(0 if lock_one(b, v) else 1 for b, v in PAIRS)
    print(f"locked {len(PAIRS) - fails}/{len(PAIRS)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
