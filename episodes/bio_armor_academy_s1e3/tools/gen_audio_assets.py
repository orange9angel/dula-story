"""S1E3 音频资产生成（Seed-Audio 1.0 单元素模式）：环境床/Foley/BGM。

逐资产 source.json 落账（provider/model/prompt/sha256），skip-if-exists 且哈希校验。
BGM 走 Seed-Audio 纯音乐模式而非 Suno：Suno 驱动是浏览器灰产会话，
Seed-Audio 是已验证的 API 通路且本任务授权范围内；75s<120s 单次上限。
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]


def main():
    for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if raw.strip().startswith('#') or '=' not in raw:
            continue
        key, value = raw.removeprefix('export ').split('=', 1)
        if key.strip() == 'VOLC_SPEECH_API_KEY':
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))
    spec = importlib.util.spec_from_file_location('seedaudio', WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py')
    backend = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend)
    plan = json.loads((EP / 'config/audio_gen_plan.json').read_text(encoding='utf-8'))

    def generate(item):
        dest = EP / 'assets3d' / item['dir'] / (item['name'] + '.wav')
        dest.parent.mkdir(parents=True, exist_ok=True)
        record = dest.with_suffix('.source.json')
        if dest.exists() and record.exists():
            old = json.loads(record.read_text(encoding='utf-8'))
            if old['sha256'] == hashlib.sha256(dest.read_bytes()).hexdigest() and old['prompt'] == item['prompt']:
                print('verified cache: ' + item['name'], flush=True)
                return
            raise RuntimeError('Existing asset differs from its generation record: ' + item['name'])
        print('generating: ' + item['name'], flush=True)
        duration = backend.generate(item['prompt'], dest)
        record.write_text(json.dumps(dict(provider='volcano', model=backend.MODEL,
            prompt=item['prompt'], billed_seconds=duration,
            sha256=hashlib.sha256(dest.read_bytes()).hexdigest()), ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"complete: {item['name']} ({duration}s)", flush=True)

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(generate, plan['assets']))


if __name__ == '__main__':
    main()
