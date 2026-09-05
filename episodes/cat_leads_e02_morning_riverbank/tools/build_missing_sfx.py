#!/usr/bin/env python3
"""Generate the SFX assets E02's script.story references but that have no
source recording: morning_sparrows, door_slide, footsteps_grass, river_wind,
river_water. Reused from E01 (copied, not built here): cat_meow(.wav/_soft),
cat_purr, footsteps_day_street, room_tone_morning (copy of E01 room_tone_day).

Provenance per file (mirrored in assets/audio/sfx/README.md):

- morning_sparrows.wav  Synthesized here: clusters of short FM chirps
                        (4.2->3.6 kHz sweeps, 70-120 ms, 2-4 per cluster) at
                        seeded times over 30.5 s, 1.5 s fades, seed 20260827.
- door_slide.wav        Synthesized here: band-passed noise slide (500-2400 Hz
                        sweep up, 0.9 s) + soft contact thud at the end; 1.3 s.
- footsteps_grass.wav   Synthesized here: 6 soft low-passed noise steps
                        (700 Hz LP, 90 ms, irregular seeded spacing); 3.2 s.
- river_wind.wav        Synthesized here: 500 Hz low-passed pink-ish noise bed
                        with two slow raised-cosine swells (~8-11 s); 33.5 s.
- river_water.wav       Synthesized here: 250-900 Hz band noise with seeded
                        gurgle AM (2-5 Hz) and slow ripple swells; 33.5 s.

All outputs are 48 kHz mono PCM16 in assets/audio/sfx/. Deterministic: fixed
seeds everywhere, re-running reproduces identical files.

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
SEED = 20260827


def write_wav(path: Path, samples: np.ndarray) -> None:
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio.base import write_wav_mono

    write_wav_mono(path, samples, SAMPLE_RATE)
    print(f"  wrote {path.name} ({len(samples) / SAMPLE_RATE:.3f}s)")


def _fade(samples: np.ndarray, seconds: float) -> np.ndarray:
    n = int(seconds * SAMPLE_RATE)
    samples[:n] *= np.linspace(0.0, 1.0, n)
    samples[-n:] *= np.linspace(1.0, 0.0, n)
    return samples


def _chirp(rng: np.random.Generator, duration: float) -> np.ndarray:
    """One sparrow chirp: downward FM sweep with a fast attack."""
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    f0 = 4200.0 + rng.uniform(-250.0, 250.0)
    f1 = 3600.0 + rng.uniform(-200.0, 200.0)
    phase = 2 * np.pi * (f0 * t + (f1 - f0) * t * t / (2 * duration))
    tone = np.sin(phase)
    env = np.sin(np.pi * np.clip(t / duration, 0.0, 1.0)) ** 2
    return tone * env


def make_morning_sparrows() -> None:
    """Seeded clusters of FM chirps; quiet morning bed."""
    duration = 30.5
    n = int(round(duration * SAMPLE_RATE))
    rng = np.random.default_rng(SEED)
    out = np.zeros(n)
    # Deterministic cluster start times across the bed.
    cluster_starts = [0.8, 3.4, 6.1, 9.8, 12.5, 15.2, 18.9, 21.6, 24.3, 27.1, 29.2]
    for start in cluster_starts:
        chirps = int(rng.integers(2, 5))
        for k in range(chirps):
            at = start + k * rng.uniform(0.14, 0.22)
            d = float(rng.uniform(0.07, 0.12))
            i0 = int(at * SAMPLE_RATE)
            c = _chirp(rng, d) * rng.uniform(0.25, 0.45)
            i1 = min(n, i0 + len(c))
            out[i0:i1] += c[: i1 - i0]
    out /= max(np.max(np.abs(out)), 1e-9)
    out *= 0.5
    write_wav(SFX_DIR / "morning_sparrows.wav", _fade(out, 1.5))


def make_door_slide() -> None:
    """Sliding door: upward noise sweep + soft closing thud."""
    duration = 1.3
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)
    noise = rng.standard_normal(n)
    # Frequency sweep via time-varying bandpass approximated by two filtered
    # halves crossfaded low -> high.
    sos_lo = signal.butter(3, [400.0, 1200.0], btype="band", fs=SAMPLE_RATE, output="sos")
    sos_hi = signal.butter(3, [1200.0, 3200.0], btype="band", fs=SAMPLE_RATE, output="sos")
    lo = signal.sosfilt(sos_lo, noise)
    hi = signal.sosfilt(sos_hi, noise)
    xfade = np.clip((t - 0.1) / 0.8, 0.0, 1.0)
    slide = lo * (1 - xfade) + hi * xfade
    env = np.clip(t / 0.05, 0.0, 1.0) * np.clip((0.95 - t) / 0.25, 0.0, 1.0)
    slide *= env
    # Soft thud at 0.95 s.
    thud_t = np.arange(int(0.25 * SAMPLE_RATE)) / SAMPLE_RATE
    thud = np.sin(2 * np.pi * 110.0 * thud_t) * np.exp(-thud_t / 0.06)
    i0 = int(0.95 * SAMPLE_RATE)
    slide[i0 : i0 + len(thud)] += thud * 0.8
    slide /= max(np.max(np.abs(slide)), 1e-9)
    write_wav(SFX_DIR / "door_slide.wav", slide * 0.6)


def make_footsteps_grass() -> None:
    """Six soft grass steps, irregular seeded spacing."""
    duration = 3.2
    n = int(round(duration * SAMPLE_RATE))
    rng = np.random.default_rng(SEED)
    sos = signal.butter(3, 700.0, btype="low", fs=SAMPLE_RATE, output="sos")
    out = np.zeros(n)
    step_len = int(0.09 * SAMPLE_RATE)
    at = 0.15
    for _ in range(6):
        burst = signal.sosfilt(sos, rng.standard_normal(step_len))
        env = np.sin(np.pi * np.arange(step_len) / step_len) ** 2
        i0 = int(at * SAMPLE_RATE)
        out[i0 : i0 + step_len] += burst * env * rng.uniform(0.5, 0.8)
        at += float(rng.uniform(0.42, 0.52))
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "footsteps_grass.wav", out * 0.55)


def make_river_wind() -> None:
    """Low-passed noise bed with two slow swells; airy river wind."""
    duration = 33.5
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)
    sos = signal.butter(4, 500.0, btype="low", fs=SAMPLE_RATE, output="sos")
    bed = signal.sosfilt(sos, signal.sosfilt(sos, rng.standard_normal(n)))
    bed /= max(np.max(np.abs(bed)), 1e-9)
    swell = (0.55
             + 0.25 * np.sin(2 * np.pi * t / 8.0) ** 2
             + 0.20 * np.sin(2 * np.pi * t / 11.0 + 1.7) ** 2)
    out = bed * swell
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "river_wind.wav", _fade(out, 1.5) * 0.5)


def make_river_water() -> None:
    """Gentle river: band noise with seeded gurgle AM and slow ripple swells."""
    duration = 33.5
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)
    sos = signal.butter(4, [250.0, 900.0], btype="band", fs=SAMPLE_RATE, output="sos")
    bed = signal.sosfilt(sos, rng.standard_normal(n))
    bed /= max(np.max(np.abs(bed)), 1e-9)
    # Gurgle: sum of seeded slow AM wobbles.
    am = np.ones(n) * 0.6
    for _ in range(6):
        rate = float(rng.uniform(2.0, 5.0))
        phase = float(rng.uniform(0.0, 2 * np.pi))
        depth = float(rng.uniform(0.08, 0.2))
        am += depth * np.sin(2 * np.pi * rate * t + phase)
    ripple = 0.7 + 0.3 * np.sin(2 * np.pi * t / 9.5 + 0.6) ** 2
    out = bed * am * ripple
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "river_water.wav", _fade(out, 1.5) * 0.45)


def main() -> None:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    print("Building missing SFX assets (E02 morning riverbank)...")
    make_morning_sparrows()
    make_door_slide()
    make_footsteps_grass()
    make_river_wind()
    make_river_water()
    print("Done.")


if __name__ == "__main__":
    main()
