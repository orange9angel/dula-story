#!/usr/bin/env python3
"""V18 候选歌曲结构评分：把"起承转合"翻译成可计算指标。

评分维度（越高越好，加权求和）：
- arc_contrast: 段落能量对比度（最强段/最弱段），起承转合的基础
- build_slope: 副歌前 2s 的能量爬升斜率（"转"的蓄力感）
- drop_impact: 全曲最大能量落差（高潮爆发感）
- dynamic_range: 整体动态范围（crest factor 的分布宽度）
- rhythm_clarity: 拍点清晰度（onset 自相关峰值，卡点友好度）
- spectral_var: 频谱质心随时间的变化（配器丰富度）

用法: score_v18.py <candidate.wav> [<candidate2.wav> ...]
"""
import sys
import numpy as np
import librosa


def score(path):
    y, sr = librosa.load(path, sr=44100, mono=True)
    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

    # 段落能量：按 8 等分
    seg = np.array_split(rms, 8)
    seg_e = np.array([s.mean() for s in seg])
    arc_contrast = float(seg_e.max() / max(seg_e.min(), 1e-8))

    # build: 找全曲能量最大帧，前面 2s 的斜率
    peak_i = int(np.argmax(rms))
    win = rms[max(0, peak_i - int(2 * sr / hop)):peak_i + 1]
    build_slope = float(np.polyfit(np.arange(len(win)), win, 1)[0] * sr / hop) if len(win) > 4 else 0.0

    # drop impact: 相邻 0.5s 窗的最大能量比
    w = int(0.5 * sr / hop)
    ratios = []
    for i in range(w, len(rms) - w):
        before = rms[i - w:i].mean()
        after = rms[i:i + w].mean()
        if before > 1e-6:
            ratios.append(after / before)
    drop_impact = float(max(ratios)) if ratios else 1.0

    # 动态范围：RMS 的 95/10 分位差（dB）
    db = 20 * np.log10(np.maximum(rms, 1e-8))
    dynamic_range = float(np.percentile(db, 95) - np.percentile(db, 10))

    # 拍点清晰度：onset 包络自相关主峰/均值
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    ac = np.correlate(onset - onset.mean(), onset - onset.mean(), mode="full")[len(onset) - 1:]
    lo, hi = int(60 / 180 * sr / hop), int(60 / 60 * sr / hop)  # 60-180 BPM 周期窗
    rhythm_clarity = float(ac[lo:hi].max() / max(ac[lo:hi].mean(), 1e-8)) if hi < len(ac) else 0.0

    # 配器丰富度：频谱质心标准差
    cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
    spectral_var = float(cent.std() / max(cent.mean(), 1e-8))

    return dict(arc_contrast=arc_contrast, build_slope=build_slope,
                drop_impact=drop_impact, dynamic_range=dynamic_range,
                rhythm_clarity=rhythm_clarity, spectral_var=spectral_var)


def main():
    rows = []
    for path in sys.argv[1:]:
        rows.append((path, score(path)))
    # 归一化后加权：起承转合权重最高
    keys = ["arc_contrast", "build_slope", "drop_impact", "dynamic_range", "rhythm_clarity", "spectral_var"]
    weights = dict(arc_contrast=2.0, build_slope=2.0, drop_impact=1.5,
                   dynamic_range=1.0, rhythm_clarity=1.5, spectral_var=1.0)
    maxv = {k: max(r[k] for _, r in rows) or 1 for k in keys}
    print(f"{'candidate':<28}" + "".join(f"{k:>15}" for k in keys) + f"{'TOTAL':>8}")
    results = []
    for path, r in rows:
        total = sum(weights[k] * r[k] / maxv[k] for k in keys)
        results.append((total, path))
        name = path.split("/")[-1].split("\\")[-1]
        print(f"{name:<28}" + "".join(f"{r[k]:>15.3f}" for k in keys) + f"{total:>8.2f}")
    results.sort(reverse=True)
    print(f"\n推荐: {results[0][1]}")


if __name__ == "__main__":
    main()
