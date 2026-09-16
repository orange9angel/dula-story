#!/usr/bin/env python3
"""Synthesize the two SFX assets E10's script.story references that have no
source recording: rain_shower, awning_drips. Reused from E08 (copied, not
built here): river_water, wind_leaves, morning_birds.

- rain_shower.wav   Steady shower bed: FFT-shaped broadband noise (low body
                    + strong 1-6 kHz patter band) with slow amplitude drift,
                    plus seeded random droplet transients. 50.0 s
                    (scheduled 14-62 s = 48 s + margin), seed 20261014.
- awning_drips.wav  Irregular drips off an awning edge: sine "plip" bursts
                    (1.4-3.6 kHz, 25-90 ms exponential decay) at seeded
                    non-uniform times over a faint post-rain hiss. 13.0 s
                    (scheduled 53-64 s = 11 s + margin), same seed.

Outputs are 48 kHz mono PCM16 in assets/audio/sfx/. Deterministic: fixed
seed everywhere, re-running reproduces identical files. Mirrors the E04
build_missing_sfx.py approach (dula-engine procedural_audio.write_wav_mono).

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

EPISODE = Path(__file__).resolve().parents[1]
SFX_DIR = EPISODE / "assets" / "audio" / "sfx"
DULA_ENGINE_TOOLS = Path("D:/opensource/movie/dula-engine/tools")

SAMPLE_RATE = 48000
SEED = 20261014


def write_wav(path: Path, samples: np.ndarray) -> None:
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio.base import write_wav_mono

    write_wav_mono(path, samples, SAMPLE_RATE)
    print(f"  wrote {path.name} ({len(samples) / SAMPLE_RATE:.3f}s)")


def _shaped_noise(rng: np.random.Generator, n: int, shape_fn) -> np.ndarray:
    white = rng.standard_normal(n)
    spectrum = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n, 1.0 / SAMPLE_RATE)
    shaped = np.fft.irfft(spectrum * shape_fn(freqs), n)
    return shaped / max(np.max(np.abs(shaped)), 1e-9)


def _drip(rng: np.random.Generator, f_lo: float = 1400.0, f_hi: float = 3600.0) -> np.ndarray:
    """One water drip: a sine plip that pitches slightly down as it decays."""
    length = rng.uniform(0.025, 0.090)
    m = int(length * SAMPLE_RATE)
    t = np.arange(m) / SAMPLE_RATE
    f0 = rng.uniform(f_lo, f_hi)
    phase = 2 * np.pi * f0 * t * (1.0 - 0.35 * t / length)
    tone = np.sin(phase)
    envelope = np.exp(-t / (length * 0.28))
    envelope *= np.minimum(1.0, t / 0.002)  # 2 ms click-free attack
    return tone * envelope


def make_rain_shower() -> None:
    """Continuous shower: shaped noise bed + sparse droplet transients."""
    seconds = 50.0
    n = int(round(seconds * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)

    def shape(f: np.ndarray) -> np.ndarray:
        body = 1.0 / (1.0 + (f / 320.0) ** 2)            # low rumble body
        patter = 0.9 * np.exp(-((f - 3200.0) / 2400.0) ** 2)  # rain patter band
        patter *= f > 300.0
        return body * 0.45 + patter

    bed = _shaped_noise(rng, n, shape)
    # Slow drift so the shower breathes instead of sounding static.
    env = 1.0 + 0.08 * np.sin(2 * np.pi * 0.07 * t) + 0.05 * np.sin(2 * np.pi * 0.163 * t + 1.3)
    bed *= env

    # Sparse larger droplet transients on top of the bed.
    out = bed * 0.55
    for _ in range(int(seconds * 14)):
        drip = _drip(rng, 1800.0, 5200.0) * rng.uniform(0.03, 0.10)
        i0 = int(rng.uniform(0.0, seconds) * SAMPLE_RATE)
        i1 = min(n, i0 + len(drip))
        out[i0:i1] += drip[: i1 - i0]

    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "rain_shower.wav", out * 0.6)


def make_awning_drips() -> None:
    """Sparse irregular drips off the awning over a faint post-rain hiss."""
    seconds = 13.0
    n = int(round(seconds * SAMPLE_RATE))
    rng = np.random.default_rng(SEED + 1)

    out = np.zeros(n)
    at = rng.uniform(0.05, 0.4)
    while at < seconds - 0.1:
        drip = _drip(rng) * rng.uniform(0.25, 0.9)
        i0 = int(at * SAMPLE_RATE)
        i1 = min(n, i0 + len(drip))
        out[i0:i1] += drip[: i1 - i0]
        at += rng.uniform(0.12, 0.75)  # irregular rhythm, no grid

    hiss = _shaped_noise(rng, n, lambda f: np.exp(-((f - 4200.0) / 2600.0) ** 2))
    result = out + hiss * 0.05
    result /= max(np.max(np.abs(result)), 1e-9)
    write_wav(SFX_DIR / "awning_drips.wav", result * 0.7)


def main() -> None:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    print("Building missing SFX assets (E10 waiting rain)...")
    make_rain_shower()
    make_awning_drips()
    print("Done.")


if __name__ == "__main__":
    main()
