#!/usr/bin/env python3
"""borrowed_moonlight cel-cinema 第四批文生图资产（A4）：
补缺——m46 艾琳过肩背影「背面递灯」姿势 cel（替换 A3 的 walk_p1 静立近似）。

通道：codex CLI（gen_image_codex.py），串行前台，skip-if-exists 可重跑。
refs = [身份锚（首位=身份权重最高）, 3D 摄影棚背面三四分递灯姿势帧（仅锁姿势）]。
姿势参考由 tools/check_characters.mjs --only a4_eileen_offer_lamp_back 产出
（storyboard/a4/ref/，backq 机位=背面三四分+右侧微露）。

用法（任意目录）：
  python gen_assets_a4.py             # 跑全部缺口
重生成：删掉对应 png 再跑。
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

EP = Path(__file__).resolve().parents[2]          # episodes/borrowed_moonlight
STORY = EP.parents[1]                              # dula-story
HERE = Path(__file__).resolve().parent             # hybrid/assets
GEN = STORY.parents[0] / "dula-skills" / "build-continuous-story-images" / "scripts" / "gen_image_codex.py"
A4R = EP / "storyboard" / "a4" / "ref"
REFS = HERE / "refs"

STYLE = ("Art style (hard lock, applies to the whole image): a 19th-century European fairytale "
         "hand-drawn animated feature film - delicate watercolor washes with soft cel shading, "
         "visible gentle brushwork, storybook sensibility, soft cinematic light. "
         "STRICTLY AVOID: 3D render look, CGI, plastic or glossy toy-like surfaces, photorealism, "
         "photograph, neon colors, cyberpunk, metal armor, modern city, modern clothing, "
         "any text, letters, watermark, logo.")

CEL_BG = ("The character is isolated on a FULLY TRANSPARENT background (PNG with real alpha "
          "channel): no backdrop, no ground, no shadow on the ground, no scenery, nothing behind "
          "the character. Full body visible head to toe, centered, the character fills about 90% "
          "of the image height. Exactly ONE character in the image.")

CEL_REF_NOTE = ("Reference image 1 is the character identity anchor: match its face, hairstyle, "
                "costume pieces, colors and proportions EXACTLY. Reference image 2 is a rough "
                "low-poly 3D previz render: copy ONLY the body pose, viewing angle and staging "
                "from it - do NOT copy its flat 3D surfaces, gray look, background or framing. "
                "Repaint everything in the 2D hand-painted style above.")

EILEEN_ID = ("An 11-year-old girl, about 140cm tall, slim child build. Round oval face, large "
             "gray-blue eyes, short silver-white bob hair cut at jaw length with one single loose "
             "strand falling on the viewer's RIGHT side of her face (her own left side). She wears "
             "a deep blue velvet cloak fastened at the collar with a small round brass clasp, over "
             "a cream-white linen dress, and short brown boots.")

LAMP_ID = ("Her old copper lantern: a small vintage copper hand lantern with a loop handle on top "
           "and a glass shade that has one thin visible crack; the wick inside is unlit.")

EILEEN_FULL = REFS / "eileen_full.png"

JOBS: dict[str, dict] = {
    "eileen_offer_lamp_back": {
        "out": HERE / "cels" / "eileen_offer_lamp_back.png",
        "timeout": 560,
        "refs": [EILEEN_FULL, A4R / "a4_eileen_offer_lamp_back.jpg"],
        "size": "1024x1536",
        "prompt": (
            "Pose: standing, viewed FROM BEHIND at a slight three-quarter angle (we see her back, "
            "the back of her silver-white bob hair and the deep blue cloak from behind, with only "
            "a small hint of her right cheek and right side). BOTH arms are extended straight "
            "FORWARD away from the viewer at chest height, offering " + LAMP_ID +
            " held by its loop handle with both hands; the little copper lantern hangs from her "
            "forward-stretched hands and peeks out visibly in front of her silhouette, clearly "
            "below her chin level. She stands still, weight even on both feet, offering the "
            "lantern to someone in front of her. " + EILEEN_ID + " " + CEL_BG + " " + STYLE +
            " " + CEL_REF_NOTE),
    },
}


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def run_job(name: str, job: dict) -> bool:
    out: Path = job["out"]
    src = out.with_suffix(".source.json")
    if out.exists() and src.exists():
        print(f"skip {name}（已存在）")
        return True
    refs = [str(r) for r in job["refs"]]
    for r in refs:
        if not Path(r).exists():
            print(f"FAIL {name}: 缺参考图 {r}", file=sys.stderr)
            return False
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, str(GEN), "--out", str(out), "--timeout", str(job.get("timeout", 280))]
    for r in refs:
        cmd += ["--ref", r]
    if job["size"]:
        cmd += ["--size", job["size"]]
    cmd += ["--prompt", job["prompt"]]
    print(f"=== {name} ===", flush=True)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    tail = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()[-1200:]
    print(tail, flush=True)
    if proc.returncode != 0 or not out.exists():
        print(f"FAIL {name}", file=sys.stderr)
        return False
    src.write_text(json.dumps({
        "asset": name,
        "provider": "codex-cli builtin imagegen",
        "model": "gpt-image (ChatGPT subscription quota)",
        "prompt": job["prompt"],
        "refs": refs,
        "size": job["size"],
        "sha256": sha256(out),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {name}", flush=True)
    return True


def main() -> int:
    fails = 0
    for n, job in JOBS.items():
        if not run_job(n, job):
            fails += 1
    print(f"done: {len(JOBS) - fails}/{len(JOBS)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
