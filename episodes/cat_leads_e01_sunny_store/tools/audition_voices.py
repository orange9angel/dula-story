#!/usr/bin/env python3
"""One-off voice audition: try candidate young-female CosyVoice v3 voices.

Synthesizes the same line with each candidate and reports which voices the
cosyvoice-v3-flash model actually accepts. Samples land in tmp/voice_auditions/.
"""
import os
import sys
import urllib.request
from pathlib import Path

EPISODE = Path(__file__).resolve().parents[1]
OUT = EPISODE / "tmp" / "voice_auditions"
OUT.mkdir(parents=True, exist_ok=True)

TEXT = "猫带我去的地方，都有暖和的光。"
CANDIDATES = [
    "longanhuan",      # 龙安欢 欢脱元气女
    "longanhuan_v3",
    "longhua_v3",      # 龙华 元气甜美女
    "longanqin",       # 龙安亲 亲和活泼女
    "longanqin_v3",
    "longfeifei_v3",   # 龙菲菲 甜美娇气女
    "longxiaoxia_v3",  # 现任（对照）
]

from dashscope.audio.http_tts.http_speech_synthesizer import HttpSpeechSynthesizer

api_key = os.environ.get("DASHSCOPE_API_KEY", "")
if not api_key:
    sys.exit("DASHSCOPE_API_KEY not set")

for voice in CANDIDATES:
    try:
        result = HttpSpeechSynthesizer.call(
            model="cosyvoice-v3-flash", voice=voice, text=TEXT,
            format="wav", sample_rate=48000, rate=1.0, pitch=1.0, volume=50,
            stream=False, api_key=api_key,
        )
        url = getattr(result, "audio_url", None) or (result.get("audio_url") if isinstance(result, dict) else None)
        if not url:
            print(f"FAIL {voice}: no audio_url -> {result!r}"[:200])
            continue
        urllib.request.urlretrieve(url, OUT / f"{voice}.wav")
        print(f"OK   {voice}")
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL {voice}: {exc}"[:200])
