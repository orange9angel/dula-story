#!/bin/bash
# Lane C: frames 19-41, riverside meeting / ending. Serial codex imagegen.
# Requires tmp/gen/boy_reference.png and lane B's frame_13/frame_18 to exist.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"

G="assets/girl_reference.png"
C="assets/cat_reference.png"
B="tmp/gen/boy_reference.png"
T="tmp/gen"

STYLE="Style: polished 2D Japanese animation, clean cel shading, crisp line art, warm Makoto Shinkai inspired lighting. Composition: 16:9 landscape. Avoid: extra people, extra cats, duplicate limbs, malformed hands, text, captions, logos, watermark, signature, photorealism, 3D render."
SIZE="输出与输入完全相同的尺寸（1672x941）PNG"
GIRL="the same 16-year-old girl as the reference: waist-length straight deep-blue hair, straight bangs, large amber eyes, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, exactly one navy school bag"
CAT="the same orange tabby cat as the reference: darker orange stripes, white chest patch, four white paws, green eyes, small slim body, dry fluffy fur"
BOY="the same 17-year-old boy as the reference: short black slightly messy hair, dark gray eyes, white short-sleeve school shirt, navy trousers, white sneakers, gentle quiet face"
RIVER="a sunlit riverbank in golden late-afternoon light: green grassy slope, concrete steps, the river sparkling gold behind"

# Lane C starts with the riverside establishing shot; it needs lane B's alley
# frame (frame_13) as its style anchor, so wait for it.
echo "== waiting for lane B frame_13.png"
while [ ! -s "$T/frame_13.png" ]; do sleep 15; done

# f18 — the alley opens onto the riverside: golden riverbank wide shot
gen_run frame_18 "Image 1 is the alley. Draw the end of the same alley as image 1 opening onto a wide sunlit riverbank: green grassy slope, a row of concrete steps leading down, the river sparkling gold in the late-afternoon sun, a few small clouds, warm breeze mood. No people, no cats. $STYLE Wide establishing shot from inside the alley mouth looking out. $SIZE" "$T/frame_13.png"

# f19 — boy from behind on the steps, sketchbook, small dish of cat food
gen_run frame_19 "Image 1 is the boy reference, image 2 is the riverbank. Draw $BOY seen from behind, sitting on the concrete steps of the same riverbank as image 2, sketching in his kraft-paper sketchbook; a small shallow dish with cat food sits on the step beside him. $STYLE Medium-wide shot from behind and slightly above. $SIZE" "$B" "$T/frame_18.png"

# f20 — cat trots down the steps toward the boy
gen_run frame_20 "Image 1 is the cat reference, image 2 shows the boy on the riverside steps. Draw $CAT trotting confidently down the concrete steps of the same riverside as image 2, tail high, heading toward the lower right of the frame, golden light. $STYLE Medium shot, side view. $SIZE" "$C" "$T/frame_19.png"

# f21 — closeup: boy's side face, gentle smile, petting the cat
gen_run frame_21 "Image 1 is the boy reference, image 2 is the cat reference. Draw a close-up of $BOY sitting on the riverside steps in golden light, looking down with a soft gentle smile while his hand pets the head of $CAT beside him; both of his eyes open and clearly visible. $STYLE Side-profile close-up of the boy, cat's head entering the frame from below. $SIZE" "$B" "$C"

# f22 — medium closeup: boy watching the cat eat, smiling (lip-sync base, mouth closed)
gen_run frame_22 "Image 1 is the boy reference, image 2 is the cat reference. Draw $BOY sitting on the riverside steps, leaning forward slightly, watching $CAT eat from the small dish on the step, a warm quiet smile, mouth relaxed and fully closed, both eyes open and clearly visible, face unobstructed, golden light. $STYLE Medium close-up, three-quarter front view of the boy. $SIZE" "$B" "$C"

# f23 — girl peeking from behind the corner wall (lip-sync base)
gen_run frame_23 "Image 1 is the girl reference, image 2 is the alley wall style. Draw $GIRL peeking out from behind the corner of a concrete block wall at the end of an alley, hands gripping the wall edge, only her head and shoulders visible past the corner, curious nervous expression, mouth relaxed and fully closed, both eyes open and clearly visible, warm sunset light. $STYLE Medium close-up, eye level. $SIZE" "$G" "$T/frame_13.png"

# f24 — closeup: open sketchbook full of cat sketches
gen_run frame_24 "Image 1 shows the boy and his sketchbook. Draw an extreme close-up of the open kraft-paper sketchbook held in a boy's hands: both pages filled with lively pencil sketches of the same orange tabby cat in many poses — sitting, stretching, sleeping, walking. Pencil line art only on the pages, no color on the pages, golden evening light on the paper. $STYLE Tight close-up of the sketchbook. $SIZE" "$T/frame_22.png"

# f25 — cat looks back over its shoulder at the camera (meow base)
gen_run frame_25 "Image 1 is the cat reference, image 2 is the riverside. Draw $CAT sitting on the concrete steps of the same riverside as image 2, body facing away, head turned back over its shoulder looking straight at the camera with wide green eyes, mouth closed, as if it just noticed someone. $STYLE Medium close-up, golden light. $SIZE" "$C" "$T/frame_20.png"

# f26 — girl startled behind the wall (blink base)
gen_run frame_26 "Image 1 is the girl reference, image 2 shows her peeking from the wall. Draw $GIRL at the same wall corner as image 2, now startled: shoulders up, one hand half covering her mouth, eyes wide open in a flustered panic, both eyes fully visible, sunset light. $STYLE Medium close-up, eye level. $SIZE" "$G" "$T/frame_23.png"

# f27 — boy looks up toward the camera, first full face, slightly surprised (lip-sync base)
gen_run frame_27 "Image 1 is the boy reference. Draw $BOY sitting on the riverside steps, lifting his head and looking straight toward the camera with a mildly surprised, open expression, mouth relaxed and fully closed, both eyes fully visible and symmetrical, golden light. $STYLE Medium close-up, near-front view. $SIZE" "$B"

# f28 — girl steps out from the wall, flustered, waving her hands (lip-sync base)
gen_run frame_28 "Image 1 is the girl reference, image 2 is the riverside. Draw $GIRL at the edge of the same riverside as image 2, stepping out nervously and waving both hands in front of her chest in a flustered 'wait, no' gesture, shy embarrassed smile, mouth relaxed and fully closed, both eyes open and clearly visible, sunset light. $STYLE Medium full shot, eye level. $SIZE" "$G" "$T/frame_18.png"

# f29 — boy smiling gently, near closeup (lip-sync base)
gen_run frame_29 "Image 1 is the boy reference. Draw $BOY sitting on the riverside steps, looking up slightly toward the camera with a warm knowing smile, mouth relaxed and fully closed, both eyes open and clearly visible, golden light. $STYLE Near close-up, three-quarter view. $SIZE" "$B"

# f30 — two-shot: girl and boy face each other with the cat between them
gen_run frame_30 "Image 1 is the girl reference, image 2 is the boy reference, image 3 is the cat reference, image 4 is the riverside. Draw $GIRL standing on the left and $BOY sitting on the riverside steps on the right, facing each other across a small distance, with $CAT sitting upright exactly between them on a step, the cat's head turned toward the girl; warm golden light, tender quiet mood. $STYLE Wide-medium two-shot, eye level. $SIZE" "$G" "$B" "$C" "$T/frame_18.png"

# f31 — boy holds out the sketchbook toward her (lip-sync base)
gen_run frame_31 "Image 1 is the boy reference, image 2 shows the sketchbook. Draw $BOY sitting on the riverside steps, holding out his open kraft-paper sketchbook toward the camera with one hand, offering it to someone off-screen, gentle inviting expression, mouth relaxed and fully closed, both eyes open and clearly visible, golden light. $STYLE Medium close-up. $SIZE" "$B" "$T/frame_24.png"

# f32 — closeup: girl looks down at the sketchbook, eyes wide with delight (lip-sync base)
gen_run frame_32 "Image 1 is the girl reference, image 2 is the riverside. Draw a close-up of $GIRL at the same riverside as image 2, looking down at a sketchbook below the frame, eyes wide and sparkling with happy surprise, mouth relaxed and fully closed, both eyes fully visible, face unobstructed by hair, golden light. $STYLE Head-and-shoulders close-up. $SIZE" "$G" "$T/frame_18.png"

# f33 — extreme closeup: sketchbook page with cat + umbrella girl sketch (callback)
gen_run frame_33 "Image 1 shows the open sketchbook with cat sketches. Draw an extreme close-up of one page of the same kraft-paper sketchbook: a single careful pencil drawing of an orange tabby cat sitting beside a girl with very long hair who holds a transparent vinyl umbrella over the cat on a rainy rooftop; pencil line art only, no color, no text, golden evening light on the paper. $STYLE Tight close-up of the page. $SIZE" "$T/frame_24.png"

# f34 — girl looks up at the boy, slight blush (lip-sync base)
gen_run frame_34 "Image 1 is the girl reference, image 2 is the riverside. Draw $GIRL at the same riverside as image 2, lifting her head to look toward the right of the frame, cheeks faintly blushing, a touched and slightly shy expression, mouth relaxed and fully closed, both eyes open and clearly visible, golden light. $STYLE Near close-up, three-quarter view. $SIZE" "$G" "$T/frame_18.png"

# f35 — boy looks back at her (blink base)
gen_run frame_35 "Image 1 is the boy reference. Draw $BOY on the riverside steps, turning his head to look toward the left of the frame, meeting someone's eyes with a soft sincere expression, mouth relaxed and fully closed, both eyes open and clearly visible, golden light. $STYLE Near close-up, three-quarter view. $SIZE" "$B"

# f36 — boy scratches the back of his head, sheepish smile (lip-sync base)
gen_run frame_36 "Image 1 is the boy reference. Draw $BOY on the riverside steps, scratching the back of his head with one hand, a sheepish embarrassed but happy smile, mouth relaxed and fully closed, both eyes open and clearly visible, golden light. $STYLE Medium close-up, three-quarter view. $SIZE" "$B"

# f37 — closeup: both hands on the cat's back, fingertips touching
gen_run frame_37 "Image 1 is the cat reference, image 2 shows the girl, image 3 shows the boy. Draw an extreme close-up of $CAT sitting on a riverside step with its eyes closed in bliss; a girl's hand (slim, from the white-shirted arm of image 2) and a boy's hand (from image 3) pet its back from opposite sides, their fingertips accidentally touching on the cat's fur. Golden light. $STYLE Tight close-up on the cat and the two hands. $SIZE" "$C" "$G" "$B"

# f38 — two-shot near: both look away, embarrassed smiles (lip-sync base for boy)
gen_run frame_38 "Image 1 is the girl reference, image 2 is the boy reference, image 3 is the riverside. Draw $GIRL on the left and $BOY on the right sitting one step apart on the riverside steps, both turned slightly away from each other with flustered shy smiles, looking in opposite directions, soft golden backlight. $STYLE Medium two-shot, eye level. $SIZE" "$G" "$B" "$T/frame_18.png"

# f39 — girl stands up holding the cat, smiling (lip-sync base)
gen_run frame_39 "Image 1 is the girl reference, image 2 is the cat reference, image 3 is the riverside. Draw $GIRL standing up on the grassy riverbank of image 3, holding $CAT gently in her arms against her chest, the cat relaxed with its front paws dangling, she smiles warmly toward the right of the frame, mouth relaxed and fully closed, both eyes open and clearly visible, golden sunset light. $STYLE Medium full shot. $SIZE" "$G" "$C" "$T/frame_18.png"

# f40 — wide: sunset riverside farewell, two figures and the cat
gen_run frame_40 "Image 1 is the girl reference, image 2 is the boy reference, image 3 is the cat reference, image 4 is the riverside. Draw a wide distant shot of the golden riverside at sunset: $GIRL standing and holding $CAT in her arms on the left, $BOY standing on the right with his sketchbook under one arm, the two facing each other in a small farewell bow, long warm shadows, sparkling river behind. $STYLE Very wide shot, small figures, cinematic. $SIZE" "$G" "$B" "$C" "$T/frame_18.png"

# f41 — empty closing: dish on the steps, sketch page lifting in the breeze
gen_run frame_41 "Image 1 is the riverside. Draw the empty riverside steps of image 1 at sunset: the small shallow cat-food dish left on a step, a single loose sketchbook page with a pencil cat sketch lifting at one corner in the evening breeze, golden light, nobody around. Quiet tender closing mood. $STYLE Medium close shot, slightly high angle. $SIZE" "$T/frame_18.png"

echo "LANE C DONE"
