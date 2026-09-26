#!/bin/bash
# 《9章》打斗链续拍：03(已有) → 04 → 05 → 06 → 07，每镜以上一镜最后一帧为首帧。
# 产物 *_chain.mp4；任何一镜失败即中断（链断无意义）。
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
V="$EP/assets/i2v"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
MODEL="doubao-seedance-2-0-260128"
STYLE="Cinematic 2D animated film look, keep the exact characters, clothing, armor and weapon designs, dusk lighting and color grading of the first frame, no text, no watermark."

lastframe() { # src dst
  ffmpeg -loglevel error -y -sseof -0.05 -i "$1" -vframes 1 -q:v 3 "$2"
}

chain() { # out prev_last prompt
  local out="$1" prev="$2" prompt="$3"
  echo "== chain $out  $(date +%H:%M:%S)"
  "$PY" "$GEN" --model "$MODEL" --out "$V/$out.mp4" \
    --first-frame "$prev" --prompt "$prompt $STYLE" --duration 4 \
    --resolution 720p --ratio adaptive --retries 4 \
    > "$EP/tmp/i2v/$out.log" 2>&1
  [ -s "$V/$out.mp4" ] || { echo "== FAILED $out (see tmp/i2v/$out.log)"; exit 1; }
  ffmpeg -loglevel error -y -ss 2 -i "$V/$out.mp4" -vframes 1 "$V/${out}_mid.png"
  echo "== ok $out"
}

lastframe "$V/fight_03.mp4" "$V/chain_03_last.jpg"

chain fight_04_chain "$V/chain_03_last.jpg" "Continuity shot: the thrown boy slams down onto the cracked concrete on one knee, one hand hitting the ground, dust bursting then settling, his head snapping up; the blades-master is already standing over him, the amber cicada wing-blade lowered and stopping a hair from the boy's throat, everything freezing into dead stillness, only a few dust particles drifting."

lastframe "$V/fight_04_chain.mp4" "$V/chain_04_last.jpg"

chain fight_05_chain "$V/chain_04_last.jpg" "Continuity shot: from the grounded pose under the blade, the boy surges upward with a desperate roar, glossy black chitin erupting up his right arm to the shoulder, knocking the wing aside and throwing his first full punch straight at the master, a shockwave rippling from his fist, dust ring blasting outward. Wild explosive motion."

lastframe "$V/fight_05_chain.mp4" "$V/chain_05_last.jpg"

chain fight_06_chain "$V/chain_05_last.jpg" "Continuity shot: the black chitin fist smashes against the amber cicada wing at point blank, a ring shockwave of amber and teal light detonating at the contact point, concrete cratering below, sparks and glowing membrane shards flying, intense flashing impact, motion blur radiating outward."

lastframe "$V/fight_06_chain.mp4" "$V/chain_06_last.jpg"

chain fight_07_chain "$V/chain_06_last.jpg" "Continuity shot: the shockwave fades, the blades-master stands rooted and utterly unmoved inside the ring of cratered concrete, his robe settling after being blasted backward, dust drifting down around him, his cracked cicada wing humming unsteadily at his side, the boy's spent fist dropping out of frame. Epic stillness after the blast."

echo "== chain batch done  $(date +%H:%M:%S)"
