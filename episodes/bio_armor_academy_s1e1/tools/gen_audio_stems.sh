#!/bin/bash
# 《9章》30s 打斗试片 — Seed-Audio 1.0 BGM/SFX 批量生成。
# 单要素模式（纯音乐/纯音效），保护分轨混音。skip-if-exists。
# 用法: set -a; source dula-story/.env.speech; set +a; bash gen_audio_stems.sh
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
GEN="D:/opensource/movie/dula-story/episodes/yuki_bento_battle/tools/seedaudio_gen.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
MUS="$EP/assets/audio/music"
SFX="$EP/assets/audio/sfx"
LOGD="$EP/tmp/audio_stems"
mkdir -p "$MUS" "$SFX" "$LOGD"

run() {
  local dir="$1"; local name="$2"; local prompt="$3"
  if [ -s "$dir/$name.wav" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name  $(date +%H:%M:%S)"
  "$PY" "$GEN" --prompt "$prompt" --out "$dir/$name.wav" > "$LOGD/$name.log" 2>&1
  if [ -s "$dir/$name.wav" ]; then echo "== ok $name  $(date +%H:%M:%S)"; else echo "== MISSING $name (see $LOGD/$name.log)"; fi
}

# ---- BGM ----
run "$MUS" furyu_fight_theme "生成一段30秒的纯音乐配乐，无人声无音效：日式太鼓沉重底击加紧绷的小提琴固定音型加低频电子脉冲，A小调，肃杀紧张的动漫生死斗风格，节奏从120BPM逐渐加快到138BPM，在第16秒处全体乐器骤停半拍的静默再猛烈爆发，结尾2秒渐弱收束"

# ---- 环境 ----
run "$SFX" dusk_cicadas "生成一段30秒纯环境音：夏日傍晚的寒蝉鸣叫，此起彼伏，忽远忽近，带一丝不祥的寂静感，远处极微弱的城市底噪，无人声无音乐"
run "$SFX" wind_gust "生成一段6秒纯音效：废弃建筑工地的大风阵风，吹动尘土和一块松动的篷布猎猎作响，无人声无音乐"
run "$SFX" wind_faint "生成一段4秒纯音效：极其微弱的风声，几乎静止的空气里一丝流动，无人声无音乐"

# ---- 逼近段 ----
run "$SFX" slow_steps_gravel "生成一段5秒纯音效：碎石地面上缓慢而沉重的皮靴脚步声，一步一顿，充满压迫感，无人声无音乐"
run "$SFX" wing_trail_sparks "生成一段4秒纯音效：一片高频振动的薄刃尖拖过粗糙混凝土表面，连续的尖锐摩擦声夹杂火花溅射的噼啪声，无人声无音乐"
run "$SFX" wing_hum_rising "生成一段5秒纯音效：类似巨型蝉翼的高频嗡鸣由极弱逐渐增强，危险逼近的感觉，结尾接近刺耳，无人声无音乐"

# ---- 风拍 ----
run "$SFX" cicada_wing_buzz "生成一段3秒纯音效：巨型蝉翼高频振动嗡鸣突然爆发，尖锐刺耳带生物质感，像昆虫放大一百倍，无人声无音乐"
run "$SFX" dash_gale "生成一段2秒纯音效：极速突进的破空风切声，由远及近一闪而过，无人声无音乐"
run "$SFX" chitin_impact "生成一段2秒纯音效：坚硬的几丁质甲壳被重重击中，生物甲壳的闷响夹杂细微壳裂声，不是金属声，无人声无音乐"
run "$SFX" debris_scatter "生成一段3秒纯音效：碎石和混凝土碎屑被炸飞后四散溅落，无人声无音乐"

# ---- 林拍/收尾 ----
run "$SFX" heartbeat_core "生成一段3秒纯音效：缓慢沉重的生物心跳两声，低频脉动带轻微发光的嗡鸣混响，像某种活体核心在跳动，无人声无音乐"

# ---- 火拍 ----
run "$SFX" shockwave_ring "生成一段3秒纯音效：环形冲击波猛烈爆发，低频轰鸣叠加高频嘶鸣，空气被撕开的质感，无人声无音乐"
run "$SFX" ground_crater "生成一段3秒纯音效：混凝土地面环形塌陷崩裂，沉重的碎裂声和落石声，无人声无音乐"

# ---- 山拍 ----
run "$SFX" wing_crack_hum "生成一段5秒纯音效：巨型蝉翼的高频嗡鸣变得不稳定，带着细微的碎裂杂音和颤抖，像受伤的昆虫翅膀，无人声无音乐"

# ---- 退场 ----
run "$SFX" steps_fading "生成一段5秒纯音效：皮靴脚步声在碎石地上渐行渐远，最终消失在风里，无人声无音乐"
run "$SFX" wing_retract "生成一段2秒纯音效：巨大的昆虫膜翅快速收拢折叠回手臂，生物膜摩擦的窸窣声，无人声无音乐"

echo "== audio stems batch done  $(date +%H:%M:%S)"
ls -la "$MUS" "$SFX"
