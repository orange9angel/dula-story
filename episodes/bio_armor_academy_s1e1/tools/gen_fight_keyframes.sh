#!/bin/bash
# S1E01 fight scene (30s, 风林火山 four beats) — keyframe batch.
# Refs: v2 insect-biomimetic masters. Output assets/fight/. Skip-if-exists.
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
K="$EP/assets/fight"
A="$EP/assets"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
LOGD="$EP/tmp/fight"
mkdir -p "$K" "$LOGD"

STYLE="Style hard lock: high-definition cinematic 2D animated film still, theatrical-feature quality, clean confident line art with painterly rendering, rich vivid film colors, warm dusk palette (golden orange sunset sky, deep blue shadows, iron-gray steel), dramatic volumetric backlight, subtle film grain, movie-grade color grading, dynamic cinematic composition, glossy obsidian chitin sheen with hard specular rim light, kinetic manga dynamism (motion blur, speed lines, flying debris), insectoid bio-organic armor grown from the body with glowing teal trachea-like channels (#3DFFC8), weapons as living insect organs, never metal swords, blood red #FF3B3B only for danger accents. Timeless parallel-world setting: no signage, no flags. Output exact pixel size: 1672x941. Avoid: halftone dots, screentone, print texture, manga paper texture, photorealism, 3D render, monochrome, text, captions, speech bubbles, watermark, logo."

LX="Lei Xiao (attached identity reference, keep the same face): 17-year-old boy, tousled dark chestnut-brown hair with two strands sticking up, hazel eyes, plain off-white short-sleeve cloth shirt now torn and dirtied, dark cloth trousers, hexagonal chitin patches glowing faintly teal on his right forearm"
LXA="Lei Xiao (attached identity reference, keep the same face): his right forearm covered in glossy black chitin segmented like beetle plates with translucent joint membranes, claw-tipped segmented fingers, elytra-like shield plates on the forearm, glowing teal trachea channels (#3DFFC8) along every seam"
BL="Bai Lan (attached identity reference, keep the same face): young adult blades-master, ash-blond shoulder-length hair tied back loosely, full short beard, pale scar on left eyebrow and cheek, cold gray eyes, dark indigo cross-collared long robe with leather harness and one battered metal pauldron, a translucent amber cicada wing-blade with glowing veins (#F5B85A) extending from his right forearm"

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

run fight_00 "Close-up of $LX kneeling on cracked concrete at the dusk construction site, clutching a bleeding wound on his side with his left hand, a thin trail of blood at the corner of his mouth, defiant frightened eyes looking up at someone off-frame, wind tossing his hair, dust and a loose tarp fluttering, dramatic low rim light, dutch angle." _ref_leixiao_v2_small.jpg _ref_style_master_small.jpg

run fight_01 "Low-angle medium shot of $BL standing over the viewer at the dusk construction site, cicada wing-blade lowered at his side glowing amber, cold merciless eyes looking down, robe and hair whipping in the wind, crows scattering behind him, oppressive predator stillness." _ref_bailan_v2_small.jpg _ref_style_master_small.jpg

run fight_02 "Wide shot at the dusk construction site: $BL walking unhurriedly toward Lei Xiao, who is on one knee in the right foreground with his back to the viewer, Bai Lan's cicada wing dragging a glowing trail of sparks across the concrete, long shadows, tower crane silhouette, wind-blown dust, lethal calm." _ref_bailan_v2_small.jpg _ref_leixiao_v2_small.jpg

run fight_03 "Extreme dynamic action shot at the dusk construction site: Bai Lan blurring forward like a gale, his body a motion-smear, cicada wing slashing in a wide amber arc of light, Lei Xiao flung backward off his feet, his right forearm's elytra-like shield plates snapping open instinctively to block, sparks and teal bio-light bursting at the contact point, debris and blood droplets suspended mid-air, speed lines, tilted frame." _ref_leixiao_armored_v2_small.jpg _ref_bailan_v2_small.jpg

run fight_04 "Frozen instant, extreme close two-shot: Bai Lan's face inches from Lei Xiao's face, Bai Lan's cicada wing stopped a hair from Lei Xiao's neck, hair and clothes of both still swirling from the sudden halt, dust suspended motionless in the air, Bai Lan whispering something, Lei Xiao's eyes wide, dead quiet mood, dusk rim light on both faces." _ref_bailan_v2_small.jpg _ref_leixiao_v2_small.jpg

run fight_05 "Explosive action shot at the dusk construction site: $LXA roaring with fury, glossy black chitin erupting up his right arm to the shoulder, segmented plates and claw fingers, teal trachea channels flaring bright, throwing his first full punch straight at the viewer-left, shockwave rippling from his fist, the ground cratered beneath him, ring of dust blasted outward, wild kinetic motion." _ref_leixiao_armored_v2_small.jpg _ref_style_master_small.jpg

run fight_06 "Extreme close-up of the clash at the dusk construction site: Lei Xiao's black chitin fist smashing against Bai Lan's crossed cicada wing-blade, a ring shockwave of amber and teal light detonating at the contact point, concrete cratering in a circle below, sparks and glowing membrane shards flying, high contrast, motion blur radiating outward. No faces, just the impact." _ref_leixiao_armored_v2_small.jpg _ref_bailan_v2_small.jpg

run fight_07 "Low-angle shot at the dusk construction site: $BL rooted like a mountain, both feet planted inside a ring of cratered concrete, holding the block with his cicada wing which now bears a hairline glowing crack, his robe blasted backward by the shockwave but his body utterly unmoved, expression unchanged and cold, dust settling around him, epic stillness after the blast." _ref_bailan_v2_small.jpg _ref_style_master_small.jpg

run fight_08 "Wide shot at the dusk construction site from behind Lei Xiao, who lies collapsed on cracked concrete in the foreground: Bai Lan walking away into the orange sunset, the cicada wing folding and dissolving back into his forearm, his very long shadow stretching over Lei Xiao, crows circling the tower crane, wind blowing his robe and hair, cold lonely silhouette." _ref_bailan_v2_small.jpg _ref_leixiao_armored_v2_small.jpg

run fight_09 "Final wide quiet shot, aftermath at the dusk construction site: Lei Xiao lying alone on shattered concrete at the center of the crater, the teal glow of his chitin right arm fading, a thin streak of blood on the ground catching the last light, city lights coming on far away, wind lifting dust and a loose tarp, lonely epic aftermath mood." _ref_leixiao_armored_v2_small.jpg _ref_style_master_small.jpg

echo "== fight keyframe batch done  $(date +%H:%M:%S)"
ls -la "$K"
