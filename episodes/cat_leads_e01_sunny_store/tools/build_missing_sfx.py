#!/usr/bin/env python3
"""Generate the SFX assets this episode's script.story references but that have
no source recording: room_tone_day, summer_cicadas, store_door_chime,
store_ambience. Also bridges footsteps_day_street from the existing
footsteps_concrete.wav recording (the story tag uses the former name).

Provenance per file (mirrored in assets/audio/sfx/README.md):

- room_tone_day.wav   dula-engine procedural generator ``room_tone``
                      (tools/procedural_audio/registry.py), duration=13.5s,
                      intensity=0.35, seed=20260728.
- summer_cicadas.wav  Synthesized here: 3 voices of band-passed noise
                      (3.8-5.2 kHz, butter 4) gated by ~25-35 Hz raised pulse
                      trains, under staggered 4-9 s raised-cosine swells;
                      30.5 s, 1.5 s fades, seeded (rng 20260728).
- store_door_chime.wav Synthesized here: two-tone convenience-store bell
                      (ding 987.77 Hz, dong 739.99 Hz, 0.30 s apart), bell
                      partials 1/2/2.76/5.4 with exponential decays; 1.6 s.
- store_ambience.wav  Synthesized here: low-passed pink-noise bed (600 Hz)
                      + 60/120 Hz mains hum + seeded faint scanner beeps
                      (1.8 kHz, 70 ms) at 3.1/9.7/16.2/24.8 s; 30.5 s.
- footsteps_day_street.wav  ffmpeg copy of footsteps_concrete.wav
                      (recorded asset) resampled to 48 kHz; the story's
                      ``footsteps_day_street`` tag name is kept as-is.

All outputs are 48 kHz mono PCM16 in assets/audio/sfx/. Deterministic: fixed
seeds everywhere, re-running reproduces identical files.

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

EPISODE = Path(__file__).resolve().parents[1]
SFX_DIR = EPISODE / "assets" / "audio" / "sfx"
DULA_ENGINE_TOOLS = Path("D:/opensource/movie/dula-engine/tools")

SAMPLE_RATE = 48000
SEED = 20260728


def write_wav(path: Path, samples: np.ndarray) -> None:
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio.base import write_wav_mono

    write_wav_mono(path, samples, SAMPLE_RATE)
    print(f"  wrote {path.name} ({len(samples) / SAMPLE_RATE:.3f}s)")


def make_room_tone_day() -> None:
    """dula-engine procedural ``room_tone`` generator, unchanged."""
    sys.path.insert(0, str(DULA_ENGINE_TOOLS))
    from procedural_audio import registry

    samples = registry.generate("room_tone", duration=13.5, intensity=0.35, seed=SEED)
    write_wav(SFX_DIR / "room_tone_day.wav", np.asarray(samples))


def make_summer_cicadas() -> None:
    """Three AM-gated band-noise cicada voices under slow swells."""
    duration = 30.5
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)
    sos = signal.butter(4, [3800.0, 5200.0], btype="band", fs=SAMPLE_RATE, output="sos")

    out = np.zeros(n)
    # (pulse rate Hz, swell start s, swell length s, gain)
    voices = [(25.0, 0.5, 8.0, 1.0), (31.0, 6.0, 6.5, 0.8), (38.0, 14.0, 9.0, 0.9),
              (27.0, 22.0, 7.5, 0.85), (33.0, 3.0, 5.0, 0.55)]
    for pulse_hz, start, length, gain in voices:
        noise = signal.sosfilt(sos, rng.standard_normal(n))
        # Raised pulse train -> the buzzing "zii" gating of a cicada.
        am = np.clip(0.5 + 0.5 * np.sin(2 * np.pi * pulse_hz * t), 0.0, 1.0) ** 3
        # Raised-cosine swell window.
        swell = np.zeros(n)
        i0 = int(start * SAMPLE_RATE)
        i1 = min(n, i0 + int(length * SAMPLE_RATE))
        swell[i0:i1] = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(i1 - i0) / (i1 - i0))
        out += noise * am * swell * gain

    out /= max(np.max(np.abs(out)), 1e-9)
    out *= 0.5
    fade = int(1.5 * SAMPLE_RATE)
    out[:fade] *= np.linspace(0.0, 1.0, fade)
    out[-fade:] *= np.linspace(1.0, 0.0, fade)
    write_wav(SFX_DIR / "summer_cicadas.wav", out)


def bell_note(t: np.ndarray, freq: float, decay: float) -> np.ndarray:
    """Struck-bell partial stack with per-partial exponential decay."""
    note = np.zeros_like(t)
    for ratio, amp, decay_scale in ((1.0, 1.0, 1.0), (2.0, 0.35, 0.6),
                                    (2.76, 0.18, 0.45), (5.4, 0.08, 0.25)):
        note += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay * decay_scale))
    attack = int(0.005 * SAMPLE_RATE)
    note[:attack] *= np.linspace(0.0, 1.0, attack)
    return note


def make_store_door_chime() -> None:
    """Two-tone 'ding-dong' door chime."""
    duration = 1.6
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    out = bell_note(t, 987.77, 0.45)  # ding (B5)
    offset = int(0.30 * SAMPLE_RATE)
    out[offset:] += bell_note(t[: n - offset], 739.99, 0.55)  # dong (F#5)
    out /= max(np.max(np.abs(out)), 1e-9)
    out *= 0.7
    write_wav(SFX_DIR / "store_door_chime.wav", out)


def make_store_ambience() -> None:
    """Pink-noise store bed + mains hum + faint seeded scanner beeps."""
    duration = 30.5
    n = int(round(duration * SAMPLE_RATE))
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(SEED)

    # Pink-ish bed: white noise through a steep 600 Hz lowpass, twice.
    sos_lp = signal.butter(4, 600.0, btype="low", fs=SAMPLE_RATE, output="sos")
    bed = signal.sosfilt(sos_lp, signal.sosfilt(sos_lp, rng.standard_normal(n)))
    bed *= 0.25 / max(np.max(np.abs(bed)), 1e-9)

    hum = 0.030 * np.sin(2 * np.pi * 60.0 * t) + 0.015 * np.sin(2 * np.pi * 120.0 * t)

    out = bed + hum
    # Faint checkout scanner beeps (deterministic times).
    for at in (3.1, 9.7, 16.2, 24.8):
        i0 = int(at * SAMPLE_RATE)
        blen = int(0.070 * SAMPLE_RATE)
        bt = np.arange(blen) / SAMPLE_RATE
        beep = 0.06 * np.sin(2 * np.pi * 1800.0 * bt)
        ramp = int(0.005 * SAMPLE_RATE)
        beep[:ramp] *= np.linspace(0.0, 1.0, ramp)
        beep[-ramp:] *= np.linspace(1.0, 0.0, ramp)
        out[i0 : i0 + blen] += beep

    out /= max(np.max(np.abs(out)), 1e-9)
    out *= 0.5
    fade = int(0.5 * SAMPLE_RATE)
    out[:fade] *= np.linspace(0.0, 1.0, fade)
    out[-fade:] *= np.linspace(1.0, 0.0, fade)
    write_wav(SFX_DIR / "store_ambience.wav", out)


def make_footsteps_day_street() -> None:
    """Bridge the story's tag name to the recorded footsteps_concrete.wav."""
    src = SFX_DIR / "footsteps_concrete.wav"
    dst = SFX_DIR / "footsteps_day_street.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-acodec", "pcm_s16le",
         "-ar", str(SAMPLE_RATE), "-ac", "1", str(dst)],
        check=True, capture_output=True,
    )
    print(f"  wrote {dst.name} (48 kHz copy of {src.name})")


def main() -> None:
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    print("Building missing SFX assets...")
    make_room_tone_day()
    make_summer_cicadas()
    make_store_door_chime()
    make_store_ambience()
    make_footsteps_day_street()
    print("Done.")


if __name__ == "__main__":
    main()
