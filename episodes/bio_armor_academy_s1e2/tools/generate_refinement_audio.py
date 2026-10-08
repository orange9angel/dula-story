"""Generate only missing R2 replacements through the established Seed-Audio backend."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / 'assets3d/refinement/sfx'


def main():
    for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if raw.strip().startswith('#') or '=' not in raw:
            continue
        key, value = raw.removeprefix('export ').split('=', 1)
        if key.strip() == 'VOLC_SPEECH_API_KEY':
            os.environ.setdefault(key.strip(), value.strip().strip('\"\''))
    spec = importlib.util.spec_from_file_location('seedaudio', WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py')
    backend = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend)
    plan = json.loads((EP / 'config/audio_refinement.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)

    def generate(item):
        dest = OUT / (item['name'] + '.wav')
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
        list(pool.map(generate, plan['replacements']))


if __name__ == '__main__':
    main()
