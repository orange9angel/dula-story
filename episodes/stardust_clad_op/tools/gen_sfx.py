#!/usr/bin/env python3
"""《星屑战壳》OP R2：全部事件音效/环境底床改用火山 Seed-Audio 1.0 生成
（监制决议：程序合成 SFX 不进正片，旧程序合成件留档 assets/audio/sfx/ 不再进混音）。

产出 assets3d/sfx/<name>.wav + 逐支 .source.json 溯源（skip-if-exists 校验一致性）。
环境底床过三道节律验收（RMS max/mean<1.4、0.5-1s 自相关<0.15、4-8kHz 占比<0.2，
超线 EQ highpass60+lowpass1500 兜底一档后复验）。

用法（dula-story 根目录）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_op/tools/gen_sfx.py
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / 'assets3d/sfx'

# 动画片夸张质感 + 金属/石材材质锁定 + 无音乐无人声（保护分轨混音）
JOBS = {
    'energy_charge': '生成一段1.5秒纯音效，无音乐无人声无背景声：动画片风格的魔法能量蓄力，'
        '金属铠甲共振嗡鸣从低到高上行，末尾轻微电流迸发，夸张热血番质感',
    'block_impact': '生成一段1.2秒纯音效，无音乐无人声：动画片风格的金属圆盾格挡重击，'
        '清脆响亮的“铛”金属打击感，带短促金属余振，夸张有冲击力',
    'punch_heavy': '生成一段1.0秒纯音效，无音乐无人声：动画片风格的两个金属拳甲正面对撞，'
        '沉重厚实的金属“砰”击，带一点铠甲抖动余音，夸张热血番质感',
    'dash_whoosh': '生成一段0.9秒纯音效，无音乐无人声：动画片风格的角色高速冲刺呼啸，'
        '快速空气撕裂音由远及近，干净利落',
    'whoosh_fast': '生成一段0.7秒纯音效，无音乐无人声：动画片风格的快速挥动呼啸，短促尖锐',
    'body_drop': '生成一段1.2秒纯音效，无音乐无人声：动画片风格的铠甲战士被击飞摔落石板地面，'
        '沉重的身体落地闷响带金属甲片哐当散落声，夸张但有重量感',
    'impact_thud': '生成一段0.8秒纯音效，无音乐无人声：低频厚重的闷响落地垫底，'
        '像重物砸在厚石台上，几乎无高频',
    'energy_blast': '生成一段1.6秒纯音效，无音乐无人声：动画片风格的合力一击能量爆发，'
        '星尘粒子喷射感的光辉迸发音，明亮上扬，夸张华丽',
    # R11 必杀技专属 SFX
    'steam_pillar': '生成一段1.4秒纯音效，无音乐无人声：蒸汽星屑柱冲天喷发，'
        '沸水喷涌+气流轰鸣由低到高，夸张热血番质感',
    'star_lotus': '生成一段1.2秒纯音效，无音乐无人声：星屑光轮绽开旋转，'
        '金属莲瓣依次展开的清亮颤音，清脆华丽',
    'pot_shock': '生成一段1.1秒纯音效，无音乐无人声：锅鸣冲击波，'
        '圆润“当——”带环形扩散震感，比锅盖敲击更沉更有冲击',
    'crater_slam': '生成一段1.4秒纯音效，无音乐无人声：陨星坠地爆发，'
        '沉重落地+碎石迸溅+低频冲击，大地震颤',
    'pot_clang': '生成一段2.0秒纯音效，无音乐无人声：动画片风格的锅盖被敲响，'
        '圆润响亮的“当——”锅鸣金属声，余音悠长自然衰减，喜剧收尾感',
    # 环境底床：prompt 锁平稳无节律（build-ambience-foley 三道验收）
    'ambience_night': '生成一段20秒纯环境音，无音乐无人声：夜晚高原圣殿的环境底床，'
        '轻微平稳的夜风 + 远处篝火火星偶发轻微噼啪，平稳、无阵风、无节律性涌动、音量恒定',
}


def load_module():
    for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if raw.strip().startswith('#') or '=' not in raw:
            continue
        key, value = raw.removeprefix('export ').split('=', 1)
        if key.strip() == 'VOLC_SPEECH_API_KEY':
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))
    spec = importlib.util.spec_from_file_location(
        'seedaudio', WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py')
    backend = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend)
    return backend


def decode(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', '48000', '-ac', '1', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32)


def bed_accept(path):
    """环境底床三道验收（build-ambience-foley）：节律/自相关/嘶声占比。"""
    y = decode(path)
    sr = 48000
    blocks = len(y) // sr
    one = np.sqrt(np.mean(y[:blocks * sr].reshape(-1, sr) ** 2, axis=1))
    rms_ratio = float(one.max() / max(one.mean(), 1e-12))
    hop = sr // 100
    env = np.sqrt(np.mean(y[:len(y) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    env = env - env.mean()
    ac = np.correlate(env, env, 'full')[len(env) - 1:]
    ac /= max(ac[0], 1e-12)
    autocorr = float(np.max(ac[50:101]))
    # 4-8kHz 嘶声占比（零 Crossing 率近似过高通能量比）
    from scipy.signal import butter, sosfilt
    hi = sosfilt(butter(2, [4000, 8000], fs=sr, btype='bandpass', output='sos'), y)
    hiss = float(np.mean(hi ** 2) / max(np.mean(y ** 2), 1e-12))
    return {'rms_max_mean': round(rms_ratio, 3), 'autocorr_05_1s': round(autocorr, 3),
            'hiss_4_8k_ratio': round(hiss, 4),
            'passed': rms_ratio < 1.4 and autocorr < 0.15 and hiss < 0.2}


def main():
    backend = load_module()
    OUT.mkdir(parents=True, exist_ok=True)

    def generate(item):
        name, prompt = item
        dest = OUT / (name + '.wav')
        record = OUT / (name + '.source.json')
        if dest.exists() and record.exists():
            old = json.loads(record.read_text(encoding='utf-8'))
            if old['sha256'] == hashlib.sha256(dest.read_bytes()).hexdigest() and old['prompt'] == prompt:
                print('verified cache: ' + name, flush=True)
                return name
            raise RuntimeError('Existing asset differs from its generation record: ' + name)
        print('generating: ' + name, flush=True)
        duration = backend.generate(prompt, dest)
        record.write_text(json.dumps(dict(provider='volcano-seedaudio', model=backend.MODEL,
            prompt=prompt, billed_seconds=duration,
            sha256=hashlib.sha256(dest.read_bytes()).hexdigest()), ensure_ascii=False, indent=2),
            encoding='utf-8')
        print(f'complete: {name} ({duration}s)', flush=True)
        return name

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(generate, JOBS.items()))

    # 环境底床节律验收（不过线则 EQ 兜底一档复验，仍不过报错交人）
    bed = OUT / 'ambience_night.wav'
    result = bed_accept(bed)
    if not result['passed']:
        fixed = OUT / 'ambience_night_eq.wav'
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', str(bed),
                               '-af', 'highpass=f=60,lowpass=f=1500', str(fixed)])
        result = bed_accept(fixed)
        if result['passed']:
            fixed.replace(bed)
            result['eq_fallback'] = 'highpass60+lowpass1500'
            record = OUT / 'ambience_night.source.json'
            rec = json.loads(record.read_text(encoding='utf-8'))
            rec['eq_fallback'] = result['eq_fallback']
            rec['sha256'] = hashlib.sha256(bed.read_bytes()).hexdigest()
            record.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding='utf-8')
    print('bed_accept:', json.dumps(result, ensure_ascii=False))
    if not result['passed']:
        print('FAIL: ambience bed 节律验收不过线（含 EQ 兜底），交监制决策', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
