#!/usr/bin/env python3
"""Lock every generated mouth/blink variant back onto its base frame with a
feathered mask (via lock_region_variant.py), then emit config/mouth_rigs.json
and config/eye_rigs.json for xiaoju_secret.

Variant sources live in tmp/gen/ (raw codex edits, same pixel size as base).
Locked outputs go to assets/mouth_variants/ and assets/eye_variants/.
Run with the dula-story venv python from the episode directory.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

EPISODE = Path(__file__).resolve().parents[1]
GEN = EPISODE / "tmp" / "gen"
KEYFRAMES = EPISODE / "assets" / "keyframes"
MOUTH_OUT = EPISODE / "assets" / "mouth_variants"
EYE_OUT = EPISODE / "assets" / "eye_variants"
LOCK_TOOL = EPISODE / "tools" / "lock_region_variant.py"

# rig id -> (base frame number, lipsync cue entry index)
MOUTH_RIGS = {
    "girl_frame05_entry4": ("05", 4),
    "girl_frame16_entry14": ("16", 14),
    "boy_frame22_entry19": ("22", 19),
    "girl_frame23_entry20": ("23", 20),
    "boy_frame27_entry23": ("27", 23),
    "girl_frame28_entry24": ("28", 24),
    "boy_frame29_entry25": ("29", 25),
    "boy_frame31_entry26": ("31", 26),
    "girl_frame32_entry27": ("32", 27),
    "girl_frame34_entry28": ("34", 28),
    "boy_frame36_entry29": ("36", 29),
    "boy_frame38_entry31": ("38", 31),
    "girl_frame39_entry32": ("39", 32),
}
# cat meow rig uses different variant file stems
CAT_RIG = ("cat_frame25_meow", "25", 22)

EYE_RIGS = {
    "girl_frame04_blink": "04",
    "girl_frame05_blink": "05",
    "cat_frame09_blink": "09",
    "girl_frame16_blink": "16",
    "boy_frame21_blink": "21",
    "girl_frame23_blink": "23",
    "girl_frame26_blink": "26",
    "boy_frame27_blink": "27",
    "boy_frame29_blink": "29",
    "girl_frame32_blink": "32",
    "boy_frame35_blink": "35",
    "boy_frame36_blink": "36",
    "girl_frame39_blink": "39",
}


def normalize_size(base: Path, variant: Path) -> Path:
    """Codex edits often come back 1 px narrower than the base; pad the
    variant's right/bottom edge by edge replication so the locality check can
    run. Returns the (possibly temporary) normalized variant path."""
    from PIL import Image
    b = Image.open(base)
    v = Image.open(variant)
    if v.size == b.size:
        return variant
    dw = b.size[0] - v.size[0]
    dh = b.size[1] - v.size[1]
    if 0 <= dw <= 1 and 0 <= dh <= 1:
        padded = Image.new("RGB", b.size)
        padded.paste(v.convert("RGB"), (0, 0))
        if dw:
            padded.paste(v.convert("RGB").crop((v.size[0] - 1, 0, v.size[0], v.size[1])), (v.size[0], 0))
        if dh:
            padded.paste(v.convert("RGB").crop((0, v.size[1] - 1, b.size[0], v.size[1])), (0, v.size[1]))
        tmp = variant.with_suffix(".padtmp.png")
        padded.save(tmp)
        return tmp
    return variant


def lock(base: Path, variant: Path, out: Path) -> list[int]:
    """Run lock_region_variant.py; return the printed RECT as [x, y, w, h]."""
    variant = normalize_size(base, variant)
    result = subprocess.run(
        [sys.executable, str(LOCK_TOOL), str(base), str(variant), str(out),
         "--margin", "12", "--feather", "8.0"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    print(result.stdout.strip())
    if result.returncode != 0:
        raise RuntimeError(f"lock failed for {variant.name}: {result.stdout} {result.stderr}")
    match = re.search(r"RECT (\d+) (\d+) (\d+) (\d+)", result.stdout)
    if not match:
        raise RuntimeError(f"no RECT printed for {variant.name}")
    return [int(v) for v in match.groups()]


def main() -> None:
    MOUTH_OUT.mkdir(parents=True, exist_ok=True)
    EYE_OUT.mkdir(parents=True, exist_ok=True)
    mouth_rigs: dict[str, dict] = {}
    eye_rigs: dict[str, dict] = {}
    failures: list[str] = []

    def try_lock(tag: str, base: Path, variant: Path, out: Path) -> list[int] | None:
        if not variant.exists():
            print(f"SKIP {tag}: missing {variant}")
            failures.append(tag)
            return None
        try:
            return lock(base, variant, out)
        except RuntimeError as exc:
            print(f"FAIL {tag}: {exc}")
            failures.append(tag)
            return None

    for rig_id, (num, entry) in MOUTH_RIGS.items():
        base = KEYFRAMES / f"frame_{num}.png"
        rect_half = try_lock(f"{rig_id}/half", base, GEN / f"frame_{num}_mouth_half.png",
                             MOUTH_OUT / f"frame_{num}_half_locked_v1.png")
        rect_open = try_lock(f"{rig_id}/open", base, GEN / f"frame_{num}_mouth_open.png",
                             MOUTH_OUT / f"frame_{num}_open_locked_v1.png")
        if rect_half and rect_open:
            rect = [
                min(rect_half[0], rect_open[0]), min(rect_half[1], rect_open[1]),
                max(rect_half[0] + rect_half[2], rect_open[0] + rect_open[2]),
                max(rect_half[1] + rect_half[3], rect_open[1] + rect_open[3]),
            ]
            rect[2] -= rect[0]
            rect[3] -= rect[1]
            mouth_rigs[rig_id] = {
                "entry": entry,
                "mode": "image",
                "rect": rect,
                "variants": {
                    "closed": f"keyframes/frame_{num}.png",
                    "half": f"mouth_variants/frame_{num}_half_locked_v1.png",
                    "open": f"mouth_variants/frame_{num}_open_locked_v1.png",
                },
            }

    rig_id, num, entry = CAT_RIG
    base = KEYFRAMES / f"frame_{num}.png"
    rect_half = try_lock(f"{rig_id}/half", base, GEN / f"frame_{num}_meow_half.png",
                         MOUTH_OUT / f"frame_{num}_meow_half_locked_v1.png")
    rect_open = try_lock(f"{rig_id}/open", base, GEN / f"frame_{num}_meow_open.png",
                         MOUTH_OUT / f"frame_{num}_meow_open_locked_v1.png")
    if rect_half and rect_open:
        rect = [
            min(rect_half[0], rect_open[0]), min(rect_half[1], rect_open[1]),
            max(rect_half[0] + rect_half[2], rect_open[0] + rect_open[2]),
            max(rect_half[1] + rect_half[3], rect_open[1] + rect_open[3]),
        ]
        rect[2] -= rect[0]
        rect[3] -= rect[1]
        mouth_rigs[rig_id] = {
            "entry": entry,
            "mode": "image",
            "rect": rect,
            "variants": {
                "closed": f"keyframes/frame_{num}.png",
                "half": f"mouth_variants/frame_{num}_meow_half_locked_v1.png",
                "open": f"mouth_variants/frame_{num}_meow_open_locked_v1.png",
            },
        }

    for rig_id, num in EYE_RIGS.items():
        base = KEYFRAMES / f"frame_{num}.png"
        rect = try_lock(rig_id, base, GEN / f"frame_{num}_blink.png",
                        EYE_OUT / f"frame_{num}_eyes_closed_locked_v1.png")
        if rect:
            eye_rigs[rig_id] = {
                "rect": rect,
                "closed": f"eye_variants/frame_{num}_eyes_closed_locked_v1.png",
                "intervalSeconds": [2.8, 4.4],
            }

    (EPISODE / "config" / "mouth_rigs.json").write_text(json.dumps({
        "version": 2,
        "sourceCoordinateSpace": "native-image-pixels",
        "states": ["closed", "half", "open"],
        "notes": "Girl/boy viseme rigs plus one SFX-gated cat meow rig; rects derived from pixel diffs by lock_region_variant.py.",
        "rigs": mouth_rigs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    (EPISODE / "config" / "eye_rigs.json").write_text(json.dumps({
        "version": 1,
        "sourceCoordinateSpace": "native-image-pixels",
        "notes": "Blink rigs; deterministic scheduler (first blink 0.7-1.3 s into the shot, then every 2.8-4.4 s, lid closed 0.13 s).",
        "rigs": eye_rigs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nlocked: {len(mouth_rigs)} mouth rigs, {len(eye_rigs)} eye rigs")
    if failures:
        print("FAILED/MISSING:", ", ".join(failures))
        sys.exit(1)


if __name__ == "__main__":
    main()
