#!/usr/bin/env python3
"""
Generate a high-energy 150 BPM rave BGM for worm_dance.

The episode references assets/audio/music/gym_beat.wav, so this script writes
that exact file. It intentionally uses only numpy + Python stdlib.
"""

import os
import wave

import numpy as np


SAMPLE_RATE = 48000
DURATION = 55.0
BPM = 150
BEAT = 60.0 / BPM
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'music')
RNG = np.random.default_rng(20260608)


def note_freq(note):
    semitones = {
        'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4,
        'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2,
    }
    octave = int(note[-1])
    name = note[:-1]
    return 440.0 * (2 ** ((semitones[name] + (octave - 4) * 12) / 12.0))


def add_clip(track, start_sec, clip, gain=1.0):
    start = int(start_sec * SAMPLE_RATE)
    if start >= len(track):
        return
    end = min(start + len(clip), len(track))
    track[start:end] += clip[:end - start] * gain


def envelope(length, attack=0.01, decay=0.05, sustain=0.65, release=0.06):
    n = int(max(1, length))
    a = min(n, int(attack * SAMPLE_RATE))
    d = min(max(0, n - a), int(decay * SAMPLE_RATE))
    r = min(max(0, n - a - d), int(release * SAMPLE_RATE))
    s = max(0, n - a - d - r)

    env = np.zeros(n)
    cursor = 0
    if a:
        env[cursor:cursor + a] = np.linspace(0, 1, a, endpoint=False)
        cursor += a
    if d:
        env[cursor:cursor + d] = np.linspace(1, sustain, d, endpoint=False)
        cursor += d
    if s:
        env[cursor:cursor + s] = sustain
        cursor += s
    if r:
        env[cursor:cursor + r] = np.linspace(sustain, 0, r, endpoint=False)
    return env


def sine(freq, duration, amp=1.0, phase=0.0):
    t = np.arange(int(duration * SAMPLE_RATE)) / SAMPLE_RATE
    return np.sin(2 * np.pi * freq * t + phase) * amp


def saw(freq, duration, amp=1.0):
    t = np.arange(int(duration * SAMPLE_RATE)) / SAMPLE_RATE
    return (2 * ((freq * t) % 1.0) - 1.0) * amp


def square(freq, duration, amp=1.0):
    t = np.arange(int(duration * SAMPLE_RATE)) / SAMPLE_RATE
    return np.sign(np.sin(2 * np.pi * freq * t)) * amp


def kick():
    duration = 0.34
    t = np.arange(int(duration * SAMPLE_RATE)) / SAMPLE_RATE
    sweep = 44 + 112 * np.exp(-t * 34)
    phase = np.cumsum(2 * np.pi * sweep / SAMPLE_RATE)
    body = np.sin(phase) * np.exp(-t * 11)
    click = np.sin(2 * np.pi * 1350 * t) * np.exp(-t * 95)
    return body * 1.15 + click * 0.16


def snare():
    duration = 0.22
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, n)
    snap = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 16)
    body = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 10)
    return (noise * np.exp(-t * 24) * 0.55 + snap * 0.42 + body * 0.22)


def clap():
    duration = 0.26
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, n)
    bursts = (
        np.exp(-np.maximum(0, t - 0.000) * 70) +
        np.exp(-np.maximum(0, t - 0.018) * 70) * (t > 0.018) +
        np.exp(-np.maximum(0, t - 0.036) * 70) * (t > 0.036)
    )
    return noise * bursts * 0.24


def hat(open_hat=False):
    duration = 0.19 if open_hat else 0.055
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, n)
    metallic = (
        square(6400, duration, 0.35) +
        square(9100, duration, 0.22) +
        square(11800, duration, 0.16)
    )
    return (noise * 0.72 + metallic) * np.exp(-t * (12 if open_hat else 58)) * 0.22


def bass_note(freq, duration):
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    bend = 1.0 + 0.018 * np.exp(-t * 9)
    phase = np.cumsum(2 * np.pi * freq * bend / SAMPLE_RATE)
    sub = np.sin(phase) * 0.88
    grit = saw(freq * 2, duration, 0.26)
    env = envelope(n, attack=0.004, decay=0.08, sustain=0.62, release=0.04)
    return (sub + grit) * env


def chord(freqs, duration, amp=0.16):
    n = int(duration * SAMPLE_RATE)
    out = np.zeros(n)
    for f in freqs:
        out += saw(f, duration, amp)
        out += square(f * 0.5, duration, amp * 0.32)
    out *= envelope(n, attack=0.02, decay=0.12, sustain=0.5, release=0.18)
    return out / max(1, len(freqs))


def lead(freq, duration):
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    vib = 1 + 0.012 * np.sin(2 * np.pi * 7.2 * t)
    phase = np.cumsum(2 * np.pi * freq * vib / SAMPLE_RATE)
    tone = np.sin(phase) * 0.48 + saw(freq * 2, duration, 0.22)
    tone += np.sin(phase * 0.5) * 0.14
    return tone * envelope(n, attack=0.006, decay=0.06, sustain=0.58, release=0.06)


def riser(duration):
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, n)
    sweep = np.sin(2 * np.pi * (450 + 3200 * (t / duration) ** 2) * t)
    env = np.linspace(0, 1, n) ** 1.6
    return (noise * 0.16 + sweep * 0.22) * env


def sidechain_curve(total_samples):
    t = np.arange(total_samples) / SAMPLE_RATE
    beat_phase = (t / BEAT) % 1.0
    pump = 0.55 + 0.45 * (1 - np.exp(-beat_phase * 7.5))
    return pump


def generate_bgm():
    total = int(DURATION * SAMPLE_RATE)
    drums = np.zeros(total)
    bass = np.zeros(total)
    synth = np.zeros(total)
    melody = np.zeros(total)
    fx = np.zeros(total)

    total_beats = int(DURATION / BEAT) + 1
    bass_pattern = ['F#1', 'F#1', 'A1', 'C#2', 'E2', 'C#2', 'A1', 'G#1']
    chord_prog = [
        ['F#2', 'A2', 'C#3'],
        ['D2', 'F#2', 'A2'],
        ['E2', 'G#2', 'B2'],
        ['C#2', 'E2', 'G#2'],
    ]
    lead_pattern = [
        ('C#5', 0.5), ('E5', 0.5), ('F#5', 0.5), ('A5', 0.5),
        ('G#5', 0.5), ('F#5', 0.5), ('E5', 0.5), ('C#5', 0.5),
        ('A5', 0.25), ('G#5', 0.25), ('F#5', 0.5), ('E5', 0.5),
        ('C#6', 0.5), ('A5', 0.5), ('G#5', 0.5), ('F#5', 0.5),
    ]

    for beat in range(total_beats):
        t = beat * BEAT
        beat_in_bar = beat % 4

        add_clip(drums, t, kick(), 1.0)
        if beat_in_bar in (1, 3):
          add_clip(drums, t, snare(), 0.78)
          add_clip(drums, t + 0.018, clap(), 0.9)

        add_clip(drums, t, hat(open_hat=False), 0.62)
        add_clip(drums, t + BEAT * 0.5, hat(open_hat=beat_in_bar in (1, 3)), 0.82)
        add_clip(drums, t + BEAT * 0.75, hat(open_hat=False), 0.36)

        if beat % 2 == 0:
            note = bass_pattern[(beat // 2) % len(bass_pattern)]
            add_clip(bass, t, bass_note(note_freq(note), BEAT * 1.75), 0.95)

        if beat % 8 == 0:
            add_clip(synth, t, chord([note_freq(n) for n in chord_prog[(beat // 8) % len(chord_prog)]], BEAT * 7.5), 0.95)

        if beat % 16 == 14:
            add_clip(fx, t, riser(BEAT * 1.8), 0.72)

    lead_time = 8 * BEAT
    idx = 0
    while lead_time < DURATION - 1.2:
        note, beats = lead_pattern[idx % len(lead_pattern)]
        dur = beats * BEAT
        add_clip(melody, lead_time, lead(note_freq(note), dur * 0.92), 0.64)
        lead_time += dur
        idx += 1

    pump = sidechain_curve(total)
    bass *= pump
    synth *= pump * 0.92
    melody *= (0.78 + pump * 0.22)

    # Short crowd-hit accents every 8 bars.
    for bar in range(2, int(DURATION / (BEAT * 4)), 4):
        t = bar * 4 * BEAT
        accent = sine(880, 0.16, 0.26) * envelope(int(0.16 * SAMPLE_RATE), 0.001, 0.025, 0.25, 0.08)
        add_clip(fx, t, accent, 0.9)
        add_clip(fx, t, snare(), 0.45)

    master = drums * 0.95 + bass * 0.92 + synth * 0.62 + melody * 0.55 + fx * 0.62

    # Saturation and limiter.
    master = np.tanh(master * 1.25)
    peak = np.max(np.abs(master))
    if peak > 0:
        master = master / peak * 0.94

    fade_len = int(1.0 * SAMPLE_RATE)
    master[:int(0.03 * SAMPLE_RATE)] *= np.linspace(0, 1, int(0.03 * SAMPLE_RATE))
    master[-fade_len:] *= np.linspace(1, 0, fade_len)

    return (np.clip(master, -1, 1) * 32767).astype(np.int16)


def save_wav(data, filename):
    with wave.open(filename, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(data.tobytes())


if __name__ == '__main__':
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f'Generating {DURATION:.0f}s / {BPM} BPM rave BGM...')
    bgm = generate_bgm()
    output_path = os.path.join(OUTPUT_DIR, 'gym_beat.wav')
    save_wav(bgm, output_path)
    print(f'Saved: {output_path}')
