#!/bin/bash
# E10 BGM via Seed-Audio 1.0: waiting_rain_theme three versions
# (三版选一 discipline in
# dula-skills/episode-scoring/references/composition-prompt-craft.md).
# Requires: run from dula-story root with
#   set -a && source .env.speech && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e10_waiting_rain"
mkdir -p assets/audio/music tmp

S="D:/opensource/movie/dula-story/episodes/cat_leads_e10_waiting_rain/assets/audio"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="tools/seedaudio_gen.py"

gen() { # outfile prompt
  local out="$1" prompt="$2"
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  "$PY" "$GEN" --prompt "$prompt" --out "$out" > "tmp/seedaudio_$(basename "$out" .wav).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; else echo "== FAILED $(basename "$out")"; cat "tmp/seedaudio_$(basename "$out" .wav).log"; fi
}

# Sections aligned to the E10 story arc:
#   0-14s  riverbank wind rising  (piano solo motif, pp, unease under warmth)
#  14-26s  hurrying through the lane (xylophone/plucked raindrop dots, flowing)
#  26-62s  sheltering under the awning (strings bed, theme unfolds, <=mf)
#  62-76s  clouds part, golden light (flute/oboe lift, theme returns, fade to pp)
BGM_PROMPT="生成一段76秒的治愈系动画配乐，场景是夏日河边小镇忽遇阵雨：少年少女跟着一只熟门熟路的猫跑到屋檐下，同躲一场雨，雨停时云边透出金光。情绪底色温暖安宁。曲式：0-14秒钢琴独奏呈现主题动机（4到6音的简短歌唱性旋律，力度很弱pp，带一丝天气转阴的犹豫但不失温暖）；14-26秒木琴与拨弦点缀进入，像稀疏雨滴落在巷子的石板上，节奏稍微流动起来，渐强但不到激烈；26-62秒弦乐群轻轻托底进入，主题在弦乐上展开，长笛短句偶尔应答，乐句之间留有呼吸空隙，力度渐强到中等mf即收住，像躲在屋檐下听雨的安全感，这是全曲最长的安宁段；62-76秒弦乐渐退，长笛与双簧管提亮，主题在钢琴上再现，温暖上扬后渐弱收束到极弱pp，尾音留足余韵。C大调为主，借用IVmaj7和弦增加暖意，中段可有短暂小调色彩像云影掠过。配器：钢琴、木琴、尼龙弦吉他、弦乐群、长笛、双簧管。动态范围要大：开头pp，中段mf，结尾回pp渐弱收束。自由速度感（rubato），约66到72 BPM，无鼓组，无电子音色，无人声，无突然爆音，不要把声音填满。"

gen "$S/music/waiting_rain_theme_v1.wav" "$BGM_PROMPT"
gen "$S/music/waiting_rain_theme_v2.wav" "$BGM_PROMPT"
gen "$S/music/waiting_rain_theme_v3.wav" "$BGM_PROMPT"

echo "== bgm assets done"
