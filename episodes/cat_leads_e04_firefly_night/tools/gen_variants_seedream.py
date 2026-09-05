#!/usr/bin/env python3
"""E04 variant generation via Volcano Seedream image edit (Ark images API).

Why this exists: the codex quota ran out mid-batch (4/27 done). Seedream 5.0
pro edits preserve layout and the edit quality passes the mouth-shape bar, but
the API REGENERATES the whole frame (no pixel-stable outside region, even with
PNG output), so the codex-style auto-detect bbox paste-back cannot work. This
script therefore locks with a HAND-CALIBRATED generous face rect per frame
(auto_lock_variants.lock_one with an explicit rect): outside the rect the
output is bit-identical  to the base by construction; inside, visual review
gates the feature itself.

Face rects were measured once from the base frames (1672x941); they cover the
whole face (eyes+mouth) with margin, so one box serves both blink and mouth
locks of the same frame.

Already done by codex (skipped): frame_01 half/open, frame_04 half/open.

Usage:
  set -a && source ../../.env.ark && set +a
  ../../.venv/Scripts/python.exe tools/gen_variants_seedream.py
"""

from __future__ import annotations

import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(EP / "tools"))

from auto_lock_variants import lock_one  # noqa: E402
import seededit_probe  # noqa: E402

MV = EP / "assets" / "mouth_variants"
EV = EP / "assets" / "eye_variants"
K = EP / "assets" / "keyframes"

# frame -> generous face box (x, y, w, h), measured on the 1672x941 base.
FACE = {
    "frame_01": (400, 235, 190, 215),
    "frame_02": (470, 220, 270, 240),
    "frame_03": (510, 105, 180, 200),
    "frame_04": (655, 80, 200, 220),
    "frame_06": (600, 160, 220, 220),
    "frame_08": (990, 215, 220, 215),
    "frame_11": (405, 80, 155, 180),
    "frame_12": (650, 145, 300, 265),
    "frame_13": (415, 170, 140, 150),
    "frame_14": (675, 165, 130, 135),
    "frame_16": (610, 220, 210, 350),
}

MOUTH_GIRL = ["frame_06", "frame_11", "frame_16"]
MOUTH_CAT = ["frame_02", "frame_08", "frame_12"]
BLINK_GIRL = ["frame_01", "frame_03", "frame_04", "frame_06",
              "frame_11", "frame_13", "frame_14", "frame_16"]
BLINK_CAT = ["frame_02", "frame_08", "frame_12"]

EDITS = {
    ("girl", "half"): "只把少女的嘴部改成微张（half-open，唇间露出一点口腔）",
    ("girl", "open"): "只把少女的嘴部改成自然张开（说话时的开口，露出一点口腔和牙齿）",
    ("cat", "half"): "只把橘猫的嘴部改成微张（猫说话起音，吻部小幅打开，尺寸克制）",
    ("cat", "open"): "只把橘猫的嘴部改成自然张开（猫说话的开口，露出一点口腔，尺寸克制不要夸张）",
    ("girl", "closed"): "只把少女的双眼改成闭合（眼皮垂下成两条极细、浅色的短弧线，不要粗黑厚眼线）",
    ("cat", "closed"): "只把橘猫的双眼改成闭合（眼皮垂下成两条极细、浅色的短弧线，不要粗黑厚眼线）",
}


def run_job(frame: str, who: str, variant: str) -> bool:
    out_dir = EV if variant == "closed" else MV
    name = f"{frame}_{variant}"
    locked = out_dir / f"{name}_locked_v1.png"
    if locked.exists():
        print(f"skip {name} (locked exists)")
        return True
    raw = out_dir / f"{name}.png"
    base = K / f"{frame}.png"
    if not raw.exists():
        code = seededit_probe.main([
            "--base", str(base), "--edit", EDITS[(who, variant)],
            "--out", str(raw), "--output-format", "png",
        ])
        if code != 0 or not raw.exists():
            print(f"GEN-FAIL {name}")
            return False
    return lock_one(base, raw, locked, FACE[frame])


def main() -> int:
    MV.mkdir(parents=True, exist_ok=True)
    EV.mkdir(parents=True, exist_ok=True)
    jobs: list[tuple[str, str, str]] = []
    for frame in MOUTH_GIRL:
        jobs.append((frame, "girl", "half"))
        jobs.append((frame, "girl", "open"))
    for frame in MOUTH_CAT:
        jobs.append((frame, "cat", "half"))
        jobs.append((frame, "cat", "open"))
    for frame in BLINK_GIRL:
        jobs.append((frame, "girl", "closed"))
    for frame in BLINK_CAT:
        jobs.append((frame, "cat", "closed"))
    fails = 0
    for frame, who, variant in jobs:
        ok = run_job(frame, who, variant)
        print(("OK   " if ok else "FAIL ") + f"{frame} {variant}")
        fails += 0 if ok else 1
    print(f"done: {len(jobs) - fails}/{len(jobs)} locked")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
