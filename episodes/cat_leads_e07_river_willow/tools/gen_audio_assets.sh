#!/bin/bash
# E07 audio assets via Seed-Audio 1.0: 1 event SFX (fishing_cast) + BGM
# THREE versions (first run of the 三版选一 discipline in
# dula-skills/episode-scoring/references/composition-prompt-craft.md).
# Reused SFX from E05/E06 already in assets/audio/sfx/. 
# Requires: set -a && source ../../.env.speech && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow"
mkdir -p assets/audio/sfx assets/audio/music tmp

S="D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow/assets/audio"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="tools/seedaudio_gen.py"

gen() { # outfile prompt
  local out="$1" prompt="$2"
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  "$PY" "$GEN" --prompt "$prompt" --out "$out" > "tmp/seedaudio_$(basename "$out" .wav).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; else echo "== FAILED $(basename "$out")"; fi
}

# 1. Event SFX: fishing rod cast (25.2s).
gen "$S/sfx/fishing_cast.wav" "生成一段2秒音效：一根长竹钓竿甩出的挥空声，鱼线划出一道弧，最后浮漂轻巧地落入水面发出一声小而清脆的水声，安静河边的近距离收音，无音乐，无人声。"

# 2-4. BGM three versions, identical structured prompt (午后柳滩垂钓):
BGM_PROMPT="生成一段60秒的治愈系动画配乐，场景是午后柳树河边垂钓闲谈。曲式：0-10秒尼龙弦吉他独奏引入主题动机（4到6音的简短歌唱性旋律，力度很弱pp）；10-25秒钢琴加入与吉他问答，弦乐群轻轻托底进入；25-45秒主题在弦乐上展开，长笛短句提亮，力度渐强到中等mf，乐句之间留有呼吸空隙；45-60秒弦乐退场，吉他独奏再现主题，渐弱收束到极弱。F大调为主，借用IVmaj7和弦增加暖意，中段可有短暂小调色彩。配器：尼龙弦吉他、钢琴、弦乐群、长笛。自由速度感，约68 BPM，无鼓组，无电子音色，无人声，无突然爆音，不要把声音填满。"
gen "$S/music/willow_theme_v1.wav" "$BGM_PROMPT"
gen "$S/music/willow_theme_v2.wav" "$BGM_PROMPT"
gen "$S/music/willow_theme_v3.wav" "$BGM_PROMPT"

echo "== audio assets done"
