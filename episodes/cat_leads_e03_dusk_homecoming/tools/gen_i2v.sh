#!/bin/bash
# E03 I2V clips: 4 continuous-action shots via wan2.6-i2v STANDARD tier
# (720P, silent extraction only, 0.6 CNY/s). E02's flash tier let the cat
# drift off-model during fast motion; standard tier is the consistency fix
# under test. Travel direction is LEFT (homecoming). First frames must exist
# in assets/keyframes/. Extracts 12fps cel PNGs per clip.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image: razor-clean flat color shapes, zero texture, no gradients except the sky, dusk violet-to-orange palette, no new elements, no camera movement."

i2v() { # name duration firstframe prompt
  local name="$1" dur="$2" frame="$3" prompt="$4"
  echo "== i2v $name (${dur}s)"
  "$PY" "$GEN" --model wan2.6-i2v --out "$A/i2v/$name.mp4" --first-frame "$frame" \
    --prompt "$prompt $STYLE" --duration "$dur" --resolution 720P \
    --extract-cels "$A/i2v/$name" --fps 12 \
    > "tmp/i2v_$name.log" 2>&1
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== ok $name"; else echo "== FAILED $name (see tmp/i2v_$name.log)"; fi
}

i2v cat_run_bank 2 "$K/frame_run_01.png" "The orange tabby cat runs lightly toward the LEFT side of the frame down the grassy riverbank slope, quick small bounding steps, tail held high and straight, ears up; its long dusk shadow slides along the grass. The camera is completely fixed; the background stays still as the cat crosses the frame."

i2v girl_bridge_walk 3 "$K/frame_bridge_02.png" "The girl walks steadily toward the LEFT side of the frame across the small stone bridge, her long deep-blue hair and navy pleated skirt lifted gently by the evening wind, her long shadow trailing behind her. The camera is completely fixed; the background scrolls slowly right as she advances."

i2v cat_wall_walk_dusk 3 "$K/frame_wall_03.png" "The orange tabby cat walks lightly toward the LEFT along the flat top edge of the white perimeter wall, tail swaying gently, one paw in front of the other; warm window lights and the dusk lane below stay calm. The camera is completely fixed; the background scrolls slowly right as the cat advances."

i2v girl_lane_walk 2 "$K/frame_lane_04.png" "The girl walks steadily toward the LEFT side of the frame into the dusk residential lane, arms relaxed, her very long shadow stretching ahead of her, warm door-lamp light growing on her side. The camera is completely fixed; the background scrolls slowly right as she advances."

echo "== i2v all done"
