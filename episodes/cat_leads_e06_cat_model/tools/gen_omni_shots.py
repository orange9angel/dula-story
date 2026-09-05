#!/usr/bin/env python3
"""E04 V2: OmniHuman lip-synced video for all 8 talking shots.

Per shot: upload keyframe + dialogue audio to TOS, submit OmniHuman 1.5,
download mp4, extract 12fps cels into assets/omni/<shot>/f_*.png, then pad by
holding the LAST cel so the cel count fills the shot slot. Videos render with
baked mouth motion, so shots converted this way drop their mouth/eye rigs in
the timeline (build_timeline.py reads assets/omni/ when present).

Serial by design: the free trial allows 1 concurrent task.

Usage:
  set -a && source ../../.env.cv && set +a
  ../../.venv/Scripts/python.exe tools/gen_omni_shots.py
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
PY = sys.executable

# (shot name, keyframe, dialogue audio, slot seconds, prompt)
# (shot name, keyframe, dialogue audio, slot seconds, lead-in seconds before
# the line starts inside the shot, prompt)
# Lead-ins come from script.story: the line's startTime minus the shot start.
# V2 lesson: padding held cels at the END misaligns the baked-in mouth motion
# with the mixed audio (e.g. cat line 1 starts 1.3s into shot02) — pad the
# FRONT with held first cels so the video's speech lands on the line's time.
# E06: 10 talking shots. Posture lock + LAYERED demeanor (gaze, brow
# micro-motion, breath). Leads: each omni slot starts 0.2s before its line
# (see tools/build_timeline.py).
SHOTS = [
    ("shot01_boy_brief", "frame_01", "002_Boy", 3.1, 0.2,
     "少年坐在河堤台阶的树荫里，膝上摊着速写本，保持姿势和位置完全不动，只有嘴部随说话开合；视线落在画面左下方的猫身上，眉眼放松带笑，语气轻快。"),
    ("shot02_cat_proud", "frame_03", "003_Cat", 1.8, 0.2,
     "橘猫端坐在台阶上，保持姿势和位置完全不动，只有嘴部随说话开合和极轻微头部动作；下巴微抬、眼睛半眯，耳尖挺立，神情骄傲。"),
    ("shot03_girl_coax", "frame_04", "004_Girl", 2.4, 0.2,
     "少女蹲在橘猫旁边一手轻扶猫背，保持姿势和位置完全不动，只有嘴部随说话开合；眉梢带笑，视线看着猫，语气轻快哄劝。"),
    ("shot04_girl_butterfly", "frame_07", "005_Girl", 3.2, 0.2,
     "少女蹲着抬头追看画面右上方的蝴蝶，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛上挑、眼睛睁大，视线锁定右上方，语气急切又克制。"),
    ("shot05_girl_exclaim", "frame_10", "007_Girl", 2.0, 0.2,
     "少女撑着膝盖直起身，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛高挑、眼睛睁大，又急又笑地朝画面右侧喊。"),
    ("shot06_boy_resigned", "frame_11", "008_Boy", 2.2, 0.2,
     "少年坐在台阶上放下笔，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛微挑带无奈，嘴角苦笑一侧略高，视线看向画面左侧。"),
    ("shot07_girl_content", "frame_14", "009_Girl", 2.5, 0.2,
     "少女坐在树荫里的台阶上，保持姿势和位置完全不动，只有嘴部随说话开合；眼睑放松、视线柔和望向画面右侧，嘴角浅笑，呼吸轻缓。"),
    ("shot08_boy_content", "frame_15", "010_Boy", 2.4, 0.2,
     "少年坐在少女身旁，保持姿势和位置完全不动，只有嘴部随说话开合；眉眼平和，视线落在画面左侧的少女方向，嘴角浅笑。"),
    ("shot09_girl_moved", "frame_20", "013_Girl", 3.0, 0.2,
     "少女低头看着递来的速写本，保持姿势和位置完全不动，只有嘴部随说话开合；眉梢轻颤上扬，眼眶微亮，嘴角带一点哽咽的笑。"),
    ("shot10_cat_dream", "frame_21", "014_Cat", 2.5, 0.2,
     "橘猫蜷缩在树荫里熟睡，保持姿势和位置完全不动，双眼始终闭合成柔和的弧线（全程不要睁眼），只有嘴部随声音极轻微动一下，神情安详。"),
]

RESOLUTION = "1080"  # V2.1: 720p fast mode looked soft next to the 1080p cels


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}\n{proc.stdout}\n{proc.stderr}")


def upload(path: Path) -> str:
    proc = subprocess.run(
        [PY, str(EP / "tools" / "tos_upload.py"), "--file", str(path), "--key", path.name],
        capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"upload failed {path}: {proc.stderr}")
    return proc.stdout.strip().splitlines()[-1]


def main() -> int:
    for shot, frame, audio, slot, lead, prompt in SHOTS:
        out_dir = EP / "assets" / "omni" / shot
        mp4 = EP / "tmp" / f"omni{RESOLUTION}_{shot}.mp4"
        if not mp4.exists():
            print(f"== {shot}: upload+submit", flush=True)
            image_url = upload(EP / "assets" / "keyframes" / f"{frame}.png")
            audio_url = upload(EP / "assets" / "audio" / f"{audio}.wav")
            run([PY, str(EP / "tools" / "omnihuman_gen.py"),
                 "--image", image_url, "--audio", audio_url,
                 "--prompt", prompt, "--resolution", RESOLUTION,
                 "--out", str(mp4)])
        else:
            print(f"== {shot}: video exists, skip generation", flush=True)

        out_dir.mkdir(parents=True, exist_ok=True)
        existing = sorted(out_dir.glob("f_*.png"))
        if existing:
            print(f"== {shot}: {len(existing)} cels exist, skip", flush=True)
            continue
        # extract at 12fps, then hold the FIRST cel for the lead-in (so the
        # baked mouth motion lands on the line's start time) and the LAST cel
        # for any tail slack.
        run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4),
             "-vf", "fps=12", str(out_dir / "raw_%04d.png")])
        raws = sorted(out_dir.glob("raw_*.png"))
        target = round(slot * 12)
        lead_cels = round(lead * 12)
        import shutil
        for index in range(target):
            if index < lead_cels:
                src = raws[0]
            elif index - lead_cels < len(raws):
                src = raws[index - lead_cels]
            else:
                src = raws[-1]
            shutil.copyfile(src, out_dir / f"f_{index + 1:04d}.png")
        for raw in raws:
            raw.unlink()
        print(f"== {shot}: {target} cels (slot {slot}s, lead {lead}s)", flush=True)
    print("all omni shots done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
