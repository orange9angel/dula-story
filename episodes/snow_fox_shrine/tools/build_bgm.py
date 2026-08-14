#!/usr/bin/env python3
"""Compose the BGM for snow_fox_shrine: "snow_lullaby", a slow 3/4 music-box
piece in D major over a soft pad. Fully deterministic (seeded), ~102s with
fade in/out, written to assets/audio/music/snow_lullaby.wav.

Structure: 8-bar AABA lullaby, two passes (second pass adds a high sparkle
harmony on the A sections), 72 BPM, music box = sine + 2 harmonics with a
1.2s exponential decay; pad = detuned soft sines on the chord roots, lowpassed.

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from scipy import signal

EPISODE = Path(__file__).resolve().parents[1]
MUSIC_DIR = EPISODE / "assets" / "audio" / "music"
DULA_ENGINE_TOOLS = Path("D:/opensource/movie/dula-engine/tools")

SAMPLE_RATE = 48000
DURATION = 102.0
BPM = 72
BEAT = 60.0 / BPM          # quarter note ~0.833s
BAR = BEAT * 3             # 3/4

# Note name -> semitone offset from A4=440.
def freq(name: str) -> float:
    NAMES = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4,
             "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    octave = int(name[-1])
    return 440.0 * 2 ** ((NAMES[name[:-1]] + (octave - 4) * 12) / 12)

# AABA melody (8 bars), one entry per bar: list of (beat_in_bar, note, beats).
MELODY_A = [
    [(0, "D5", 1.5), (1.5, "F#5", 1.5)],
    [(0, "A5", 2), (2, "B5", 1)],
    [(0, "A5", 1.5), (1.5, "F#5", 1.5)],
    [(0, "D5", 3)],
    [(0, "E5", 1.5), (1.5, "G5", 1.5)],
    [(0, "B5", 2), (2, "A5", 1)],
    [(0, "G5", 1.5), (1.5, "E5", 1.5)],
    [(0, "D5", 3)],
]
MELODY_B = [
    [(0, "F#5", 1.5), (1.5, "A5", 1.5)],
    [(0, "B5", 2), (2, "D6", 1)],
    [(0, "C#6", 1.5), (1.5, "A5", 1.5)],
    [(0, "B5", 3)],
    [(0, "A5", 1.5), (1.5, "G5", 1.5)],
    [(0, "F#5", 2), (2, "E5", 1)],
    [(0, "D5", 1.5), (1.5, "E5", 1.5)],
    [(0, "D5", 3)],
]
CHORDS = ["D3", "D3", "B2", "G2", "E3", "G2", "A2", "D3"]  # one root per bar
FORM = [MELODY_A, MELODY_A, MELODY_B, MELODY_A]  # AABA


def music_box_note(out: np.ndarray, start: float, note: str, beats: float,
                   amp: float, rng: np.random.Generator) -> None:
    f = freq(note)
    length = min(beats * BEAT + 1.2, DURATION - start)
    if length <= 0:
        return
    n = int(length * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    tone = (np.sin(2 * np.pi * f * t)
            + 0.32 * np.sin(2 * np.pi * f * 2 * t)
            + 0.10 * np.sin(2 * np.pi * f * 3.01 * t))
    env = np.exp(-t * 2.6)
    attack = int(0.006 * SAMPLE_RATE)
    env[:attack] = np.linspace(0, 1, attack)
    s = int(start * SAMPLE_RATE)
    out[s:s + n] += tone * env * amp


def main() -> None:
    rng = np.random.default_rng(20260814)
    n_total = int(DURATION * SAMPLE_RATE)
    out = np.zeros(n_total)

    # Melody: AABA x2; second pass adds a soft octave sparkle on A sections.
    pass_len = 8 * BAR
    for p in range(2):
        for section_index, section in enumerate(FORM):
            for bar_index, bar in enumerate(section):
                bar_start = p * pass_len + section_index * 8 * BAR + bar_index * BAR
                for beat, note, beats in bar:
                    music_box_note(out, bar_start + beat * BEAT, note, beats, 0.30, rng)
                    if p == 1 and section_index != 2:
                        octave_up = note[:-1] + str(int(note[-1]) + 1)
                        music_box_note(out, bar_start + beat * BEAT, octave_up,
                                       beats, 0.07, rng)
                # Pad: chord root, one per bar, very soft.
                root = CHORDS[bar_index]
                f = freq(root)
                n_pad = int(BAR * SAMPLE_RATE)
                t = np.arange(n_pad) / SAMPLE_RATE
                pad = (np.sin(2 * np.pi * f * t)
                       + np.sin(2 * np.pi * f * 1.004 * t)) * 0.5
                pad_env = np.sin(np.linspace(0, np.pi, n_pad)) ** 1.2
                s = int(bar_start * SAMPLE_RATE)
                out[s:s + n_pad] += pad * pad_env * 0.055

    sos = signal.butter(2, 5200, "lowpass", fs=SAMPLE_RATE, output="sos")
    out = signal.sosfilt(sos, out)
    fade = int(3.0 * SAMPLE_RATE)
    out[:fade] *= np.linspace(0, 1, fade) ** 1.5
    out[-fade:] *= np.linspace(1, 0, fade) ** 1.5
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.55

    MUSIC_DIR.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio.base import write_wav_mono

    write_wav_mono(str(MUSIC_DIR / "snow_lullaby.wav"), out.astype(np.float32), SAMPLE_RATE)
    print(f"wrote snow_lullaby.wav ({DURATION}s)")


if __name__ == "__main__":
    main()
