#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e05_morning_sketch.

Static shots follow storyboard.md; I2V segments expand the extracted cel
PNGs under assets/i2v/<name>/f_*.png at a fixed cel rate (12fps). Re-run after
I2V clips are extracted; cel entries are (re)generated from disk state.

V2 omni mode replaces the eight static talking shots with OmniHuman cel
sequences (baked mouth motion). Run with --mode omni after gen_omni_shots.py;
missing omni cel dirs fall back to the static cel entry.

Morning layers: dewSparkle (flat white four-point dew sparkles on grass)
and birdsFlyby (flat V-shape bird flock crossing during the finale).
Masters/keyframes bake their own sparse dew sparkles; the layer only adds
gentle twinkle accents on the two riverbank frames.

Slot alignment discipline (E04 V2.3): every I2V/omni slot end equals the
next static frame's `at`.
"""

import json
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
OUT = EPISODE / "config" / "keyframe_timeline.json"
CEL_FPS = 12

# Dew sparkles for riverbank frames (lower grass region, source-image coords).
DEW_BANK = {"stars": [[300, 690, 2, 0.5], [520, 730, 2.5, 0.7], [760, 680, 2, 0.9],
                      [1050, 720, 2.5, 0.6], [1300, 690, 2, 0.8], [1550, 740, 2, 0.55],
                      [880, 770, 2, 0.75], [1180, 780, 2, 0.65]],
            "alpha": 0.6}

# Bird flock crossing during the finale wide shot (startAt is absolute
# timeline seconds; the flock crosses left->right within [startAt, +duration]).
BIRDS_FINALE = {"count": 5, "y": 0.18, "startAt": 53.5, "duration": 4.0}

# (at, file, shot, move, extras)
STATIC_SHOTS = [
    (0.0,  "keyframes/frame_00.png", "lane_home_morning_establishing", "push_in", {}),
    (3.0,  "keyframes/frame_01.png", "girl_peeks_door_surprise", "push_in", {}),
    (6.2,  "keyframes/frame_02.png", "cat_doorstep_look_up", "push_in", {}),
    (7.0,  "keyframes/frame_03.png", "cat_doorstep_close_calm", "push_in", {}),
    (9.4,  "keyframes/frame_04.png", "girl_closes_door_morning", "push_in", {}),
    (13.5, "keyframes/frame_06.png", "girl_hurries_lane", "drift_right", {}),
    (16.0, "keyframes/frame_07.png", "bridge_morning_reveal_cat_waits", "push_in", {}),
    (21.5, "keyframes/frame_09.png", "girl_breeze_bridge_end", "push_in", {}),
    (24.0, "keyframes/frame_10.png", "riverbank_morning_boy_reveal", "push_in",
     {"dewSparkle": DEW_BANK}),
    (27.0, "keyframes/frame_11.png", "girl_spots_boy_closeup", "push_in", {}),
    (31.9, "keyframes/frame_13.png", "boy_turns_smile_reveal", "push_in", {}),
    (33.8, "keyframes/frame_14.png", "boy_gentle_looks_down", "push_in", {}),
    (36.2, "keyframes/frame_15.png", "boy_frozen_surprised", "push_in", {}),
    (36.6, "keyframes/frame_16.png", "boy_nervous_scratch", "push_in", {}),
    (39.6, "keyframes/frame_17.png", "two_shot_shows_sketchbook", "push_in", {}),
    (42.0, "keyframes/frame_18.png", "sketchbook_cat_studies", "push_in", {}),
    (44.3, "keyframes/frame_19.png", "boy_bright_relaxed", "push_in", {}),
    (47.3, "keyframes/frame_20.png", "girl_looks_down_at_cat", "push_in", {}),
    (47.6, "keyframes/frame_21.png", "girl_gentle_closeup", "push_in", {}),
    (50.6, "keyframes/frame_23.png", "cat_proud_closeup", "push_in", {}),
    (53.3, "keyframes/frame_24.png", "trio_steps_finale_wide", "pull_out",
     {"dewSparkle": DEW_BANK, "birdsFlyby": BIRDS_FINALE}),
    (58.5, "keyframes/frame_25.png", "morning_sky_final", "tilt_up",
     {"transition": "crossfade", "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
I2V_SEGMENTS = [
    (11.5, 13.5, "cat_lane_lead_morning", "cat_lane_lead_morning"),
    (18.5, 21.5, "girl_bridge_walk_morning", "girl_bridge_walk_morning"),
    (30.1, 31.9, "cat_run_bank_morning", "cat_run_bank_morning"),
]

# OmniHuman talking shots: when assets/omni/<shot>/ holds extracted cels,
# the static keyframe entry at the same start time is REPLACED by the cel
# sequence. Each slot starts 0.2s before its line (front-padded still cels).
# (start, end, cel dir under assets/omni/, shot prefix)
OMNI_SHOTS = [
    (3.0,  6.2,  "shot01_girl_door", "omni_girl_door"),
    (7.0,  9.4,  "shot02_cat_doorstep", "omni_cat_doorstep"),
    (27.0, 30.1, "shot03_girl_spots", "omni_girl_spots"),
    (33.8, 36.2, "shot04_boy_gentle", "omni_boy_gentle"),
    (36.6, 39.6, "shot05_boy_nervous", "omni_boy_nervous"),
    (44.3, 47.3, "shot06_boy_bright", "omni_boy_bright"),
    (47.6, 50.8, "shot07_girl_gentle", "omni_girl_gentle"),
    (50.8, 53.3, "shot08_cat_proud", "omni_cat_proud"),
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
            "Summer-morning healing short (sunprint flat-color morning "
            "variant) driven by 23 keyframes, with three continuous-action "
            "shots (cat lane lead, girl bridge walk, cat bank run) rendered "
            "as Seedance 2.0 FULL 1080p image-to-video clips extracted to "
            "12fps cel sequences, and eight talking shots rendered as "
            "OmniHuman 1.5 1080p lip-synced video cels. Hard cuts; one "
            "closing crossfade. 2D crop moves, procedural flat-shape morning "
            "layers (dew sparkle twinkle, bird flock flyby). Travel "
            "direction: all travel is screen-right, into the morning sun."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries")


if __name__ == "__main__":
    main()
