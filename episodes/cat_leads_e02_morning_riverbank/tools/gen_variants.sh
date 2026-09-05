#!/bin/bash
# E02 mouth/eye variants — codex local edits only, then auto_lock_variants.py
# feather-locks the changed region back onto the base frame.
# Mouth: half/open for dialogue/meow base frames; Eye: closed for blink frames.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank"
mkdir -p assets/mouth_variants assets/eye_variants tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
K="$A/keyframes"
MV="$A/mouth_variants"
EV="$A/eye_variants"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

EDIT_LOCK="严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，只允许修改指定区域"

mouth() { # base variant desc who
  local base="$1" variant="$2" desc="$3" who="$4"
  echo "== gen mouth ${base}_${variant}"
  codex exec "局部编辑 image 1：只把${who}的嘴部改成${desc}，$EDIT_LOCK。并把成品 PNG 保存到 $MV/${base}_${variant}.png。" $FLAGS -i "$K/${base}.png" > "tmp/mouth_${base}_${variant}.log" 2>&1
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== ok ${base}_${variant}"; else echo "== MISSING ${base}_${variant}"; fi
}

eyes() { # base who
  local base="$1" who="$2"
  echo "== gen eyes ${base}_closed"
  codex exec "局部编辑 image 1：只把${who}的双眼改成闭合（眼皮垂下成两条弧线），$EDIT_LOCK。并把成品 PNG 保存到 $EV/${base}_closed.png。" $FLAGS -i "$K/${base}.png" > "tmp/eyes_${base}.log" 2>&1
  if [ -s "$EV/${base}_closed.png" ]; then echo "== ok ${base}_closed"; else echo "== MISSING ${base}_closed"; fi
}

# 少女口型（独白镜头：01 床上 / 03 开门 / 06 爬楼 / 11 望河 / 16 侧脸收尾）
for f in frame_01 frame_03 frame_06 frame_11 frame_16; do
  mouth "$f" half "微张（half-open，唇间露出一点口腔）" "少女"
  mouth "$f" open "自然张开（说话时的开口，露出一点口腔和牙齿）" "少女"
done

# 猫口型（猫叫镜头：02 窗台 / 05 石阶 / 13 石栏）
for f in frame_02 frame_05 frame_13; do
  mouth "$f" half "微张（猫叫起始，唇间露出一点口腔）" "橘猫"
  mouth "$f" open "张开（猫叫，露出嘴巴和小舌头）" "橘猫"
done

# 眨眼（少女：01/03/06/11/14/16；猫：02/05/10/13）
for f in frame_01 frame_03 frame_06 frame_11 frame_14 frame_16; do eyes "$f" "少女"; done
for f in frame_02 frame_05 frame_10 frame_13; do eyes "$f" "橘猫"; done

echo "== variants done"
