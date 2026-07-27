#!/bin/bash
# Second walk fix: the opposite-CONTACT re-roll produced backwards feet
# (model twisted shoe orientation when swapping legs). Switch strategy to the
# standard limited-animation walk: contact cel (existing base frame) alternated
# with a PASSING cel (one leg planted, other knee-bent swinging past, lifted
# foot hanging naturally with toe pointing down — no shoe-orientation trap).
set -u
cd "D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat"

A="D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/assets"
OUT="D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/tmp/walkfix2"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"
mkdir -p "$OUT"

run() {
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/v3_walkfix2_$name.log"
  codex exec "$prompt。输出严格为 1672x941 PNG，成品保存到 $OUT/$name.png" \
    $FLAGS "$@" > "$log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

run walk_alt \
  "重绘 image 2 的行走过渡帧（passing pose）：保持与 image 2 完全相同的构图、人物设计、服装、持伞、书包、背景与雨景，只改腿部姿态——她向右行走，现在是过渡瞬间：右腿直立支撑、全脚掌踩地，左腿屈膝抬起从右腿旁经过、左脚完全离地、小腿自然后摆、左脚鞋尖朝向下方的地面。两只鞋的鞋尖都必须朝向画面右方（行走方向），脚踝和膝盖弯曲方向符合人体结构，不要多余肢体" \
  -i "$A/girl_reference.png" -i "$A/keyframes/frame_01.png"

run walkaway_alt \
  "重绘 image 2 的行走过渡帧（passing pose）：保持与 image 2 完全相同的构图、背影人物、服装、抱猫、书包、孤伞、小屋与彩虹天空，只改腿部姿态——背影她向前行走，现在是过渡瞬间：右腿直立支撑、全脚掌踩地，左腿屈膝向后抬起、左脚完全离地、从背后能看到左脚鞋底、左脚尖自然朝下。右脚鞋跟朝后、站立稳定，脚踝和膝盖弯曲方向符合人体结构，不要多余肢体" \
  -i "$A/girl_reference.png" -i "$A/keyframes/frame_16.png"

echo "== walkfix2 done"
