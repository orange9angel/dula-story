#!/usr/bin/env python3
"""Generate the SFX assets E03's script.story references but that have no
source recording: dusk_cicadas, footsteps_stone, footsteps_lane,
evening_street, lamp_hum, door_open. Reused from E02 (copied, not built
here): cat_meow, cat_purr, river_wind, river_water, footsteps_grass.

Provenance per file (mirrored in assets/audio/sfx/README.md):

- dusk_cicadas.wav    Synthesized here: evening cicada (higurashi-style)
                      clusters of ringing FM tones (~4 kHz carrier, tremolo
                      25-35 Hz, 0.6-1.4 s per call) at seeded times over
                      60.5 s, seed 20260828.
- footsteps_stone.wav Synthesized here: 6 firm steps on stone (2.2 kHz BP
                      noise, 70 ms, seeded spacing); 3.1 s.
- footsteps_lane.wav  Synthesized here: 5 soft pavement steps (1.1 kHz BP,
                      80 ms, seeded spacing); 2.1 s.
- evening_street.wav  Synthesized here: distant evening neighborhood bed —
                      low-passed noise floor + sparse TV-voice-like murmur
                      band (300-800 Hz AM) + a few faint dish clinks; 33 s.
- lamp_hum.wav        Synthesized here: 100 Hz mains hum + 3.4 kHz faint
                      ballast ring, slow amplitude wobble; 18 s.
- door_open.wav       Synthesized here: wooden slide (band noise sweep
                      400-1800 Hz, 0.7 s) + soft latch knock at start; 1.1 s.

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
SEED = 20260828


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


def _cicada_call(rng: np.random.Generator, duration: float) -> np.ndarray:
    """One evening cicada call: ringing high tone with fast tremolo, slow swell."""
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    carrier = 3900.0 + rng.uniform(-200.0, 200.0)
    tremolo_rate = 28.0 + rng.uniform(-4.0, 6.0)
    tone = np.sin(2 * np.pi * carrier * t)
    tone *= 0.55 + 0.45 * np.sin(2 * np.pi * tremolo_rate * t)
    # Slow swell envelope: fade in, sustain, fade out.
    env = np.sin(np.pi * np.clip(t / duration, 0.0, 1.0)) ** 1.5
    return tone * env


def make_dusk_cicadas() -> None:
    """Sparse evening cicada calls over a 60 s bed (higurashi feel)."""
    duration = 60.5
    n = int(round(duration * SAMPLE_RATE))
    rng = np.random.default_rng(SEED)
    out = np.zeros(n)
    call_starts = [1.2, 5.8, 9.4, 14.1, 18.7, 23.2, 27.8, 32.4, 36.9, 41.5,
                   46.0, 50.6, 55.1, 58.4]
    for start in call_starts:
        d = float(rng.uniform(0.6, 1.4))
        call = _cicada_call(rng, d) * rng.uniform(0.2, 0.38)
        i0 = int(start * SAMPLE_RATE)
        i1 = min(n, i0 + len(call))
        out[i0:i1] += call[: i1 - i0]
        # Occasional answering call a beat later, quieter.
        if rng.random() < 0.4:
            d2 = float(rng.uniform(0.5, 1.0))
            call2 = _cicada_call(rng, d2) * rng.uniform(0.10, 0.18)
            j0 = int((start + d + rng.uniform(0.3, 0.8)) * SAMPLE_RATE)
            j1 = min(n, j0 + len(call2))
            out[j0:j1] += call2[: j1 - j0]
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "dusk_cicadas.wav", _fade(out, 2.0) * 0.5)


def _steps(name: str, count: int, band: tuple[float, float], step_ms: int,
           spacing: tuple[float, float], duration: float, gain: float) -> None:
    n = int(round(duration * SAMPLE_RATE))
    rng = np.random.default_rng(SEED)
    sos = signal.butter(3, list(band), btype="band", fs=SAMPLE_RATE, output="sos")
    out = np.zeros(n)
    step_len = int(step_ms / 1000 * SAMPLE_RATE)
    at = 0.15
    for _ in range(count):
        burst = signal.sosfilt(sos, rng.standard_normal(step_len))
        env = np.sin(np.pi * np.arange(step_len) / step_len) ** 2
        i0 = int(at * SAMPLE_RATE)
        out[i0 : i0 + step_len] += burst * env * rng.uniform(0.55, 0.85)
        at += float(rng.uniform(*spacing))
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / name, out * gain)


def make_footsteps_stone() -> None:
    """Six firm steps on stone bridge."""
    _steps("footsteps_stone.wav", 6, (900.0, 2200.0), 70, (0.42, 0.52), 3.1, 0.5)


def make_footsteps_lane() -> None:
    """Five soft pavement steps in the lane."""
    _steps("footsteps_lane.wav", 5, (500.0, 1100.0), 80, (0.40, 0.48), 2.1, 0.5)


def make_evening_street() -> None:
    """Distant evening neighborhood: noise floor + murmur band + dish clinks."""
    duration = 33.0
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)
    # Low noise floor.
    sos_floor = signal.butter(4, 320.0, btype="low", fs=SAMPLE_RATE, output="sos")
    floor = signal.sosfilt(sos_floor, rng.standard_normal(n))
    floor /= max(np.max(np.abs(floor)), 1e-9)
    floor *= 0.35 + 0.10 * np.sin(2 * np.pi * t / 13.0) ** 2
    # Distant TV/voice murmur: band-limited noise with slow speech-like AM.
    sos_voice = signal.butter(3, [300.0, 800.0], btype="band", fs=SAMPLE_RATE, output="sos")
    murmur = signal.sosfilt(sos_voice, rng.standard_normal(n))
    murmur /= max(np.max(np.abs(murmur)), 1e-9)
    speech_am = 0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t + 0.8) ** 2
    speech_am *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 7.3 + 2.0) ** 2
    murmur *= speech_am * 0.16
    # A few faint dish clinks.
    out = floor * 0.5 + murmur
    for start in [4.2, 11.7, 19.3, 27.8]:
        for k in range(int(rng.integers(1, 3))):
            f = 2600.0 + rng.uniform(-500.0, 700.0)
            d = 0.06
            m = int(d * SAMPLE_RATE)
            tt = np.arange(m) / SAMPLE_RATE
            clink = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.025)
            i0 = int((start + k * rng.uniform(0.08, 0.2)) * SAMPLE_RATE)
            out[i0 : i0 + m] += clink * rng.uniform(0.03, 0.06)
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "evening_street.wav", _fade(out, 1.5) * 0.5)


def make_lamp_hum() -> None:
    """Door lamp: 100 Hz mains hum + faint ballast ring, slow wobble."""
    duration = 18.0
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    hum = np.sin(2 * np.pi * 100.0 * t) + 0.4 * np.sin(2 * np.pi * 200.0 * t)
    ring = 0.15 * np.sin(2 * np.pi * 3400.0 * t)
    out = hum + ring
    out *= 0.8 + 0.2 * np.sin(2 * np.pi * t / 5.7) ** 2
    out /= max(np.max(np.abs(out)), 1e-9)
    write_wav(SFX_DIR / "lamp_hum.wav", _fade(out, 1.0) * 0.3)


def make_door_open() -> None:
    """Wooden door sliding open: latch knock + mid band noise sweep."""
    duration = 1.1
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)
    noise = rng.standard_normal(n)
    sos_lo = signal.butter(3, [300.0, 900.0], btype="band", fs=SAMPLE_RATE, output="sos")
    sos_hi = signal.butter(3, [900.0, 1800.0], btype="band", fs=SAMPLE_RATE, output="sos")
    lo = signal.sosfilt(sos_lo, noise)
    hi = signal.sosfilt(sos_hi, noise)
    xfade = np.clip((t - 0.15) / 0.6, 0.0, 1.0)
    slide = lo * (1 - xfade) + hi * xfade
    env = np.clip(t / 0.06, 0.0, 1.0) * np.clip((0.85 - t) / 0.3, 0.0, 1.0)
    slide *= env
    # Latch knock at the very start.
    knock_t = np.arange(int(0.12 * SAMPLE_RATE)) / SAMPLE_RATE
    knock = np.sin(2 * np.pi * 180.0 * knock_t) * np.exp(-knock_t / 0.03)
    slide[: len(knock)] += knock * 0.9
    slide /= max(np.max(np.abs(slide)), 1e-9)
    write_wav(SFX_DIR / "door_open.wav", slide * 0.6)


def main() -> None:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    print("Building missing SFX assets (E03 dusk homecoming)...")
    make_dusk_cicadas()
    make_footsteps_stone()
    make_footsteps_lane()
    make_evening_street()
    make_lamp_hum()
    make_door_open()
    print("Done.")


if __name__ == "__main__":
    main()
