"""E08 theme: align the 16 known lyric lines to the 141s vocal stem.

faster-whisper find_alignment only sees a 30s window, so alignment is
anchor-then-refine:
  1. transcribe the full vocal stem (no VAD — VAD eats sung lines) to get
     rough sung-segment boundaries; cache to config/theme_transcribe.json.
  2. Segments map onto the 16 lyric lines in order by a greedy text-similarity
     matcher (a line may absorb two consecutive segments when Suno splits a
     long line mid-phrase).
  3. Per-line known-text DTW (find_alignment) inside [start-0.35, end+0.45]
     snaps exact character times.

Suno may not sing the sheet verbatim — the transcript text is kept per line
and low-probability characters are reported; the alignment wins.
"""
from pathlib import Path
import difflib
import hashlib
import json
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio, pad_or_trim
from faster_whisper.tokenizer import Tokenizer

ROOT = Path(__file__).resolve().parents[1]
STEM = ROOT / 'assets/audio/theme/stems/vocals.wav'
WIN_HEAD, WIN_TAIL = .35, .45


def main():
    lines = [s.strip() for s in (ROOT / 'config/theme_lyrics.txt').read_text(encoding='utf-8').splitlines() if s.strip()]
    assert len(lines) == 16, f'歌词应为 16 行, 实际 {len(lines)}'
    model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)

    tcache = ROOT / 'config/theme_transcribe.json'
    if tcache.exists():
        segs = json.loads(tcache.read_text(encoding='utf-8'))
    else:
        raw, _ = model.transcribe(str(STEM), language='zh', word_timestamps=True, vad_filter=False)
        segs = [{'start': round(float(s.start), 3), 'end': round(float(s.end), 3), 'text': s.text.strip()}
                for s in raw]
        tcache.write_text(json.dumps(segs, ensure_ascii=False, indent=2), encoding='utf-8')
    sung = [s for s in segs if any('\u4e00' <= ch <= '\u9fff' for ch in s['text'])]
    # Greedy in-order match: each lyric line takes one transcript segment, or
    # two when Suno splits a long line (e.g. 「某一天你停下 / 那靠岸的地方」).
    def norm(s):
        return ''.join(ch for ch in s if '\u4e00' <= ch <= '\u9fff')
    def sim(a, b):
        return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()
    merged = []
    si = 0
    for line in lines:
        one = sim(line, sung[si]['text'])
        two = sim(line, sung[si]['text'] + sung[si + 1]['text']) if si + 1 < len(sung) else -1
        take_two = two > one and two - one > .08
        seg = dict(sung[si])
        if take_two:
            seg['end'] = sung[si + 1]['end']
            seg['text'] += sung[si + 1]['text']
            si += 1
        seg['sim'] = round(max(one, two), 3)
        merged.append(seg)
        si += 1
    assert si == len(sung), f'唱段未消费完: {si}/{len(sung)}'
    print(f'{len(segs)} transcript segs -> {len(sung)} sung -> 16 lines '
          f'(min sim {min(s["sim"] for s in merged)})')

    y, sr = sf.read(STEM, always_2d=True)
    all_lines, all_chars = [], []
    for li, (line, seg) in enumerate(zip(lines, merged)):
        text = line.replace(' ', '')
        win_a = max(0, seg['start'] - WIN_HEAD)
        win_b = min(len(y) / sr, seg['end'] + WIN_TAIL)
        tmp = ROOT / 'tmp' / f'theme_line_{li}.wav'
        tmp.parent.mkdir(exist_ok=True)
        sf.write(tmp, y[round(win_a*sr):round(win_b*sr)], sr, subtype='FLOAT')
        audio = decode_audio(str(tmp), sampling_rate=16000)
        tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task='transcribe', language='zh')
        tokens = [token for ch in text for token in tokenizer.encode(ch)]
        features = model.feature_extractor(audio)
        encoder = model.encode(pad_or_trim(features))
        aligned = model.find_alignment(tokenizer, [tokens], encoder, min(len(audio) // 160, 3000))[0]
        chars = [{'ch': w['word'], 'start': round(float(w['start']) + win_a, 3),
                  'end': round(float(w['end']) + win_a, 3), 'probability': round(float(w['probability']), 4),
                  'line': li} for w in aligned]
        assert ''.join(c['ch'] for c in chars) == text
        all_chars.extend(chars)
        all_lines.append({'line': li, 'text': line,
                          'start': chars[0]['start'], 'end': chars[-1]['end'],
                          'mean_p': round(float(np.mean([c['probability'] for c in chars])), 3),
                          'transcript': seg['text'], 'transcript_span': [seg['start'], seg['end']]})
        print(f"L{li:02d} {chars[0]['start']:7.2f}-{chars[-1]['end']:7.2f} p={all_lines[-1]['mean_p']:.2f} "
              f"{line}   [transcript: {seg['text']}]")

    warnings = [c for c in all_chars if c['probability'] < .1]
    report = {
        'stem_sha256': hashlib.sha256(STEM.read_bytes()).hexdigest(),
        'method': 'transcribe(no-VAD) sung-segment anchors + per-line known-text DTW',
        'note': 'Suno 实际唱词以本对齐为准; transcript 列保留识别原文, 低置信字见 warnings',
        'lines': all_lines, 'chars': all_chars, 'warnings': warnings,
        'duet_section': {'lines': [12, 13, 14, 15],
                         'start': all_lines[12]['start'], 'end': all_lines[15]['end']},
    }
    (ROOT / 'config/theme_alignment.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"duet section: {all_lines[12]['start']:.3f} - {all_lines[15]['end']:.3f}s; "
          f"{len(warnings)} low-confidence chars")


if __name__ == '__main__':
    main()
