#!/bin/bash
# Lane V2: boy mouth variants + cat meow variants for xiaoju_secret.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"
T="tmp/gen"

LOCK="严格保持其余所有内容逐像素不变：构图、姿势、角色设计、服装、发型、背景、道具、光线与色调。不要重绘整张图，只允许修改嘴部。输出与输入完全相同的尺寸（{SIZE}）PNG"
BHALF="局部编辑 image 1：只把少年的嘴部改成微微张开（说话起音，下颚略开，露出一点点深色口腔），$LOCK"
BOPEN="局部编辑 image 1：只把少年的嘴部改成明显张开（发「啊」音的开口度，下颚自然下降，可见深色口腔内部），$LOCK"
CLOCK="严格保持其余所有内容逐像素不变：构图、姿势、毛色条纹、背景、光线与色调。不要重绘整张图，只允许修改猫的嘴部。输出与输入完全相同的尺寸（{SIZE}）PNG"
CHALF="局部编辑 image 1：只把橘猫的嘴部改成微微张开（喵叫起音，下颚略开，露出一点点深色口腔），$CLOCK"
COPEN="局部编辑 image 1：只把橘猫的嘴部改成明显张开（喵叫峰值，下颚张开，可见深色口腔与上颚），$CLOCK"

for f in 22 27 29 31 36 38; do
  wait_for_files "$T/frame_${f}.png"
  gen_run "frame_${f}_mouth_half" "$BHALF" "$T/frame_${f}.png"
  gen_run "frame_${f}_mouth_open" "$BOPEN" "$T/frame_${f}.png"
done

wait_for_files "$T/frame_25.png"
gen_run frame_25_meow_half "$CHALF" "$T/frame_25.png"
gen_run frame_25_meow_open "$COPEN" "$T/frame_25.png"

echo "LANE V2 DONE"
