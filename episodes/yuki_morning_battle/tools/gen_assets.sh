#!/bin/bash
# yuki_morning_battle audio assets via Seed-Audio 1.0.
# BGM 两版选一（dula-skills/episode-scoring/references/composition-prompt-craft.md
# 的三版选一纪律，本片缩短为两版）。
# Requires: run from dula-story root with
#   set -a && source .env.speech && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/yuki_morning_battle"
mkdir -p assets/audio/music assets/audio/sfx tmp

S="D:/opensource/movie/dula-story/episodes/yuki_morning_battle/assets/audio"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="tools/seedaudio_gen.py"

gen() { # outfile prompt
  local out="$1" prompt="$2"
  if [ -s "$out" ]; then echo "== skip $(basename "$out") (exists)"; return 0; fi
  echo "== gen $(basename "$out")"
  "$PY" "$GEN" --prompt "$prompt" --out "$out" > "tmp/seedaudio_$(basename "$out" .wav).log" 2>&1
  if [ -s "$out" ]; then echo "== ok $(basename "$out")"; else echo "== FAILED $(basename "$out")"; cat "tmp/seedaudio_$(basename "$out" .wav).log"; fi
}

# 分段对齐剧本结构：
#   0-8s   赖床梦话（拨弦蹑手蹑脚 + 单簧管懒洋洋，pp）
#   8-15s  咕噜号登场（木琴跳进 + 圆号滑音，得意进行曲）
#   15-29s 晨间兵荒马乱（全乐队滑稽快段，大号低音线 + 喜剧重拍，mf）
#   29-33s 年糕揭穿"今天周六"（音乐急停大喘气 + 单簧管呆长音）
#   33-50s 崩溃与逐客（拨弦委屈回来，p）
#   50-62s 收尾闹剧（快速上扬 + 齐奏重音鞠躬收束）
BGM_PROMPT="生成一段62秒的卡通搞笑动画配乐，场景是清晨女孩赖床、被机器人和胖猫折腾的闹剧。曲式：0-8秒拨弦弦乐蹑手蹑脚的短动机，单簧管懒洋洋应答，力度很弱pp，像还没睡醒的房间；8-15秒木琴跳进，节奏加快，圆号滑稽滑音点缀，渐强到中等，像机器人得意洋洋登场；15-29秒全乐队滑稽快节奏段落，低音大号走笨拙低音线，定音鼓和钹在动作重音上敲喜剧重拍，力度中强mf，像兵荒马乱的晨间冲刺；29-33秒音乐突然刹车，留一个大喘气式停顿，单簧管吹一个呆呆的长音，像被当场泼冷水；33-50秒拨弦动机懒洋洋回来，带委屈的下滑音，力度回到弱p；50-62秒木琴和圆号快速收尾上扬，最后一秒一个滑稽的全体齐奏重音加钹轻碰收束，像闹剧落幕后鞠躬。F大调，配器：拨弦弦乐、单簧管、木琴、圆号、低音大号、定音鼓、钹。约120BPM，卡通配乐风格，无人声，无电子音色，动态对比要夸张：pp到mf再到突停。"

gen "$S/music/morning_battle_theme_v1.wav" "$BGM_PROMPT"
gen "$S/music/morning_battle_theme_v2.wav" "$BGM_PROMPT"

gen "$S/sfx/alarm_clock.wav" "生成一段4秒的卡通闹钟音效：经典双铃闹钟急促刺耳的叮铃铃铃连续响铃，节奏密集，金属铃质感，音量饱满，第四秒自然衰减收尾。纯音效，无音乐，无人声。"

gen "$S/sfx/record_scratch.wav" "生成一段2秒的卡通喜剧音效：黑胶唱片播放中被猛然刹停的吱嘎刮擦声，音高快速下滑，紧接一拍滑稽的闷响，像闹剧突然冷场。纯音效，无音乐，无人声。"

echo "== audio assets done"
