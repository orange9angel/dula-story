"""V17: continuous viseme track with articulation detail channels.

Extends the V15 track (consonant segment 25%/<=120ms, coarticulation,
diphthong glides, silence ease, amplitude scaling, 10ms grid) with two new
per-keyframe channels:

- purse  (0..1): rounded-protruded "small round hole" lip shape. u/ü vowels
  and the u-tail of ou/ao/iu diphthongs carry purse=1 (the V15 width-only
  narrowing for u read as a flat slit, not 撮口).
- teeth  (0..1): upper-teeth exposure. Sibilants and affricates
  s/z/c/sh/zh/ch/r/j/q/x hold teeth=1 with a small jaw (upper/lower teeth
  close together) through the consonant segment.

Stop consonants b/p/m keep their seal but the burst release now reaches the
vowel target within <=40ms (was up to 50ms).
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
STEP = .01  # 10ms keyframe grid
# jaw 0..1, width -1..1 (negative = narrower/rounder), rounding 0..1, purse 0..1
VOWELS = {'a': (.9, .1, 0), 'o': (.7, -.1, 1), 'e': (.55, .2, 0),
          'i': (.35, .35, 0), 'u': (.3, -.15, 1)}
PURSE = {'a': 0, 'o': 0, 'e': 0, 'i': 0, 'u': 1}
STOPS = 'bpm'
FRICATIVE_F = 'f'
SIBILANTS = {'s', 'z', 'c', 'sh', 'zh', 'ch', 'r', 'j', 'q', 'x'}
SIBILANT_JAW = .12     # small opening, upper/lower teeth close
STOP_ATTACK = .04      # b/p/m burst: vowel target within 40ms of release
SILENCE_GAP = .06     # gaps up to this stay connected to the next character
CLOSE_TIME = .10      # silence ease: jaw -> 0 over 100ms
HOLD_STEP = .20       # one hold keyframe per 200ms of silence
COART = .40           # consonant pre-shape weight toward the next vowel


def vowel_plan(final):
    """(keyframe vowel sequence, core vowel) for a pinyin final."""
    if 'a' in final:
        core = 'a'
    elif 'o' in final:
        core = 'o'
    elif 'e' in final:
        core = 'e'
    elif re.search(r'[uüv]', final):
        core = 'u'
    else:
        core = 'i'
    if re.match(r'^i[aeou]', final):
        first = 'i'
    elif re.match(r'^[uüv][aeio]', final):
        first = 'u'
    else:
        first = core
    if re.search(r'(ai|ei|ui)$', final):
        last = 'i'
    elif re.search(r'(ao|ou|iu)$', final):
        last = 'u'
    else:
        last = core
    seq = []
    for v in (first, core, last):
        if not seq or seq[-1] != v:
            seq.append(v)
    return seq, core


def main():
    music = json.loads((ROOT / 'config/music_analysis_v10.json').read_text(encoding='utf-8'))
    features = json.loads((ROOT / 'config/vocal_features_v14.json').read_text(encoding='utf-8'))
    chars = music['lyric_chars']
    frames = features['frames']
    duration = round(len(frames) * STEP, 2)

    def amp_at(t):
        f = min(max(t / STEP, 0), len(frames) - 1)
        i = int(f)
        a, b = frames[i]['amplitude'], frames[min(i + 1, len(frames) - 1)]['amplitude']
        return a + (b - a) * (f - i)

    keys = []

    def emit(t, jaw, width, rounding, seal=0.0, labiodental=0.0, teeth=0.0, purse=0.0):
        t = round(round(t / STEP) * STEP, 2)  # 10ms alignment
        amp = amp_at(t)
        keys.append({
            't': t,
            'jaw': round(min(max(jaw * amp, 0), 1), 4),
            'width': round(min(max(width, -1), 1), 4),
            'rounding': round(min(max(rounding, 0), 1), 4),
            'seal': round(min(max(seal, 0), 1), 4),
            'labiodental': round(min(max(labiodental, 0), 1), 4),
            'teeth': round(min(max(teeth, 0), 1), 4),
            'purse': round(min(max(purse, 0), 1), 4),
            'amplitude': round(amp, 4),
        })

    def silence(after, until):
        """Close over 100ms after `after`, then 200ms hold frames until `until`."""
        if until - after <= SILENCE_GAP:
            return
        t = after + CLOSE_TIME
        emit(t, 0, 0, 0)
        t += HOLD_STEP
        while t < until - .02:
            emit(t, 0, 0, 0)
            t += HOLD_STEP

    silence(-CLOSE_TIME, chars[0]['start'])  # leading quiet before the first character
    for idx, c in enumerate(chars):
        s = c['start']
        # DTW spans overlap on a third of the characters; the track is a single
        # timeline, so each character owns its span only up to the next start.
        nxt_start = chars[idx + 1]['start'] if idx + 1 < len(chars) else None
        e = min(c['end'], nxt_start) if nxt_start is not None else c['end']
        dur = e - s
        initial, final = c['initial'], c['final']
        seq, core = vowel_plan(final)
        ct = VOWELS[core]
        cons = min(.25 * dur, .120) if initial else 0.0
        onset = s + cons
        vlen = max(e - onset, .03)
        # --- consonant segment: pre-shaped 40% toward the vowel ---
        cw, cr = COART * ct[1], COART * ct[2]
        if initial in STOPS:
            # Bilabial closure holds until 30ms before the vocal head, releases at it.
            emit(s, 0, cw, cr, seal=1)
            emit(onset - .03, 0, cw, cr, seal=1)
            emit(onset, .15, cw, cr, seal=0)
        elif initial == FRICATIVE_F:
            emit(s, .15, cw, cr, labiodental=1)
            emit(onset - .02, .15, cw, cr, labiodental=1)
            emit(onset, .2, cw, cr, labiodental=0)
        elif initial in SIBILANTS:
            # Sibilants/affricates: teeth exposed, jaw nearly closed, held to the vowel.
            emit(s, SIBILANT_JAW, cw, cr, teeth=1)
            emit(onset, SIBILANT_JAW, cw, cr, teeth=1)
        else:
            # Slight closure, 40% pre-shape toward the vowel target.
            j = min(.22, COART * ct[0])
            emit(s, j, cw, cr)
            if cons > .05:
                emit(onset, j, cw, cr)
        # --- vowel segment: reach the first target, slide through glides ---
        attack = min(STOP_ATTACK if initial in STOPS else .05, .25 * vlen)
        emit(onset + attack, *VOWELS[seq[0]], purse=PURSE[seq[0]])
        fracs = [.85] if len(seq) == 2 else [.55, .85]
        for v, frac in zip(seq[1:], fracs):
            emit(onset + frac * vlen, *VOWELS[v], purse=PURSE[v])
        emit(e, *VOWELS[seq[-1]], purse=PURSE[seq[-1]])  # hold the final vowel to the character end
        silence(e, nxt_start if nxt_start is not None else duration)

    keys.sort(key=lambda k: k['t'])
    track = []
    for k in keys:
        if track and k['t'] <= track[-1]['t']:
            track[-1] = k  # same grid point: the later definition wins
        else:
            track.append(k)
    report = {
        'sample_step': STEP,
        'keyframes': track,
        'method': ('V15 track + V17 detail channels: purse=1 on u/ü vowels and ou/ao/iu '
                   'diphthong tails (small round protruded opening); teeth=1 with jaw 0.12 on '
                   's/z/c/sh/zh/ch/r/j/q/x consonant segments; b/p/m seal releases to the vowel '
                   'target within 40ms; consonant segment 25%/<=120ms, 40% coarticulation, '
                   'diphthong slides, silence eases jaw to 0 over 100ms with 200ms hold frames; '
                   'jaw scaled by V14 anti-vibrato amplitude; 10ms grid'),
        'source': 'music_analysis_v10.json lyric_chars + vocal_features_v14 amplitude',
    }
    (ROOT / 'config/viseme_track_v17.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'V17: {len(track)} keyframes over {duration}s from {len(chars)} characters')
    for c in chars:
        if c['initial'] in SIBILANTS or (c['initial'] in STOPS and PURSE.get(vowel_plan(c['final'])[1])):
            print(f"  detail {c['ch']} {c['pinyin']:<6} {c['start']:.2f}-{c['end']:.2f}")


if __name__ == '__main__':
    main()
