"""V19 step 3: rebuild the master with the converted Yuki voice.

mixed_v19 = base_master - original_vocals + converted_vocals * gain
(finish_morning_voice pattern). Seed-VC runs with length_adjust=1.0, so the
converted vocal must align sample-exactly with the original stem: we assert
the length delta is tiny, verify zero lag by cross-correlation, then pad/trim
to the exact sample count before mixing.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import wave
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, correlate

ROOT = Path(__file__).resolve().parents[1]
SR = 48000


def load(path, sr=SR):
    x, rate = sf.read(path, always_2d=True)
    return resample_poly(x, sr, rate, axis=0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--converted', required=True, help='Seed-VC 输出 wav（相对 episode 根目录）')
    ap.add_argument('--steps', type=int, default=30)
    ap.add_argument('--cfg', type=float, default=.65)
    args = ap.parse_args()

    base = load(ROOT / 'assets/audio/mixed_v19_base.wav')
    vocals = load(ROOT / 'assets/audio/stems_v19/vocals.wav')
    dry = load(ROOT / args.converted).mean(axis=1)
    n = len(base)
    assert len(vocals) == n, f'vocals stem {len(vocals)} != base {n}'

    # Timeline assertion: VC keeps duration; verify with a cross-correlation
    # lag estimate, then pad/trim to exact. Waveform xcorr between different
    # timbres locks onto pitch-period ambiguities (~5ms), so the lag is
    # measured on 10ms-hop RMS envelopes, which are timbre-insensitive.
    ref = vocals.mean(axis=1)
    hop = round(.01 * SR)
    def env_of(x):
        m = len(x) // hop
        return np.sqrt(np.mean(x[:m*hop].reshape(m, hop) ** 2, axis=1))
    er, ed = env_of(ref), env_of(dry)
    m = min(len(er), len(ed))
    lag_win = round(.05 * 100)  # +/-50ms in 10ms hops
    corr = correlate(er[:m], ed[:m], mode='full', method='fft')
    lag_hops = int(np.argmax(corr[len(corr)//2 - lag_win: len(corr)//2 + lag_win + 1])) - lag_win
    lag = lag_hops * hop  # samples at SR
    drift_ms = (len(dry) - n) / SR * 1000
    assert abs(drift_ms) < 20, f'VC 时长漂移 {drift_ms:.1f}ms，超过 20ms 容差'
    assert abs(lag_hops) <= 1, f'转换人声存在 {lag_hops * 10}ms 包络偏移'
    if len(dry) < n:
        dry = np.pad(dry, (0, n - len(dry)))
    else:
        dry = dry[:n]

    gain = float(np.sqrt(np.mean(ref ** 2)) / max(np.sqrt(np.mean(dry ** 2)), 1e-8))
    dry_g = dry * gain
    mix = base - vocals + dry_g[:, None]
    peak = float(np.max(np.abs(mix)))
    common = min(1.0, .92 / max(peak, 1e-9))
    out = mix * common

    target = ROOT / 'assets/audio/mixed_v19.wav'
    with wave.open(str(target), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype('<i2').tobytes())
    shutil.copyfile(target, ROOT / 'assets/audio/music/mixed_v19.wav')
    sf.write(ROOT / 'assets/audio/voice_v19/vocals_vc_dry.wav', dry_g * common, SR, subtype='PCM_16')

    report = {
        'song': 'assets/audio/music/v19/candidate_d.wav',
        'base_master': 'assets/audio/mixed_v19_base.wav',
        'vocals_stem': 'assets/audio/stems_v19/vocals.wav',
        'reference': 'assets/audio/voice_morning/morning_reference.wav',
        'converted_input': args.converted,
        'seed_vc': {'steps': args.steps, 'cfg': args.cfg, 'length_adjust': 1.0,
                    'f0_condition': True, 'semi_tone_shift': 0},
        'samples': n, 'seconds': round(n / SR, 3),
        'vc_length_drift_ms': round(drift_ms, 3), 'vc_lag_samples': lag, 'vc_lag_method': '10ms RMS envelope xcorr',
        'gain': gain, 'pre_limit_peak': peak, 'common_gain': common,
        'final_peak': float(np.max(np.abs(out))),
        'mixed_v19_sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'method': 'base - original vocals + gain-matched converted vocals (finish_morning_voice pattern); alimiter-equivalent 0.92 ceiling',
    }
    (ROOT / 'config/voice_convert_v19.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('seconds', 'vc_length_drift_ms', 'vc_lag_samples',
          'gain', 'pre_limit_peak', 'common_gain', 'final_peak')}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
