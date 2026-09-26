#!/bin/bash
# S1E01 masters v2: insect-biomimetic redesign (STYLE_BIBLE 2026 虫化方向).
# Regenerates the 3 character masters into assets/masters_v2/ (old masters untouched).
# Serial gen via gen_image_auto.py; skip-if-exists; logs per image.
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
A="$EP/assets"
OUT="$A/masters_v2"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
LOGD="$EP/tmp/masters_v2"
mkdir -p "$OUT" "$LOGD"

STYLE="Style hard lock: high-definition cinematic 2D animated film still, theatrical-feature quality, clean confident line art with painterly rendering, rich vivid film colors, warm dusk palette (golden orange sunset sky, deep blue shadows, iron-gray steel), dramatic volumetric backlight, subtle film grain, movie-grade color grading, dynamic cinematic composition, insectoid bio-organic armor grown from the body: glossy black chitin carapace with beetle-elytra segmentation, translucent membranes at the joints, glowing teal trachea-like channels (#3DFFC8) along the seams, weapons as living insect organs (cicada wing-blades, horn crests, raptorial limbs), never metal swords, never mechanical hard-surface, blood red #FF3B3B only for danger accents. Timeless parallel-world setting: no recognizable real-world country or era signifiers, no signage, no flags. Output exact pixel size: 1672x941. Avoid: halftone dots, screentone, print texture, manga paper texture, photorealism, 3D render, monochrome, text, captions, speech bubbles, watermark, logo."

SITE="Abandoned construction site at the city edge at dusk: exposed steel rebar skeleton of an unfinished building, a tower crane silhouette against the orange sunset, scattered concrete pipes and sand piles, puddles reflecting the sky, distant timeless city skyline with warm lights coming on, wind blowing dust and a loose tarp. No signage, no text anywhere."

LX="Lei Xiao (attached identity reference, keep the same face): 17-year-old boy of ambiguous mixed heritage, lean build, tousled dark chestnut-brown hair with two strands sticking up, hazel eyes with small shadows underneath. Timeless mixed-world student attire: plain off-white short-sleeve cloth shirt with sleeves rolled to forearms, simple dark cloth trousers, canvas shoes, worn canvas satchel slung on one shoulder."

BL="Bai Lan (attached identity reference, keep the same face): a young adult blades-master, tall and straight-backed, weathered handsome face of European descent, ash-blond shoulder-length hair tied back loosely, full short beard, a pale scar crossing his left eyebrow and cheek, calm merciless gray eyes. Mixed timeless world attire: dark indigo cross-collared long robe layered with a weathered leather harness strap and one small battered metal pauldron, dark trousers tucked into worn leather boots."

run() {
  local name="$1"; shift
  local prompt="$1"; shift
  if [ -s "$OUT/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name  $(date +%H:%M:%S)"
  local args=(--out "$OUT/$name.png" --size 1672x941 --timeout 280 --prompt "$prompt $STYLE")
  for ref in "$@"; do args+=(--ref "$A/$ref"); done
  "$PY" "$GEN" "${args[@]}" > "$LOGD/$name.log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name  $(date +%H:%M:%S)"; else echo "== MISSING $name (see $LOGD/$name.log)"; fi
}

# 1. Lei Xiao daily form: corrosion veins -> hexagonal chitin patches (right arm only, viewer-left lock)
run leixiao_reference_v2 "Full-body portrait of $LX standing at the entrance of the construction site at dusk, facing the viewer, right forearm slightly raised. Small hexagonal chitin patches with faint teal glow (#3DFFC8) appear ONLY on his right forearm and the back of his right hand, like insect shell forming under the skin (his RIGHT arm, which from the viewer's perspective is on the LEFT side of the image); his left arm and left hand are completely normal skin. Nervous, withdrawn expression. Background: $SITE" _ref_leixiao_reference_small.jpg _ref_style_master_small.jpg

# 2. Bai Lan: cell-blade -> cicada wing-blade grown from right forearm, no sword
run bailan_reference_v2 "Full-body portrait of $BL standing inside the construction site at dusk, backlit by the orange sunset. He carries NO sword and nothing in his hands: from his right forearm extends a single translucent amber cicada wing as long as a blade, its veins glowing like living circuits (pale amber #F5B85A), the wing edge slightly blurred from high-frequency vibration, held lowered at his side. Calm merciless expression, wind moving his hair and robe. Background: $SITE" _ref_bailan_reference_small.jpg _ref_style_master_small.jpg

# 3. Lei Xiao first-emergence (chitin arm + elytra shield), ref = new daily master for face lock
ARMORED_REF="masters_v2/leixiao_reference_v2.png"
if [ -s "$OUT/leixiao_reference_v2.png" ]; then
  run leixiao_armored_reference_v2 "Full-body portrait of $LX at the construction site at dusk, his right forearm transformed: glossy black chitin covering the forearm, segmented like a beetle's abdomen plates with translucent membranes at the joints, fingers slightly segmented and claw-tipped, elytra-like shield plates flared open from the forearm, glowing teal trachea-like channels (#3DFFC8) running along every seam, teal glow also visible under his collar at the chest (the bio-core). His left arm stays completely normal. Shocked expression staring at his own transformed arm. Background: $SITE" "$ARMORED_REF" _ref_style_master_small.jpg
else
  echo "== SKIP leixiao_armored_reference_v2 (daily master missing)"
fi

echo "== masters v2 batch done  $(date +%H:%M:%S)"
ls -la "$OUT"
