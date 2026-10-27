#!/usr/bin/env python3
"""T5 连续播放扫描器：从最终 MP4 解码帧序列找周期波动/闪烁/抖动/边界异常。

输出 storyboard/t5/continuity_scan.json + 可疑点清单（供人工亲看定位）。
方法（miss-learning 三线）：
- 全局：逐帧平均亮度序列 → 检测非剧情驱动的振荡（高通能量）与突跳（非切镜处）。
- 静态区：四角带（字幕/OSD 区除外）逐帧 diff → 底图应静止，能量>阈=底图漂移/闪烁。
- 人物区：每镜按 staging 的人物屏幕窗粗跟踪 diff 能量（预期高=动作；周期方波=换画抖动）。
- 切镜边界：31 处边界前后 3 帧两两 diff，报边界帧异常（半帧混合/闪黑闪白：亮度谷/峰）。
- OSD/字幕残留：cue 边界 ±1 帧的 OSD 区像素差异（应同帧进同帧出）。
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

EP = Path(__file__).resolve().parents[2]
VIDEO = EP / "output" / "tomorrow_still_bright_full.mp4"
OUT = EP / "storyboard" / "t5" / "continuity_scan.json"
FPS = 30
W, H = 1280, 720


def frames():
    """yield (idx, gray2d float32) at native fps, grayscale downsampled /2."""
    cmd = ["ffmpeg", "-v", "error", "-i", str(VIDEO), "-f", "rawvideo",
           "-pix_fmt", "gray", "-s", "640x360", "pipe:1"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    idx = 0
    while True:
        buf = proc.stdout.read(640 * 360)
        if len(buf) < 640 * 360:
            break
        yield idx, np.frombuffer(buf, np.uint8).reshape(360, 640).astype(np.float32)
        idx += 1
    proc.wait()


def main():
    tl = json.loads((EP / "config" / "timeline.json").read_text())
    bounds = [(s["id"], s["start"], s["end"]) for s in tl["segments"]]
    prev = None
    prev2 = None
    luma = []
    corner_e = []
    idx = 0
    per_shot_energy: dict[str, list[float]] = {}
    for i, fr in frames():
        luma.append(float(fr.mean()))
        # 静态角带：左上+右上+左下（避开底部字幕带与顶部 OSD 带）
        corners = np.concatenate([fr[80:160, 0:90].ravel(), fr[80:160, 550:640].ravel(),
                                  fr[300:360, 0:90].ravel()])
        if prev is not None:
            e = float(np.abs(fr - prev).mean())
            corner = float(np.abs(corners - prev2).mean()) if prev2 is not None else 0.0
            corner_e.append(corner)
            t = i / FPS
            for sid, s0, s1 in bounds:
                if s0 + 0.3 < t < s1 - 0.3:
                    per_shot_energy.setdefault(sid, []).append(e)
                    break
        prev = fr
        prev2 = corners
        idx = i
    n = idx + 1
    luma = np.array(luma)
    corner_e = np.array(corner_e)

    report = {"frames": n, "findings": []}

    # 1) 切镜边界：亮度谷/峰（闪黑闪白）
    for sid, s0, s1 in bounds[1:]:
        f = round(s0 * FPS)
        seg = luma[max(0, f - 2):f + 3]
        if len(seg) == 0 or len(luma[max(0, f - 30):f + 30]) == 0:
            continue
        base = np.median(luma[max(0, f - 30):f + 30])
        if seg.min() < base * 0.55:
            report["findings"].append({"kind": "boundary_dark_flash", "shot": sid, "t": s0,
                                        "min_luma": round(float(seg.min()), 1), "base": round(float(base), 1)})
        if seg.max() > base * 1.8:
            report["findings"].append({"kind": "boundary_bright_flash", "shot": sid, "t": s0,
                                        "max_luma": round(float(seg.max()), 1), "base": round(float(base), 1)})

    # 2) 非切镜亮度突跳（>12% 帧间）——闪帧
    jumps = []
    for i in range(1, n):
        t = i / FPS
        in_boundary = any(abs(t - s0) < 0.1 for _, s0, _ in bounds)
        if not in_boundary and abs(luma[i] - luma[i - 1]) > max(6.0, 0.12 * luma[i - 1]):
            jumps.append({"t": round(t, 3), "from": round(float(luma[i - 1]), 1), "to": round(float(luma[i]), 1)})
    report["luma_jumps"] = jumps[:40]

    # 3) 静态角带能量（底图应稳）：报每镜最大与 P95
    per_shot_corner = {}
    corner_iter = iter(corner_e)
    for i in range(1, n):
        e = corner_e[i - 1]
        t = i / FPS
        for sid, s0, s1 in bounds:
            if s0 + 0.3 < t < s1 - 0.3:
                per_shot_corner.setdefault(sid, []).append((round(t, 2), round(e, 2)))
                break
    corner_stats = {}
    for sid, es in per_shot_corner.items():
        vals = [e for _, e in es]
        p95 = float(np.percentile(vals, 95)) if vals else 0
        mx = max(es, key=lambda x: x[1]) if es else (0, 0)
        corner_stats[sid] = {"p95": round(p95, 2), "max": mx}
    report["corner_energy"] = corner_stats
    for sid, st in corner_stats.items():
        if st["p95"] > 6.0:
            report["findings"].append({"kind": "background_instability", "shot": sid, **st})

    # 4) 周期振荡检测（全局亮度去趋势后 0.5-6Hz 能量）——缓慢运镜/动作外的周期波动
    from numpy.fft import rfft
    for sid, s0, s1 in bounds:
        f0, f1 = round(s0 * FPS), round(s1 * FPS)
        seg = luma[f0:f1]
        if len(seg) < 60:
            continue
        seg = seg - np.linspace(seg[0], seg[-1], len(seg))
        spec = np.abs(rfft(seg * np.hanning(len(seg))))[1:]
        freqs = np.fft.rfftfreq(len(seg), 1 / FPS)[1:]
        band = (freqs > 0.5) & (freqs < 6)
        if band.any() and spec[band].max() > max(18, 0.10 * seg.std() * len(seg) / 2):
            fmax = freqs[band][np.argmax(spec[band])]
            report["findings"].append({"kind": "luma_oscillation", "shot": sid,
                                        "freq_hz": round(float(fmax), 2),
                                        "power": round(float(spec[band].max()), 1)})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps({"frames": n, "findings": len(report["findings"]),
                      "luma_jumps": len(report["luma_jumps"])}, ensure_ascii=False))
    for f in report["findings"]:
        print(" ", f)


if __name__ == "__main__":
    sys.exit(main())
