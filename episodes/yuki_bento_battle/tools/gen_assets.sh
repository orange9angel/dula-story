#!/bin/bash
# yuki_bento_battle audio assets via Seed-Audio 1.0.
# BGM 两版选一（episode-scoring 纪律）。Requires:
#   set -a && source .env.speech && set +a   （从 dula-story 根目录）
set -u
cd "D:/opensource/movie/dula-story/episodes/yuki_bento_battle"
mkdir -p assets/audio/music assets/audio/sfx tmp

S="D:/opensource/movie/dula-story/episodes/yuki_bento_battle/assets/audio"
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
#   0-15s   便当登场（轻快得意小调，单簧管+拨弦，p-mp）
#   15-38s  闪电闯入 + 追逐（滑稽快速追逐曲，低音大号+木琴跑动，mf 渐强）
#   38-55s  全员混战（最热闹，钹和定音鼓喜剧重拍，f）
#   55-68s  空腹拍 + 翻车揭底（音乐急停，单簧管呆呆长音 + 拨弦小心翼翼）
#   68-86s  猫退场 + 崩溃（委屈下滑音，p）
#   86-101s 结尾释然（木琴温暖收尾，pp 渐弱）
BGM_PROMPT="生成一段100秒的卡通搞笑动画配乐，场景是：女孩的便当被两只猫惦记引发的满屋追逐闹剧，最后发现便当其实是减肥餐。曲式：0-15秒轻快得意的小调，单簧管旋律加拨弦弦乐伴奏，力度弱到中等偏弱，像早晨得意洋洋展示宝物；15-38秒突然转入滑稽快速追逐曲，低音大号笨拙低音线跑动，木琴密集点缀，定音鼓在转弯处敲喜剧重音，渐强到中强，像猫被追着满屋跑；38-55秒混战高潮，全乐队加入，钹和定音鼓在动作重拍上，力度强但不刺耳，乱中有序的卡通混战感；55-68秒音乐突然刹车，安静一拍后单簧管吹一个呆呆的长音，拨弦小心翼翼试探，像所有人愣住；68-86秒委屈的下滑音，圆号和大号轻轻叹息，力度弱；86-101秒木琴和吉他温暖收尾，旋律轻轻上扬后渐弱到极弱收束，像哭笑不得的释然。G大调，配器：单簧管、拨弦弦乐、低音大号、木琴、圆号、定音鼓、钹、木吉他。约128BPM（追逐段），卡通配乐风格，无人声，无电子音色，动态对比要夸张。"

gen "$S/music/bento_chase_theme_v1.wav" "$BGM_PROMPT"
gen "$S/music/bento_chase_theme_v2.wav" "$BGM_PROMPT"

gen "$S/sfx/bento_pop.wav" "生成一段1秒的卡通音效：便当盒盖子被打开的轻快的啵声，带一点塑料盒的质感，干脆可爱。纯音效，无音乐，无人声。"

gen "$S/sfx/carrot_munch.wav" "生成一段3秒的卡通音效：小孩津津有味啃胡萝卜的咔嚓咔嚓咀嚼声，节奏轻快满足， cartoon 质感。纯音效，无音乐，无人声。"

echo "== audio assets done"
