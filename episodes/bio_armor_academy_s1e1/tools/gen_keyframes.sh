#!/bin/bash
# S1E01 keyframe batch: serial codex imagegen via gen_image_auto.py.
# Skip-if-exists, per-frame logs, keep going on failure (re-run fills gaps).
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
K="$EP/assets/keyframes"
A="$EP/assets"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
LOGD="$EP/tmp/keyframes"
mkdir -p "$K" "$LOGD"

STYLE="Style hard lock: high-definition cinematic 2D animated film still, theatrical-feature quality, clean confident line art with painterly rendering, rich vivid film colors, warm dusk palette (golden orange sunset sky, deep blue shadows, iron-gray steel), dramatic volumetric backlight, subtle film grain, movie-grade color grading, dynamic cinematic composition. Timeless parallel-world setting: no recognizable real-world country or era signifiers, no signage. Output exact pixel size: 1672x941. Avoid: halftone dots, screentone, print texture, manga paper texture, photorealism, 3D render, monochrome, text, captions, speech bubbles, watermark, logo."
LX="Lei Xiao (attached identity reference): 17-year-old boy of ambiguous mixed heritage, tousled dark chestnut-brown hair with two strands sticking up, hazel eyes, plain off-white short-sleeve cloth shirt with rolled sleeves, dark cloth trousers, canvas satchel"
BL="Bai Lan (attached identity reference): young adult blades-master, weathered face of European descent, ash-blond shoulder-length hair tied back loosely, full short beard, pale scar crossing his left eyebrow and cheek, gray eyes, dark indigo cross-collared long robe with weathered leather harness strap and one battered metal pauldron"

run() {
  local name="$1"; shift
  local prompt="$1"; shift
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name  $(date +%H:%M:%S)"
  local args=(--out "$K/$name.png" --size 1672x941 --timeout 280 --prompt "$prompt $STYLE")
  for ref in "$@"; do args+=(--ref "$A/$ref"); done
  "$PY" "$GEN" "${args[@]}" > "$LOGD/$name.log" 2>&1
  if [ -s "$K/$name.png" ]; then echo "== ok $name  $(date +%H:%M:%S)"; else echo "== MISSING $name (see $LOGD/$name.log)"; fi
}

run frame_00 "Wide cinematic establishing shot, no people: city skyline at dusk seen from a hill, school buildings in the foreground below, the river, the abandoned construction site with a tower crane at the west bank, dramatic orange-purple sunset cloud bands, crows flying home." _ref_style_master_small.jpg

run frame_01 "Close-up shot of $LX at the abandoned construction site at dusk (image 2 = staging): chest-up shot, he pulls his right sleeve up staring at the black vein-like bio-corrosion with faint teal #3DFFC8 glow spreading over the back of his right hand, nervous sweating expression, whispering to himself, steel rebar skeleton blurred in the background." _ref_leixiao_reference_small.jpg _ref_style_master_small.jpg

run frame_02 "Medium shot of $BL standing at the construction site at dusk (image 2 = staging): waist-up, backlit by the orange sunset, holding the bio-wrapped broad blade at his side, calm merciless eyes, wind moving his hair." _ref_bailan_reference_small.jpg _ref_style_master_small.jpg

run frame_03 "Close-up shot of $LX at the construction site (image 2 = staging): shocked reaction, pupils contracted, mouth half open, cold sweat, head turned toward someone off-panel right, dusk light on his face." _ref_leixiao_reference_small.jpg _ref_style_master_small.jpg

run frame_04 "Wide two-shot at the construction site at dusk: $BL large in the left foreground facing right in profile, and $LX small in the right background facing him, long shadows across the dirt ground, tower crane silhouette behind them, tense standoff." _ref_bailan_reference_small.jpg _ref_leixiao_reference_small.jpg

run frame_05 "Close-up shot of $LX shouting desperately, clutching his own right forearm (corrosion veins glowing faintly teal), teeth bared, eyes wet, dynamic dutch angle, construction site dusk background (image 2 = staging)." _ref_leixiao_reference_small.jpg _ref_style_master_small.jpg

run frame_06 "Low-angle close-up shot of $BL looking down coldly, face half in shadow, sunset rim light on his hair and pauldron, merciless calm, construction site dusk (image 2 = staging)." _ref_bailan_reference_small.jpg _ref_style_master_small.jpg

run frame_07 "Dynamic action shot of $BL raising the bio-wrapped broad blade overhead with both hands, attack stance, the pale bio-tissue veins on the blade glowing, robe flaring, construction site at dusk (image 2 = staging), dramatic low angle." _ref_bailan_reference_small.jpg _ref_style_master_small.jpg

run frame_08 "Extreme close-up action shot at the construction site at dusk: a black-iron bio-organic armored forearm with glowing teal channels ending in a curved bio-blade (image 1 = armored arm design) blocking a pale bio-tissue wrapped broad blade (image 2 = blade design), impact sparks and teal bio-light bursting at the contact point, motion streaks, debris flying, cracked concrete below. No faces, just the clash." _ref_leixiao_armored_small.jpg _ref_bailan_reference_small.jpg

run frame_09 "Close-up shot of $LX with his right forearm transformed into black-iron bio-organic carapace with glowing teal channels ending in a curved bio-blade (image 2 = armored arm design), staring at his own transformed arm in shock, mouth open, dusk construction site background." _ref_leixiao_reference_small.jpg _ref_leixiao_armored_small.jpg

run frame_10 "Extreme close-up shot of the face of $BL: the faintest approving smirk on his lips, cold gray eyes narrowing with interest, scar visible, sunset rim light, dark background." _ref_bailan_reference_small.jpg

run frame_11 "Wide shot from behind: $BL seen from the back, walking away toward the edge of the construction site into the orange sunset, very long shadow stretching toward the viewer, tower crane silhouette, crows, his hair and robe blowing in the wind (image 2 = staging)." _ref_bailan_reference_small.jpg _ref_style_master_small.jpg

run frame_12 "Final wide shot, quiet aftermath at the construction site at dusk: Lei Xiao in armored form (image 1 = identity: bio-blade right arm lowered, chest bio-core glowing bright teal under his shirt collar) standing small in the center of cracked shattered concrete, dust motes in the last light, city skyline lighting up behind, lonely epic mood (image 2 = staging)." _ref_leixiao_armored_small.jpg _ref_style_master_small.jpg

echo "== keyframe batch done  $(date +%H:%M:%S)"
ls -la "$K"
