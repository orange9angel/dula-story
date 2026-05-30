import wave
import struct
import math
import random
import os

def write_wav_mono(filepath, samples, sample_rate=48000):
    n = len(samples)
    with wave.open(filepath, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for s in samples:
            s = max(-1.0, min(1.0, s))
            w.writeframes(struct.pack('<h', int(s * 32767)))

def generate_comic_flee(filepath, duration=1.2, sample_rate=48000):
    """搞笑逃跑音效：夸张的嗖嗖声 + 快速脚步节奏 + 滑稽音调下滑"""
    n = int(sample_rate * duration)
    samples = []
    for i in range(n):
        t = i / sample_rate
        
        # Layer 1: 滑稽音调下滑 (cartoon flee whistle)
        whistle_env = math.exp(-t / 0.3)
        whistle_freq = 1200 * math.exp(-t / 0.15) + 200
        whistle = math.sin(2 * math.pi * whistle_freq * t) * whistle_env * 0.25
        
        # Layer 2: 快速"哒哒哒"脚步声节奏
        step_rate = 12.0
        step_phase = (t * step_rate) % 1.0
        step_env = math.exp(-step_phase / 0.05) if step_phase < 0.1 else 0
        step_noise = (random.random() * 2 - 1) * step_env * 0.3
        
        # Layer 3: 嗖嗖风声
        whoosh_env = math.exp(-t / 0.4)
        whoosh = (random.random() * 2 - 1) * whoosh_env * 0.2
        
        # Layer 4: 滑稽弹簧音
        boing_env = math.exp(-t / 0.08) if t < 0.2 else 0
        boing_freq = 600 * math.exp(-t / 0.06)
        boing = math.sin(2 * math.pi * boing_freq * t) * boing_env * 0.15
        
        sample = (whistle + step_noise + whoosh + boing) * 0.9
        samples.append(sample)
    
    write_wav_mono(filepath, samples, sample_rate)

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'sfx')
    os.makedirs(out_dir, exist_ok=True)
    generate_comic_flee(os.path.join(out_dir, 'comic_flee.wav'))
    print(f"Generated: comic_flee.wav")
