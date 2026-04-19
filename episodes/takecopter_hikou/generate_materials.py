#!/usr/bin/env python3
"""Generate BGM and SFX for takecopter_hikou episode."""
import math, struct, wave, os

MUSIC_DIR = os.path.join(os.path.dirname(__file__), "assets", "audio", "music")
SFX_DIR = os.path.join(os.path.dirname(__file__), "assets", "audio", "sfx")
os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(SFX_DIR, exist_ok=True)

SAMPLE_RATE = 48000

def save_wav(path, samples):
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        for s in samples:
            v = int(s * 32767)
            v = max(-32768, min(32767, v))
            w.writeframes(struct.pack('<h', v))

def gen_tone(freq, duration, volume=0.3, envelope=None):
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        s = math.sin(2 * math.pi * freq * t) * volume
        if envelope:
            s *= envelope(t, duration)
        samples.append(s)
    return samples

def mix_samples(*sample_lists):
    max_len = max(len(s) for s in sample_lists)
    result = [0.0] * max_len
    for samples in sample_lists:
        for i, s in enumerate(samples):
            result[i] += s
    return result

def soft_limit(samples):
    return [math.tanh(s * 1.2) / 1.2 for s in samples]

# ===== BGM: room_theme (轻松日常, C大调, ~100 BPM) =====
def make_room_theme():
    bpm = 100
    beat = 60 / bpm  # 0.6s
    duration = 20.0
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    
    # Chord progression: C - G - Am - F
    chords = [
        ([261.63, 329.63, 392.00], 4),   # C
        ([196.00, 246.94, 293.66], 4),   # G
        ([220.00, 261.63, 329.63], 4),   # Am
        ([174.61, 220.00, 261.63], 4),   # F
    ]
    
    for i in range(n):
        t = i / SAMPLE_RATE
        measure = int(t / (beat * 4)) % 4
        chord, beats = chords[measure]
        s = 0
        # Arpeggio
        for j, freq in enumerate(chord):
            phase = 2 * math.pi * freq * t + j * 0.5
            s += math.sin(phase) * 0.08
        # Simple melody note
        melody_freq = chord[0] * 2  # octave up
        s += math.sin(2 * math.pi * melody_freq * t) * 0.06
        # Subtle bass
        s += math.sin(2 * math.pi * chord[0] * 0.5 * t) * 0.05
        # Envelope per measure
        measure_t = t % (beat * 4)
        env = math.sin((measure_t / (beat * 4)) * math.pi)
        samples[i] = s * env * 0.9
    
    return soft_limit(samples)

# ===== BGM: park_theme (轻快户外, G大调, ~120 BPM) =====
def make_park_theme():
    bpm = 120
    beat = 60 / bpm  # 0.5s
    duration = 20.0
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    
    chords = [
        ([196.00, 246.94, 293.66], 4),   # G
        ([146.83, 185.00, 220.00], 4),   # D
        ([164.81, 196.00, 246.94], 4),   # Em
        ([130.81, 164.81, 196.00], 4),   # C
    ]
    
    for i in range(n):
        t = i / SAMPLE_RATE
        measure = int(t / (beat * 4)) % 4
        chord, beats = chords[measure]
        s = 0
        # Faster arpeggio
        for j, freq in enumerate(chord):
            phase = 2 * math.pi * freq * t + j * 0.3
            s += math.sin(phase) * 0.07
        # Melody
        melody_freq = chord[1] * 2
        s += math.sin(2 * math.pi * melody_freq * t) * 0.07
        # Brighter higher harmonics
        s += math.sin(2 * math.pi * chord[2] * 2 * t) * 0.04
        measure_t = t % (beat * 4)
        env = math.sin((measure_t / (beat * 4)) * math.pi)
        samples[i] = s * env * 0.9
    
    return soft_limit(samples)

# ===== BGM: chaos_theme (紧张滑稽, ~140 BPM) =====
def make_chaos_theme():
    bpm = 140
    beat = 60 / bpm
    duration = 15.0
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    
    # Chromatic / dissonant pattern
    base_freqs = [220.0, 233.08, 246.94, 261.63, 277.18, 293.66]
    
    for i in range(n):
        t = i / SAMPLE_RATE
        measure = int(t / (beat * 2)) % 6
        freq = base_freqs[measure]
        s = 0
        s += math.sin(2 * math.pi * freq * t) * 0.1
        s += math.sin(2 * math.pi * freq * 1.5 * t) * 0.08  # dissonant 5th
        s += math.sin(2 * math.pi * freq * 2.01 * t) * 0.05  # slightly detuned
        # Rhythmic pulse
        pulse = abs(math.sin(t * math.pi * 2 / beat))
        s *= (0.3 + 0.7 * pulse)
        # Staccato envelope
        note_t = t % (beat * 0.5)
        env = math.exp(-note_t * 8)
        samples[i] = s * env * 0.9
    
    return soft_limit(samples)

# ===== SFX: takecopter_spin (竹蜻蜓旋转声) =====
def make_takecopter_spin():
    duration = 2.0
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Two spinning blades creating beat frequency
        f1 = 180 + 20 * math.sin(t * 2)
        f2 = 360 + 40 * math.sin(t * 3)
        s = math.sin(2 * math.pi * f1 * t) * 0.15
        s += math.sin(2 * math.pi * f2 * t) * 0.1
        # Motor buzz
        buzz = ((i * 9301 + 49297) % 233280) / 233280.0 * 2 - 1
        s += buzz * 0.05 * math.exp(-t * 0.5)
        # Startup envelope
        env = min(1.0, t * 2) * max(0, 1 - (t - 1.5) / 0.5)
        samples.append(s * env)
    return samples

# ===== SFX: wind (风声) =====
def make_wind():
    duration = 2.0
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        noise = ((i * 9301 + 49297) % 233280) / 233280.0 * 2 - 1
        # Low-pass like filter via running average would be better, but simple attenuation works
        cutoff = 0.3 + 0.2 * math.sin(t * 3)
        s = noise * cutoff * 0.3
        samples.append(s)
    return samples

# ===== SFX: impact (撞击声) =====
def make_impact():
    duration = 0.3
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        noise = ((i * 9301 + 49297) % 233280) / 233280.0 * 2 - 1
        env = math.exp(-t / 0.05)
        samples.append(noise * env * 0.5)
    return samples

# ===== SFX: fall (坠落呼啸声) =====
def make_fall():
    duration = 1.5
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 600 * math.exp(-t * 2) + 100
        s = math.sin(2 * math.pi * freq * t) * 0.2
        noise = ((i * 9301 + 49297) % 233280) / 233280.0 * 2 - 1
        s += noise * 0.1 * (t / duration)
        env = min(1.0, t * 4) * max(0, 1 - (t - 1.2) / 0.3)
        samples.append(s * env)
    return samples

if __name__ == "__main__":
    print("Generating BGM...")
    save_wav(os.path.join(MUSIC_DIR, "room_theme.wav"), make_room_theme())
    save_wav(os.path.join(MUSIC_DIR, "park_theme.wav"), make_park_theme())
    save_wav(os.path.join(MUSIC_DIR, "chaos_theme.wav"), make_chaos_theme())
    print("BGM saved to", MUSIC_DIR)
    
    print("Generating SFX...")
    save_wav(os.path.join(SFX_DIR, "takecopter_spin.wav"), make_takecopter_spin())
    save_wav(os.path.join(SFX_DIR, "wind.wav"), make_wind())
    save_wav(os.path.join(SFX_DIR, "impact.wav"), make_impact())
    save_wav(os.path.join(SFX_DIR, "fall.wav"), make_fall())
    print("SFX saved to", SFX_DIR)
