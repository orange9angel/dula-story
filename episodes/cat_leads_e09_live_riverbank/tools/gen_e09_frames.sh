#!/bin/bash
# E09 live-action experiment: live_reference master + 5 I2V first frames.
# Codex imagegen only -- no paid generation. LIVE LOCK everywhere.
# Idempotent: existing non-empty PNGs are skipped.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank"
mkdir -p assets/frames tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/assets"
K="$A/frames"
REF="$A/live_reference.png"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: Photorealistic live-action look, cinematic golden-hour dusk on a quiet riverbank: golden sparkling water, warm rim light, soft blue-violet shadows, gentle breeze in the grass. Naturalistic color, shallow cinematic contrast, real-photography depth of field, no text, no watermark, no logo."

GIRL="The girl: slim 16-year-old seen ONLY from behind or the side, long straight deep blue-black hair to her waist, white short-sleeve school shirt, navy plaid pleated skirt, black knee socks, black loafers."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws."
AVOID="Never show the girl's face directly (back view, side profile only, or distant silhouette). Avoid: extra people or cats, duplicate limbs, malformed hands, distorted anatomy, illustration style, anime, 3D render, text, captions, watermark, logo."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/e09_$name.log"
  codex exec "$prompt $LOCK $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then
    echo "== ok $name"
    normalize_img "$K/$name.png"
  else
    echo "== MISSING $name (see $log)"
  fi
}

# 0. live_reference: master live-action reference photo
if [ -s "$REF" ]; then
  echo "== skip live_reference (exists)"
else
  echo "== gen live_reference"
  codex exec "Use case: master character/scene reference photo, photorealistic. Wide establishing shot at golden-hour dusk on a quiet riverbank: $GIRL She sits on the grassy bank seen from behind, and beside her $CAT sits looking out at the river. Both are small-medium in frame, backs to the camera, warm rim light outlining her long hair and the cat's fur; golden sparkling water ahead, a distant bridge silhouette, tall grass swaying. Composition: 16:9 landscape, the pair on the lower third, the glittering river and dusk sky filling the frame. $LOCK $AVOID Save the final PNG to $REF" $FLAGS > "tmp/e09_live_reference.log" 2>&1
  if [ -s "$REF" ]; then
    echo "== ok live_reference"
    normalize_img "$REF"
  else
    echo "== MISSING live_reference (see tmp/e09_live_reference.log)"
  fi
fi

# 1. seg1_first: empty riverbank establishing (no people, no cat)
gen seg1_first "Use case: I2V first frame, EDIT of the reference photo. Keep the exact same riverbank, dusk light, golden sparkling water, distant bridge and tall grass as the reference image, but REMOVE the girl and the cat completely -- a pure empty establishing shot of the golden-hour riverbank: golden light on calm water, soft grass waves, distant bridge silhouette, warm gold tones with blue-violet shadows. Composition: 16:9 landscape, wide and quiet." \
  -i "$REF"

# 2. seg2_first: tracking back view -- girl walking behind the cat on the path
gen seg2_first "Use case: I2V first frame, EDIT of the reference photo. Same riverbank, same dusk light and color as the reference image. Tracking back-view shot on the narrow grass path along the riverbank: $GIRL She walks on the path seen from directly behind, mid-step, relaxed. A few steps ahead of her $CAT walks away from the camera leading the way, tail up. Composition: 16:9 landscape, camera behind the girl at shoulder height, the path leading toward the glittering river and distant bridge, golden rim light on her long hair." \
  -i "$REF"

# 3. seg3_first: side medium -- cat sitting looking back at river, girl stopped one step behind
gen seg3_first "Use case: I2V first frame, EDIT of the reference photo. Same riverbank, same dusk light and color as the reference image. Side-view medium shot: $CAT It sits on the grass path in profile, head turned toward the river. One step behind the cat $GIRL stands still, seen from the side only, looking down at the cat, relaxed. Composition: 16:9 landscape, cat in the lower center in profile, girl's side silhouette behind it, golden sparkling river in the background." \
  -i "$REF"

# 4. seg4_first: river gold-sparkle close-up, cat silhouette in foreground
gen seg4_first "Use case: I2V first frame, EDIT of the reference photo. Same riverbank, same dusk light and color as the reference image. Close shot of the river surface covered in broken golden light sparkles at dusk; in the foreground at the bottom edge of the frame $CAT sits on the near bank as a small warm dark back-view silhouette, out-of-focus foreground. Composition: 16:9 landscape, the glittering gold water fills most of the frame, shallow depth of field, the cat silhouette sharp-ish in the lower foreground corner. No girl in this shot." \
  -i "$REF"

# 5. seg5_first: extreme wide -- pair sitting side by side, dusk silhouette
gen seg5_first "Use case: I2V first frame, EDIT of the reference photo. Same riverbank, same dusk light and color as the reference image. Extreme wide shot: $GIRL and beside her $CAT sit side by side on the riverbank edge looking out at the river, both seen from behind as small dusk silhouettes with warm golden rim light, tiny in the vast frame of glittering river and dusk sky. Composition: 16:9 landscape, the pair very small on the lower third, golden sparkling water and soft blue-violet dusk sky dominate." \
  -i "$REF"

echo "== e09 frames done"
