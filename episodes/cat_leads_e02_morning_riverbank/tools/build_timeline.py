#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e02_morning_riverbank.

Static shots follow storyboard.md; I2V segments expand the extracted cel
PNGs under assets/i2v/<name>/f_*.png at a fixed cel rate (12fps). Re-run after
I2V clips are extracted; cel entries are (re)generated from disk state.
"""

import json
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
OUT = EPISODE / "config" / "keyframe_timeline.json"
CEL_FPS = 12

DAPPLE_STD = {"spots": [[850, 800, 150, 30], [1150, 700, 110, 24]],
              "period": [2.8, 4.6], "alpha": 0.3}
DAPPLE_SLOW = {"spots": [[550, 830, 150, 30], [1000, 870, 140, 28], [1400, 800, 110, 22]],
               "period": [5.0, 7.0], "alpha": 0.3}
CLOUD_STD = {"clouds": [[1250, 150, 130, 44, 8], [500, 100, 90, 32, 6]]}
# River glints reuse the dappleSway mechanism as flat horizontal light bands.
# Calibrated against frame_08/09/12: mid-river area only (native y 555-660,
# x 900-1500), clear of the grass bank and of any face.
RIVER_GLINT = {"spots": [[900, 560, 180, 14], [1250, 625, 220, 16], [1500, 590, 160, 12]],
               "period": [2.2, 3.6], "alpha": 0.4}

# (at, file, shot, move, extras)
STATIC_SHOTS = [
    (0.0,  "keyframes/frame_00.png", "room_morning_establishing", "push_in",
     {"dappleSway": DAPPLE_STD}),
    (3.0,  "keyframes/frame_01.png", "girl_bed_sits_up", "push_in",
     {"mouthRig": "girl_frame01_entry2", "eyeRig": "girl_frame01_blink"}),
    (5.8,  "keyframes/frame_02.png", "cat_windowsill_lookback", "push_in",
     {"mouthRig": "cat_frame02_meow", "eyeRig": "cat_frame02_blink"}),
    (7.5,  "keyframes/frame_03.png", "girl_opens_door", "drift_right",
     {"mouthRig": "girl_frame03_entry4", "eyeRig": "girl_frame03_blink"}),
    (9.5,  "action_inbetweens/ib_01.png", "shoes_on_inbetween", "drift_right", {}),
    (17.0, "keyframes/frame_05.png", "cat_steps_lookback", "push_in",
     {"mouthRig": "cat_frame05_meow", "eyeRig": "cat_frame05_blink"}),
    (22.0, "keyframes/frame_06.png", "girl_climbs_steps", "push_in",
     {"mouthRig": "girl_frame06_entry8", "eyeRig": "girl_frame06_blink"}),
    (24.5, "keyframes/frame_07.png", "steps_wide_cat_top", "push_in",
     {"cloudDrift": CLOUD_STD}),
    (27.0, "keyframes/frame_08.png", "riverbank_pov_reveal", "push_in_strong",
     {"dappleSway": RIVER_GLINT}),
    (30.0, "keyframes/frame_09.png", "riverbank_wide", "pull_out",
     {"cloudDrift": CLOUD_STD, "dappleSway": RIVER_GLINT,
      "transition": "crossfade", "transitionSeconds": 0.3}),
    (36.0, "keyframes/frame_10.png", "cat_trots_grass", "drift_right",
     {"eyeRig": "cat_frame10_blink"}),
    (38.5, "keyframes/frame_11.png", "girl_gazes_river", "push_in",
     {"mouthRig": "girl_frame11_entry11", "eyeRig": "girl_frame11_blink"}),
    (41.0, "keyframes/frame_12.png", "river_surface_closeup", "push_in",
     {"dappleSway": RIVER_GLINT}),
    (43.5, "keyframes/frame_13.png", "cat_on_parapet", "push_in",
     {"mouthRig": "cat_frame13_meow", "eyeRig": "cat_frame13_blink"}),
    (46.0, "action_inbetweens/ib_02.png", "sit_mid_inbetween", "drift_left", {}),
    (46.3, "keyframes/frame_14.png", "girl_sits_beside_cat", "drift_left",
     {"eyeRig": "girl_frame14_blink"}),
    (48.5, "keyframes/frame_15.png", "pair_backs_river", "pull_out", {}),
    (51.0, "keyframes/frame_16.png", "girl_sideprofile_smile", "push_in",
     {"mouthRig": "girl_frame16_entry14", "eyeRig": "girl_frame16_blink"}),
    (54.5, "keyframes/frame_17.png", "riverbank_warm_wide", "pull_out",
     {"dappleSway": DAPPLE_SLOW}),
    (57.0, "keyframes/frame_18.png", "river_meets_sky", "tilt_up", {}),
    (58.5, "keyframes/frame_19.png", "morning_sky_clouds", "tilt_up",
     {"cloudDrift": CLOUD_STD, "transition": "crossfade",
      "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
I2V_SEGMENTS = [
    (11.0, 14.0, "cat_wall_walk", "cat_wall_walk"),
    (14.0, 17.0, "girl_street_walk", "girl_street_walk"),
    (19.0, 22.0, "cat_hop_steps", "cat_hop_steps"),
    (33.0, 36.0, "girl_grass_walk", "girl_grass_walk"),
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
            "Morning healing short (sunprint flat-color style, early-morning "
            "light) driven by 20 keyframes plus 2 action in-betweens, with the "
            "four continuous-action shots (cat wall walk, girl street walk, cat "
            "step hops, girl grass walk) rendered as 3s wan2.6-i2v-flash "
            "image-to-video clips extracted to 12fps cel sequences played as "
            "static full-frame cels. Hard cuts; one crossfade at the seg2 "
            "riverbank reveal and one closing crossfade. 2D crop moves, "
            "procedural flat-shape sunprint layers (cloud drift, dappled-light "
            "sway, river glint bands), energy-gated Chinese viseme cels for "
            "the girl's monologues, SFX-gated meow cels for the cat."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries "
          f"({sum(len(i2v_entries(s, e, d, p)) for s, e, d, p in I2V_SEGMENTS)} I2V cels)")


if __name__ == "__main__":
    main()
