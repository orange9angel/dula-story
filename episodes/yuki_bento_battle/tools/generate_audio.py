#!/usr/bin/env python3
"""yuki_morning_battle《早起大作战》audio chain: per-line seed-tts-2.0
dialogue (mp3), manifest, dialogue/SFX/BGM buses, and the 62 s final mix.

Adapted from cat_leads_e10_waiting_rain/tools/generate_audio.py.
All four voices (Yuki/Narrator/Gulu/Mochi) use ``provider: seedtts`` in
config/voice_config.json, so only VOLC_SPEECH_API_KEY is required
(source dula-story/.env.speech).

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import struct
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

EPISODE = Path(__file__).resolve().parents[1]
STORY_PATH = EPISODE / "script.story"
VOICE_CONFIG_PATH = EPISODE / "config" / "voice_config.json"
AUDIO_MIX_PATH = EPISODE / "config" / "audio_mix.json"
OUTPUT_DIR = EPISODE / "assets" / "audio"
SFX_DIR = OUTPUT_DIR / "sfx"
MUSIC_DIR = OUTPUT_DIR / "music"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
DIALOGUE_BUS_PATH = OUTPUT_DIR / "_temp_dialogue.wav"
SFX_BUS_PATH = OUTPUT_DIR / "_temp_sfx.wav"
BGM_BUS_PATH = OUTPUT_DIR / "_temp_bgm.wav"
MIXED_PATH = OUTPUT_DIR / "mixed.wav"

DURATION_SECONDS = 101.0
SAMPLE_RATE = 48000
MIXED_SAMPLE_RATE = 44100
TEMPLATE_SOURCE_OFFSET_SECONDS = 0.2
SILENCE_THRESHOLD = 0.01  # ~ -40 dBFS

# Per-SFX playback trims for one-shot effects without an endTime. Long beds
# scheduled by story entries (rain_shower, awning_drips, river_water, ...) are
# trimmed by the endTime path instead.
SFX_TRIM = {
    "alarm_clock": (2.4, 0.4),
    "record_scratch": (1.4, 0.2),
    "takecopter_spin": (2.2, 0.5),
    "dash_whoosh": (1.6, 0.3),
    "whoosh_fast": (1.4, 0.3),
    "impact_thud": (1.2, 0.2),
    "morning_birds": (4.0, 0.8),
    "bento_pop": (0.8, 0.2),
    "carrot_munch": (2.5, 0.5),
}

DEFAULT_MODEL = "cosyvoice-v3-flash"
DEFAULT_VOICE = "longhua_v3"


# ---------------------------------------------------------------- story I/O

def parse_story(text: str) -> tuple[list[dict], list[dict], dict | None]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    entries: list[dict] = []
    sfx_events: list[dict] = []
    music_event: dict | None = None
    i = 0
    while i < len(lines):
        if not lines[i].strip():
            i += 1
            continue
        index = int(lines[i].strip())
        i += 1
        if i >= len(lines):
            break
        m = re.match(
            r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})",
            lines[i].strip(),
        )
        i += 1
        if not m:
            continue
        start = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4)) / 1000
        end = int(m.group(5)) * 3600 + int(m.group(6)) * 60 + int(m.group(7)) + int(m.group(8)) / 1000
        text_lines = []
        while i < len(lines) and lines[i].strip():
            text_lines.append(lines[i].strip())
            i += 1
        content = "\n".join(text_lines)

        char_match = re.search(r"\[(\w+)\]", content)
        character = char_match.group(1) if char_match else None
        voice_match = re.search(r"\{Voice:([^}]+)\}", content)
        emotion = voice_match.group(1).strip() if voice_match else None

        dialogue = re.sub(r"^@\w+\s*", "", content)
        dialogue = re.sub(r"\[\w+\]\s*", "", dialogue)
        dialogue = re.sub(r"\{[^}]+\}\s*", "", dialogue).strip()

        def parse_options(tag_body: str) -> dict:
            parts = [p.strip() for p in tag_body.split("|")]
            options = {}
            for part in parts[1:]:
                if "=" in part:
                    key, value = part.split("=", 1)
                    options[key.strip()] = value.strip()
            return options

        for tag_body in re.findall(r"\{SFX:([^}]+)\}", content):
            if not tag_body.split("|")[0].strip() == "Play":
                continue
            options = parse_options(tag_body)
            name = options.get("name")
            if not name:
                continue
            try:
                offset = float(options.get("offset", 0.0))
            except ValueError:
                offset = 0.0
            event = {
                "name": name,
                "startTime": start + offset,
                "volume": float(options.get("baseVolume", 1.0)),
            }
            if "endTime" in options:
                try:
                    event["endTime"] = float(options["endTime"])
                except ValueError:
                    pass
            elif not character:
                # SFX-only entry: the SRT end time is the bed's end time.
                event["endTime"] = end
            sfx_events.append(event)

        if music_event is None:
            music_match = re.search(r"\{Music:Play\|([^}]+)\}", content)
            if music_match:
                options = parse_options("Play|" + music_match.group(1))
                music_event = {
                    "name": options.get("name"),
                    "startTime": start,
                    "fadeIn": float(options.get("fadeIn", 2.0)),
                    "baseVolume": float(options.get("baseVolume", 1.0)),
                    "endTime": float(options.get("endTime", DURATION_SECONDS)),
                }

        entries.append(
            {
                "index": index,
                "startTime": start,
                "endTime": end,
                "character": character,
                "dialogue": dialogue,
                "emotion": emotion,
            }
        )
    return entries, sfx_events, music_event


def resolve_voice_params(cfg: dict, emotion: str | None) -> dict:
    """default + emotion variant inheritance: the variant wins, any key it
    does not set falls back to the character's ``default`` block."""
    base = cfg.get("default", {})
    if emotion and emotion in cfg:
        variant = dict(cfg[emotion])
        for key, value in base.items():
            if key not in variant:
                variant[key] = value
        return variant
    return dict(base)


# ------------------------------------------------------------------ helpers

def run_ffmpeg(args: list[str]) -> None:
    cmd = ["ffmpeg", "-y", *args]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {' '.join(cmd)}\n{result.stderr[-2000:]}")


def read_wav(path: Path) -> tuple[int, list[float]]:
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        width = source.getsampwidth()
        rate = source.getframerate()
        frames = source.getnframes()
        raw = source.readframes(frames)
    if width != 2:
        raise ValueError(f"Expected 16-bit PCM WAV: {path}")
    values = struct.unpack(f"<{frames * channels}h", raw)
    scale = 1.0 / 32768.0
    if channels == 1:
        return rate, [v * scale for v in values]
    return rate, [
        sum(values[i * channels : (i + 1) * channels]) * scale / channels
        for i in range(frames)
    ]


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as source:
        return source.getnframes() / source.getframerate()


def leading_silence_seconds(path: Path) -> float:
    rate, samples = read_wav(path)
    for idx, sample in enumerate(samples):
        if abs(sample) >= SILENCE_THRESHOLD:
            return idx / rate
    return len(samples) / rate


# ---------------------------------------------------------------------- TTS

def synthesize_line_seedtts(text: str, params: dict, mp3_path: Path, wav_path: Path, api_key: str) -> None:
    """Volcano seed-tts-2.0 via tools/seedtts_say.py. The mp3 is the kept
    per-line deliverable; a 48 kHz mono PCM16 wav twin is written for
    measurement and the dialogue bus."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import seedtts_say

    rate = float(params.get("rate", 1.0))
    if rate != 1.0:
        print(f"  Warning: seed-tts does not support rate; ignoring rate={rate} for this line.")
    seedtts_say.synthesize(
        text,
        params["speaker"],
        mp3_path,
        emotion=params.get("emotion"),
        emotion_scale=params.get("emotion_scale"),
        api_key=api_key,
        resource_id=params.get("resourceId", seedtts_say.DEFAULT_RESOURCE_ID),
        audio_format=params.get("format", seedtts_say.DEFAULT_FORMAT),
        sample_rate=int(params.get("sampleRate", seedtts_say.DEFAULT_SAMPLE_RATE)),
    )
    run_ffmpeg(["-i", str(mp3_path), "-acodec", "pcm_s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", str(wav_path)])


# -------------------------------------------------------------------- buses

def build_dialogue_bus(manifest_entries: list[dict]) -> None:
    inputs: list[str] = []
    filters: list[str] = []
    for i, entry in enumerate(manifest_entries):
        inputs += ["-i", str(OUTPUT_DIR / entry["wavFile"])]
        delay_ms = int(round(entry["startTime"] * 1000))
        offset = entry["sourceOffset"]
        filters.append(f"[{i}:a]atrim=start={offset:.6f},adelay={delay_ms}|{delay_ms}[d{i}]")
    amix_inputs = "".join(f"[d{i}]" for i in range(len(manifest_entries)))
    filters.append(
        f"{amix_inputs}amix=inputs={len(manifest_entries)}:duration=longest:normalize=0[dialogue]"
    )
    filter_file = OUTPUT_DIR / "_dialogue_filter.txt"
    filter_file.write_text(";".join(filters), encoding="utf-8")
    run_ffmpeg([
        *inputs,
        "-filter_complex_script", str(filter_file),
        "-map", "[dialogue]",
        "-acodec", "pcm_s16le", "-ar", str(SAMPLE_RATE), "-ac", "1",
        str(DIALOGUE_BUS_PATH),
    ])
    filter_file.unlink(missing_ok=True)


def build_sfx_bus(sfx_events: list[dict]) -> None:
    inputs: list[str] = []
    filters: list[str] = []
    used = 0
    for event in sfx_events:
        path = SFX_DIR / f"{event['name']}.wav"
        if not path.is_file():
            print(f"  Warning: SFX file missing, skipped: {path.name}")
            continue
        i = used
        used += 1
        inputs += ["-i", str(path)]
        delay_ms = int(round(event["startTime"] * 1000))
        chain = f"[{i}:a]"
        if "endTime" in event:
            play = max(0.1, event["endTime"] - event["startTime"])
            chain += f"atrim=0:{play:.3f},afade=t=out:st={max(0.0, play - 1.0):.3f}:d=1.0,"
        elif event["name"] in SFX_TRIM:
            play, fade = SFX_TRIM[event["name"]]
            chain += f"atrim=0:{play:.3f},afade=t=out:st={max(0.0, play - fade):.3f}:d={fade:.3f},"
        chain += f"adelay={delay_ms}|{delay_ms},volume={event['volume']:.3f}[s{i}]"
        filters.append(chain)
    if not used:
        raise RuntimeError("No SFX events scheduled")
    amix_inputs = "".join(f"[s{i}]" for i in range(used))
    filters.append(f"{amix_inputs}amix=inputs={used}:duration=longest:normalize=0[sfxout]")
    filter_file = OUTPUT_DIR / "_sfx_filter.txt"
    filter_file.write_text(";".join(filters), encoding="utf-8")
    run_ffmpeg([
        *inputs,
        "-filter_complex_script", str(filter_file),
        "-map", "[sfxout]",
        "-acodec", "pcm_s16le", "-ar", str(SAMPLE_RATE), "-ac", "1",
        str(SFX_BUS_PATH),
    ])
    filter_file.unlink(missing_ok=True)


def build_bgm_bus(music_event: dict | None) -> None:
    if not music_event or not music_event.get("name"):
        raise RuntimeError("No {Music:Play} tag found in script.story")
    music_path = None
    for ext in ("wav", "mp3", "ogg"):
        candidate = MUSIC_DIR / f"{music_event['name']}.{ext}"
        if candidate.is_file():
            music_path = candidate
            break
    if music_path is None:
        raise RuntimeError(
            f"BGM file for '{music_event['name']}' not found in {MUSIC_DIR}; "
            "run dula-engine/tools/generate_bgm.py first."
        )
    fade_in = music_event["fadeIn"]
    base_volume = music_event["baseVolume"]
    end_time = music_event["endTime"]
    fade_out = min(3.0, end_time * 0.1)
    envelope = (
        f"{base_volume:.3f}*min(1,t/{fade_in:.3f})*"
        f"if(lt(t,{end_time - fade_out:.3f}),1,"
        f" max(0,({end_time:.3f}-t)/{fade_out:.3f}))"
    )
    run_ffmpeg([
        "-stream_loop", "-1",
        "-i", str(music_path),
        "-af", f"atrim=0:{DURATION_SECONDS},volume='{envelope}':eval=frame",
        "-acodec", "pcm_s16le", "-ar", str(SAMPLE_RATE), "-ac", "1",
        str(BGM_BUS_PATH),
    ])


def build_final_mix(mix_cfg: dict) -> None:
    dialogue_vol = mix_cfg.get("dialogueVolume", 1.0)
    bgm_vol = mix_cfg.get("bgmVolume", 0.3)
    sfx_vol = mix_cfg.get("sfxVolume", 1.0)
    use_ducking = bool(mix_cfg.get("useDucking", False))
    duck_depth = float(mix_cfg.get("duckDepth", 0.3))

    filters = [f"[0:a]volume={dialogue_vol}[dlg]"]
    if use_ducking:
        filters.append(
            f"[1:a][0:a]sidechaincompress=threshold=0.02:ratio=4:attack=50:release=300:"
            f"level_in=1.0:mix={duck_depth}[bgm]"
        )
    else:
        filters.append(f"[1:a]volume={bgm_vol}[bgm]")
    filters.append(f"[2:a]volume={sfx_vol}[sfx]")
    filters.append("[dlg][bgm][sfx]amix=inputs=3:duration=longest:normalize=0,volume=0.85,"
                   "alimiter=limit=0.84:attack=5:release=60:level=false[outa]")
    run_ffmpeg([
        "-i", str(DIALOGUE_BUS_PATH),
        "-i", str(BGM_BUS_PATH),
        "-i", str(SFX_BUS_PATH),
        "-filter_complex", ";".join(filters),
        "-map", "[outa]",
        "-t", f"{DURATION_SECONDS}",
        "-acodec", "pcm_s16le", "-ar", str(MIXED_SAMPLE_RATE),
        str(MIXED_PATH),
    ])


# --------------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Regenerate existing takes")
    parser.add_argument("--tts-only", action="store_true", help="Skip bus/mix stages")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    entries, sfx_events, music_event = parse_story(STORY_PATH.read_text(encoding="utf-8"))
    voice_config = json.loads(VOICE_CONFIG_PATH.read_text(encoding="utf-8"))

    spoken_providers = {
        ("seedtts" if voice_config.get(entry["character"], {}).get("default", {}).get("provider") == "seedtts"
         else "cosyvoice")
        for entry in entries
        if entry["character"] and entry["dialogue"] and entry["character"] in voice_config
    }
    api_keys: dict[str, str] = {}
    if "cosyvoice" in spoken_providers:
        api_keys["cosyvoice"] = os.environ.get("DASHSCOPE_API_KEY", "")
        if not api_keys["cosyvoice"]:
            print("ERROR: DASHSCOPE_API_KEY is not set in this process; aborting before any TTS call.")
            sys.exit(2)
    if "seedtts" in spoken_providers:
        api_keys["seedtts"] = os.environ.get("VOLC_SPEECH_API_KEY", "")
        if not api_keys["seedtts"]:
            print("ERROR: VOLC_SPEECH_API_KEY is not set in this process; aborting before any TTS call.")
            sys.exit(2)

    manifest_entries: list[dict] = []
    print(f"{'line':34s} {'slot':>6s} {'take':>6s} {'trim':>6s} {'eff':>6s}  fit")
    for entry in entries:
        char = entry["character"]
        dialogue = entry["dialogue"]
        if not char or not dialogue:
            continue
        cfg = voice_config.get(char)
        if not cfg:
            print(f"Warning: no voice config for {char}, skipping entry {entry['index']}.")
            continue
        params = resolve_voice_params(cfg, entry.get("emotion"))
        if params.get("provider") != "seedtts":
            print(f"ERROR: entry {entry['index']} ({char}) is not seedtts; E10 chain is seedtts-only.")
            sys.exit(2)

        mp3_name = f"{entry['index']:03d}_{char}.mp3"
        wav_name = f"{entry['index']:03d}_{char}.wav"
        mp3_path = OUTPUT_DIR / mp3_name
        wav_path = OUTPUT_DIR / wav_name
        if args.force or not mp3_path.is_file() or not wav_path.is_file():
            print(f"Synthesizing {mp3_name} [{entry.get('emotion') or 'default'}] "
                  f"provider=seedtts speaker={params.get('speaker')} "
                  f"emotion={params.get('emotion')} emotion_scale={params.get('emotion_scale')}")
            synthesize_line_seedtts(dialogue, params, mp3_path, wav_path, api_keys["seedtts"])

        audio_duration = wav_duration(wav_path)
        leading = leading_silence_seconds(wav_path)
        source_offset = TEMPLATE_SOURCE_OFFSET_SECONDS if leading >= 0.15 else max(0.0, round(leading - 0.01, 3))
        effective = audio_duration - source_offset
        slot = entry["endTime"] - entry["startTime"]
        fit = "OK" if effective <= slot else f"OVERRUN +{effective - slot:.2f}s"

        manifest_entries.append(
            {
                "index": entry["index"],
                "startTime": entry["startTime"],
                "endTime": entry["endTime"],
                "character": char,
                "dialogue": dialogue,
                "file": mp3_name,
                "wavFile": wav_name,
                "audioDuration": round(audio_duration, 6),
                "sourceOffset": source_offset,
                "effectiveAudioDuration": round(effective, 6),
                "emotion": entry.get("emotion"),
            }
        )
        print(f"  #{entry['index']:02d} {dialogue[:28]:30s} {slot:5.2f}s {audio_duration:5.2f}s "
              f"{source_offset:5.2f}s {effective:5.2f}s  {fit}")

    MANIFEST_PATH.write_text(
        json.dumps({"entries": manifest_entries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Manifest written: {MANIFEST_PATH}")

    if args.tts_only:
        return

    print("Building dialogue bus...")
    build_dialogue_bus(manifest_entries)
    print(f"Scheduling {len(sfx_events)} SFX events...")
    for event in sfx_events:
        print(f"  - {event['name']} @ {event['startTime']:.2f}s vol={event['volume']}"
              f" end={event.get('endTime')}")
    build_sfx_bus(sfx_events)
    print("Building BGM bus...")
    build_bgm_bus(music_event)
    mix_cfg = json.loads(AUDIO_MIX_PATH.read_text(encoding="utf-8")) if AUDIO_MIX_PATH.is_file() else {}
    print("Mixing final audio...")
    build_final_mix(mix_cfg)
    print(f"Mixed audio written: {MIXED_PATH} ({wav_duration(MIXED_PATH):.3f}s)")


if __name__ == "__main__":
    main()
