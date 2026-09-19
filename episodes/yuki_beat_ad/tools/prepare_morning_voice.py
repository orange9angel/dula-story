"""Use only the episode explicitly selected by the user as Yuki voice reference."""
from pathlib import Path
import hashlib,json
import numpy as np
import soundfile as sf
from prepare_voice_audition import decode

ROOT=Path(__file__).resolve().parents[1]

def main():
    episode=ROOT.parent/'yuki_morning_battle';out=ROOT/'assets/audio/voice_morning';out.mkdir(exist_ok=True)
    cfg=json.loads((episode/'config/voice_config.json').read_text(encoding='utf-8'))
    manifest=json.loads((episode/'assets/audio/manifest.json').read_text(encoding='utf-8'))
    pieces=[];sources=[]
    for row in manifest['entries']:
        if row['character']!='Yuki' or row['index'] not in (7,9,11,13):continue
        path=episode/'assets/audio'/row['file'];x=decode(path)[round(row['sourceOffset']*44100):]
        pieces.extend([x,np.zeros(round(.12*44100),dtype=np.float32)])
        sources.append({'path':str(path.relative_to(ROOT.parent.parent)),'text':row['dialogue'],
                        'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    sf.write(out/'morning_reference.wav',np.concatenate(pieces),44100,subtype='PCM_16')
    sf.write(ROOT/'output/yuki_morning_voice_reference.wav',np.concatenate(pieces),44100,subtype='PCM_16')
    source=decode(ROOT/'assets/audio/stems_v10/vocals.wav')[:round(6.5*44100)]
    sf.write(out/'song_6p5s.wav',source,44100,subtype='PCM_16')
    meta={'reference_episode':'yuki_morning_battle','speaker':cfg['Yuki']['default']['speaker'],
        'sources':sources,'reference_seconds':sum(len(x) for x in pieces)/44100,'song_seconds':6.5,
        'status':'reference_prepared','accepted':False,'method':'Seed-VC F0-conditioned; no pitch or speed adjustment'}
    (ROOT/'config/voice_morning_audition.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(meta,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
