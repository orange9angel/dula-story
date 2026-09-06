#!/bin/bash
# E06-live references: scene master + boy + girl(morning) + cat poses.
# Codex imagegen only. Idempotent. Phase 1: must finish before gen_e06live_frames.sh.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"
mkdir -p assets/refs tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/assets"
R="$A/refs"
E09="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/assets"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

SCENE="Scene lock: bright fresh MORNING on a quiet riverbank -- clear soft sunlight from the left, vivid green grass slope, calm river with soft glints, a big leafy tree casting light shade, wide flat stone steps on the grassy bank, blue sky with a few soft clouds, crisp transparent air."
STYLE="Style lock: Photorealistic live-action look, naturalistic color, real-photography depth of field, no text, no watermark, no logo."
GIRL="The girl: slim 16-year-old, long straight deep blue-black hair to her waist, white short-sleeve school shirt, navy plaid pleated skirt, black knee socks, black loafers."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, white T-shirt, navy-blue trousers, white sneakers, holding a kraft-paper-cover spiral sketchbook."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur."
AVOID="Avoid: extra people or animals, duplicate limbs, malformed hands, distorted anatomy, illustration, anime, 3D render, text, watermark, logo."

gen() { # path prompt refs...
  local out="$1" prompt="$2"; shift 2
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  codex exec "$prompt $STYLE $AVOID Save the final PNG to $out" $FLAGS "$@" > "tmp/ref_$(basename "$out" .png).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; normalize_img "$out"; else echo "== MISSING $out"; fi
}

# 1. scene master: empty morning riverbank
gen "$R/scene_morning_ref.png" "Use case: master scene reference photo, photorealistic. Wide establishing shot of an empty morning riverbank, no people no animals: $SCENE Composition: 16:9 landscape, three depth layers -- foreground grass blades, midground stone steps under the big tree, background river and sky."

# 2. boy reference: sitting on the steps with sketchbook
gen "$R/boy_live_reference.png" "Use case: master character reference photo, photorealistic, same morning riverbank as the reference image. $BOY He sits on the stone steps under the tree, sketchbook open on his lap, pencil in one hand, looking slightly to the side with a gentle focused expression, full body visible, three-quarter view. $SCENE Composition: 16:9 landscape, boy on the right third, river and grass to the left." \
  -i "$R/scene_morning_ref.png"

# 3. girl morning reference: derived from E09 live reference, re-lit to morning
gen "$R/girl_morning_reference.png" "Use case: character reference photo, photorealistic. The SAME girl as the second reference image (same face, same long deep blue-black hair, same white school shirt and navy plaid skirt) but now on the morning riverbank of the first reference image: $SCENE She stands on the grass near the stone steps, three-quarter view, gentle smile, morning sunlight on her hair. Composition: 16:9 landscape, girl centered, river behind." \
  -i "$R/scene_morning_ref.png" -i "$E09/live_reference.png"

# 4. cat pose reference: sitting upright on the steps
gen "$R/cat_pose_ref.png" "Use case: animal reference photo, photorealistic. The SAME orange tabby cat as the second reference image (same markings, white chest patch, green eyes) now sitting upright on the morning stone steps of the first reference image, front view, chin slightly raised, posing proudly like a model, tail curled neatly around its white paws. $SCENE Composition: 16:9 landscape, cat centered on the steps, tree shade and grass around." \
  -i "$R/scene_morning_ref.png" -i "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tmp/cat_face.png"

# 5. cat sleep reference: curled up asleep in tree shade
gen "$R/cat_sleep_ref.png" "Use case: animal reference photo, photorealistic. The SAME orange tabby cat as the second reference image (same markings, white chest patch) curled up asleep on the grass under the big tree's shade on the morning riverbank of the first reference image, eyes closed, tail wrapped around its body, soft dappled morning light spots on its fur. $SCENE Composition: 16:9 landscape, cat in the lower center, tree shade and sunlit grass around." \
  -i "$R/scene_morning_ref.png" -i "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tmp/cat_face.png"

echo "== refs done"
