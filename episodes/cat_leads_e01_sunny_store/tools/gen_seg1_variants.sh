#!/bin/bash
# seg1 mouth/eye variants — local edits only (probe frame_01_half already done).
# Mouth: half/open for dialogue base frames; Eye: closed for blink frames.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/mouth_variants assets/eye_variants tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
K="$A/keyframes"
MV="$A/mouth_variants"
EV="$A/eye_variants"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

GIRL_LOCK="严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，只允许修改指定区域"

mouth() { # base variant desc who
  local base="$1" variant="$2" desc="$3" who="$4"
  echo "== gen mouth ${base}_${variant}"
  codex exec "局部编辑 image 1：只把${who}的嘴部改成${desc}，$GIRL_LOCK。并把成品 PNG 保存到 $MV/${base}_${variant}.png。" $FLAGS -i "$K/${base}.png" > "tmp/mouth_${base}_${variant}.log" 2>&1
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== ok ${base}_${variant}"; else echo "== MISSING ${base}_${variant}"; fi
}

eyes() { # base who
  local base="$1" who="$2"
  echo "== gen eyes ${base}_closed"
  codex exec "局部编辑 image 1：只把${who}的双眼改成闭合（眼皮垂下成两条弧线），$GIRL_LOCK。并把成品 PNG 保存到 $EV/${base}_closed.png。" $FLAGS -i "$K/${base}.png" > "tmp/eyes_${base}.log" 2>&1
  if [ -s "$EV/${base}_closed.png" ]; then echo "== ok ${base}_closed"; else echo "== MISSING ${base}_closed"; fi
}

# 少女口型（frame_01_half 探针已出，跳过）
mouth frame_01 open "自然张开（说话时的开口，露出一点口腔和牙齿）" "少女"
mouth frame_03 half "微张（half-open，唇间露出一点口腔）" "少女"
mouth frame_03 open "自然张开（说话时的开口，露出一点口腔和牙齿）" "少女"
mouth frame_08 half "微张（half-open，唇间露出一点口腔）" "少女"
mouth frame_08 open "自然张开（说话时的开口，露出一点口腔和牙齿）" "少女"

# 猫口型（猫叫用）
mouth frame_02 half "微张（猫叫起始，唇间露出一点口腔）" "橘猫"
mouth frame_02 open "张开（猫叫，露出嘴巴和小舌头）" "橘猫"
mouth frame_10 half "微张（猫叫起始，唇间露出一点口腔）" "橘猫"
mouth frame_10 open "张开（猫叫，露出嘴巴和小舌头）" "橘猫"

# 眨眼
eyes frame_01 "少女"
eyes frame_03 "少女"
eyes frame_08 "少女"
eyes frame_11 "少女"
eyes frame_02 "橘猫"
eyes frame_05 "橘猫"
eyes frame_10 "橘猫"

echo "== seg1 variants done"
