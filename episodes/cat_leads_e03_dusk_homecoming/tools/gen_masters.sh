#!/bin/bash
# E03 scene masters: dusk riverbank (edit of E02 riverbank), dusk street with
# walkable wall (edit of E02 street_wall), stone bridge (new), home lane
# entrance with door lamp (new, referencing dusk street). Codex imagegen path;
# single-line prompts per codex-cli-imagegen.md (multi-line drops -i refs).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming"
mkdir -p assets tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming/assets"
E2="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is flat geometric shapes in flat gold, never glow, never haze. Characters in crisp cel-style flat color with one shadow layer. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DUSK="Time-of-day override: late golden-hour dusk. Sky: deep violet blue (#4A4E8F) at the top softening into warm orange gold (#F5A442) near the horizon through ONE wide soft transition band (the only soft gradient allowed), with one brighter flat gold (#F5B942) band low over the horizon. Sun very low; shadows extremely long and slanted; lit edges rimmed in warm orange-gold, shadow side stays lavender purple (#8E7CC3). Windows and door lamps glow as flat warm-yellow (#FFD97A) rectangles."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/master_$name.log"
  codex exec "$prompt $LOCK $DUSK Avoid: people, animals, text, watermark, photorealism, 3D render. Save the final PNG to $A/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

# 1. Dusk riverbank: exact E02 riverbank plate re-lit to dusk.
gen scene_riverbank_dusk "Use case: scene master, empty location plate. Recreate the EXACT same riverbank as the reference image (same grassy bank sloping down to the river, same low stone parapet along the top, same small distant bridge silhouette, same dandelions, same composition and camera), but re-lit to DUSK: the river reflects the low sun as flat gold-orange light bands, grass in long slanted shadow, sky violet-to-orange. No people, no cats. Composition: 16:9 landscape, identical camera to the reference." \
  -i "$E2/scene_riverbank.png" -i "$A/style_master.png"

# 2. Dusk street with walkable white wall top (cat walks along it, heading LEFT).
gen scene_street_dusk "Use case: scene master, empty street plate. Recreate the EXACT same residential lane as the reference image (same long white perimeter wall with FLAT WALKABLE TOP EDGE at about one-third frame height along the LEFT side, same utility poles, same trees behind the wall), but at DUSK: extremely long slanted shadows, warm orange-gold rim light on wall tops, windows in the houses glowing as flat warm-yellow rectangles, sky violet-to-orange. The lane now recedes toward the LEFT side of the frame. No people, no cats. Composition: 16:9 landscape, eye-level side view." \
  -i "$E2/scene_street_wall.png" -i "$A/style_master.png"

# 3. Stone bridge over the river (new): connects riverbank (right) to lane (left).
gen scene_bridge "Use case: scene master, empty location plate. A small narrow pedestrian stone bridge arching gently over a calm river at dusk, seen from the side at eye level: low flat stone railings you could sit on, the river below reflecting flat gold-orange light bands, the far end of the bridge on the LEFT leading into a quiet residential lane with a few windows glowing warm yellow, the near end on the RIGHT fading into the grassy riverbank. Dusk sky violet-to-orange above. No people, no cats, no boats. Composition: 16:9 landscape, bridge spanning horizontally across the frame, walk direction leftward." \
  -i "$A/scene_riverbank_dusk.png" -i "$A/style_master.png"

# 4. Home lane entrance with door lamp (new): dusk lane ending at a home entrance.
gen scene_lane_home_dusk "Use case: scene master, empty street plate. A quiet residential lane at dusk in the same neighborhood as the reference street image (same white perimeter walls, utility poles), looking down the lane toward a small house entrance on the LEFT side: a warm flat-yellow door lamp glowing above a simple wooden sliding door, a low genkan step, potted plant by the door. Extremely long slanted shadows, windows glowing warm yellow, sky violet-to-orange. No people, no cats. Composition: 16:9 landscape, eye-level view down the lane, entrance on the left third." \
  -i "$A/scene_street_dusk.png" -i "$A/style_master.png"

echo "== masters done"
