#!/bin/bash
# E08 omni base closeups: 8 talking-shot base images (Girl/Boy 近景 on the
# riverbank), built from the character references + the matching scene
# keyframe. Codex imagegen only -- no paid generation. Idempotent.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page"
mkdir -p assets/keyframes tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the shot has THREE depth layers -- a foreground framing element (hanging willow branches or grass blades as large flat darker shapes), the midground subject, and a layered background (river, distant bank, sky). Never place the subject against a flat empty background. Under willow shade, dappled sunlight spots are flat gold (#F5B942) shapes."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."
SKETCH="The loose sketch page: a pencil sketch of the riverbank scenery -- monochrome pencil linework only, no color, gentle confident strokes."

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

# Girl closeups (chest-up, riverbank, facing slightly LEFT toward the boy)
gen omni_shot01 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank under the big tree: $GIRL She faces slightly LEFT, curious with a bright open smile, eyes lively. Background: sunlit river with flat gold sparkles and the big tree's hanging branches at the top edge. Composition: 16:9 landscape, her face large and clear at center-right." \
  -i "$A/girl_reference.png" -i "$K/frame_04a.png"

gen omni_shot03 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank: $GIRL She faces slightly LEFT, alarmed and anxious -- eyebrows raised and knitted, eyes wide, mouth small open as if about to cry out. Background: sunlit river and hanging tree branches. Composition: 16:9 landscape, her face large and clear at center-right." \
  -i "$A/girl_reference.png" -i "$K/frame_04a.png"

gen omni_shot05 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank: $GIRL She faces slightly LEFT, soft quiet regret -- eyebrows gently drooped, a small wistful almost-smile, eyes lowered a little. Background: sunlit river and hanging tree branches. Composition: 16:9 landscape, her face large and clear at center-right." \
  -i "$A/girl_reference.png" -i "$K/frame_04a.png"

gen omni_shot08 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank: $GIRL She faces slightly LEFT, gentle and warm, holding a loose sketch page carefully with both hands in front of her chest. $SKETCH Background: sunlit river and hanging tree branches. Composition: 16:9 landscape, her face large and clear at center-right, the page visible below." \
  -i "$A/girl_reference.png" -i "$K/frame_04a.png" -i "$K/frame_13a.png"

# Boy closeups (chest-up, riverbank, facing slightly RIGHT toward the girl)
gen omni_shot02 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank under the big tree: $BOY He sits with his kraft-paper spiral sketchbook on his lap, pencil in hand, glancing up slightly RIGHT while speaking, calm and unhurried, relaxed eyes. Background: sunlit river and hanging tree branches. Composition: 16:9 landscape, his face large and clear at center-left." \
  -i "$A/boy_reference.png" -i "$K/frame_08.png"

gen omni_shot04 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank: $BOY He gazes out toward the river at frame RIGHT, calm and resolved, a faint peaceful look, one hand resting on the sketchbook on his lap. Background: the wide sunlit river fills most of the background. Composition: 16:9 landscape, his face large and clear at center-left, profile three-quarter view toward the river." \
  -i "$A/boy_reference.png" -i "$K/frame_08.png"

gen omni_shot06 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank: $BOY He faces slightly RIGHT, a warm gentle smile, eyes soft and reassuring. Background: sunlit river and hanging tree branches. Composition: 16:9 landscape, his face large and clear at center-left." \
  -i "$A/boy_reference.png" -i "$K/frame_08.png"

gen omni_shot07 "Use case: talking closeup base. Chest-up closeup on the afternoon riverbank: $BOY He faces RIGHT, holding out a loose sketch page toward frame RIGHT with one hand, offering it, warm sincere expression. $SKETCH Background: sunlit river and hanging tree branches. Composition: 16:9 landscape, his face large and clear at center-left, the offered page visible at frame right." \
  -i "$A/boy_reference.png" -i "$K/frame_08.png" -i "$K/frame_13a.png"

echo "== omni bases done"
