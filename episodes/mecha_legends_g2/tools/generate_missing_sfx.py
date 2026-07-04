import math
import os
import random
import struct
import wave

SFX_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "audio", "sfx")
os.makedirs(SFX_DIR, exist_ok=True)


def _write_wav_mono(filepath, samples, sample_rate=48000):
    with wave.open(filepath, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for s in samples:
            v = int(s * 32767)
            v = max(-32768, min(32767, v))
            w.writeframes(struct.pack('<h', v))


def generate_laser_blast(filepath, duration=0.25, sample_rate=48000):
    """Sharp sci-fi laser shot: quick high-pitch chirp + noise tail."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Fast descending chirp (laser zip)
        freq = 1800 * math.exp(-t / 0.04) + 400
        chirp = math.sin(2 * math.pi * freq * t) * math.exp(-t / 0.05) * 0.55
        # Sharp noise burst
        noise = (random.random() * 2 - 1) * math.exp(-t / 0.03) * 0.45
        # Low thump
        thump = math.sin(2 * math.pi * 120 * t) * math.exp(-t / 0.03) * 0.25
        sample = (chirp + noise + thump) * 0.7
        samples.append(sample)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_plasma_rifle(filepath, duration=0.35, sample_rate=48000):
    """Plasma rifle burst: charged hum + crackling release."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Rising charge
        charge_freq = 300 + 1200 * min(1.0, t / 0.08)
        charge = math.sin(2 * math.pi * charge_freq * t) * math.exp(-t / 0.06) * 0.4
        # Crackle
        crackle = (random.random() * 2 - 1) * math.exp(-t / 0.05) * 0.35
        # Metallic ring
        ring = math.sin(2 * math.pi * 900 * t) * math.exp(-t / 0.08) * 0.2
        sample = (charge + crackle + ring) * 0.65
        samples.append(sample)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_explosion(filepath, duration=0.6, sample_rate=48000):
    """Medium explosion: low rumble + noise burst + tail."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Deep rumble with pitch drop
        rumble_freq = 80 * math.exp(-t / 0.12)
        rumble = math.sin(2 * math.pi * rumble_freq * t) * math.exp(-t / 0.15) * 0.6
        # Noise burst (heavy)
        noise = (random.random() * 2 - 1) * math.exp(-t / 0.08) * 0.5
        # Crackle
        crackle = (random.random() * 2 - 1) * math.exp(-t / 0.04) * (0.3 if t < 0.15 else 0.1)
        sample = (rumble + noise + crackle) * 0.7
        samples.append(sample)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_bullet_impact(filepath, duration=0.15, sample_rate=48000):
    """Bullet/metal impact: sharp ping + noise."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Metallic ping
        ping = math.sin(2 * math.pi * 1500 * t) * math.exp(-t / 0.02) * 0.5
        # Noise
        noise = (random.random() * 2 - 1) * math.exp(-t / 0.015) * 0.4
        sample = (ping + noise) * 0.6
        samples.append(sample)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_metal_stress(filepath, duration=0.5, sample_rate=48000):
    """Metal stress/groan: low scraping tone + noise."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Descending scrape
        freq = 250 * (1 - t / duration) + 60
        scrape = math.sin(2 * math.pi * freq * t) * math.exp(-t / 0.12) * 0.45
        # Gritty noise
        noise = (random.random() * 2 - 1) * math.exp(-t / 0.1) * 0.35
        sample = (scrape + noise) * 0.6
        samples.append(sample)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_gunfight(filepath, duration=1.0, sample_rate=48000):
    """Dense gunfight bed: several closely spaced impacts + whooshes."""
    n = int(sample_rate * duration)
    samples = [0.0] * n
    # Random shots
    for shot_t in [0.08, 0.22, 0.38, 0.54, 0.72, 0.88]:
        start = int(shot_t * sample_rate)
        for j in range(int(0.12 * sample_rate)):
            idx = start + j
            if idx >= n:
                break
            t = j / sample_rate
            freq = 1200 * math.exp(-t / 0.03)
            shot = math.sin(2 * math.pi * freq * t) * math.exp(-t / 0.03) * 0.4
            noise = (random.random() * 2 - 1) * math.exp(-t / 0.02) * 0.3
            samples[idx] += (shot + noise) * 0.5
    # Normalize
    peak = max(abs(min(samples)), abs(max(samples))) or 1.0
    samples = [s / peak * 0.7 for s in samples]
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_energy_hum(filepath, duration=2.0, sample_rate=48000):
    """Energy hum drone: layered low-frequency tone with shimmer."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Low drone
        drone = math.sin(2 * math.pi * 80 * t) * 0.25
        # Mid shimmer
        shimmer = math.sin(2 * math.pi * 240 * t) * math.sin(2 * math.pi * 8 * t) * 0.15
        # High sparkle
        sparkle = math.sin(2 * math.pi * 720 * t) * (0.5 + 0.5 * math.sin(2 * math.pi * 12 * t)) * 0.1
        # Soft noise
        noise = (random.random() * 2 - 1) * 0.08
        sample = (drone + shimmer + sparkle + noise) * 0.5
        # Fade in/out
        env = min(1.0, t / 0.1) * (1.0 if t < duration - 0.2 else (duration - t) / 0.2)
        samples.append(sample * env)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_vault_hum(filepath, duration=3.0, sample_rate=48000):
    """Vault/cave hum: deep reverberant drone."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        # Deep hum
        hum = math.sin(2 * math.pi * 50 * t) * 0.3
        # Subtle modulation
        mod = math.sin(2 * math.pi * 0.5 * t) * 0.5 + 0.5
        # Low noise
        noise = (random.random() * 2 - 1) * 0.06
        sample = (hum * mod + noise) * 0.45
        env = min(1.0, t / 0.3) * (1.0 if t < duration - 0.5 else (duration - t) / 0.5)
        samples.append(sample * env)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_transform_mechanical(filepath, duration=1.2, sample_rate=48000):
    """Mechanical transformation: clanks, whirs, servo motors."""
    n = int(sample_rate * duration)
    samples = [0.0] * n
    # Clanks
    for clank_t in [0.1, 0.35, 0.6, 0.85]:
        start = int(clank_t * sample_rate)
        for j in range(int(0.08 * sample_rate)):
            idx = start + j
            if idx >= n:
                break
            t = j / sample_rate
            freq = 600 * math.exp(-t / 0.015)
            clank = math.sin(2 * math.pi * freq * t) * math.exp(-t / 0.02) * 0.5
            noise = (random.random() * 2 - 1) * math.exp(-t / 0.015) * 0.3
            samples[idx] += (clank + noise) * 0.5
    # Servo whir
    for i in range(n):
        t = i / sample_rate
        whir = math.sin(2 * math.pi * (200 + 100 * math.sin(2 * math.pi * 3 * t)) * t) * 0.08
        samples[i] += whir
    peak = max(abs(min(samples)), abs(max(samples))) or 1.0
    samples = [s / peak * 0.7 for s in samples]
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


def generate_wind(filepath, duration=4.0, sample_rate=48000):
    """Strong wind gust: filtered noise with low rumble."""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        noise = (random.random() * 2 - 1)
        gust = 0.6 + 0.4 * math.sin(2 * math.pi * 0.25 * t) * math.sin(2 * math.pi * 0.07 * t)
        rumble = math.sin(2 * math.pi * 40 * t) * 0.25
        sample = (noise * 0.4 + rumble) * gust * 0.3
        samples.append(sample)
    _write_wav_mono(filepath, samples, sample_rate)
    print(f"Generated SFX: {filepath}")


if __name__ == "__main__":
    random.seed(42)
    generate_laser_blast(os.path.join(SFX_DIR, "laser_blast.wav"))
    generate_plasma_rifle(os.path.join(SFX_DIR, "plasma_rifle.wav"))
    generate_explosion(os.path.join(SFX_DIR, "explosion.wav"))
    generate_bullet_impact(os.path.join(SFX_DIR, "bullet_impact.wav"))
    generate_metal_stress(os.path.join(SFX_DIR, "metal_stress.wav"))
    generate_gunfight(os.path.join(SFX_DIR, "gunfight.wav"))
    generate_energy_hum(os.path.join(SFX_DIR, "energy_hum.wav"))
    generate_vault_hum(os.path.join(SFX_DIR, "vault_hum.wav"))
    generate_transform_mechanical(os.path.join(SFX_DIR, "transform_mechanical.wav"))
    generate_wind(os.path.join(SFX_DIR, "wind.wav"))
    print(f"\nAll missing SFX generated in: {SFX_DIR}")
