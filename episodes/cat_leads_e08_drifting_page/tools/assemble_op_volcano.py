"""E08 片头 OP（大模型正片剪辑版）：volcano 素材 + 歌词字幕条 + 片名卡。

镜头表（op 时间轴 71.07s；源时间均为各片秒数；原片音轨全部丢弃）：
  前奏 0-15.5      河堤静景×3（e08v/e07）
  主歌 15.5-42.2   人物与猫日常×5（e06/e07，叠化 0.5s）
  副歌 42.2-63.07  漂页/动感×4（e08v 为主，硬切）
  尾奏 63.07-71.07 双人远景 → 片名卡（纯色底白字，叠化 0.8s）
歌词字幕条：theme_alignment.json 的 8 句（op 时间映射），深色底条常驻
15.5-63.1s 盖住素材自带对白条，显示当前乐句。
输出：volcano/op/op.mp4（h264+aac，音轨 = 漂吧_op_vo.wav）
"""
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
E06 = ROOT.parents[0] / 'cat_leads_e06_cat_model/output/2026_9_5_1623_bgmv2.mp4'
E07 = ROOT.parents[0] / 'cat_leads_e07_river_willow/output/2026_9_6_0143_v8.mp4'
E08V = ROOT / 'volcano/output/2026_9_6_01.mp4'
AUDIO = ROOT / 'assets/audio/theme/漂吧_op_final.wav'
OUT = ROOT / 'volcano/op/op.mp4'
FPS = 30
FONT = 'C\\:/Windows/Fonts/msyh.ttc'
TITLE_FONT = 'C\\:/Windows/Fonts/STKAITI.TTF'
ENDCARD = ROOT / 'volcano/op/endcard_matched_v2.png'

# (源key, 源起点, 时长, 到下一段的转场: 'xfade.5' | 'cut' | None)
SEGS = [
    # 前奏：河/柳/远景
    ('e08v', 0.5, 6.7, 'xf0.5'),   # 河堤柳树静景
    ('e07', 0.3, 2.9, 'xf0.5'),    # 柳树河道空镜（3s 后该集自带对白条，截在前面）
    ('e08v', 11.5, 6.9, 'xf0.5'),  # 树下双人+猫（建立镜头）
    # 主歌：人物与猫日常
    ('e06', 3.0, 5.74, 'xf0.5'),   # 阿澈树下速写
    ('e06', 13.0, 5.74, 'xf0.5'),  # 小蓝蹲摸小橘（原窗口 11.5-13.0 源片静止，前移避开）
    ('e07', 2.5, 5.74, 'xf0.5'),   # 小蓝柳道
    ('e06', 20.5, 5.74, 'xf0.5'),  # 小蓝惊呼「跑掉了」
    ('e06', 36.0, 5.74, 'cut'),    # 小橘打盹+速写本猫咪画 reveal —— 主歌收，硬切进副歌
    # 副歌：漂页/动感，硬切
    ('e08v', 16.8, 5.3, 'cut'),    # 画页飞向天空
    ('e08v', 30.5, 5.3, 'cut'),    # 画页贴水漂流
    ('e08v', 22.5, 5.3, 'cut'),    # 小蓝急/阿澈「别追」
    ('e08v', 49.5, 5.07, 'xf0.5:kb'), # 画页特写（源片静止 → Ken Burns 缓推）
    # 尾奏
    ('e08v', 54.5, 4.5, 'xf0.8'),  # 树下双人远景
    ('title', 0, 5.2, 'kb'),       # 片名卡（缓慢推近）
]
SRC = {'e06': E06, 'e07': E07, 'e08v': E08V}

# 歌词（op 时间 = 歌曲时间偏移：副歌段 song-79.21+42.21）
LYRICS = [
    (15.51, 20.75, '雨停了 河面泛着光'),
    (22.05, 28.47, '那张画 顺着水流向远方'),
    (29.55, 37.45, '画里的你 还在微笑吗'),
    (37.27, 43.21, '风把答案 吹成了浪'),
    (43.21, 46.39, '漂吧 漂吧 别怕路太长'),
    (46.07, 49.25, '碎玻璃里 映着你的模样'),
    (50.21, 55.39, '当春风 又吹动我的头发'),
    (55.23, 63.07, '你还会 回到我身旁'),
]


def esc(t):
    return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "\\'")


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    inputs, filters = [], []
    src_idx = {}
    input_args = []
    for key, path in SRC.items():
        src_idx[key] = len(inputs)
        inputs.append(str(path))
        input_args += ['-i', str(path)]
    # 片尾卡图片输入（loop 到段长）
    title_dur = next(d for k, st, d, tr in SEGS if k == 'title')
    src_idx['title'] = len(inputs)
    inputs.append(str(ENDCARD))
    input_args += ['-loop', '1', '-t', str(title_dur), '-i', str(ENDCARD)]

    # 每段裁剪 + 统一格式
    labels = []
    for i, (key, st, dur, trans) in enumerate(SEGS):
        kb = bool(trans and 'kb' in trans)
        trans = trans.split(':')[0] if trans else trans
        kb_f = ",zoompan=z='1+0.00035*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30" if kb else ''
        SEGS[i] = (key, st, dur, trans)
        if key == 'title':
            # 片尾卡：与正片青蓝日景匹配的动画河岸图 + 楷体白字微投影，
            # 居中偏下，Ken Burns 缓推保留
            filters.append(
                f"[{src_idx['title']}:v]fps={FPS},format=yuv420p,setsar=1{kb_f},settb=AVTB,"
                f"drawtext=fontfile='{TITLE_FONT}':text='漂走的那张画':fontcolor=white:fontsize=92:"
                f"shadowcolor=0x00000066:shadowx=2:shadowy=3:"
                f"x=(w-text_w)/2:y=h*0.60[s{i}]")
        else:
            filters.append(
                f"[{src_idx[key]}:v]trim={st}:{st + dur},setpts=PTS-STARTPTS,"
                f"fps={FPS},format=yuv420p,setsar=1{kb_f},settb=AVTB[s{i}]")
        labels.append((f'[s{i}]', trans))

    # 串接：xfade 用偏移，cut 用 concat
    cur, cur_len = 's0', SEGS[0][2]
    for i in range(1, len(SEGS)):
        trans = SEGS[i - 1][3]
        nxt, nxt_len = f's{i}', SEGS[i][2]
        if trans and trans.startswith('xf'):
            d = float(trans[2:])
            out = f'x{i}'
            filters.append(f'[{cur}][{nxt}]xfade=transition=fade:duration={d}:offset={cur_len - d:.2f}[{out}]')
            cur, cur_len = out, cur_len + nxt_len - d
        else:
            out = f'c{i}'
            filters.append(f'[{cur}][{nxt}]concat=n=2:v=1:a=0[{out}]')
            cur, cur_len = out, cur_len + nxt_len
    total = cur_len

    # 歌词条：无底色——白字 + 深色描边 + 投影（家庭剧 MV 惯例）。
    # 素材自带对白条已在段落级用 delogo 涂抹，这里不再放任何色块。
    texts = []
    for i, (a, b, text) in enumerate(LYRICS):
        # 句间空挡延续上一句，避免空底条
        end = LYRICS[i + 1][0] if i + 1 < len(LYRICS) else 63.1
        texts.append(
            f"drawtext=fontfile='{FONT}':text='{esc(text)}':fontcolor=white:fontsize=40:"
            f"x=(w-text_w)/2:y=h-102:borderw=3:bordercolor=0x14202e:"
            f"shadowcolor=0x000000aa:shadowx=2:shadowy=2:enable='between(t,{a},{end})'")
    # 统一裁底 135px（源片自带对白条带）再 lanczos 拉回 1080 —— 比 delogo 干净，
    # 全程一致构图；歌词白字+描边+投影直接压在画面上，无底条色块。
    filters.append(f'[{cur}]crop=1920:945:0:0,scale=1920:1080:flags=lanczos[b0]')
    prev = 'b0'
    for i, dt in enumerate(texts):
        filters.append(f'[{prev}]{dt}[b{i + 1}]')
        prev = f'b{i + 1}'
    filters.append(f'[{prev}]format=yuv420p[vout]')

    cmd = ['ffmpeg', '-y', '-v', 'error'] + input_args
    cmd += ['-i', str(AUDIO), '-filter_complex', ';'.join(filters),
            '-map', '[vout]', '-map', f'{len(inputs)}:a:0',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k', '-t', f'{total:.2f}', '-movflags', '+faststart', str(OUT)]
    subprocess.run(cmd, check=True)
    dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', str(OUT)], capture_output=True, text=True).stdout.strip()
    print(f'op.mp4: {dur}s (目标 {total:.2f})')

    (OUT.parent / 'op_editlist.json').write_text(json.dumps({
        'audio': str(AUDIO.relative_to(ROOT)),
        'total_seconds': round(total, 2),
        'segments': [{'src': f'{k}@{SRC.get(k, "生成").name if k != "title" else "ffmpeg color+drawtext"}',
                      'src_range': [st, round(st + d, 2)], 'transition_to_next': tr}
                     for k, st, d, tr in SEGS],
        'lyrics_overlay': [{'op': [a, b], 'text': t} for a, b, t in LYRICS],
    }, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
