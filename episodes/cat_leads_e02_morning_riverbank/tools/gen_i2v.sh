#!/bin/bash
# E02 I2V clips: 4 continuous-action shots via wan2.6-i2v-flash, 3s / 720P /
# silent (0.15 CNY/s -> 0.45 CNY per clip). First frames must exist in
# assets/keyframes/. Extracts 12fps cel PNGs per clip.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image:
razor-clean flat color shapes, zero texture, no gradients except the sky,
no new elements, no camera movement."

i2v() { # name firstframe prompt
  local name="$1" frame="$2" prompt="$3"
  echo "== i2v $name"
  "$PY" "$GEN" --out "$A/i2v/$name.mp4" --first-frame "$frame" \
    --prompt "$prompt $STYLE" --duration 3 --resolution 720P \
    --extract-cels "$A/i2v/$name" --fps 12 \
    > "tmp/i2v_$name.log" 2>&1
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== ok $name"; else echo "== FAILED $name (see tmp/i2v_$name.log)"; fi
}

i2v cat_wall_walk "$K/frame_wall_01.png" "The orange tabby cat walks lightly
toward the right along the flat top edge of the white perimeter wall, tail
swaying gently, one paw in front of the other; the morning street below stays
calm. The camera is completely fixed; the background scrolls slowly left as
the cat advances."

i2v girl_street_walk "$K/frame_walk_02.png" "The girl walks steadily toward
the right side of the frame along the quiet morning street, her long deep-blue
hair and navy pleated skirt swaying gently with each step, her long morning
shadow following her. The camera is completely fixed; the background scrolls
slowly left as she advances."

i2v cat_hop_steps "$K/frame_steps_03.png" "The orange tabby cat hops up the
wide stone steps toward the upper right in two light bounces, then sits down
at the top step and looks back. Quick, light, cat-like motion. The camera is
completely fixed."

i2v girl_grass_walk "$K/frame_grass_04.png" "The girl walks down the grassy
riverbank slope toward the right and the river, seen from behind; the morning
breeze lifts her long deep-blue hair and pleated skirt hem; the gold light
bands on the river shimmer gently. The camera is completely fixed."

echo "== i2v all done"
