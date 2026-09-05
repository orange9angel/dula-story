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
SHOTS = [
    ("shot01_girl_door", "frame_01", "003_Girl", 3.0, 0.2,
     "少女从木门后探出身子，保持姿势和位置完全不动，只有嘴部随说话开合，神情好奇。"),
    ("shot02_cat_wall", "frame_02", "004_Cat", 3.5, 1.3,
     "橘猫在墙头保持站姿和位置完全不动，只有嘴部随说话开合和极轻微头部动作，神情淡定。"),
    ("shot05_girl_lane", "frame_04", "007_Girl", 2.5, 0.1,
     "少女站在夜巷中面向右侧，保持姿势和位置完全不动，双臂自然下垂贴身，只有嘴部随说话开合，神情明快。"),
    ("shot08_girl_bridge", "frame_06", "010_Girl", 2.5, 0.1,
     "少女凭栏而立，保持姿势和位置完全不动，只有嘴部随说话开合，神情平静。"),
    ("shot10_cat_bridge_end", "frame_08", "011_Cat", 3.0, 0.8,
     "橘猫坐在桥头矮墙上，保持姿势和位置完全不动，只有嘴部随说话开合，语气轻快催促。"),
    ("shot15_girl_amazed", "frame_11", "014_Girl", 2.5, 0.1,
     "少女站定不动，保持姿势和位置完全不动，只有嘴部随说话开合，神情惊喜。"),
    ("shot16_cat_fireflies", "frame_12", "015_Cat", 3.5, 1.4,
     "橘猫坐在草丛中，保持姿势和位置完全不动，只有嘴部随说话开合，神情有点小骄傲。"),
    ("shot20_girl_closeup", "frame_16", "017_Girl", 3.0, 0.3,
     "少女侧脸望向远方，保持姿势和位置完全不动，只有嘴部随说话开合，温柔地微笑。"),
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
