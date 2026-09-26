#!/bin/bash
# 《9章》30s 打斗试片 — 混音母带。
# 时序来源 script_fight.story / storyboard_fight.md 混音要点：
# - 16.5-16.8s 全床层骤停（sudden_silence，只留其后进场的心跳/微风）
# - 人声不压，BGM baseVolume 0.6，冲击格音效满格
set -u
EP="D:/opensource/movie/dula-story/episodes/bio_armor_academy_s1e1"
A="$EP/assets/audio"
MUS="$A/music"
SFX="$A/sfx"
OUT="$A/fight_mixed.wav"

ffmpeg -y -v error \
  -i "$MUS/furyu_fight_theme.wav" \
  -stream_loop -1 -i "$SFX/wind_gust.wav" \
  -i "$SFX/dusk_cicadas.wav" \
  -i "$A/fight_01_leixiao.mp3" \
  -i "$A/fight_02_bailan.mp3" \
  -i "$SFX/slow_steps_gravel.wav" \
  -i "$SFX/wing_trail_sparks.wav" \
  -i "$SFX/wing_hum_rising.wav" \
  -i "$SFX/cicada_wing_buzz.wav" \
  -i "$SFX/dash_gale.wav" \
  -i "$SFX/chitin_impact.wav" \
  -i "$SFX/debris_scatter.wav" \
  -i "$SFX/heartbeat_core.wav" \
  -i "$SFX/wind_faint.wav" \
  -i "$A/fight_07_leixiao_roar.mp3" \
  -i "$SFX/shockwave_ring.wav" \
  -i "$SFX/ground_crater.wav" \
  -i "$SFX/wing_crack_hum.wav" \
  -i "$SFX/steps_fading.wav" \
  -i "$SFX/wing_retract.wav" \
  -filter_complex "\
[0:a]atrim=0:30,volume=0.6,volume='if(between(t,16.5,16.8),0,1)'[bgm];\
[1:a]atrim=0:30,volume=0.30,volume='if(between(t,16.5,16.8),0,1)'[wind];\
[2:a]atrim=0:29.5,volume=0.20,volume='if(between(t,16.5,16.8),0,1)'[cic];\
[3:a]adelay=300:all=1,volume=1.6[l1];\
[4:a]adelay=5300:all=1,volume=1.6[l2];\
[5:a]adelay=11000:all=1,volume=0.5[s1];\
[6:a]adelay=11600:all=1,volume=0.55[s2];\
[7:a]atrim=0:2,adelay=12000:all=1,volume=0.6[s3];\
[8:a]adelay=13800:all=1,volume=0.9[s4];\
[9:a]adelay=13900:all=1,volume=0.8[s5];\
[10:a]adelay=14100:all=1,volume=1.0[s6];\
[11:a]adelay=14300:all=1,volume=0.7[s7];\
[12:a]adelay=16800:all=1,volume=0.35[s8];\
[13:a]adelay=17600:all=1,volume=0.2[s9];\
[14:a]adelay=19300:all=1,volume=1.6[roar];\
[15:a]adelay=21500:all=1,volume=1.0[s10];\
[16:a]adelay=21700:all=1,volume=0.9[s11];\
[10:a]adelay=21600:all=1,volume=0.9[s12];\
[17:a]adelay=22800:all=1,volume=0.6[s13];\
[1:a]atrim=0:3,adelay=23300:all=1,volume=0.25[s14];\
[18:a]adelay=25800:all=1,volume=0.45[s15];\
[19:a]adelay=26600:all=1,volume=0.5[s16];\
[1:a]atrim=0:3,adelay=27300:all=1,volume=0.3[s17];\
[12:a]adelay=29800:all=1,volume=0.5[s18];\
[bgm][wind][cic][l1][l2][s1][s2][s3][s4][s5][s6][s7][s8][s9][roar][s10][s11][s12][s13][s14][s15][s16][s17][s18]\
amix=inputs=24:duration=longest:normalize=0,atrim=0:30,alimiter=limit=0.95[out]" \
  -map "[out]" -ar 48000 "$OUT"
ffmpeg -y -v error -i "$OUT" -codec:a libmp3lame -q:a 2 "${OUT%.wav}.mp3"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
echo "mixed: $OUT  ${d}s"
