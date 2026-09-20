"""E08 OP 音频加台词现场感：漂吧_op.wav + 3 句 E08 TTS 叠入（音乐 -10dB 闪避）。

叠入点（op 时间轴）：
  006_Girl 啊，你的画——            @ 6.0   前奏静景
  007_Boy  别追。让它替我顺流去看看。 @ 41.3  副歌入口叠化（画页起飞）
  011_Boy  这张不会漂走。送你。       @ 64.0  尾奏双人远景
输出 assets/audio/theme/漂吧_op_vo.wav（两遍法 loudnorm -16）。
"""
from pathlib import Path
import json
import subprocess
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
DUCK_DB = -10
VO = [
    ('006_Girl.wav', 46.2),   # 「啊，你的画——」副歌画页飞舞段（画面语义匹配）
    ('007_Boy.wav', 41.3),    # 「别追。让它替我顺流去看看。」副歌入口，画页起飞
    ('011_Boy.wav', 64.0),    # 「这张不会漂走。送你。」尾奏双人远景
]


def loudnorm2(path, i=-16):
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
    y, sr = sf.read(ROOT / 'assets/audio/theme/漂吧_op.wav', always_2d=True)
    assert sr == SR
    duck = np.ones(len(y))
    vo = np.zeros_like(y)   # 台词轨不被闪避：单独一条，最后相加
    for fname, t0 in VO:
        x, xsr = sf.read(ROOT / 'assets/audio' / fname, always_2d=True)
        assert xsr == SR
        x = x.mean(axis=1)
        x *= .6 / max(float(np.abs(x).max()), 1e-9)
        i0 = round(t0 * SR)
        n = len(x)
        # 闪避窗：台词前后各让 0.15s，0.25s 斜坡
        a, b = i0 - round(.15 * SR), i0 + n + round(.15 * SR)
        r = round(.25 * SR)
        duck[a:a + r] *= np.linspace(1, 10 ** (DUCK_DB / 20), r)
        duck[a + r:b - r] *= 10 ** (DUCK_DB / 20)
        duck[b - r:b] *= np.linspace(10 ** (DUCK_DB / 20), 1, r)
        vo[i0:i0 + n, 0] += x
        vo[i0:i0 + n, 1] += x
        print(f'{fname} @ {t0}s 叠入（{n / SR:.2f}s）')
    out = y * duck[:, None] + vo
    tmp = ROOT / 'assets/audio/theme/漂吧_op_vo.wav'
    sf.write(tmp, out, SR, subtype='PCM_16')
    loudnorm2(tmp)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'csv=p=0', str(tmp)], capture_output=True, text=True).stdout.strip()
    print(f'漂吧_op_vo.wav: {probe}s')


if __name__ == '__main__':
    main()
