#!/bin/bash
# OP 主题歌抽卡：v4.3 锁参数，3 候选；mood 枚举失败则自动降级无 mood
set -u
cd "$(dirname "$0")/../../.."
PY=.venv/Scripts/python.exe
GEN=episodes/yuki_beat_ad/tools/song_gen.py
LYR=episodes/stardust_clad_op/config/op_lyrics.txt
OUTDIR=episodes/stardust_clad_op/assets/audio/music
MOOD_OK=1
for i in 1 2 3; do
  ARGS="--via-relay --lyrics-file $LYR --model-version v4.3 --genre Rock --gender Male --tempo Vivace --duration 30 --format wav --out $OUTDIR/op_song_c$i.wav --timeout 560"
  if [ "$MOOD_OK" = "1" ]; then
    if ! $PY $GEN $ARGS --mood Passionate; then
      echo "[gen_op_song] mood=Passionate rejected, falling back to no-mood" 
      MOOD_OK=0
    fi
  fi
  if [ "$MOOD_OK" = "0" ]; then
    $PY $GEN $ARGS || echo "[gen_op_song] candidate $i FAILED"
  fi
done
ls -la $OUTDIR/
