"""R2 脚步返修：踩雪脚步从"连续 excerpt 摆进走拍窗"改为逐 stance 对位。

接触时刻来自 hybrid/config/motion_full.json 的 planted false→true 转换（bake=画面真值，
cel 走拍相位由 bake 距离驱动，A3 probe plants↔wraps 已验证）。
步片从 footsteps_snow.wav（Seed-Audio 素材不动）切出：onset 按 <0.35s 分组为单个踩雪事件，
逐事件切片、峰一化，按 LCG 种子轮换+增益抖动（0.8-1.0）摆到每个 stance 时刻。
产物：assets3d/sfx/footsteps_walk_m04.wav / footsteps_walk_m11.wav + source.json。
"""
from pathlib import Path
import hashlib, json
import librosa
import numpy as np
import soundfile as sf

EP = Path(__file__).resolve().parents[1]
SR = 48000
SEED = 20261105

# bake 实测 stance（planted false→true，秒）——若 bake 重建需重新提取
CONTACTS = {
    'm04': [27.633, 28.100, 28.467, 28.767, 29.033, 29.267, 29.500, 29.700, 29.933,
            30.133, 30.333, 30.533, 30.767, 30.967, 31.167, 31.367, 31.567, 31.800,
            32.033, 32.267, 32.533, 32.833, 33.167, 33.633, 34.133],
    'm11': [78.533, 78.967, 79.267, 79.533, 79.767, 79.967, 80.200, 80.367, 80.567,
            80.767, 80.967, 81.133, 81.333, 81.533, 81.733, 81.933, 82.133, 82.367,
            82.633, 82.933, 83.333, 83.767],
}


def cut_steps(y):
    on = librosa.onset.onset_detect(y=y, sr=SR, units='time', backtrack=True)
    # 分组：<0.35s 内的 onset 视为同一次踩雪（挤压+碎裂双瞬态）
    groups, cur = [], [on[0]]
    for t in on[1:]:
        if t - cur[-1] < .35:
            cur.append(t)
        else:
            groups.append(cur)
            cur = [t]
    groups.append(cur)
    steps = []
    for i, g in enumerate(groups):
        a = max(0.0, g[0] - .03)
        b = groups[i + 1][0] - .02 if i + 1 < len(groups) else min(len(y) / SR, g[0] + .6)
        b = min(b, g[0] + .6)
        s = y[round(a * SR):round(b * SR)].copy()
        if len(s) > SR // 20 and np.abs(s).max() > 1e-4:
            steps.append(s / np.abs(s).max())
    return steps


def build(beat, contacts, steps, rng):
    t0, t1 = contacts[0] - .05, contacts[-1] + .7
    n = round((t1 - t0) * SR)
    out = np.zeros(n)
    order = rng.permutation(len(steps))
    for i, t in enumerate(contacts):
        s = steps[order[i % len(steps)]] * rng.uniform(.8, 1.0)
        at = round((t - t0) * SR)
        m = min(len(s), n - at)
        out[at:at + m] += s[:m]
    return out, t0


def main():
    src = EP / 'assets3d/sfx/footsteps_snow.wav'
    y, _ = librosa.load(src, sr=SR, mono=True)
    steps = cut_steps(y)
    print(f'{len(steps)} step slices from {src.name}')
    rng = np.random.default_rng(SEED)
    for beat, contacts in CONTACTS.items():
        out, t0 = build(beat, contacts, steps, rng)
        path = EP / f'assets3d/sfx/footsteps_walk_{beat}.wav'
        sf.write(path, out, SR, subtype='PCM_24')
        (EP / f'assets3d/sfx/footsteps_walk_{beat}.source.json').write_text(json.dumps({
            'id': f'footsteps_walk_{beat}', 'provider': 'derived',
            'derived_from': f'footsteps_snow.wav sha256={hashlib.sha256(src.read_bytes()).hexdigest()[:16]}',
            'method': 'per-stance placement: onset-grouped step slices at bake planted transitions '
                      f'(motion_full.json), LCG seed {SEED} rotation + gain jitter 0.8-1.0',
            'place_at': round(t0, 3), 'contacts': contacts,
        }, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'{beat}: {len(contacts)} steps, place_at={t0:.3f}, dur={len(out)/SR:.2f}s -> {path.name}')


if __name__ == '__main__':
    main()
