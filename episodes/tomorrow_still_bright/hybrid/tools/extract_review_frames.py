#!/usr/bin/env python3
"""T5 审片抽帧：切镜边界三联 + 关键镜 10fps 连续序列 + 指定抽帧。

产物 storyboard/t5/frames/：
  cut_<前后镜>_<f-1|f0|f1>.png   31 处边界（边界帧及其前后各 1 帧）
  seq_<镜>_<t>.png               关键镜 10fps 连续序列
  still_<镜>_<t>.png             指定时间点
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[2]
VIDEO = EP / "output" / "tomorrow_still_bright_full.mp4"
OUT = EP / "storyboard" / "t5" / "frames"
FPS = 30

# 关键镜连续审查窗（绝对秒）：起点/时长
SEQ = {
    "s02": (24.0, 3.0), "s03": (37.0, 3.0), "s04": (50.0, 4.0),
    "s08": (115.5, 3.0), "s09": (129.5, 3.0), "s12": (180.5, 3.0),
    "s14": (209.0, 4.0), "s24": (366.5, 4.0), "s26": (398.5, 3.0),
    "s29": (448.0, 3.0), "s30": (460.0, 3.0), "s31": (466.5, 4.5),
}
# 最终抽帧审时间点
STILLS = {
    "s01": 9.0, "s03": 40.5, "s05": 72.0, "s08": 120.0, "s09": 136.0,
    "s14": 214.0, "s19": 291.0, "s24": 368.2, "s28": 435.0, "s29": 450.5,
    "s31": 468.5, "s32": 478.0,
}


def grab(t: float, name: str):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(VIDEO),
                    "-frames:v", "1", str(OUT / name)], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tl = json.loads((EP / "config" / "timeline.json").read_text())
    segs = tl["segments"]
    for i in range(1, len(segs)):
        t0 = segs[i]["start"]
        grab(t0 - 1 / FPS - 0.001, f"cut_{segs[i-1]['id']}_{segs[i]['id']}_prev.png")
        grab(t0, f"cut_{segs[i-1]['id']}_{segs[i]['id']}_f0.png")
        grab(t0 + 1 / FPS, f"cut_{segs[i-1]['id']}_{segs[i]['id']}_f1.png")
    for sid, (t0, dur) in SEQ.items():
        t = t0
        while t < t0 + dur:
            grab(t, f"seq_{sid}_{t:.1f}.png")
            t += 0.1
    for sid, t in STILLS.items():
        grab(t, f"still_{sid}_{t:.1f}.png")
    print(f"extracted to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
