"""Known-lyrics Whisper DTW alignment for the fish musical.

Two jobs:
  song     — config/song_lyrics.txt (8 lines) against stems/vocals.wav
             -> config/song_alignment.json (also computes the A/B boundary at
             the line-4/line-5 seam)
  dialogue — each assets/audio/dialogue/*.mp3 against its known text
             -> config/dialogue_alignment.json
"""
from pathlib import Path
import hashlib
import json
import re
import sys
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio, pad_or_trim
from faster_whisper.tokenizer import Tokenizer

ROOT = Path(__file__).resolve().parents[1]
DIALOGUE = [
    ('01_yuki_angry', 'Yuki', '年糕我的小鱼干呢'),
    ('02_mochi_meh', 'Mochi', '喵'),
    ('03_yuki_press', 'Yuki', '是吗那你嘴角的是什么'),
    ('04_mochi_art', 'Mochi', '这是艺术'),
    ('05_mochi_defeat', 'Mochi', '喵呜'),
]


def align_text(model, make_tokenizer, audio_path, text):
    tokenizer = make_tokenizer()
    tokens = [token for ch in text for token in tokenizer.encode(ch)]
    audio = decode_audio(str(audio_path), sampling_rate=16000)
    if len(audio) > 30 * 16000:
        raise ValueError('aligner requires a <=30s track')
    features = model.feature_extractor(audio)
    encoder = model.encode(pad_or_trim(features))
    aligned = model.find_alignment(tokenizer, [tokens], encoder, min(len(audio) // 160, 3000))[0]
    chars = [{'ch': w['word'], 'start': round(float(w['start']), 3),
              'end': round(float(w['end']), 3), 'probability': round(float(w['probability']), 4)} for w in aligned]
    assert ''.join(c['ch'] for c in chars) == text, f'对齐文本不一致: {audio_path}'
    assert all(len(c['ch']) == 1 for c in chars)
    return chars, round(len(audio) / 16000, 3)


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
    make_tokenizer = lambda: Tokenizer(model.hf_tokenizer, model.model.is_multilingual,
                                       task='transcribe', language='zh')

    if which in ('song', 'all'):
        stem = ROOT / 'assets/audio/stems/vocals.wav'
        lines = [s.strip() for s in (ROOT / 'config/song_lyrics.txt').read_text(encoding='utf-8').splitlines() if s.strip()]
        text = ''.join(lines).replace(' ', '')
        target = ROOT / 'config/song_alignment.json'
        key = {'stem_sha256': hashlib.sha256(stem.read_bytes()).hexdigest(), 'text': text,
               'method': 'faster-whisper small CPU int8; supplied per-character tokens; cross-attention DTW', 'version': 1}
        if target.exists():
            data = json.loads(target.read_text(encoding='utf-8'))
            if all(data.get(k) == v for k, v in key.items()):
                print('Song alignment cache valid')
            else:
                target.unlink()
        if not target.exists():
            chars, duration = align_text(model, make_tokenizer, stem, text)
            # A/B boundary: seam between line 4 and line 5
            counts = [len(l.replace(' ', '')) for l in lines]
            b0 = sum(counts[:4])
            boundary = chars[b0]['start']
            warnings = [c for c in chars if c['end'] - c['start'] < .035 or c['end'] - c['start'] > 1.25 or c['probability'] < .1]
            target.write_text(json.dumps({**key, 'chars': chars, 'lines': lines, 'line_char_counts': counts,
                'ab_boundary': boundary, 'ab_boundary_char': b0, 'duration': duration, 'warnings': warnings,
                'phoneme_timing': 'not measured; viseme timing remains an animation approximation'},
                ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'Song: {len(chars)} chars, A/B boundary {boundary:.3f}s (char #{b0}), {len(warnings)} warnings')
            for c in chars:
                print(f"{c['start']:6.2f}-{c['end']:6.2f} {c['ch']} p={c['probability']:.2f}")

    if which in ('dialogue', 'all'):
        out = ROOT / 'config/dialogue_alignment.json'
        result = {}
        for name, character, text in DIALOGUE:
            path = ROOT / f'assets/audio/dialogue/{name}.mp3'
            chars, duration = align_text(model, make_tokenizer, path, text)
            result[name] = {'character': character, 'text': text, 'duration': duration, 'chars': chars}
            print(f'{name}: {duration}s, {len(chars)} chars')
        out.write_text(json.dumps({'method': 'faster-whisper small CPU int8 per-line DTW', 'dialogue': result},
            ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
