#!/bin/bash
# E05 I2V clips: 3 continuous-action shots via 火山方舟 Seedance 2.0 FULL
# (doubao-seedance-2-0-260128, 1080p -- upgraded from E04's mini/720p so the
# video cels match the 1672x941 keyframes instead of being upscaled 1.5x).
# Prompts carry the E05 cloth/secondary-motion vocabulary (L1 morning
# breeze; see dula-skills/build-continuous-story-images/references/
# i2v-motion-details.md). Travel direction: RIGHT. Breeze direction:
# from frame LEFT (at their backs). First frames must exist in
# assets/keyframes/. Requires ARK_API_KEY:  set -a && source ../../../.env.ark
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image: razor-clean flat color shapes, zero texture, no gradients except the sky, fresh morning palette of cyan blue and peach gold with warm gold rim light and lavender shadows, no new elements, no camera movement beyond what is stated."

i2v() { # name slot_seconds firstframe prompt
  local name="$1" dur="$2" frame="$3" prompt="$4"
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== i2v $name (slot ${dur}s, gen 4s @1080p)"
  "$PY" "$GEN" --model doubao-seedance-2-0-260128 --out "$A/i2v/$name.full.mp4" \
    --first-frame "$frame" --prompt "$prompt $STYLE" --duration 4 \
    --resolution 1080p --ratio adaptive \
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

i2v cat_lane_lead_morning 2 "$K/frame_lane_01.png" "The orange tabby cat walks lightly toward the RIGHT down the morning lane, leading the way, one paw in front of the other; its tail sways gently with a slow S-curve, the tip leading the motion, and the fur at its cheeks and tail base ruffles faintly in a light breeze blowing from the LEFT. White walls and morning sky stay calm. The camera is completely fixed; the background scrolls slowly left as the cat advances. Character count, poses and framing stay exactly as in the first frame."

i2v girl_bridge_walk_morning 3 "$K/frame_bridge_02.png" "The girl walks steadily toward the RIGHT across the small stone bridge in the golden morning light. A light breeze blows from the LEFT at her back: the tips of her long deep-blue hair sway and lag slightly behind her steps, and the pleats of her navy skirt ripple gently from the hem, lifting and settling softly around her legs without overlapping them; the grass tips on the far bank tremble in a slow wave from left to right with a slight phase offset between tufts. Warm gold rim light on her hair. The camera is completely fixed; the background scrolls slowly left as she advances. Character count, poses and framing stay exactly as in the first frame."

i2v cat_run_bank_morning 2 "$K/frame_run_03.png" "The orange tabby cat runs lightly toward the RIGHT down the grassy riverbank slope in the morning light, quick small bounding steps, tail held high with a gentle sway, ears up; the flat white dew sparkle shapes on the grass tips twinkle faintly and the grass trembles in a slow wave from left to right; its long soft lavender shadow slides along the grass beside it. The camera is completely fixed; the background stays still as the cat crosses the frame. Character count, poses and framing stay exactly as in the first frame."

echo "== i2v all done"
