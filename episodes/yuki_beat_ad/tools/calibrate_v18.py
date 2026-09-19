"""V18: calibrate lyric timing against the V18 vocal stem.

calibrate_v12 with V18 paths (stems_v18 + mixed_v18_base). The sha cross-check
against the old master is replaced by recording both shas; the algorithm
(spectral-flux leading edges, global offset vote, order-constrained local
anchoring, 30ms visual anticipation) is unchanged.
"""
from pathlib import Path
import copy
import hashlib
import json
import numpy as np
import soundfile as sf
from scipy.signal import find_peaks, resample_poly, stft
from scipy.ndimage import gaussian_filter1d

ROOT = Path(__file__).resolve().parents[1]


def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def scan(starts, t, signal, offsets):
    return np.array([np.mean(np.interp(starts + off, t, signal, left=0, right=0)) for off in offsets])


def calibrate(music):
    stem = ROOT / 'assets/audio/stems_v18/vocals.wav'
    base = ROOT / 'assets/audio/mixed_v18_base.wav'
    sep = json.loads((stem.parent / 'separation.json').read_text(encoding='utf-8'))
    assert sep['source_sha256'] == digest(base), 'stems_v18 并非分离自 mixed_v18_base'
    inherited = music['lyric_chars']
    # Undo the previous start-only anchoring, which also baked in anticipation.
    # The gap-trimmed DTW boundaries remain available explicitly on each row.
    chars = copy.deepcopy(inherited)
    for c in chars:
        c['start'] = c.get('dtw_start', c['start'])
        c['dtw_start'] = c['start']
        c['dtw_end'] = c['end']
        c.pop('onset_anchored', None)
    y, sr = sf.read(stem, always_2d=True)
    mono = resample_poly(y.mean(axis=1), 16000, sr)
    freq, t, z = stft(mono, 16000, nperseg=512, noverlap=432, boundary='zeros')
    band = (freq > 180) & (freq < 6000)
    magnitudes = np.log1p(np.abs(z[band]) * 80)
    flux = gaussian_filter1d(np.maximum(np.diff(magnitudes, axis=1, prepend=np.zeros((sum(band), 1))), 0).mean(axis=0), 1)
    et = np.array([e['t'] for e in music['vocal_envelope']])
    env = np.array([e['level'] for e in music['vocal_envelope']])
    rise = gaussian_filter1d(np.maximum(np.diff(env, prepend=env[0]), 0), 1)
    starts = np.array([c['start'] for c in chars])
    offsets = np.round(np.arange(-.6, .6001, .005), 3)
    fs = scan(starts, t, flux, offsets); rs = scan(starts, et, rise, offsets)
    best = int(np.argmax(fs)); candidate = offsets[best]
    competitor = int(np.argmax(np.where(abs(offsets - candidate) >= .08, fs, -np.inf)))
    margin = float(fs[best] / fs[competitor] - 1)
    votes = []
    for line in music['lyric_lines']:
        ss = starts[line['char0']:line['char0'] + line['n_chars']]
        sscores = scan(ss, t, flux, offsets)
        votes.append(float(offsets[int(np.argmax(sscores))]))
    agree = int(sum(abs(v - candidate) <= .05 for v in votes))
    accepted = margin >= .15 and agree >= 6 and abs(candidate) <= .2
    offset = float(candidate) if accepted else 0.0
    peaks, props = find_peaks(flux, distance=16, prominence=float(np.quantile(flux, .75) * .50))
    attacks = []
    for idx, peak in enumerate(peaks):
        # A spectral-rise peak follows the start of the attack; backtrack its
        # leading edge, not a distant amplitude trough or a drum transient.
        left = max(0, peak - 9); threshold = flux[peak] * .32
        onset = peak
        while onset > left and flux[onset - 1] >= threshold: onset -= 1
        time = float(t[onset])
        energy = float(np.max(env[(et >= time - .015) & (et <= time + .055)], initial=0))
        local_rise = float(np.max(rise[(et >= time - .025) & (et <= time + .055)], initial=0))
        if energy < .08 or local_rise < np.quantile(rise, .65): continue
        attacks.append({'id': len(attacks), 'time': round(time, 3), 'peak': round(float(t[peak]), 3),
            'strength': float(props['prominences'][idx]), 'energy': energy, 'rise': local_rise})
    strength_ref = max(np.quantile([a['strength'] for a in attacks], .65), 1e-8)
    used = set(); rows = []
    for i, c in enumerate(chars):
        expected = max(0, c['dtw_start'] + offset)
        # Midpoint guards prevent an attack belonging to an adjacent syllable
        # from being reused simply because that vowel has a stronger attack.
        lower = max(0, expected - .15, (starts[i - 1] + starts[i]) / 2 + offset + .015 if i else 0)
        upper = min(expected + .15, c['dtw_end'] - .065,
                    (starts[i] + starts[i + 1]) / 2 + offset - .015 if i + 1 < len(chars) else music['duration'])
        choices = [a for a in attacks if lower <= a['time'] <= upper and a['id'] not in used]
        def merit(a):
            return min(a['strength'] / strength_ref, 2.0) - 1.6 * abs(a['time'] - expected) / .15
        choices.sort(key=merit, reverse=True)
        selected = None; reason = 'no_clear_attack'
        if choices:
            best_attack = choices[0]
            distinct = len(choices) == 1 or merit(best_attack) - merit(choices[1]) >= .20
            if best_attack['strength'] >= strength_ref * .42 and distinct:
                selected = best_attack; used.add(selected['id']); reason = 'clear_unique_vocal_attack'
            else: reason = 'ambiguous_or_weak_attack'
        onset = selected['time'] if selected else expected
        c['audio_start'] = round(onset, 3)
        c['start'] = round(max(0, onset - .030), 3)
        c['attack_lead_ms'] = 30
        c['anchor_status'] = reason
        c['anchor_id'] = selected['id'] if selected else None
        c['end'] = round(c['dtw_end'] + offset, 3)
        rows.append({'index': i, 'char': c['ch'], 'line': c['line'], 'dtw_start': c['dtw_start'],
                     'inherited_start': inherited[i]['start'], 'audio_start': c['audio_start'],
                     'visual_start': c['start'], 'delta_ms': round((onset - c['dtw_start']) * 1000),
                     'status': reason, 'attack': selected})
    # The boundary is shared, never two overlapping windows. Preserve previous
    # held vowels across adjacent syllables; keep real inter-phrase rests.
    for i, c in enumerate(chars):
        if i + 1 < len(chars):
            nxt = chars[i + 1]
            if nxt['dtw_start'] - c['dtw_end'] <= .08:
                c['end'] = nxt['start']
            else: c['end'] = min(c['end'], nxt['start'])
        assert c['end'] - c['start'] >= .035, (i, c)
        assert c['start'] <= c['audio_start'] < c['end'], (i, c)
        c['audio_end'] = chars[i + 1]['audio_start'] if i + 1 < len(chars) and c['end'] == chars[i + 1]['start'] else c['end']
    assert all(a['end'] <= b['start'] for a, b in zip(chars, chars[1:]))
    lines = copy.deepcopy(music['lyric_lines'])
    for line in lines:
        group = chars[line['char0']:line['char0'] + line['n_chars']]
        line['start'] = group[0]['audio_start']; line['end'] = group[-1]['audio_end']
    overlaps = [{'previous': i, 'next': i + 1, 'overlap_ms': round((a['end'] - b['start']) * 1000)}
                for i, (a, b) in enumerate(zip(inherited, inherited[1:])) if a['end'] > b['start']]
    report = {'vocal_stem_sha256': digest(stem), 'base_master_sha256': digest(base),
        'method': 'Vocal spectral-flux leading edges, gated by vocal energy rise; unique/order-constrained local anchoring',
        'scan_step_ms': 5, 'scan_range_ms': [-600, 600],
        'global': {'candidate_ms': round(candidate * 1000), 'candidate_score_ratio_to_zero': float(fs[best] / fs[np.argmin(abs(offsets))]),
            'competitor_ms': round(offsets[competitor] * 1000), 'peak_margin': margin, 'phrase_votes_ms': [round(v * 1000) for v in votes],
            'agreeing_phrases': agree, 'accepted': bool(accepted), 'applied_ms': round(offset * 1000),
            'energy_rise_candidate_ms': round(offsets[int(np.argmax(rs))] * 1000),
            'reason': 'distinct_peak_and_phrase_consensus' if accepted else 'periodic_alias_or_phrase_disagreement'},
        'inherited_overlaps': overlaps, 'new_overlaps': 0,
        'anchored_characters': sum(c['anchor_id'] is not None for c in chars),
        'retained_dtw_characters': sum(c['anchor_id'] is None for c in chars),
        'anticipation_ms': 30, 'characters': rows, 'attacks': attacks,
        'limits': ['Onset correlation is not phoneme ground truth or perceptual acceptance.',
                  'Do not apply this offset again to an already anchored time table.',
                  'Energy gating alone must not cancel the 30ms visual preparation.']}
    return chars, lines, report


if __name__ == '__main__':
    m = json.loads((ROOT / 'config/music_analysis_v18.json').read_text(encoding='utf-8'))
    chars, lines, report = calibrate(m)
    print(json.dumps({k: v for k, v in report.items() if k not in ('characters', 'attacks', 'inherited_overlaps', 'limits')}, ensure_ascii=False, indent=2))
