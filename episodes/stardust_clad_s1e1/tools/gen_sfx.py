#!/usr/bin/env python3
"""《星屑战壳》S1E1：SFX/环境底床/BGM 全走火山 Seed-Audio 1.0（沿用 OP R2 工艺）。
产出 assets3d/sfx/<name>.wav + 逐支 .source.json 溯源（skip-if-exists 校验一致性）。
用法（dula-story 根目录）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/gen_sfx.py
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import subprocess
import sys

import numpy as np

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / 'assets3d/sfx'

# 动画片夸张质感 + 材质锁定 + 无音乐无人声（BGM 单列：无台词无音效）
JOBS = {
    'dash_whoosh': '生成一段0.9秒纯音效，无音乐无人声：动画片风格的角色高速冲刺呼啸，'
        '快速空气撕裂音由远及近，干净利落',
    'whoosh_fast': '生成一段0.7秒纯音效，无音乐无人声：动画片风格的快速挥动呼啸，短促尖锐',
    'scroll_pop': '生成一段1.2秒纯音效，无音乐无人声：动画片风格的魔法卷轴凭空弹出展开，'
        '光之粒子“啵”地聚拢+纸张展开哗啦声，轻快魔幻',
    'energy_charge': '生成一段1.8秒纯音效，无音乐无人声：动画片风格的铠甲能量蓄力，'
        '金属共振嗡鸣从低到高上行，末尾轻微电流迸发，夸张热血番质感',
    'pan_sizzle': '生成一段2.0秒纯音效，无音乐无人声：煎蛋落在热锅上的油爆滋滋声，'
        '清晨厨房质感，由响到稳',
    'stone_thud': '生成一段1.0秒纯音效，无音乐无人声：沉重石块砸落石板地面，'
        '低频闷响带石屑散落，有重量感',
    'body_drop': '生成一段1.0秒纯音效，无音乐无人声：动画片风格的铠甲战士一屁股坐地，'
        '沉闷落地声带金属甲片轻响，喜剧感',
    'star_chime': '生成一段0.5秒纯音效，无音乐无人声：星屑光点穿过金属花窗的清脆“叮”声，'
        '短促明亮，风铃质感',
    'chopstick_tap': '生成一段0.5秒纯音效，无音乐无人声：细长筷刃轻点金属盾面的“叮嗒”，'
        '清脆短促，金属高频',
    'chopstick_clack': '生成一段0.6秒纯音效，无音乐无人声：两根筷子快速合拢夹住金属圆盘边缘，'
        '“咔”的干脆夹合声+轻微金属余振',
    'pot_set': '生成一段0.7秒纯音效，无音乐无人声：铜锅放到地上的“咚”，圆润锅体共鸣',
    'hotpot_bubble': '生成一段8秒纯音效，无音乐无人声：火锅汤水咕嘟咕嘟沸腾，'
        '平稳连续，温暖治愈氛围',
    # R11 必杀技专属 SFX
    'star_lotus': '生成一段1.2秒纯音效，无音乐无人声：星屑光轮绽开旋转，'
        '金属莲瓣依次展开的清亮颤音，清脆华丽',
    'chopstick_barrage': '生成一段1.0秒纯音效，无音乐无人声：双筷连续刺击残影，'
        '密集清脆的筷刃破空连响，快速凌厉',
    'star_pierce': '生成一段0.9秒纯音效，无音乐无人声：双筷合拢夹断瞬间，'
        '能量收束后“咔”的脆响+星屑崩散，干脆利落',
    'pot_clang': '生成一段2.0秒纯音效，无音乐无人声：动画片风格的锅盖被敲响，'
        '圆润响亮的“当——”锅鸣金属声，余音悠长自然衰减，喜剧收尾感',
    # 环境底床：prompt 锁平稳无节律
    'ambience_morning': '生成一段20秒纯环境音，无音乐无人声：清晨高原圣殿的环境底床，'
        '以持续平稳的晨风穿过石廊的均匀风声为主体（全程无间隙），远处极轻微偶发鸟鸣点缀，'
        '音量恒定、无阵风、无节律性涌动、无静默间隙',
    # BGM：单条 74s 纯音乐
    'bgm_morning': '生成一段74秒纯音乐，无台词无人声无音效：动画片日常搞笑番晨间配乐，'
        '轻快尤克里里+俏皮木琴+低音提琴拨弦，中速偏快，晨练到考核到围炉火锅的松弛喜剧氛围，'
        '结构有轻微起伏，结尾自然收束',
}
# 溯源元数据（内容变了才重生成）
def gen_one(item):
    name, prompt = item
    wav = OUT / f'{name}.wav'
    meta = OUT / f'{name}.source.json'
    tag = hashlib.sha256(prompt.encode()).hexdigest()[:12]
    if wav.exists() and meta.exists() and json.loads(meta.read_text(encoding='utf-8')).get('tag') == tag:
        return name, 'skip'
    spec = importlib.util.spec_from_file_location(
        'seedaudio', WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.generate(prompt, wav)
    meta.write_text(json.dumps({'name': name, 'prompt': prompt, 'tag': tag,
                                'provider': 'volcano-seedaudio',
                                'sha256': hashlib.sha256(wav.read_bytes()).hexdigest()},
                               ensure_ascii=False, indent=1), encoding='utf-8')
    return name, 'gen'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        for name, st in pool.map(gen_one, JOBS.items()):
            print(f'{st} {name}')

if __name__ == '__main__':
    main()
