#!/usr/bin/env python3
"""Generate deterministic basketball and gym Foley."""

from __future__ import annotations

import wave
import subprocess
from pathlib import Path

import numpy as np


SAMPLE_RATE = 48_000
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "audio" / "sfx"
SOURCE_DIR = OUTPUT_DIR / "sources"
RNG = np.random.default_rng(20260720)


def envelope(length: int, attack: float, release: float) -> np.ndarray:
    result = np.ones(length, dtype=np.float64)
    attack_samples = min(length, max(1, int(attack * SAMPLE_RATE)))
    release_samples = min(length, max(1, int(release * SAMPLE_RATE)))
    result[:attack_samples] *= np.sin(np.linspace(0, np.pi / 2, attack_samples)) ** 2
    result[-release_samples:] *= np.cos(np.linspace(0, np.pi / 2, release_samples)) ** 2
    return result


def band_noise(duration: float, low_hz: float, high_hz: float) -> np.ndarray:
    length = int(duration * SAMPLE_RATE)
    noise = RNG.normal(0, 1, length)
    spectrum = np.fft.rfft(noise)
    frequencies = np.fft.rfftfreq(length, 1 / SAMPLE_RATE)
    shoulder = max(40.0, (high_hz - low_hz) * 0.12)
    gain = np.clip((frequencies - (low_hz - shoulder)) / shoulder, 0, 1)
    gain *= np.clip(((high_hz + shoulder) - frequencies) / shoulder, 0, 1)
    filtered = np.fft.irfft(spectrum * gain, n=length)
    peak = np.max(np.abs(filtered)) or 1.0
    return filtered / peak


def add_echo(signal: np.ndarray, delay: float, gain: float) -> np.ndarray:
    offset = int(delay * SAMPLE_RATE)
    result = signal.copy()
    if offset < len(signal):
        result[offset:] += signal[:-offset] * gain
    return result


def decode_real_sample(name: str, start: float = 0.0, duration: float | None = None) -> np.ndarray:
    """Decode a checked-in CC0 field recording to 48 kHz mono float PCM."""
    source = SOURCE_DIR / name
    if not source.is_file():
        raise FileNotFoundError(
            f"Missing real Foley source: {source}. See sources/LICENSES.md."
        )
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{start:.3f}",
        "-i",
        str(source),
    ]
    if duration is not None:
        command.extend(["-t", f"{duration:.3f}"])
    command.extend(["-ar", str(SAMPLE_RATE), "-ac", "1", "-f", "f32le", "pipe:1"])
    result = subprocess.run(command, check=True, capture_output=True)
    return np.frombuffer(result.stdout, dtype="<f4").astype(np.float64)


def fft_bandpass(signal: np.ndarray, low_hz: float, high_hz: float) -> np.ndarray:
    """Softly remove preview rumble and codec hiss without flattening impacts."""
    if len(signal) == 0:
        return signal
    spectrum = np.fft.rfft(signal)
    frequencies = np.fft.rfftfreq(len(signal), 1 / SAMPLE_RATE)
    low_shoulder = max(20.0, low_hz * 0.5)
    high_shoulder = max(250.0, high_hz * 0.12)
    gain = np.clip((frequencies - (low_hz - low_shoulder)) / low_shoulder, 0, 1)
    gain *= np.clip(((high_hz + high_shoulder) - frequencies) / high_shoulder, 0, 1)
    return np.fft.irfft(spectrum * gain, n=len(signal))


def pad_to(signal: np.ndarray, duration: float) -> np.ndarray:
    length = int(duration * SAMPLE_RATE)
    if len(signal) >= length:
        return signal[:length]
    return np.pad(signal, (0, length - len(signal)))


def recorded_basketball_hit() -> np.ndarray:
    """One real basketball/floor contact, widened with restrained gym reflections."""
    hit = decode_real_sample("highpixel_basketball_bounce_cc0_preview.mp3")
    hit = fft_bandpass(hit, 42, 10_500)
    hit = pad_to(hit, 0.48)
    hit = add_echo(hit, 0.072, 0.15)
    hit = add_echo(hit, 0.149, 0.065)
    return hit


def basketball_hit(duration: float = 0.46, strength: float = 1.0) -> np.ndarray:
    return pad_to(recorded_basketball_hit(), duration) * strength


def gym_roomtone() -> np.ndarray:
    duration = 30.0
    length = int(duration * SAMPLE_RATE)
    time = np.arange(length) / SAMPLE_RATE
    air = band_noise(duration, 70, 1_600) * 0.036
    distant = band_noise(duration, 1_100, 5_200) * 0.008
    hum = (
        np.sin(2 * np.pi * 50 * time) * 0.006
        + np.sin(2 * np.pi * 100 * time) * 0.003
        + np.sin(2 * np.pi * 0.075 * time) * 0.008
    )
    return (air + distant + hum) * envelope(length, 0.8, 1.2)


def sneaker_squeak() -> np.ndarray:
    duration = 0.36
    length = int(duration * SAMPLE_RATE)
    time = np.arange(length) / SAMPLE_RATE
    phase = 2 * np.pi * (2_050 * time + 0.5 * 1_900 / duration * time**2)
    chirp = np.sin(phase) + 0.38 * np.sin(phase * 1.37)
    friction = band_noise(duration, 1_650, 6_200)
    flutter = 0.62 + 0.38 * np.sin(2 * np.pi * 24 * time) ** 2
    return (0.58 * chirp + 0.62 * friction) * flutter * envelope(length, 0.018, 0.11)


def basketball_swish() -> np.ndarray:
    # The outdoor recording contains the actual ball/rim/nylon interaction.
    # A quieter CC0 net recording restores close net fibres; neither layer is
    # a noise-model imitation.
    ball_and_net = decode_real_sample(
        "fattirewhitey_outdoor_basketball_shot_cc0_preview.mp3",
        start=0.14,
        duration=0.82,
    )
    close_net = decode_real_sample(
        "hann90_basketball_net_swish_cc0_preview.mp3",
        start=0.14,
        duration=0.72,
    )
    duration = 0.84
    ball_and_net = pad_to(fft_bandpass(ball_and_net, 120, 11_500), duration)
    close_net = pad_to(fft_bandpass(close_net, 650, 12_500), duration)
    signal = ball_and_net * 0.86 + close_net * 0.24
    signal = add_echo(signal, 0.096, 0.075)
    return signal * envelope(len(signal), 0.006, 0.13)


def gym_door_open() -> np.ndarray:
    duration = 0.92
    length = int(duration * SAMPLE_RATE)
    time = np.arange(length) / SAMPLE_RATE
    creak_phase = 2 * np.pi * (185 * time + 22 * np.sin(2 * np.pi * 1.7 * time))
    creak = np.sin(creak_phase) * (0.45 + 0.55 * np.sin(2 * np.pi * 7.2 * time) ** 2)
    creak *= envelope(length, 0.06, 0.18)
    friction = band_noise(duration, 95, 1_850) * envelope(length, 0.04, 0.2)
    latch = np.zeros(length)
    for click_time, gain in ((0.03, 0.8), (0.72, 0.45)):
        offset = int(click_time * SAMPLE_RATE)
        tail = min(length - offset, int(0.07 * SAMPLE_RATE))
        click_t = np.arange(tail) / SAMPLE_RATE
        latch[offset : offset + tail] += (
            np.sin(2 * np.pi * 720 * click_t) + band_noise(tail / SAMPLE_RATE, 900, 7_000)[:tail]
        ) * np.exp(-click_t * 58) * gain
    return 0.25 * creak + 0.34 * friction + 0.55 * latch


def ball_bounce() -> np.ndarray:
    # Use a separate real large-space take for the loose final bounce so its
    # distance and decay differ naturally from the close controlled dribbles.
    signal = decode_real_sample(
        "ecfike_basketball_large_space_cc0_preview.mp3",
        start=0.0,
        duration=0.78,
    )
    signal = fft_bandpass(signal, 42, 10_500)
    return signal * envelope(len(signal), 0.004, 0.12)


def write_wav(name: str, signal: np.ndarray, peak_db: float = -1.0) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    signal = np.nan_to_num(signal.astype(np.float64))
    signal = np.tanh(signal * 1.18)
    peak = np.max(np.abs(signal)) or 1.0
    target_peak = 10 ** (peak_db / 20)
    pcm = np.clip(signal / peak * target_peak, -1, 1)
    pcm16 = (pcm * 32767).astype('<i2')
    path = OUTPUT_DIR / name
    with wave.open(str(path), 'wb') as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm16.tobytes())
    print(f"{path.name}: {len(signal) / SAMPLE_RATE:.2f}s")


def main() -> None:
    write_wav('gym_roomtone.wav', gym_roomtone(), peak_db=-20.0)
    write_wav('basketball_dribble.wav', basketball_hit(), peak_db=-2.0)
    write_wav('ball_bounce.wav', ball_bounce(), peak_db=-2.5)
    write_wav('sneaker_squeak.wav', sneaker_squeak(), peak_db=-4.0)
    write_wav('basketball_swish.wav', basketball_swish(), peak_db=-3.0)
    write_wav('gym_door_open.wav', gym_door_open(), peak_db=-4.0)


if __name__ == '__main__':
    main()
