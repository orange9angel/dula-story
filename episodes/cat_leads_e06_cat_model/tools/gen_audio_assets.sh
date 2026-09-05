#!/bin/bash
# E06 audio assets via Seed-Audio 1.0 (single-element mode): 2 new SFX
# (wind_leaves bed, pencil_scratch event) + 1 daytime BGM stem. Reused from
# E05 (already in assets/audio/sfx/): morning_birds, footsteps_grass_soft,
# sketchbook_pages. Prompts avoid flat words; concrete instruments/key/tempo.
# Requires: set -a && source ../../.env.speech && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model"
mkdir -p assets/audio/sfx assets/audio/music tmp

S="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model/assets/audio"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="tools/seedaudio_gen.py"

gen() { # outfile prompt
  local out="$1" prompt="$2"
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  "$PY" "$GEN" --prompt "$prompt" --out "$out" > "tmp/seedaudio_$(basename "$out" .wav).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; else echo "== FAILED $(basename "$out")"; fi
}

# 1. Leaves-in-wind bed (scheduled 0-60s via script.story endTime=60).
gen "$S/sfx/wind_leaves.wav" "生成一段60秒的白天树荫环境音：微风穿过树叶的沙沙声，轻柔起伏但不过猛，安静舒缓，偶尔有很小的草叶摩擦声，无鸟鸣，无音乐，无人声，无突发巨响。"

# 2. Event SFX: pencil sketching (38.0s, 2s).
gen "$S/sfx/pencil_scratch.wav" "生成一段2秒的近距离音效：铅笔在素描纸上游走的沙沙声，运笔流畅有节奏，收尾轻顿一下，干净清晰，无音乐，无人声。"

# 3. BGM stem (whole film; audio_mix.json bgmVolume=0.3 scales the bus).
gen "$S/music/cat_model_theme.wav" "生成一段60秒上午治愈系纯音乐：尤克里里分解和弦打底，木琴和钢琴轮流点缀旋律，C大调，约92 BPM，慵懒明亮像树荫下打盹的猫，结构平稳起伏小，无人声，无鼓组重拍。"

echo "== audio assets done"
