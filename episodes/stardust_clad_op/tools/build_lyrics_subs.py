#!/usr/bin/env python3
"""《星屑战壳》OP 歌词字幕：whisper 唱段边界 × op_lyrics.txt 真词 → 人声 onset 精修
→ 事件 JSON → subtitle-burn ASS → 烧入成片。

边界精修：whisper 段界有滞后——行起点吸附到 ±150ms 内最强起音沿（人声频段
300-3kHz 谱面流量），相邻行不重叠（终点=下行起点-80ms），44.2s 器乐尾无字幕。

用法（dula-story 根）：
  .venv/Scripts/python.exe episodes/stardust_clad_op/tools/build_lyrics_subs.py
"""
from pathlib import Path
import json
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
SR = 48000

# whisper 13 段 → 真词行映射（whisper 文本是误识别，只用其时间戳粗锚）
LINE_OF = ['L1', 'L2', 'L3', 'L4', 'L5', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']


def load_mono(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32)


def main():
    grid = json.loads((EP / 'config/beatgrid.json').read_text(encoding='utf-8'))
    lyrics = [l.strip() for l in (EP / 'config/op_lyrics.txt').read_text(encoding='utf-8').splitlines() if l.strip()]
    segs = grid['whisper_lines']
    assert len(segs) == len(LINE_OF) == 13
    name_of = dict(zip([f'L{i}' for i in range(1, 9)], lyrics))
    assert len(lyrics) == 8

    # 人声频段谱面流量（起音沿）
    song = load_mono(EP / 'assets/audio/music/suno/op_song_suno.wav')
    voc = sosfilt(butter(2, [300, 3000], fs=SR, btype='bandpass', output='sos'), song)
    hop = SR // 100  # 10ms
    env = np.sqrt(np.mean(voc[:len(voc) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    nov = np.maximum(np.diff(env), 0)

    starts, corrections = [], []
    for i, (w0, w1, _txt) in enumerate(segs):
        lo, hi = max(0, int((w0 - .15) * 100)), int((w0 + .15) * 100)
        if hi > lo and nov[lo:hi].size:
            j = int(np.argmax(nov[lo:hi])) + lo
            onset_t = j / 100
            # 起音沿能量须显著（相对全局 50 分位），找不到就保 whisper 粗锚
            if nov[j] > np.percentile(nov, 50) * 1.1:
                start = onset_t
            else:
                start = w0
        else:
            start = w0
        starts.append(start)
        corrections.append(round(start - w0, 3))

    events = []
    for i, start in enumerate(starts):
        end = (starts[i + 1] - .08) if i + 1 < len(starts) else segs[i][1]
        end = max(end, start + .5)
        events.append({'start': round(start, 2), 'end': round(end, 2),
                       'speaker': '主题歌', 'cn': name_of[LINE_OF[i]]})

    doc = {'group': '', 'project': '', 'events': events}
    ev_path = EP / 'config/lyrics_events.json'
    ev_path.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    print('events:', ev_path)
    for e, corr in zip(events, corrections):
        print(f"  {e['start']:6.2f}-{e['end']:6.2f}  {e['cn']}  (onset 修正 {corr:+.3f}s)")

    # ASS + 烧入（净版母带 craft3d_full.mp4；字幕只烧净版；音轨流拷贝）
    ass = EP / 'config/lyrics.ass'
    out = EP / 'output/craft3d_full_subtitled.mp4'
    subprocess.check_call([
        str(WORKSPACE / 'dula-story/.venv/Scripts/python.exe'),
        str(WORKSPACE / 'dula-skills/subtitle-burn/scripts/make_subs.py'),
        '--events', str(ev_path), '--ass-out', str(ass),
        '--video', str(EP / 'output/craft3d_full.mp4'), '--out-video', str(out)])
    print('burned:', out)


if __name__ == '__main__':
    sys.exit(main())
