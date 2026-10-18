#!/usr/bin/env python3
"""《星屑战壳》S1E2《夜守》：人类动作音效与环境底床使用火山 Seed-Audio。
新配乐由 episode-scoring/Suno 负责，本工具不生成音乐。
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
import os

import numpy as np

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / 'assets3d/sfx'

# 动画片夸张质感 + 材质锁定 + 无音乐无人声（BGM 单列：无台词无音效）
JOBS = json.loads((EP / 'config/human_sfx_jobs.json').read_text(encoding='utf-8'))

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
    billed = mod.generate(prompt, wav)
    meta.write_text(json.dumps({'name': name, 'prompt': prompt, 'tag': tag,
                                'provider': 'volcano-seedaudio', 'billed_duration': billed,
                                'sha256': hashlib.sha256(wav.read_bytes()).hexdigest()},
                               ensure_ascii=False, indent=1), encoding='utf-8')
    return name, 'gen'

def main():
    env_path = WORKSPACE / 'dula-story/.env.speech'
    for raw in env_path.read_text(encoding='utf-8-sig').splitlines():
        raw = raw.strip().removeprefix('export ')
        if raw.startswith('#') or '=' not in raw: continue
        key, value = raw.split('=', 1)
        if key.strip().startswith('VOLC_'):
            os.environ.setdefault(key.strip(), value.strip().strip(chr(34)+chr(39)))
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        for name, st in pool.map(gen_one, JOBS.items()):
            print(f'{st} {name}')

if __name__ == '__main__':
    main()
