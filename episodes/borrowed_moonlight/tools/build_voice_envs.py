"""P6 口型轨：最终对白 PCM（混音同一摆点零点）→ config/voice_envs.json 能量包络。

s1e2 同格式：lines[{id,speaker,t0,dur,dt,jaw[]}]；viewer 按 (t-t0)/dt 索引。
工艺口径（build-character-voice 2026-10-14）：从最终放置的 PCM 分轨做 20ms 能量口型，
静默阈值以下归零，非说话窗外为零——这是能量开合，不是音素视素，也不是戏感验收。
"""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np

EP = Path(__file__).resolve().parents[1]
SR = 48000
DT = .02


def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                                   '-ac', '1', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).astype(np.float64)


def jaw_track(x):
    hop = round(DT * SR)
    m = len(x) // hop
    env = np.sqrt(np.mean(x[:m * hop].reshape(m, hop) ** 2, axis=1))
    # 30ms 平滑，去掉电报式抖动
    k = np.hanning(5); k /= k.sum()
    env = np.convolve(env, k, mode='same')
    peak = max(float(env.max()), 1e-9)
    jaw = np.clip(env / peak * .85, 0, .85)
    jaw[env < peak * .08] = 0.0          # 静默门控：停顿与气口闭嘴
    return [round(float(v), 4) for v in jaw]


def main():
    dlg = json.loads((EP / 'config/dialogue.json').read_text(encoding='utf-8'))
    lines = []
    for line in dlg['lines']:
        x = load(EP / f"assets3d/dialogue/{line['id']}.wav")
        jaw = jaw_track(x)
        lines.append({'id': line['id'], 'speaker': line['speaker'], 'character': line['character'],
                      't0': line['t'], 'dur': round(len(x) / SR, 3), 'dt': DT, 'jaw': jaw})
        print(f"{line['id']:>4} t0={line['t']:7.2f} dur={len(x)/SR:5.2f}s jaw={len(jaw)} frames "
              f"(window {line['window']:.2f})", flush=True)
    out = {'source': 'assets3d/dialogue/*.wav placed at dialogue.json t (与 remix_audio.py 同一零点)',
           'method': '20ms RMS energy envelope, 30ms hanning smooth, silence gate 8% of line peak',
           'dt': DT,
           'source_files': {l['id']: hashlib.sha256((EP / f"assets3d/dialogue/{l['id']}.wav").read_bytes()).hexdigest()
                            for l in lines}}
    out['lines'] = lines
    (EP / 'config/voice_envs.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    over = [l['id'] for l, d in zip(lines, dlg['lines']) if l['dur'] > d['window'] + .2]
    print(f"voice_envs: {len(lines)} lines; 超窗: {over or '无'}")


if __name__ == '__main__':
    main()
