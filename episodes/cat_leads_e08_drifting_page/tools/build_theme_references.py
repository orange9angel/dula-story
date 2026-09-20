"""E08 theme: build Seed-VC voice references from the episode's own TTS lines.

小蓝 = Girl lines (002/006/008/012), 阿澈 = Boy lines (003/007/009/011),
concatenated with 0.25s gaps, 48k mono, peak 0.8.
"""
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
SETS = {
    'girl_reference': ['002_Girl.wav', '006_Girl.wav', '008_Girl.wav', '012_Girl.wav'],
    'boy_reference': ['003_Boy.wav', '007_Boy.wav', '009_Boy.wav', '011_Boy.wav'],
}


def main():
    out = ROOT / 'assets/audio/theme/voice_ref'
    out.mkdir(parents=True, exist_ok=True)
    for name, files in SETS.items():
        parts = []
        for f in files:
            x, sr = sf.read(ROOT / 'assets/audio' / f, always_2d=True)
            assert sr == SR
            parts.append(x.mean(axis=1))
        gap = np.zeros(round(.25 * SR), dtype=np.float32)
        ref = np.concatenate([p for part in parts for p in (part, gap)][:-1])
        ref *= .8 / max(float(np.abs(ref).max()), 1e-9)
        sf.write(out / f'{name}.wav', ref, SR, subtype='PCM_16')
        print(f'{name}.wav {len(ref)/SR:.2f}s')


if __name__ == '__main__':
    main()
