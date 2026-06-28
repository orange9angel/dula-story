#!/usr/bin/env python3
"""Generate simple placeholder SFX for monkey_zoo_human_show."""
import math
import os
import struct
import wave

SR = 48000
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "materials", "sfx")
os.makedirs(OUT_DIR, exist_ok=True)


def write_wav(path, samples):
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        for s in samples:
            v = int(max(-1.0, min(1.0, s)) * 32767)
            w.writeframes(struct.pack('<h', v))
    print(f"Generated {path}")


def noise(n, amp=1.0):
    # Simple deterministic pseudo-random noise
    samples = []
    seed = 12345
    for i in range(n):
        seed = (seed * 1103515245 + 12345) % (2 ** 31)
        samples.append((seed / (2 ** 30) - 1.0) * amp)
    return samples


def envelope(n, attack, decay, sustain, release):
    """ADSR-ish envelope as list of length n."""
    env = []
    for i in range(n):
        t = i / n
        if t < attack:
            env.append(t / attack)
        elif t < attack + decay:
            env.append(1.0 - (1.0 - sustain) * (t - attack) / decay)
        elif t < 1.0 - release:
            env.append(sustain)
        else:
            env.append(sustain * (1.0 - (t - (1.0 - release)) / release))
    return env


def generate_camera_shutter():
    duration = 0.15
    n = int(SR * duration)
    samples = []
    env = envelope(n, 0.02, 0.03, 0.0, 0.10)
    nse = noise(n, 0.6)
    for i in range(n):
        t = i / SR
        click = math.sin(2 * math.pi * 800 * t) * math.exp(-t / 0.01) * 0.5
        samples.append((click + nse[i]) * env[i])
    return samples


def generate_visitor_laugh():
    duration = 1.0
    n = int(SR * duration)
    samples = [0.0] * n
    # Three "ha-ha-ha" bursts
    for burst in range(3):
        start = int(SR * (0.1 + burst * 0.28))
        end = min(n, start + int(SR * 0.16))
        for i in range(start, end):
            t = (i - start) / SR
            freq = 280 + 120 * math.sin(t * 40)
            env = math.sin(math.pi * t / (0.16)) if 0.16 > 0 else 0
            samples[i] += math.sin(2 * math.pi * freq * t) * env * 0.35
    return samples


def generate_monkey_applause():
    duration = 2.0
    n = int(SR * duration)
    samples = [0.0] * n
    # Rhythmic claps every ~0.18s
    for clap_time in [0.05, 0.22, 0.40, 0.56, 0.74, 0.91, 1.08, 1.25, 1.42, 1.60]:
        start = int(SR * clap_time)
        length = int(SR * 0.08)
        for i in range(length):
            t = i / SR
            amp = math.exp(-t / 0.02)
            nse = ((i * 1103515245 + 12345) % (2 ** 31)) / (2 ** 30) - 1.0
            samples[start + i] += nse * amp * 0.45
    return samples


def generate_zoo_crowd():
    duration = 12.0
    n = int(SR * duration)
    samples = []
    nse = noise(n, 1.0)
    for i in range(n):
        t = i / SR
        # Slow modulation to simulate crowd swells
        mod = 0.55 + 0.45 * math.sin(2 * math.pi * 0.12 * t) * math.sin(2 * math.pi * 0.03 * t + 1)
        samples.append(nse[i] * mod * 0.12)
    return samples


def generate_jungle_birds():
    duration = 12.0
    n = int(SR * duration)
    samples = [0.0] * n
    # Several chirp events
    chirps = [1.2, 2.8, 4.5, 6.1, 7.4, 9.0, 10.5]
    for ct in chirps:
        start = int(SR * ct)
        length = int(SR * 0.25)
        for i in range(length):
            t = i / SR
            freq = 1800 + 600 * math.sin(t * 60)
            env = math.exp(-t / 0.06) * (0.5 + 0.5 * math.sin(2 * math.pi * 18 * t))
            samples[start + i] += math.sin(2 * math.pi * freq * t) * env * 0.15
    return samples


if __name__ == '__main__':
    gens = {
        'camera_shutter.wav': generate_camera_shutter,
        'visitor_laugh.wav': generate_visitor_laugh,
        'monkey_applause.wav': generate_monkey_applause,
        'zoo_crowd.wav': generate_zoo_crowd,
        'jungle_birds.wav': generate_jungle_birds,
    }
    for name, gen in gens.items():
        write_wav(os.path.join(OUT_DIR, name), gen())
