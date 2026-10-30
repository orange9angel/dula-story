#!/usr/bin/env python3
"""水晶咏叹 音效：火山 Seed-Audio 1.0（build-ambience-foley 标准链）。
产出 assets/audio/sfx/<name>.wav + 逐支 .source.json（tag=sha256(prompt)，内容变了才重生成）。
用法（dula-story 根目录）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/crystal_aria/tools/gen_sfx.py
剧院底床、木心「咚」「嗒」、纱裙沿用 starlight_circus 已验收素材（见 tools/mix_song.py 的 REUSE）。
"""
from pathlib import Path
import hashlib, importlib.util, json, sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / "assets/audio/sfx"

JOBS = {
    "dust_gather": "生成一段6秒纯音效，无音乐无人声：无数细微的光尘在空气中缓缓汇聚，极轻的晶莹沙沙声与细碎闪烁声，"
        "由稀疏渐渐变密，柔和、空灵、很轻，结尾自然收住，无旋律",
    "glass_crack": "生成一段4秒纯音效，无音乐无人声：一个巨大的厚玻璃水晶球表面在压力下出现裂纹，"
        "细密清脆的冰裂噼啪声，一道道蔓延开，越来越密，紧张，近距离，干净无回声",
    "glass_shatter": "生成一段3秒纯音效，无音乐无人声：一个巨大的水晶玻璃球瞬间整体爆裂，"
        "清脆响亮的玻璃碎裂主音，紧接着大量玻璃碎片向四周飞散的哗啦声，空旷剧院中有自然余响",
    "glass_rain": "生成一段4秒纯音效，无音乐无人声：无数细小的玻璃碎屑与碎片陆续落在木地板舞台上，"
        "清脆细碎的叮叮当当声，由密集渐渐变稀疏，最后几粒零星落下，近中距离",
    "magic_gather": "生成一段3秒纯音效，无音乐无人声：魔法光点从四周飞旋汇聚成形，"
        "晶莹细碎的闪烁声与轻柔的气流声由疏到密逐渐增强上扬，无旋律无和弦，结尾戛然收住",
    "reveal_bloom": "生成一段3秒纯音效，无音乐无人声：魔法完成的一瞬间，一声明亮温暖柔和的光爆，"
        "像轻柔的空气绽开伴随细碎晶莹的余光声，余韵自然淡出，不刺耳，无旋律",
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
