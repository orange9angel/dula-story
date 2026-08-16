#!/bin/bash
# Regenerate blink cels via codex crop-edit now that quota is back.
# Replaces the procedurally synthesized cels (03, 09, 17) and fixes the
# frame_26 wink properly (both eyes closed in one edit).
set -u
EP="D:/opensource/movie/dula-story/episodes/xiaoju_secret"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
cd "$EP"

BOTH="把图中两只眼睛都改成自然闭合（眨眼瞬间，上下眼睑合拢、睫毛可见，两眼必须同时完全闭合，禁止单眼睁开），其余所有内容保持不变"
CBOTH="把图中橘猫的两只眼睛都改成自然闭合（猫眨眼瞬间，上下眼睑合拢，两眼必须同时完全闭合，禁止单眼睁开），其余所有内容保持不变"

run() { # name frame rx ry rw rh prompt
  local name="$1" frame="$2" rx="$3" ry="$4" rw="$5" rh="$6" prompt="$7"
  echo "== codex blink $name"
  "$PY" tools/variant_crop_edit.py "assets/keyframes/frame_${frame}.png" "$rx" "$ry" "$rw" "$rh" "$prompt" "tmp/gen2/${name}.png"
}
mkdir -p tmp/gen2

run frame_26_blink_v2 26 770 190 290 100 "$BOTH"
run frame_03_blink_v2 03 750 270 140 80 "$CBOTH"
run frame_17_blink_v2 17 590 130 130 80 "$CBOTH"
run frame_09_blink_v2 09 400 260 880 200 "$CBOTH"

echo "BLINK REGEN DONE"
