#!/usr/bin/env python3
"""
Generate counting audio for broadcast exercise.
Each number corresponds to one beat (0.95s), precisely synced with actions.
"""

import numpy as np
import wave
import os

SAMPLE_RATE = 48000
BEAT_DURATION = 0.95  # seconds per beat

def save_wav(data, filename, sample_rate=SAMPLE_RATE):
    data = np.clip(data, -1.0, 1.0)
    data_int16 = (data * 32767).astype(np.int16)
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(data_int16.tobytes())
    print(f"Saved: {filename} ({len(data)/sample_rate:.2f}s)")

def generate_beep(freq, duration, amplitude=0.5):
    """Generate a short beep tone."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    # Sine wave with quick decay
    wave = np.sin(2 * np.pi * freq * t)
    decay = np.exp(-t * 15)
    wave *= decay
    return wave * amplitude

def generate_counting_track():
    """Generate counting track: 1-2-3-4-5-6-7-8 for each of 4 groups."""
    total_beats = 32  # 4 groups x 8 beats
    total_samples = int(SAMPLE_RATE * total_beats * BEAT_DURATION)
    track = np.zeros(total_samples)
    
    # Chinese numbers for counting
    numbers = ["一", "二", "三", "四", "五", "六", "七", "八"]
    
    # For each beat, add a beep with different pitch pattern
    for beat in range(total_beats):
        beat_start = int(beat * BEAT_DURATION * SAMPLE_RATE)
        
        # Group start beats (1, 9, 17, 25) get higher pitch
        group_beat = beat % 8
        if group_beat == 0:
            freq = 880  # A5 - group start
            amp = 0.5
        elif group_beat == 4:
            freq = 660  # E5 - half group
            amp = 0.35
        else:
            freq = 523  # C5 - normal beat
            amp = 0.25
        
        beep = generate_beep(freq, 0.15, amplitude=amp)
        end_idx = min(beat_start + len(beep), total_samples)
        track[beat_start:end_idx] += beep[:end_idx - beat_start]
    
    return track

if __name__ == '__main__':
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'music')
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating counting track...")
    print(f"Tempo: {60.0/BEAT_DURATION:.1f} BPM (beat = {BEAT_DURATION:.2f}s)")
    
    track = generate_counting_track()
    
    output_path = os.path.join(output_dir, 'counting_beep.wav')
    save_wav(track, output_path)
    
    print("Done!")
