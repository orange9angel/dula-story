#!/bin/bash
# Re-roll the two walk-cycle alt frames: V2's versions kept the SAME step phase
# as their base frames, so alternating them in the timeline never moved the legs.
# Prompts now spell out the exact leg assignment in the reference and demand
# the swapped phase. Output keeps the canonical filenames so the timeline is
# untouched. Serial, salvage from generated_images as fallback.
set -u
cd "D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat"

A="D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/assets"
GEN="$HOME/.codex/generated_images"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

run() {
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/v3_walkfix_$name.log"
  codex exec "$prompt。输出严格为 1672x941 PNG，成品保存到 D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/tmp/walkfix/$name.png" \
    $FLAGS "$@" > "$log" 2>&1
  if [ -s "D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/tmp/walkfix/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

run walk_alt \
  "重绘 image 2 的行走中间画：保持与 image 2 完全相同的构图、人物设计、服装、姿势、持伞、书包、背景与雨景，唯一改变的是腿部步相——image 2 中她靠画面右侧的腿在前伸、脚尖点地，画面左侧的腿在后、全脚掌撑地；请交换为：画面左侧的腿向前迈出、脚跟着地，画面右侧的腿向后蹬、脚尖离地，形成自然的行走相反步相。两腿都要清晰可见，膝盖弯曲方向正确，不要多余肢体" \
  -i "$A/girl_reference.png" -i "$A/keyframes/frame_01.png"

run walkaway_alt \
  "重绘 image 2 的行走中间画：保持与 image 2 完全相同的构图、背影人物、服装、抱猫、书包、孤伞、小屋与彩虹天空，唯一改变的是腿部步相——image 2 中她左脚全脚掌撑地、右脚跟抬起拖在后；请交换为：右脚全脚掌撑地承重、左脚跟抬起向后迈出，形成行走相反步相。背影两腿都要清晰可见，不要多余肢体" \
  -i "$A/girl_reference.png" -i "$A/keyframes/frame_16.png"

echo "== walkfix done"
