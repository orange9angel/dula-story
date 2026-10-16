"""Generate isolated stems from reviewed directions; cache by input + audio hashes."""
from pathlib import Path
import hashlib, json, os, sys

EP = Path(__file__).resolve().parents[1]
STORY = EP.parents[1]
sys.path.insert(0, str(STORY.parent / 'dula-skills/volc-voice-casting/scripts'))
from seedtts_say import synthesize
from seedaudio_gen import generate

for raw in (STORY / '.env.speech').read_text(encoding='utf-8-sig').splitlines():
    if raw.strip().startswith('#') or '=' not in raw:
        continue
    key, value = raw.removeprefix('export ').split('=', 1)
    if key.strip() == 'VOLC_SPEECH_API_KEY':
        os.environ.setdefault(key.strip(), value.strip().strip('"\''))

plan = json.loads((EP/'config/audio_direction.json').read_text(encoding='utf-8'))
assert plan['status'] == 'reviewed'
assert plan['sources'][0]['sha256'] == hashlib.sha256((EP/'script.story').read_bytes()).hexdigest()

def cached(out, request, call):
    out.parent.mkdir(parents=True, exist_ok=True)
    meta = out.with_suffix('.source.json')
    key = hashlib.sha256(json.dumps(request, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    old = json.loads(meta.read_text(encoding='utf-8')) if meta.exists() else {}
    if out.exists() and old.get('input_sha256') == key and old.get('audio_sha256') == hashlib.sha256(out.read_bytes()).hexdigest():
        print('cached', out.name, flush=True)
        return
    call()
    meta.write_text(json.dumps({'request':request,'input_sha256':key,'audio_sha256':hashlib.sha256(out.read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('generated',out.name,flush=True)

if '--score-foley' in sys.argv:
    for cue in plan['music']+plan['sfx']:
        if cue in plan['music'] and cue.get('provider')!='seed-audio-1.0':
            raise ValueError('Score requires its declared provider; use suno-driver for Suno. Do not silently regenerate with Seed-Audio.')
        out=EP/cue['asset']
        cached(out,{'provider':'seed-audio-1.0','prompt':cue['prompt']},lambda:generate(cue['prompt'],out))
elif '--ambience' in sys.argv:
    cue=plan['ambience'][0];out=EP/cue['asset']
    cached(out,{'provider':'seed-audio-1.0','prompt':cue['prompt']},lambda:generate(cue['prompt'],out))
else:
    for line in plan['dialogue']:
        if '--character' in sys.argv and line['character'] != sys.argv[sys.argv.index('--character')+1]:
            continue
        speaker=plan['characters'][line['character']]['voice']
        delivery=line['delivery'];emotion=delivery.get('nativeEmotion')
        scale=delivery.get('nativeEmotionScale',2) if emotion else None
        context=delivery.get('nativeContextTexts');rate=delivery.get('nativeSpeechRate')
        request={'text':line['text'],'speaker':speaker,'emotion':emotion,'emotion_scale':scale,'provider':'seed-tts-2.0'}
        # Cache the actual wire contract and acting inputs, not only semantic labels.
        request.update(wireVersion=2,context_texts=context,speech_rate=rate)
        out=EP/f"assets3d/dialogue_r3/entry_{line['entry']}.mp3"
        cached(out,request,lambda:synthesize(line['text'],speaker,out,emotion=emotion,emotion_scale=scale,context_texts=context,speech_rate=rate))
