#!/usr/bin/env python3
"""Refine locked variants to eliminate rectangle shimmer during cel switching.

The crop-forced edit pipeline pasted the whole regenerated crop back onto the
base frame, so every pixel inside the rig rect carries resampling/redraw noise
and flickers at 12 fps when the lip-sync cels alternate. This tool rebuilds
each variant as: pristine base pixels everywhere, variant content only inside
the dense significant-change blob (the actual mouth/eye edit), feathered.

Originals are backed up to tmp/variants_unrefined/ on first run.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

EPISODE = Path(__file__).resolve().parents[1]
BACKUP = EPISODE / "tmp" / "variants_unrefined"

SIG_THRESHOLD = 36      # per-pixel summed channel diff
DENSITY_RADIUS = 18     # gaussian radius for hotspot finding
KEEP_RADIUS_MOUTH = 95  # keep significant pixels within this distance of the hotspot
KEEP_RADIUS_EYE = 150   # two eyes are further apart
DILATE = 17             # MaxFilter size (odd)
FEATHER = 6.0


def refine(base: Image.Image, variant_path: Path, keep_components: int = 1) -> dict:
    from scipy import ndimage
    b = np.asarray(base, dtype=np.int16)
    v_img = Image.open(variant_path).convert("RGB")
    v = np.asarray(v_img, dtype=np.int16)
    d = np.abs(v - b).sum(axis=2)
    sig = d > SIG_THRESHOLD
    if not sig.any():
        return {"status": "no-diff"}

    # Connect the mouth/eye interiors into dense blobs, then keep only the
    # largest connected component(s) — edge/hair redraw noise forms thin
    # separate structures and is discarded, which stops the rectangle shimmer.
    # Blink cels keep the top 2 components (two eyes are separate blobs).
    closed = ndimage.binary_closing(sig, structure=np.ones((9, 9)))
    labels, count = ndimage.label(closed)
    if count == 0:
        return {"status": "no-diff"}
    sizes = ndimage.sum(np.ones_like(labels), labels, index=np.arange(1, count + 1))
    keep = set((np.argsort(sizes)[-keep_components:] + 1).tolist())
    core = np.isin(labels, list(keep))

    mask = Image.fromarray((core * 255).astype(np.uint8), "L")
    mask = mask.filter(ImageFilter.MaxFilter(DILATE))
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))

    out = base.copy()
    out.paste(v_img, (0, 0), mask)

    if not BACKUP.exists():
        BACKUP.mkdir(parents=True)
    backup_path = BACKUP / variant_path.name
    if not backup_path.exists():
        shutil.copy2(variant_path, backup_path)
    out.save(variant_path)

    kept = int(core.sum())
    return {"status": "refined", "kept_px": kept, "components": int(count)}


def main() -> None:
    mouth_cfg = json.loads((EPISODE / "config" / "mouth_rigs.json").read_text(encoding="utf-8"))
    eye_cfg = json.loads((EPISODE / "config" / "eye_rigs.json").read_text(encoding="utf-8"))
    problems = []

    for rig_id, rc in mouth_cfg["rigs"].items():
        base = Image.open(EPISODE / "assets" / rc["variants"]["closed"]).convert("RGB")
        for state in ("half", "open"):
            path = EPISODE / "assets" / rc["variants"][state]
            result = refine(base, path, keep_components=1)
            print(f"{rig_id}/{state}: {result}")
            if result["status"] != "refined":
                problems.append(f"{rig_id}/{state}")

    import re
    for rig_id, rc in eye_cfg["rigs"].items():
        num = re.search(r"frame_?(\d+)", rig_id).group(1)
        base = Image.open(EPISODE / "assets" / "keyframes" / f"frame_{num}.png").convert("RGB")
        path = EPISODE / "assets" / rc["closed"]
        result = refine(base, path, keep_components=2)
        print(f"{rig_id}: {result}")
        if result["status"] != "refined":
            problems.append(rig_id)

    if problems:
        print("PROBLEMS:", ", ".join(problems))
        sys.exit(1)


if __name__ == "__main__":
    main()
