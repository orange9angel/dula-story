#!/usr/bin/env python3
"""R4b 转圈后半圈重画（240/270/300/330°）。镜像格修了脸朝向却把举起的手翻到背离舞伴的一侧——托手转圈里
举起的手始终伸向舞伴（画面右侧）并被握住，是转圈的轴心。refs = [身份锚, 镜像格 2x2（只取身体/脸朝向）, 宫格 A（举手一侧与画法）]。"""
import json, subprocess, sys
from pathlib import Path
EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
ID = json.loads((EP / "config/identity_anchors.json").read_text(encoding="utf-8"))
out = EP / "hybrid/r4/cels/twirl_d.png"
if out.exists():
    sys.exit(print("skip"))
cells = ["240 degrees: three-quarter back view, the back of her head and shoulders toward the viewer, cheek line just visible on the VIEWER'S LEFT",
         "270 degrees: full profile facing the VIEWER'S LEFT (nose pointing to the left edge), skirt hem flaring out toward the viewer's right",
         "300 degrees: three-quarters facing the VIEWER'S LEFT, face clearly visible looking left, mouth open singing",
         "330 degrees: nearly facing the viewer, turned slightly to the viewer's left, skirt settling, mouth open singing"]
listing = "; ".join(f"cell {i + 1} ({['top-left', 'top-right', 'bottom-left', 'bottom-right'][i]}) = {c}" for i, c in enumerate(cells))
p = (f"Image 1 is the IDENTITY ANCHOR of the curly-haired woman: copy her face, hair, proportions and costume exactly. "
     f"Image 2 is a POSE REFERENCE sheet: copy, cell by cell, the BODY ROTATION, the FACE DIRECTION, the legs and the skirt/cloak "
     f"swing exactly - but NOT its raised arm. Image 3 shows the same twirl's first half: copy its scale, line quality, colours, and "
     f"the way the raised hand is held. Paint ONE animation sheet, 1024x1536 portrait canvas, 2 columns x 2 rows = 4 equal cells "
     f"(each 512x768), read left-to-right then top-to-bottom: the second half of one continuous spin. {listing}. "
     f"CRUCIAL: in every cell ONE hand is raised high, held in a partner's hand that is off-picture to the VIEWER'S RIGHT; that raised "
     f"hand is always on the VIEWER'S RIGHT side above her head (at the upper right of her head, wrist bent toward the right), never "
     f"on the left - her body turns underneath that held hand, so when she faces left the raised arm crosses up behind/over her head "
     f"toward the right. The other arm extends out for balance. Same scale in every cell, supporting foot on the same baseline near "
     f"the bottom of the cell, at least 40 pixels of empty margin on every side. {ID['characters']['noya']['spec']} {ID['style']} "
     f"FULLY TRANSPARENT background (real PNG alpha): no backdrop, no floor, no shadow, no text, no grid lines.")
out.with_suffix(".prompt.txt").write_text(p, encoding="utf-8")
for attempt in range(2):
    r = subprocess.run([sys.executable, str(GEN), "--out", str(out), "--prompt", p, "--size", "1024x1536", "--timeout", "900",
                        "--ref", str(EP / "hybrid/anchors/noya_full.png"), "--ref", str(EP / "hybrid/r4/cels/_pose_ref_d.png"),
                        "--ref", str(EP / "hybrid/r4/cels/twirl_a.png")], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode == 0:
        sys.exit(print("ok twirl_d"))
    print("FAIL", attempt, (r.stdout + r.stderr)[-300:])
