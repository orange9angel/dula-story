"""E08 OP 音频（原曲人声版）：从 suno/漂吧.wav 剪片头结构。

监制否决对唱版后的修订：结构沿用对唱版 op（config/theme_duet.json 的
op_structure：前奏+主歌1 → 1s 交叉淡化 → 末轮副歌 79.21s 起 → 尾奏 8s），
但人声全程保留 Suno 原唱，不做任何转换。两遍法 loudnorm 到 -16 LUFS。
"""
from pathlib import Path
import json
import subprocess
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/audio/theme/suno/漂吧.wav'
OUT = ROOT / 'assets/audio/theme/漂吧_op.wav'
SR = 48000


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
    duet = json.loads((ROOT / 'config/theme_duet.json').read_text(encoding='utf-8'))
    ops = duet['op_structure']
    verse1_end = ops['intro_plus_verse1'][1]           # 43.21（歌曲时间）
    chorus_start, chorus_end = ops['duet_chorus']       # 80.21 / 100.07
    tail = ops['outro_tail_s']                          # 8.0
    xf = ops['join_xfade_s']                            # 1.0
    y, sr = sf.read(SRC, always_2d=True)
    assert sr == SR
    part1 = y[:round(verse1_end * sr)]
    part2 = y[round((chorus_start - xf) * sr):round((chorus_end + tail) * sr)]
    k = round(xf * sr)
    blended = part1[-k:] * np.linspace(1, 0, k)[:, None] + part2[:k] * np.linspace(0, 1, k)[:, None]
    out = np.concatenate([part1[:-k], blended, part2[k:]])
    fi = round(1.0 * sr)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = round(2.5 * sr)
    out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    sf.write(OUT, out, SR, subtype='PCM_16')
    loudnorm2(OUT)
    secs = len(out) / SR
    assert abs(secs - ops['op_seconds']) < .05, f'{secs} != {ops["op_seconds"]}'
    print(f'漂吧_op.wav: {secs:.2f}s（原曲人声，结构同对唱版 op）')


if __name__ == '__main__':
    main()
