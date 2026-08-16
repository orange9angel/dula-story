#!/bin/bash
# Crop-forced blink variants: edit only a cropped eye rect via codex, then
# feather-paste back. Output goes straight to assets/eye_variants/.
set -u
EP="D:/opensource/movie/dula-story/episodes/xiaoju_secret"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
cd "$EP"

GBLINK="把图中少女的双眼改成自然闭合（眨眼瞬间，上下眼睑合拢、睫毛可见，双眼对称），其余所有内容保持不变"
BBLINK="把图中少年的双眼改成自然闭合（眨眼瞬间，上下眼睑合拢、睫毛可见，双眼对称），其余所有内容保持不变"
CBLINK="把图中橘猫的双眼改成自然闭合（猫眨眼瞬间，上下眼睑合拢，双眼对称），其余所有内容保持不变"

run() { # frame rx ry rw rh prompt
  local frame="$1" rx="$2" ry="$3" rw="$4" rh="$5" prompt="$6"
  local out="assets/eye_variants/frame_${frame}_eyes_closed_locked_v1.png"
  if [ -s "$out" ]; then echo "== skip $frame"; return 0; fi
  echo "== crop-edit blink $frame"
  "$PY" tools/variant_crop_edit.py "assets/keyframes/frame_${frame}.png" "$rx" "$ry" "$rw" "$rh" "$prompt" "$out"
}

run 04 700 250 260 140 "$GBLINK"
run 05 640 230 260 140 "$GBLINK"
run 09 400 250 880 240 "$CBLINK"
run 16 730 160 230 130 "$GBLINK"
run 21 670 270 240 140 "$BBLINK"
run 23 720 240 240 130 "$GBLINK"
run 26 790 210 250 130 "$GBLINK"
run 27 720 190 260 150 "$BBLINK"
run 29 680 200 260 140 "$BBLINK"
run 32 680 340 340 160 "$GBLINK"
run 35 590 250 260 150 "$BBLINK"
run 36 660 230 260 150 "$BBLINK"
run 39 540 130 220 130 "$GBLINK"

echo "LANE E DONE"
