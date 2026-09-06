#!/bin/bash
# E08 audio assets via Seed-Audio 1.0: 2 event SFX (wind_gust, paper_flutter)
# + BGM THREE versions (三版选一 discipline in
# dula-skills/episode-scoring/references/composition-prompt-craft.md).
# Reused SFX already copied into assets/audio/sfx/:
#   morning_birds / river_water / wind_leaves (E07), pencil_scratch (E06).
# Requires: set -a && source ../../.env.speech && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page"
mkdir -p assets/audio/sfx assets/audio/music tmp

S="D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page/assets/audio"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="tools/seedaudio_gen.py"

gen() { # outfile prompt
  local out="$1" prompt="$2"
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  "$PY" "$GEN" --prompt "$prompt" --out "$out" > "tmp/seedaudio_$(basename "$out" .wav).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; else echo "== FAILED $(basename "$out")"; fi
}

# 1. Event SFX: a gust of wind building then fading (16.0s, 风声渐强).
gen "$S/sfx/wind_gust.wav" "生成一段3秒音效：午后河边忽然刮起一阵风，风声由弱渐强再减弱，带树叶哗啦摇动和草叶摩擦声，近距离户外收音，安静自然环境，无音乐，无人声。"

# 2. Event SFX: paper page fluttering loose (18.5s, 纸页颤动).
gen "$S/sfx/paper_flutter.wav" "生成一段3秒音效：一张速写纸被风掀起，纸张轻轻颤动、翻卷、拍打的声音，轻盈单薄，近距离收音，安静环境，无音乐，无人声。"

# 3-5. BGM three versions, identical structured prompt (温暖午后治愈系):
BGM_PROMPT="生成一段60秒的治愈系动画配乐，场景是温暖午后的河边，一张画被风吹走又释然放手，怅然而暖。曲式：0-10秒钢琴独奏引入主题动机（4到6音的简短歌唱性旋律，力度很弱pp）；10-25秒尼龙弦吉他加入与钢琴问答，弦乐群轻轻托底进入；25-45秒主题在弦乐上展开，长笛短句提亮，力度渐强到中等mf，乐句之间留有呼吸空隙；45-60秒弦乐退场，钢琴独奏再现主题，渐弱收束到极弱。C大调为主，借用IVmaj7和弦增加暖意，中段可有短暂小调色彩带一点怅然。配器：钢琴、尼龙弦吉他、弦乐群、长笛。自由速度感，约66 BPM，无鼓组，无电子音色，无人声，无突然爆音，不要把声音填满。"
gen "$S/music/drifting_theme_v1.wav" "$BGM_PROMPT"
gen "$S/music/drifting_theme_v2.wav" "$BGM_PROMPT"
gen "$S/music/drifting_theme_v3.wav" "$BGM_PROMPT"

echo "== audio assets done"
