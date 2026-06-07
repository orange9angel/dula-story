#!/usr/bin/env python3
"""
Generate relaxed, casual background music for broadcast exercise.
Style: Easy-listening, light, cheerful - like morning exercise music.
Tempo: ~63 BPM (0.95s per beat) to match the exercise rhythm.
Structure: 4 groups x 8 beats = 32 beats ≈ 30.4s

Uses procedural synthesis with multiple instruments:
- Marimba/xylophone-like melody (sine with harmonics)
- Soft pad chords (filtered sawtooth)
- Light percussion (noise bursts)
- Bass line (low sine)
"""

import numpy as np
import wave
import struct
import os

SAMPLE_RATE = 48000
DURATION = 32.0  # seconds, slightly longer than 30.4s
BEAT_DURATION = 0.95  # seconds per beat
BPM = 60.0 / BEAT_DURATION  # ~63 BPM

def save_wav(data, filename, sample_rate=SAMPLE_RATE):
    """Save numpy array as 16-bit mono WAV."""
    data = np.clip(data, -1.0, 1.0)
    data_int16 = (data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(data_int16.tobytes())
    print(f"Saved: {filename} ({len(data)/sample_rate:.2f}s)")

def generate_sine(freq, duration, amplitude=1.0, phase=0.0):
    """Generate a sine wave."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * freq * t + phase)

def generate_triangle(freq, duration, amplitude=1.0):
    """Generate a triangle wave."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    return amplitude * (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * freq * t))

def generate_sawtooth(freq, duration, amplitude=1.0):
    """Generate a band-limited sawtooth wave."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    wave = np.zeros_like(t)
    # Add harmonics up to Nyquist
    for n in range(1, 20):
        if freq * n > SAMPLE_RATE / 2:
            break
        wave += (amplitude / n) * np.sin(2 * np.pi * freq * n * t)
    return wave * 0.3

def generate_square(freq, duration, amplitude=1.0):
    """Generate a square wave."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    wave = np.zeros_like(t)
    for n in range(1, 20, 2):  # Odd harmonics only
        if freq * n > SAMPLE_RATE / 2:
            break
        wave += (amplitude / n) * np.sin(2 * np.pi * freq * n * t)
    return wave * 0.3

def generate_noise(duration, amplitude=1.0):
    """Generate white noise."""
    return amplitude * (2 * np.random.random(int(SAMPLE_RATE * duration)) - 1)

def lowpass_filter(data, cutoff_freq, sample_rate=SAMPLE_RATE):
    """Simple first-order lowpass filter."""
    rc = 1.0 / (2 * np.pi * cutoff_freq)
    dt = 1.0 / sample_rate
    alpha = dt / (rc + dt)
    
    result = np.zeros_like(data)
    result[0] = data[0]
    for i in range(1, len(data)):
        result[i] = result[i-1] + alpha * (data[i] - result[i-1])
    return result

def highpass_filter(data, cutoff_freq, sample_rate=SAMPLE_RATE):
    """Simple first-order highpass filter."""
    rc = 1.0 / (2 * np.pi * cutoff_freq)
    dt = 1.0 / sample_rate
    alpha = rc / (rc + dt)
    
    result = np.zeros_like(data)
    result[0] = data[0]
    for i in range(1, len(data)):
        result[i] = alpha * (result[i-1] + data[i] - data[i-1])
    return result

def envelope(data, attack=0.01, decay=0.1, sustain=0.7, release=0.1, total_duration=None):
    """Apply ADSR envelope."""
    if total_duration is None:
        total_duration = len(data) / SAMPLE_RATE
    
    samples = len(data)
    attack_samples = int(attack * SAMPLE_RATE)
    decay_samples = int(decay * SAMPLE_RATE)
    release_samples = int(release * SAMPLE_RATE)
    sustain_samples = samples - attack_samples - decay_samples - release_samples
    
    env = np.zeros(samples)
    # Attack
    if attack_samples > 0:
        env[:attack_samples] = np.linspace(0, 1, attack_samples)
    # Decay
    if decay_samples > 0:
        env[attack_samples:attack_samples+decay_samples] = np.linspace(1, sustain, decay_samples)
    # Sustain
    if sustain_samples > 0:
        env[attack_samples+decay_samples:attack_samples+decay_samples+sustain_samples] = sustain
    # Release
    if release_samples > 0:
        env[-release_samples:] = np.linspace(sustain, 0, release_samples)
    
    return data * env

def delay_effect(data, delay_time=0.3, feedback=0.3, mix=0.25):
    """Simple delay effect."""
    delay_samples = int(delay_time * SAMPLE_RATE)
    output = np.zeros(len(data) + delay_samples * 3)
    output[:len(data)] = data
    
    for i in range(1, 4):
        delayed = np.zeros_like(output)
        start = delay_samples * i
        delayed[start:start+len(data)] = data * (feedback ** i)
        output += delayed
    
    output = output[:len(data)]
    return data * (1 - mix) + output * mix

def reverb_simple(data, decay=0.4, mix=0.2):
    """Simple reverb using multiple delays."""
    delays = [0.03, 0.05, 0.07, 0.11, 0.13, 0.17]
    output = np.zeros(len(data) + int(max(delays) * SAMPLE_RATE * 3))
    output[:len(data)] = data
    
    for i, dt in enumerate(delays):
        delay_samples = int(dt * SAMPLE_RATE)
        for j in range(1, 4):
            start = delay_samples * j
            if start < len(output):
                end = min(start + len(data), len(output))
                output[start:end] += data[:end-start] * (decay ** j) * (0.5 ** i)
    
    output = output[:len(data)]
    return data * (1 - mix) + output * mix

# === Music Theory ===
# Key: C major (relaxed, bright)
# Scale: C D E F G A B
# Chords for casual exercise feel:
# C (I) - Am (vi) - F (IV) - G (V) - C (I)

NOTE_FREQS = {
    'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
}

# Chord definitions (root, third, fifth)
CHORDS = {
    'C':  ['C3', 'E3', 'G3', 'C4', 'E4'],
    'Am': ['A2', 'C3', 'E3', 'A3', 'C4'],
    'F':  ['F2', 'A2', 'C3', 'F3', 'A3'],
    'G':  ['G2', 'B2', 'D3', 'G3', 'B3'],
    'Dm': ['D3', 'F3', 'A3', 'D4'],
    'Em': ['E3', 'G3', 'B3', 'E4'],
}

# Casual chord progression: C - Am - F - G (very common, relaxed)
# Each chord lasts 8 beats = 8 * 0.95 = 7.6s
CHORD_PROGRESSION = [
    ('C', 8),   # 8 beats
    ('Am', 8),  # 8 beats
    ('F', 8),   # 8 beats
    ('G', 8),   # 8 beats
]

# Melody notes for each chord (scale degrees, relative to root)
# Simple, catchy melody pattern
MELODY_PATTERNS = {
    'C':  ['E4', 'G4', 'E4', 'C4', 'D4', 'E4', 'G4', 'E4'],
    'Am': ['C4', 'E4', 'C4', 'A3', 'B3', 'C4', 'E4', 'C4'],
    'F':  ['A3', 'C4', 'A3', 'F3', 'G3', 'A3', 'C4', 'A3'],
    'G':  ['B3', 'D4', 'B3', 'G3', 'A3', 'B3', 'D4', 'B3'],
}

def generate_marimba_note(freq, duration, amplitude=0.4):
    """Generate a marimba-like tone (sine with quick decay)."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # Fundamental + harmonics
    wave = np.zeros_like(t)
    wave += np.sin(2 * np.pi * freq * t) * 1.0
    wave += np.sin(2 * np.pi * freq * 2 * t) * 0.3
    wave += np.sin(2 * np.pi * freq * 3 * t) * 0.15
    wave += np.sin(2 * np.pi * freq * 4 * t) * 0.05
    
    # Quick exponential decay (marimba characteristic)
    decay = np.exp(-t * 8)
    wave *= decay
    
    return wave * amplitude

def generate_pad_chord(chord_name, duration, amplitude=0.15):
    """Generate a soft pad chord."""
    notes = CHORDS[chord_name]
    wave = np.zeros(int(SAMPLE_RATE * duration))
    
    for note in notes:
        freq = NOTE_FREQS[note]
        # Use triangle wave for softer pad sound
        partial = generate_triangle(freq, duration, amplitude=1.0)
        # Lowpass filter for warmth
        partial = lowpass_filter(partial, 2000)
        wave += partial * 0.2
    
    # Slow attack and release
    wave = envelope(wave, attack=0.5, decay=0.3, sustain=0.8, release=0.5, total_duration=duration)
    return wave * amplitude

def generate_bass_note(freq, duration, amplitude=0.25):
    """Generate a soft bass note."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    
    # Sine with slight warmth
    wave = np.sin(2 * np.pi * freq * t) * 1.0
    wave += np.sin(2 * np.pi * freq * 2 * t) * 0.1
    
    # Gentle envelope
    wave = envelope(wave, attack=0.05, decay=0.1, sustain=0.7, release=0.2, total_duration=duration)
    return wave * amplitude

def generate_hihat(duration=0.05, amplitude=0.08):
    """Generate a light hi-hat sound."""
    noise = generate_noise(duration, amplitude=1.0)
    # Highpass for crispness
    noise = highpass_filter(noise, 8000)
    # Quick decay
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise *= np.exp(-t * 60)
    return noise * amplitude

def generate_soft_kick(duration=0.15, amplitude=0.2):
    """Generate a soft kick drum."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    # Frequency sweep
    freq = 120 * np.exp(-t * 30)
    wave = np.sin(2 * np.pi * freq * t)
    wave *= np.exp(-t * 15)
    return wave * amplitude

def generate_snare(duration=0.1, amplitude=0.1):
    """Generate a light snare."""
    noise = generate_noise(duration, amplitude=1.0)
    noise = lowpass_filter(noise, 4000)
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise *= np.exp(-t * 25)
    return noise * amplitude

def generate_full_track():
    """Generate the complete background music track."""
    total_samples = int(SAMPLE_RATE * DURATION)
    track = np.zeros(total_samples)
    
    beat_samples = int(SAMPLE_RATE * BEAT_DURATION)
    
    # === PAD CHORDS ===
    # Long, sustained chords
    current_beat = 0
    for chord_name, beats in CHORD_PROGRESSION:
        chord_duration = beats * BEAT_DURATION
        chord_start = int(current_beat * beat_samples)
        chord_samples = int(chord_duration * SAMPLE_RATE)
        
        chord = generate_pad_chord(chord_name, chord_duration, amplitude=0.2)
        end_idx = min(chord_start + len(chord), total_samples)
        track[chord_start:end_idx] += chord[:end_idx - chord_start]
        
        current_beat += beats
    
    # === BASS LINE ===
    # Simple root note on beat 1 of each measure (every 4 beats)
    current_beat = 0
    for chord_name, beats in CHORD_PROGRESSION:
        for measure in range(beats // 4):
            # Root note on beat 1
            root_note = CHORDS[chord_name][0]
            freq = NOTE_FREQS[root_note]
            
            bass_start = int((current_beat + measure * 4) * beat_samples)
            bass = generate_bass_note(freq, BEAT_DURATION * 2, amplitude=0.3)
            end_idx = min(bass_start + len(bass), total_samples)
            track[bass_start:end_idx] += bass[:end_idx - bass_start]
            
            # Fifth on beat 3
            fifth_note = CHORDS[chord_name][2]
            freq5 = NOTE_FREQS[fifth_note]
            bass_start5 = int((current_beat + measure * 4 + 2) * beat_samples)
            bass5 = generate_bass_note(freq5, BEAT_DURATION * 2, amplitude=0.2)
            end_idx5 = min(bass_start5 + len(bass5), total_samples)
            track[bass_start5:end_idx5] += bass5[:end_idx5 - bass_start5]
        
        current_beat += beats
    
    # === MELODY (Marimba) ===
    current_beat = 0
    for chord_name, beats in CHORD_PROGRESSION:
        melody = MELODY_PATTERNS[chord_name]
        for i, note in enumerate(melody):
            note_start = int((current_beat + i) * beat_samples)
            freq = NOTE_FREQS[note]
            note_wave = generate_marimba_note(freq, BEAT_DURATION * 0.9, amplitude=0.35)
            end_idx = min(note_start + len(note_wave), total_samples)
            track[note_start:end_idx] += note_wave[:end_idx - note_start]
        
        current_beat += beats
    
    # === PERCUSSION ===
    # Light percussion only (no ping tones - counting is handled by TTS)
    for beat in range(int(DURATION / BEAT_DURATION)):
        beat_start = int(beat * beat_samples)
        beat_in_measure = beat % 4
        
        # Very light hi-hat on every beat (subtle rhythm)
        hihat = generate_hihat(duration=0.03, amplitude=0.04)
        end_idx = min(beat_start + len(hihat), total_samples)
        track[beat_start:end_idx] += hihat[:end_idx - beat_start]
        
        # Soft kick on beat 1 (gentle emphasis)
        if beat_in_measure == 0:
            kick = generate_soft_kick(duration=0.1, amplitude=0.12)
            end_idx = min(beat_start + len(kick), total_samples)
            track[beat_start:end_idx] += kick[:end_idx - beat_start]
    
    # === EFFECTS ===
    # Apply gentle reverb
    track = reverb_simple(track, decay=0.3, mix=0.15)
    
    # Gentle compression (soft limit)
    threshold = 0.7
    track = np.where(
        np.abs(track) > threshold,
        np.sign(track) * (threshold + (np.abs(track) - threshold) * 0.3),
        track
    )
    
    # Normalize to full volume
    max_amp = np.max(np.abs(track))
    if max_amp > 0:
        track = track / max_amp * 0.98
    
    return track

def load_counting_audio(output_dir):
    """Load counting audio if it exists."""
    counting_path = os.path.join(output_dir, 'counting.wav')
    if not os.path.exists(counting_path):
        return None
    
    with wave.open(counting_path, 'rb') as wf:
        data = wf.readframes(wf.getnframes())
        samples = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32767.0
    return samples


if __name__ == '__main__':
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'music')
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating relaxed casual background music...")
    print(f"Tempo: {BPM:.1f} BPM (beat = {BEAT_DURATION:.2f}s)")
    print(f"Duration: {DURATION}s")
    
    track = generate_full_track()
    
    # Note: Counting audio is now handled via TTS in script.story dialogue
    # Do not mix counting into BGM to avoid double-counting
    
    output_path = os.path.join(output_dir, 'broadcast_stretch_bgm.wav')
    save_wav(track, output_path)
    
    print("Done!")
