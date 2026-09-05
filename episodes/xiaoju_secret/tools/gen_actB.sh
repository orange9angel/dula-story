#!/bin/bash
# Lane B: frames 10-18, dusk homecoming / alley chase. Serial codex imagegen.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"

G="assets/girl_reference.png"
C="assets/cat_reference.png"
T="tmp/gen"

STYLE="Style: polished 2D Japanese animation, clean cel shading, crisp line art, warm realistic anime film lighting. Composition: 16:9 landscape. Avoid: extra people, extra cats, duplicate limbs, malformed hands, text, captions, logos, watermark, signature, photorealism, 3D render."
SIZE="输出与输入完全相同的尺寸（1672x941）PNG"
GIRL="the same 16-year-old girl as the reference: waist-length straight deep-blue hair, straight bangs, large amber eyes, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, exactly one navy school bag"
CAT="the same orange tabby cat as the reference: darker orange stripes, white chest patch, four white paws, green eyes, small slim body, dry fluffy fur"
ALLEY="a narrow residential alley in Japan at golden sunset: low houses, a concrete block wall, utility poles and wires, long warm orange shadows"

# f10 — dusk: girl opens the door, back view, sees curtain billowing
gen_run frame_10 "Image 1 is the girl reference. Draw a small Japanese apartment room in warm orange dusk light, seen from just inside the entrance: $GIRL stands at the opened sliding door with her back to the camera, school bag still on her shoulder, looking into the room where a sheer curtain billows inward from a window left open a crack; the sunny windowsill is empty, no cat anywhere. Quiet 'something is off' mood. $STYLE Over-the-shoulder wide view from behind the girl. $SIZE" "$G"

# f11 — closeup: window gap + one orange cat hair on the sill
gen_run frame_11 "Image 1 shows the same room at dusk. Draw a close-up of the slightly open window of the same room: a narrow gap in the window frame, the sheer curtain lifting in the breeze, and exactly one tiny orange cat hair catching the golden light on the empty windowsill. No people, no cats. $STYLE Tight close-up, dusk light. $SIZE" "$T/frame_10.png"

# f12 — stairwell: girl hurries downstairs, back view
gen_run frame_12 "Image 1 is the girl reference. Draw $GIRL hurrying down the plain concrete stairs of a small apartment building, seen from behind and above, school bag bouncing on her shoulder, warm dusk light from a stairwell window. $STYLE Full body, high-angle back view. $SIZE" "$G"

# f13 — alley mouth at sunset: orange tail vanishing around the corner
gen_run frame_13 "Image 1 is the cat reference. Draw $ALLEY. At a corner of the block wall, only the tail tip and hindquarters of $CAT are visible as it slips around the corner and out of sight. $STYLE Wide shot down the alley, eye level. $SIZE" "$C"

# f14 — girl running into the alley (walk/run cycle base)
gen_run frame_14 "Image 1 is the girl reference, image 2 is the alley. Draw $GIRL running into the same alley as image 2, mid-stride in a run: one leg extended forward touching the ground, the other trailing behind, long blue hair and skirt flowing with motion, school bag held tight on one shoulder, determined expression, sunset light. $STYLE Full body, eye-level side-three-quarter view, running toward the right of the frame. $SIZE" "$G" "$T/frame_13.png"

# f15 — cat walking along the top of the wall, low angle, backlight
gen_run frame_15 "Image 1 is the cat reference, image 2 is the alley. Draw $CAT walking lightly along the top of the concrete block wall of the same alley as image 2, one front paw lifted mid-step, tail high, silhouetted against the golden sunset sky, seen from a low camera angle below the wall. $STYLE Low-angle medium shot, walking toward the right. $SIZE" "$C" "$T/frame_13.png"

# f16 — girl catching her breath, hands on knees, looking up (lip-sync base)
gen_run frame_16 "Image 1 is the girl reference, image 2 is the alley. Draw $GIRL in the same alley as image 2, bent over slightly with both hands on her knees catching her breath, looking up ahead toward the right of the frame, cheeks flushed from running, mouth relaxed and fully closed, both eyes open and clearly visible, sunset light. $STYLE Medium shot, eye level. $SIZE" "$G" "$T/frame_13.png"

# f17 — cat on the wall looks back over its shoulder
gen_run frame_17 "Image 1 is the cat reference, image 2 is the alley. Draw $CAT standing on top of the concrete block wall of the same alley as image 2, body facing away but head turned back over its shoulder looking down toward the camera, tail flicking, golden backlight, as if waiting for someone. $STYLE Low-angle medium shot. $SIZE" "$C" "$T/frame_13.png"

echo "LANE B DONE"
