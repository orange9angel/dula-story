#!/usr/bin/env python3
"""Calibrate mouth/eye rig rects for snow_fox_shrine from the locked variants.

Diffs each *_locked_v1.png against its base keyframe, takes the change bbox,
unions the half+open rects per mouth rig, expands for the feather zone, and
writes config/mouth_rigs.json + config/eye_rigs.json. Mirrors the cat_leads
calibration discipline (PIL diff bbox, threshold 30, +14px pad).

Mouth rig entry mapping (script.story SRT indices):
    frame_05 -> entry 3, frame_09 -> entry 7,
    frame_12 -> entries [10, 11] (two bell lines share one plate),
    frame_14 -> entry 12.

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops

EP = Path(__file__).resolve().parents[1]
K = EP / "assets" / "keyframes"
MV = EP / "assets" / "mouth_variants"
EV = EP / "assets" / "eye_variants"
THRESH = 30
PAD = 14

MOUTH_RIGS = {
    "tsumugi_frame05_entry3": {"base": "frame_05", "entry": 3},
    "tsumugi_frame09_entry7": {"base": "frame_09", "entry": 7},
    "tsumugi_frame12_entries10_11": {"base": "frame_12", "entry": [10, 11]},
    "tsumugi_frame14_entry12": {"base": "frame_14", "entry": 12},
}
EYE_RIGS = {
    "tsumugi_frame05_blink": {"base": "frame_05", "interval": [2.8, 4.4]},
    "tsumugi_frame09_blink": {"base": "frame_09", "interval": [2.8, 4.4]},
    "tsumugi_frame12_blink": {"base": "frame_12", "interval": [2.8, 4.4]},
    "tsumugi_frame14_blink": {"base": "frame_14", "interval": [2.8, 4.4]},
    "fox_frame04_blink": {"base": "frame_04", "interval": [3.2, 5.0]},
    "fox_frame13_blink": {"base": "frame_13", "interval": [3.2, 5.0]},
}


def diff_bbox(base_path: Path, variant_path: Path) -> tuple[int, int, int, int]:
    base = Image.open(base_path).convert("RGB")
    variant = Image.open(variant_path).convert("RGB")
    if variant.size != base.size:
        raise SystemExit(f"SIZE MISMATCH: {variant_path.name} {variant.size} vs {base.size}")
    gray = ImageChops.difference(base, variant).convert("L")
    mask = gray.point(lambda v: 255 if v > THRESH else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise SystemExit(f"NO DIFF: {variant_path.name} is pixel-identical to its base")
    x0 = max(0, bbox[0] - PAD)
    y0 = max(0, bbox[1] - PAD)
    x1 = min(base.width, bbox[2] + PAD)
    y1 = min(base.height, bbox[3] + PAD)
    return x0, y0, x1 - x0, y1 - y0


def union(rects: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    x0 = min(r[0] for r in rects)
    y0 = min(r[1] for r in rects)
    x1 = max(r[0] + r[2] for r in rects)
    y1 = max(r[1] + r[3] for r in rects)
    return x0, y0, x1 - x0, y1 - y0


def main() -> None:
    mouth = {"version": 2, "sourceCoordinateSpace": "native-image-pixels",
             "states": ["closed", "half", "open"],
             "notes": "Rects calibrated by tools/calibrate_rigs.py: PIL diff bbox "
                      "(threshold 30) of each *_locked_v1.png against its base "
                      "keyframe, unioned over half+open, padded 14px for the "
                      "feather zone. frame_12's rig covers SRT entries 10 and 11.",
             "rigs": {}}
    for rig_id, spec in MOUTH_RIGS.items():
        base = spec["base"]
        rects = [
            diff_bbox(K / f"{base}.png", MV / f"{base}_{state}_locked_v1.png")
            for state in ("half", "open")
        ]
        mouth["rigs"][rig_id] = {
            "entry": spec["entry"],
            "mode": "image",
            "rect": list(union(rects)),
            "variants": {
                "closed": f"keyframes/{base}.png",
                "half": f"mouth_variants/{base}_half_locked_v1.png",
                "open": f"mouth_variants/{base}_open_locked_v1.png",
            },
        }
        print(f"mouth {rig_id}: rect={mouth['rigs'][rig_id]['rect']}")

    eye = {"version": 1, "sourceCoordinateSpace": "native-image-pixels",
           "notes": "Blink rigs. Closed variants feather-locked onto the base "
                    "frame; rect calibrated by tools/calibrate_rigs.py (diff "
                    "bbox, threshold 30, +14px pad).",
           "rigs": {}}
    for rig_id, spec in EYE_RIGS.items():
        base = spec["base"]
        rect = diff_bbox(K / f"{base}.png", EV / f"{base}_closed_locked_v1.png")
        eye["rigs"][rig_id] = {
            "rect": list(rect),
            "closed": f"eye_variants/{base}_closed_locked_v1.png",
            "intervalSeconds": spec["interval"],
        }
        print(f"eye   {rig_id}: rect={list(rect)}")

    (EP / "config" / "mouth_rigs.json").write_text(
        json.dumps(mouth, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (EP / "config" / "eye_rigs.json").write_text(
        json.dumps(eye, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote config/mouth_rigs.json + config/eye_rigs.json")


if __name__ == "__main__":
    main()
