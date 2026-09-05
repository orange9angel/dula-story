#!/bin/bash
# E04 I2V clips: 4 continuous-action shots via 火山方舟 seedance-2.0-mini
# (720p, silent, 4s minimum billing tier ≈¥0.8/clip at the limited-time 40%
# rate). E03 V2 verdict: mini gives motion energy + identity consistency that
# both wan2.6 tiers missed. Mini's 4s minimum exceeds our 2-3s slots, so we
# trim the best leading segment with ffmpeg, then extract 12fps cels.
# Travel direction is RIGHT (night outing). First frames must exist in
# assets/keyframes/. Requires ARK_API_KEY:  set -a && source ../../../.env.ark
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image: razor-clean flat color shapes, zero texture, no gradients except the sky, deep-indigo summer-night palette with cool blue-silver moonlight, no new elements, no glowing dots, no camera movement."

i2v() { # name slot_seconds firstframe prompt
  local name="$1" dur="$2" frame="$3" prompt="$4"
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== i2v $name (slot ${dur}s, gen 4s)"
  "$PY" "$GEN" --model doubao-seedance-2-0-mini-260615 --out "$A/i2v/$name.full.mp4" \
    --first-frame "$frame" --prompt "$prompt $STYLE" --duration 4 \
    --resolution 720p --ratio adaptive \
    > "tmp/i2v_$name.log" 2>&1
  if [ ! -s "$A/i2v/$name.full.mp4" ]; then echo "== FAILED $name (see tmp/i2v_$name.log)"; return 1; fi
  # Trim to the slot length (leading segment holds the cleanest motion) and
  # extract 12fps cels from the trimmed clip.
  ffmpeg -y -i "$A/i2v/$name.full.mp4" -t "$dur" -c:v libx264 -pix_fmt yuv420p \
    -an "$A/i2v/$name.mp4" >> "tmp/i2v_$name.log" 2>&1
  mkdir -p "$A/i2v/$name"
  ffmpeg -y -i "$A/i2v/$name.mp4" -vf fps=12 "$A/i2v/$name/f_%04d.png" \
    >> "tmp/i2v_$name.log" 2>&1
  local n
  n=$(ls "$A/i2v/$name"/f_*.png 2>/dev/null | wc -l)
  echo "== ok $name (${n} cels)"
}

i2v cat_wall_walk_night 2 "$K/frame_wall_01.png" "The orange tabby cat walks lightly toward the RIGHT along the flat top edge of the white perimeter wall, tail swaying gently, one paw in front of the other; sparse warm window lights and the night lane below stay calm. The camera is completely fixed; the background scrolls slowly left as the cat advances."

i2v girl_bridge_walk_night 3 "$K/frame_bridge_02.png" "The girl walks steadily toward the RIGHT side of the frame across the small stone bridge at night, her long deep-blue hair and navy pleated skirt lifted gently by the night wind, cool moonlight rim on her hair. The camera is completely fixed; the background scrolls slowly left as she advances."

i2v cat_run_bank_night 3 "$K/frame_run_03.png" "The orange tabby cat runs lightly toward the RIGHT side of the frame down the grassy riverbank slope at night, quick small bounding steps, tail held high and straight, ears up; its soft moon shadow slides along the grass. The camera is completely fixed; the background stays still as the cat crosses the frame."

i2v girl_bank_walk_night 2 "$K/frame_bank_04.png" "The girl walks steadily toward the RIGHT side of the frame down the grassy riverbank slope at night, arms relaxed, her soft moon shadow trailing behind her, cool blue-silver rim light on her hair. The camera is completely fixed; the background scrolls slowly left as she advances."

echo "== i2v all done"
