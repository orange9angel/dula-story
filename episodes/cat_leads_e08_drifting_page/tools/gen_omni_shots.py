#!/usr/bin/env python3
"""E08: OmniHuman lip-synced video for the 8 talking shots.

Per shot: upload closeup base + dialogue audio to TOS, submit OmniHuman 1.5,
download mp4, extract 12fps cels into assets/omni/<shot>/f_*.png, then pad by
holding the LAST cel so the cel count fills the shot slot. Videos render with
baked mouth motion, so shots converted this way drop their mouth/eye rigs in
the timeline (build_timeline.py reads assets/omni/ when present).

Base images are the omni_shotNN closeups built by tools/gen_omni_bases.sh
(codex imagegen from the character references + matching scene keyframe).

E08 specifics: slots start exactly at their line's startTime (storyboard),
so lead-in is 0.0 -- the video's baked speech lands on the line directly.
Resolution 720 (720p generation tier, config/render_spec.json).
Serial by design: 1 concurrent task. On 50430 (concurrency slot busy) wait
5 minutes and retry, up to 3 attempts per shot -- no tight retry loops.

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

# (shot name, base keyframe, dialogue audio, slot seconds, lead-in, prompt)
SHOTS = [
    ("shot01_girl_curious", "omni_shot01", "002_Girl", 2.5, 0.0,
     "少女面向画面左侧，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛轻挑，眼睛明亮带笑，神情好奇。画面里只有少女一个人，没有其他人和动物。"),
    ("shot02_boy_calm", "omni_shot02", "003_Boy", 3.0, 0.0,
     "少年坐在河边，保持姿势和位置完全不动，只有嘴部随说话开合和极轻微的头部动作；眼神平静放松，视线略偏向画面右侧。画面里只有少年一个人。"),
    ("shot03_girl_alarmed", "omni_shot03", "006_Girl", 2.5, 0.0,
     "少女面向画面左侧，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛紧皱上挑，眼睛睁大，神情着急。画面里只有少女一个人。"),
    ("shot04_boy_letgo", "omni_shot04", "007_Boy", 4.0, 0.0,
     "少年望着画面右侧的河面，保持姿势和位置完全不动，只有嘴部随说话开合；眼神平静而坚定，表情放松。画面里只有少年一个人。"),
    ("shot05_girl_regret", "omni_shot05", "008_Girl", 2.5, 0.0,
     "少女面向画面左侧，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛轻轻下垂，眼神惋惜，表情柔和。画面里只有少女一个人。"),
    ("shot06_boy_smile", "omni_shot06", "009_Boy", 3.5, 0.0,
     "少年面向画面右侧，保持姿势和位置完全不动，只有嘴部随说话开合；嘴角温和上扬微笑，眼神柔和令人安心。画面里只有少年一个人。"),
    ("shot07_boy_offer", "omni_shot07", "011_Boy", 3.5, 0.0,
     "少年保持向画面右侧递出画页的姿势完全不动，只有嘴部随说话开合；眼神真诚温和，表情温暖。画面里只有少年一个人。"),
    ("shot08_girl_accept", "omni_shot08", "012_Girl", 3.0, 0.0,
     "少女双手捧着画页，保持姿势和位置完全不动，只有嘴部随说话开合；眼神温柔，嘴角浅浅微笑。画面里只有少女一个人。"),
]

RESOLUTION = "720"  # E08: 720p generation tier (config/render_spec.json)
MAX_ATTEMPTS = 3
RETRY_WAIT_S = 300  # 50430 = concurrency slot busy; wait 5 min, never tight-loop


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


def generate(shot: str, frame: str, audio: str, prompt: str, mp4: Path) -> None:
    image_url = upload(EP / "assets" / "keyframes" / f"{frame}.png")
    audio_url = upload(EP / "assets" / "audio" / f"{audio}.wav")
    cmd = [PY, str(EP / "tools" / "omnihuman_gen.py"),
           "--image", image_url, "--audio", audio_url,
           "--prompt", prompt, "--resolution", RESOLUTION,
           "--out", str(mp4)]
    for attempt in range(1, MAX_ATTEMPTS + 1):
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode == 0:
            return
        detail = f"{proc.stdout}\n{proc.stderr}"
        if "50430" in detail and attempt < MAX_ATTEMPTS:
            print(f"== {shot}: 50430 slot busy, wait {RETRY_WAIT_S}s "
                  f"(attempt {attempt}/{MAX_ATTEMPTS})", flush=True)
            time.sleep(RETRY_WAIT_S)
            continue
        raise RuntimeError(f"omni generation failed for {shot}:\n{detail}")


def main() -> int:
    for shot, frame, audio, slot, lead, prompt in SHOTS:
        out_dir = EP / "assets" / "omni" / shot
        mp4 = EP / "tmp" / f"omni{RESOLUTION}_{shot}.mp4"
        if not mp4.exists():
            print(f"== {shot}: upload+submit", flush=True)
            generate(shot, frame, audio, prompt, mp4)
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
