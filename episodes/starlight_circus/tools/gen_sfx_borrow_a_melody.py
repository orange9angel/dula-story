#!/usr/bin/env python3
"""《借我一小段旋律》唱段环境底床与 Foley：火山 Seed-Audio 1.0。
产出 assets/audio/sfx/borrow_a_melody/<name>.wav + 逐支 .source.json（tag=sha256(prompt)，内容变了才重生成）。
用法（dula-story 根目录）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/starlight_circus/tools/gen_sfx_borrow_a_melody.py
"""
from pathlib import Path
import hashlib, importlib.util, json, sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / "assets/audio/sfx/borrow_a_melody"

JOBS = {
    # 底床：只写平稳/恒定，不用任何比喻（比喻会变成真实节律）
    "theatre_roomtone": "生成一段30秒纯环境音，无音乐无人声：空荡的老式大剧院内部的室内底噪，"
        "高大穹顶下极轻的空气声与远处通风低鸣，木质舞台与丝绒幕布吸声的温暖空间感，"
        "全程平稳、音量恒定、无阵风、无节律性涌动、无静默间隙、无脚步、无掌声",
    "moon_gears": "生成一段20秒纯环境音，无音乐无人声：头顶远处一台黄铜机械月亮缓慢转动，"
        "极轻微的细小齿轮咔嗒与金属轴承低沉嗡声，距离很远、很轻，平稳恒定，无静默间隙",
    # Foley：人体尺度接触
    "board_steps": "生成一段8秒纯音效，无音乐无人声：一位女子穿软皮靴在老木舞台地板上轻盈地跳舞，"
        "六到八次分开的轻柔脚步，每一步带木板轻微吱呀，步与步之间有明显间隔，近距离，干净",
    "chest_knock": "生成一段1秒纯音效，无音乐无人声：指关节敲击空心胡桃木胸腔一下，"
        "圆润温暖的“咚”，木头共鸣，短促，干净无回声",
    "wood_tap": "生成一段1秒纯音效，无音乐无人声：木偶的木头脚尖在木地板上轻点一下，"
        "清脆短促的“嗒”，干净",
    "brass_joints": "生成一段2秒纯音效，无音乐无人声：小木偶活动手臂时黄铜关节的细小咔哒声，"
        "两三下轻微的金属铰链声，很轻，近距离",
    "cloak_swirl": "生成一段1.5秒纯音效，无音乐无人声：女子旋转一圈时厚羊毛斗篷随身甩开又落下，"
        "柔和的布料呼啦声，近距离，无风声",
    "gown_rustle": "生成一段2秒纯音效，无音乐无人声：轻纱丝绸长裙随女子迈步轻轻摩擦的窸窣声，"
        "柔软、很轻、近距离",
}


def main() -> int:
    spec = importlib.util.spec_from_file_location(
        "seedaudio", WORKSPACE / "dula-skills/volc-voice-casting/scripts/seedaudio_gen.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, prompt in JOBS.items():
        wav, meta = OUT / f"{name}.wav", OUT / f"{name}.source.json"
        tag = hashlib.sha256(prompt.encode()).hexdigest()[:12]
        if wav.exists() and meta.exists() and json.loads(meta.read_text(encoding="utf-8")).get("tag") == tag:
            print("skip", name); continue
        billed = mod.generate(prompt, wav)
        meta.write_text(json.dumps({"name": name, "prompt": prompt, "tag": tag,
                                    "provider": "volcano-seedaudio-1.0", "billed_s": billed,
                                    "sha256": hashlib.sha256(wav.read_bytes()).hexdigest()},
                                   ensure_ascii=False, indent=1), encoding="utf-8")
        print("gen", name, billed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
