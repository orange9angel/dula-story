#!/bin/bash
# E05 audio assets via Seed-Audio 1.0 (single-element mode only, per the
# direct-episode-audio discipline): 1 ambience bed + 2 event SFX + 1 BGM stem.
# Prompts avoid flat words (beatcut lesson: "激烈/动感" yields flat output) and
# state concrete instruments, key, tempo and mood anchors.
# Requires: set -a && source ../../../.env.speech && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch"
mkdir -p assets/audio/sfx assets/audio/music tmp

S="D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch/assets/audio"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="tools/seedaudio_gen.py"

gen() { # outfile prompt
  local out="$1" prompt="$2"
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  "$PY" "$GEN" --prompt "$prompt" --out "$out" > "tmp/seedaudio_$(basename "$out" .wav).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; else echo "== FAILED $(basename "$out")"; fi
}

# 1. Morning ambience bed (scheduled 0-60s via script.story endTime=60).
gen "$S/sfx/morning_birds.wav" "生成一段60秒的夏日清晨郊外环境音：稀疏清脆的麻雀和白头翁鸣叫，间隔自然，偶尔远处一两声回应，整体安静清新平稳，无音乐，无人声，无车声，无突发巨响。"

# 2. Event SFX: sketchbook page flips (42.0s, trimmed to 2.6s by SFX_TRIM).
gen "$S/sfx/sketchbook_pages.wav" "生成一段3秒的近距离音效：一本纸质速写本被轻轻翻动两三次，纸张摩擦声干净清晰，节奏自然，无音乐，无人声，无环境噪声。"

# 3. Event SFX: bird flock flyby (53.5s, trimmed to 3.5s by SFX_TRIM).
gen "$S/sfx/birds_flyby.wav" "生成一段4秒音效：一小队鸟振翅从近处掠过，翅膀扑动声由远及近再远去，带一两声短促清脆的鸟鸣，清晨氛围，无音乐，无人声。"

# 4. BGM stem (whole film; audio_mix.json bgmVolume=0.3 scales the bus).
gen "$S/music/morning_sketch_theme.wav" "生成一段60秒清晨治愈系纯音乐：明亮的木吉他分解和弦打底，轻快的钢琴旋律点缀，G大调，约85 BPM，温暖清新像夏日清晨的河边微风，结构平稳起伏小，无人声，无鼓组重拍，无电子音色。"

echo "== audio assets done"
