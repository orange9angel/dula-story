#!/usr/bin/env python3
"""8秒试片混音：v6 歌曲 30–38s 窗 + 剧院底床 + 按试片曝光表画面事件重摆的 Foley（Seed-Audio 素材）。"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

EP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
import mix_dance_r2 as base  # noqa: E402  复用载入/切步/攻击点

SR, T0, T1 = 48000, 30.0, 38.0
N = int((T1 - T0) * SR)
OUT = EP / "assets/audio/mix/pilot8_mix.wav"
# (素材, 画面事件绝对秒, dB, impact)：对应 render_pilot8.py 关键帧
CUES = [
    ("step", 30.70, -25, True),        # 中近景画外：第一步（听得见、看不见，压低）
    ("step", 31.46, -25, True),        # 中近景画外：第二步抬脚前的落脚
    ("step", 31.85, -21, True),        # 切全景：第二步落地（p1 关键帧 5 = 剪辑点）
    ("gown_rustle", 32.40, -25, False),  # 塞蕾娜抬手
    ("cloak_swirl", 34.10, -15, False),  # p2 开始转圈（斗篷甩开）
    ("step", 35.25, -19, True),        # 转完落脚
    ("step", 35.62, -23, True),        # p3 后退一步
    ("cloak_swirl", 35.95, -24, False),  # 双臂张开带起斗篷（轻）
]


def main():
    song = base.load(base.SONG)[int(T0 * SR):int(T1 * SR)]
    bed_full = base.load(EP / "tmp/v6/stems/bed.wav")[int(T0 * SR):int(T1 * SR)]
    steps = base.step_slices(base.load(base.SFX / "board_steps.wav"))
    fol = np.zeros((N, 2))
    placed, k = [], 0
    for name, t, gain, impact in CUES:
        if name == "step":
            x = steps[(k + 2) % len(steps)] * (0.85 + 0.15 * (k % 3) / 2)
            k += 1
        else:
            x = base.load(base.SFX / f"{name}.wav")
        x = x / max(np.abs(x).max(), 1e-9) * base.db(gain)
        off = int((t - T0) * SR) - (base.attack(x) if impact else 0)
        a, b = max(0, off), min(N, off + len(x))
        fol[a:b] += x[a - off:b - off]
        placed.append(dict(sfx=name, event_t=t, gain_db=gain))
    mix = song + bed_full + fol
    fi, fo = int(0.25 * SR), int(0.35 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
    lim = base.db(-2.2)
    pk = np.abs(mix).max()
    if pk > lim:
        mix *= lim / pk
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le",
                    str(OUT)], input=mix.astype(np.float32).tobytes(), check=True)
    Path(str(OUT) + ".source.json").write_text(json.dumps(dict(window=[T0, T1], cues=placed), ensure_ascii=False, indent=1),
                                               encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
