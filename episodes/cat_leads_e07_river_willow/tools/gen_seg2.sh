#!/bin/bash
# E07 seg2 keyframes: fishing chat -> mystery -> finale block --
# frame_14a/b (willow sway A/B) .. frame_24a/b (light-spot drift A/B).
# Codex imagegen; seg1 frames first. LOCK + DENSITY everywhere. Idempotent.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow"
mkdir -p assets/keyframes tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the shot has THREE depth layers -- a foreground framing element (hanging willow branches or grass blades as large flat darker shapes), the midground subject, and a layered background (river, distant bank, sky). Never place the subject against a flat empty background. Under willow shade, dappled sunlight spots are flat gold (#F5B942) shapes."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers, a kraft-paper-cover sketchbook under one arm."
OLDMAN="The old man: slim 68-year-old fisherman with a slight stoop, kind wrinkled face with narrow smiling eyes (wrinkles drawn with only two or three restrained lines), a worn flat-top straw hat, a khaki multi-pocket fishing vest over a white shirt with rolled sleeves, dark gray trousers, old rubber shoes."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg2_$name.log"
  codex exec "$prompt $LOCK $DENSITY $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_14a "Use case: keyframe, willow-sway A/B variant A. Wide view of the willow bank fishing spot: the old man on his stool with rod over the water, the girl and boy standing beside him, the cat sitting at the waterline; the hanging willow branches hang mostly straight down in the top curtain. Composition: 16:9 landscape, group on the right third, identical framing to a following variant -- keep every outline in exactly fixed positions." \
  -i "$K/frame_10.png"

gen frame_14b "Use case: willow-sway A/B variant B, EDIT of the reference image. Change ONLY the hanging willow branches: swayed gently toward frame RIGHT, their tips trailing rightward a few pixels. Everything else -- people, cat, stool, bucket, river, shore, sky -- stays pixel-identical to the reference image." \
  -i "$K/frame_14a.png"

gen frame_15 "Use case: keyframe (base for a lip-sync talking shot). Medium-close at the fishing spot: $BOY He crouches slightly to look at the bamboo rod resting against the stool, body facing frame LEFT. Expression: eyebrows raised with interest; eyes studying the rod, gaze left-down; mouth slightly open mid-question. Composition: 16:9 landscape, boy on the right half." \
  -i "$A/boy_reference.png" -i "$K/frame_10.png"

gen frame_16 "Use case: keyframe (base for a lip-sync talking shot). Close-up under the willow: $OLDMAN He pats the bamboo rod beside him, facing frame RIGHT (toward the boy). Expression: eyebrows raised proudly; eyes crinkled bright; mouth in an open happy smile. Composition: 16:9 landscape, old man on the left half, dappled shade behind." \
  -i "$A/oldman_reference.png" -i "$K/frame_13.png"

gen frame_18 "Use case: keyframe (base for a lip-sync talking shot). Close-up under the willow: $OLDMAN He faces the river again (frame LEFT), speaking with quiet fondness about something beautiful he has seen; expression: eyebrows relaxed and level; eyes clear, bright and steady toward the water, warm with affection; mouth in a gentle closed smile. The straw hat brim shades his eyes slightly. Composition: 16:9 landscape, old man on the right half, calm river to the left." \
  -i "$A/oldman_reference.png" -i "$K/frame_13.png"

gen frame_19 "Use case: keyframe, reaction. Medium shot: $GIRL and $BOY react with sparkling excitement to the old man's story about the light on the river. The girl's eyes are wide and bright with wonder, eyebrows raised high in delight, mouth open in a thrilled smile; the boy beside her smiles with eager curiosity, gaze lifted as if already picturing it. Both faces glow with anticipation, no worry, no suspicion. The old man is out of frame. Composition: 16:9 landscape, girl left, boy right, faces close to center." \
  -i "$A/girl_reference.png" -i "$A/boy_reference.png" -i "$K/frame_10.png"

gen frame_20 "Use case: keyframe (base for a lip-sync talking shot). Close-up: $OLDMAN He waves one hand dismissively toward frame RIGHT, chuckling. Expression: eyebrows relaxed; eyes crinkled into a self-deprecating smile; mouth open in a soft laugh. Composition: 16:9 landscape, old man on the left half." \
  -i "$A/oldman_reference.png" -i "$K/frame_18.png"

gen frame_21 "Use case: keyframe, FORESHADOW beat (deliberately held). Medium shot at the shoreline away from the group: $CAT The cat sits alone at the water's edge on the LEFT third, body facing frame RIGHT, gazing softly toward the hazy distant hills upstream (the far background-right); posture relaxed and fond, ears gently up, tail resting loose -- the quiet fondness of watching an old friend's home, like a cat watching first snow. Nobody else in frame. Composition: 16:9 landscape, cat small on the left, long empty river and far hills fill the frame." \
  -i "$A/cat_reference.png" -i "$K/frame_06.png"

gen frame_22 "Use case: keyframe. Medium shot at the fishing spot: $GIRL She turns her head back over her shoulder toward frame LEFT (toward the cat, out of frame), a little puzzled. Expression: eyebrows slightly raised and tilted; eyes questioning, gaze left; mouth slightly open. Composition: 16:9 landscape, girl center-right." \
  -i "$A/girl_reference.png" -i "$K/frame_10.png"

gen frame_23 "Use case: keyframe (ending look-back). Close-up at the shoreline: $CAT The cat has turned its head back toward the camera-left (mouth clearly visible, closed in a soft content line), body still facing the river; expression: eyes warm and half-lidded with quiet fondness, ears relaxed, the gentle reluctant tenderness of leaving a beloved view -- as if saying a silent goodbye to something dear. No wariness, no suspicion. Composition: 16:9 landscape, cat on the right third, river glint behind." \
  -i "$A/cat_reference.png" -i "$K/frame_21.png"

gen frame_24a "Use case: keyframe, finale wide, light-drift A/B variant A. Very wide shot of the willow bank: the old man, the girl, the boy and the cat together under the big willow at the right third, fishing rod over the water; dappled gold light spots scattered on the grass and path around them; the willow curtain frames the top. Composition: 16:9 landscape, group small on the right, river and sky fill the frame, identical framing to a following variant." \
  -i "$K/frame_10.png" -i "$A/scene_willow_bank_day.png"

gen frame_24b "Use case: light-drift A/B variant B, EDIT of the reference image. Change ONLY the dappled gold light spots on the grass and path: each spot shifted slightly (a few pixels, gently, as if the light moved). Everything else -- people, cat, willow branches, river, sky -- stays pixel-identical to the reference image." \
  -i "$K/frame_24a.png"

echo "== seg2 done"
