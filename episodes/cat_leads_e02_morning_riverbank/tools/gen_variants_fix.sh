#!/bin/bash
# E02 fix round: redo the 16 variants that qwen/wanx/procedural all failed on
# (girl mouths shout-size, girl blinks squint, cat frame_05/10 blinks open) with
# codex local edits — the proven E01 path. Run after codex quota reset.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank"
mkdir -p assets/mouth_variants assets/eye_variants tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
K="$A/keyframes"
MV="$A/mouth_variants"
EV="$A/eye_variants"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

EDIT_LOCK="严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，只允许修改指定区域"

mouth() { # base variant desc
  local base="$1" variant="$2" desc="$3"
  echo "== gen mouth ${base}_${variant}"
  codex exec "局部编辑 image 1：只把少女的嘴部改成${desc}，$EDIT_LOCK。并把成品 PNG 保存到 $MV/${base}_${variant}.png。" $FLAGS -i "$K/${base}.png" > "tmp/fix_mouth_${base}_${variant}.log" 2>&1
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== ok ${base}_${variant}"; else echo "== MISSING ${base}_${variant}"; fi
}

eyes() { # base who extra
  local base="$1" who="$2" extra="${3:-}"
  echo "== gen eyes ${base}_closed"
  codex exec "局部编辑 image 1：只把${who}的双眼改成闭合（眼皮垂下成两条弧线${extra}），$EDIT_LOCK。并把成品 PNG 保存到 $EV/${base}_closed.png。" $FLAGS -i "$K/${base}.png" > "tmp/fix_eyes_${base}.log" 2>&1
  if [ -s "$EV/${base}_closed.png" ]; then echo "== ok ${base}_closed"; else echo "== MISSING ${base}_closed"; fi
}

for f in frame_03 frame_06 frame_11 frame_16; do
  mouth "$f" half "微张（half-open，唇间露出一点口腔）"
  mouth "$f" open "自然张开（说话时的开口，露出一点口腔和牙齿）"
done

eyes frame_01 "少女" "，她本来就闭着一只眼，把睁着的那只也闭上"
eyes frame_03 "少女"
eyes frame_06 "少女"
eyes frame_11 "少女"
eyes frame_14 "少女"
eyes frame_16 "少女"
eyes frame_05 "橘猫"
eyes frame_10 "橘猫"

echo "== fix variants done"
