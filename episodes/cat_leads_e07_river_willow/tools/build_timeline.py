#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e07_river_willow.

Static shots follow storyboard.md. E07 grammar: environment micro-motion
(willow sway, light-spot drift) as A/B keyframe variants at ~1.0s cadence;
exactly one I2V segment (trio path walk, full-body displacement only);
cloudDrift (opaque flat clouds) enabled on wide frames. F02 foreshadow beat
is a deliberately held static frame (2.9s, move: static, no crop move).

V2 omni mode replaces the ten static talking shots with OmniHuman cel
sequences. Run with --mode omni after gen_omni_shots.py.

Slot alignment discipline: every I2V/omni slot end equals the next static
frame's `at`.
"""

import json
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
OUT = EPISODE / "config" / "keyframe_timeline.json"
CEL_FPS = 12

# (at, file, shot, move, extras)
STATIC_SHOTS = [
    (0.0,  "keyframes/frame_00.png", "willow_bank_establishing", "push_in", {}),
    (3.0,  "keyframes/frame_01.png", "girl_asks_on_path", "push_in", {}),
    (5.6,  "keyframes/frame_02.png", "cat_walks_ahead_lookback", "push_in", {}),
    (6.0,  "keyframes/frame_03.png", "cat_signature_line", "push_in", {}),
    (8.6,  "keyframes/frame_04.png", "path_into_willow_shade", "push_in", {}),
    (12.5, "keyframes/frame_06.png", "oldman_reveal_wide", "push_in", {}),
    (14.0, "keyframes/frame_07.png", "girl_amazed_willows", "push_in", {}),
    (15.8, "keyframes/frame_08.png", "cat_trots_to_oldman", "push_in", {}),
    (17.8, "keyframes/frame_09.png", "oldman_hello_closeup", "push_in", {}),
    (21.7, "keyframes/frame_10.png", "group_gather_wide", "push_in", {}),
    (22.3, "keyframes/frame_11.png", "girl_greets_politely", "push_in", {}),
    (25.2, "keyframes/frame_12.png", "oldman_rod_cast", "push_in", {}),
    (25.6, "keyframes/frame_13.png", "oldman_watches_float", "push_in", {}),
    # Willow sway flipbook cycle A-mid-B-mid (0.475s cadence, in-between
    # softens the strobe; E07 V1 导演反馈两帧交替太闪)
    (31.1, "keyframes/frame_14a.png", "willow_sway_a", "static", {}),
    (31.575, "keyframes/frame_14ab_mid.png", "willow_sway_mid1", "static", {}),
    (32.05, "keyframes/frame_14b.png", "willow_sway_b", "static", {}),
    (32.525, "keyframes/frame_14ab_mid.png", "willow_sway_mid2", "static", {}),
    (33.0, "keyframes/frame_15.png", "boy_curious_about_rod", "push_in", {}),
    (35.9, "keyframes/frame_16.png", "oldman_proud_of_rod", "push_in", {}),
    (40.7, "keyframes/frame_18.png", "oldman_mystery_low_voice", "push_in", {}),
    (45.0, "keyframes/frame_19.png", "kids_exchange_glance", "push_in", {}),
    (46.2, "keyframes/frame_20.png", "oldman_self_deprecating_laugh", "push_in", {}),
    # F02 foreshadow: deliberately held, no crop move
    (50.8, "keyframes/frame_21.png", "cat_stares_back_mountain", "static", {}),
    (53.2, "keyframes/frame_22.png", "girl_notices_cat", "push_in", {}),
    (54.4, "keyframes/frame_23.png", "cat_deflects", "push_in", {}),
    # A/B light-spot drift finale (1.2s cadence)
    (56.4, "keyframes/frame_24a.png", "finale_drift_a", "pull_out", {}),
    (57.6, "keyframes/frame_24b.png", "finale_drift_b", "pull_out",
     {"transition": "crossfade", "transitionSeconds": 0.25}),
    (58.8, "keyframes/frame_24a.png", "finale_fade", "static",
     {"transition": "crossfade", "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
I2V_SEGMENTS = [
    (10.0, 12.5, "trio_path_walk_day", "trio_path_walk_day"),
]

# OmniHuman talking shots (start, end, cel dir under assets/omni/, prefix).
OMNI_SHOTS = [
    (3.0,  5.6,  "shot01_girl_path", "omni_girl_path"),
    (6.0,  8.6,  "shot02_cat_signature", "omni_cat_signature"),
    (17.8, 21.7, "shot03_oldman_hello", "omni_oldman_hello"),
    (22.3, 25.2, "shot04_girl_greet", "omni_girl_greet"),
    (25.6, 31.1, "shot05_oldman_river", "omni_oldman_river"),
    (33.0, 35.9, "shot06_boy_rod", "omni_boy_rod"),
    (35.9, 39.8, "shot07_oldman_proud", "omni_oldman_proud"),
    (40.7, 45.0, "shot08_oldman_mystery", "omni_oldman_mystery"),
    (46.2, 50.8, "shot09_oldman_laugh", "omni_oldman_laugh"),
    (54.4, 56.4, "shot10_cat_deflect", "omni_cat_deflect"),
]


def i2v_entries(start: float, end: float, cel_dir: str, prefix: str) -> list[dict]:
    directory = EPISODE / "assets" / "i2v" / cel_dir
    cels = sorted(directory.glob("f_*.png"))
    if not cels:
        raise SystemExit(f"missing cels: {directory} (extract I2V clips first)")
    span = (end - start) / len(cels)
    entries = []
    for index, cel in enumerate(cels):
        entries.append({
            "at": round(start + index * span, 4),
            "file": f"i2v/{cel_dir}/{cel.name}",
            "shot": f"{prefix}_{index:02d}",
            "move": "static",
            "transition": "cut",
        })
    return entries


def omni_cel_entries(start: float, end: float, cel_dir: str, prefix: str):
    """Cel entries for an OmniHuman talking shot; None when the cels are absent."""
    directory = EPISODE / "assets" / "omni" / cel_dir
    cels = sorted(directory.glob("f_*.png"))
    if not cels:
        return None
    span = (end - start) / len(cels)
    return [{
        "at": round(start + index * span, 4),
        "file": f"omni/{cel_dir}/{cel.name}",
        "shot": f"{prefix}_{index:02d}",
        "move": "static",
        "transition": "cut",
    } for index, cel in enumerate(cels)]


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["cel", "omni"], default="cel",
                        help="cel: static talking shots; omni: OmniHuman video "
                             "cels replace them when present")
    args = parser.parse_args()
    omni_start = ({start: (end, cel_dir, prefix) for start, end, cel_dir, prefix in OMNI_SHOTS}
                  if args.mode == "omni" else {})
    frames: list[dict] = []
    for at, file, shot, move, extras in STATIC_SHOTS:
        if at in omni_start:
            end, cel_dir, prefix = omni_start[at]
            cels = omni_cel_entries(at, end, cel_dir, prefix)
            if cels is not None:
                frames.extend(cels)
                continue
        entry = {"at": at, "file": file, "shot": shot, "move": move, **extras}
        entry.setdefault("transition", "cut")
        frames.append(entry)
    for start, end, cel_dir, prefix in I2V_SEGMENTS:
        frames.extend(i2v_entries(start, end, cel_dir, prefix))
    frames.sort(key=lambda entry: entry["at"])

    timeline = {
        "version": 3,
        "duration": 60.0,
        "description": (
            "Afternoon willow-bank healing short (sunprint flat-color "
            "daytime) driven by 16 keyframes plus 4 environment A/B variants "
            "(willow sway, light-spot drift), ten OmniHuman 1.5 talking "
            "shots, and exactly one Seedance 2.0 FULL 1080p I2V segment "
            "(trio path walk, full-body displacement only). New character "
            "OldMan (fisherman) debuts. Foreshadow beats: F03 (cyan light "
            "line, dialogue) and F02 (cat staring at the back mountain, held "
            "static frame). No programmatic overlay layers (cloudDrift "
            "ellipses read as stickers against baked clouds). Hard cuts; "
            "one closing crossfade."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries")


if __name__ == "__main__":
    main()
