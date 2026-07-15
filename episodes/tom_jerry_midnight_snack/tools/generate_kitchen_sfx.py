#!/usr/bin/env python3
"""Generate deterministic kitchen ambience and slapstick spot effects."""

from __future__ import annotations

import argparse
import math
import random
import struct
import wave
from pathlib import Path


RATE = 48_000
TAU = math.tau


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = max((abs(value) for value in samples), default=1.0)
    gain = 0.94 / max(peak, 0.94)
    pcm = b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, value * gain)) * 32767))
        for value in samples
    )
    with wave.open(str(path), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm)


def blank(seconds: float) -> list[float]:
    return [0.0] * int(seconds * RATE)


def add(target: list[float], source: list[float], start: float = 0.0, gain: float = 1.0) -> None:
    offset = int(start * RATE)
    for index, value in enumerate(source):
        dst = offset + index
        if dst >= len(target):
            break
        target[dst] += value * gain


def ring(seconds: float, frequencies: tuple[float, ...], decay: float = 4.5,
         attack: float = 0.004, gain: float = 0.6) -> list[float]:
    out = blank(seconds)
    for i in range(len(out)):
        t = i / RATE
        envelope = min(1.0, t / attack) * math.exp(-t * decay)
        tone = sum(math.sin(TAU * freq * t) / (1 + idx * 0.7)
                   for idx, freq in enumerate(frequencies))
        out[i] = tone * envelope * gain / max(1, len(frequencies) * 0.5)
    return out


def noise_burst(seconds: float, decay: float = 20.0, gain: float = 0.5,
                low_tone: float | None = None) -> list[float]:
    rng = random.Random(20260716 + int(seconds * 1000) + int(decay * 10))
    out = blank(seconds)
    smooth = 0.0
    for i in range(len(out)):
        t = i / RATE
        smooth = smooth * 0.72 + rng.uniform(-1.0, 1.0) * 0.28
        value = smooth
        if low_tone:
            value += math.sin(TAU * low_tone * t) * 0.8
        out[i] = value * math.exp(-t * decay) * gain
    return out


def kitchen_roomtone() -> list[float]:
    rng = random.Random(117)
    out = blank(12.0)
    drift = 0.0
    for i in range(len(out)):
        t = i / RATE
        drift = drift * 0.997 + rng.uniform(-1.0, 1.0) * 0.003
        fridge = math.sin(TAU * 59.7 * t) * 0.025
        motor = math.sin(TAU * 119.4 * t + math.sin(TAU * 0.11 * t)) * 0.008
        air = drift * 0.018
        out[i] = fridge + motor + air
    fade = int(0.25 * RATE)
    for i in range(fade):
        factor = i / fade
        out[i] *= factor
        out[-1 - i] *= factor
    return out


def clock_tick() -> list[float]:
    out = blank(8.0)
    for second in range(8):
        tick = ring(0.055, (2350.0, 3150.0), decay=48, gain=0.42)
        add(out, tick, second + 0.05, 1.0 if second % 2 == 0 else 0.82)
    return out


def cloche_lift() -> list[float]:
    out = blank(0.9)
    add(out, ring(0.72, (420.0, 777.0, 1270.0), decay=5.2, gain=0.4), 0.08)
    add(out, noise_burst(0.22, decay=14, gain=0.13), 0.02)
    return out


def utensil_tink() -> list[float]:
    out = blank(0.65)
    add(out, ring(0.55, (1850.0, 2780.0, 4170.0), decay=9.0, gain=0.68), 0.02)
    return out


def cup_tap() -> list[float]:
    out = blank(0.7)
    add(out, ring(0.62, (690.0, 1120.0, 2060.0), decay=7.2, gain=0.58), 0.02)
    return out


def plate_wobble() -> list[float]:
    out = blank(1.5)
    for n, start in enumerate((0.0, 0.25, 0.47, 0.66, 0.82, 0.94)):
        add(out, ring(0.48, (710.0 + n * 19, 1440.0 + n * 31), decay=8 + n, gain=0.38), start)
    return out


def pan_clatter() -> list[float]:
    out = blank(1.35)
    for start, freq, gain in ((0.0, 480, 0.72), (0.18, 620, 0.58), (0.42, 390, 0.52)):
        add(out, noise_burst(0.3, decay=18, gain=0.34), start)
        add(out, ring(0.9, (freq, freq * 1.61, freq * 2.37), decay=4.5, gain=gain), start)
    return out


def bowl_drop() -> list[float]:
    out = blank(0.95)
    add(out, noise_burst(0.24, decay=15, gain=0.42, low_tone=88), 0.02)
    add(out, ring(0.82, (310.0, 540.0, 890.0), decay=5.8, gain=0.58), 0.04)
    return out


def timer_ding() -> list[float]:
    out = blank(1.9)
    for offset, gain in ((0.0, 0.76), (0.16, 0.62), (0.32, 0.48)):
        add(out, ring(1.45, (1320.0, 1980.0, 2640.0), decay=3.8, gain=gain), offset)
    return out


def crockery_crash() -> list[float]:
    out = blank(2.25)
    rng = random.Random(404)
    for n in range(11):
        start = 0.03 + n * 0.095 + rng.uniform(-0.025, 0.025)
        freq = rng.uniform(480, 1250)
        add(out, noise_burst(0.32, decay=16 + n, gain=0.28), start)
        add(out, ring(1.0, (freq, freq * 1.71, freq * 2.42), decay=5.5 + n * 0.25, gain=0.36), start)
    add(out, noise_burst(0.8, decay=5.0, gain=0.24, low_tone=62), 0.18)
    return out


def cake_splat() -> list[float]:
    out = blank(0.9)
    rng = random.Random(808)
    for i in range(len(out)):
        t = i / RATE
        wet = math.sin(TAU * (92 - 42 * min(1, t / 0.35)) * t)
        bubbles = rng.uniform(-1, 1) * math.exp(-t * 13)
        out[i] = (wet * 0.48 + bubbles * 0.3) * math.exp(-t * 5.2)
    return out


def footsteps_approach() -> list[float]:
    out = blank(5.0)
    starts = (0.25, 1.0, 1.7, 2.35, 2.95, 3.5, 4.0, 4.45)
    for n, start in enumerate(starts):
        gain = 0.18 + n * 0.055
        add(out, noise_burst(0.42, decay=12, gain=gain, low_tone=68), start)
    return out


def mouse_nibble() -> list[float]:
    out = blank(0.85)
    for start in (0.05, 0.18, 0.31, 0.47):
        add(out, noise_burst(0.08, decay=55, gain=0.34), start)
        add(out, ring(0.12, (2800.0, 3950.0), decay=30, gain=0.18), start)
    return out


GENERATORS = {
    "kitchen_roomtone": kitchen_roomtone,
    "clock_tick": clock_tick,
    "cloche_lift": cloche_lift,
    "utensil_tink": utensil_tink,
    "cup_tap": cup_tap,
    "plate_wobble": plate_wobble,
    "pan_clatter": pan_clatter,
    "bowl_drop": bowl_drop,
    "timer_ding": timer_ding,
    "crockery_crash": crockery_crash,
    "cake_splat": cake_splat,
    "footsteps_approach": footsteps_approach,
    "mouse_nibble": mouse_nibble,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    for name, generator in GENERATORS.items():
        path = args.output_dir / f"{name}.wav"
        write_wav(path, generator())
        print(path)


if __name__ == "__main__":
    main()
