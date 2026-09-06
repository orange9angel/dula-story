"""Recover E06 V2 tasks and generate only its two missing dialogue shots.

No automatic paid retries. Task IDs are saved before polling, so interrupted
runs resume the same task. Credentials and signed URLs are never logged.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import time
import urllib.request
from pathlib import Path

from gen_seedance25 import DEFAULT_BASE_URL, DEFAULT_MODEL, http_json

EP = Path(__file__).resolve().parents[1]
REPO = EP.parents[1]
CHAIN = EP / 'tmp/video_chain'
LEDGER = CHAIN / 'resume_tasks.json'


def env_load():
    for name in ('.env.ark', '.env.cv'):
        for line in (REPO / name).read_text(encoding='utf-8-sig').splitlines():
            line = line.strip().removeprefix('export ')
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            if re.fullmatch(r'[A-Za-z_][A-Za-z_0-9]*', key.strip()):
                os.environ.setdefault(key.strip(), value.strip().strip('\"\''))


def historical(wire):
    rows = []
    for line in wire.read_text(encoding='utf-8').splitlines():
        d = json.loads(line)
        if d['type'] != 'task.terminated' or 'V2' not in d.get('info', {}).get('description', ''):
            continue
        for out in d.get('outputTail', '').splitlines():
            if out.startswith('{'):
                try:
                    item = json.loads(out)
                except ValueError:
                    continue
                if 'estimatedCostCny' in item:
                    item['out'] = 'tmp/video_chain/' + Path(item['out'].replace('\\', '/')).name
                    item['costBasis'] = 'historical estimate at CNY60/M tokens; not an invoice'
                    rows.append(item)
    (CHAIN / 'historical_costs.json').write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'historicalCompleted': len(rows), 'tokens': sum(x['usage']['total_tokens'] for x in rows), 'oldEstimatedCny': round(sum(x['estimatedCostCny'] for x in rows), 3)}), flush=True)
    return rows


def status():
    env_load()
    base = os.environ.get('ARK_BASE_URL', DEFAULT_BASE_URL)
    result = http_json(base + '/contents/generations/tasks?page_size=50', os.environ['ARK_API_KEY'])
    # Persist no bearer URLs: enough metadata to find interrupted tasks.
    rows = result.get('items', result.get('data', []))
    if isinstance(rows, dict):
        rows = rows.get('items', [])
    clean = [{k: x[k] for k in ('id', 'model', 'status', 'created_at', 'usage', 'resolution', 'duration') if k in x} for x in rows]
    (CHAIN / 'cloud_status.json').write_text(json.dumps(clean, indent=2), encoding='utf-8')
    print(json.dumps({'keys':list(result), 'recent':clean[:20]}, ensure_ascii=False), flush=True)


def upload(path):
    import tos
    from tos_upload import BUCKET, ENDPOINT, REGION
    client = tos.TosClientV2(os.environ['VOLC_ACCESSKEY'], os.environ['VOLC_SECRETKEY'], ENDPOINT, REGION)
    key = 'e06live_v2_resume/' + path.name
    client.put_object_from_file(BUCKET, key, str(path))
    return client.pre_signed_url(tos.HttpMethodType.Http_Method_Get, BUCKET, key, expires=7200).signed_url


def generate():
    env_load()
    ledger = json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else {}
    base = os.environ.get('ARK_BASE_URL', DEFAULT_BASE_URL)
    key = os.environ['ARK_API_KEY']
    specs = [
        ('v2_s12_boy', 'step1_ache_t2v.mp4', 's12_boy3.mp3', '参考@视频1中同一个虚构男孩、同一张脸、白色T恤和河堤石阶。背景是河面和对岸绿树。正面近景，男孩膝上放着速写本，望向画面外女孩，温和轻轻点头，说出@音频1的完整台词“嗯，这样也挺好。”。按参考音频的速度和停顿说，保持音色，口型同步。从0.2秒内开始说，说完闭嘴微笑。单一连续镜头，自然上午光，不出现其他人，不加字幕或音乐。'),
        ('v2_s17_girl', 'v2_girl_t2v.mp4', 's17_girl5.mp3', '参考@视频1中同一个虚构女孩、同一张脸、同一套白色短袖衬衫和深色裙子，保持树荫河堤背景。正面近景，女孩坐在石阶上，先低头看画面外的速写本，再温柔抬眼望向画面外男孩，轻声说出@音频1的完整台词“这张最像它了。”。按参考音频的速度和停顿说，保持音色，口型同步。从0.2秒内开始说，说完闭嘴露出浅浅微笑。自然上午光，单一连续镜头，不出现其他人，不加字幕或音乐。'),
    ]
    for label, ref, aud, prompt in specs:
        out = CHAIN / (label + '.mp4')
        if out.exists() and out.stat().st_size > 1000:
            print(label + ': reuse local output', flush=True)
            continue
        item = ledger.get(label)
        if item and item.get('status') in ('failed', 'cancelled', 'expired', 'submission_unknown'):
            raise RuntimeError(label + ': terminal or uncertain previous attempt; no automatic paid retry')
        if not item:
            video_url = upload(CHAIN / ref)
            audio_url = upload(CHAIN / 'v2_audio' / aud)
            payload = {'model':DEFAULT_MODEL, 'content':[
                {'type':'text','text':prompt},
                {'type':'video_url','video_url':{'url':video_url},'role':'reference_video'},
                {'type':'audio_url','audio_url':{'url':audio_url},'role':'reference_audio'}],
                'resolution':'720p','duration':4,'ratio':'16:9','watermark':False,'generate_audio':True}
            # Reserve the attempt first. A network failure during POST is ambiguous.
            item = {'status':'submission_unknown','prompt':prompt,'reference':ref,'audio':aud,'resolution':'720p','duration':4}
            ledger[label] = item
            LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding='utf-8')
            created = http_json(base + '/contents/generations/tasks', key, payload)
            item.update(taskId=created['id'], status='submitted')
            LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding='utf-8')
            print(label + ': submitted ' + item['taskId'], flush=True)
        deadline = time.monotonic() + 1200
        while time.monotonic() < deadline:
            result = http_json(base + '/contents/generations/tasks/' + item['taskId'], key)
            item['status'] = result['status']
            item['usage'] = result.get('usage', {})
            if result.get('error'):
                item['error'] = result['error']
            LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding='utf-8')
            print(label + ': ' + result['status'], flush=True)
            if result['status'] == 'succeeded':
                with urllib.request.urlopen(result['content']['video_url'], timeout=180) as r:
                    partial = out.with_suffix('.download')
                    partial.write_bytes(r.read())
                    partial.replace(out)
                print(json.dumps({'out':out.name,'taskId':item['taskId'],'usage':item['usage']}), flush=True)
                break
            if result['status'] in ('failed','cancelled','expired'):
                raise RuntimeError(label + ': ' + json.dumps(item.get('error',{})))
            time.sleep(20)
        else:
            raise RuntimeError('Polling timed out; rerun to resume this same task')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['audit','status','generate'])
    parser.add_argument('--history', type=Path, help='Kimi wire.jsonl to audit; read only')
    args = parser.parse_args()
    if args.action == 'audit':
        if not args.history:
            parser.error('audit requires --history')
        historical(args.history)
    else:
        {'status':status,'generate':generate}[args.action]()
