#!/bin/bash
# V3 re-roll: frame_02 (1664x936) and frame_14 (1672x938) are NOT 1672x941,
# so the main batch's hardcoded size suffix forced a full re-render with
# shifted composition. Re-roll with the exact native size per base frame.
set -u
cd "D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat"

K="D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/assets/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"
LOCK="严格保持其余所有内容逐像素不变：构图、姿势、角色设计、服装、背景、道具、雨丝、光线与色调。这是对原图的局部像素级编辑，不要整体重渲染、不要改变画布尺寸，只允许修改眼部"

run() {
  local name="$1" base="$2" size="$3" prompt="$4"
  echo "== gen $name (expect $size)"
  local log="tmp/v3_reroll_$name.log"
  codex exec "$prompt。输入图尺寸为 $size，输出必须严格保持 $size，并把成品 PNG 保存到 $K/${name}.png。$LOCK" $FLAGS -i "$base" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

run frame_02_eyes_closed "$K/frame_02.png" "1664x936" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线）"

run frame_14_eyes_closed "$K/frame_14.png" "1672x938" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线，保持开心笑容）"

echo "== reroll done"
