#!/usr/bin/env python3
"""水晶咏叹 全曲混音：v1b 歌曲（不改）+ 剧院底床 + 画面事件音效。
CUES 的时间是画面事件点（歌曲秒）；at = 事件点 − 素材起音偏移，使起音落在事件帧上。
输出 assets/audio/mix/aria_mix.wav（48k 立体声）与 config/sfx_cues.json（供对位验证）。
用法（剧集目录）：python tools/mix_song.py
"""
import json
from pathlib import Path
import numpy as np, soundfile as sf, librosa

EP = Path(__file__).resolve().parents[1]
SR = 48000
SONG = EP / "assets/audio/music/starlight_melody_v1b.wav"
SFX = EP / "assets/audio/sfx"
REUSE = EP.parent / "starlight_circus/assets/audio/sfx/borrow_a_melody"  # 已验收素材（底床三门、木心）
# name, file, 画面事件点, 素材起音偏移, 增益 dB, 尾部淡出到（歌曲秒，可选）
CUES = [
    ("dust_gather",   SFX / "dust_gather.wav",   3.0,   .07, -10, None),
    ("gather_intro",  SFX / "magic_gather.wav",  8.26,  2.72, -14, None),
    ("wood_dong",     REUSE / "chest_knock.wav", 27.68, None, -12, None),
    ("wood_da",       REUSE / "wood_tap.wav",    31.05, None, -14, None),
    ("three_burst",   SFX / "reveal_bloom.wav",  39.75, .45, -6,  None),
    ("glass_crack",   SFX / "glass_crack.wav",   49.5,  .12,  -12, 52.66),
    ("glass_shatter", SFX / "glass_shatter.wav", 52.69, .07,  -4,  None),
    ("glass_rain",    SFX / "glass_rain.wav",    53.0,  .12,  +8,  55.8),
    ("gather_reveal", SFX / "magic_gather.wav",  56.52, 2.72, -9,  None),
    ("reveal_bloom",  SFX / "reveal_bloom.wav",  56.52, .45, -4,  None),
]
BED = REUSE / "theatre_roomtone.wav"
PRE, END = 3.0, 71.0  # 混音时间轴 = 歌曲秒 + PRE；序幕从歌曲 −3s，尾声到 71s
VOICE = [("narr_prologue", EP / "assets/audio/voice/narr_prologue.mp3", -2.2, 0),
         ("maiden_epilogue", EP / "assets/audio/voice/maiden_epilogue.mp3", 65.4, 0)]
DUCK = [(-2.4, 9.5, -6)]  # 画外音期间音乐压低


def load(p):
    y, _ = librosa.load(str(p), sr=SR, mono=False)
    y = np.atleast_2d(y)
    return np.vstack([y, y]) if y.shape[0] == 1 else y[:2]


def onset_of(y):
    on = librosa.onset.onset_detect(y=librosa.to_mono(y), sr=SR, units="time")
    return float(on[0]) if len(on) else 0.0


def main():
    raw = load(SONG); n = int(round((END + PRE) * SR)); song = np.zeros((2, n)); song[:, int(PRE * SR):int(PRE * SR) + raw.shape[1]] = raw[:, :n - int(PRE * SR)]
    tl = np.arange(n) / SR - PRE; g = np.ones(n)
    for a, b, db in DUCK:
        k = 10 ** (db / 20); w = np.clip(np.minimum((tl - a) / .4, (b - tl) / .4), 0, 1); g *= 1 - (1 - k) * w
    song *= g; sfx_bus = np.zeros_like(song); voice_bus = np.zeros_like(song); log = []
    # 底床：折叠交叉淡入铺满全曲，−30 dB，首尾 2s 淡入淡出
    bed = load(BED); L = bed.shape[1]; xf = SR * 2; bus = np.zeros_like(song); pos = 0
    while pos < n:
        seg = bed[:, :min(L, n - pos)].copy()
        if pos > 0:
            r = np.linspace(0, 1, min(xf, seg.shape[1])); seg[:, :len(r)] *= r; bus[:, pos:pos + len(r)] *= 1 - r
        bus[:, pos:pos + seg.shape[1]] += seg; pos += L - xf
    env = np.ones(n); env[:SR * 2] = np.linspace(0, 1, SR * 2); env[-SR * 2:] = np.linspace(1, 0, SR * 2)
    bed_gain = 10 ** (-30 / 20) / (np.abs(bus).max() + 1e-9)
    sfx_bus += bus * env * bed_gain
    for name, path, event, off, db, fade_to in CUES:
        y = load(path); y = y / (np.abs(y).max() + 1e-9) * 10 ** (db / 20) * .5
        off = onset_of(y) if off is None else off
        at = event - off; i0 = int(round((at + PRE) * SR)); seg = y
        if fade_to:
            keep = int((fade_to - at) * SR); seg = seg[:, :keep].copy(); fl = min(int(.25 * SR), keep)
            seg[:, -fl:] *= np.linspace(1, 0, fl)
        if i0 < 0: seg = seg[:, -i0:]; i0 = 0
        m = min(seg.shape[1], n - i0); sfx_bus[:, i0:i0 + m] += seg[:, :m]
        log.append({"name": name, "file": str(Path(path).relative_to(EP.parent)), "event": event, "onsetOffset": round(off, 3), "placedAt": round(at, 3), "gainDb": db})
    for name, path, at, _ in VOICE:
        y = load(path); y = y / (np.abs(y).max() + 1e-9) * .5; i0 = int(round((at + PRE) * SR)); m = min(y.shape[1], n - i0)
        voice_bus[:, i0:i0 + m] += y[:, :m]; log.append({"name": name, "file": str(Path(path).relative_to(EP.parent)), "event": at, "placedAt": at, "voice": True})
    mix = song + sfx_bus + voice_bus
    peak = np.abs(mix).max()
    if peak > .89: mix *= .89 / peak
    out = EP / "assets/audio/mix/aria_mix_full.wav"  # 时间零点 = 歌曲 −3s; out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix.T, SR, subtype="PCM_24"); sf.write(EP / "assets/audio/mix/aria_sfx_bus.wav", sfx_bus.T, SR, subtype="PCM_24")
    (EP / "config/sfx_cues.json").write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
    print("peak dBFS", round(20 * np.log10(np.abs(mix).max()), 2), "cues", len(log))
    # 对位验证：SFX 总线上每个事件点 ±0.15s 内须有 onset
    on = librosa.onset.onset_detect(y=librosa.to_mono(sfx_bus), sr=SR, units="time", backtrack=False)
    for c in [c for c in log if not c.get('voice')]:
        near = [o - PRE for o in on if abs(o - PRE - c["event"]) <= .15]
        print(f'{c["name"]:14s} event {c["event"]:6.2f}  onset within ±0.15s: {"OK " + str(round(min(near, key=lambda o: abs(o - c["event"])) - c["event"], 3)) if near else "MISSING"}')


if __name__ == "__main__":
    main()
