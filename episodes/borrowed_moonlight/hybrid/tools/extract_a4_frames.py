#!/usr/bin/env python3
"""A4 整集审片抽帧：ffmpeg 定点抽帧（seek 到秒，输出 jpg）。

用法：
  python extract_a4_frames.py <video.mp4> --out <dir> [--times 3,8,31,...]
默认时间点 = A4 审片表（每幕≥8，覆盖全部指定情绪节点/特效大场面 + 切镜边界）。
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

TIMES = [
    # 幕一 雪国小镇（m01-m12, 0-91）
    ("m01", 3.0), ("m01", 8.0), ("m04", 31.0), ("m05", 37.0), ("m05", 41.0),
    ("m08", 60.0), ("m09", 66.0), ("m10", 74.0), ("m11", 80.0),
    # 幕二 钟楼工坊（m13-m24, 91-184）
    ("m13", 95.0), ("m14", 105.0), ("m15", 113.5), ("m16", 121.0), ("m19", 144.0),
    ("m21", 158.0), ("m22", 165.0), ("m24", 181.0),
    # 幕三 星阶（m25-m37, 184-276）
    ("m25", 188.0), ("m26", 196.0), ("m27", 203.0), ("m29", 216.0),
    ("m31", 230.5), ("m32", 237.0), ("m33", 244.0), ("m37", 271.0),
    # 幕四 月亮宫殿（m38-m49, 276-374）
    ("m38", 280.0), ("m39", 288.0), ("m40", 296.0), ("m42", 311.0),
    ("m44", 328.0), ("m45", 335.0), ("m46", 341.5), ("m47", 348.0),
    ("m48", 355.0), ("m48", 360.0), ("m49", 366.2), ("m49", 369.5), ("m49", 371.0),
    # 幕五 春天归来（m50-m64, 374-478）
    ("m50", 378.0), ("m52", 391.0), ("m53", 397.0), ("m54", 403.0),
    ("m55", 409.0), ("m56", 414.0), ("m57", 419.0), ("m58", 425.0),
    ("m59", 431.0), ("m61", 446.0), ("m62", 456.0), ("m62", 460.0),
    ("m63", 466.0), ("m63", 470.0), ("m64", 475.5),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--times", default=None, help="逗号分隔秒数（不带 shot 标签）")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    times = ([(None, float(x)) for x in args.times.split(",")] if args.times else TIMES)
    for i, (shot, t) in enumerate(times):
        tag = f"{t:.1f}".replace(".", "p")
        name = f"{i:02d}_{shot+'_' if shot else ''}t{tag}s.jpg"
        out = args.out / name
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", str(args.video),
               "-frames:v", "1", "-q:v", "2", str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"FAIL t={t}: {r.stderr[-300:]}", file=sys.stderr)
            return 1
    print(f"extracted {len(times)} frames -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
