"""V15: continuous viseme track for lip sync.

Replaces V13/V14's per-character stepped viseme windows with a baked keyframe
track. Each lyric character is split into a consonant segment (first 25% of the
span, capped at 120ms) and a vowel segment; vowel targets are continuous
[jaw, width, rounding] values, diphthongs slide through 2-3 keyframes, stop
consonants seal, f goes labiodental, and consonant keyframes pre-shape 40%
toward the upcoming vowel (coarticulation). Silence eases jaw to 0 over 100ms
with 200ms hold frames. Jaw is scaled by the V14 anti-vibrato amplitude, which
is also stored per keyframe so viewers need no other feature file.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
STEP = .01  # 10ms keyframe grid
# jaw 0..1, width -1..1 (negative = narrower/rounder), rounding 0..1
VOWELS = {'a': (.9, .1, 0), 'o': (.7, -.1, 1), 'e': (.55, .2, 0),
          'i': (.35, .35, 0), 'u': (.3, -.15, 1)}
STOPS = 'bpm'
FRICATIVE_F = 'f'
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

    def emit(t, jaw, width, rounding, seal=0.0, labiodental=0.0):
        t = round(round(t / STEP) * STEP, 2)  # 10ms alignment
        amp = amp_at(t)
        keys.append({
            't': t,
            'jaw': round(min(max(jaw * amp, 0), 1), 4),
            'width': round(min(max(width, -1), 1), 4),
            'rounding': round(min(max(rounding, 0), 1), 4),
            'seal': round(min(max(seal, 0), 1), 4),
            'labiodental': round(min(max(labiodental, 0), 1), 4,
            ),
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
        else:
            # Slight closure, 40% pre-shape toward the vowel target.
            j = min(.22, COART * ct[0])
            emit(s, j, cw, cr)
            if cons > .05:
                emit(onset, j, cw, cr)
        # --- vowel segment: reach the first target, slide through glides ---
        attack = min(.05, .25 * vlen)
        emit(onset + attack, *VOWELS[seq[0]])
        fracs = [.85] if len(seq) == 2 else [.55, .85]
        for v, frac in zip(seq[1:], fracs):
            emit(onset + frac * vlen, *VOWELS[v])
        emit(e, *VOWELS[seq[-1]])  # hold the final vowel to the character end
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
        'method': ('per-character consonant segment (25%%, <=120ms) + vowel segment; continuous '
                   'vowel targets a/o/e/i/u, diphthongs slide 2-3 keyframes; b/p/m seal with 30ms '
                   'pre-onset closure, f labiodental, others slight closure; consonant keyframes '
                   'pre-shape 40%% toward the next vowel; silence eases jaw to 0 over 100ms with '
                   '200ms hold frames; jaw scaled by V14 anti-vibrato amplitude; 10ms grid'),
        'source': 'music_analysis_v10.json lyric_chars + vocal_features_v14 amplitude',
    }
    (ROOT / 'config/viseme_track_v15.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'V15: {len(track)} keyframes over {duration}s from {len(chars)} characters')
    for c in sorted(chars, key=lambda x: x['end'] - x['start'], reverse=True)[:5]:
        print(f"  long vowel {c['ch']} {c['pinyin']:<6} {c['start']:.2f}-{c['end']:.2f}")


if __name__ == '__main__':
    main()
