#!/bin/bash
# E08 static keyframes: frame_00 (scene copy) .. frame_page_drift.
# Codex imagegen only -- no paid generation. LOCK + DENSITY everywhere.
# Idempotent: existing non-empty PNGs are skipped. Order matters:
# frame_04b/13b edit their A variants; *_mid blend the A/B pairs.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page"
mkdir -p assets/keyframes tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the shot has THREE depth layers -- a foreground framing element (hanging willow branches or grass blades as large flat darker shapes), the midground subject, and a layered background (river, distant bank, sky). Never place the subject against a flat empty background. Under willow shade, dappled sunlight spots are flat gold (#F5B942) shapes."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers, a kraft-paper-cover sketchbook under one arm."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."

SKETCHBOOK="The sketchbook: kraft-paper cover spiral sketchbook. The loose page: a pencil sketch of the riverbank scenery -- monochrome pencil linework only, no color, gentle confident strokes."
F01="In the bottom-right corner of the sketch page, a small intricate gear-like pattern -- between a frost flower and a circuit trace, fine precise pencil lines, visibly more mechanical and regular than the freehand sketch around it. Beautiful, symmetrical, quietly strange, occupying about one twelfth of the page."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/e08_$name.log"
  codex exec "$prompt $LOCK $DENSITY $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then
    echo "== ok $name"
    normalize_img "$K/$name.png"
  else
    echo "== MISSING $name (see $log)"
  fi
}

# 0. frame_00: scene master copy, normalized (I2V env_open first frame)
if [ -s "$K/frame_00.png" ]; then
  echo "== skip frame_00 (exists)"
else
  echo "== copy frame_00 from scene_riverbank_day"
  cp "$A/scene_riverbank_day.png" "$K/frame_00.png"
  normalize_img "$K/frame_00.png"
fi

# 1. frame_01: wide reveal -- boy sketching, cat asleep, girl approaching
gen frame_01 "Use case: keyframe, wide reveal. Afternoon riverbank under the big tree: $BOY He sits on the grassy bank near the water, sketchbook open on his lap, head bent down, pencil in hand sketching. $CAT The cat is curled up asleep on the grass beside him. $GIRL She walks in from a small path at frame LEFT, full body, mid-stride a few steps away from the boy, relaxed and curious. Composition: 16:9 landscape, three depth layers -- foreground grass blades and dandelions, midground group under the tree, background river, distant bridge and sky." \
  -i "$A/boy_reference.png" -i "$A/cat_reference.png" -i "$A/girl_reference.png" -i "$A/scene_riverbank_day.png"

# 2. frame_04a/b: A/B wide variant (tree crown sway + light spots)
gen frame_04a "Use case: keyframe, tree-sway A/B variant A. Wide shot of the riverbank: $BOY He sits on the grass sketching, sketchbook on his lap, pencil in hand. $GIRL She sits beside him on the grass, looking out at the river. $CAT The cat sleeps curled up on the grass between the two of them. The big tree crowns above them hang still; dappled gold light spots rest on the grass. Composition: 16:9 landscape, group on the right third under the tree, river and sky fill the rest, identical framing to a following variant -- keep every outline in exactly fixed positions." \
  -i "$K/frame_01.png" -i "$A/scene_riverbank_day.png"

gen frame_04b "Use case: tree-sway A/B variant B, EDIT of the reference image. Change ONLY the tree crown positions (swaying gently to the RIGHT) and the dappled light spot positions (shifted slightly), keep everything else pixel-identical." \
  -i "$K/frame_04a.png"

# 3. frame_04ab_mid: halfway blend of 04a and 04b
gen frame_04ab_mid "Use case: A/B midpoint keyframe, dual-image EDIT. Image 1 and image 2 are two variants of the same wide riverbank shot differing only in tree crown positions and dappled light spot positions. Generate an image halfway between image 1 and image 2: tree crowns and light spots at intermediate positions between the two, everything else identical to both inputs." \
  -i "$K/frame_04a.png" -i "$K/frame_04b.png"

# 4. frame_08: boy medium shot, gentle stopping gesture
gen frame_08 "Use case: keyframe. Medium shot of the boy's upper body on the riverbank: $BOY His body faces frame RIGHT (toward the river), sketchbook resting on his lap. One hand is slightly raised, palm facing down -- a gentle calm 'wait, don't chase' gesture. Expression: eyebrows relaxed and level, eyes calm and steady, mouth in a quiet neutral line -- peaceful and settled, no worry. Composition: 16:9 landscape, boy on the left half, sunlit river and dappled grass to the right." \
  -i "$A/boy_reference.png" -i "$K/frame_01.png"

# 5. frame_13a/b: A/B time-pass variant (over-shoulder sketchbook)
gen frame_13a "Use case: keyframe, light-drift A/B variant A. Over-the-shoulder view looking down at the sketchbook on the boy's lap: $SKETCHBOOK One hand holding a pencil draws at the edge of the page (the hand occupies only a small part of the frame; the open sketchbook page is the main subject). Around the page, afternoon grass with scattered flat gold dappled light spots. Composition: 16:9 landscape, sketchbook large in the center, identical framing to a following variant -- keep every outline in exactly fixed positions." \
  -i "$K/frame_01.png" -i "$A/boy_reference.png"

gen frame_13b "Use case: light-drift A/B variant B, EDIT of the reference image. Change ONLY the dappled light spot and shadow positions on the ground (shifted, as if time passed), keep everything else pixel-identical." \
  -i "$K/frame_13a.png"

# 6. frame_13ab_mid: halfway blend of 13a and 13b
gen frame_13ab_mid "Use case: A/B midpoint keyframe, dual-image EDIT. Image 1 and image 2 are two variants of the same over-the-shoulder sketchbook shot differing only in dappled light spot and shadow positions on the ground. Generate an image halfway between image 1 and image 2: light spots and shadows at intermediate positions between the two, everything else identical to both inputs." \
  -i "$K/frame_13a.png" -i "$K/frame_13b.png"

# 7. frame_16: F01 foreshadow -- the most important frame of the episode
gen frame_16 "Use case: keyframe, FORESHADOW beat (deliberately held, no camera move). Top-down close-up: an open sketchbook lying on the afternoon grass, the open page showing a pencil sketch of the riverbank scenery -- monochrome pencil linework only, no color, gentle confident strokes. $F01 No people, no cat, no hands in frame. Composition: 16:9 landscape, the open sketchbook fills most of the frame, a rim of sunlit grass with dappled gold light spots around the edges." \
  -i "$K/frame_13a.png" -i "$A/scene_riverbank_day.png"

# 8. frame_18: ending wide shot
gen frame_18 "Use case: keyframe (ending pull-out). Wide distant shot of the riverbank in the same afternoon light: $BOY $GIRL $CAT The boy, the girl and the cat sit side by side on the grassy bank looking out at the river, seen mostly from behind or in profile, small in the frame. Composition: 16:9 landscape, open and spacious -- the wide river with gold light sparkles and the big sky occupy most of the frame, the trio small on the lower third under the tree." \
  -i "$A/boy_reference.png" -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$A/scene_riverbank_day.png"

# 9. frame_page_lift: I2V first frame (page lifted by wind)
# NOTE: do NOT pass frame_16 as a reference here -- the F01 corner symbol
# must not appear before shot 16 (first-roll bug: the symbol leaked in).
gen frame_page_lift "Use case: I2V first frame, the quietest beat. Close-up: an open sketchbook lying on the afternoon riverbank grass; one loose page is lifted halfway up by the wind, its page corner curled and rising. $SKETCHBOOK Both visible pages contain ONLY the plain pencil riverbank sketch and blank paper -- no decorative patterns, no symbols, no ornaments anywhere on the pages. No people, no cat, no hands in frame. Composition: 16:9 landscape, sketchbook center-frame on the grass, dappled gold light spots around, river glinting soft in the far background." \
  -i "$A/scene_riverbank_day.png" -i "$K/frame_13a.png"

# 10. frame_page_drift: I2V first frame (page drifting on the river)
gen frame_page_drift "Use case: I2V first frame, negative-space beat. Slightly high-angle view: a single white loose sketch page floats on the river surface scattered with flat gold dappled sunlight sparkles, drifting gently with the ripples. $SKETCHBOOK No people, no cat in frame. Composition: 16:9 landscape, the small page off-center, the wide glittering water fills the frame, a sliver of grassy bank at the top edge." \
  -i "$A/scene_riverbank_day.png" -i "$K/frame_16.png"

echo "== e08 frames done"
