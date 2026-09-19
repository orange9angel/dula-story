"""Prepare a short singing conversion audition from the established Yuki voice."""
import hashlib
import json
from pathlib import Path
import subprocess
import numpy as np
import soundfile as sf

ROOT=Path(__file__).resolve().parents[1]

def decode(path,sr=44100):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar',str(sr),'-f','f32le','pipe:1'])
    return np.frombuffer(raw,dtype='<f4').copy()

def main():
    folder=ROOT/'assets/audio/voice_audition';folder.mkdir(parents=True,exist_ok=True)
    episode=ROOT.parent/'yuki_bento_battle'
    cfg=json.loads((episode/'config/voice_config.json').read_text(encoding='utf-8'))
    manifest=json.loads((episode/'assets/audio/manifest.json').read_text(encoding='utf-8'))
    rows=[e for e in manifest['entries'] if e['index'] in (3,19,26)]
    pieces=[];sources=[]
    for e in rows:
        source=episode/'assets/audio'/e['file'];x=decode(source)
        x=x[round(e.get('sourceOffset',0)*44100):]
        pieces.extend([x,np.zeros(round(.12*44100),dtype=np.float32)])
        sources.append({'path':str(source.relative_to(ROOT.parent.parent)),
                        'text':e['dialogue'],'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    ref=np.concatenate(pieces);sf.write(folder/'yuki_reference.wav',ref,44100,subtype='PCM_16')
    source=decode(ROOT/'assets/audio/stems_v10/vocals.wav')[:round(6.0*44100)]
    sf.write(folder/'original_vocal_6s.wav',source,44100,subtype='PCM_16')
    provenance={'purpose':'Zero-shot singing timbre audition; not an accepted replacement master.',
        'voice_config':str((episode/'config/voice_config.json').relative_to(ROOT.parent.parent)),
        'sources':sources,'reference_seconds':len(ref)/44100,'source_start':0,'source_seconds':6.0,
        'method':'Seed-VC V1 F0-conditioned 44.1k; no transposition or duration adjustment',
        'upstream':'https://github.com/Plachtaa/seed-vc','status':'reference_prepared'}
    (ROOT/'config/voice_audition.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Reference {len(ref)/44100:.2f}s; source 6s; {len(sources)} Yuki dialogue clips')

if __name__=='__main__':main()
