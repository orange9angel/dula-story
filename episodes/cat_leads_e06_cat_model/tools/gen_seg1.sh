#!/bin/bash
# E06 seg1 keyframes: portrait-posing block -- frame_00..frame_11 +
# frame_05a/05b ear A/B variants + frame_08 (I2V first frame). Codex
# imagegen; scene_riverbank_day must exist first (gen_masters.sh).
# Every prompt carries LOCK + DENSITY (three depth layers, foreground
# framing). Expressions written LAYERED (brows/eyes/mouth). Idempotent.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model"
mkdir -p assets/keyframes tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the shot has THREE depth layers -- a foreground framing element (overhanging tree canopy or grass blades as large flat darker shapes), the midground subject, and a layered background (river, distant town, sky). Never place the subject against a flat empty background. Under tree shade, dappled sunlight spots are flat gold (#F5B942) shapes."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers, a kraft-paper-cover sketchbook and one pencil."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg1_$name.log"
  codex exec "$prompt $LOCK $DENSITY $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_00 "Use case: establishing shot, wide view of the exact daytime riverbank from the scene reference: the big tree's canopy reaches into the top of the frame as a foreground framing layer, the concrete steps in the shade patch on the right third, grass slope, river and distant town behind. Flat gold dappled light spots inside the shade. No people, no cat. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_riverbank_day.png"

gen frame_01 "Use case: keyframe (base for a lip-sync talking shot). Medium-close shot at the daytime riverbank steps: $BOY He sits on the concrete steps in the tree shade, sketchbook open on his knees, pencil raised, looking down toward frame LEFT at a cat (out of frame). Expression: eyebrows level and relaxed; eyes bright with small catchlights, gaze down-left; mouth in a faint warm smile. Flat gold dappled spots on his shirt. Foreground grass blades frame the lower left corner. Composition: 16:9 landscape, boy on the right half." \
  -i "$A/boy_reference.png" -i "$K/frame_00.png"

gen frame_02 "Use case: keyframe. Medium shot on the same steps: $CAT The cat sits upright in a formal posing posture on the sunlit concrete step, chin lifted, chest out, tail curled neatly around its paws, eyes half-lidded with pride. The big tree's shade edge falls just behind it. Composition: 16:9 landscape, cat on the left third, steps and grass behind." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_03 "Use case: keyframe (base for a lip-sync talking shot). Close-up: $CAT The cat sits on the step, body facing frame RIGHT, head in a three-quarter view toward the camera (mouth clearly visible, closed); expression: chin slightly lifted, eyes narrowed to confident slits, ears upright, whiskers relaxed -- a quietly proud look. Flat dappled gold spot on its back. Composition: 16:9 landscape, cat center-left, soft grass and shade shapes behind." \
  -i "$A/cat_reference.png" -i "$K/frame_02.png"

gen frame_04 "Use case: keyframe (base for a lip-sync talking shot). Medium-close shot on the same steps: $GIRL She crouches beside the sitting cat, one hand gently pressing its back to straighten its pose, looking at the cat toward frame RIGHT. Expression: eyebrows slightly raised; eyes bright and playful; mouth in an open cheerful smile. $CAT The cat sits upright looking annoyed-proud. Foreground grass blades frame the bottom edge. Composition: 16:9 landscape, girl on the left, cat right of center." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_02.png"

gen frame_05a "Use case: keyframe, A/B micro-motion variant A. Close-up on the same step: $CAT sitting upright in the formal pose, chin up, eyes half-lidded; BOTH ears perked straight up. Composition: 16:9 landscape, cat center, identical framing to a following variant -- keep head/body/paws in exactly fixed positions." \
  -i "$A/cat_reference.png" -i "$K/frame_03.png"

gen frame_05b "Use case: A/B micro-motion variant B, EDIT of the reference image. Change ONLY the cat's ears: both ears angled sideways toward frame RIGHT (alert, tracking a sound), slightly flattened. Everything else -- head, body, paws, tail, background, lighting, framing -- stays pixel-identical to the reference image." \
  -i "$K/frame_05a.png"

gen frame_06 "Use case: insert shot. A single small butterfly as a flat orange-yellow shape with simple wing silhouettes, flying in the upper-right of the frame against the bright daytime sky and the soft flat shapes of the grass slope below. No people, no cat. Composition: 16:9 landscape, butterfly small and clearly flat-colored." \
  -i "$K/frame_00.png"

gen frame_07 "Use case: keyframe (base for a lip-sync talking shot). Close-up on the same steps: $GIRL still crouching, head turned up toward frame RIGHT-UP, following something in the air with her eyes. Expression: eyebrows raised; eyes wide and tracking right-up; mouth slightly open mid-call. Composition: 16:9 landscape, her face on the left half, bright sky and canopy edge on the right." \
  -i "$A/girl_reference.png" -i "$K/frame_04.png"

gen frame_08 "Use case: I2V first frame for a cat hopping-down-and-running shot. On the same riverbank: $CAT The cat is mid-hop leaving the bottom concrete step on the LEFT third of the frame, body facing RIGHT toward the open sunlit grass slope, front paws tucked, tail straight behind. The RIGHT two-thirds of the frame is open grass kept clear for the cat to run into. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_09 "Use case: keyframe. Medium shot on the same steps: $GIRL She is straightening up from the crouch, hands on her knees, body facing frame RIGHT, looking right after the runaway cat. Expression: eyebrows raised, mouth open in a surprised call. Her hair tips sway faintly toward frame RIGHT. Composition: 16:9 landscape, girl center-left, open grass on the right." \
  -i "$A/girl_reference.png" -i "$K/frame_04.png"

gen frame_10 "Use case: keyframe (base for a lip-sync talking shot). Close-up on the same steps: $GIRL facing frame RIGHT. Expression: eyebrows raised high; eyes wide; mouth open in an exasperated laughing call. Composition: 16:9 landscape, her face on the left half, soft grass shapes on the right." \
  -i "$A/girl_reference.png" -i "$K/frame_09.png"

gen frame_11 "Use case: keyframe (base for a lip-sync talking shot). Close-up on the same steps: $BOY sitting, pencil lowered onto the sketchbook, body facing frame LEFT, watching the cat run off (out of frame). Expression: eyebrows relaxed with a slight helpless arch; eyes soft, gaze left; mouth in a wry resigned smile, one corner higher. Composition: 16:9 landscape, boy on the right half, dappled shade shapes behind." \
  -i "$A/boy_reference.png" -i "$K/frame_01.png"

echo "== seg1 done"
