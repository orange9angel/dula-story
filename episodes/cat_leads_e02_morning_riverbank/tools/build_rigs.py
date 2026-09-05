#!/usr/bin/env python3
"""Calibrate config/mouth_rigs.json and config/eye_rigs.json from the real
locked variants: PIL diff bbox (threshold 30) of each *_locked_v1.png against
its base keyframe, unioned over half+open for mouths, expanded 14 px for the
feather zone. Mirrors E01's calibration discipline.

Run after tools/auto_lock_variants.py.
"""

import json
from pathlib import Path

from PIL import Image, ImageChops

EP = Path(__file__).resolve().parent.parent
A = EP / "assets"
THRESH = 30
EXPAND = 14

MOUTH_RIGS = {  # rig name -> (base frame, story entry)
    "girl_frame01_entry2": ("frame_01", 2),
    "girl_frame03_entry4": ("frame_03", 4),
    "girl_frame06_entry8": ("frame_06", 8),
    "girl_frame11_entry11": ("frame_11", 11),
    "girl_frame16_entry14": ("frame_16", 14),
    "cat_frame02_meow": ("frame_02", 3),
    "cat_frame05_meow": ("frame_05", 7),
    "cat_frame13_meow": ("frame_13", 12),
}

EYE_RIGS = {  # rig name -> base frame
    "girl_frame01_blink": "frame_01",
    "girl_frame03_blink": "frame_03",
    "girl_frame06_blink": "frame_06",
    "girl_frame11_blink": "frame_11",
    "girl_frame14_blink": "frame_14",
    "girl_frame16_blink": "frame_16",
    "cat_frame02_blink": "frame_02",
    "cat_frame05_blink": "frame_05",
    "cat_frame10_blink": "frame_10",
    "cat_frame13_blink": "frame_13",
}


def diff_bbox(base: Image.Image, variant: Image.Image) -> tuple[int, int, int, int]:
    if variant.size != base.size:
        variant = variant.resize(base.size)
    diff = ImageChops.difference(base, variant)
    mask = diff.convert("L").point(lambda p: 255 if p > THRESH else 0)
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError("no diff bbox found")
    return bbox


def union(boxes: list[tuple[int, int, int, int]], w: int, h: int) -> list[int]:
    x0 = max(0, min(b[0] for b in boxes) - EXPAND)
    y0 = max(0, min(b[1] for b in boxes) - EXPAND)
    x1 = min(w, max(b[2] for b in boxes) + EXPAND)
    y1 = min(h, max(b[3] for b in boxes) + EXPAND)
    return [x0, y0, x1 - x0, y1 - y0]


def main() -> None:
    mouth_rigs = {}
    for rig, (base_name, entry) in MOUTH_RIGS.items():
        base = Image.open(A / "keyframes" / f"{base_name}.png").convert("RGB")
        half = A / "mouth_variants" / f"{base_name}_half_locked_v1.png"
        open_ = A / "mouth_variants" / f"{base_name}_open_locked_v1.png"
        boxes = [diff_bbox(base, Image.open(p).convert("RGB")) for p in (half, open_)]
        rect = union(boxes, *base.size)
        mouth_rigs[rig] = {
            "entry": entry,
            "mode": "image",
            "rect": rect,
            "variants": {
                "closed": f"keyframes/{base_name}.png",
                "half": f"mouth_variants/{base_name}_half_locked_v1.png",
                "open": f"mouth_variants/{base_name}_open_locked_v1.png",
            },
        }
        print(f"mouth {rig}: rect={rect}")
    (EP / "config" / "mouth_rigs.json").write_text(json.dumps({
        "version": 2,
        "sourceCoordinateSpace": "native-image-pixels",
        "states": ["closed", "half", "open"],
        "notes": ("Only the tight mouth rectangle is copied from generated variants; "
                  "all other pixels come from the stable closed-mouth base frame. "
                  "Variants are the feather-locked outputs of tools/auto_lock_variants.py. "
                  "Rects calibrated by tools/build_rigs.py from PIL diff bboxes "
                  "(threshold 30), unioned over half+open, expanded 14px. Cat rigs are "
                  "driven by SFX cue energy (SRT entries 3, 7 and 12 are the SFX-only "
                  "meow cues)."),
        "rigs": mouth_rigs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    eye_rigs = {}
    for rig, base_name in EYE_RIGS.items():
        base = Image.open(A / "keyframes" / f"{base_name}.png").convert("RGB")
        closed = A / "eye_variants" / f"{base_name}_closed_locked_v1.png"
        rect = union([diff_bbox(base, Image.open(closed).convert("RGB"))], *base.size)
        eye_rigs[rig] = {
            "rect": rect,
            "closed": f"eye_variants/{base_name}_closed_locked_v1.png",
            "intervalSeconds": [2.8, 4.4],
        }
        print(f"eye   {rig}: rect={rect}")
    (EP / "config" / "eye_rigs.json").write_text(json.dumps({
        "version": 1,
        "sourceCoordinateSpace": "native-image-pixels",
        "notes": ("Blink rigs. The closed variant is feather-locked onto the base frame "
                  "(tools/auto_lock_variants.py); only the rect region is copied during "
                  "a blink. Interval is per-rig randomized by the scene's deterministic "
                  "scheduler (full-name hash stagger). Rects calibrated by "
                  "tools/build_rigs.py from PIL diff bboxes (threshold 30), expanded 14px."),
        "rigs": eye_rigs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote config/mouth_rigs.json + config/eye_rigs.json")


if __name__ == "__main__":
    main()
