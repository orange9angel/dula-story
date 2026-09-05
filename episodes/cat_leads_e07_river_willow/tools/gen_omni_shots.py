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
# E07: 10 talking shots. Posture lock + LAYERED demeanor. Leads: each omni
# slot starts 0.2s before its line (see tools/build_timeline.py).
SHOTS = [
    ("shot01_girl_path", "frame_01", "002_Girl", 2.6, 0.2,
     "少女走在河边小径上，保持姿势和位置完全不动，只有嘴部随说话开合；视线投向画面右下方，眉毛轻挑，语气轻快好奇。画面里只有少女一个人，没有猫，没有其他动物。"),
    ("shot02_cat_signature", "frame_03", "003_Cat", 2.6, 0.2,
     "橘猫坐在小径上，保持姿势和位置完全不动，只有嘴部随说话开合和极轻微头部动作；眼神沉稳望向画面左侧，耳尖轻颤，神情淡定。"),
    ("shot03_oldman_hello", "frame_09", "006_OldMan", 3.9, 0.2,
     "老渔夫坐在柳树下的小马扎上，回头看向画面右侧，保持姿势和位置完全不动，只有嘴部随说话开合；神情平和沉稳，眼角带一点笑意，语气缓慢笃定。"),
    ("shot04_girl_greet", "frame_11", "007_Girl", 2.9, 0.2,
     "少女微微欠身行礼，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛轻扬，眼睛带笑，语气礼貌明快。"),
    ("shot05_oldman_river", "frame_13", "009_OldMan", 5.5, 0.2,
     "老渔夫望着河面上的浮漂，保持姿势和位置完全不动，只有嘴部随说话开合；眼睑半垂，嘴角含笑，语速缓慢悠然。"),
    ("shot06_boy_rod", "frame_15", "010_Boy", 2.9, 0.2,
     "少年微蹲看着鱼竿，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛上挑，视线落在画面左侧的鱼竿上，语气好奇。"),
    ("shot07_oldman_proud", "frame_16", "011_OldMan", 3.9, 0.2,
     "老渔夫轻轻拍了拍身边的竹竿，保持姿势和位置完全不动，只有嘴部随说话开合；眼神温和怀念，嘴角浅浅含笑，语气平静有分量。"),
    ("shot08_oldman_mystery", "frame_18", "012_OldMan", 4.3, 0.2,
     "老渔夫望着河面，保持姿势和位置完全不动，只有嘴部随说话开合；眼神清亮而笃定，像在讲述一件了不起的美好事物，语气平缓，毫无阴霾。"),
    ("shot09_oldman_laugh", "frame_20", "014_OldMan", 4.6, 0.2,
     "老渔夫摆了摆手，保持姿势和位置完全不动，只有嘴部随说话开合；眉毛放松，眼睛笑眯，自嘲地轻笑。"),
    ("shot10_cat_deflect", "frame_23", "016_Cat", 2.0, 0.2,
     "橘猫回过头望向画面左侧的少女，保持姿势和位置完全不动，只有嘴部随说话开合；眼睑柔和，眼神温暖向往，像在说一个美好的约定。"),
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
