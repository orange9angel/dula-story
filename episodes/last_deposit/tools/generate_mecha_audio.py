#!/usr/bin/env python3
"""
Generate original mecha universe BGM and SFX with melodic development,
humanized rhythms, and richer synthesis.
Outputs to ../assets/audio/music/ and ../assets/audio/sfx/
"""
import os
import math
import random
import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC_DIR = os.path.join(ROOT, "assets", "audio", "music")
SFX_DIR = os.path.join(ROOT, "assets", "audio", "sfx")
os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(SFX_DIR, exist_ok=True)

SAMPLE_RATE = 48000


def sample_count(duration):
    return int(round(duration * SAMPLE_RATE))


def normalize(x):
    peak = np.max(np.abs(x))
    return x / peak if peak > 0 else x


def save_wav(path, data):
    wavfile.write(path, SAMPLE_RATE, (np.clip(normalize(data), -1, 1) * 32767).astype(np.int16))


# ───────────────────────────── Filters ─────────────────────────────
def lowpass(data, cutoff, order=4):
    sos = signal.butter(order, cutoff, btype="low", fs=SAMPLE_RATE, output="sos")
    return signal.sosfilt(sos, data)


def highpass(data, cutoff, order=4):
    sos = signal.butter(order, cutoff, btype="high", fs=SAMPLE_RATE, output="sos")
    return signal.sosfilt(sos, data)


def bandpass(data, low, high, order=4):
    sos = signal.butter(order, [low, high], btype="band", fs=SAMPLE_RATE, output="sos")
    return signal.sosfilt(sos, data)


# ───────────────────────────── Oscillators ─────────────────────────────
def phase_from_freq(freq, n):
    """Integrated phase for a possibly time-varying frequency array."""
    return np.cumsum(2 * np.pi * freq / SAMPLE_RATE)


def sine_wave(freq, duration, amp=1.0):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    if np.isscalar(freq):
        return amp * np.sin(2 * np.pi * freq * t)
    return amp * np.sin(phase_from_freq(freq, n))


def triangle_wave(freq, duration, amp=1.0):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    if np.isscalar(freq):
        p = t * freq % 1.0
    else:
        p = phase_from_freq(freq, n) / (2 * np.pi) % 1.0
    return amp * (4 * np.abs(p - 0.5) - 1)


def sawtooth_wave(freq, duration, amp=1.0):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    if np.isscalar(freq):
        return amp * (2 * (t * freq - np.floor(t * freq + 0.5)))
    phase = phase_from_freq(freq, n)
    return amp * (2 * (phase / (2 * np.pi) - np.floor(phase / (2 * np.pi) + 0.5)))


def square_wave(freq, duration, amp=1.0, duty=0.5):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    if np.isscalar(freq):
        return amp * np.where((t * freq % 1.0) < duty, 1.0, -1.0)
    p = phase_from_freq(freq, n) / (2 * np.pi) % 1.0
    return amp * np.where(p < duty, 1.0, -1.0)


def noise(duration, amp=1.0):
    return amp * (np.random.random(sample_count(duration)) * 2 - 1)


def cents_factor(cents):
    return 2 ** (cents / 1200.0)


def supersaw(freq, duration, amp=1.0, voices=9, detune_cents=12):
    n = sample_count(duration)
    out = np.zeros(n)
    for i in range(voices):
        detune = (((i / (voices - 1)) * 2 - 1) * detune_cents) if voices > 1 else 0
        f = freq * cents_factor(detune)
        phase = np.cumsum(2 * np.pi * f / SAMPLE_RATE * np.ones(n)) + i * 0.73
        saw = 2 * (phase / (2 * np.pi) - np.floor(phase / (2 * np.pi) + 0.5))
        out += saw
    return amp * out / voices


def fm_wave(freq, duration, amp=1.0, mod_ratio=2.0, mod_index=4.0):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    if np.isscalar(freq):
        mod_freq = freq * mod_ratio
        return amp * np.sin(2 * np.pi * freq * t + mod_index * np.sin(2 * np.pi * mod_freq * t))
    mod_freq = freq * mod_ratio
    return amp * np.sin(phase_from_freq(freq, n) + mod_index * np.sin(phase_from_freq(mod_freq, n)))


# ───────────────────────────── Music theory ─────────────────────────────
NOTE_BASE = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3,
             "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}


def note_to_freq(note):
    name = note[:-1]
    octave = int(note[-1])
    return 440.0 * 2 ** ((octave - 4) + NOTE_BASE[name] / 12)


# Common progressions in A minor / C major-ish with tension
MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]  # semitones from root


def semitone_to_note(semitone, root="A1"):
    root_freq = note_to_freq(root)
    root_semi = 12 * (math.log2(root_freq / 440.0)) + 69 - 12  # MIDI-ish
    # Simpler: just multiply freq
    return root_freq * 2 ** (semitone / 12)


# ───────────────────────────── Envelopes / Effects ─────────────────────────────
def adsr_envelope(duration, attack=0.01, decay=0.1, sustain=0.7, release=0.2):
    n = sample_count(duration)
    a = int(attack * SAMPLE_RATE)
    d = int(decay * SAMPLE_RATE)
    r = int(release * SAMPLE_RATE)
    s = max(0, n - a - d - r)
    env = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, sustain, d),
        np.full(s, sustain),
        np.linspace(sustain, 0, r),
    ])
    if len(env) < n:
        env = np.concatenate([env, np.zeros(n - len(env))])
    return env[:n]


def shaped_envelope(data, attack=0.01, decay=0.1, sustain=0.7, release=0.2):
    return data * adsr_envelope(len(data) / SAMPLE_RATE, attack, decay, sustain, release)


def simple_reverb(data, decay=0.3, mix=0.25, num_echoes=8):
    """Simple convolution-free reverb using comb of delays."""
    if len(data) == 0:
        return data
    out = np.zeros(len(data) + int(decay * SAMPLE_RATE) * num_echoes)
    out[:len(data)] = data.copy()
    for i in range(1, num_echoes + 1):
        delay = int((0.02 + 0.035 * i) * SAMPLE_RATE)
        gain = (0.4 ** i) * mix
        if delay < len(data):
            out[delay:delay + len(data)] += data * gain
    out = lowpass(out, 5000)
    return out[:len(data)]


def simple_delay(data, delay_time=0.375, feedback=0.35, mix=0.25):
    if len(data) == 0:
        return data
    delay_samples = int(delay_time * SAMPLE_RATE)
    out = np.zeros(len(data) + delay_samples * 4)
    out[:len(data)] = data
    for i in range(1, 5):
        start = delay_samples * i
        out[start:start + len(data)] += data * (feedback ** i) * mix
    out = lowpass(out, 6000)
    return out[:len(data)]


def chorus(data, depth=0.003, rate=0.5, mix=0.25):
    if len(data) == 0:
        return data
    n = len(data)
    t = np.arange(n) / SAMPLE_RATE
    mod = depth * SAMPLE_RATE * np.sin(2 * np.pi * rate * t)
    delayed = np.zeros(n)
    for i in range(n):
        idx = int(i - mod[i])
        if 0 <= idx < n:
            delayed[i] = data[idx]
    return data + delayed * mix


def soft_clip(data, threshold=0.7):
    return np.tanh(data / threshold) * threshold


def sidechain_duck(t, bpm, total_steps, depth=0.35, release_ms=80):
    beat = 60.0 / bpm
    step = beat / 4
    duck = np.ones_like(t)
    for step_i in range(total_steps):
        beat_i = step_i % 16
        if beat_i in [0, 4, 8, 12]:
            start = step_i * step
            s = sample_count(start)
            e = min(s + sample_count(beat * 0.45), len(duck))
            x = np.linspace(0, 1, e - s)
            # fast attack, exponential release
            duck[s:e] = depth + (1 - depth) * (1 - np.exp(-x * 12)) / (1 - np.exp(-12))
    return duck


# ───────────────────────────── Drums ─────────────────────────────
def punchy_kick(duration=0.15):
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    freq = np.linspace(160, 45, n)
    body = np.sin(phase_from_freq(freq, n)) * np.exp(-t * 14)
    click = (np.random.random(n) * 2 - 1) * np.exp(-t * 90) * 0.3
    k = lowpass(body + click, 180)
    return k * np.linspace(1, 0, n) ** 0.3


def snare_hit(duration=0.28):
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    body = sine_wave(180, duration, 0.45) * np.exp(-t * 22)
    noise_sig = (np.random.random(n) * 2 - 1) * np.exp(-t * 26)
    noise_sig = bandpass(noise_sig, 800, 7000)
    snap = (np.random.random(n) * 2 - 1) * np.exp(-t * 60) * 0.25
    snap = bandpass(snap, 3000, 10000)
    return body + noise_sig * 0.85 + snap * 0.4


def closed_hihat(duration=0.06):
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    n_sig = (np.random.random(n) * 2 - 1)
    n_sig = bandpass(n_sig, 6000, 16000)
    return n_sig * np.exp(-t * 90) * 0.45


def open_hihat(duration=0.25):
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    n_sig = (np.random.random(n) * 2 - 1)
    n_sig = bandpass(n_sig, 5000, 14000)
    return n_sig * np.exp(-t * 18) * 0.4


def metallic_hit(duration=0.35):
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    body = sine_wave(220, duration, 0.5) * np.exp(-t * 20)
    ring = fm_wave(420, duration, 0.35, mod_ratio=5.6, mod_index=8) * np.exp(-t * 14)
    noise_sig = (np.random.random(n) * 2 - 1) * np.exp(-t * 28)
    noise_sig = bandpass(noise_sig, 2500, 9000)
    return body + ring + noise_sig * 0.5


def crash_cymbal(duration=1.2):
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    noise_sig = (np.random.random(n) * 2 - 1)
    noise_sig = bandpass(noise_sig, 4000, 16000)
    return noise_sig * np.exp(-t * 4) * 0.35


# ───────────────────────────── Instrument patches ─────────────────────────────
def saw_bass(freq, duration, amp=1.0):
    saw = sawtooth_wave(freq, duration, 0.55)
    sub = sine_wave(freq / 2, duration, 0.5) if freq / 2 > 20 else 0
    out = saw + sub
    out = lowpass(out, 420)
    return amp * out


def synth_lead(freq, duration, amp=1.0, patch="brass"):
    """A lead synth with several characters: brass, saw, flute, bell."""
    n = sample_count(duration)
    if patch == "brass":
        # two detuned sawtooths + FM warmth
        out = supersaw(freq, duration, 0.5, voices=5, detune_cents=8)
        out += fm_wave(freq, duration, 0.25, mod_ratio=1.0, mod_index=2.5)
        out = lowpass(out, 2600)
    elif patch == "saw":
        out = supersaw(freq, duration, 0.6, voices=7, detune_cents=14)
        out = lowpass(out, 5500)
    elif patch == "flute":
        out = triangle_wave(freq, duration, 0.45)
        out += sine_wave(freq * 2, duration, 0.15)
        out = lowpass(out, 3000)
    elif patch == "bell":
        out = fm_wave(freq, duration, 0.55, mod_ratio=3.5, mod_index=5)
        out += sine_wave(freq * 2.5, duration, 0.2)
        out = bandpass(out, 400, 7000)
    else:
        out = sine_wave(freq, duration)
    return amp * out


def choir_pad(freq, duration, amp=1.0):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    out = np.zeros(n)
    voices = [
        (0, 4.2, 0.004, 0),
        (-12, 5.1, 0.003, 1.2),
        (8, 3.7, 0.005, 2.4),
        (19, 2.9, 0.004, 3.5),
    ]
    for detune, rate, depth, ph in voices:
        f = freq * cents_factor(detune) * (1 + depth * np.sin(2 * np.pi * rate * t + ph))
        phase = np.cumsum(2 * np.pi * f / SAMPLE_RATE)
        sqr = np.sign(np.sin(phase))
        out += sqr
    out = lowpass(out, 2200)
    return amp * out / len(voices)


def arp_synth(freq, duration, amp=1.0):
    """Bright, plucky arpeggio voice."""
    out = square_wave(freq, duration, 0.35, duty=0.4)
    out += triangle_wave(freq * 2, duration, 0.15)
    out = lowpass(out, 7500)
    env = adsr_envelope(duration, 0.005, 0.05, 0.15, 0.08)
    return amp * out * env


def pluck_synth(freq, duration, amp=1.0):
    """Karplus-Strong-ish pluck using filtered noise + sine."""
    n = sample_count(duration)
    t = np.arange(n) / SAMPLE_RATE
    noise_sig = noise(duration, 0.5)
    noise_sig = lowpass(noise_sig, freq * 2.5)
    decay = np.exp(-t * (8 + freq * 0.01))
    body = sine_wave(freq, duration, 0.4) * decay
    return amp * (noise_sig * decay * 0.6 + body)


# ───────────────────────────── Arrangement helpers ─────────────────────────────
def slice_range(start, end, track=None):
    s = max(0, sample_count(start))
    e = max(s, sample_count(end))
    if track is not None:
        e = min(e, len(track))
    return s, e


def write_clip(track, start, clip):
    s = max(0, min(sample_count(start), len(track)))
    e = min(s + len(clip), len(track))
    if e <= s:
        return
    track[s:e] += clip[:e - s]


def humanize(amount=0.015):
    """Return a random timing offset in seconds."""
    return random.uniform(-amount, amount)


# ───────────────────────────── Cue generators ─────────────────────────────
def generate_theme_logo():
    """8-second heroic logo sting with a memorable brass motif."""
    duration = 8.0
    t = np.linspace(0, duration, sample_count(duration), endpoint=False)
    out = np.zeros_like(t)

    # Motif: A minor ascending triad then landing on E
    motif = [("A2", 0.75), ("C3", 0.75), ("E3", 1.0), ("A3", 1.25), ("E3", 0.75), ("A2", 0.75)]
    lead = np.zeros_like(t)
    pos = 0.0
    for note, dur in motif:
        if pos >= duration:
            break
        end = min(pos + dur, duration)
        s, e = slice_range(pos, end)
        seg_dur = (e - s) / SAMPLE_RATE
        f = note_to_freq(note)
        seg = synth_lead(f, seg_dur, 0.28, patch="brass")
        seg *= adsr_envelope(seg_dur, 0.02, 0.1, 0.6, 0.35)
        lead[s:e] += seg
        pos += dur
    lead = simple_reverb(lead, decay=0.8, mix=0.35)
    out += lead

    # Pad chord swell
    chord = ["A2", "E3", "A3", "C4", "E4"]
    pad = np.zeros_like(t)
    for note in chord:
        seg = choir_pad(note_to_freq(note), duration, 0.14)
        seg *= adsr_envelope(duration, 0.3, 0.4, 0.75, 1.8)
        pad += seg
    pad = lowpass(pad, 2400)
    out += pad

    # Driving drum fill
    kick = np.zeros_like(t)
    for off in [0, 0.5, 1.0, 1.75, 2.5, 3.25, 4.25, 5.0, 5.75]:
        if off >= duration:
            break
        write_clip(kick, off + humanize(0.01), punchy_kick(0.15))
    snare = np.zeros_like(t)
    for off in [1.25, 2.0, 2.75, 3.5, 4.5, 5.5]:
        write_clip(snare, off + humanize(0.01), snare_hit(0.25))
    crash = np.zeros_like(t)
    crash_clip = crash_cymbal(1.5)
    write_clip(crash, 0.0, crash_clip * 0.5)
    write_clip(crash, 4.0, crash_clip * 0.4)

    # Rise sweep
    sweep_t = np.linspace(0, duration, len(t), endpoint=False)
    freq = np.linspace(120, 3200, len(t))
    sweep = np.sin(phase_from_freq(freq, len(t))) * 0.22
    sweep *= np.linspace(0, 1, len(t)) ** 1.5 * np.linspace(1, 0, len(t))
    sweep = highpass(sweep, 250)
    out += sweep

    out += kick * 0.9 + snare * 0.85 + crash * 0.7
    out = soft_clip(out, 0.75)
    save_wav(os.path.join(MUSIC_DIR, "theme_logo.wav"), out * 0.9)
    print("Generated BGM: theme_logo.wav")


def generate_pulse_highway():
    """Driving chase music with verse/chorus structure and a catchy lead."""
    duration = 28.0
    bpm = 132.0
    beat = 60.0 / bpm
    step = beat / 4
    total_steps = int(duration / step)
    bar_dur = beat * 4
    num_bars = int(duration / bar_dur)
    t = np.linspace(0, duration, sample_count(duration), endpoint=False)
    out = np.zeros_like(t)

    # A minor / F / C / G — classic driving progression
    chord_roots = ["A1", "F1", "C2", "G1"]
    chords = [
        ["A2", "E3", "A3", "C4", "E4"],
        ["F2", "C3", "F3", "A3", "C4"],
        ["C2", "G2", "C3", "E3", "G3"],
        ["G2", "D3", "G3", "B3", "D4"],
    ]

    duck = sidechain_duck(t, bpm, total_steps, depth=0.45)

    # Bass line with movement (not just root notes)
    bass = np.zeros_like(t)
    bass_patterns = [
        [0, 2, 1, 2, 0, 1, 2, 1],       # verse
        [0, 2, 3, 2, 0, 2, 1, 2],       # chorus adds 5th
    ]
    for bar in range(num_bars):
        root_f = note_to_freq(chord_roots[bar % len(chord_roots)])
        freqs = [root_f, root_f * 1.5, root_f * 2.0, root_f * 1.25]
        pattern = bass_patterns[(bar // 4) % 2]
        bar_offset = bar * bar_dur
        for i, idx in enumerate(pattern):
            start = bar_offset + i * beat * 0.5 + humanize(0.008)
            if start >= duration:
                break
            end = min(start + beat * 0.45, duration)
            s, e = slice_range(start, end)
            if e <= s: continue
            seg = saw_bass(freqs[idx % len(freqs)], (e - s) / SAMPLE_RATE, 0.65)
            seg *= adsr_envelope((e - s) / SAMPLE_RATE, 0.005, 0.04, 0.5, 0.05)
            bass[s:e] += seg
    out += bass * duck

    # Arpeggio pattern that evolves
    arp = np.zeros_like(t)
    arp_patterns = [
        ["A5", "E5", "C5", "E5", "A5", "C6", "E5", "C5"],
        ["F5", "C5", "A4", "C5", "F5", "A5", "C5", "A4"],
        ["E5", "C5", "G4", "C5", "E5", "G5", "C5", "G4"],
        ["D5", "B4", "G4", "B4", "D5", "G5", "B4", "G4"],
    ]
    for bar in range(num_bars):
        pattern = arp_patterns[bar % len(arp_patterns)]
        bar_offset = bar * bar_dur
        for i, note in enumerate(pattern):
            start = bar_offset + i * beat * 0.5 + humanize(0.006)
            if start >= duration:
                break
            end = min(start + beat * 0.38, duration)
            s, e = slice_range(start, end)
            if e <= s: continue
            seg = arp_synth(note_to_freq(note), (e - s) / SAMPLE_RATE, 0.13)
            arp[s:e] += seg
    arp = lowpass(arp, 7000)
    out += arp * 0.55 * duck

    # Lead melody in chorus sections (bars 4-7, 12-15...)
    lead = np.zeros_like(t)
    lead_notes = [
        (4, "A4", 0.5), (4.5, "C5", 0.5), (5, "E5", 1.0), (6, "A5", 1.0),
        (7, "G5", 0.5), (7.5, "E5", 0.5),
        (12, "A4", 0.5), (12.5, "C5", 0.5), (13, "E5", 1.0), (14, "G5", 1.0),
        (14.75, "A5", 1.25),
    ]
    for bar_off, note, dur in lead_notes:
        start = bar_off * bar_dur + humanize(0.01)
        if start >= duration:
            break
        end = min(start + dur * beat, duration)
        s, e = slice_range(start, end)
        if e <= s: continue
        seg_dur = (e - s) / SAMPLE_RATE
        seg = synth_lead(note_to_freq(note), seg_dur, 0.22, patch="saw")
        seg *= adsr_envelope(seg_dur, 0.02, 0.08, 0.55, 0.25)
        lead[s:e] += seg
    lead = simple_delay(lead, delay_time=beat * 0.75, feedback=0.3, mix=0.25)
    lead = simple_reverb(lead, decay=0.5, mix=0.2)
    out += lead * 0.75

    # Drums with fills
    kick = np.zeros_like(t)
    snare = np.zeros_like(t)
    hihat = np.zeros_like(t)
    for step_i in range(total_steps):
        beat_i = step_i % 16
        start = step_i * step
        s = sample_count(start)
        if beat_i in [0, 4, 8, 12]:
            write_clip(kick, start + humanize(0.008), punchy_kick(beat * 0.45))
        if beat_i in [4, 12]:
            write_clip(snare, start + humanize(0.01), snare_hit(beat * 0.45))
        if beat_i % 2 == 0:
            write_clip(hihat, start + humanize(0.006), closed_hihat(0.06))
        if step_i % 32 == 31:  # drum fill every 8 bars
            fill_time = start + beat
            for j, note_offset in enumerate([0, beat * 0.33, beat * 0.66, beat]):
                write_clip(snare, fill_time + note_offset, snare_hit(beat * 0.3) * (0.8 + j * 0.1))
    out += kick + snare * 0.9 + hihat * 0.4

    # Master: light compression via soft clip + low cut
    out = highpass(out, 40)
    out = soft_clip(out, 0.8)
    save_wav(os.path.join(MUSIC_DIR, "pulse_highway.wav"), out)
    print("Generated BGM: pulse_highway.wav")


def generate_scrapyard_fight():
    """Heavy fight music with breakdown, buildup, and aggressive melody."""
    duration = 50.0
    bpm = 142.0
    beat = 60.0 / bpm
    step = beat / 4
    total_steps = int(duration / step)
    bar_dur = beat * 4
    num_bars = int(duration / bar_dur)
    t = np.linspace(0, duration, sample_count(duration), endpoint=False)
    out = np.zeros_like(t)

    chords = [
        ["A2", "E3", "A3", "C4", "E4"],
        ["F2", "C3", "F3", "A3", "C4"],
        ["C2", "G2", "C3", "E3", "G3"],
        ["G2", "D3", "G3", "B3", "D4"],
    ]
    chord_roots = ["A1", "F1", "C2", "G1"]
    duck = sidechain_duck(t, bpm, total_steps, depth=0.4)

    # Heavy distorted bass
    bass = np.zeros_like(t)
    pattern = [0, 0, 2, 1, 0, 2, 1, 2]
    for bar in range(num_bars):
        root_f = note_to_freq(chord_roots[bar % len(chord_roots)])
        freqs = [root_f, root_f * 1.5, root_f * 2.0]
        bar_offset = bar * bar_dur
        for i, idx in enumerate(pattern):
            start = bar_offset + i * beat * 0.5 + humanize(0.008)
            if start >= duration:
                break
            end = min(start + beat * 0.45, duration)
            s, e = slice_range(start, end)
            if e <= s: continue
            seg = saw_bass(freqs[idx], (e - s) / SAMPLE_RATE, 0.75)
            seg *= adsr_envelope((e - s) / SAMPLE_RATE, 0.005, 0.06, 0.45, 0.04)
            bass[s:e] += seg
    # Add distortion to bass
    bass = soft_clip(bass * 1.3, 0.55) / 1.3
    bass = lowpass(bass, 650)
    out += bass * duck

    # Stab pad
    pad = np.zeros_like(t)
    for bar in range(num_bars):
        chord = chords[bar % len(chords)]
        start = bar * bar_dur
        end = min(start + bar_dur, duration)
        s, e = slice_range(start, end)
        if e <= s: continue
        seg = np.zeros(e - s)
        for note in chord:
            seg += choir_pad(note_to_freq(note), (e - s) / SAMPLE_RATE, 0.15)
        seg *= adsr_envelope((e - s) / SAMPLE_RATE, 0.1, 0.15, 0.65, 0.4)
        pad[s:e] += seg
    pad = lowpass(pad, 2400)
    out += pad * 0.65 * duck

    # Aggressive lead motif: call and response every 4 bars
    lead = np.zeros_like(t)
    motif_a = [
        (0, "A4", 0.5), (0.5, "C5", 0.5), (1, "E5", 1.0), (2.5, "D5", 0.5),
        (3, "C5", 0.5), (3.5, "B4", 0.5),
    ]
    motif_b = [
        (0, "F4", 0.5), (0.5, "A4", 0.5), (1, "C5", 1.0), (2, "A4", 1.0),
        (3, "G4", 0.5), (3.5, "F4", 0.5),
    ]
    for section in range(num_bars // 4):
        motif = motif_a if section % 2 == 0 else motif_b
        section_offset = section * 4 * bar_dur
        for bar_off, note, dur in motif:
            start = section_offset + bar_off * bar_dur + humanize(0.012)
            if start >= duration:
                break
            end = min(start + dur * beat, duration)
            s, e = slice_range(start, end)
            if e <= s: continue
            seg_dur = (e - s) / SAMPLE_RATE
            seg = synth_lead(note_to_freq(note), seg_dur, 0.24, patch="brass")
            seg *= adsr_envelope(seg_dur, 0.015, 0.08, 0.4, 0.12)
            lead[s:e] += seg
    lead = simple_reverb(lead, decay=0.55, mix=0.25)
    out += lead * 0.8

    # Heavy drums with fills and occasional double-kick
    kick = np.zeros_like(t)
    snare = np.zeros_like(t)
    hihat = np.zeros_like(t)
    for step_i in range(total_steps):
        beat_i = step_i % 16
        start = step_i * step
        s = sample_count(start)
        if beat_i in [0, 4, 8, 12]:
            write_clip(kick, start + humanize(0.008), punchy_kick(beat * 0.45))
        if beat_i in [4, 12]:
            write_clip(snare, start + humanize(0.01), snare_hit(beat * 0.45))
        if beat_i % 2 == 0:
            write_clip(hihat, start + humanize(0.006), closed_hihat(0.06))
        if beat_i % 4 == 2:
            write_clip(hihat, start + humanize(0.007), open_hihat(beat * 0.25) * 0.7)
        # Double kick in chorus sections
        bar_idx = step_i // 16
        if (bar_idx // 4) % 2 == 1 and beat_i in [6, 14]:
            write_clip(kick, start + humanize(0.008), punchy_kick(beat * 0.3) * 0.7)
        # Snare fill every 8 bars
        if step_i % 32 == 30:
            fill_start = start + beat
            for j, off in enumerate([0, beat * 0.25, beat * 0.5, beat * 0.75, beat * 1.25]):
                write_clip(snare, fill_start + off, snare_hit(beat * 0.25) * (0.7 + j * 0.08))
    out += kick + snare * 0.95 + hihat * 0.5

    out = highpass(out, 40)
    out = soft_clip(out, 0.78)
    save_wav(os.path.join(MUSIC_DIR, "scrapyard_fight.wav"), out)
    print("Generated BGM: scrapyard_fight.wav")


def generate_vault_tension():
    """Sparse tension with evolving low drone and occasional metallic shocks."""
    duration = 38.0
    bpm = 88.0
    beat = 60.0 / bpm
    step = beat / 4
    total_steps = int(duration / step)
    t = np.linspace(0, duration, sample_count(duration), endpoint=False)
    out = np.zeros_like(t)

    # Evolving drone with slow LFO
    drone = np.zeros_like(t)
    for f in [55, 110, 165]:
        drone += sine_wave(f, duration, 0.16) * (1 + 0.03 * np.sin(2 * np.pi * 0.25 * t + f * 0.01))
    drone += sawtooth_wave(55, duration, 0.12)
    drone = lowpass(drone, 240)
    # Slow filter sweep
    sweep = 200 + 600 * (1 - np.cos(2 * np.pi * t / duration)) / 2
    drone = lowpass(drone, np.mean(sweep))
    out += drone

    # Sub pulse on root with occasional 5th
    sub = np.zeros_like(t)
    for step_i in range(total_steps):
        beat_i = step_i % 16
        if beat_i in [0, 8]:
            start = step_i * step + humanize(0.015)
            s = max(0, min(sample_count(start), len(sub)))
            seg = sine_wave(42, beat * 0.6, 0.6) * np.linspace(1, 0, sample_count(beat * 0.6))
            e = min(s + len(seg), len(sub))
            if e > s:
                sub[s:e] += seg[:e - s]
        if beat_i == 12 and step_i // 16 % 2 == 1:
            start = step_i * step
            s = max(0, min(sample_count(start), len(sub)))
            seg = sine_wave(62, beat * 0.5, 0.45) * np.linspace(1, 0, sample_count(beat * 0.5))
            e = min(s + len(seg), len(sub))
            if e > s:
                sub[s:e] += seg[:e - s]
    sub = lowpass(sub, 110)
    out += sub

    # Ticking percussion with occasional pattern change
    tick = np.zeros_like(t)
    for step_i in range(total_steps):
        beat_i = step_i % 16
        bar_i = step_i // 16
        if beat_i % 4 == 0:
            start = step_i * step + humanize(0.01)
            n = noise(beat * 0.08, 0.22)
            n *= adsr_envelope(beat * 0.08, 0.001, 0.015, 0.01, 0.02)
            n = bandpass(n, 3000, 9000)
            write_clip(tick, start, n)
        if bar_i % 4 == 3 and beat_i == 14:
            start = step_i * step
            n = noise(beat * 0.15, 0.3)
            n *= adsr_envelope(beat * 0.15, 0.001, 0.02, 0.05, 0.1)
            n = bandpass(n, 2000, 8000)
            write_clip(tick, start, n)
    out += tick * 0.6

    # Occasional metallic hits with reverb tail
    for off in [4.0, 12.0, 20.0, 28.0, 34.5]:
        if off >= duration:
            break
        hit = metallic_hit(0.5)
        hit = simple_reverb(hit, decay=1.0, mix=0.5)
        write_clip(out, off + humanize(0.02), hit * 0.55)

    out = highpass(out, 30)
    out = soft_clip(out, 0.8)
    save_wav(os.path.join(MUSIC_DIR, "vault_tension.wav"), out * 0.9)
    print("Generated BGM: vault_tension.wav")


def generate_victory_rise():
    """Heroic victory sting with rising melody and triumphant brass."""
    duration = 14.0
    bpm = 112.0
    beat = 60.0 / bpm
    bar_dur = beat * 4
    num_bars = int(duration / bar_dur) + 1
    t = np.linspace(0, duration, sample_count(duration), endpoint=False)
    out = np.zeros_like(t)

    chords = [
        ["A2", "E3", "A3", "C4", "E4"],
        ["F2", "C3", "F3", "A3", "C4"],
        ["C2", "G2", "C3", "E3", "G3"],
        ["G2", "D3", "G3", "B3", "D4"],
    ]

    # Swelling choir pad
    pad = np.zeros_like(t)
    for bar in range(num_bars):
        chord = chords[bar % len(chords)]
        start = bar * bar_dur
        end = min(start + bar_dur * 1.5, duration)
        s, e = slice_range(start, end)
        if e <= s: continue
        seg = np.zeros(e - s)
        for note in chord:
            seg += choir_pad(note_to_freq(note), (e - s) / SAMPLE_RATE, 0.22)
        seg *= adsr_envelope((e - s) / SAMPLE_RATE, 0.4, 0.3, 0.75, 1.0)
        pad[s:e] += seg
    pad = lowpass(pad, 2600)
    pad = simple_reverb(pad, decay=1.0, mix=0.4)
    out += pad

    # Marching snare with crescendo
    snare = np.zeros_like(t)
    for i in range(int(duration / beat)):
        start = i * beat + humanize(0.01)
        if start >= duration:
            break
        amp = 0.5 + 0.5 * (i / (duration / beat))
        write_clip(snare, start, snare_hit(beat * 0.6) * amp)
    out += snare * 0.55

    # Heroic lead motif: A -> C -> E -> A -> G -> E -> A
    lead = np.zeros_like(t)
    motif = [
        ("A4", 0.5, 1.0), ("C5", 0.5, 1.0), ("E5", 1.0, 1.0),
        ("A5", 1.0, 1.0), ("G5", 0.5, 0.9), ("E5", 0.5, 0.9), ("A5", 2.0, 1.0),
    ]
    note_dur = beat * 0.5
    for bar in range(num_bars):
        bar_offset = bar * bar_dur
        for i, (note, dur, vel) in enumerate(motif):
            start = bar_offset + i * note_dur + humanize(0.01)
            if start >= duration:
                break
            end = min(start + note_dur * dur * 0.9, duration)
            s, e = slice_range(start, end)
            if e <= s: continue
            seg_dur = (e - s) / SAMPLE_RATE
            f = note_to_freq(note)
            seg_t = np.linspace(0, seg_dur, e - s, endpoint=False)
            f_vib = f * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * seg_t))
            seg = np.sin(phase_from_freq(f_vib, e - s)) * 0.22 * vel
            seg += fm_wave(f, seg_dur, 0.18, mod_ratio=2.0, mod_index=3.0) * vel
            seg *= adsr_envelope(seg_dur, 0.02, 0.1, 0.55, 0.35)
            lead[s:e] += seg
    lead = simple_delay(lead, delay_time=beat * 0.5, feedback=0.25, mix=0.2)
    lead = simple_reverb(lead, decay=0.8, mix=0.25)
    out += lead * 0.85

    # Final crash
    crash = crash_cymbal(1.5)
    write_clip(out, 0.0, crash * 0.4)
    write_clip(out, 8 * beat, crash * 0.35)

    out = highpass(out, 40)
    out = soft_clip(out, 0.78)
    save_wav(os.path.join(MUSIC_DIR, "victory_rise.wav"), out)
    print("Generated BGM: victory_rise.wav")


# ═══════════════════════════════════════════════════════════════════════════════
# SFX
# ═══════════════════════════════════════════════════════════════════════════════
def sawtooth_wave_array(freq, duration):
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    phase = np.cumsum(2 * np.pi * freq / SAMPLE_RATE)
    return 2 * (phase / (2 * np.pi) - np.floor(phase / (2 * np.pi) + 0.5))


def sine_wave_array(freq, duration):
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    phase = np.cumsum(2 * np.pi * freq / SAMPLE_RATE)
    return np.sin(phase)


def square_wave_array(freq, duration):
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    phase = np.cumsum(2 * np.pi * freq / SAMPLE_RATE)
    return np.sign(np.sin(phase))


def generate_transform_sfx():
    duration = 1.5
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    servo = square_wave_array(80 + 400 * (t / duration), duration) * 0.3
    servo = lowpass(servo, 1400)
    scrape = noise(duration, 0.2)
    scrape = bandpass(scrape, 1000, 6000) * np.linspace(0.5, 0, n)
    whine = sine_wave_array(800 + 1200 * (t / duration), duration) * 0.4
    whine = shaped_envelope(whine, attack=0.1, decay=0.2, sustain=0.8, release=0.3)
    out = servo + scrape + whine
    save_wav(os.path.join(SFX_DIR, "transform.wav"), out)
    print("Generated SFX: transform.wav")


def generate_laser_sfx():
    duration = 0.35
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    freq = np.linspace(2200, 300, n)
    out = np.sin(phase_from_freq(freq, n)) * 0.6
    out += bandpass(noise(duration, 0.4), 2000, 8000) * np.linspace(1, 0, n)
    out = shaped_envelope(out, attack=0.005, decay=0.05, sustain=0.6, release=0.15)
    save_wav(os.path.join(SFX_DIR, "laser_fire.wav"), out)
    print("Generated SFX: laser_fire.wav")


def generate_footstep_sfx():
    duration = 0.4
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    thud = sine_wave(60, duration, 0.8) * np.exp(-t * 8)
    thud = lowpass(thud, 180)
    clang = bandpass(noise(duration, 0.5), 200, 2000) * np.exp(-t * 10)
    out = shaped_envelope(thud + clang, attack=0.005, decay=0.08, sustain=0.1, release=0.2)
    save_wav(os.path.join(SFX_DIR, "robot_footstep.wav"), out)
    print("Generated SFX: robot_footstep.wav")


def generate_engine_rev_sfx():
    duration = 1.0
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    freq = 80 + 60 * np.sin(t * 8)
    out = sawtooth_wave_array(freq, duration) * 0.5
    out = lowpass(out, 400)
    out += bandpass(noise(duration, 0.3), 500, 4000) * 0.4
    save_wav(os.path.join(SFX_DIR, "engine_rev.wav"), out)
    print("Generated SFX: engine_rev.wav")


def generate_impact_sfx():
    duration = 0.3
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    boom = sine_wave(50, duration, 0.8) * np.exp(-t * 12)
    crash = bandpass(noise(duration, 0.7), 300, 5000) * np.exp(-t * 15)
    out = shaped_envelope(boom + crash, attack=0.005, decay=0.05, sustain=0.2, release=0.15)
    save_wav(os.path.join(SFX_DIR, "impact_metal.wav"), out)
    print("Generated SFX: impact_metal.wav")


def generate_alarm_sfx():
    duration = 0.6
    n = sample_count(duration)
    t = np.linspace(0, duration, n, endpoint=False)
    freq = 800 + 200 * np.sign(np.sin(t * 15))
    out = square_wave_array(freq, duration) * 0.4
    out = shaped_envelope(out, attack=0.01, decay=0.02, sustain=0.8, release=0.05)
    save_wav(os.path.join(SFX_DIR, "alarm_beep.wav"), out)
    print("Generated SFX: alarm_beep.wav")


if __name__ == "__main__":
    random.seed(42)
    np.random.seed(42)
    generate_theme_logo()
    generate_pulse_highway()
    generate_scrapyard_fight()
    generate_vault_tension()
    generate_victory_rise()
    generate_transform_sfx()
    generate_laser_sfx()
    generate_footstep_sfx()
    generate_engine_rev_sfx()
    generate_impact_sfx()
    generate_alarm_sfx()
    print("All mecha audio generated.")
