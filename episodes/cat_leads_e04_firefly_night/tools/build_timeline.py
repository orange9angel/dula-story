#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e04_firefly_night.

Static shots follow storyboard.md; I2V segments expand the extracted cel
PNGs under assets/i2v/<name>/f_*.png at a fixed cel rate (12fps). Re-run after
I2V clips are extracted; cel entries are (re)generated from disk state.

Mouth-rig entries follow script.story SRT indices: girl monologues are entries
3 / 8 / 11 / 16 / 20; cat lines (meow SFX immediately followed by speech) are
Mouth-rig entries follow script.story SRT indices (girl: 3/7/10/14/17,
cat: 4/11/15); V2 omni mode replaces those static talking shots with
OmniHuman cel sequences, so rigs are only exercised in cel mode.

Night layers: starTwinkle (flat star dots) and fireflies (programmatic warm
yellow-green dots — masters/keyframes stay clean of baked dots). The E03-era
dappleSway overlays (lamp pool / river glint band) were dropped in V2.2:
the night plates bake their own lighting, and the carried-over E03
coordinates painted visibly fake ellipses on the door and bridge.
"""

import json
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
OUT = EPISODE / "config" / "keyframe_timeline.json"
CEL_FPS = 12

# Sparse flat star dots for night-sky frames (upper sky region).
STARS_STD = {"stars": [[220, 90, 3, 0.6], [520, 150, 2.5, 0.9], [830, 70, 3, 0.5],
                       [1150, 130, 2.5, 1.1], [1420, 90, 3, 0.7], [1560, 190, 2, 0.8],
                       [350, 210, 2, 1.0], [960, 180, 2, 0.6]],
             "alpha": 0.7}
STARS_WIDE = {"stars": [[180, 80, 3, 0.6], [430, 140, 2.5, 0.9], [700, 60, 3, 0.5],
                        [980, 120, 2.5, 1.1], [1240, 80, 3, 0.7], [1500, 170, 2, 0.8],
                        [300, 240, 2, 1.0], [860, 220, 2, 0.6], [1180, 260, 2.5, 0.75],
                        [1450, 300, 2, 0.95], [620, 300, 2, 0.85], [120, 320, 2, 0.7]],
              "alpha": 0.8}
# Firefly fields (programmatic; region = source-image rect over the grass).
FF_HINT = {"region": [700, 480, 700, 260], "count": 3, "seed": 20260829, "size": 4,
           "alpha": 0.7, "drift": 22, "rise": 0, "period": [3.5, 6.0]}
FF_MEADOW = {"region": [400, 450, 1000, 380], "count": 18, "seed": 20260829, "size": 5,
             "alpha": 0.85, "drift": 30, "rise": 0, "period": [3.0, 6.0]}
FF_DENSE = {"region": [300, 400, 1100, 450], "count": 30, "seed": 20260830, "size": 5,
            "alpha": 0.9, "drift": 34, "rise": 0, "period": [2.5, 5.0]}
FF_AROUND_CAT = {"region": [500, 350, 700, 420], "count": 12, "seed": 20260831, "size": 5,
                 "alpha": 0.9, "drift": 26, "rise": 0, "period": [3.0, 5.5]}
FF_SEA = {"region": [250, 380, 1200, 480], "count": 40, "seed": 20260832, "size": 5,
          "alpha": 0.9, "drift": 36, "rise": 0, "period": [2.5, 5.5]}
FF_RISE = {"region": [200, 100, 1300, 700], "count": 26, "seed": 20260833, "size": 5,
           "alpha": 0.85, "drift": 24, "rise": 18, "period": [3.0, 6.0]}

# (at, file, shot, move, extras)
STATIC_SHOTS = [
    (0.0,  "keyframes/frame_00.png", "lane_home_night_establishing", "push_in",
     {"starTwinkle": STARS_STD}),
    (3.0,  "keyframes/frame_01.png", "girl_peeks_door_cat_waits", "push_in",
     {"mouthRig": "girl_frame01_entry3", "eyeRig": "girl_frame01_blink"}),
    (6.0,  "keyframes/frame_02.png", "cat_wall_lookback_night", "push_in",
     {"mouthRig": "cat_frame02_entry4", "eyeRig": "cat_frame02_blink"}),
    (9.5,  "action_inbetweens/ib_01.png", "girl_closing_door_inbetween", "push_in", {}),
    (10.3, "keyframes/frame_03.png", "girl_closes_door", "push_in",
     {"eyeRig": "girl_frame03_blink"}),
    (13.5, "keyframes/frame_04.png", "girl_follows_lane", "drift_right",
     {"mouthRig": "girl_frame04_entry7", "eyeRig": "girl_frame04_blink"}),
    (16.0, "keyframes/frame_05.png", "bridge_night_reveal_cat_waits", "push_in",
     {"starTwinkle": STARS_STD}),
    (21.5, "keyframes/frame_06.png", "girl_leans_railing_night", "push_in",
     {"mouthRig": "girl_frame06_entry10", "eyeRig": "girl_frame06_blink"}),
    (24.0, "keyframes/frame_07.png", "river_moonlight_insert", "push_in",
     {"starTwinkle": STARS_STD}),
    (26.5, "keyframes/frame_08.png", "cat_bridge_end_lookback", "push_in",
     {"mouthRig": "cat_frame08_entry11", "eyeRig": "cat_frame08_blink"}),
    (29.5, "keyframes/frame_09.png", "riverbank_from_bridge_firefly_hint", "push_in",
     {"transition": "crossfade", "transitionSeconds": 0.3,
      "fireflies": FF_HINT, "starTwinkle": STARS_STD}),
    (31.5, "keyframes/frame_10.png", "riverbank_night_wide", "pull_out",
     {"starTwinkle": STARS_WIDE, "fireflies": FF_MEADOW}),
    (39.0, "keyframes/frame_11.png", "girl_amazed_fireflies_rise", "push_in",
     {"mouthRig": "girl_frame11_entry14", "eyeRig": "girl_frame11_blink",
      "fireflies": FF_DENSE}),
    (41.5, "keyframes/frame_12.png", "cat_in_fireflies_closeup", "push_in",
     {"mouthRig": "cat_frame12_entry15", "eyeRig": "cat_frame12_blink",
      "fireflies": FF_AROUND_CAT}),
    (45.0, "action_inbetweens/ib_02.png", "girl_crouch_inbetween", "drift_right",
     {"fireflies": FF_MEADOW}),
    (45.7, "keyframes/frame_13.png", "girl_crouches_reaching", "drift_right",
     {"eyeRig": "girl_frame13_blink", "fireflies": FF_DENSE}),
    (47.5, "keyframes/frame_14.png", "girl_looks_back_smile", "drift_right",
     {"eyeRig": "girl_frame14_blink", "fireflies": FF_MEADOW}),
    (49.5, "keyframes/frame_15.png", "pair_slope_firefly_sea", "pull_out",
     {"fireflies": FF_SEA, "starTwinkle": STARS_WIDE}),
    (52.0, "keyframes/frame_16.png", "girl_profile_smile_fireflylight", "push_in",
     {"mouthRig": "girl_frame16_entry17", "eyeRig": "girl_frame16_blink",
      "fireflies": FF_AROUND_CAT}),
    (55.0, "keyframes/frame_17.png", "slope_starry_sky_wide", "pull_out",
     {"starTwinkle": STARS_WIDE, "fireflies": FF_MEADOW}),
    (57.0, "keyframes/frame_18.png", "fireflies_rise_to_sky", "tilt_up",
     {"starTwinkle": STARS_WIDE, "fireflies": FF_RISE}),
    (58.5, "keyframes/frame_19.png", "starry_sky_final", "tilt_up",
     {"starTwinkle": STARS_WIDE, "transition": "crossfade", "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
I2V_SEGMENTS = [
    (11.5, 13.5, "cat_wall_walk_night", "cat_wall_walk_night"),
    (18.5, 21.5, "girl_bridge_walk_night", "girl_bridge_walk_night"),
    (34.0, 37.0, "cat_run_bank_night", "cat_run_bank_night"),
    (37.0, 39.0, "girl_bank_walk_night", "girl_bank_walk_night"),
]

# V2: OmniHuman lip-synced talking shots. When assets/omni/<shot>/ holds
# extracted cels (produced by tools/gen_omni_shots.py), the static keyframe
# entry at the same start time is REPLACED by the cel sequence (baked mouth
# motion; rigs dropped). If the dir is missing, the static cel-with-rig entry
# stays — V1.x behaviour.
# (start, end, cel dir under assets/omni/, shot prefix)
OMNI_SHOTS = [
    (3.0, 6.0, "shot01_girl_door", "omni_girl_door"),
    (6.0, 9.5, "shot02_cat_wall", "omni_cat_wall"),
    (13.5, 16.0, "shot05_girl_lane", "omni_girl_lane"),
    (21.5, 24.0, "shot08_girl_bridge", "omni_girl_bridge"),
    (26.5, 29.5, "shot10_cat_bridge_end", "omni_cat_bridge_end"),
    (39.0, 41.5, "shot15_girl_amazed", "omni_girl_amazed"),
    (41.5, 45.0, "shot16_cat_fireflies", "omni_cat_fireflies"),
    (52.0, 55.0, "shot20_girl_closeup", "omni_girl_closeup"),
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
                        help="cel: rig-driven static talking shots (V1.x); "
                             "omni: OmniHuman video cels replace them when present (V2)")
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
            "Summer-night healing short (sunprint flat-color night variant) "
            "driven by 20 keyframes plus 2 action in-betweens, with the four "
            "continuous-action shots (cat night wall walk, girl night bridge "
            "walk, cat night bank run, girl night bank walk) rendered as "
            "seedance-2.0-mini image-to-video clips extracted to 12fps cel "
            "sequences played as static full-frame cels. Hard cuts; one "
            "crossfade at the seg2 riverbank transition and one closing "
            "crossfade. 2D crop moves, procedural flat-shape night layers "
            "(star twinkle, moonlight river band, firefly drift, door-lamp "
            "pool), energy-gated Chinese viseme cels for the girl's "
            "monologues and the talking cat's lines, SFX-gated meow cels. "
            "Night outing direction: all travel is screen-right."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries")


if __name__ == "__main__":
    main()
