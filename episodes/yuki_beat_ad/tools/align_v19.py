"""V19: known-lyrics Whisper DTW alignment on the V19 separated vocal.

align_v10 with the V19 stem path and cache file. Character alignment, not
measured phoneme boundaries. The lyrics text is unchanged from V10-V17; the
assertion that the aligned characters equal the diva_lyrics text is what
allows a new song through (a different lyric sheet would fail here).
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio, pad_or_trim
from faster_whisper.tokenizer import Tokenizer

ROOT = Path(__file__).resolve().parents[1]


def main():
    stem = ROOT / 'assets/audio/stems_v19/vocals.wav'
    lines = [s.strip() for s in (ROOT / 'config/diva_lyrics_v19.txt').read_text(encoding='utf-8').splitlines() if s.strip()]
    text = ''.join(lines).replace(' ', '')
    target = ROOT / 'config/lyrics_forced_alignment_v19.json'
    key = {'stem_sha256': hashlib.sha256(stem.read_bytes()).hexdigest(), 'text': text,
           'method': 'faster-whisper small CPU int8; supplied per-character tokens; cross-attention DTW', 'version': 1}
    if target.exists():
        data = json.loads(target.read_text(encoding='utf-8'))
        if all(data.get(k) == v for k, v in key.items()):
            print('Forced alignment cache valid')
            return
    model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task='transcribe', language='zh')
    tokens = [token for ch in text for token in tokenizer.encode(ch)]
    audio = decode_audio(str(stem), sampling_rate=16000)
    if len(audio) > 30 * 16000:
        raise ValueError('This episode aligner requires a <=30s track')
    features = model.feature_extractor(audio)
    encoder = model.encode(pad_or_trim(features))
    aligned = model.find_alignment(tokenizer, [tokens], encoder, min(len(audio) // 160, 3000))[0]
    chars = [{'ch': w['word'], 'start': round(float(w['start']), 3),
              'end': round(float(w['end']), 3), 'probability': round(float(w['probability']), 4)} for w in aligned]
    assert ''.join(c['ch'] for c in chars) == text
    assert all(len(c['ch']) == 1 for c in chars)
    warnings = [c for c in chars if c['end'] - c['start'] < .035 or c['end'] - c['start'] > 1.25 or c['probability'] < .1]
    target.write_text(json.dumps({**key, 'chars': chars, 'warnings': warnings,
        'phoneme_timing': 'not measured; viseme consonant/vowel transitions remain an animation approximation'},
        ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Aligned {len(chars)} characters; {len(warnings)} suspect spans')
    for c in chars:
        print(f"{c['start']:6.2f}-{c['end']:6.2f} {c['ch']} p={c['probability']:.2f}")


if __name__ == '__main__':
    main()
