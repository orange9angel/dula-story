#!/usr/bin/env python3
"""E08 主题曲混合版 v2：箫+竖琴开场 / 真笛主奏 / 古筝间奏 / 箫收尾，AI 垫底。

乐器与调性（全部对齐到 D 大调框架）：
  箫   samples2/162028.mp3  F#m（D 的 vi）
  竖琴 samples2/560528.mp3  F#m（同调，与箫零冲突叠加）
  笛   samples2/678907.mp3  D（主奏）
  古筝 samples2/396903.mp3  Dm → rubberband +2 半音到 Em（D 的 ii）
  AI底 candidate_e_bgm.wav  D# → -1 半音到 D，低通+压低压后

注意：原始采样为 Freesound 预览音质（128k mp3），定稿需按许可下 HQ 版替换。
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / 'assets/audio/theme'
OUT = T / 'theme_hybrid_v2.wav'

XUN = T / 'samples2/162028.mp3'      # 382s, F#m
HARP = T / 'samples2/560528.mp3'     # 21.7s, F#m
BED = T / 'candidate_e_bgm.wav'      # 60s, D# → D
DIZI = T / 'samples2/678907.mp3'     # 61s, D
GUZHENG = T / 'samples2/396903.mp3'  # 656s, Dm → Em

BED_PITCH = 2 ** (-1 / 12)   # D# → D
GZ_PITCH = 2 ** (2 / 12)     # Dm → Em

fc = (
    # 开场：箫 + 竖琴（同调 F#m，0-12s）
    f"[0:a]atrim=187:199,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=10:d=2,volume=1.6[xun];"
    f"[1:a]atrim=7:19,asetpts=PTS-STARTPTS,afade=t=in:d=2,afade=t=out:st=10:d=2,volume=0.85[harp];"
    # AI 底：移调 D + 低通软化 + 压后，12s 淡入
    f"[2:a]rubberband=pitch={BED_PITCH:.6f},lowpass=f=3200,volume=0.5,atrim=0:60,asetpts=PTS-STARTPTS,"
    f"afade=t=in:st=0:d=4,adelay=12000|12000[bed];"
    # 笛主奏一：16s 进，18-42s
    f"[3:a]atrim=18:42,asetpts=PTS-STARTPTS,afade=t=in:d=1.2,afade=t=out:st=22:d=2,volume=1.5,"
    f"adelay=16000|16000[d1];"
    # 古筝间奏：44s，Em 移调，点缀
    f"[4:a]atrim=328:336,asetpts=PTS-STARTPTS,rubberband=pitch={GZ_PITCH:.6f},afade=t=in:d=1.2,"
    f"afade=t=out:st=6:d=2,volume=1.15,adelay=44000|44000[gz];"
    # 笛主奏二：52s 进，44-61s
    f"[3:a]atrim=44:61,asetpts=PTS-STARTPTS,afade=t=in:d=1.2,afade=t=out:st=15:d=2,volume=1.5,"
    f"adelay=52000|52000[d2];"
    # 尾奏：箫回归 + 竖琴余韵（70s 起）
    f"[0:a]atrim=200:212,asetpts=PTS-STARTPTS,afade=t=in:d=2,afade=t=out:st=8:d=4,volume=1.5,"
    f"adelay=70000|70000[xun2];"
    f"[1:a]atrim=15:21.7,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=4:d=2.7,volume=0.7,"
    f"adelay=72000|72000[harp2];"
    f"[xun][harp][bed][d1][gz][d2][xun2][harp2]amix=inputs=8:normalize=0,"
    f"loudnorm=I=-16:TP=-1.5:LRA=11[out]"
)

cmd = ['ffmpeg', '-v', 'error', '-y',
       '-i', str(XUN), '-i', str(HARP), '-i', str(BED), '-i', str(DIZI), '-i', str(GUZHENG),
       '-filter_complex', fc, '-map', '[out]', str(OUT)]
subprocess.run(cmd, check=True)
print('written', OUT)
subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'csv=p=0', str(OUT)], check=True)
