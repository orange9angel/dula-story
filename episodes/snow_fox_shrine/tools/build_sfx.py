#!/usr/bin/env python3
"""Synthesize the SFX assets for snow_fox_shrine (all deterministic, seeded).

Outputs (48 kHz mono PCM16, assets/audio/sfx/):

- wind_snow.wav       102s bed: lowpassed pink-noise winter wind with slow
                      swells + a faint high "snow hush" layer.
- footsteps_snow.wav  ~4.4s: 6 soft snow crunches (bandpassed noise bursts +
                      low thuds), alternating emphasis.
- cloth_rustle.wav    0.7s: three quick bandpassed-noise swells.
- fox_yip.wav         0.7s: two descending chirps ("kya-kya") with vibrato
                      and a breath of noise.
- temple_bell.wav     6.0s: distant temple bell, 110 Hz fundamental + partials
                      with long decays, lowpassed, two soft echo tails.

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from scipy import signal

EPISODE = Path(__file__).resolve().parents[1]
SFX_DIR = EPISODE / "assets" / "audio" / "sfx"
DULA_ENGINE_TOOLS = Path("D:/opensource/movie/dula-engine/tools")

SAMPLE_RATE = 48000
SEED = 20260814


def write_wav(path: Path, samples: np.ndarray) -> None:
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio.base import write_wav_mono

    write_wav_mono(path, samples, SAMPLE_RATE)
    print(f"  wrote {path.name} ({len(samples) / SAMPLE_RATE:.3f}s)")


def pink(n: int, rng: np.random.Generator) -> np.ndarray:
    """Simple Voss-ish pink noise via cumulative filtered white."""
    white = rng.standard_normal(n)
    b, a = signal.butter(1, 0.04)
    body = signal.lfilter(b, a, white)
    return body / (np.max(np.abs(body)) + 1e-9)


def make_wind_snow() -> None:
    rng = np.random.default_rng(SEED)
    n = 102 * SAMPLE_RATE
    t = np.arange(n) / SAMPLE_RATE
    wind = pink(n, rng)
    sos = signal.butter(3, 700, "lowpass", fs=SAMPLE_RATE, output="sos")
    wind = signal.sosfilt(sos, wind)
    swell = 0.65 + 0.35 * np.sin(2 * np.pi * 0.043 * t + 1.2) * np.sin(2 * np.pi * 0.011 * t)
    wind = wind * swell
    # Snow hush: very soft high-frequency whisper.
    hush = rng.standard_normal(n)
    sos_hi = signal.butter(2, 6000, "highpass", fs=SAMPLE_RATE, output="sos")
    hush = signal.sosfilt(sos_hi, hush) * 0.012
    out = wind * 0.5 + hush
    fade = int(2.5 * SAMPLE_RATE)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    write_wav(SFX_DIR / "wind_snow.wav", out.astype(np.float32))


def make_footsteps_snow() -> None:
    rng = np.random.default_rng(SEED + 1)
    n = int(4.4 * SAMPLE_RATE)
    out = np.zeros(n)
    sos_crunch = signal.butter(4, [800, 2600], "bandpass", fs=SAMPLE_RATE, output="sos")
    for i in range(6):
        start = int((0.15 + i * 0.68) * SAMPLE_RATE)
        length = int(0.14 * SAMPLE_RATE)
        burst = rng.standard_normal(length)
        crunch = signal.sosfilt(sos_crunch, burst)
        env = np.exp(-np.linspace(0, 5.0, length))
        env[: int(0.012 * SAMPLE_RATE)] = np.linspace(0, 1, int(0.012 * SAMPLE_RATE))
        amp = 0.55 if i % 2 == 0 else 0.42
        out[start:start + length] += crunch * env * amp
        # Soft low compression thud under each crunch.
        thud_len = int(0.09 * SAMPLE_RATE)
        thud_t = np.arange(thud_len) / SAMPLE_RATE
        thud = np.sin(2 * np.pi * 75 * thud_t) * np.exp(-thud_t * 45) * 0.18
        out[start:start + thud_len] += thud
    out[-int(0.4 * SAMPLE_RATE):] *= np.linspace(1, 0, int(0.4 * SAMPLE_RATE))
    write_wav(SFX_DIR / "footsteps_snow.wav", out.astype(np.float32))


def make_cloth_rustle() -> None:
    rng = np.random.default_rng(SEED + 2)
    n = int(0.7 * SAMPLE_RATE)
    out = np.zeros(n)
    sos = signal.butter(3, [1400, 4200], "bandpass", fs=SAMPLE_RATE, output="sos")
    for i, (offset, width, amp) in enumerate([(0.02, 0.16, 0.5), (0.22, 0.12, 0.38), (0.40, 0.2, 0.45)]):
        start = int(offset * SAMPLE_RATE)
        length = int(width * SAMPLE_RATE)
        burst = signal.sosfilt(sos, rng.standard_normal(length))
        env = np.sin(np.linspace(0, np.pi, length)) ** 1.5
        out[start:start + length] += burst * env * amp
    write_wav(SFX_DIR / "cloth_rustle.wav", out.astype(np.float32))


def make_fox_yip() -> None:
    rng = np.random.default_rng(SEED + 3)
    n = int(0.75 * SAMPLE_RATE)
    out = np.zeros(n)
    for i, (offset, f0, f1, amp) in enumerate([(0.05, 1500, 950, 0.5), (0.38, 1350, 880, 0.42)]):
        length = int(0.16 * SAMPLE_RATE)
        t = np.arange(length) / SAMPLE_RATE
        sweep = np.linspace(f0, f1, length)
        phase = np.cumsum(sweep) / SAMPLE_RATE * 2 * np.pi
        vib = 1 + 0.012 * np.sin(2 * np.pi * 28 * t)
        tone = np.sin(phase * vib) + 0.35 * np.sin(phase * 2 * vib)
        breath = rng.standard_normal(length) * 0.06
        env = np.exp(-t * 22)
        env[: int(0.008 * SAMPLE_RATE)] = np.linspace(0, 1, int(0.008 * SAMPLE_RATE))
        start = int(offset * SAMPLE_RATE)
        out[start:start + length] += (tone + breath) * env * amp
    write_wav(SFX_DIR / "fox_yip.wav", out.astype(np.float32))


def make_temple_bell() -> None:
    n = int(6.0 * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    out = np.zeros(n)
    partials = [(110.0, 1.0, 0.55), (220.7, 0.45, 0.30), (304.4, 0.32, 0.22),
                (447.7, 0.18, 0.14), (594.0, 0.10, 0.08)]
    for freq, amp, decay_rate in partials:
        detune = 1 + 0.002 * np.sin(freq)
        out += np.sin(2 * np.pi * freq * detune * t) * np.exp(-t * decay_rate) * amp
    # Soft strike: 40 ms raised-cosine attack instead of an instant onset.
    attack = int(0.04 * SAMPLE_RATE)
    out[:attack] *= np.linspace(0, 1, attack) ** 2
    # Distance: lowpass + two faint echo tails.
    sos = signal.butter(3, 2400, "lowpass", fs=SAMPLE_RATE, output="sos")
    out = signal.sosfilt(sos, out)
    for delay_s, echo_amp in [(0.31, 0.16), (0.62, 0.07)]:
        d = int(delay_s * SAMPLE_RATE)
        out[d:] += out[:-d] * echo_amp
    peak = np.max(np.abs(out))
    write_wav(SFX_DIR / "temple_bell.wav", (out / peak * 0.8).astype(np.float32))


def main() -> None:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    print("building snow_fox_shrine SFX...")
    make_wind_snow()
    make_footsteps_snow()
    make_cloth_rustle()
    make_fox_yip()
    make_temple_bell()
    print("done.")


if __name__ == "__main__":
    main()
