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
# E05: 8 talking shots. Prompts follow the E05 discipline: posture lock +
# LAYERED demeanor (gaze direction, brow micro-motion, breath). Leads: each
# omni slot starts 0.2s before its line (see tools/build_timeline.py).
SHOTS = [
    ("shot01_girl_door", "frame_01", "003_Girl", 3.2, 0.2,
     "少女从半开的木门后探出身子，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛随语气轻轻上挑，眼睑自然眨动，视线向画面右下方寻找，呼吸轻浅，神情好奇。"),
    ("shot02_cat_doorstep", "frame_03", "004_Cat", 2.4, 0.2,
     "橘猫蹲在门口石阶上，保持姿势和位置完全不动，只有嘴部随说话开合和极轻微头部动作；眼神沉稳望向画面左侧，耳尖轻颤，神情淡定。"),
    ("shot03_girl_spots", "frame_11", "011_Girl", 3.1, 0.2,
     "少女站在河堤上，保持姿势和位置完全不动，双臂自然下垂贴身，只有嘴部随说话开合；先眯眼辨认远方，随后眉毛上挑、眼睛睁大，视线锁定画面右侧远处，神情好奇。"),
    ("shot04_boy_gentle", "frame_14", "013_Boy", 2.4, 0.2,
     "少年坐在河堤台阶上，低头看向画面左下方脚边的猫，保持姿势和位置完全不动，只有嘴部随说话开合；眼睑低垂、嘴角带浅笑，眉眼放松，呼吸平缓，神情温柔。"),
    ("shot05_boy_nervous", "frame_16", "014_Boy", 3.0, 0.2,
     "少年坐在台阶上抬头看向画面左侧的少女，保持姿势和位置完全不动，一只手抬到脑后轻挠，只有嘴部随说话开合；视线先躲闪下移再抬回，眉毛微抬，神情腼腆紧张。"),
    ("shot06_boy_bright", "frame_19", "016_Boy", 3.0, 0.2,
     "少年坐在台阶上，一手扶着膝上的速写本，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛舒展、眼睛明亮，嘴角笑意逐渐明显，神情开朗放松。"),
    ("shot07_girl_gentle", "frame_21", "017_Girl", 3.2, 0.2,
     "少女低头看向画面左下方的橘猫，保持姿势和位置完全不动，只有嘴部随说话开合；眼睑低垂、视线柔和，嘴角浅笑，呼吸轻缓，神情温柔。"),
    ("shot08_cat_proud", "frame_23", "018_Cat", 2.5, 0.2,
     "橘猫蹲在两人之间的台阶上，保持姿势和位置完全不动，只有嘴部随说话开合；下巴微抬、眼睛半眯，耳尖挺立，神情有点小骄傲。"),
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
