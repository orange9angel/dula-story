"""E08 theme: cut the four duet lines out of the vocal stem for Seed-VC.

Lines 12-15 (0-based) = the final chorus. 小蓝(女) takes 12/14, 阿澈(男) 13/15.
Each clip carries 150ms head / 250ms tail pad so Seed-VC has onset context;
assembly re-anchors by clip start and crossfades 50ms at the edges.
"""
from pathlib import Path
import json
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
HEAD, TAIL = .15, .25
VOICES = {12: ('blue', 'girl'), 13: ('che', 'boy'), 14: ('blue', 'girl'), 15: ('che', 'boy')}


def main():
    al = json.loads((ROOT / 'config/theme_alignment.json').read_text(encoding='utf-8'))
    vocals, sr = sf.read(ROOT / 'assets/audio/theme/stems/vocals.wav', always_2d=True)
    out = ROOT / 'assets/audio/theme/duet'
    out.mkdir(parents=True, exist_ok=True)
    for li, (voice, ref) in VOICES.items():
        line = al['lines'][li]
        a = max(0, line['start'] - HEAD)
        b = min(len(vocals) / sr, line['end'] + TAIL)
        clip = vocals[round(a*sr):round(b*sr)]
        name = f'line{li:02d}_{voice}.wav'
        sf.write(out / name, clip, sr, subtype='FLOAT')
        print(f"{name}: {a:.3f}-{b:.3f}s ({b-a:.2f}s) -> {voice}({ref})")
    (out / 'cuts.json').write_text(json.dumps({
        str(li): {'voice': v, 'ref': r, 'clip_start': round(max(0, al['lines'][li]['start'] - HEAD), 3),
                  'line_start': al['lines'][li]['start'], 'line_end': al['lines'][li]['end']}
        for li, (v, r) in VOICES.items()}, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
