#!/bin/bash
# seg2 mouth/eye variants — local edits only.
# frame_21 excluded: base frame already has the cat's eyes closed (sleeping).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/mouth_variants assets/eye_variants tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
K="$A/keyframes"
MV="$A/mouth_variants"
EV="$A/eye_variants"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

EDIT_LOCK="严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，只允许修改指定区域"

mouth() {
  local base="$1" variant="$2" desc="$3"
  echo "== gen mouth ${base}_${variant}"
  codex exec "局部编辑 image 1：只把少女的嘴部改成${desc}，$EDIT_LOCK。并把成品 PNG 保存到 $MV/${base}_${variant}.png。" $FLAGS -i "$K/${base}.png" > "tmp/mouth_${base}_${variant}.log" 2>&1
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== ok ${base}_${variant}"; else echo "== MISSING ${base}_${variant}"; fi
}

eyes() {
  local base="$1" who="$2"
  echo "== gen eyes ${base}_closed"
  codex exec "局部编辑 image 1：只把${who}的双眼改成闭合（眼皮垂下成两条弧线），$EDIT_LOCK。并把成品 PNG 保存到 $EV/${base}_closed.png。" $FLAGS -i "$K/${base}.png" > "tmp/eyes_${base}.log" 2>&1
  if [ -s "$EV/${base}_closed.png" ]; then echo "== ok ${base}_closed"; else echo "== MISSING ${base}_closed"; fi
}

mouth frame_15 half "微张（half-open，唇间露出一点口腔）"
mouth frame_15 open "自然张开（说话时的开口，露出一点口腔和牙齿）"
mouth frame_22 half "微张（half-open，唇间露出一点口腔，保持微笑）"
mouth frame_22 open "自然张开（说话时的开口，露出一点口腔和牙齿，保持微笑）"

eyes frame_15 "少女"
eyes frame_20 "少女"
eyes frame_22 "少女"
eyes frame_16 "橘猫"

echo "== seg2 variants done"
