#!/usr/bin/env python3
"""E08 主题曲混合版：真埙/真笛 + AI 垫底（调性对齐 + 闪避 + 软化）。

结构（约 78s）：
  0-10s   埙A 独奏开场（独占，不叠底）
  10-16s  AI 底淡入（D# 移调到 C#），独奏退出
  16-42s  笛1 主奏段一（底闪避 -8dB + 3kHz 低通软化）
  42-50s  底单独呼吸
  50-70s  笛1 主奏段二
  70-78s  埙B 尾奏（G# 是 C#m 的属方向，自然收束）

产物：assets/audio/theme/theme_hybrid_v1.wav
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / 'assets/audio/theme'
OUT = T / 'theme_hybrid_v1.wav'

XUN_A = T / 'samples/xun_200419.mp3'
XUN_B = T / 'samples/xun_200420.mp3'
DIZI = T / 'samples/dizi_594071.mp3'
BED = T / 'candidate_e_bgm.wav'

# D# -> C# 降 2 个半音（rubberband 变调不变速）
PITCH = 2 ** (-2 / 12)

filtergraph = f"""
[0:a]atrim=0:10,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=8:d=2,volume=1.7[xunA];
[1:a]rubberband=pitch={PITCH:.6f},lowpass=f=3200,volume=0.55,
     atrim=0:60,asetpts=PTS-STARTPTS,afade=t=in:d=3[bed0];
[2:a]atrim=5:31,asetpts=PTS-STARTPTS,afade=t=in:d=1,afade=t=out:st=24:d=2,volume=1.5[dizi1];
[2c:a]atrim=27:47,asetpts=PTS-STARTPTS,afade=t=in:d=1,afade=t=out:st=18:d=2,volume=1.5[dizi2];
[3:a]atrim=13:23.5,asetpts=PTS-STARTPTS,afade=t=in:d=2,volume=1.5[xunB];
""".replace('\n', '').replace('     ', '')

# 时间线用 adelay + amix 组装
# bed 在 8s 淡入;dizi1 在 16s;dizi2 在 50s;xunB 在 70s
fc = (
    f"[0:a]atrim=0:10,asetpts=PTS-STARTPTS,afade=t=in:d=1.5,afade=t=out:st=8:d=2,volume=1.7[xunA];"
    f"[1:a]rubberband=pitch={PITCH:.6f},lowpass=f=3200,atrim=0:60,asetpts=PTS-STARTPTS,"
    f"afade=t=in:st=0:d=3,adelay=8000|8000[bed];"
    f"[2:a]atrim=5:31,asetpts=PTS-STARTPTS,afade=t=in:d=1,afade=t=out:st=24:d=2,volume=1.5,"
    f"adelay=16000|16000[d1];"
    f"[2:a]atrim=27:47,asetpts=PTS-STARTPTS,afade=t=in:d=1,afade=t=out:st=18:d=2,volume=1.5,"
    f"adelay=50000|50000[d2];"
    f"[3:a]atrim=13:23.5,asetpts=PTS-STARTPTS,afade=t=in:d=2,volume=1.6,adelay=70000|70000[xb];"
    f"[xunA][bed][d1][d2][xb]amix=inputs=5:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]"
)

cmd = ['ffmpeg', '-v', 'error', '-y',
       '-i', str(XUN_A), '-i', str(BED), '-i', str(DIZI), '-i', str(XUN_B),
       '-filter_complex', fc, '-map', '[out]', str(OUT)]
subprocess.run(cmd, check=True)
print('written', OUT)
subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'csv=p=0', str(OUT)], check=True)
