#!/usr/bin/env python3
"""Assemble config/mouth_rigs.json and config/eye_rigs.json from the locked
variant files in assets/mouth_variants/ and assets/eye_variants/.

Rig rects are derived by diffing each locked variant against its base frame
and taking the padded union bbox of the half/open (or blink) changes, so the
scene's rect always covers every cel of the rig regardless of which pipeline
(whole-image lock or crop edit) produced each variant.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

EPISODE = Path(__file__).resolve().parents[1]
KEYFRAMES = EPISODE / "assets" / "keyframes"
MOUTH = EPISODE / "assets" / "mouth_variants"
EYE = EPISODE / "assets" / "eye_variants"
PAD = 8

MOUTH_RIGS = {
    "girl_frame05_entry4": ("05", 4, "half", "open"),
    "girl_frame16_entry14": ("16", 14, "half", "open"),
    "boy_frame22_entry19": ("22", 19, "half", "open"),
    "girl_frame23_entry20": ("23", 20, "half", "open"),
    "boy_frame27_entry23": ("27", 23, "half", "open"),
    "girl_frame28_entry24": ("28", 24, "half", "open"),
    "boy_frame29_entry25": ("29", 25, "half", "open"),
    "boy_frame31_entry26": ("31", 26, "half", "open"),
    "girl_frame32_entry27": ("32", 27, "half", "open"),
    "girl_frame34_entry28": ("34", 28, "half", "open"),
    "boy_frame36_entry29": ("36", 29, "half", "open"),
    "girl_frame39_entry32": ("39", 32, "half", "open"),
    "cat_frame25_meow": ("25", 22, "meow_half", "meow_open"),
}

EYE_RIGS = {
    "cat_frame03_blink": "03",
    "girl_frame04_blink": "04",
    "girl_frame05_blink": "05",
    "cat_frame09_blink": "09",
    "girl_frame16_blink": "16",
    "cat_frame17_blink": "17",
    "boy_frame21_blink": "21",
    "girl_frame23_blink": "23",
    "girl_frame26_blink": "26",
    "boy_frame27_blink": "27",
    "boy_frame29_blink": "29",
    "girl_frame32_blink": "32",
    "boy_frame35_blink": "35",
    "boy_frame36_blink": "36",
    "boy_frame38_blink": "38",
    "cat_frame20_blink": ("20", "frame_20_cat_eyes_closed_locked_v1.png"),
    "cat_frame21_blink": ("21", "frame_21_cat_eyes_closed_locked_v1.png"),
    "girl_frame39_blink": "39",
}


def diff_bbox(base: Image.Image, variant_path: Path) -> list[int] | None:
    var = Image.open(variant_path).convert("RGB")
    if var.size != base.size:
        raise RuntimeError(f"size mismatch {variant_path.name}: {var.size} vs {base.size}")
    d = np.abs(np.asarray(var, dtype=np.int16) - np.asarray(base, dtype=np.int16)).sum(axis=2)
    ys, xs = (d > 30).nonzero()
    if len(xs) == 0:
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def union_rect(boxes: list[list[int]], width: int, height: int) -> list[int]:
    x0 = max(0, min(b[0] for b in boxes) - PAD)
    y0 = max(0, min(b[1] for b in boxes) - PAD)
    x1 = min(width, max(b[2] for b in boxes) + PAD)
    y1 = min(height, max(b[3] for b in boxes) + PAD)
    return [x0, y0, x1 - x0, y1 - y0]


def main() -> None:
    mouth_rigs: dict[str, dict] = {}
    eye_rigs: dict[str, dict] = {}
    problems: list[str] = []

    for rig_id, (num, entry, half_stem, open_stem) in MOUTH_RIGS.items():
        base = Image.open(KEYFRAMES / f"frame_{num}.png").convert("RGB")
        half = MOUTH / f"frame_{num}_{half_stem}_locked_v1.png"
        open_ = MOUTH / f"frame_{num}_{open_stem}_locked_v1.png"
        if not (half.exists() and open_.exists()):
            problems.append(f"{rig_id}: missing variants ({half.exists()=}, {open_.exists()=})")
            continue
        try:
            boxes = [b for b in (diff_bbox(base, half), diff_bbox(base, open_)) if b]
        except RuntimeError as exc:
            problems.append(f"{rig_id}: {exc}")
            continue
        if not boxes:
            problems.append(f"{rig_id}: variants identical to base")
            continue
        rect = union_rect(boxes, *base.size)
        mouth_rigs[rig_id] = {
            "entry": entry,
            "mode": "image",
            "rect": rect,
            "variants": {
                "closed": f"keyframes/frame_{num}.png",
                "half": f"mouth_variants/{half.name}",
                "open": f"mouth_variants/{open_.name}",
            },
        }

    for rig_id, spec in EYE_RIGS.items():
        num, fname = spec if isinstance(spec, tuple) else (spec, f"frame_{spec}_eyes_closed_locked_v1.png")
        base = Image.open(KEYFRAMES / f"frame_{num}.png").convert("RGB")
        closed = EYE / fname
        if not closed.exists():
            problems.append(f"{rig_id}: missing {closed.name}")
            continue
        try:
            box = diff_bbox(base, closed)
        except RuntimeError as exc:
            problems.append(f"{rig_id}: {exc}")
            continue
        if not box:
            problems.append(f"{rig_id}: variant identical to base")
            continue
        eye_rigs[rig_id] = {
            "rect": union_rect([box], *base.size),
            "closed": f"eye_variants/{closed.name}",
            "intervalSeconds": [2.2, 3.6],
        }

    (EPISODE / "config" / "mouth_rigs.json").write_text(json.dumps({
        "version": 2,
        "sourceCoordinateSpace": "native-image-pixels",
        "states": ["closed", "half", "open"],
        "notes": "Girl/boy viseme rigs plus one SFX-gated cat meow rig. Rects = padded union diff bbox (whole-image locks + crop-forced edits).",
        "rigs": mouth_rigs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    (EPISODE / "config" / "eye_rigs.json").write_text(json.dumps({
        "version": 1,
        "sourceCoordinateSpace": "native-image-pixels",
        "notes": "Blink rigs; deterministic scheduler (first blink 0.7-1.3 s into the shot, then every 2.8-4.4 s, lid closed 0.13 s).",
        "rigs": eye_rigs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"assembled: {len(mouth_rigs)}/14 mouth rigs, {len(eye_rigs)}/13 eye rigs")
    for p in problems:
        print("PROBLEM:", p)
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
