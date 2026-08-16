#!/usr/bin/env python3
"""Final variant cleanup: rebuild every locked variant as `base + edit inside
a tight feature rect (feathered)` via lock_mouth_variant.py, so at runtime the
scene's hard rect-copy never swaps redraw noise outside the actual feature.

Rects are hand-verified against the full-size keyframes (not thumbnails).
Run from the episode directory with the dula-story venv python.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

EPISODE = Path(__file__).resolve().parents[1]
LOCK = EPISODE / "tools" / "lock_mouth_variant.py"

# rect = (x, y, w, h) in native image pixels
MOUTHS = {
    "05": (790, 395, 62, 42),
    "16": (830, 236, 42, 34),
    "22": (828, 246, 48, 36),
    "23": (770, 348, 90, 40),
    "27": (785, 288, 58, 32),
    "28": (605, 200, 42, 30),
    "29": (745, 341, 64, 34),
    "31": (738, 333, 52, 48),
    "32": (803, 516, 58, 38),
    "34": (725, 275, 80, 55),
    "36": (705, 370, 98, 42),
    "38": (1040, 180, 80, 55),
    "39": (655, 165, 55, 40),
}
MEOW = {"25": (655, 345, 130, 90)}
EYES = {
    "04": (690, 240, 200, 70),
    "05": (665, 255, 190, 70),
    "09": (410, 270, 860, 180),
    "16": (765, 190, 155, 60),
    "21": (720, 205, 230, 90),
    "23": (750, 265, 175, 65),
    "26": (825, 240, 175, 60),
    "27": (750, 220, 170, 65),
    "29": (710, 230, 150, 60),
    "32": (705, 365, 295, 95),
    "35": (615, 280, 180, 80),
    "36": (690, 255, 170, 80),
    "39": (575, 155, 110, 60),
}


def lock(base: Path, variant: Path, out: Path, rect: tuple[int, int, int, int]) -> bool:
    result = subprocess.run(
        [sys.executable, str(LOCK), str(base), str(variant), str(out),
         "--rect", *map(str, rect), "--feather", "8"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if result.returncode != 0:
        print(f"FAIL {variant.name}: {result.stdout.strip()} {result.stderr.strip()[:200]}")
        return False
    return True


def main() -> None:
    # Always rebuild from the pristine crop-edit composites kept in backup.
    backup = EPISODE / "tmp" / "variants_unrefined"
    failures = []
    jobs = []  # (base_num, variant_name, out_name, rect)
    for num, rect in MOUTHS.items():
        for state in ("half", "open"):
            jobs.append((num, f"frame_{num}_{state}_locked_v1.png", f"frame_{num}_{state}_locked_v1.png", rect, "mouth_variants"))
    for num, rect in MEOW.items():
        for state in ("meow_half", "meow_open"):
            jobs.append((num, f"frame_{num}_{state}_locked_v1.png", f"frame_{num}_{state}_locked_v1.png", rect, "mouth_variants"))
    for num, rect in EYES.items():
        jobs.append((num, f"frame_{num}_eyes_closed_locked_v1.png", f"frame_{num}_eyes_closed_locked_v1.png", rect, "eye_variants"))

    for num, var_name, out_name, rect, sub in jobs:
        src = backup / var_name
        if not src.exists():
            src = EPISODE / "assets" / sub / var_name  # fallback: current file
        base = EPISODE / "assets" / "keyframes" / f"frame_{num}.png"
        out = EPISODE / "assets" / sub / out_name
        tmp_out = EPISODE / "tmp" / f"relock_{out_name}"
        if lock(base, src, tmp_out, rect):
            tmp_out.replace(out)
            print(f"ok {out_name} rect={rect}")
        else:
            failures.append(out_name)

    if failures:
        print("FAILURES:", ", ".join(failures))
        sys.exit(1)
    print(f"relocked {len(jobs)} variants")


if __name__ == "__main__":
    main()
