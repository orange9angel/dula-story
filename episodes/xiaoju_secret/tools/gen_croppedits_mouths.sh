#!/bin/bash
# Crop-forced mouth/meow variants: edit only a cropped rect via codex, then
# feather-paste back (tools/variant_crop_edit.py). Output goes straight to
# assets/mouth_variants/ as the locked variant.
set -u
EP="D:/opensource/movie/dula-story/episodes/xiaoju_secret"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
cd "$EP"

HALF="把图中人物的嘴部改成微微张开（说话起音，下颚略开，露出一点深色口腔），其余所有内容保持不变"
OPEN="把图中人物的嘴部改成明显张开（发「啊」音的开口度，下颚自然下降，可见深色口腔内部），其余所有内容保持不变"
MHALF="把图中橘猫的嘴部改成微微张开（喵叫起音，下颚略开，露出一点深色口腔），其余所有内容保持不变"
MOPEN="把图中橘猫的嘴部改成明显张开（喵叫峰值，下颚张开，可见深色口腔），其余所有内容保持不变"

run() { # name frame rx ry rw rh prompt
  local name="$1" frame="$2" rx="$3" ry="$4" rw="$5" rh="$6" prompt="$7"
  local out="assets/mouth_variants/${name}_locked_v1.png"
  if [ -s "$out" ]; then echo "== skip $name"; return 0; fi
  echo "== crop-edit $name"
  "$PY" tools/variant_crop_edit.py "assets/keyframes/frame_${frame}.png" "$rx" "$ry" "$rw" "$rh" "$prompt" "$out"
}

run frame_05_half 05 740 350 220 150 "$HALF"
run frame_16_half 16 780 190 190 140 "$HALF"
run frame_22_half 22 780 200 200 140 "$HALF"
run frame_23_half 23 750 310 200 140 "$HALF"
run frame_23_open 23 750 310 200 140 "$OPEN"
run frame_27_half 27 730 240 210 140 "$HALF"
run frame_28_half 28 560 160 180 130 "$HALF"
run frame_29_half 29 690 290 220 150 "$HALF"
run frame_31_half 31 690 290 180 130 "$HALF"
run frame_31_open 31 690 290 180 130 "$OPEN"
run frame_32_half 32 750 470 220 150 "$HALF"
run frame_34_half 34 670 230 180 140 "$HALF"
run frame_36_half 36 650 320 240 160 "$HALF"
run frame_38_half 38 950 150 190 140 "$HALF"
run frame_38_open 38 950 150 190 140 "$OPEN"
run frame_39_half 39 610 130 170 120 "$HALF"
run frame_25_meow_half 25 480 300 280 190 "$MHALF"
run frame_25_meow_open 25 480 300 280 190 "$MOPEN"

echo "LANE M DONE"
