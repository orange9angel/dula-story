#!/bin/bash
# 《9章》30s 打斗试片 — Seedance 2.0 图生视频（10 镜）。
# 用法: bash gen_fight_i2v.sh [fight_XX]   # 带参数只跑单镜（测试用）
# 幂等 skip-if-exists；每镜抽首/中/尾帧供目检。
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
A="$EP/assets"
K="$A/fight"
OUT="$A/i2v"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
mkdir -p "$OUT" "$EP/tmp/i2v"

MODEL="doubao-seedance-2-0-260128"
STYLE="Cinematic 2D animated film still look, keep the exact characters, clothing, armor and weapon designs, dusk lighting and color grading of the first frame, no text, no watermark, no new elements."

i2v() { # name duration prompt
  local name="$1" dur="$2" prompt="$3"
  if [ -s "$OUT/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  mkdir -p "$K/f720"
  if [ ! -s "$K/f720/$name.jpg" ]; then
    ffmpeg -loglevel error -y -i "$K/$name.png" -vf "scale=1280:720:flags=lanczos" -q:v 3 "$K/f720/$name.jpg"
  fi
  echo "== i2v $name (${dur}s)  $(date +%H:%M:%S)"
  "$PY" "$GEN" --model "$MODEL" --out "$OUT/$name.mp4" \
    --first-frame "$K/f720/$name.jpg" --prompt "$prompt $STYLE" --duration "$dur" \
    --resolution 720p --ratio adaptive --retries 4 \
    > "$EP/tmp/i2v/$name.log" 2>&1
  if [ ! -s "$OUT/$name.mp4" ]; then echo "== FAILED $name (see tmp/i2v/$name.log)"; return 1; fi
  ffmpeg -loglevel error -y -i "$OUT/$name.mp4" -vf "select=eq(n\,0)" -vframes 1 "$OUT/${name}_first.png"
  D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$name.mp4")
  ffmpeg -loglevel error -y -ss "$(echo "$D" | awk '{print $1/2}')" -i "$OUT/$name.mp4" -vframes 1 "$OUT/${name}_mid.png"
  ffmpeg -loglevel error -y -sseof -0.1 -i "$OUT/$name.mp4" -vframes 1 "$OUT/${name}_last.png"
  echo "== ok $name (${D}s)"
}

run_one() {
  case "$1" in
    fight_00) i2v fight_00 5 "The wounded boy kneels on cracked concrete, breathing heavily with a slight shoulder tremble, a thin drop of blood falls from the corner of his mouth, wind stirs his hair and the loose tarp, dust drifts through the last light, crows cross the sky. Slow gentle camera push-in.";;
    fight_01) i2v fight_01 5 "The tall blades-master stands almost perfectly still looking down, his dark robe and tied hair whipping in the wind, the amber cicada wing-blade at his side vibrates faintly with pulsing glowing veins, crows scatter behind him. Slow low-angle camera push-in, oppressive calm.";;
    fight_02) i2v fight_02 4 "The blades-master walks slowly and unhurriedly toward the kneeling boy in the foreground, his cicada wing dragging a glowing trail of sparks across the wet concrete, robe billowing in the wind, dust swirling. Steady wide shot, lethal calm.";;
    fight_03) i2v fight_03 4 "Explosive action: the blades-master blurs forward like a gale, his body a motion-smear, the cicada wing slashing in a wide amber arc of light, the boy is flung backward through the air, his forearm shield plates snapping open, sparks and teal bio-light bursting at the contact point, debris and blood droplets suspended. Fast violent kinetic motion.";;
    fight_04) i2v fight_04 4 "Frozen instant: two faces inches apart, almost completely motionless, the glowing cicada wing stopped a hair from the boy's neck, only a few hair strands and dust particles settling slowly, extreme quiet tension. No camera movement.";;
    fight_05) i2v fight_05 4 "The wounded boy roars with fury, glossy black chitin erupting up his right arm to the shoulder, he throws his first full punch, a shockwave rippling from his fist, a ring of dust blasting outward, debris flying. Wild explosive kinetic energy.";;
    fight_06) i2v fight_06 4 "The black chitin fist smashes against the amber cicada wing, a ring shockwave of amber and teal light detonating at the contact point, concrete cratering below, sparks and glowing membrane shards flying, intense flashing impact, motion blur radiating outward.";;
    fight_07) i2v fight_07 4 "The blades-master stands rooted and utterly unmoved inside a ring of cratered concrete, his robe blasted backward by the fading shockwave, dust settling slowly around him, his cracked cicada wing humming unsteadily. Static camera, epic stillness after the blast.";;
    fight_08) i2v fight_08 4 "The blond man walks away into the orange sunset seen from behind, amber motes of light drifting from his forearm like a dissolving moth, his very long shadow stretching over the fallen dark-haired boy in the foreground, robe blowing in the wind, crows circling the crane. Slow steady shot.";;
    fight_09) i2v fight_09 4 "The fallen boy lies motionless on his back in the crater, the teal glow of his black chitin arm slowly fading, dust drifting through the last light, the edge of a loose tarp fluttering gently nearby, distant city lights flickering on. Very slow camera pull-back, lonely quiet aftermath.";;
    *) echo "unknown shot: $1"; return 1;;
  esac
}

if [ $# -ge 1 ]; then run_one "$1"; else for s in fight_00 fight_01 fight_02 fight_03 fight_04 fight_05 fight_06 fight_07 fight_08 fight_09; do run_one "$s"; done; fi
echo "== i2v batch done  $(date +%H:%M:%S)"
