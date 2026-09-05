#!/bin/bash
# E05 masters: sunprint boy master (new character, design lock from
# xiaoju_secret, style lock from E04 style_master) + four MORNING scene
# masters re-lit from the E04 night masters (same composition/camera).
# Codex imagegen; single-line prompts per codex-cli-imagegen.md. Idempotent:
# skips masters that already exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch"
mkdir -p assets tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch/assets"
E04="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/assets"
XJ="D:/opensource/movie/dula-story/episodes/xiaoju_secret/assets"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

MORNING="Time-of-day override: clear summer morning, about 6am, just after sunrise. Sky: fresh morning cyan blue (#3E9BD8) at the top softening into peach gold (#FFC07A) near the horizon through ONE wide soft transition band (the only soft gradient allowed), with one brighter flat gold (#F5B942) band low over the horizon. The sun is a low flat pale-gold disc (#FFD97A) low in the RIGHT side of the sky (east), hard-edged, no halo. Warm gold sunlight rakes in from frame RIGHT; shadows are long and slanted, all pointing toward frame LEFT (west); shadow side stays lavender (#8E7CC3), never pure black. Dew drops on grass and leaf tips are tiny flat white four-point sparkle shapes (#FDFBF4), hard-edged, sparse. Overall brightness is high and clear; gold appears only in light bands, dappled spots, rim light and the sun disc. No glow, no halo, no haze, no mist."

BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers. Quiet, gentle, slightly shy temperament."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$A/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/master_$name.log"
  codex exec "$prompt $LOCK $MORNING Avoid: extra people or animals, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render. Save the final PNG to $A/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

# 0. Boy character master (NEW): design elements from xiaoju_secret's master,
#    redrawn in the sunprint flat style. Refs order: style first, design
#    second, series palette example third.
gen boy_reference "Use case: character reference master. Full-body standing portrait of a boy, three-quarter view facing slightly LEFT, neutral relaxed standing pose, holding exactly one kraft-paper-cover sketchbook under his left arm and one pencil in his right hand. $BOY Expression: eyebrows level and relaxed; eyelids neutral with a soft calm gaze toward the viewer; mouth closed with a faint gentle smile. Image 1 is the STYLE reference: render strictly in that flat silkscreen style with lavender shadows and warm brown / muted purple outline split. Image 2 is the DESIGN reference for the boy's appearance only -- keep his face, hair, build and outfit exactly, ignore image 2's rendering style and lighting completely. Image 3 is the series' girl character in the target style, for palette and line-weight reference only (do not draw her). Background: plain flat warm cream (#FDF6E3). Composition: 16:9 landscape, boy centered, full body visible head to shoes with margin." \
  -i "$A/style_master.png" -i "$XJ/boy_reference.png" -i "$A/girl_reference.png"

# 1. Morning lane home: E04 night master re-lit to morning; door lamp OFF,
#    gold light from the right, long lavender shadows to the left.
gen scene_lane_home_morning "Use case: scene master, empty street plate. Recreate the EXACT same residential lane home entrance as the reference image (same white perimeter walls, same utility poles, same house entrance on the LEFT third with the wooden sliding door, same low genkan step and potted plant, same composition and camera), but re-lit to early MORNING just after sunrise: the door lamp above the door is now OFF, warm gold sunlight rakes in from frame RIGHT, long lavender shadows stretch toward frame LEFT, peach-gold morning sky. No people, no cats. Composition: 16:9 landscape, identical camera to the reference." \
  -i "$E04/scene_lane_home_night.png" -i "$A/style_master.png"

# 2. Morning lane: same street with walkable wall top, lane recedes RIGHT.
gen scene_street_morning "Use case: scene master, empty street plate. Recreate the EXACT same residential lane as the reference image (same long white perimeter wall with FLAT WALKABLE TOP EDGE at about one-third frame height, same utility poles, same trees behind the wall, same composition and camera), but re-lit to early MORNING: all window lamps OFF, warm gold sunlight from frame RIGHT, long lavender shadows toward frame LEFT, sparse dew sparkles on the wall-top moss edges. The lane recedes toward the RIGHT side of the frame. No people, no cats. Composition: 16:9 landscape, eye-level side view." \
  -i "$E04/scene_street_night.png" -i "$A/style_master.png"

# 3. Morning stone bridge: near end LEFT leads to the lane, far end RIGHT
#    leads to the grassy riverbank; river carries a flat peach-gold band.
gen scene_bridge_morning "Use case: scene master, empty location plate. Recreate the EXACT same small pedestrian stone bridge over the river as the reference image (same gentle arch, same low flat stone railings, same composition and camera, near end on the LEFT leading into the quiet residential lane, far end on the RIGHT leading to the grassy riverbank), but re-lit to early MORNING: the river below reflects a flat peach-gold morning light band instead of moonlight, warm gold light from frame RIGHT, long lavender shadows toward frame LEFT. No people, no cats, no boats. Composition: 16:9 landscape, bridge spanning horizontally across the frame, walk direction rightward." \
  -i "$E04/scene_bridge_night.png" -i "$A/style_master.png"

# 4. Morning riverbank: same bank + NEW low concrete steps on the right third
#    (the boy's sketching spot); sparse baked dew sparkles on grass tips.
gen scene_riverbank_morning "Use case: scene master, empty location plate. Recreate the EXACT same riverbank as the reference image (same grassy bank sloping down to the river, same low stone parapet along the top, same small distant bridge silhouette, same dandelions, same composition and camera), but re-lit to early MORNING: the river reflects a flat peach-gold morning light band, grass fresh saturated green, low pale-gold sun disc in the right sky, warm gold light from frame RIGHT with long lavender shadows toward frame LEFT. IMPORTANT addition: a short flight of low flat concrete steps descends the bank on the RIGHT third of the frame (a riverside seating spot, three or four steps). Sparse tiny flat white four-point dew sparkle shapes on the grass tips, hard-edged, no glow. No people, no cats. Composition: 16:9 landscape, identical camera to the reference." \
  -i "$E04/scene_riverbank_night.png" -i "$A/style_master.png"

echo "== masters done"
