#!/bin/bash
# Lane V4: action in-betweens (run cycle alt + cat walk alt) for xiaoju_secret.
# Lessons from rainy_rooftop_cat walk fixes: alternate contact pose with a
# passing pose (lifted foot hangs naturally, shoe tip down), spell out exactly
# which leg is forward, and lock the hand/prop anchoring explicitly.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"
T="tmp/gen"

SIZE_TAIL="输出与输入完全相同的尺寸（{SIZE}）PNG"

wait_for_files "$T/frame_14.png" "$T/frame_15.png"

# run_alt: frame_14 has one leg extended forward touching ground, the other
# trailing. The alt frame is the passing pose between strides.
gen_run run_alt "Image 1 shows a girl mid-run. Draw the SAME composition and character, but with the opposite run phase: the leg that was extended forward is now lifted and passing under the body (knee bent, foot off the ground, shoe tip pointing down), and the leg that was trailing behind is now planted under her. Keep the same camera, pose energy, flowing hair and skirt direction, school bag on the same shoulder, alley background and sunset light unchanged. Full body visible. $SIZE_TAIL" "$T/frame_14.png"

# catwalk_alt: frame_15 has one front paw lifted mid-step; swap the paw phase.
gen_run catwalk_alt "Image 1 shows a cat walking along a wall top. Draw the SAME composition and cat, but with the opposite walk phase: the front paw that was lifted is now placed on the wall, and the other front paw is now lifted passing forward (relaxed, dangling naturally). Keep the same low camera angle, backlight, tail position and alley background unchanged. $SIZE_TAIL" "$T/frame_15.png"

echo "LANE V4 DONE"
