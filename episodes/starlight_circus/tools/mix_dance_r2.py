#!/usr/bin/env python3
"""《借我一小段旋律》R2 混音：v6 歌曲 + 剧院底床 + 画面事件 Foley（全部 Seed-Audio 素材，无算法合成）。

Foley 时刻 = tools/render_dance_r2.py 镜表里的画面事件（换姿势/落脚/敲胸/旋转），改镜表必须同步改这里。
impact 类按素材内攻击点（首达 15% 峰值）回退摆放；布料类以文件头为过程起点不回退。
用法（剧集目录）：python tools/mix_dance_r2.py
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.ndimage import uniform_filter1d

EP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(EP.parents[2] / "dula-skills/build-ambience-foley/scripts"))
from bed_loop import bounded_bed  # noqa: E402

SR, DUR = 48000, 50.0
N = int(SR * DUR)
SFX = EP / "assets/audio/sfx/borrow_a_melody"
SONG = EP / "assets/audio/music/borrow_a_melody/edit/borrow_a_melody_50s_v6.wav"
OUT = EP / "assets/audio/mix/borrow_a_melody_r2_mix.wav"

# (素材, 画面事件秒, 增益 dB, 是否 impact)   —— 注释为对应画面事件
CUES = [
    ("step", 1.33, -20, True),     # 开场诺娅重心换脚 sway_l→sway_r
    ("step", 2.15, -19, True),     # 迈步邀请 noya_invite
    ("step", 10.25, -21, True),    # 上前握手贴心 pair_heart
    ("chest_knock", 15.80, -9, True),   # 匹普近景敲木胸（"咚"）
    ("wood_tap", 19.86, -12, True),     # 匹普脚尖点地（"嗒"）
    ("gown_rustle", 21.30, -24, False), # 塞蕾娜第一次随乐摇摆
    ("brass_joints", 23.10, -16, False),  # 走错拍踉跄，关节咔哒
    ("brass_joints", 26.85, -20, False),  # 数"一"抬臂
    ("wood_tap", 28.30, -11, True),     # 数"三"跳起落地
    ("step", 31.50, -20, True),    # 副歌张臂上前
    ("cloak_swirl", 33.38, -17, False),  # 托手转圈
    ("cloak_swirl", 35.02, -15, False),  # 独转 pirouette
    ("step", 35.84, -18, True),    # 转完落定
    ("gown_rustle", 39.45, -23, False),  # 塞蕾娜抬头准备哼唱
    ("gown_rustle", 47.85, -22, False),  # 三人牵手谢幕
    ("step", 47.85, -22, True),
]


def load(path, ch=2):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path), "-ar", str(SR), "-ac", str(ch),
                                   "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch)


def attack(x):
    env = np.abs(x).max(axis=1)
    return int(np.argmax(env >= env.max() * 0.15))


def step_slices(x):
    """把连续脚步素材按 onset 切单步（<0.35s 归为同一步）。"""
    env = uniform_filter1d(np.abs(x).max(axis=1), int(0.01 * SR))
    thr = env.max() * 0.2
    on = np.where((env[1:] > thr) & (env[:-1] <= thr))[0]
    groups = []
    for o in on:
        if not groups or o - groups[-1] > 0.35 * SR:
            groups.append(o)
    out = []
    for o in groups:
        a = max(0, o - int(0.03 * SR))
        seg = x[a:a + int(0.5 * SR)].copy()
        seg[-int(0.08 * SR):] *= np.linspace(1, 0, int(0.08 * SR))[:, None]
        out.append(seg)
    return out


def db(v):
    return 10 ** (v / 20)


def main():
    song = load(SONG)[:N]
    song = np.pad(song, ((0, N - len(song)), (0, 0)))
    # 底床：0.4s 滑动包络归一化（三道验收周期性 0.275 超线的兜底），再折尾铺成精确长度
    room = load(SFX / "theatre_roomtone.wav")
    for _ in range(2):  # 一遍后周期性 0.155 仍略超 0.15，第二遍收敛
        env = uniform_filter1d(np.sqrt(uniform_filter1d((room ** 2).mean(axis=1), int(0.05 * SR))), int(0.4 * SR))
        room = room / np.maximum(env, env.mean() * 0.3)[:, None] * env.mean()
    bed = bounded_bed(room, N, SR)
    bed *= db(-41) / max(np.sqrt((bed ** 2).mean()), 1e-9)

    steps = step_slices(load(SFX / "board_steps.wav"))
    fol = np.zeros((N, 2))
    placed, k = [], 0
    for name, t, gain, impact in CUES:
        if name == "step":
            x = steps[k % len(steps)] * (0.8 + 0.2 * ((k * 7919) % 5) / 4)  # 轮换切片 + 增益抖动防机枪感
            k += 1
        else:
            x = load(SFX / f"{name}.wav")
        x = x / max(np.abs(x).max(), 1e-9) * db(gain)
        off = int(t * SR) - (attack(x) if impact else 0)
        a, b = max(0, off), min(N, off + len(x))
        fol[a:b] += x[a - off:b - off]
        placed.append(dict(sfx=name, event_t=t, file_head_t=round(off / SR, 3), gain_db=gain, impact=impact))

    mix = song + bed + fol
    peak = np.abs(mix).max()
    lim = db(-2.2)
    if peak > lim:
        mix *= lim / peak
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", str(OUT)], input=mix.astype(np.float32).tobytes(), check=True)
    for nm, buf in dict(bed=bed, foley=fol).items():
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-c:a", "pcm_s24le", str(EP / f"tmp/v6/stems/{nm}.wav")],
                       input=buf.astype(np.float32).tobytes(), check=True)
    rec = dict(artifact=str(OUT.relative_to(EP)).replace("\\", "/"),
               sha256=hashlib.sha256(OUT.read_bytes()).hexdigest(),
               song=str(SONG.relative_to(EP)).replace("\\", "/"), bed_rms_dbfs=-41,
               bed_fix="0.4s sliding-envelope normalisation (periodicity 0.275 > 0.15 gate)",
               step_slices=len(steps), cues=placed, peak_before_limit=round(float(peak), 4),
               limit_dbfs=-2.2)
    Path(str(OUT) + ".source.json").write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False, indent=1)[:1500])


if __name__ == "__main__":
    main()
