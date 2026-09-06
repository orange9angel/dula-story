#!/bin/bash
# E06-live I2V first frames (11). Codex imagegen only. Idempotent.
# Requires gen_refs.sh done. Single-reference derivation discipline.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/assets"
R="$A/refs"
K="$A/frames"
mkdir -p "$K" tmp
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

STYLE="Style lock: Photorealistic live-action look, bright fresh MORNING riverbank light (clear soft sunlight, vivid green grass, calm river, big leafy tree, stone steps), naturalistic color, real-photography depth of field, no text, no watermark, no logo."
BOY="The boy: slim 17-year-old, short black hair with slightly messy fringe, white T-shirt, navy-blue trousers, white sneakers, with a kraft-paper-cover spiral sketchbook."
GIRL="The girl: slim 16-year-old, long straight deep blue-black hair to her waist, white short-sleeve school shirt, navy plaid pleated skirt, black knee socks, black loafers."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes."
AVOID="Avoid: extra people or animals, duplicate limbs, malformed hands, distorted anatomy, illustration, anime, 3D render, text, watermark, logo."

gen() { # path prompt refs...
  local out="$1" prompt="$2"; shift 2
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  codex exec "$prompt $STYLE $AVOID Save the final PNG to $out" $FLAGS "$@" > "tmp/frame_$(basename "$out" .png).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; normalize_img "$out"; else echo "== MISSING $out"; fi
}

# #00 establishing: empty morning riverbank
gen "$K/f00_est.png" "Use case: I2V first frame, EDIT of the reference image. The exact same empty morning riverbank as the reference image -- grass slope, stone steps under the big tree, calm river, blue sky. No people, no animals. Composition: 16:9 landscape, identical framing to the reference." \
  -i "$R/scene_morning_ref.png"

# #02 cat posing on the steps, close-up
gen "$K/f02_cat_pose.png" "Use case: I2V first frame, EDIT of the reference image. The same orange tabby cat sitting upright on the same morning stone steps, chin slightly raised, posing proudly like a model, ears perked, tail curled around its white paws. Composition: 16:9 landscape, medium close-up -- the cat fills the center half of the frame, tree shade and grass soft-focus around." \
  -i "$R/cat_pose_ref.png"

# #05 cat close-up tracking a butterfly (upper right)
gen "$K/f05_cat_butterfly.png" "Use case: I2V first frame, EDIT of the reference image. The same orange tabby cat on the same morning stone steps, close-up of head and chest, its eyes turned up toward the UPPER RIGHT corner of the frame where a single small pale-yellow butterfly flutters; the cat's body still in posing posture. Composition: 16:9 landscape, cat's head in the lower-left half, butterfly small in the upper-right, grass and river soft-focus behind." \
  -i "$R/cat_pose_ref.png"

# #07 cat leaping off the steps, heading right
gen "$K/f07_cat_run.png" "Use case: I2V first frame, EDIT of the reference image. The same morning riverbank stone steps and grass. The same orange tabby cat in full body, mid-leap jumping off the stone steps down onto the grass, body stretched, heading toward frame RIGHT, all four paws off the step edge. Composition: 16:9 landscape, steps on the left, open sunlit grass on the right, dynamic but clear." \
  -i "$R/scene_morning_ref.png" -i "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tmp/cat_face.png"

# #10 low-angle grass: cat pouncing at a butterfly
gen "$K/f10_cat_pounce.png" "Use case: I2V first frame, EDIT of the reference image. Very low camera angle inside the morning grass: the same orange tabby cat mid-pounce, front paws reaching up toward a small pale-yellow butterfly flying just above its head, body off the ground, grass blades large in the foreground, river sparkling soft-focus in the background. Composition: 16:9 landscape, playful and dynamic." \
  -i "$R/scene_morning_ref.png" -i "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tmp/cat_face.png"

# #13 cat walking back toward the tree shade
gen "$K/f13_cat_return.png" "Use case: I2V first frame, EDIT of the reference image. The same orange tabby cat walking unhurriedly on the morning grass toward the big tree's shade, side-back three-quarter view, tail relaxed, full body visible, the stone steps and river behind. Composition: 16:9 landscape, cat in the middle ground center, tree shade ahead of it." \
  -i "$R/scene_morning_ref.png" -i "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tmp/cat_face.png"

# #14 cat sleeping under the tree shade
gen "$K/f14_cat_sleep.png" "Use case: I2V first frame, EDIT of the reference image. The same orange tabby cat curled up asleep on the grass under the big tree's shade, eyes closed, tail wrapped around its body, soft dappled morning light spots on its fur. Composition: 16:9 landscape, medium shot -- cat in the lower center, tree trunk and sunlit grass around." \
  -i "$R/cat_sleep_ref.png"

# #15 boy from behind, over-shoulder sketching (hands small)
gen "$K/f15_boy_sketch.png" "Use case: I2V first frame, EDIT of the reference images. Over-the-shoulder BACK view of the same boy (white T-shirt, short black hair) sitting on the morning riverbank steps, head bent down, sketching in the kraft-paper sketchbook on his lap; his hands are SMALL in frame (over-shoulder framing crops at his shoulders); ahead of him under the tree shade the orange tabby cat sleeps curled on the grass. Composition: 16:9 landscape, boy's back and the back of his head occupy the left third, the sleeping cat visible in the middle distance right." \
  -i "$R/boy_live_reference.png" -i "$R/cat_sleep_ref.png"

# #16 sketchbook close-up: pencil sketch of the sleeping cat
gen "$K/f16_sketchbook.png" "Use case: I2V first frame, the reveal. Close-up of an open kraft-paper spiral sketchbook lying on morning grass: the open page shows a pencil sketch of a curled-up sleeping cat -- monochrome pencil linework only, gentle confident strokes, no color. A rim of sunlit grass with soft dappled light around the sketchbook edges. No people, no hands, no real cat in frame. Composition: 16:9 landscape, the open sketchbook fills most of the frame." \
  -i "$R/cat_sleep_ref.png"

# #18 cat sleeping face close-up
gen "$K/f18_cat_sleep_close.png" "Use case: I2V first frame, EDIT of the reference image. Close-up of the same sleeping orange tabby cat's face under the tree shade: eyes fully closed, relaxed, whiskers still, white chest fur visible, soft dappled morning light on its fur. Composition: 16:9 landscape, the cat's sleeping face fills the center of the frame, shaded grass soft-focus around." \
  -i "$R/cat_sleep_ref.png"

# #19 wide: two people + sleeping cat under the tree
gen "$K/f19_wide.png" "Use case: I2V first frame, EDIT of the reference images. Wide shot of the morning riverbank under the big tree: $BOY and $GIRL sit side by side on the stone steps in light tree shade, relaxed, seen from a side-back three-quarter angle; the orange tabby cat sleeps curled on the grass nearby; dappled morning light spots sway on the grass, calm river sparkling behind. Composition: 16:9 landscape, spacious -- tree, steps with the pair, sleeping cat, river and sky." \
  -i "$R/boy_live_reference.png" -i "$R/girl_morning_reference.png" -i "$R/cat_sleep_ref.png"

echo "== frames done"
