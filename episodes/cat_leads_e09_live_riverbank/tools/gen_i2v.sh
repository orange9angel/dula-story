#!/bin/bash
# E09 live-action I2V: FIVE segments, 4s each, 720p (Seedance 2.0 FULL).
# Live-action people = high distortion risk: motion kept minimal,
# fixed camera, consistent lighting. Idempotent: skip existing non-empty mp4.
# Requires ARK_API_KEY:  set -a && source ../../.env.ark
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/assets"
K="$A/frames"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Photorealistic live-action look, keep the exact characters, clothing, cat markings, lighting and color grading of the first frame. Subtle slow motion, fixed camera, consistent lighting, natural gentle movement only, no camera movement, no new elements, no text, no watermark."

i2v() { # name firstframe prompt
  local name="$1" frame="$2" prompt="$3"
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== i2v $name (4s @${I2V_RES})"
  "$PY" "$GEN" --model doubao-seedance-2-0-260128 --out "$A/i2v/$name.mp4" \
    --first-frame "$frame" --prompt "$prompt $STYLE" --duration 4 \
    --resolution "$I2V_RES" --ratio adaptive \
    > "tmp/i2v_$name.log" 2>&1
  if [ ! -s "$A/i2v/$name.mp4" ]; then echo "== FAILED $name (see tmp/i2v_$name.log)"; return 1; fi
  ffmpeg -loglevel error -y -i "$A/i2v/$name.mp4" -vf "select=eq(n\,0)" -vframes 1 "$A/i2v/${name}_first.png"
  ffmpeg -loglevel error -y -sseof -0.1 -i "$A/i2v/$name.mp4" -vframes 1 "$A/i2v/${name}_last.png"
  echo "== ok $name"
}

i2v seg1 "$K/seg1_first.png" "Golden light sparkles and shimmers gently on the calm river surface; tall grass sways softly in a light evening breeze. No people, no animals. The camera is completely fixed."

i2v seg2 "$K/seg2_first.png" "The girl walks slowly and calmly along the riverbank path, seen from behind, her long hair swaying slightly in the breeze; a few steps ahead the orange cat walks unhurriedly away from the camera, tail gently raised. Slow steady walking pace, small natural steps, nothing sudden. The camera is completely fixed."

# V2 (director): seg3 is a FRONTAL medium close-up. Motion discipline:
# breeze in hair, faintest breathing, smile held -- NO head nod/turn.
i2v seg3 "$K/seg3_face_first.png" "The girl holds her gentle smile, completely still except for a few hair strands drifting softly in the light breeze and the faintest natural breathing motion; no head movement, no nodding, no turning, no blinking exaggeration. The orange cat's ears at the bottom edge twitch slightly. Golden light sparkles softly on the river behind her. The camera is completely fixed."

i2v seg4 "$K/seg4_first.png" "Broken golden light sparkles and flickers on the river surface with gentle ripples; the cat silhouette in the foreground sits almost still, only its ears and tail tip moving slightly. Very slow, calm, quiet. The camera is completely fixed."

i2v seg5 "$K/seg5_first.png" "The girl and the cat sit side by side on the riverbank, seen from behind as small dusk silhouettes, almost motionless; golden sparkles shimmer on the wide river, the dusk sky slowly deepens, grass sways faintly. Extremely calm, almost no movement. The camera is completely fixed."

echo "== i2v all done"
