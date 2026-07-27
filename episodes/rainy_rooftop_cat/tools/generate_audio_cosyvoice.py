#!/usr/bin/env python3
"""Generate CosyVoice dialogue, manifest, dialogue bus, and the full 31 s mix.

TTS goes through DashScope's HttpSpeechSynthesizer (cosyvoice-v3-flash); the
legacy Sambert SpeechSynthesizer path is dead. Non-stream calls return a
signed temporary ``audio_url`` which is downloaded immediately and never
persisted anywhere.

Pipeline (mirrors dula-engine/tools/generate_audio_dashscope.py and the
hurdles_championship episode mixer):

1. Parse script.story; synthesize every spoken entry ([Girl]/[Narrator]).
2. Measure each take; keep the template 0.2 s source-trim convention unless
   the take has less real leading silence, in which case sourceOffset follows
   the measurement (reported per line).
3. Write assets/audio/manifest.json (same schema as the template episode) and
   the post-trim dialogue bus assets/audio/_temp_dialogue.wav (48 kHz).
4. Schedule SFX from script.story {SFX:Play} tags, build the BGM bus from
   assets/audio/music/healing_piano_usui_493438.mp3, and mix
   assets/audio/mixed.wav (31.0 s, 44.1 kHz) using config/audio_mix.json.

Run with the episode venv:  dula-story/.venv/Scripts/python.exe
Requires DASHSCOPE_API_KEY in the process environment.
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
MUSIC_PATH = OUTPUT_DIR / "music" / "healing_piano_usui_493438.mp3"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
DIALOGUE_BUS_PATH = OUTPUT_DIR / "_temp_dialogue.wav"
SFX_BUS_PATH = OUTPUT_DIR / "_temp_sfx.wav"
BGM_BUS_PATH = OUTPUT_DIR / "_temp_bgm.wav"
MIXED_PATH = OUTPUT_DIR / "mixed.wav"

DURATION_SECONDS = 31.0
SAMPLE_RATE = 48000
MIXED_SAMPLE_RATE = 44100
TEMPLATE_SOURCE_OFFSET_SECONDS = 0.2
SILENCE_THRESHOLD = 0.01  # ~ -40 dBFS

# Per-SFX playback trims: (max_seconds, fade_out_seconds). The source
# recordings are much longer than the beats they score.
SFX_TRIM = {
    "thunder_distant": (6.0, 2.0),
    "umbrella_rustle": (1.8, 0.4),
    "birds_after_rain": (7.0, 2.0),
    "cat_purr": (3.0, 0.6),
    "footsteps_concrete": (1.6, 0.4),
}

DEFAULT_MODEL = "cosyvoice-v3-flash"
DEFAULT_VOICE = "longxiaoxia_v3"


# ---------------------------------------------------------------- story I/O

def parse_story(text: str) -> tuple[list[dict], list[dict]]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    entries: list[dict] = []
    sfx_events: list[dict] = []
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

        for tag_body in re.findall(r"\{SFX:([^}]+)\}", content):
            parts = [p.strip() for p in tag_body.split("|")]
            if not parts or parts[0] != "Play":
                continue
            options = {}
            for part in parts[1:]:
                if "=" in part:
                    key, value = part.split("=", 1)
                    options[key.strip()] = value.strip()
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
            sfx_events.append(event)

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
    return entries, sfx_events


def resolve_voice_params(cfg: dict, emotion: str | None) -> dict:
    """default + emotion variant inheritance over model/voice/rate/pitch/volume."""
    base = cfg.get("default", {})
    if emotion and emotion in cfg:
        variant = dict(cfg[emotion])
        for key in ("model", "voice", "rate", "pitch", "volume"):
            if key not in variant and key in base:
                variant[key] = base[key]
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

def synthesize_line(text: str, params: dict, output_path: Path, api_key: str) -> None:
    from dashscope.audio.http_tts.http_speech_synthesizer import HttpSpeechSynthesizer

    result = HttpSpeechSynthesizer.call(
        model=params.get("model", DEFAULT_MODEL),
        voice=params.get("voice", DEFAULT_VOICE),
        text=text,
        format="wav",
        sample_rate=SAMPLE_RATE,
        rate=float(params.get("rate", 1.0)),
        pitch=float(params.get("pitch", 1.0)),
        volume=int(params.get("volume", 50)),
        stream=False,
        api_key=api_key,
    )
    audio_url = getattr(result, "audio_url", None)
    if not audio_url and isinstance(result, dict):
        audio_url = result.get("audio_url")
    if not audio_url:
        raise RuntimeError(f"CosyVoice call returned no audio_url: {result!r}")

    temp_path = output_path.with_suffix(".download.wav")
    # The URL is a signed temporary link: fetch now, never persist it.
    urllib.request.urlretrieve(audio_url, temp_path)
    # Re-encode to a clean 48 kHz mono PCM16 WAV (fixes any header quirks).
    run_ffmpeg(["-i", str(temp_path), "-acodec", "pcm_s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", str(output_path)])
    temp_path.unlink(missing_ok=True)


# -------------------------------------------------------------------- buses

def build_dialogue_bus(manifest_entries: list[dict]) -> None:
    inputs: list[str] = []
    filters: list[str] = []
    for i, entry in enumerate(manifest_entries):
        inputs += ["-i", str(OUTPUT_DIR / entry["file"])]
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


def build_bgm_bus() -> None:
    # Envelope: quiet bed for the rain act, a lift when the sky clears at
    # 22 s, and a fade-out across the final second. Gains here are relative;
    # config/audio_mix.json bgmVolume scales the whole bus at the final mix.
    envelope = (
        "min(1,t/2)*"
        "if(lt(t,20),0.55,"
        " if(lt(t,22),0.55+0.45*(t-20)/2,"
        " if(lt(t,30),1.0,"
        " max(0,1.0-(t-30)))))"
    )
    run_ffmpeg([
        "-i", str(MUSIC_PATH),
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
    parser.add_argument("--voice", help="Override the CosyVoice voice for every line")
    parser.add_argument("--tts-only", action="store_true", help="Skip bus/mix stages")
    args = parser.parse_args()

    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        print("ERROR: DASHSCOPE_API_KEY is not set in this process; aborting before any TTS call.")
        sys.exit(2)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    entries, sfx_events = parse_story(STORY_PATH.read_text(encoding="utf-8"))
    voice_config = json.loads(VOICE_CONFIG_PATH.read_text(encoding="utf-8"))

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
        if args.voice:
            params["voice"] = args.voice

        filename = f"{entry['index']:03d}_{char}.wav"
        filepath = OUTPUT_DIR / filename
        if args.force or not filepath.is_file():
            print(f"Synthesizing {filename} [{entry.get('emotion') or 'default'}] "
                  f"model={params.get('model')} voice={params.get('voice')} "
                  f"rate={params.get('rate')} pitch={params.get('pitch')} volume={params.get('volume')}")
            synthesize_line(dialogue, params, filepath, api_key)

        audio_duration = wav_duration(filepath)
        leading = leading_silence_seconds(filepath)
        # Template convention is a fixed 0.2 s source trim for encoder padding;
        # follow it only when the take really has that much leading silence.
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
                "file": filename,
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
        print(f"  - {event['name']} @ {event['startTime']:.2f}s vol={event['volume']}")
    build_sfx_bus(sfx_events)
    print("Building BGM bus...")
    build_bgm_bus()
    mix_cfg = json.loads(AUDIO_MIX_PATH.read_text(encoding="utf-8")) if AUDIO_MIX_PATH.is_file() else {}
    print("Mixing final audio...")
    build_final_mix(mix_cfg)
    print(f"Mixed audio written: {MIXED_PATH} ({wav_duration(MIXED_PATH):.3f}s)")


if __name__ == "__main__":
    main()
