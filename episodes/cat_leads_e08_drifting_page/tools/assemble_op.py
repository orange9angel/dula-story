"""E08 片头 OP 合成：晴印素材剪辑 + 新绘对唱段 + 版名卡 → op.mp4。

时间线（op 音频 71.07s 为权威；theme_duet.json 的 op_structure）：
  A  E08 正片 [0, 15.5]         前奏：河堤静景/小蓝入画/阿澈速写
  B  E08 正片 [16.0, 42.7]      主歌：阵风 → 画页掀起 → 贴水漂页 → 重画起笔
  C  新绘 duet.mp4 (20.86s)     对唱副歌（xfade 1.0s @41.2）
  D  E08 正片 [49.5, 55.5]      尾奏：接画/速写本/环境
  E  新绘 title.mp4 (3.81s)     版名卡（xfade 0.8s）
音频：assets/audio/theme/漂吧_op.wav（已 loudnorm -16）。
"""
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
E08_OUT = ROOT / 'painted/output/output.mp4'
DUET = ROOT / 'painted/op/output/duet.mp4'
TITLE = ROOT / 'painted/op/output/title.mp4'
AUDIO = ROOT / 'assets/audio/theme/漂吧_op.wav'
OUT = ROOT / 'painted/op/output/op.mp4'
FPS = 30


def main():
    duet = json.loads((ROOT / 'config/theme_duet.json').read_text(encoding='utf-8'))
    op_secs = duet['op_structure']['op_seconds']
    verse1_end = duet['op_structure']['intro_plus_verse1'][1]  # 43.21 (歌曲时间==op 时间，A 段未剪)

    # A+B 总长按 verse1_end-1.0（xfade 1s 进副歌）
    ab_len = verse1_end - 1.0
    a_len, b_len = 15.5, round(ab_len - 15.5, 2)   # B: E08 [16.0, 16.0+b_len]
    duet_len = 20.86                                # 对唱段含 1s 器乐意口
    after_c = ab_len + duet_len - 1.0               # xfade 吸收 1s
    d_len = 6.0                                     # E08 [49.5, 55.5]
    title_len = round(op_secs - (after_c + d_len) + 0.8, 2)  # xfade 0.8s 进版名卡
    assert 3.0 <= title_len <= 4.3, title_len
    print(f'A {a_len}s + B {b_len}s -xf1.0-> C {duet_len}s + D {d_len}s -xf0.8-> E {title_len}s = {op_secs}s')

    pre = f'fps={FPS},format=yuv420p,setsar=1,settb=AVTB'
    fc = (
        f'[0:v]trim=0:{a_len},setpts=PTS-STARTPTS,{pre}[a];'
        f'[0:v]trim=16.0:{16.0 + b_len},setpts=PTS-STARTPTS,{pre}[b];'
        f'[a][b]concat=n=2:v=1:a=0[ab];'
        f'[1:v]{pre}[c];'
        f'[ab][c]xfade=transition=fade:duration=1.0:offset={ab_len - 1.0}[abc];'
        f'[0:v]trim=49.5:55.5,setpts=PTS-STARTPTS,{pre}[d];'
        f'[abc][d]concat=n=2:v=1:a=0[abcd];'
        f'[2:v]trim=0:{title_len},setpts=PTS-STARTPTS,{pre}[e];'
        f'[abcd][e]xfade=transition=fade:duration=0.8:offset={after_c + d_len - 0.8}[v]'
    )
    cmd = ['ffmpeg', '-y', '-v', 'error',
           '-i', str(E08_OUT), '-i', str(DUET), '-i', str(TITLE), '-i', str(AUDIO),
           '-filter_complex', fc, '-map', '[v]', '-map', '3:a:0',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '192k', '-t', str(op_secs), '-movflags', '+faststart', str(OUT)]
    subprocess.run(cmd, check=True)
    info = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                           '-of', 'csv=p=0', str(OUT)], capture_output=True, text=True).stdout.strip()
    print(f'{OUT.name}: {info}s')
    (ROOT / 'painted/op/output/assembly.json').write_text(json.dumps({
        'op_seconds': op_secs,
        'segments': [
            {'src': 'painted/output/output.mp4', 'range': [0, a_len], 'op': [0, a_len], 'note': '前奏：河堤静景/入画/速写'},
            {'src': 'painted/output/output.mp4', 'range': [16.0, 16.0 + b_len], 'op': [a_len, ab_len], 'note': '主歌：阵风/画页掀起/漂页/重画'},
            {'src': 'painted/op/output/duet.mp4', 'range': [0, duet_len], 'op': [ab_len - 1.0, after_c], 'xfade_in': 1.0, 'note': '对唱副歌新绘'},
            {'src': 'painted/output/output.mp4', 'range': [49.5, 55.5], 'op': [after_c, after_c + d_len], 'note': '尾奏：接画/速写本'},
            {'src': 'painted/op/output/title.mp4', 'range': [0, title_len], 'op': [after_c + d_len - 0.8, op_secs], 'xfade_in': 0.8, 'note': '版名卡'},
        ],
        'audio': 'assets/audio/theme/漂吧_op.wav',
    }, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
