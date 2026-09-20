"""E08 OP 环境音氛围层：河流声 + 夏夜虫鸣铺底，叠进台词版混音。

曲线（op 时间轴）：全片 -22dB 铺底；前奏(0-15.5)与尾奏(63.07-71.07)浮现到
-16dB，1s 斜坡过渡。河流声 e07 river_water.wav（同一条河），虫鸣
freesound 预览（244177）。循环平铺到全片长度。输出 漂吧_op_final.wav
（两遍法 loudnorm -16）。
"""
from pathlib import Path
import json
import subprocess
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
RIVER = ROOT.parents[0] / 'cat_leads_e07_river_willow/assets/audio/sfx/river_water.wav'
CRICKETS = ROOT / 'assets/audio/ambience/crickets_244177.mp3'
BASE = ROOT / 'assets/audio/theme/漂吧_op_vo.wav'
OUT = ROOT / 'assets/audio/theme/漂吧_op_final.wav'


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                          '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def loop_to(x, n):
    reps = int(np.ceil(n / len(x)))
    return np.tile(x, (reps, 1))[:n]


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
    base = load(BASE)
    n = len(base)
    dur = n / SR
    river = loop_to(load(RIVER), n)
    crickets = loop_to(load(CRICKETS), n)
    # 归一两条环境轨到同一 RMS 再配比
    def norm(x, level):
        return x * (level / max(np.sqrt(np.mean(x ** 2)), 1e-9))
    river = norm(river, 0.05)
    crickets = norm(crickets, 0.03)
    amb = river + crickets

    # 电平曲线：-22dB 铺底，前奏(0-15.5)/尾奏(63.07-尾) 浮现到 -16dB，1s 斜坡
    lo, hi = 10 ** (-22 / 20), 10 ** (-16 / 20)
    env = np.full(n, lo)
    i_intro_end = round(15.5 * SR)
    env[:i_intro_end] = hi                       # 前奏浮现
    env[:SR] = np.linspace(lo, hi, SR)           # 片头 1s 渐入
    env[i_intro_end - SR:i_intro_end] = np.linspace(hi, lo, SR)  # 前奏收尾降回铺底
    i_outro = round(63.07 * SR)
    env[i_outro:i_outro + SR] = np.linspace(lo, hi, SR)
    env[i_outro + SR:] = hi                      # 尾奏浮现到尾
    env[-SR:] *= np.linspace(1, .25, SR)         # 最末 1s 随片尾淡出
    out = base + amb * env[:, None]
    peak = float(np.abs(out).max())
    if peak > .92:
        out *= .92 / peak
    sf.write(OUT, out, SR, subtype='PCM_16')
    loudnorm2(OUT)
    print(f'漂吧_op_final.wav {dur:.2f}s（河流+虫鸣，铺底 -22dB / 首尾 -16dB）')
    (ROOT / 'config/op_ambience.json').write_text(json.dumps({
        'river': str(RIVER.relative_to(ROOT.parents[0])), 'crickets': 'assets/audio/ambience/crickets_244177.mp3',
        'curve': {'bed_db': -22, 'intro_outro_db': -16, 'ramp_s': 1.0,
                  'intro': [0, 15.5], 'outro': [63.07, round(dur, 2)]},
        'peak_pre_norm': round(peak, 3),
    }, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
