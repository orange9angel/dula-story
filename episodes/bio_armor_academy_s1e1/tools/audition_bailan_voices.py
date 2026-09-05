#!/usr/bin/env python3
"""One-off male-voice audition for BaiLan (bio_armor_academy_s1e1).

Synthesizes BaiLan's signature line with each candidate CosyVoice v3 male
voice at neutral pitch (1.0) so the F0 comparison reflects the raw voice,
then runs librosa pyin F0 analysis and prints a comparison table.

Samples land in tmp/bailan_auditions/.
"""
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
import librosa

EPISODE = Path(__file__).resolve().parents[1]
OUT = EPISODE / "tmp" / "bailan_auditions"
OUT.mkdir(parents=True, exist_ok=True)

TEXT = "社团战第一条：被单元选中者，无权退场。——接刀！"

# CosyVoice v3 male-leaning candidates; longshu_v3 = current BaiLan (control),
# longze_v3 = LeiXiao (control, should stay distinct).
CANDIDATES = [
    ("longwan_v3",     "龙万"),
    ("longcheng_v3",   "龙城/龙橙"),
    ("longlaotie_v3",  "龙老铁"),
    ("longjielidou_v3", "龙杰力豆"),
    ("longxiao_v3",    "龙潇"),
    ("longyue_v3",     "龙悦"),
    ("longting_v3",    "龙婷"),
    ("longtian_v3",    "龙天 磁性理智男 浑厚低沉"),
    ("longsanshu_v3",  "龙三叔 沉稳质感男 胸腔共鸣"),
    ("longnan_v3",     "龙楠 睿智青年男 沉而通透"),
    ("longxiaocheng_v3", "龙小诚 磁性低音男"),
    ("longfei_v3",     "龙飞 热血磁性男"),
    ("libai_v3",       "李白 低沉书卷气"),
    ("longxiu_v3",     "龙修 博才说书男"),
    ("longshu_v3",     "龙书(现任白岚,对照)"),
    ("longze_v3",      "龙泽(雷晓,对照)"),
]

from dashscope.audio.http_tts.http_speech_synthesizer import HttpSpeechSynthesizer

api_key = os.environ.get("DASHSCOPE_API_KEY", "")
if not api_key:
    sys.exit("DASHSCOPE_API_KEY not set")

results = []
for voice, label in CANDIDATES:
    path = OUT / f"{voice}.wav"
    try:
        if not path.is_file():
            result = HttpSpeechSynthesizer.call(
                model="cosyvoice-v3-flash", voice=voice, text=TEXT,
                format="wav", sample_rate=48000, rate=1.0, pitch=1.0, volume=50,
                stream=False, api_key=api_key,
            )
            url = getattr(result, "audio_url", None) or (result.get("audio_url") if isinstance(result, dict) else None)
            if not url:
                print(f"FAIL {voice}: no audio_url -> {str(result)[:150]}")
                continue
            urllib.request.urlretrieve(url, path)
        y, sr = librosa.load(path, sr=16000, mono=True)
        dur = len(y) / sr
        f0, voiced_flag, _ = librosa.pyin(
            y, fmin=60, fmax=350, sr=sr, frame_length=2048, hop_length=256,
        )
        voiced = f0[~np.isnan(f0)]
        if len(voiced) < 5:
            print(f"FAIL {voice}: too few voiced frames ({len(voiced)})")
            continue
        med = float(np.median(voiced))
        p10 = float(np.percentile(voiced, 10))
        p90 = float(np.percentile(voiced, 90))
        iqr = p90 - p10
        results.append((voice, label, dur, med, p10, p90, iqr, len(voiced)))
        print(f"OK   {voice} ({label})")
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL {voice}: {str(exc)[:180]}")

print()
print(f"{'voice':18s} {'label':22s} {'dur(s)':>7s} {'F0med':>7s} {'F0p10':>7s} {'F0p90':>7s} {'p90-p10':>8s} {'frames':>6s}")
for voice, label, dur, med, p10, p90, iqr, n in sorted(results, key=lambda r: r[3]):
    print(f"{voice:18s} {label:22s} {dur:7.2f} {med:7.1f} {p10:7.1f} {p90:7.1f} {iqr:8.1f} {n:6d}")
