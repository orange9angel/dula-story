"""Cut the song vocals/master into A/B segments at the aligned line-4/5 seam.

Writes assets/audio/segments/vocals_A.wav, vocals_B.wav (Seed-VC inputs) and
records the split in config/segments.json. This version cuts exactly at the
aligned seam; no pre-roll is implemented. Inspect the seam after conversion.
"""
from pathlib import Path
import json
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]


def main():
    al = json.loads((ROOT / 'config/song_alignment.json').read_text(encoding='utf-8'))
    b = al['ab_boundary']
    vocals, sr = sf.read(ROOT / 'assets/audio/stems/vocals.wav', always_2d=True)
    cut = round(b * sr)
    out = ROOT / 'assets/audio/segments'
    out.mkdir(parents=True, exist_ok=True)
    sf.write(out / 'vocals_A.wav', vocals[:cut], sr, subtype='FLOAT')
    sf.write(out / 'vocals_B.wav', vocals[cut:], sr, subtype='FLOAT')
    (ROOT / 'config/segments.json').write_text(json.dumps({
        'ab_boundary': b, 'sample_rate': sr,
        'A': {'song_start': 0.0, 'song_end': b, 'seconds': round(b, 3)},
        'B': {'song_start': b, 'song_end': al['duration'], 'seconds': round(al['duration'] - b, 3)},
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"A: 0-{b:.3f}s ({b:.2f}s), B: {b:.3f}-{al['duration']}s ({al['duration']-b:.2f}s)")


if __name__ == '__main__':
    main()
