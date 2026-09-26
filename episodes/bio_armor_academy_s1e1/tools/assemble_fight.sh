#!/bin/bash
# 《9章》30s 打斗试片 — 终装：I2V 10 镜裁窗 → 拼接 → 印章/冲击帧 overlay → 对轨混音母带。
# 时序来源 storyboard_fight.md；音频用 assets/audio/fight_mixed.wav（已对轨）。
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
V="$EP/assets/i2v"
OUTD="$EP/output"
mkdir -p "$OUTD" "$EP/tmp/assemble"
FONT="C\\:/Windows/Fonts/simhei.ttf"
[ -f "/c/Windows/Fonts/simhei.ttf" ] || FONT="C\\:/Windows/Fonts/msyh.ttc"

# 每镜: 名字 目标时长(s) 源处理(trim 裁短 / tpad 克隆尾帧补长)
prep() { # name target mode
  local name="$1" target="$2" mode="$3"
  local src="$V/$name.mp4" dst="$EP/tmp/assemble/$name.mp4"
  # 对白镜入点对齐音频入点（前补静帧秒数）：fight_00 补 0.3s，fight_01 补 0.5s
  local lead=0
  case "$name" in
    fight_00) lead=0.3;;
    fight_01) lead=0.5;;
  esac
  # 版本优先级：首尾帧段 > 续拍链 > 口型版 > 普通
  # 首尾帧映射：fight_03→seg_0304, fight_04→seg_0405, fight_05→seg_0506, fight_06→seg_0607
  local segname=""
  case "$name" in
    fight_03) segname="seg_0304";;
    fight_04) segname="seg_0405";;
    fight_05) segname="seg_0506";;
    fight_06) segname="seg_0607";;
  esac
  [ -n "$segname" ] && [ -s "$V/${segname}_bookend.mp4" ] && src="$V/${segname}_bookend.mp4"
  [ -s "$V/${name}_chain.mp4" ] && [ "$src" = "$V/$name.mp4" ] && src="$V/${name}_chain.mp4"
  [ -s "$V/${name}_speech.mp4" ] && src="$V/${name}_speech.mp4"
  # 对白镜闸口：00/01 必须 speech 版，缺失即警告（防无声版混进成片）
  case "$name" in fight_00|fight_01)
    [ -s "$V/${name}_speech.mp4" ] || echo "!! WARNING: 对白镜 $name 缺 _speech 口型版，正在用无声版" ;;
  esac
  if [ "$mode" = "tpad" ]; then
    # 前补静帧 leadf 帧（对白镜对齐音频入点）+ 尾补 stopf 帧；tpad 单位是帧（24fps）
    local leadf stopf
    leadf=$(echo "$lead" | awk '{printf "%d", $1*24 + 0.5}')
    stopf=$(echo "$target $lead" | awk '{d=($1-$2-5.041667)*24; printf "%d", (d>0? d+0.5 : 0)}')
    ffmpeg -loglevel error -y -i "$src" -vf "tpad=start=$leadf:start_mode=clone:stop=$stopf:stop_mode=clone" -t "$target" -an "$dst"
  else
    if [ "$name" = "fight_03" ]; then
      # 速度斜坡跳过失真区：0-1.5s 常速（抛摔）→ 1.5-3.2s 压进 0.2s（鞭模糊过压砸区）
      # → 3.2-4.04s 常速（定格落到关键帧 04），合计 2.5s
      ffmpeg -loglevel error -y -i "$src" -filter_complex "\
[0:v]trim=0:1.5,setpts=PTS-STARTPTS[a];\
[0:v]trim=1.5:3.2,setpts=0.1176*(PTS-STARTPTS)[b];\
[0:v]trim=3.2:4.04,setpts=PTS-STARTPTS[c];\
[a][b][c]concat=n=3:v=1:a=0" -an "$dst"
    else
      ffmpeg -loglevel error -y -i "$src" -t "$target" -an "$dst"
    fi
  fi
  # 统一 720p24fps 无音频（源片即 24fps，禁转 30 防 judder）
  ffmpeg -loglevel error -y -i "$dst" -vf "scale=1280:720,fps=24" -an -c:v libx264 -pix_fmt yuv420p -crf 18 "$EP/tmp/assemble/${name}_n.mp4"
}

prep fight_00 5.3 tpad
prep fight_01 5.05 trim
prep fight_02 3.66 trim
prep fight_03 2.5 trim
prep fight_04 2.8 trim
prep fight_05 2.1 trim
prep fight_06 1.4 trim
prep fight_07 3.0 trim
prep fight_08 3.7 trim
prep fight_09 0.5 trim

cd "$EP/tmp/assemble"
for s in fight_00 fight_01 fight_02 fight_03 fight_04 fight_05 fight_06 fight_07 fight_08 fight_09; do echo "file '${s}_n.mp4'"; done > concat.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i concat.txt -c:v libx264 -crf 18 -pix_fmt yuv420p -r 24 raw_30s.mp4

# overlay: 冲击帧 21.6s 黑白反转0.08s（镜头语言，常驻）。
# 印章風林火山默认不烧入（STAMPS=1 才加，监制审过净版后再单独出贴字版）。
VF="negate=enable='between(t,21.6,21.68)',eq=contrast=1.6:enable='between(t,21.6,21.68)',format=yuv420p"
if [ "${STAMPS:-0}" = "1" ]; then
  STAMP="fontsize=150:fontcolor=0xFF3B3B:borderw=6:bordercolor=white:x=(w-text_w)/2:y=(h-text_h)/2-40"
  VF="drawtext=fontfile='$FONT':text='風':$STAMP:enable='between(t,14.0,15.5)',\
drawtext=fontfile='$FONT':text='林':$STAMP:enable='between(t,16.5,18.0)',\
drawtext=fontfile='$FONT':text='火':$STAMP:enable='between(t,19.3,20.8)',\
drawtext=fontfile='$FONT':text='山':$STAMP:enable='between(t,22.8,24.3)',$VF"
fi
ffmpeg -loglevel error -y -i raw_30s.mp4 -vf "$VF" -c:v libx264 -crf 18 overlay_30s.mp4

# 对轨：混音母带
ffmpeg -loglevel error -y -i overlay_30s.mp4 -i "$EP/assets/audio/fight_mixed.wav" \
  -map 0:v -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 30 "$OUTD/fight_30s.mp4"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTD/fight_30s.mp4")
echo "assembled: $OUTD/fight_30s.mp4  ${d}s"
