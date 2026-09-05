#!/bin/bash
# S1E01 mouth/eye variant batch: serial codex local edits of approved keyframes.
# Skip-if-exists; outputs land in tmp/variants_raw/ then get diff-locked by tools.
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
K="$EP/assets/keyframes"
OUT="$EP/tmp/variants_raw"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
LOGD="$EP/tmp/variants"
mkdir -p "$OUT" "$LOGD"

LOCK="严格保持其余所有内容逐像素不变：构图、姿势、表情其他部分、角色设计、服装、背景、光线与色调。这是对原图的局部像素级编辑，不要整体重渲染、不要改变画布尺寸。输出必须严格保持 1672x941。"

run() {
  local name="$1" base="$2" prompt="$3"
  if [ -s "$OUT/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name  $(date +%H:%M:%S)"
  "$PY" "$GEN" --out "$OUT/$name.png" --ref "$base" --size 1672x941 --timeout 280 \
    --prompt "$prompt。$LOCK" > "$LOGD/$name.log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name  $(date +%H:%M:%S)"; else echo "== MISSING $name (see $LOGD/$name.log)"; fi
}

mouth() { # frame, state, desc
  run "frame_$1_mouth_$2" "$K/frame_$1.png" "局部编辑 image 1：只把角色的嘴部改成$2（$3），其余像素不变"
}
eyes() {  run "frame_$1_eyes_closed" "$K/frame_$1.png" "局部编辑 image 1：只把角色的双眼改成闭合（眼皮垂下成两条极细、浅色、短弧线，不要粗黑厚眼线），保持其余表情不变"; }

# mouth rigs: entries 2,3,4,5,6,7,8,10,11 -> frames 01,02,03,04,05,06,07,09,10
for f in 01 02 03 04 05 06 07 09 10; do
  mouth $f half "半张状态（嘴唇微微分开，不露牙齿）"
  mouth $f open "完全张开（露出牙齿和口腔，说话峰值）"
done
# closed variants only where the base frame's mouth is not closed
for f in 01 03 05 09; do
  mouth $f closed "闭合状态（嘴唇自然抿合）"
done
# eye rigs: frames 01,03,05,06,09
for f in 01 03 05 06 09; do
  eyes $f
done

echo "== variant batch done  $(date +%H:%M:%S)"
ls "$OUT"
