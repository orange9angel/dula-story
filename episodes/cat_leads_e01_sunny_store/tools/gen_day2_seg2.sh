#!/bin/bash
# Day 2: seg2 keyframes frame_13..frame_25 + ib_03/ib_04 (30-60s).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
K="$A/keyframes"
IB="$A/action_inbetweens"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- bright sunny-day
scene rendered as razor-clean flat color shapes, like a high-definition retro
silkscreen poster with zero texture. Sky: deep clear cyan blue (#2E9BD6) at
the top softening into light aqua (#7FD4E8) near the horizon through ONE wide
soft smooth transition band -- no steps, no stripes; this sky transition is
the only soft gradient allowed in the entire image. Clouds: hard-edged rounded
bubble shapes, pure white (#FDFBF4) with a single flat lavender shadow tone
(#8E7CC3). Shadows everywhere use complementary colors (lavender, teal-green),
never black or grey. Sunlight is rendered as flat geometric shapes (diagonal
light bands, round dappled light spots) in flat gold (#F5B942), never glow,
never haze. Characters in crisp cel-style flat color with one shadow layer;
outlines warm brown on the lit side, muted purple on the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone,
airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue
hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue
plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white
paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, text,
watermark, photorealism, 3D render."

gen() { # name outdir prompt refs...
  local name="$1" outdir="$2" prompt="$3"; shift 3
  echo "== gen $name"
  local log="tmp/seg2_$name.log"
  codex exec "$prompt $LOCK $AVOID 并把成品 PNG 保存到 $outdir/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_13 "$K" "Use case: keyframe. Wide interior view of the same sunny
convenience store as the reference: bright shelves stocked with colorful
goods, the hot oden counter near the register (do NOT draw any steam), the
glass automatic door with sunlight outside. No people, no animals.
Composition: 16:9 landscape." -i "$A/scene_store.png" -i "$K/frame_12.png"

gen frame_14 "$K" "Use case: keyframe. Close-up of the oden counter in the same
store: metal tray with simmering oden (eggs, daikon, skewers, tofu pouches),
gently rippling broth surface, do NOT draw any steam. Composition: 16:9
landscape." -i "$K/frame_13.png"

gen frame_15 "$K" "Use case: keyframe. Inside the same store, medium shot: the
girl crouching down looking at the cat sitting by her feet, gentle curious
expression, mouth closed, face clearly visible with no hair covering the
mouth. $GIRL $CAT Composition: 16:9 landscape, bright shelves behind." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_13.png"

gen frame_16 "$K" "Use case: keyframe. Close-up of the cat inside the store
looking up, ears up, attentive expression, mouth closed. $CAT Composition:
16:9 landscape." -i "$A/cat_reference.png" -i "$K/frame_15.png"

gen frame_17 "$K" "Use case: keyframe. Inside the same store, medium shot: the
girl standing at a hot drinks cabinet taking a bottle of warm milk, reaching
pose. $GIRL Composition: 16:9 landscape." \
  -i "$A/girl_reference.png" -i "$K/frame_13.png"

gen ib_03 "$IB" "Use case: action in-between. Inside the same store: the girl's
arm mid-reach toward the milk bottle on the shelf, a transitional reaching
pose between standing still and holding the bottle. $GIRL Composition: 16:9
landscape, same framing as the reference." -i "$K/frame_17.png"

gen frame_18 "$K" "Use case: keyframe. Close-up at the register counter of the
same store: a bottle of warm milk and a few coins on the counter, diagonal
flat gold sunlight band from the window across the counter. No people visible
(hands optional but no faces). Composition: 16:9 landscape." -i "$K/frame_17.png"

gen frame_19 "$K" "Use case: keyframe. Wide shot inside the same store: the
girl sitting on a bench by the front window holding the milk bottle, the cat
curling up on the bench beside her, sunlight streaming in. $GIRL $CAT
Composition: 16:9 landscape." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_13.png"

gen ib_04 "$IB" "Use case: action in-between. The girl mid-motion lowering
herself onto the bench by the store window, transitional sitting pose, milk
bottle in hand. $GIRL Composition: 16:9 landscape, same framing as the
reference." -i "$K/frame_19.png"

gen frame_20 "$K" "Use case: keyframe. Close-up of the girl sitting by the
store window, holding the warm milk bottle with both hands near her chest,
gentle content expression, eyes open, mouth closed, face clearly visible.
$GIRL Composition: 16:9 landscape, warm sunlight on her face." \
  -i "$A/girl_reference.png" -i "$K/frame_19.png"

gen frame_21 "$K" "Use case: keyframe. Close-up of the cat curled up asleep by
the girl's feet on the bench, eyes closed, peaceful. $CAT Composition: 16:9
landscape, warm sunlight." -i "$A/cat_reference.png" -i "$K/frame_19.png"

gen frame_22 "$K" "Use case: keyframe. Close-up of the girl smiling softly,
looking down toward the cat, mouth closed, face clearly visible with no hair
covering the mouth; the sunlight slightly warmer and more golden than before
(late-afternoon tone). $GIRL Composition: 16:9 landscape." \
  -i "$A/girl_reference.png" -i "$K/frame_20.png"

gen frame_23 "$K" "Use case: keyframe. Wide shot from inside the store behind
the bench: the girl and the curled-up cat seen from behind, silhouetted
gently against the bright front window, the sunny street outside. $GIRL $CAT
Composition: 16:9 landscape, late-afternoon warm light." \
  -i "$K/frame_19.png" -i "$K/frame_22.png"

gen frame_24 "$K" "Use case: keyframe. Exterior wide shot of the same
convenience store in warm late-afternoon light: the facade glowing softly
gold, two small silhouettes (girl and cat) visible through the front window.
No people outside. Composition: 16:9 landscape." \
  -i "$K/frame_09.png" -i "$K/frame_23.png"

gen frame_25 "$K" "Use case: closing shot. Low-angle view of the sky above the
store's roofline: big bubble clouds in a warm late-afternoon sky (still the
same cyan-to-aqua band, clouds tinted slightly gold), roofline and a utility
pole at the bottom. No people, no animals. Composition: 16:9 landscape." \
  -i "$K/frame_24.png"

echo "== seg2 done"
