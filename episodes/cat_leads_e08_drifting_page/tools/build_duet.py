"""E08 theme: assemble the duet version and the opening-title cut.

漂吧_对唱版.wav     — accompaniment everywhere + the four VC'd duet lines
                      dropped on their aligned slots (50ms edge crossfades,
                      per-line gain match to the original vocal clip, lag=0
                      asserted by 10ms-envelope xcorr).
漂吧_对唱版_op.wav  — 60-90s opening cut: intro + verse 1 + duet chorus +
                      outro tail, 1s musical crossfade into the chorus,
                      fade in/out, loudnorm -16 applied to both files.
"""
from pathlib import Path
import json
import subprocess
import numpy as np
import soundfile as sf
from scipy.signal import correlate

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
XFADE = .05  # 50ms line-edge crossfade
VC_DIR = ROOT / 'assets/audio/theme/duet'


def env_lag(ref, x, sr=SR):
    """Lag of x vs ref in 10ms hops (RMS-envelope xcorr, timbre-insensitive)."""
    hop = round(.01 * sr)
    def env_of(v):
        m = len(v) // hop
        return np.sqrt(np.mean(v[:m*hop].reshape(m, hop) ** 2, axis=1))
    er, ed = env_of(ref), env_of(x)
    m = min(len(er), len(ed))
    win = 10
    corr = correlate(er[:m], ed[:m], mode='full', method='fft')
    return int(np.argmax(corr[len(corr)//2 - win: len(corr)//2 + win + 1])) - win


def loudnorm(path, i=-16):
    """Two-pass loudnorm (single-pass lands ~1 LU off)."""
    probe = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(path),
                            '-af', f'loudnorm=I={i}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    tmp = path.with_suffix('.norm.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(path),
                    '-af', (f'loudnorm=I={i}:TP=-1.5:LRA=11:linear=true:'
                            f'measured_I={m["input_i"]}:measured_TP={m["input_tp"]}:'
                            f'measured_LRA={m["input_lra"]}:measured_thresh={m["input_thresh"]}:'
                            f'offset={m["target_offset"]}'),
                    '-ar', str(SR), str(tmp)], check=True)
    tmp.replace(path)


def main():
    al = json.loads((ROOT / 'config/theme_alignment.json').read_text(encoding='utf-8'))
    cuts = json.loads((VC_DIR / 'cuts.json').read_text(encoding='utf-8'))
    from scipy.signal import resample_poly
    def load48(p):
        x, sr = sf.read(p, always_2d=True)
        return resample_poly(x, SR, sr, axis=0) if sr != SR else x
    acc = load48(ROOT / 'assets/audio/theme/stems/accompaniment.wav')
    vocals = load48(ROOT / 'assets/audio/theme/stems/vocals.wav')
    n = len(acc)
    out = acc.copy()

    per_line = []
    for li_s, cut in cuts.items():
        li = int(li_s)
        vc_path = next(VC_DIR.glob(f"vc_line{li:02d}_{cut['voice']}_{cut['ref']}_reference_1.0_30_0.65.wav"))
        x, vcr = sf.read(vc_path, always_2d=True)
        x = x.mean(axis=1)
        if vcr != SR:
            x = resample_poly(x, SR, vcr)
        i0 = round(cut['clip_start'] * SR)
        orig = vocals[i0:i0 + len(x)].mean(axis=1)
        lag = env_lag(orig, x)
        drift_ms = (len(x) - len(orig)) / SR * 1000
        assert abs(drift_ms) < 30, f'line {li} 时长漂移 {drift_ms:.1f}ms'
        # Correct small VC offsets (resampling edge): shift by the measured
        # envelope lag, then the re-measured lag must be exactly 0.
        if lag != 0:
            shift = lag * round(.01 * SR)  # lag<0: x 内容滞后, 往前滚回零延迟
            x = np.roll(x, shift)
            if shift > 0:
                x[:shift] = 0
            else:
                x[shift:] = 0
            assert env_lag(orig, x) == 0, f'line {li} 校正后仍有偏移'
        per_line_lag0 = env_lag(orig, x)
        if len(x) > len(orig):
            x = x[:len(orig)]
        else:
            x = np.pad(x, (0, len(orig) - len(x)))
        gain = float(np.sqrt(np.mean(orig ** 2)) / max(np.sqrt(np.mean(x ** 2)), 1e-8))
        g = np.full(len(x), gain)
        k = round(XFADE * SR)
        g[:k] *= np.linspace(0, 1, k)
        g[-k:] *= np.linspace(1, 0, k)
        out[i0:i0 + len(x)] += x[:, None] * g[:, None]
        per_line.append({'line': li, 'text': al['lines'][li]['text'],
                         'voice': cut['voice'], 'ref': cut['ref'],
                         'start': cut['line_start'], 'end': cut['line_end'],
                         'gain': round(gain, 3), 'lag_ms_raw': lag * 10, 'lag_ms_corrected': per_line_lag0 * 10,
                         'drift_ms': round(drift_ms, 2)})
        print(f"line {li} [{cut['line_start']:.2f}-{cut['line_end']:.2f}] "
              f"{cut['voice']}({cut['ref']}) gain={gain:.2f} lag={lag * 10}ms->0ms")

    peak = float(np.abs(out).max())
    if peak > .92:
        out *= .92 / peak
    duet = ROOT / 'assets/audio/theme/漂吧_对唱版.wav'
    sf.write(duet, out, SR, subtype='PCM_16')

    # ---- opening-title cut: intro + verse 1 + duet chorus + outro tail ----
    L = al['lines']
    verse1_end = L[3]['end']
    chorus_start = L[12]['start']
    chorus_end = L[15]['end']
    tail = min(8.0, n / SR - chorus_end)
    xfade_op = 1.0
    part1 = out[:round(verse1_end * SR)]                       # intro + verse 1
    part2 = out[round((chorus_start - xfade_op) * SR):round((chorus_end + tail) * SR)]
    k = round(xfade_op * SR)
    ramp_out = np.linspace(1, 0, k)[:, None]
    ramp_in = np.linspace(0, 1, k)[:, None]
    blended = part1[-k:] * ramp_out + part2[:k] * ramp_in
    op = np.concatenate([part1[:-k], blended, part2[k:]])
    fi = round(1.0 * SR)
    op[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = round(2.5 * SR)
    op[-fo:] *= np.linspace(1, 0, fo)[:, None]
    op_path = ROOT / 'assets/audio/theme/漂吧_对唱版_op.wav'
    sf.write(op_path, op, SR, subtype='PCM_16')
    print(f'op cut: {len(op)/SR:.1f}s (verse1 ends {verse1_end:.2f}, chorus {chorus_start:.2f}-{chorus_end:.2f}, tail {tail:.1f}s)')

    loudnorm(duet)
    loudnorm(op_path)

    report = {
        'duet_section': al['duet_section'],
        'per_line': per_line,
        'outputs': {'duet': str(duet.relative_to(ROOT)), 'op_cut': str(op_path.relative_to(ROOT))},
        'op_structure': {'intro_plus_verse1': [0, verse1_end], 'duet_chorus': [chorus_start, chorus_end],
                         'outro_tail_s': tail, 'join_xfade_s': xfade_op,
                         'op_seconds': round(len(op) / SR, 2)},
        'loudnorm': 'I=-16 TP=-1.5 LRA=11 (both outputs)',
        'final_peak_pre_norm': round(peak, 3),
    }
    (ROOT / 'config/theme_duet.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('written:', duet.name, op_path.name)


if __name__ == '__main__':
    main()
