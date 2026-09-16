#!/bin/bash
# E07 masters: oldman_reference (new character, sunprint) + willow bank
# scene master (new upstream location). Codex imagegen; single-line prompts
# per codex-cli-imagegen.md. Idempotent.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow"
mkdir -p assets tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow/assets"
E06="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model/assets"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the scene has THREE depth layers -- foreground framing elements (hanging willow branches, grass blades, large flat darker shapes), the midground subject area, and a layered background (river, distant bank, sky). Never leave the subject area against a flat empty background."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$A/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/master_$name.log"
  codex exec "$prompt $LOCK Avoid: extra people or animals, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render. Save the final PNG to $A/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then
    echo "== ok $name"
    normalize_img "$A/$name.png"
  else
    echo "== MISSING $name (see $log)"
  fi
}

# 1. OldMan character master (new): sunprint fisherman, design lock from the
#    E07 STYLE_BIBLE; style ref first, series palette example second.
gen oldman_reference "Use case: character reference master. Full-body standing portrait of an old fisherman, three-quarter view facing slightly LEFT, relaxed standing pose holding a long bamboo fishing rod upright in one hand. The old man: slim 68-year-old with a slight stoop, kind wrinkled face with narrow smiling eyes (wrinkles drawn with only two or three restrained lines), a worn flat-top straw hat, a khaki multi-pocket fishing vest over a white shirt with rolled sleeves, dark gray trousers, old rubber shoes. Slow, steady, seen-everything temperament. Expression: eyebrows relaxed; eyes narrowed into a warm smile; mouth in a gentle closed-lip smile. Image 1 is the STYLE reference: render strictly in that flat silkscreen style with lavender shadows and warm brown / muted purple outline split. Image 2 is the series' girl character in the target style, for palette and line-weight reference only (do not draw her). Background: plain flat warm cream (#FDF6E3). Composition: 16:9 landscape, old man centered, full body visible head to shoes with margin." \
  -i "$A/style_master.png" -i "$A/girl_reference.png"

# 2. Willow bank scene master: upstream shallow bank with weeping willows,
#    afternoon. Composition cousin of the E06 riverbank (same river, distant
#    town) but a DIFFERENT spot: willow curtain foreground, shallow pebble
#    shore, old man's fishing spot (stool + bucket) at the right third.
gen scene_willow_bank_day "Use case: scene master, empty location plate. An upstream riverbank spot on a bright afternoon: tall weeping willow trees along the bank, their long hanging branches dipping into the TOP of the frame as a foreground curtain; a shallow pebble-and-grass shoreline along calm water; the distant town and a low bridge far downstream in the background; on the RIGHT third under the biggest willow, an empty fishing spot: a small folding stool and a tin bucket beside the water, a long bamboo fishing rod leaning against the tree trunk. Flat gold dappled light spots under the willow shade. No people, no cats. $DENSITY Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/style_master.png" -i "$E06/scene_riverbank_day.png"

echo "== masters done"
