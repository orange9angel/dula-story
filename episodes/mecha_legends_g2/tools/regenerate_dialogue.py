#!/usr/bin/env python3
"""
Regenerate all character dialogue MP3s for mecha_legends_g2.

Reads:
  - ../config/voice_config.json
  - ../assets/audio/manifest.json

Uses Microsoft Edge online TTS (edge_tts) with per-character voice parameters,
then applies the ffmpeg effect chain from voice_config.

Updates manifest.json with the new audioDuration values.
"""
import asyncio
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent.parent
CONFIG_PATH = ROOT / "config" / "voice_config.json"
MANIFEST_PATH = ROOT / "assets" / "audio" / "manifest.json"
AUDIO_DIR = ROOT / "assets" / "audio"
SAMPLE_RATE = 48000


def volume_string_to_multiplier(s):
    """Convert '+12%' / '-5%' to a float multiplier."""
    m = re.match(r"([+-]?\d+(?:\.\d+)?)%", str(s))
    if not m:
        return 1.0
    return 1.0 + float(m.group(1)) / 100.0


def get_duration(path):
    """Return audio duration in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    return float(result.stdout.strip())


async def generate_for_entry(entry, voice_cfg):
    character = entry["character"]
    cfg = voice_cfg.get(character) or voice_cfg.get("default", {})

    voice = cfg.get("voice", "zh-CN-YunxiNeural")
    rate = cfg.get("rate", "+0%")
    pitch = cfg.get("pitch", "+0Hz")
    volume_mul = volume_string_to_multiplier(cfg.get("volume", "+0%"))
    effect_af = cfg.get("effect", {}).get("af", "dynaudnorm")

    out_mp3 = AUDIO_DIR / entry["file"]

    with tempfile.TemporaryDirectory() as tmp:
        raw_mp3 = Path(tmp) / "raw.mp3"
        communicate = edge_tts.Communicate(
            entry["dialogue"], voice=voice, rate=rate, pitch=pitch
        )
        await communicate.save(str(raw_mp3))

        af = f"volume={volume_mul:.3f},{effect_af}"
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(raw_mp3),
                "-af", af,
                "-ar", str(SAMPLE_RATE), "-ac", "1",
                "-b:a", "64k",
                str(out_mp3),
            ],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
        )

    duration = get_duration(out_mp3)
    entry["audioDuration"] = round(duration, 3)
    print(f"Generated {out_mp3.name} ({character}) dur={duration:.3f}s")


async def main():
    global edge_tts
    import edge_tts

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        voice_cfg = json.load(f)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for entry in manifest["entries"]:
        await generate_for_entry(entry, voice_cfg)

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Updated {MANIFEST_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
