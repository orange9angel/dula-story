#!/bin/bash
# Lane A: frames 00-09, home / morning. Serial codex imagegen.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"

G="assets/girl_reference.png"
C="assets/cat_reference.png"
K="assets/keyframes"
T="tmp/gen"

STYLE="Style: polished 2D Japanese animation, clean cel shading, crisp line art, warm Makoto Shinkai inspired lighting. Composition: 16:9 landscape. Avoid: extra people, extra cats, duplicate limbs, malformed hands, text, captions, logos, watermark, signature, photorealism, 3D render."
SIZE="输出与输入完全相同的尺寸（1672x941）PNG"
GIRL="the same 16-year-old girl as the reference: waist-length straight deep-blue hair, straight bangs, large amber eyes, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, exactly one navy school bag"
CAT="the same orange tabby cat as the reference: darker orange stripes, white chest patch, four white paws, green eyes, small slim body, fur now dry and fluffy"

# f00 — empty room, morning
gen_run frame_00 "Image 1 is the style reference from the same series. Draw an empty small Japanese apartment room in soft golden morning sunlight: a window with light sheer curtains and small green plants on the sill, a wooden sliding door, a low desk, a ceramic cat bowl and a small jar of dried fish snacks in the corner, exactly one navy school bag resting by the desk. Warm quiet lived-in atmosphere. No people, no cats. $STYLE Eye-level wide establishing view of the room. $SIZE" "$G"

# f01 — cat sleeping on the sunny windowsill
gen_run frame_01 "Image 1 is the cat reference, image 2 is the room. Draw $CAT, curled up asleep on the sunny windowsill of the same room as image 2, soft golden morning light on its fur, sheer curtain and green plants beside it, eyes closed, peaceful. $STYLE Medium shot, eye level. $SIZE" "$C" "$T/frame_00.png"

# f02 — girl putting on shoes at the genkan
gen_run frame_02 "Image 1 is the girl reference, image 2 is the room. Draw $GIRL, at the small entryway (genkan) of the same room as image 2 in morning light: she is crouching slightly to put on one black loafer, the navy school bag slung on one shoulder, gentle expression. $STYLE Full body visible, eye-level three-quarter view. $SIZE" "$G" "$T/frame_00.png"

# f03 — cat on the door mat looking up at her, low angle
gen_run frame_03 "Image 1 is the cat reference, image 2 shows the girl at the entryway of the same apartment. Draw $CAT, sitting upright on a small door mat at the same entryway, looking up attentively (as if seeing someone off), morning light from the doorway. No people visible. $STYLE Low camera angle near the floor, medium close shot. $SIZE" "$C" "$T/frame_02.png"

# f04 — girl crouches and pets the cat
gen_run frame_04 "Image 1 is the girl reference, image 2 is the cat reference. Draw $GIRL, crouching down at the apartment entryway in morning light, gently petting the head of $CAT with one hand; the cat squints its eyes happily, school bag set on the floor beside her. Warm tender mood. $STYLE Medium close shot, slightly high angle. $SIZE" "$G" "$C"

# f05 — closeup: girl's gentle smiling face (lip-sync base, mouth closed)
gen_run frame_05 "Image 1 is the girl reference, image 2 shows her crouching and petting the cat. Draw a close-up portrait of $GIRL, crouching in warm morning light, looking slightly downward toward a cat below the frame, a gentle warm smile, mouth relaxed and fully closed, both eyes open and clearly visible, face unobstructed by hair. $STYLE Head-and-shoulders close-up, eye level. $SIZE" "$G" "$T/frame_04.png"

# f06 — cat extreme closeup, eyes closed, purring
gen_run frame_06 "Image 1 is the cat reference. Draw an extreme close-up of the face of $CAT, eyes closed in bliss, mouth relaxed in a tiny content smile, being petted (a girl's fingers just touching the top of its head from above), warm morning light. $STYLE Tight face close-up. $SIZE" "$C"

# f07 — girl waves goodbye at the doorway, back view
gen_run frame_07 "Image 1 is the girl reference. Draw $GIRL seen from behind at the open apartment door in morning light: one hand on the sliding door, other hand raised in a small goodbye wave back into the room, school bag on her shoulder, about to step out. $STYLE Full body, back three-quarter view from inside the room. $SIZE" "$G"

# f08 — cat on the windowsill gazing outside, side view
gen_run frame_08 "Image 1 is the cat reference, image 2 shows the same windowsill. Draw $CAT sitting upright on the sunny windowsill of image 2, gazing intently outside through the glass, side profile, tail curled, ears perked with quiet purpose, morning light. $STYLE Medium shot, side view. $SIZE" "$C" "$T/frame_01.png"

# f09 — extreme closeup: cat eyes reflecting the sky, thoughtful (blink base)
gen_run frame_09 "Image 1 is the cat reference. Draw an extreme close-up of the eyes and upper face of $CAT, wide green eyes reflecting a bright blue morning sky and rooftops outside the window, a thoughtful longing mood, both eyes fully open and symmetrical. $STYLE Tight eye-level close-up. $SIZE" "$C"

echo "LANE A DONE"
