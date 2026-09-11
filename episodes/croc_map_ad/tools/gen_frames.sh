#!/bin/bash
# Croc map ad demo: 3 frames via codex imagegen (free). Idempotent.
set -u
cd "D:/opensource/movie/dula-story/episodes/croc_map_ad"
K="D:/opensource/movie/dula-story/episodes/croc_map_ad/assets/frames"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

gen() { # name prompt
  local name="$1" prompt="$2"
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  codex exec "$prompt Save the final PNG to $K/${name}.png" $FLAGS > "tmp/gen_$name.log" 2>&1
  if [ -s "$K/$name.png" ]; then
    ffmpeg -loglevel error -y -i "$K/$name.png" -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" "$K/${name}_916.png"
    echo "== ok $name"
  else
    echo "== MISSING $name (see tmp/gen_$name.log)"; return 1
  fi
}

LOCK="Photorealistic look, real-photography lighting and texture, naturalistic color, portrait 9:16 vertical composition, no text, no watermark, no logo."
CROC="a cool anthropomorphic saltwater crocodile standing upright on two legs like a human, dark sunglasses, thick gold chain on his neck, confident smirk showing white teeth"

gen croc_ref "Full-body studio portrait of $CROC, arms crossed over chest, plain light grey seamless studio background, soft even lighting, he stands centered and fills most of the frame height. $LOCK"

gen city_sanya "Miniature-diorama travel postcard: $CROC, now wearing an open orange Hawaiian shirt, GIANT-sized standing among tiny coconut palm trees on a tropical beach in Sanya China, holding a coconut drink with a straw in one claw, turquoise sea and white sand, tiny beach umbrellas and tiny tourists at his feet, bright sunny daylight, slightly elevated wide view like a map diorama. $LOCK"

gen city_harbin "Miniature-diorama travel postcard: $CROC, now wearing a bulky green Chinese army cotton-padded coat and a brown ushanka fur hat, GIANT-sized standing in front of Saint Sophia Cathedral in Harbin (green onion domes, red brick Byzantine church), heavy snow falling, white breath vapor puffing from his jaws, tiny people in winter coats walking at his feet, cold blue winter atmosphere. $LOCK"

echo "== all frames done"
