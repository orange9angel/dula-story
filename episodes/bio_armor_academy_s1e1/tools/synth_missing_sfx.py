#!/usr/bin/env python3
"""One-off procedural synthesis for the SFX that had no repo source.

Generates (48 kHz mono PCM16, into assets/audio/sfx/):
  wind_dusk.wav       62 s looping wind bed (dusk schoolyard)
  crow_caws.wav       3 harsh crow caws, ~1.8 s
  distant_traffic.wav 6 s far-away traffic rumble with pass-by swells
  floor_crack.wav     concrete crack + debris, ~1.4 s
  heartbeat_core.wav  bio-core lub-dub x3, ~3.4 s

Copied from other episodes (not synthesized here):
  shinai_whoosh.wav    <- last_deposit .../whoosh_fast.wav
  bio_impact_metal.wav <- last_deposit .../impact_metal.wav

Requires numpy (dula-story venv).
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parents[1] / "assets" / "audio" / "sfx"
rng = np.random.default_rng(20260823)


def write_wav(name: str, samples: np.ndarray) -> None:
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype("<i2")
    path = OUT / name
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {path.name}  {len(samples) / SR:.2f}s")


def brown_noise(n: int) -> np.ndarray:
    white = rng.standard_normal(n)
    brown = np.cumsum(white)
    brown -= np.linspace(brown[0], brown[-1], n)
    peak = np.max(np.abs(brown))
    return brown / peak if peak > 0 else brown


def one_pole_lowpass(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    a = 1.0 - np.exp(-2.0 * np.pi * cutoff_hz / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def fast_lowpass(x: np.ndarray, cutoff_hz: float, taps: int = 257) -> np.ndarray:
    """FFT FIR lowpass (brick-ish), faster than the sample loop for long beds."""
    n = len(x)
    size = 1 << (n + taps).bit_length()
    t = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * cutoff_hz / SR * t) * np.blackman(taps)
    h /= h.sum()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)
    return y[:n]


def fade(x: np.ndarray, fade_in: float, fade_out: float) -> np.ndarray:
    n_in, n_out = int(fade_in * SR), int(fade_out * SR)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def wind_dusk() -> None:
    dur = 62.0
    n = int(dur * SR)
    bed = fast_lowpass(rng.standard_normal(n), 500.0)
    bed += 0.6 * fast_lowpass(rng.standard_normal(n), 180.0)
    # slow gust LFOs so the bed breathes
    t = np.arange(n) / SR
    gust = 0.55 + 0.25 * np.sin(2 * np.pi * 0.07 * t) + 0.2 * np.sin(2 * np.pi * 0.023 * t + 1.3)
    bed *= gust
    bed /= np.max(np.abs(bed))
    write_wav("wind_dusk.wav", fade(bed * 0.5, 2.0, 3.0))


def crow_caws() -> None:
    """Three 'kaa' caws: harsh AM noise burst with a falling pitch contour."""
    dur = 1.8
    n = int(dur * SR)
    out = np.zeros(n)
    for start_s, caw_len in ((0.05, 0.32), (0.5, 0.28), (1.05, 0.4)):
        m = int(caw_len * SR)
        t = np.arange(m) / SR
        # falling saw-ish carrier 950 -> 600 Hz
        f = 950.0 - 350.0 * (t / caw_len)
        phase = np.cumsum(2 * np.pi * f / SR)
        carrier = np.sign(np.sin(phase)) * 0.5 + 0.5 * np.sin(phase)
        # harsh amplitude modulation ~28 Hz (crow rasp)
        am = 0.6 + 0.4 * np.sin(2 * np.pi * 28 * t)
        env = np.minimum(t / 0.02, 1.0) * np.exp(-t / (caw_len * 0.55))
        noise = rng.standard_normal(m) * 0.25
        caw = (carrier * 0.7 + noise) * am * env
        s = int(start_s * SR)
        out[s : s + m] += caw
    out = fast_lowpass(out, 4200.0)
    out /= np.max(np.abs(out))
    write_wav("crow_caws.wav", fade(out * 0.75, 0.01, 0.2))


def distant_traffic() -> None:
    dur = 6.0
    n = int(dur * SR)
    rumble = fast_lowpass(rng.standard_normal(n), 120.0) * 0.8
    rumble += fast_lowpass(rng.standard_normal(n), 350.0) * 0.35
    t = np.arange(n) / SR
    # two distant pass-by swells
    swell = (
        0.45
        + 0.3 * np.exp(-((t - 1.6) ** 2) / 0.35)
        + 0.35 * np.exp(-((t - 4.3) ** 2) / 0.5)
    )
    rumble *= swell
    rumble /= np.max(np.abs(rumble))
    write_wav("distant_traffic.wav", fade(rumble * 0.5, 0.8, 1.5))


def floor_crack() -> None:
    """Sharp concrete crack: fast noise snap, low thud, debris tail."""
    dur = 1.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    # initial snap (broadband, 8 ms)
    snap = rng.standard_normal(n) * np.exp(-t / 0.008) * 0.9
    # secondary cracks
    for st, decay in ((0.07, 0.02), (0.16, 0.03), (0.3, 0.05)):
        snap += rng.standard_normal(n) * np.exp(-np.maximum(t - st, 0) / decay) * (t >= st) * 0.4
    # low thud
    f = 90.0 * np.exp(-t / 0.15) + 35.0
    thud = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.25) * 0.8
    # debris rumble tail
    debris = fast_lowpass(rng.standard_normal(n), 250.0) * np.exp(-t / 0.45) * 0.45
    out = fast_lowpass(snap, 6000.0) + thud + debris
    out /= np.max(np.abs(out))
    write_wav("floor_crack.wav", fade(out * 0.85, 0.001, 0.25))


def heartbeat_core() -> None:
    """Bio-core heartbeat: lub-dub pairs, slightly detuned/metallic shimmer."""
    dur = 3.4
    n = int(dur * SR)
    out = np.zeros(n)
    bpm = 72.0
    beat = 60.0 / bpm
    for b in range(4):
        for off, gain, freq in ((0.0, 1.0, 55.0), (0.18, 0.7, 48.0)):
            st_s = b * beat + off
            m = int(0.28 * SR)
            t = np.arange(m) / SR
            f = freq * np.exp(-t / 0.12) + 28.0
            thump = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.09)
            # faint metallic shimmer (the 'core' is bio-mechanical)
            thump += 0.15 * np.sin(2 * np.pi * 820.0 * t) * np.exp(-t / 0.03)
            s = int(st_s * SR)
            if s + m <= n:
                out[s : s + m] += thump * gain
    out /= np.max(np.abs(out))
    write_wav("heartbeat_core.wav", fade(out * 0.8, 0.005, 0.6))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    wind_dusk()
    crow_caws()
    distant_traffic()
    floor_crack()
    heartbeat_core()
