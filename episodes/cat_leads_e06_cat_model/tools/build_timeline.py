#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e06_cat_model.

Static shots follow storyboard.md. New E06 grammar: micro-motion beats
(cat ears, sleeping breath) are A/B keyframe pose variants alternating at
fixed cadence (0.6s / 0.9s) with move: static -- the hand-drawn "limited
animation" feel, replacing I2V for anything the audience would scrutinize.
The single I2V segment (cat hop+run) is full-body displacement only.

V2 omni mode replaces the ten static talking shots with OmniHuman cel
sequences. Run with --mode omni after gen_omni_shots.py; missing omni cel
dirs fall back to the static cel entry.

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
    (0.0,  "keyframes/frame_00.png", "riverbank_day_establishing", "push_in", {}),
    (3.0,  "keyframes/frame_01.png", "boy_briefs_portrait", "push_in", {}),
    (6.1,  "keyframes/frame_02.png", "cat_poses_formally", "push_in", {}),
    (6.4,  "keyframes/frame_03.png", "cat_proud_closeup", "push_in", {}),
    (8.2,  "keyframes/frame_04.png", "girl_coaxes_cat", "push_in", {}),
    # A/B ear micro-motion (0.6s cadence, limited-animation grammar)
    (10.6, "keyframes/frame_05a.png", "cat_ears_perked_a", "static", {}),
    (11.2, "keyframes/frame_05b.png", "cat_ears_tracking_b", "static", {}),
    (11.8, "keyframes/frame_05a.png", "cat_ears_perked_a2", "static", {}),
    (12.4, "keyframes/frame_05b.png", "cat_ears_tracking_b2", "static", {}),
    (13.0, "keyframes/frame_06.png", "butterfly_insert", "push_in", {}),
    (14.0, "keyframes/frame_07.png", "girl_tracks_butterfly", "push_in", {}),
    (19.4, "keyframes/frame_09.png", "girl_rises_looking", "push_in", {}),
    (19.8, "keyframes/frame_10.png", "girl_exclaims", "push_in", {}),
    (21.8, "keyframes/frame_11.png", "boy_resigned_smile", "push_in", {}),
    (24.0, "keyframes/frame_12.png", "chase_pounce", "push_in", {}),
    (25.8, "keyframes/frame_13.png", "chase_tumble", "push_in", {}),
    (27.4, "keyframes/frame_14.png", "girl_content_shade", "push_in", {}),
    (29.9, "keyframes/frame_15.png", "boy_content_shade", "push_in", {}),
    (32.3, "keyframes/frame_16.png", "cat_returns_to_shade", "drift_left", {}),
    # A/B breathing (0.9s cadence)
    (34.3, "keyframes/frame_17a.png", "cat_sleep_exhale_a", "static", {}),
    (35.2, "keyframes/frame_17b.png", "cat_sleep_inhale_b", "static", {}),
    (36.1, "keyframes/frame_17a.png", "cat_sleep_exhale_a2", "static", {}),
    (37.0, "keyframes/frame_17b.png", "cat_sleep_inhale_b2", "static", {}),
    (37.9, "keyframes/frame_18.png", "boy_final_strokes", "push_in", {}),
    (40.0, "keyframes/frame_19.png", "sketchbook_reveal_sleeping_cat", "push_in", {}),
    (42.5, "keyframes/frame_20.png", "girl_moved_closeup", "push_in", {}),
    (45.5, "keyframes/frame_21.png", "cat_dream_talk", "push_in", {}),
    (48.0, "keyframes/frame_22.png", "shade_trio_finale", "pull_out", {}),
    (58.5, "keyframes/frame_22.png", "finale_fade", "static",
     {"transition": "crossfade", "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
# Exactly one: full-body displacement only (E05 grammar boundary).
I2V_SEGMENTS = [
    (17.4, 19.4, "cat_hop_run_day", "cat_hop_run_day"),
]

# OmniHuman talking shots (start, end, cel dir under assets/omni/, prefix).
OMNI_SHOTS = [
    (3.0,  6.1,  "shot01_boy_brief", "omni_boy_brief"),
    (6.4,  8.2,  "shot02_cat_proud", "omni_cat_proud"),
    (8.2,  10.6, "shot03_girl_coax", "omni_girl_coax"),
    (14.0, 17.2, "shot04_girl_butterfly", "omni_girl_butterfly"),
    (19.8, 21.8, "shot05_girl_exclaim", "omni_girl_exclaim"),
    (21.8, 24.0, "shot06_boy_resigned", "omni_boy_resigned"),
    (27.4, 29.9, "shot07_girl_content", "omni_girl_content"),
    (29.9, 32.3, "shot08_boy_content", "omni_boy_content"),
    (42.5, 45.5, "shot09_girl_moved", "omni_girl_moved"),
    (45.5, 48.0, "shot10_cat_dream", "omni_cat_dream"),
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
            "Late-morning healing short (sunprint flat-color daytime) driven "
            "by 14 keyframes plus 4 A/B micro-motion variants (cat ears at "
            "0.6s cadence, sleeping breath at 0.9s cadence), ten OmniHuman "
            "1.5 talking shots, and exactly one Seedance 2.0 FULL 1080p I2V "
            "segment (cat hop+run, full-body displacement only). Bright-scene "
            "density rules: foreground framing, three depth layers, dappled "
            "shade spots baked into keyframes (no translucent overlay layers). "
            "Hard cuts; one closing crossfade."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries")


if __name__ == "__main__":
    main()
