"""Build voice references: concat Mochi TTS lines into one Seed-VC reference.

Sources: yuki_morning_battle manifest Mochi entries (010/012/017). The Yuki
reference is already copied to voice_ref/yuki_reference.wav.
"""
from pathlib import Path
import subprocess
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
MORNING = ROOT.parents[0] / 'yuki_morning_battle'
SR = 48000


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                          '-ac', '1', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def main():
    out = ROOT / 'assets/audio/voice_ref'
    out.mkdir(parents=True, exist_ok=True)
    parts = [load(MORNING / f'assets/audio/{n}_Mochi.mp3') for n in ('010', '012', '017')]
    gap = np.zeros(round(.25 * SR), dtype=np.float32)
    ref = np.concatenate([p for part in parts for p in (part, gap)][:-1])
    ref *= .8 / max(float(np.abs(ref).max()), 1e-9)
    sf.write(out / 'mochi_reference.wav', ref, SR, subtype='PCM_16')
    print(f'mochi_reference.wav {len(ref)/SR:.2f}s; yuki_reference.wav copied')


if __name__ == '__main__':
    main()
