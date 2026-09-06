#!/bin/bash
# E06-live omni bases (8): frontal close-ups for OmniHuman, morning riverbank.
# Codex imagegen only. Idempotent. Requires gen_refs.sh done.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/assets"
R="$A/refs"
K="$A/frames"
mkdir -p "$K" tmp
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

STYLE="Style lock: Photorealistic live-action look, bright fresh morning riverbank light, naturalistic color, real-photography depth of field, no text, no watermark, no logo."
GIRL="The girl: slim 16-year-old, long straight deep blue-black hair to her waist, white short-sleeve school shirt, navy plaid pleated skirt."
BOY="The boy: slim 17-year-old, short black hair with slightly messy fringe, white T-shirt."
FACE="Framing: head-and-shoulders frontal close-up, her/his face VERY LARGE -- at least one third of the frame height, hands NOT visible in frame, morning riverbank (green grass, calm river, big tree) soft-focus behind."
AVOID="Avoid: extra people or animals, duplicate limbs, malformed hands, distorted facial anatomy, asymmetric eyes, blurry teeth, illustration, anime, 3D render, text, watermark, logo."

gen() { # path prompt refs...
  local out="$1" prompt="$2"; shift 2
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  codex exec "$prompt $STYLE $AVOID Save the final PNG to $out" $FLAGS "$@" > "tmp/base_$(basename "$out" .png).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; normalize_img "$out"; else echo "== MISSING $out"; fi
}

# Boy bases (3)
gen "$K/omni_boy_01.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME boy as the reference image (same face, same white T-shirt): $BOY He sits on the morning riverbank stone steps, facing the camera, looking slightly downward to frame RIGHT (as if looking at a cat below), bright warm focused expression with a light smile. $FACE" \
  -i "$R/boy_live_reference.png"

gen "$K/omni_boy_09.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME boy as the reference image: $BOY He faces the camera, a helpless but affectionate small smile, eyebrows slightly raised, relaxed, looking toward frame RIGHT. $FACE" \
  -i "$R/boy_live_reference.png"

gen "$K/omni_boy_12.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME boy as the reference image: $BOY He faces the camera, gentle calm warm expression, eyes soft, looking toward frame RIGHT. $FACE" \
  -i "$R/boy_live_reference.png"

# Girl bases (5)
gen "$K/omni_girl_04.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME girl as the reference image (same face, same long deep blue-black hair, same school shirt): $GIRL She crouches on the morning riverbank, facing the camera, looking slightly downward to frame LEFT (as if looking at a cat below), gentle coaxing smile. $FACE" \
  -i "$R/girl_morning_reference.png"

gen "$K/omni_girl_06.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME girl as the reference image: $GIRL She faces the camera, gaze lifted toward the UPPER RIGHT of the frame (watching something flying), lightly worried cute expression, lips softly parted. $FACE" \
  -i "$R/girl_morning_reference.png"

gen "$K/omni_girl_08.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME girl as the reference image: $GIRL She faces the camera, surprised and amused at once -- eyes wide, eyebrows up, an open smile of astonished laughter, looking toward frame RIGHT. $FACE" \
  -i "$R/girl_morning_reference.png"

gen "$K/omni_girl_11.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME girl as the reference image: $GIRL She sits on the morning riverbank steps, facing the camera, relaxed happy gentle smile, looking toward frame RIGHT. $FACE" \
  -i "$R/girl_morning_reference.png"

gen "$K/omni_girl_17.png" "Use case: lip-sync base portrait, frontal close-up, EDIT of the reference photo. The SAME girl as the reference image: $GIRL She faces the camera, looking slightly downward (as if looking at a sketchbook held below the frame), deeply moved soft expression, eyes gentle and slightly glossy, faint touched smile. $FACE" \
  -i "$R/girl_morning_reference.png"

echo "== omni bases done"
