#!/usr/bin/env python3
"""
F5-TTS Voice Cloning Skill for Dula.

Pipeline:
  1. edge-tts generates base speech for each dialogue line.
  2. ffmpeg (or sox) applies personalized effects based on character personality.
  3. A clean 3-10s reference clip is extracted from the best speech segment.
  4. F5-TTS zero-shot clones the voice and generates final WAV files.

Usage:
  python generate_f5_voice.py ./episodes/kimi_showcase_s1e1 --character Kimi
"""

import argparse
import asyncio
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

# Allow the skill to use a bundled/local sox without a system-wide install.
_LOCAL_SOX_DIR = Path(__file__).resolve().parent.parent / "tools" / "sox" / "sox-14.4.2"
if _LOCAL_SOX_DIR.exists():
    os.environ["PATH"] = str(_LOCAL_SOX_DIR) + os.pathsep + os.environ.get("PATH", "")

# ---------------------------------------------------------------------------
# Personality-driven audio profiles
# ---------------------------------------------------------------------------

# Each personality tag maps to a set of audio effect parameters.
# Tags can be combined; later tags override earlier ones.
PERSONALITY_PRESETS = {
    # Gender / age base layers
    "female": {"pitch": "+2st", "formant": "-1", "treble": 4, "presence": 2, "speed": 1.0},
    "male": {"pitch": "-2st", "formant": "+1", "bass": 4, "presence": -1, "speed": 0.98},
    "child": {"pitch": "+5st", "formant": "-3", "speed": 1.08, "treble": 5, "presence": 1},
    "elder": {"pitch": "-3st", "formant": "+2", "speed": 0.92, "treble": -2, "warmth": 2},

    # Temperament layers
    "calm": {"speed": 0.94, "reverb": 0.3, "compression": 0.35, "bass": 1, "warmth": 2},
    "energetic": {"speed": 1.1, "treble": 5, "compression": 0.55, "reverb": 0.1, "presence": 3},
    "brave": {"pitch": "-1st", "formant": "+1", "bass": 5, "compression": 0.45, "reverb": 0.25, "presence": 2},
    "cold": {"pitch": "-1st", "treble": -3, "reverb": 0.4, "speed": 0.95, "presence": -2},
    "cute": {"pitch": "+3st", "formant": "-2", "speed": 1.06, "treble": 4, "chorus": 0.2},
    "funny": {"pitch": "+1st", "speed": 1.12, "compression": 0.65, "treble": 4, "reverb": 0.15},
    "mysterious": {"pitch": "-2st", "formant": "+2", "reverb": 0.45, "treble": -3, "speed": 0.94, "warmth": -1},
    "robot": {"pitch": "+0st", "formant": "-2", "treble": 6, "reverb": 0.15, "vibrato": 0.4, "highpass": 150, "compression": 0.3, "flanger": 0.3},
    "noble": {"pitch": "-1st", "formant": "+1", "bass": 3, "reverb": 0.35, "speed": 0.97, "compression": 0.4, "presence": 2, "warmth": 1},
    "shy": {"pitch": "+1st", "speed": 0.96, "volume": -3, "reverb": 0.2, "treble": -2, "compression": 0.2},
    "worried": {"pitch": "+1st", "speed": 1.06, "compression": 0.4, "treble": 2, "bass": -1, "reverb": 0.15},
    "gentle": {"pitch": "-1st", "speed": 0.94, "compression": 0.25, "warmth": 2, "reverb": 0.25, "treble": 1},
    "annoyed": {"pitch": "+0st", "speed": 1.12, "compression": 0.55, "treble": 3, "bass": -2},
    "broadcast": {"compression": 0.7, "presence": 4, "treble": 3, "bass": 2, "deess": 4, "speed": 1.0, "warmth": 1},
}


def resolve_personality(tags):
    """Combine personality tags into a single effect dict."""
    effect = {}
    for tag in tags:
        preset = PERSONALITY_PRESETS.get(tag)
        if preset:
            effect.update(preset)
        else:
            print(f"[personality] unknown tag '{tag}', ignoring")
    return effect


# ---------------------------------------------------------------------------
# Story parsing
# ---------------------------------------------------------------------------


def parse_story(text):
    """Parse .story SRT-like format into dialogue entries."""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    entries = []
    i = 0
    while i < len(lines):
        if lines[i].strip() == "":
            i += 1
            continue
        index_str = lines[i].strip()
        if not index_str.isdigit():
            i += 1
            continue
        index = int(index_str)
        i += 1
        if i >= len(lines):
            break
        time_line = lines[i].strip()
        i += 1
        m = re.match(
            r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})",
            time_line,
        )
        if not m:
            continue
        start = (
            int(m.group(1)) * 3600
            + int(m.group(2)) * 60
            + int(m.group(3))
            + int(m.group(4)) / 1000
        )
        end = (
            int(m.group(5)) * 3600
            + int(m.group(6)) * 60
            + int(m.group(7))
            + int(m.group(8)) / 1000
        )
        content_lines = []
        while i < len(lines) and lines[i].strip() != "":
            content_lines.append(lines[i].strip())
            i += 1
        content = " ".join(content_lines)

        char_match = re.search(r"\[(\w+)\]", content)
        character = char_match.group(1) if char_match else None

        dialogue = re.sub(r"^@\w+(?:\{[^}]*\})*\s*", "", content)
        dialogue = re.sub(r"\[\w+\]\s*", "", dialogue)
        dialogue = re.sub(r"\{[^}]+\}\s*", "", dialogue).strip()

        if character and dialogue:
            entries.append(
                {
                    "index": index,
                    "startTime": start,
                    "endTime": end,
                    "character": character,
                    "dialogue": dialogue,
                }
            )
    return entries


# ---------------------------------------------------------------------------
# Audio effect pipeline
# ---------------------------------------------------------------------------


def _which(cmd):
    for path in os.environ.get("PATH", "").split(os.pathsep):
        full = os.path.join(path, cmd)
        if os.path.isfile(full) or os.path.isfile(full + ".exe"):
            return full
    return None


def _semitones_to_ratio(value):
    """Convert '+1st' / '-2st' to rubberband ratio factor."""
    if isinstance(value, (int, float)):
        st = float(value)
    else:
        m = re.match(r"([+-]?\d+(?:\.\d+)?)st", str(value))
        if not m:
            return 1.0
        st = float(m.group(1))
    return 2 ** (st / 12)


def _st_str(value):
    """Parse semitones string like '+2st' into float."""
    if isinstance(value, (int, float)):
        return float(value)
    m = re.match(r"([+-]?\d+(?:\.\d+)?)st", str(value))
    return float(m.group(1)) if m else 0.0


def build_ffmpeg_filter(effect):
    """Build ffmpeg -af filter chain from effect dict."""
    parts = []

    # 1. Cleanup: high-pass to remove rumble, low-pass to tame harshness
    hp = effect.get("highpass")
    if hp:
        parts.append(f"highpass=f={int(hp)}")
    lp = effect.get("lowpass")
    if lp:
        parts.append(f"lowpass=f={int(lp)}")

    # 2. EQ: broad bass / treble shelves + targeted presence / warmth / de-esser
    bass = effect.get("bass")
    if bass:
        parts.append(f"bass=g={int(bass)}:f=100")
    treble = effect.get("treble")
    if treble:
        parts.append(f"treble=g={int(treble)}:f=3000")
    presence = effect.get("presence")
    if presence:
        parts.append(f"equalizer=f=2500:width_type=h:width=500:gain={int(presence)}")
    warmth = effect.get("warmth")
    if warmth:
        parts.append(f"equalizer=f=400:width_type=h:width=300:gain={int(warmth)}")
    deess = effect.get("deess")
    if deess:
        parts.append(f"equalizer=f=6500:width_type=q:width=2:gain=-{int(deess)}")

    # 3. Pitch / formant / speed via rubberband
    pitch_ratio = _semitones_to_ratio(effect.get("pitch", "+0st"))
    formant_ratio = _semitones_to_ratio(effect.get("formant", "0"))
    speed = effect.get("speed", 1.0)
    parts.append(
        f"rubberband=pitch={pitch_ratio:.4f}:formant={formant_ratio:.4f}:tempo={float(speed):.3f}"
    )

    # 4. Modulation effects (robot / cute / mysterious)
    vibrato = effect.get("vibrato")
    if vibrato and float(vibrato) > 0:
        parts.append(f"vibrato=f=5:d={float(vibrato):.2f}")

    chorus = effect.get("chorus")
    if chorus and float(chorus) > 0:
        c = float(chorus)
        parts.append(
            f"chorus=0.7:0.9:{int(50*c)}|{int(60*c)}:{c:.2f}|{c*0.8:.2f}:0.25|0.4:2|2.3"
        )

    flanger = effect.get("flanger")
    if flanger and float(flanger) > 0:
        f = float(flanger)
        parts.append(
            f"flanger=delay=0:depth=2:regen={f*0.6:.2f}:width={int(50+50*f)}:speed={0.3+f*0.7:.2f}"
        )

    # 5. Dynamic control: make voice sit better in mix
    compression = effect.get("compression")
    if compression and float(compression) > 0:
        parts.append("dynaudnorm=f=150:g=15")

    # 6. Space: reverb via echo taps
    reverb = effect.get("reverb", 0.0)
    if reverb and float(reverb) > 0:
        r = float(reverb)
        parts.append(
            f"aecho=0.8:{round(0.5 + r * 0.4, 2)}:{int(40+40*r)}|{int(60+50*r)}|{int(90+60*r)}:{round(r*0.3,2)}|{round(r*0.2,2)}|{round(r*0.1,2)}"
        )

    # 7. Final loudness normalization so reference isn't too quiet/loud
    parts.append("loudnorm=I=-16:TP=-1.5:LRA=7")

    return ",".join(parts)


def apply_ffmpeg_effect(input_path, output_path, effect):
    """Apply personalized effects using ffmpeg filters."""
    if not effect:
        subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-acodec", "copy", output_path],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return

    filter_complex = build_ffmpeg_filter(effect)
    print(f"  [ffmpeg] filter: {filter_complex}")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-af",
            filter_complex,
            "-ar",
            "24000",
            "-ac",
            "1",
            "-acodec",
            "pcm_s16le",
            output_path,
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def build_sox_effect(effect):
    """Build a broadcast-grade sox effect chain from effect dict.

    This chain is intentionally more aggressive than the earlier draft:
    it uses compand for broadcast-style leveling, tremolo/flanger/chorus
    for character modulation, and a properly-parameterized reverb.
    """
    args = []

    # 1. Cleanup: band-limit with sinc for cleaner edges than biquad highpass
    hp = effect.get("highpass")
    lp = effect.get("lowpass")
    if hp and lp:
        args.extend(["sinc", f"{int(hp)}-{int(lp)}"])
    elif hp:
        args.extend(["sinc", str(int(hp))])
    elif lp:
        args.extend(["sinc", f"-{int(lp)}"])

    # 2. EQ: broad shelves + targeted presence / warmth / de-esser
    bass = effect.get("bass")
    if bass:
        args.extend(["bass", str(int(bass)), "100"])
    treble = effect.get("treble")
    if treble:
        args.extend(["treble", str(int(treble)), "3000"])
    presence = effect.get("presence")
    if presence:
        args.extend(["equalizer", "2500", "0.5q", str(int(presence))])
    warmth = effect.get("warmth")
    if warmth:
        args.extend(["equalizer", "400", "0.7q", str(int(warmth))])
    deess = effect.get("deess")
    if deess:
        args.extend(["equalizer", "6500", "2.0q", str(-int(deess))])

    # 3. Pitch / speed
    pitch = _st_str(effect.get("pitch", "+0st"))
    if pitch != 0:
        args.extend(["pitch", str(int(pitch * 100))])

    speed = effect.get("speed", 1.0)
    if speed and float(speed) != 1.0:
        args.extend(["speed", str(float(speed))])

    # 4. Modulation: tremolo + flanger + chorus for robot/cute/mysterious
    vibrato = effect.get("vibrato")
    if vibrato and float(vibrato) > 0:
        v = float(vibrato)
        # 5 Hz amplitude tremolo + metallic flanger shimmer
        args.extend(["tremolo", "5", str(int(v * 55))])
        args.extend(["flanger", "0", "2", str(round(0.2 * v, 2)), str(round(0.4 * v, 2)), str(round(0.3 + v * 0.6, 2))])

    flanger = effect.get("flanger")
    if flanger and float(flanger) > 0 and not (vibrato and float(vibrato) > 0):
        f = float(flanger)
        args.extend(["flanger", "0", "2", str(round(0.2 * f, 2)), str(round(0.4 * f, 2)), str(round(0.3 + f * 0.6, 2))])

    # Note: this sox build's `chorus` effect has inconsistent delay validation,
    # so we map the `chorus` parameter to a light flanger instead.
    chorus = effect.get("chorus")
    if chorus and float(chorus) > 0:
        c = float(chorus)
        args.extend(["flanger", "0", "2", str(round(0.2 * c, 2)), str(round(0.4 * c, 2)), str(round(0.3 + c * 0.7, 2))])

    # 5. Compression: broadcast-style tight leveling
    compression = effect.get("compression")
    if compression and float(compression) > 0:
        c = float(compression)
        attack = round(0.03 + 0.08 * c, 3)
        decay = round(0.15 + 0.45 * c, 3)
        args.extend([
            "compand",
            f"{attack},{decay}",
            "6:-80,-70,-40,-15,-25,-12,-12,-12",
            "0",
            "-90",
            "0.05",
        ])

    # 6. Space: properly bounded reverb parameters (sox reverb takes 6 args)
    reverb = effect.get("reverb", 0.0)
    if reverb and float(reverb) > 0:
        r = float(reverb)
        args.extend([
            "reverb",
            str(int(min(100, 35 + r * 55))),          # reverberance
            str(int(min(100, 25 + r * 45))),          # HF damping
            str(int(min(100, 75 + r * 25))),          # room scale
            str(int(min(100, 30 + r * 50))),          # stereo depth
            str(int(r * 30)),                         # pre-delay ms
            str(int(-8 + r * 7)),                     # wet gain dB
        ])

    # 7. Final loudness: peak normalize near -16 dBFS + output rate
    args.extend(["gain", "-n", "-16"])
    args.extend(["rate", "24000"])
    return args


def apply_sox_effect(input_path, output_path, effect):
    if not _which("sox"):
        raise RuntimeError("sox not found in PATH")

    # The bundled win32 sox lacks MP3 decode support, so decode to WAV first.
    tmp_wav = None
    if input_path.lower().endswith(".mp3"):
        tmp_wav = output_path + ".tmp.wav"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-ar",
                "24000",
                "-ac",
                "1",
                "-acodec",
                "pcm_s16le",
                tmp_wav,
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        input_path = tmp_wav

    try:
        args = ["sox", input_path, output_path] + build_sox_effect(effect)
        result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace").strip()
            print(f"[sox error] {err}")
            raise subprocess.CalledProcessError(result.returncode, args)
    finally:
        if tmp_wav and os.path.exists(tmp_wav):
            try:
                os.remove(tmp_wav)
            except OSError:
                pass


def apply_effect(input_path, output_path, effect, use_sox=False):
    if not effect:
        subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-acodec", "copy", output_path],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return
    if use_sox:
        apply_sox_effect(input_path, output_path, effect)
    else:
        apply_ffmpeg_effect(input_path, output_path, effect)


# ---------------------------------------------------------------------------
# Reference audio extraction with smart slicing
# ---------------------------------------------------------------------------


def get_audio_duration(path):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def detect_speech_segments(path, noise_db=-40, min_silence=0.25):
    """Use ffmpeg silencedetect to find speech segments."""
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            path,
            "-af",
            f"silencedetect=noise={noise_db}dB:d={min_silence}",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    output = result.stderr

    silences = []
    silence_start = None
    for line in output.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", line)
        if m:
            silence_start = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)\s*\|?\s*silence_duration: ([\d.]+)", line)
        if m and silence_start is not None:
            silences.append((silence_start, float(m.group(1))))
            silence_start = None

    duration = get_audio_duration(path)
    if duration is None:
        return []

    # Invert silence intervals to get speech segments
    speech = []
    cursor = 0.0
    for s, e in silences:
        if s > cursor:
            speech.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < duration:
        speech.append((cursor, duration))

    return speech


def detect_language(text):
    """Detect dominant script of text: zh / en / other."""
    chinese = len(re.findall(r"[\u4e00-\u9fff]", text))
    english = len(re.findall(r"[a-zA-Z]", text))
    if chinese > english and chinese > 0:
        return "zh"
    if english > chinese and english > 0:
        return "en"
    return "other"


def select_reference_entry(entries, strategy="auto", min_duration=2.0):
    """Pick the best line to use as reference audio source.

    Strategies:
      - auto: prefer dominant language, then richest clean speech content
      - auto_same_language: same as auto (explicit alias)
      - first: first line
      - longest: line with longest dialogue text
      - <int>: specific index
    """
    if not entries:
        return None

    if strategy == "first":
        return sorted(entries, key=lambda e: e["index"])[0]

    if strategy == "longest":
        return max(entries, key=lambda e: len(e["dialogue"]))

    if isinstance(strategy, int) or (isinstance(strategy, str) and strategy.isdigit()):
        idx = int(strategy)
        for e in entries:
            if e["index"] == idx:
                return e
        return sorted(entries, key=lambda e: e["index"])[idx]

    # auto / auto_same_language: pick the dominant language, then the richest line
    lang_counts = {}
    for e in entries:
        lang = detect_language(e["dialogue"])
        lang_counts[lang] = lang_counts.get(lang, 0) + 1
    dominant_lang = max(lang_counts, key=lang_counts.get) if lang_counts else "other"

    scored = []
    for e in entries:
        text = e["dialogue"]
        lang = detect_language(text)
        score = len(text)
        # Penalize heavy punctuation / ellipses
        score -= text.count("…") * 2
        score -= text.count("..") * 2
        score -= text.count("——") * 1
        # Favor richer phonetic content (rough heuristic: Chinese chars and vowels)
        score += len(re.findall(r"[aeiouAEIOUāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]", text)) * 0.5
        # Strongly prefer the dominant language so we don't clone Chinese with an English reference
        if lang == dominant_lang:
            score += 100
        scored.append((score, e))
    return max(scored, key=lambda x: x[0])[1]


def extract_reference(processed_dir, entry, ref_duration=5.0, min_segment=1.5):
    """Extract the best 3-10s speech segment from a processed line."""
    base_name = f"{entry['index']:03d}_{entry['character']}.wav"
    src_path = os.path.join(processed_dir, base_name)
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Reference source not found: {src_path}")

    duration = get_audio_duration(src_path)
    if duration is None:
        raise RuntimeError(f"Could not determine duration of {src_path}")

    # Try to find clean speech segments
    speech_segments = detect_speech_segments(src_path)

    ref_path = os.path.join(processed_dir, f"{entry['character']}_ref.wav")
    ref_text_path = os.path.join(processed_dir, f"{entry['character']}_ref_text.txt")

    # Pick longest speech segment that can fit ref_duration
    chosen_start = 0.0
    chosen_end = min(duration, ref_duration)
    best_len = 0.0
    for s, e in speech_segments:
        seg_len = e - s
        if seg_len >= min_segment and seg_len > best_len:
            best_len = seg_len
            # Start slightly inside the segment to avoid attack clicks
            chosen_start = s + min(0.1, seg_len * 0.05)
            chosen_end = min(e, chosen_start + ref_duration)

    # If no good segment found, fall back to simple trim
    if best_len < min_segment:
        chosen_end = min(duration, ref_duration)

    clip_duration = max(3.0, min(float(ref_duration), chosen_end - chosen_start, duration))

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            src_path,
            "-ss",
            str(chosen_start),
            "-t",
            str(clip_duration),
            "-acodec",
            "pcm_s16le",
            "-ar",
            "24000",
            "-ac",
            "1",
            ref_path,
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    ref_text = entry["dialogue"][:150]
    with open(ref_text_path, "w", encoding="utf-8") as f:
        f.write(ref_text)

    print(
        f"  [ref] {entry['character']} entry {entry['index']}: "
        f"segment {chosen_start:.2f}s..{chosen_end:.2f}s, clip {clip_duration:.2f}s"
    )
    return ref_path, ref_text


# ---------------------------------------------------------------------------
# TTS generation
# ---------------------------------------------------------------------------


async def generate_base_tts(entries, voice_cfg, output_dir, use_sox=False):
    """Generate base WAV for each line using edge-tts + personality effects."""
    import edge_tts

    os.makedirs(output_dir, exist_ok=True)
    processed_entries = []

    for entry in entries:
        char = entry["character"]
        dialogue = entry["dialogue"]
        cfg = voice_cfg.get(char, {})
        f5_cfg = cfg.get("f5_tts", {})
        if not f5_cfg.get("enabled", False):
            continue

        raw_path = os.path.join(output_dir, f"{entry['index']:03d}_{char}_raw.mp3")
        out_path = os.path.join(output_dir, f"{entry['index']:03d}_{char}.wav")

        if os.path.exists(out_path):
            print(f"[base] exists: {out_path}")
            processed_entries.append(entry)
            continue

        voice = cfg.get("voice", "zh-CN-XiaoxiaoNeural")
        rate = cfg.get("rate", "+0%")
        pitch = cfg.get("pitch", "+0Hz")
        volume = cfg.get("volume", "+0%")

        communicate = edge_tts.Communicate(
            text=dialogue,
            voice=voice,
            rate=rate,
            pitch=pitch,
            volume=volume,
        )
        await communicate.save(raw_path)

        # Build effect: explicit effect dict < personality tags < manual override
        effect = {}
        personality_tags = f5_cfg.get("personality", f5_cfg.get("style", []))
        if isinstance(personality_tags, str):
            personality_tags = [personality_tags]
        if personality_tags:
            effect = resolve_personality(personality_tags)
        if f5_cfg.get("effect"):
            effect.update(f5_cfg["effect"])

        if effect:
            print(f"[base] {char} entry {entry['index']} personality={personality_tags} -> {effect}")
        apply_effect(raw_path, out_path, effect, use_sox=use_sox)

        try:
            os.remove(raw_path)
        except OSError:
            pass

        print(f"[base] generated: {out_path}")
        processed_entries.append(entry)

    return processed_entries


def load_f5_tts_model(device=None):
    """Load the F5-TTS model once and return it."""
    from f5_tts.api import F5TTS

    print("[f5-tts] Loading F5-TTS model...")
    model = F5TTS(device=device)
    print("[f5-tts] Model loaded.")
    return model


def generate_f5_tts(
    entries,
    ref_path,
    ref_text,
    output_dir,
    speed=1.0,
    seed=None,
    device=None,
    model=None,
):
    """Run F5-TTS inference for each line.

    If ``model`` is provided it is reused; otherwise a new model is loaded.
    """
    if model is None:
        model = load_f5_tts_model(device=device)

    for entry in entries:
        char = entry["character"]
        dialogue = entry["dialogue"]
        out_path = os.path.join(output_dir, f"{entry['index']:03d}_{char}_f5.wav")

        if os.path.exists(out_path):
            print(f"[f5-tts] exists: {out_path}")
            continue

        print(f"[f5-tts] entry {entry['index']} ({char}): {dialogue[:40]}...")
        model.infer(
            ref_file=ref_path,
            ref_text=ref_text,
            gen_text=dialogue,
            file_wave=out_path,
            speed=float(speed),
            seed=seed,
            nfe_step=32,
        )
        print(f"[f5-tts] saved: {out_path}")


def install_f5_outputs(processed_entries, output_dir, episode_assets_audio):
    """Copy final F5-TTS WAVs into the episode's main audio folder as MP3.

    This lets the normal `dula-audio` / `dula-render` pipeline pick them up.
    """
    os.makedirs(episode_assets_audio, exist_ok=True)
    for entry in processed_entries:
        char = entry["character"]
        idx = entry["index"]
        src = os.path.join(output_dir, f"{idx:03d}_{char}_f5.wav")
        dst = os.path.join(episode_assets_audio, f"{idx:03d}_{char}.mp3")
        if not os.path.exists(src):
            continue
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                src,
                "-ar",
                "24000",
                "-ac",
                "1",
                "-b:a",
                "64k",
                "-acodec",
                "libmp3lame",
                dst,
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        print(f"[install] {dst}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="F5-TTS voice cloning skill")
    parser.add_argument("episode", help="Path to episode directory")
    parser.add_argument("--character", "-c", help="Only process this character")
    parser.add_argument("--use-sox", action="store_true", default=None, help="Use sox for effects (default: auto-detect)")
    parser.add_argument("--no-sox", action="store_true", help="Force ffmpeg for effects even if sox is available")
    parser.add_argument("--device", default=None, help="Device for F5-TTS (cuda/cpu)")
    parser.add_argument("--ref-strategy", default=None, help="Override reference selection: auto/first/longest/<index>")
    parser.add_argument("--ref-duration", type=float, default=None, help="Override reference duration in seconds")
    parser.add_argument("--personality", default=None, help="Override personality tags, comma-separated")
    args = parser.parse_args()

    if args.use_sox and args.no_sox:
        print("Error: --use-sox and --no-sox are mutually exclusive")
        sys.exit(1)
    use_sox = args.use_sox if args.use_sox is not None else (not args.no_sox and _which("sox") is not None)

    episode = Path(args.episode).resolve()
    story_path = episode / "script.story"
    voice_config_path = episode / "config" / "voice_config.json"
    output_dir = episode / "assets" / "audio" / "f5_voice"

    if not story_path.exists():
        print(f"Error: story file not found: {story_path}")
        sys.exit(1)
    if not voice_config_path.exists():
        print(f"Error: voice config not found: {voice_config_path}")
        sys.exit(1)

    with open(story_path, "r", encoding="utf-8") as f:
        story_text = f.read()

    with open(voice_config_path, "r", encoding="utf-8") as f:
        voice_config = json.load(f)

    entries = parse_story(story_text)

    if args.character:
        entries = [e for e in entries if e["character"] == args.character]
        if not entries:
            print(f"Error: no lines found for character '{args.character}'")
            sys.exit(1)

    enabled_chars = {
        name
        for name, cfg in voice_config.items()
        if cfg.get("f5_tts", {}).get("enabled", False)
    }
    if args.character and args.character not in enabled_chars:
        print(f"Warning: '{args.character}' does not have f5_tts.enabled in voice_config.json")

    entries = [e for e in entries if e["character"] in enabled_chars]
    if not entries:
        print("Error: no enabled F5-TTS characters found for this episode")
        sys.exit(1)

    print(f"[f5-tts-voice] Processing {len(entries)} line(s) for episode: {episode.name}")

    processed_entries = asyncio.run(
        generate_base_tts(
            entries,
            voice_config,
            str(output_dir),
            use_sox=use_sox,
        )
    )

    if not processed_entries:
        print("Error: no base audio generated")
        sys.exit(1)

    # Load the F5-TTS model once and clone each character with its own reference.
    model = load_f5_tts_model(device=args.device)

    # Group entries by character so each role keeps its own voice.
    entries_by_char = {}
    for entry in processed_entries:
        entries_by_char.setdefault(entry["character"], []).append(entry)

    for char, char_entries in entries_by_char.items():
        f5_cfg = voice_config[char].get("f5_tts", {})
        ref_strategy = args.ref_strategy if args.ref_strategy is not None else f5_cfg.get("ref_strategy", "auto")
        ref_duration = args.ref_duration if args.ref_duration is not None else f5_cfg.get("ref_duration", 5.0)

        ref_entry = select_reference_entry(char_entries, strategy=ref_strategy)
        ref_path, ref_text = extract_reference(
            str(output_dir), ref_entry, ref_duration=ref_duration
        )
        print(f"[f5-tts-voice] Reference audio for {char}: {ref_path}")
        print(f"[f5-tts-voice] Reference text for {char}: {ref_text}")

        generate_f5_tts(
            char_entries,
            ref_path,
            ref_text,
            str(output_dir),
            speed=f5_cfg.get("speed", 1.0),
            seed=f5_cfg.get("seed"),
            model=model,
        )

    episode_assets_audio = episode / "assets" / "audio"
    install_f5_outputs(processed_entries, str(output_dir), str(episode_assets_audio))

    print("[f5-tts-voice] Done.")


if __name__ == "__main__":
    main()
