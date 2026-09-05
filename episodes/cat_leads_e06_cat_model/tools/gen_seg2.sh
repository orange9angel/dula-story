#!/bin/bash
# E06 seg2 keyframes: chase -> shade -> portrait-reveal block --
# frame_12..frame_22 + frame_17a/17b breathing A/B variants. Codex
# imagegen; seg1 frames first. LOCK + DENSITY on every prompt. Idempotent.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model"
mkdir -p assets/keyframes tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, Makoto Shinkai style, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the shot has THREE depth layers -- a foreground framing element (overhanging tree canopy or grass blades as large flat darker shapes), the midground subject, and a layered background (river, distant town, sky). Never place the subject against a flat empty background. Under tree shade, dappled sunlight spots are flat gold (#F5B942) shapes."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers, a kraft-paper-cover sketchbook and one pencil."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg2_$name.log"
  codex exec "$prompt $LOCK $DENSITY $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_12 "Use case: keyframe, chase montage 1. Low-angle shot on the sunlit grass slope: $CAT The cat is mid-pounce toward a small flat orange-yellow butterfly hovering just above the grass, front paws reaching, tail whipping up. Tall foreground grass blades frame the bottom and left edge as large flat darker green shapes. Composition: 16:9 landscape, cat center, butterfly upper-right of it." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_13 "Use case: keyframe, chase montage 2. Low-angle shot on the same grass: $CAT The cat has tumbled onto its side on the grass, legs in the air, while the small orange-yellow butterfly escapes toward the upper-right corner. Comedic but graceful shapes, flat colors. Foreground grass blades frame the bottom edge. Composition: 16:9 landscape, cat center-left, butterfly small at upper right." \
  -i "$A/cat_reference.png" -i "$K/frame_12.png"

gen frame_14 "Use case: keyframe (base for a lip-sync talking shot). Medium-close on the same steps: $GIRL She sits on the concrete step in the tree shade, hands resting on the step beside her, watching toward frame RIGHT where the cat plays (out of frame). Expression: eyebrows level and soft; eyes gentle with small catchlights, gaze right; mouth in a tender closed-lip smile. Flat gold dappled spots on the step. Composition: 16:9 landscape, girl on the left half." \
  -i "$A/girl_reference.png" -i "$K/frame_00.png"

gen frame_15 "Use case: keyframe (base for a lip-sync talking shot). Close-up on the same steps: $BOY sitting beside the girl (out of frame left), body facing frame LEFT, sketchbook closed on his knees. Expression: eyebrows level; eyes calm and warm, gaze left; mouth in a small contented smile. Composition: 16:9 landscape, boy on the right half, shade and dapple shapes behind." \
  -i "$A/boy_reference.png" -i "$K/frame_14.png"

gen frame_16 "Use case: keyframe. Medium shot on the same riverbank: $CAT The cat walks back from the sunlit grass into the big tree's shade patch toward frame LEFT, tail low and relaxed, steps slow and tired. The shade edge and flat gold dapple spots mark the boundary. Composition: 16:9 landscape, cat center-right, shade patch on the left." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_17a "Use case: keyframe, A/B breathing variant A. Close-medium shot in the tree shade: $CAT The cat lies curled asleep on the grass in the shade, eyes closed, tail wrapped close, belly in a neutral exhaled position, ears softly relaxed. Flat gold dappled spots on the grass around it. Composition: 16:9 landscape, cat center, identical framing to a following variant -- keep every outline in exactly fixed positions." \
  -i "$A/cat_reference.png" -i "$K/frame_16.png"

gen frame_17b "Use case: A/B breathing variant B, EDIT of the reference image. Change ONLY the sleeping cat's belly and chest: raised very slightly, as if mid-inhale (a few pixels of gentle expansion). Everything else -- head, paws, tail, ears, background, dapple spots, framing -- stays pixel-identical to the reference image." \
  -i "$K/frame_17a.png"

gen frame_18 "Use case: keyframe. Over-the-shoulder shot on the same steps: $BOY seen from behind-side (three-quarter back view), bent slightly over the open sketchbook on his knees, pencil hand mid-stroke adding the final lines. The sleeping cat is small in the midground shade ahead of him. Composition: 16:9 landscape, boy's shoulder and sketchbook in the near right, cat in the middle distance." \
  -i "$A/boy_reference.png" -i "$K/frame_14.png"

gen frame_19 "Use case: insert close-up. An open kraft-paper-cover sketchbook held at a slight angle by a boy's hand at the lower edge: on the page, a single finished drawing of the same orange tabby cat curled asleep, rendered as a simple flat grey-lavender pencil-style drawing on warm cream paper, no text, no readable characters. Composition: 16:9 landscape, sketchbook fills the center, flat shade shapes at the edges." \
  -i "$A/cat_reference.png" -i "$K/frame_18.png"

gen frame_20 "Use case: keyframe (base for a lip-sync talking shot). Close-up on the same steps: $GIRL looking down at the sketchbook held toward her (out of frame bottom-left), visibly moved. Expression: eyebrows softly arched up; eyes gentle and slightly glossy, gaze down-left; mouth in a small trembling smile. Composition: 16:9 landscape, her face on the right half, dappled shade behind." \
  -i "$A/girl_reference.png" -i "$K/frame_14.png"

gen frame_21 "Use case: keyframe (base for a lip-sync talking shot). Close-up in the tree shade: $CAT The sleeping cat's face in three-quarter view, eyes fully closed in soft curved lines, mouth closed but clearly visible, ears relaxed, whiskers drooping slightly; utterly peaceful. A flat gold dappled spot on its cheek. Composition: 16:9 landscape, cat face center, soft shade shapes behind." \
  -i "$A/cat_reference.png" -i "$K/frame_17a.png"

gen frame_22 "Use case: keyframe, wide finale. Very wide shot of the daytime riverbank: under the big tree's shade, the boy and the girl sit side by side on the concrete steps with the orange tabby cat curled asleep between them; the shade patch is rendered slightly cooler green-teal than the sunlit grass, with flat gold dappled spots; the bright river and distant town glow in the background; the tree canopy frames the top edge. Composition: 16:9 landscape, trio small on the lower-right third, river and sky fill the frame." \
  -i "$A/girl_reference.png" -i "$A/boy_reference.png" -i "$A/cat_reference.png"

echo "== seg2 done"
