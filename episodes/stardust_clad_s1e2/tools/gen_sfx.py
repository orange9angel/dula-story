#!/usr/bin/env python3
"""《星屑战壳》S1E2《夜守》：SFX/环境底床/BGM 全走火山 Seed-Audio 1.0（沿用 OP R2 工艺）。
产出 assets3d/sfx/<name>.wav + 逐支 .source.json 溯源（skip-if-exists 校验一致性）。
用法（dula-story 根目录）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_s1e2/tools/gen_sfx.py
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
    # 底床：夜旷野（厚）/ 圣殿火盆噼啪
    'ambience_night': '生成一段20秒纯环境音，无音乐无人声：深夜高原旷野的环境底床，'
        '以持续平稳的夜风穿过废墟石廊的均匀风声为主体（全程无间隙），远处极低频虫鸣与'
        '偶发极远闷雷点缀，音量恒定、无阵风、无节律性涌动、无静默间隙',
    'fire_crackle': '生成一段12秒纯环境音，无音乐无人声：圣殿火盆木柴燃烧的噼啪声，'
        '温暖平稳连续，偶发轻微爆裂，音量恒定、无节律性涌动、无静默间隙',
    # 事件音效
    'shield_bang': '生成一段1.0秒纯音效，无音乐无人声：动画片风格的金属盾沿猛力磕地示警，'
        '“当——”的响亮盾鸣带石地回震，威严示警感',
    'beast_growl': '生成一段1.6秒纯音效，无音乐无人声：大型野兽压低身躯的低沉咆哮，'
        '胸腔共鸣的喉音滚动，夜行动物威胁感，非怪兽吼叫',
    'beast_roar': '生成一段1.2秒纯音效，无音乐无人声：野兽扑击瞬间的爆发嘶吼，'
        '短促凶狠带气息冲击，动画片夜袭质感',
    'claw_scrape': '生成一段0.7秒纯音效，无音乐无人声：利爪抓刮金属盾面，'
        '刺耳高频抓挠+金属刮擦余振，短促',
    'beast_charge': '生成一段0.9秒纯音效，无音乐无人声：野兽肩撞猛冲的沉重撞击声，'
        '低频闷响带甲壳碰撞，有重量感',
    'disc_clatter': '生成一段0.8秒纯音效，无音乐无人声：金属圆盘脱手滚落石板地，'
        '清脆“当啷”+滚转金属声渐停',
    'rain_burst': '生成一段1.6秒纯音效，无音乐无人声：密集银亮流星弹雨倾泄，'
        '密集清脆的星点破空连响汇成扇面，华丽凌厉（动画片必杀技）',
    'crater_slam': '生成一段1.5秒纯音效，无音乐无人声：陨星砸落地面爆发，'
        '沉重落地轰响+碎石迸溅+低频冲击余波，终结一击的份量',
    'beast_flee': '生成一段1.2秒纯音效，无音乐无人声：受伤野兽骤然翻身逃窜，'
        '碎石疾驰的急促脚步+一声短促呜咽，狼狈感',
    # BGM 双段：夜守（沉静隐忧）/ 夜战（压迫→爆发→落定）
    'bgm_nightwatch': '生成一段74秒纯音乐，无台词无人声无音效：动画片深夜值夜配乐，'
        '低音提琴长音垫底+稀疏钢琴单音+远处风声般的弦乐气声，沉静克制带一丝隐忧，'
        '极简、极慢、大片氛围感，结尾不收束（悬着）',
    'bgm_nightbattle': '生成一段74秒纯音乐，无台词无人声无音效：热血番夜战配乐，'
        '太鼓低鼓点渐进+紧张弦乐断奏+中段铜管蓄力，后段推到决战高点再收静，'
        '压迫→燃烧→尘埃落定结构，无喜剧感',
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
