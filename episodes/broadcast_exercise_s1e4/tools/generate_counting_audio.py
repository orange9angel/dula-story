#!/usr/bin/env python3
"""
Generate counting audio for broadcast exercise.
Each number is spoken at precise beat intervals (0.95s).
Uses edge-tts for single digits, then concatenates with silence padding.
"""

import asyncio
import edge_tts
import json
import numpy as np
import wave
import os
import tempfile
import subprocess
import shutil

SAMPLE_RATE = 48000
BEAT_DURATION = 0.95  # seconds per beat
BEAT_SAMPLES = int(SAMPLE_RATE * BEAT_DURATION)

CHARACTER = "Bai"
DEFAULT_TTS_PARAMS = {
    "voice": "zh-CN-YunxiNeural",
    "rate": "+0%",
    "pitch": "+0Hz",
    "volume": "+0%",
}


def load_tts_params():
    episode_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    config_path = os.path.join(episode_dir, 'config', 'voice_config.json')
    params = DEFAULT_TTS_PARAMS.copy()

    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            voice_config = json.load(f)
        params.update(voice_config.get(CHARACTER, {}))

    return params


def read_mp3_to_numpy(filepath):
    """Convert MP3 to numpy array using ffmpeg."""
    # Create temp wav
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        subprocess.run([
            'ffmpeg', '-y', '-i', filepath,
            '-ar', str(SAMPLE_RATE), '-ac', '1', '-acodec', 'pcm_s16le',
            tmp_path
        ], capture_output=True, check=True)
        
        with wave.open(tmp_path, 'rb') as wf:
            data = wf.readframes(wf.getnframes())
            samples = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
        return samples
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def trim_silence(samples, threshold=0.012, pre_roll=0.02, tail_pad=0.08):
    """Remove TTS padding so each count lands on the beat boundary."""
    above = np.flatnonzero(np.abs(samples) >= threshold)
    if len(above) == 0:
        return samples

    start = max(0, above[0] - int(pre_roll * SAMPLE_RATE))
    end = min(len(samples), above[-1] + int(tail_pad * SAMPLE_RATE))
    return samples[start:end]


def save_wav(data, filename):
    data = np.clip(data, -1.0, 1.0)
    data_int16 = (data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(data_int16.tobytes())
    print(f"Saved: {filename} ({len(data)/SAMPLE_RATE:.2f}s)")


def apply_effect_to_wav(input_path, effect):
    """Apply ffmpeg rubberband/volume effect used by the main dialogue pipeline."""
    if not effect:
        return
    af_parts = []
    if effect.get("af"):
        af_parts.append(effect["af"])
    elif effect.get("rubberband"):
        af_parts.append(f"rubberband={effect['rubberband']}")
    if effect.get("volume") is not None:
        af_parts.append(f"volume={effect['volume']}")
    if not af_parts:
        return

    tmp_path = input_path + ".effect.wav"
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-af", ",".join(af_parts),
        "-ar", str(SAMPLE_RATE), "-ac", "1", "-acodec", "pcm_s16le",
        tmp_path,
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    shutil.move(tmp_path, input_path)
    print(f"  Applied effect: {','.join(af_parts)} -> {input_path}")


def save_counting_outputs(track, output_dir, effect=None):
    """Write counting to both music and sfx so either cue type can reference it."""
    music_path = os.path.join(output_dir, 'counting.wav')
    save_wav(track, music_path)
    apply_effect_to_wav(music_path, effect)

    sfx_dir = os.path.join(os.path.dirname(output_dir), 'sfx')
    os.makedirs(sfx_dir, exist_ok=True)
    sfx_path = os.path.join(sfx_dir, 'counting.wav')
    save_wav(track, sfx_path)
    apply_effect_to_wav(sfx_path, effect)


async def generate_digit_tts(digit, output_dir, tts_params):
    """Generate TTS for a single Chinese digit."""
    filepath = os.path.join(output_dir, f'digit_{digit}.mp3')
    if os.path.exists(filepath):
        os.remove(filepath)
    
    communicate = edge_tts.Communicate(
        text=digit,
        voice=tts_params['voice'],
        rate=tts_params.get('rate', '+0%'),
        pitch=tts_params.get('pitch', '+0Hz'),
        volume=tts_params.get('volume', '+0%'),
    )
    await communicate.save(filepath)
    print(f"Generated TTS: {digit}")
    return filepath


def create_counting_track(digits_audio, beat_duration=BEAT_DURATION):
    """
    Create counting track where each digit starts at a beat boundary.
    Digits are centered within their beat slot.
    """
    beat_samples = int(SAMPLE_RATE * beat_duration)
    total_beats = len(digits_audio)
    total_samples = beat_samples * total_beats
    track = np.zeros(total_samples)
    
    for i, digit_samples in enumerate(digits_audio):
        beat_start = i * beat_samples
        
        # Center the digit within the beat
        digit_len = len(digit_samples)
        if digit_len > beat_samples:
            # If digit is longer than a beat, truncate
            digit_samples = digit_samples[:beat_samples]
            digit_len = beat_samples
        
        # Place digit at start of beat (no centering to keep rhythm tight)
        # Or center it: offset = (beat_samples - digit_len) // 2
        offset = 0  # Start at beginning of beat for crisp rhythm
        
        end_idx = min(beat_start + offset + digit_len, total_samples)
        copy_len = end_idx - (beat_start + offset)
        
        if copy_len > 0:
            track[beat_start + offset:beat_start + offset + copy_len] = digit_samples[:copy_len]
    
    return track


async def main():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'music')
    os.makedirs(output_dir, exist_ok=True)
    tts_params = load_tts_params()
    print(f"Counting voice: {CHARACTER} / {tts_params['voice']}")
    
    # Chinese digits for counting.
    # Broadcast exercise counting uses the group number on beat 1:
    # 12345678, 22345678, 32345678, 42345678.
    digits = ['一', '二', '三', '四', '五', '六', '七', '八']
    group_heads = ['一', '二', '三', '四']
    
    # Generate or load TTS for each unique digit
    digit_cache = {}
    for d in digits:
        if d not in digit_cache:
            filepath = await generate_digit_tts(d, output_dir, tts_params)
            samples = trim_silence(read_mp3_to_numpy(filepath))
            digit_cache[d] = samples
            print(f"  Digit '{d}': {len(samples)/SAMPLE_RATE:.3f}s")
    
    # Build counting sequence for 4 groups.
    all_digits = []
    for group_head in group_heads:
        all_digits.extend([group_head, *digits[1:]])
    
    digits_audio = [digit_cache[d] for d in all_digits]
    
    print(f"\nGenerating counting track: {len(all_digits)} beats @ {BEAT_DURATION:.2f}s")
    track = create_counting_track(digits_audio)

    effect = tts_params.get("effect")
    save_counting_outputs(track, output_dir, effect)
    
    # Clean up temp digit files
    for d in digits:
        tmp = os.path.join(output_dir, f'digit_{d}.mp3')
        if os.path.exists(tmp):
            os.remove(tmp)
    
    print("Done!")


if __name__ == '__main__':
    asyncio.run(main())
