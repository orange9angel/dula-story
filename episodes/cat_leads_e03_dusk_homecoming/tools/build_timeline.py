#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e03_dusk_homecoming.

Static shots follow storyboard.md; I2V segments expand the extracted cel
PNGs under assets/i2v/<name>/f_*.png at a fixed cel rate (12fps). Re-run after
I2V clips are extracted; cel entries are (re)generated from disk state.

Mouth-rig entries follow script.story SRT indices: monologues are entries
2 / 5 / 7 / 11 / 16; cat meows are the SFX-only entries 3 / 8 / 12.
"""

import json
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
OUT = EPISODE / "config" / "keyframe_timeline.json"
CEL_FPS = 12

# River glints reuse the dappleSway mechanism as flat horizontal light bands.
# Starting from E02's calibration (mid-river x 900-1500, y 555-660); re-verify
# against frame_00/07 before render.
RIVER_GLINT = {"spots": [[900, 560, 180, 14], [1250, 625, 220, 16], [1500, 590, 160, 12]],
               "period": [2.2, 3.6], "alpha": 0.4}
DAPPLE_SLOW = {"spots": [[550, 830, 150, 30], [1000, 870, 140, 28], [1400, 800, 110, 22]],
               "period": [5.0, 7.0], "alpha": 0.3}
# Warm lamplight pool at the home entrance door (frame_13/14 region);
# coordinates to verify against frame_13 before render.
LAMP_POOL = {"spots": [[420, 700, 170, 26], [430, 480, 120, 40]],
             "period": [3.2, 4.6], "alpha": 0.28}
CLOUD_STD = {"clouds": [[1250, 150, 130, 44, 8], [500, 100, 90, 32, 6]]}

# (at, file, shot, move, extras)
STATIC_SHOTS = [
    (0.0,  "keyframes/frame_00.png", "riverbank_dusk_establishing", "push_in",
     {"dappleSway": RIVER_GLINT}),
    (3.0,  "keyframes/frame_01.png", "girl_sits_cat_rises", "push_in",
     {"mouthRig": "girl_frame01_entry2", "eyeRig": "girl_frame01_blink"}),
    (6.0,  "keyframes/frame_02.png", "cat_lookback_closeup", "push_in",
     {"mouthRig": "cat_frame02_meow", "eyeRig": "cat_frame02_blink"}),
    (8.0,  "action_inbetweens/ib_01.png", "girl_rises_inbetween", "push_in", {}),
    (8.8,  "keyframes/frame_03.png", "girl_brushes_skirt", "push_in",
     {"eyeRig": "girl_frame03_blink"}),
    (12.5, "keyframes/frame_04.png", "girl_follows_slope", "drift_left",
     {"mouthRig": "girl_frame04_entry5", "eyeRig": "girl_frame04_blink"}),
    (15.0, "keyframes/frame_05.png", "bridge_reveal_cat_waits", "push_in",
     {"cloudDrift": CLOUD_STD, "dappleSway": RIVER_GLINT}),
    (20.5, "keyframes/frame_06.png", "girl_leans_railing", "push_in",
     {"mouthRig": "girl_frame06_entry7", "eyeRig": "girl_frame06_blink"}),
    (23.0, "keyframes/frame_07.png", "river_sunset_insert", "push_in",
     {"dappleSway": RIVER_GLINT}),
    (25.5, "keyframes/frame_08.png", "cat_bridge_end_lookback", "push_in",
     {"mouthRig": "cat_frame08_meow", "eyeRig": "cat_frame08_blink"}),
    (28.0, "keyframes/frame_09.png", "lane_depth_from_bridge", "push_in",
     {"transition": "crossfade", "transitionSeconds": 0.3}),
    (30.0, "keyframes/frame_10.png", "lane_dusk_wide", "pull_out",
     {"cloudDrift": CLOUD_STD}),
    (37.5, "keyframes/frame_11.png", "girl_looks_up_cat", "push_in",
     {"mouthRig": "girl_frame11_entry11", "eyeRig": "girl_frame11_blink"}),
    (40.0, "keyframes/frame_12.png", "cat_wall_silhouette_closeup", "push_in",
     {"mouthRig": "cat_frame12_meow", "eyeRig": "cat_frame12_blink"}),
    (42.5, "keyframes/frame_13.png", "home_entrance_lamp", "drift_left",
     {"dappleSway": LAMP_POOL}),
    (45.0, "action_inbetweens/ib_02.png", "door_open_inbetween", "drift_left", {}),
    (45.7, "keyframes/frame_14.png", "girl_opens_door_looks_back", "drift_left",
     {"eyeRig": "girl_frame14_blink", "dappleSway": LAMP_POOL}),
    (47.5, "keyframes/frame_15.png", "pair_doorway_silhouette", "pull_out", {}),
    (50.0, "keyframes/frame_16.png", "girl_profile_smile_lamplight", "push_in",
     {"mouthRig": "girl_frame16_entry16", "eyeRig": "girl_frame16_blink"}),
    (53.0, "keyframes/frame_17.png", "rooftops_dusk_wide", "pull_out",
     {"dappleSway": DAPPLE_SLOW}),
    (56.0, "keyframes/frame_18.png", "dusk_clouds_insert", "tilt_up", {}),
    (58.0, "keyframes/frame_19.png", "dusk_sky_final", "tilt_up",
     {"transition": "crossfade", "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
I2V_SEGMENTS = [
    (10.5, 12.5, "cat_run_bank", "cat_run_bank"),
    (17.5, 20.5, "girl_bridge_walk", "girl_bridge_walk"),
    (32.5, 35.5, "cat_wall_walk_dusk", "cat_wall_walk_dusk"),
    (35.5, 37.5, "girl_lane_walk", "girl_lane_walk"),
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


def main() -> None:
    frames: list[dict] = []
    for at, file, shot, move, extras in STATIC_SHOTS:
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
            "Dusk healing short (sunprint flat-color style, golden-hour "
            "variant) driven by 20 keyframes plus 2 action in-betweens, with "
            "the four continuous-action shots (cat bank run, girl bridge "
            "walk, cat dusk wall walk, girl lane walk) rendered as 2-3s "
            "wan2.6-i2v standard-tier image-to-video clips extracted to 12fps "
            "cel sequences played as static full-frame cels. Hard cuts; one "
            "crossfade at the seg2 lane transition and one closing crossfade. "
            "2D crop moves, procedural flat-shape sunprint layers (cloud "
            "drift, river glint bands, door-lamp pool), energy-gated Chinese "
            "viseme cels for the girl's monologues, SFX-gated meow cels for "
            "the cat. Homecoming direction: all travel is screen-left."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries")


if __name__ == "__main__":
    main()
