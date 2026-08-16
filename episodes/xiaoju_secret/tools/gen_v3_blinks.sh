#!/bin/bash
# Lane V3: blink (eyes-closed) variants for xiaoju_secret.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"
T="tmp/gen"

LOCK="严格保持其余所有内容逐像素不变：构图、姿势、角色设计、服装、发型、眉毛、背景、道具、光线与色调。不要重绘整张图，只允许修改眼睛。输出与输入完全相同的尺寸（{SIZE}）PNG"
GIRL_BLINK="局部编辑 image 1：只把少女的双眼改成自然闭合（眨眼瞬间，上下眼睑合拢、睫毛可见，双眼对称），$LOCK"
BOY_BLINK="局部编辑 image 1：只把少年的双眼改成自然闭合（眨眼瞬间，上下眼睑合拢、睫毛可见，双眼对称），$LOCK"
CAT_BLINK="局部编辑 image 1：只把橘猫的双眼改成自然闭合（猫眨眼瞬间，上下眼睑合拢，双眼对称），$LOCK"

gen_blink() { wait_for_files "$2"; gen_run "$1" "$3" "$2"; }

gen_blink frame_04_blink "$T/frame_04.png" "$GIRL_BLINK"
gen_blink frame_05_blink "$T/frame_05.png" "$GIRL_BLINK"
gen_blink frame_09_blink "$T/frame_09.png" "$CAT_BLINK"
gen_blink frame_16_blink "$T/frame_16.png" "$GIRL_BLINK"
gen_blink frame_21_blink "$T/frame_21.png" "$BOY_BLINK"
gen_blink frame_23_blink "$T/frame_23.png" "$GIRL_BLINK"
gen_blink frame_26_blink "$T/frame_26.png" "$GIRL_BLINK"
gen_blink frame_27_blink "$T/frame_27.png" "$BOY_BLINK"
gen_blink frame_29_blink "$T/frame_29.png" "$BOY_BLINK"
gen_blink frame_32_blink "$T/frame_32.png" "$GIRL_BLINK"
gen_blink frame_35_blink "$T/frame_35.png" "$BOY_BLINK"
gen_blink frame_36_blink "$T/frame_36.png" "$BOY_BLINK"
gen_blink frame_39_blink "$T/frame_39.png" "$GIRL_BLINK"

echo "LANE V3 DONE"
