#!/bin/bash
# Mouth/eye variants for snow_fox_shrine — local edits only.
# Mouth: half/open for Tsumugi's speaking frames; Eye: closed for blink frames.
# Run after the base keyframes are accepted; then auto_lock_variants.py
# feather-locks them back onto the base frames.
set -u
cd "D:/opensource/movie/dula-story/episodes/snow_fox_shrine"
mkdir -p assets/mouth_variants assets/eye_variants tmp

A="D:/opensource/movie/dula-story/episodes/snow_fox_shrine/assets"
K="$A/keyframes"
MV="$A/mouth_variants"
EV="$A/eye_variants"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

PIXEL_LOCK="严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，只允许修改指定区域"

mouth() { # base variant desc who
  local base="$1" variant="$2" desc="$3" who="$4"
  echo "== gen mouth ${base}_${variant}"
  codex exec "局部编辑 image 1：只把${who}的嘴部改成${desc}，$PIXEL_LOCK。并把成品 PNG 保存到 $MV/${base}_${variant}.png。" $FLAGS -i "$K/${base}.png" > "tmp/mouth_${base}_${variant}.log" 2>&1
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== ok ${base}_${variant}"; else echo "== MISSING ${base}_${variant}"; fi
}

eyes() { # base who
  local base="$1" who="$2"
  echo "== gen eyes ${base}_closed"
  codex exec "局部编辑 image 1：只把${who}的双眼改成闭合（眼皮垂下成两条弧线），$PIXEL_LOCK。并把成品 PNG 保存到 $EV/${base}_closed.png。" $FLAGS -i "$K/${base}.png" > "tmp/eyes_${base}.log" 2>&1
  if [ -s "$EV/${base}_closed.png" ]; then echo "== ok ${base}_closed"; else echo "== MISSING ${base}_closed"; fi
}

# 小紬口型（4 个台词基帧）
for base in frame_05 frame_09 frame_12 frame_14; do
  mouth "$base" half "微张（half-open，唇间露出一点口腔）" "女孩"
  mouth "$base" open "自然张开（说话时的开口，露出一点口腔和牙齿）" "女孩"
done

# 小紬眨眼
for base in frame_05 frame_09 frame_12 frame_14; do
  eyes "$base" "女孩"
done

# 小狐眨眼
eyes frame_04 "小狐狸"
eyes frame_13 "小狐狸"

echo "== variants done"
