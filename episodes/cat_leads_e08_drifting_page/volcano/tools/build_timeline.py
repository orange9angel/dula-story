#!/usr/bin/env python3
"""Build config/keyframe_timeline.json for cat_leads_e08_drifting_page.

Static shots follow storyboard.md. E08 grammar: five no-character I2V
environment segments (env_open / wind_gust / page_lift / page_drift /
env_close, all in I2V's legal zone); environment micro-motion as A/B
keyframe variants with the A-mid-B-mid three-cel cycle at 0.475s cadence
(E07 willow-sway discipline: the in-between softens the strobe); F01
foreshadow beat (sketchbook corner symbol) is a deliberately held static
frame (3.0s, move: static, no crop move, nobody mentions it).

Omni mode (default) replaces the eight static talking shots with OmniHuman
cel sequences. Run gen_omni_shots.py first; per-shot fallback to the static
omni base keyframe when cels are absent.

Slot alignment discipline: every I2V/omni slot end equals the next static
frame's `at`.
"""

import json
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
OUT = EPISODE / "config" / "keyframe_timeline.json"
CEL_FPS = 12


def ab_cycle(start: float, end: float, a: str, mid: str, b: str,
             prefix: str) -> list[tuple]:
    """A-mid-B-mid flipbook entries at 0.475s cadence filling [start, end)."""
    files = [a, mid, b, mid]
    entries = []
    t = start
    index = 0
    while t < end - 1e-6:
        entries.append((round(t, 4), files[index % 4],
                        f"{prefix}_{index:02d}", "static", {}))
        t += 0.475
        index += 1
    return entries


# (at, file, shot, move, extras)
STATIC_SHOTS = [
    # 0.0-3.5 occupied by I2V env_open (living establishing shot)
    (3.5,  "keyframes/frame_01.png", "wide_reveal_trio", "push_in", {}),
    # 5.5-8.0 omni shot01 (fallback base below), 8.0-11.0 omni shot02
    (5.5,  "keyframes/omni_shot01.png", "girl_curious_fallback", "static", {}),
    (8.0,  "keyframes/omni_shot02.png", "boy_calm_fallback", "static", {}),
    # 11.0-16.0 A/B tree-sway + light-spot drift (安定段 ma)
    *ab_cycle(11.0, 16.0, "keyframes/frame_04a.png",
              "keyframes/frame_04ab_mid.png", "keyframes/frame_04b.png",
              "tree_sway"),
    # 16.0-18.5 I2V wind_gust, 18.5-21.0 I2V page_lift
    # 21.0-23.5 omni shot03
    (21.0, "keyframes/omni_shot03.png", "girl_alarmed_fallback", "static", {}),
    (23.5, "keyframes/frame_08.png", "boy_gentle_stop", "push_in", {}),
    # 26.0-30.0 omni shot04, 30.0-34.5 I2V page_drift
    (26.0, "keyframes/omni_shot04.png", "boy_letgo_fallback", "static", {}),
    # 34.5-37.0 omni shot05, 37.0-40.5 omni shot06
    (34.5, "keyframes/omni_shot05.png", "girl_regret_fallback", "static", {}),
    (37.0, "keyframes/omni_shot06.png", "boy_smile_fallback", "static", {}),
    # 40.5-45.0 A/B redrawing light/shadow drift (时间流逝)
    *ab_cycle(40.5, 45.0, "keyframes/frame_13a.png",
              "keyframes/frame_13ab_mid.png", "keyframes/frame_13b.png",
              "redraw_drift"),
    # 45.0-48.5 omni shot07, 48.5-51.5 omni shot08
    (45.0, "keyframes/omni_shot07.png", "boy_offer_fallback", "static", {}),
    (48.5, "keyframes/omni_shot08.png", "girl_accept_fallback", "static", {}),
    # F01 foreshadow: held static, no crop move (好看的奇异, not eerie)
    (51.5, "keyframes/frame_16.png", "f01_symbol_on_page", "static", {}),
    # 54.5-57.5 I2V env_close
    (57.5, "keyframes/frame_18.png", "finale_pull_out", "pull_out",
     {"transition": "crossfade", "transitionSeconds": 0.25}),
]

# I2V segments: (start, end, cel dir under assets/i2v/, shot prefix)
I2V_SEGMENTS = [
    (0.0,  3.5,  "env_open", "env_open"),
    (16.0, 18.5, "wind_gust", "wind_gust"),
    (18.5, 21.0, "page_lift", "page_lift"),
    (30.0, 34.5, "page_drift", "page_drift"),
    (54.5, 57.5, "env_close", "env_close"),
]

# OmniHuman talking shots (start, end, cel dir under assets/omni/, prefix).
OMNI_SHOTS = [
    (5.5,  8.0,  "shot01_girl_curious", "omni_girl_curious"),
    (8.0,  11.0, "shot02_boy_calm", "omni_boy_calm"),
    (21.0, 23.5, "shot03_girl_alarmed", "omni_girl_alarmed"),
    (26.0, 30.0, "shot04_boy_letgo", "omni_boy_letgo"),
    (34.5, 37.0, "shot05_girl_regret", "omni_girl_regret"),
    (37.0, 40.5, "shot06_boy_smile", "omni_boy_smile"),
    (45.0, 48.5, "shot07_boy_offer", "omni_boy_offer"),
    (48.5, 51.5, "shot08_girl_accept", "omni_girl_accept"),
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
    parser.add_argument("--mode", choices=["cel", "omni"], default="omni",
                        help="omni (default): OmniHuman video cels replace "
                             "static talking shots when present (per-shot "
                             "fallback to static); cel: force static. "
                             "V9 incident: cel default silently dropped all "
                             "omni motion in a re-render")
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
            "Afternoon riverbank texture episode (sunprint flat-color "
            "daytime) driven by 5 static keyframes plus 4 environment A/B "
            "variants (tree sway, redrawing light drift), eight OmniHuman "
            "1.5 720p talking shots (Girl x4, Boy x4), and five Seedance "
            "2.0 720p no-character I2V environment segments (16s total: "
            "env_open / wind_gust / page_lift / page_drift / env_close). "
            "F01 foreshadow debuts: the gear-like pencil symbol in the "
            "sketchbook corner, held 3.0s static, never mentioned, no "
            "reaction shot. F02/F03 fully silent (cooling discipline). "
            "Hard cuts; one closing crossfade (0.25s). Target aftertaste: "
            "reluctant warmth."
        ),
        "frames": frames,
    }
    OUT.write_text(json.dumps(timeline, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"wrote {OUT}: {len(frames)} frame entries")


if __name__ == "__main__":
    main()
