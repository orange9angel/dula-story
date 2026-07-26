#!/usr/bin/env python3
"""Build deterministic 12 fps Chinese anime visemes from the final dialogue stem.

The input is ``assets/audio/_temp_dialogue.wav``: the exact post-trim,
post-scheduling dialogue bus that is mixed into the rendered movie.  Using
that bus avoids the historical 200 ms discrepancy between source MP3 mouth
cues and the final mix.  Audio energy gates the mouth, while the known Chinese
dialogue selects closed/half/open limited-animation visemes per syllable.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import wave
from pathlib import Path


CUE_FPS = 60
MOUTH_FPS = 12
WINDOW_SECONDS = 0.040
ATTACK_SECONDS = 0.030
RELEASE_SECONDS = 0.080
LOOKAHEAD_FRAMES = 2
MIX_TRIM_SECONDS = 0.200

# This episode intentionally keeps a tiny, deterministic pronunciation table
# instead of adding a runtime pinyin dependency. Every spoken Han character in
# script.story must be represented here; unknown characters fail generation.
PINYIN_BY_CHAR = {
    "最": "zui",
    "后": "hou",
    "一": "yi",
    "球": "qiu",
    "喂": "wei",
    "日": "ri",
    "暮": "mu",
    "社": "she",
    "团": "tuan",
    "的": "de",
    "人": "ren",
    "都": "dou",
    "走": "zou",
    "光": "guang",
    "了": "le",
    "进": "jin",
    "我": "wo",
    "就": "jiu",
    "回": "hui",
    "家": "jia",
    "那": "na",
    "来": "lai",
    "防": "fang",
    "输": "shu",
    "请": "qing",
    "汽": "qi",
    "水": "shui",
    "你": "ni",
    "连": "lian",
    "校": "xiao",
    "服": "fu",
    "没": "mei",
    "换": "huan",
    "这": "zhe",
    "样": "yang",
    "赢": "ying",
    "才": "cai",
    "帅": "shuai",
    "算": "suan",
    "犯": "fan",
    "规": "gui",
    "吧": "ba",
    "也": "ye",
    "归": "gui",
    "捡": "jian",
}


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = clamp(q) * (len(ordered) - 1)
    low = math.floor(position)
    high = math.ceil(position)
    if low == high:
        return ordered[low]
    blend = position - low
    return ordered[low] + (ordered[high] - ordered[low]) * blend


def read_pcm16_mono(path: Path) -> tuple[int, list[float]]:
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        sample_width = source.getsampwidth()
        sample_rate = source.getframerate()
        frame_count = source.getnframes()
        raw = source.readframes(frame_count)

    if sample_width != 2:
        raise ValueError(f"Expected 16-bit PCM WAV, got {sample_width * 8}-bit: {path}")

    unpacked = struct.unpack(f"<{frame_count * channels}h", raw)
    scale = 1.0 / 32768.0
    if channels == 1:
        return sample_rate, [sample * scale for sample in unpacked]

    mono: list[float] = []
    for frame in range(frame_count):
        offset = frame * channels
        mono.append(sum(unpacked[offset : offset + channels]) * scale / channels)
    return sample_rate, mono


def build_envelope(samples: list[float], sample_rate: int) -> list[dict[str, float]]:
    hop_size = max(1, round(sample_rate / CUE_FPS))
    window_size = max(hop_size, round(sample_rate * WINDOW_SECONDS))
    frame_count = max(1, math.ceil(len(samples) / hop_size))
    rms_values: list[float] = []
    zcr_values: list[float] = []

    for frame in range(frame_count):
        center = frame * hop_size
        start = max(0, center - window_size // 2)
        end = min(len(samples), start + window_size)
        window = samples[start:end]
        if not window:
            rms_values.append(0.0)
            zcr_values.append(0.0)
            continue
        rms_values.append(math.sqrt(sum(sample * sample for sample in window) / len(window)))
        crossings = sum(
            1
            for left, right in zip(window, window[1:])
            if (left >= 0 > right) or (left < 0 <= right)
        )
        zcr_values.append(crossings / max(1, len(window) - 1))

    noise_floor = quantile(rms_values, 0.16)
    strong_level = max(quantile(rms_values, 0.95), noise_floor + 0.0001)
    energy_range = max(0.0001, strong_level - noise_floor)
    raw_energy = [
        math.pow(clamp((rms - noise_floor) / energy_range), 0.62)
        for rms in rms_values
    ]

    attack = 1.0 - math.exp(-(1.0 / CUE_FPS) / ATTACK_SECONDS)
    release = 1.0 - math.exp(-(1.0 / CUE_FPS) / RELEASE_SECONDS)
    envelope = 0.0
    previous_raw = 0.0
    previous_onset = 0.0
    frames: list[dict[str, float]] = []

    for index, raw_value in enumerate(raw_energy):
        target = raw_value
        for lookahead in range(1, LOOKAHEAD_FRAMES + 1):
            ahead = raw_energy[index + lookahead] if index + lookahead < len(raw_energy) else 0.0
            target = max(target, ahead * (1.0 - lookahead * 0.22))
        coefficient = attack if target > envelope else release
        envelope += (target - envelope) * coefficient
        if envelope < 0.025:
            envelope = 0.0

        raw_onset = clamp((raw_value - previous_raw) * 3.4)
        previous_onset += (raw_onset - previous_onset) * 0.42
        previous_raw = raw_value
        brightness = clamp((zcr_values[index] - 0.015) / 0.14)
        jaw_open = clamp(envelope * 0.92 + previous_onset * 0.18)
        frames.append(
            {
                "t": round(index / CUE_FPS, 4),
                "energy": round(envelope, 4),
                "jawOpen": round(jaw_open, 4),
                "onset": round(previous_onset, 4),
                "brightness": round(brightness, 4),
            }
        )

    return frames


def sample_jaw(frames: list[dict[str, float]], local_time: float) -> float:
    if not frames:
        return 0.0
    position = max(0.0, local_time) * CUE_FPS
    lower = min(len(frames) - 1, int(math.floor(position)))
    upper = min(len(frames) - 1, lower + 1)
    blend = position - math.floor(position)
    return frames[lower]["jawOpen"] + (frames[upper]["jawOpen"] - frames[lower]["jawOpen"]) * blend


def quantize_energy_cells(frames: list[dict[str, float]], duration: float) -> list[str]:
    cells: list[str] = []
    state = "closed"
    count = max(1, math.ceil(duration * MOUTH_FPS))
    for cell in range(count):
        jaw = sample_jaw(frames, (cell + 0.5) / MOUTH_FPS)
        if state == "closed":
            state = "half" if jaw >= 0.12 else "closed"
        elif state == "half":
            if jaw < 0.07:
                state = "closed"
            elif jaw >= 0.58:
                state = "open"
        else:
            if jaw < 0.07:
                state = "closed"
            elif jaw < 0.44:
                state = "half"
        cells.append(state)
    return cells


def dialogue_syllables(dialogue: str) -> list[str]:
    syllables: list[str] = []
    unknown: list[str] = []
    for char in dialogue:
        if not ("\u4e00" <= char <= "\u9fff"):
            continue
        pinyin = PINYIN_BY_CHAR.get(char)
        if pinyin:
            syllables.append(pinyin)
        else:
            unknown.append(char)
    if unknown:
        missing = "".join(dict.fromkeys(unknown))
        raise ValueError(f"Missing pinyin mapping for dialogue characters: {missing}")
    return syllables


def vowel_mouth_state(syllable: str) -> str:
    # A/E/O finals read as an open cel in limited anime animation; I/U/Ü
    # finals use the narrower half cel. Bilabial closures are handled below.
    if any(vowel in syllable for vowel in ("a", "o", "e")):
        return "open"
    return "half"


def syllable_mouth_state(syllable: str, phase: float, energy_state: str) -> str:
    if energy_state == "closed":
        return "closed"

    # B/P/M need a visible lip seal at the syllable onset. F uses the narrower
    # cel. Other initials transition directly into the vowel cel at 12 fps.
    if syllable.startswith(("b", "p", "m")) and phase < 0.28:
        return "closed"
    if syllable.startswith("f") and phase < 0.22:
        return "half"

    target = vowel_mouth_state(syllable)
    if target == "open" and energy_state == "half":
        return "half"
    return target


def apply_text_visemes(energy_cells: list[str], dialogue: str) -> tuple[list[str], list[str]]:
    syllables = dialogue_syllables(dialogue)
    if not syllables:
        return energy_cells[:], []

    audible = [index for index, state in enumerate(energy_cells) if state != "closed"]
    if not audible:
        return ["closed"] * len(energy_cells), syllables

    cells = ["closed"] * len(energy_cells)
    for ordinal, cell_index in enumerate(audible):
        position = ordinal * len(syllables) / len(audible)
        syllable_index = min(len(syllables) - 1, int(position))
        phase = position - syllable_index
        cells[cell_index] = syllable_mouth_state(
            syllables[syllable_index],
            phase,
            energy_cells[cell_index],
        )
    return cells, syllables


def audible_segments(cells: list[str], timeline_start: float) -> list[dict[str, float]]:
    segments: list[dict[str, float]] = []
    start_cell: int | None = None
    for index, state in enumerate(cells + ["closed"]):
        audible = state != "closed"
        if audible and start_cell is None:
            start_cell = index
        elif not audible and start_cell is not None:
            segments.append(
                {
                    "start": round(timeline_start + start_cell / MOUTH_FPS, 4),
                    "end": round(timeline_start + index / MOUTH_FPS, 4),
                }
            )
            start_cell = None
    return segments


def build(episode_dir: Path) -> dict:
    manifest_path = episode_dir / "assets" / "audio" / "manifest.json"
    dialogue_path = episode_dir / "assets" / "audio" / "_temp_dialogue.wav"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sample_rate, dialogue_samples = read_pcm16_mono(dialogue_path)

    output_entries = []
    for item in manifest.get("entries", []):
        start_time = float(item["startTime"])
        source_duration = float(item.get("audioDuration") or 0.0)
        source_offset = float(item.get("sourceOffset", MIX_TRIM_SECONDS))
        effective_duration = float(
            item.get("effectiveAudioDuration", max(0.05, source_duration - source_offset))
        )
        start_sample = max(0, round(start_time * sample_rate))
        end_sample = min(len(dialogue_samples), round((start_time + effective_duration) * sample_rate))
        frames = build_envelope(dialogue_samples[start_sample:end_sample], sample_rate)
        energy_cells = quantize_energy_cells(frames, effective_duration)
        cells, syllables = apply_text_visemes(energy_cells, item["dialogue"])
        output_entries.append(
            {
                "index": int(item["index"]),
                "character": item["character"],
                "dialogue": item["dialogue"],
                "timelineStart": round(start_time, 4),
                "timelineEnd": round(start_time + effective_duration, 4),
                "sourceDuration": round(source_duration, 6),
                "sourceOffset": source_offset,
                "effectiveDuration": round(effective_duration, 6),
                "alignment": "energy-gated-text-viseme-v1",
                "syllables": syllables,
                "audibleSegments": audible_segments(energy_cells, start_time),
                "energyCells": energy_cells,
                "cells": cells,
                "frames": frames,
            }
        )

    return {
        "version": 3,
        "timebase": "seconds",
        "signal": "post-trim-final-dialogue-stem",
        "source": "assets/audio/_temp_dialogue.wav",
        "visemeMethod": "energy-gated-text-viseme-v1",
        "visemeStates": ["closed", "half", "open"],
        "cueFrameRate": CUE_FPS,
        "mouthFrameRate": MOUTH_FPS,
        "mixTrimSeconds": MIX_TRIM_SECONDS,
        "entries": output_entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "episode_dir",
        nargs="?",
        default=Path(__file__).resolve().parents[1],
        type=Path,
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    episode_dir = args.episode_dir.resolve()
    output_path = args.output or episode_dir / "config" / "lipsync_cues.json"
    payload = build(episode_dir)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(payload['entries'])} lipsync entries to {output_path}")
    for item in payload["entries"]:
        counts = {state: item["cells"].count(state) for state in ("closed", "half", "open")}
        print(
            f"  #{item['index']:03d} {item['character']}: "
            f"{item['effectiveDuration']:.3f}s, cells={counts}, audible={item['audibleSegments']}"
        )


if __name__ == "__main__":
    main()
