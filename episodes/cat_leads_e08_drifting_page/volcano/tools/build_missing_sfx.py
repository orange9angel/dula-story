#!/usr/bin/env python3
"""Generate the two SFX assets E04's script.story references that have no
source recording: night_crickets, night_wind. Reused from E03 (copied, not
built here): cat_meow, cat_purr, door_open, footsteps_grass, footsteps_lane,
footsteps_stone, river_water, river_wind.

Provenance per file (mirrored in assets/audio/sfx/README.md):

- night_crickets.wav  Synthesized here: summer-night cricket bed. Higher and
                      finer than E03's dusk_cicadas: irregular clusters of
                      2-5 short pulses (~18-28 ms each, 4.3-5.8 kHz carrier,
                      sin^2 pulse envelope) at seeded non-uniform times, plus
                      a faint 3-7 kHz night-air hiss. 60.0 s seamless loop,
                      seed 20260829.
- night_wind.wav      Synthesized here: light, steady night breeze bed.
                      Lighter and steadier than river_wind: FFT-shaped
                      low-frequency noise (dominant < 240 Hz body + a faint
                      ~1.1 kHz airy band) with slow shallow amplitude LFOs
                      (integer cycles per 60 s). 60.0 s seamless loop,
                      seed 20260829.

Seamlessness: both beds are periodic by construction — the noise base is
circularly filtered via FFT (so sample 0 continues sample N-1), chirps are
placed with wrap-around (modulo) so clusters crossing the loop point land at
the start, and all amplitude LFOs run at integer cycles per 60 s. No end
fades are applied (a fade would break the loop).

All outputs are 48 kHz mono PCM16 in assets/audio/sfx/. Deterministic: fixed
seed everywhere, re-running reproduces identical files.

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
SEED = 20260829
LOOP_SECONDS = 60.0


def write_wav(path: Path, samples: np.ndarray) -> None:
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio.base import write_wav_mono

    write_wav_mono(path, samples, SAMPLE_RATE)
    print(f"  wrote {path.name} ({len(samples) / SAMPLE_RATE:.3f}s)")


def _periodic_noise(rng: np.random.Generator, n: int, shape_fn) -> np.ndarray:
    """White noise shaped in the frequency domain via circular FFT.

    Circular filtering keeps the block periodic, so looping the 60 s result
    has no seam click.
    """
    white = rng.standard_normal(n)
    spectrum = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n, 1.0 / SAMPLE_RATE)
    shaped = np.fft.irfft(spectrum * shape_fn(freqs), n)
    return shaped / max(np.max(np.abs(shaped)), 1e-9)


def _cricket_cluster(rng: np.random.Generator) -> np.ndarray:
    """One cricket chirp cluster: 2-5 short high-frequency pulses, irregular."""
    carrier = rng.uniform(4300.0, 5800.0)
    pulse_count = int(rng.integers(2, 6))
    pulse_len = rng.uniform(0.015, 0.028)
    gap = rng.uniform(0.030, 0.065)
    total = pulse_count * pulse_len + (pulse_count - 1) * gap
    n = int(total * SAMPLE_RATE)
    out = np.zeros(n)
    amp = 1.0
    at = 0.0
    for _ in range(pulse_count):
        m = int(pulse_len * SAMPLE_RATE)
        t = np.arange(m) / SAMPLE_RATE
        f = carrier * (1.0 + rng.uniform(-0.01, 0.01))
        pulse = np.sin(2 * np.pi * f * t)
        pulse *= np.sin(np.pi * np.arange(m) / m) ** 2  # fast in/out per pulse
        i0 = int(at * SAMPLE_RATE)
        if i0 >= n:  # gap jitter may push the last pulse(s) past the buffer
            break
        i1 = min(n, i0 + m)
        out[i0:i1] += pulse[: i1 - i0] * amp
        amp *= rng.uniform(0.82, 0.97)  # pulses decay within the cluster
        at += pulse_len + gap * rng.uniform(0.85, 1.2)
    return out


def make_night_crickets() -> None:
    """Irregular cricket chirp clusters over a faint hiss; 60 s seamless loop."""
    n = int(round(LOOP_SECONDS * SAMPLE_RATE))
    rng = np.random.default_rng(SEED)
    out = np.zeros(n)
    # Irregular rhythm: uniformly seeded cluster times, no regular grid.
    cluster_count = int(rng.integers(42, 58))
    for _ in range(cluster_count):
        cluster = _cricket_cluster(rng) * rng.uniform(0.15, 0.4)
        i0 = int(rng.uniform(0.0, LOOP_SECONDS) * SAMPLE_RATE) % n
        i1 = i0 + len(cluster)
        if i1 <= n:
            out[i0:i1] += cluster
        else:  # wrap across the loop point to keep the loop seamless
            head = n - i0
            out[i0:] += cluster[:head]
            out[: i1 - n] += cluster[head:]
    out /= max(np.max(np.abs(out)), 1e-9)
    # Faint night-air hiss bed (3-7 kHz), periodic by construction.
    hiss = _periodic_noise(
        rng, n, lambda f: np.exp(-((f - 5000.0) / 1800.0) ** 2)
    )
    result = out * 0.5 + hiss * 0.02
    write_wav(SFX_DIR / "night_crickets.wav", result)


def make_night_wind() -> None:
    """Light steady breeze: low-frequency body + faint airy band; 60 s loop."""
    n = int(round(LOOP_SECONDS * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)

    def shape(f: np.ndarray) -> np.ndarray:
        body = 1.0 / (1.0 + (f / 240.0) ** 2)          # soft low-frequency body
        air = 0.10 * np.exp(-((f - 1100.0) / 500.0) ** 2)  # faint airy whistle
        return body + air

    bed = _periodic_noise(rng, n, shape)
    # Slow, shallow LFOs at integer cycles per 60 s: periodic and steady.
    env = 1.0
    env += 0.10 * np.sin(2 * np.pi * 3 * t / LOOP_SECONDS + rng.uniform(0, 2 * np.pi))
    env += 0.07 * np.sin(2 * np.pi * 7 * t / LOOP_SECONDS + rng.uniform(0, 2 * np.pi))
    result = bed * env
    result /= max(np.max(np.abs(result)), 1e-9)
    write_wav(SFX_DIR / "night_wind.wav", result * 0.4)


def main() -> None:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    print("Building missing SFX assets (E04 firefly night)...")
    make_night_crickets()
    make_night_wind()
    print("Done.")


if __name__ == "__main__":
    main()
