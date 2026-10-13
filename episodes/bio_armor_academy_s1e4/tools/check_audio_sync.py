"""Numerical speech coverage and final-stem mouth gating; no visual inspection."""
from pathlib import Path
import hashlib, json
import numpy as np
from scipy.io import wavfile
EP=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((EP/p).read_text(encoding='utf-8'))
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
tl=load('config/timeline.json');features=load('config/voice_features.json');timing=load('config/audio_timing.json');errors=[]
assert features['sourceStory']==timing['sourceStory']==tl['source']
assert tl['source']['sha256']==digest(EP/'script.story')
assert timing['mix_sha256']==digest(EP/'assets3d/mixed.wav')
if timing.get('ambience'):assert timing['ambience']['sha256']==digest(EP/timing['ambience']['path'])
assert len(timing['lines'])==len(tl['dialogue'])==12
for line,source in zip(timing['lines'],tl['dialogue']):
    assert all(line[k]==source[k] for k in source)
    assert line['audioEnd']<=line['end'] and line['duration']>.2
    assert line['processed_sha256']==digest(EP/line['processed'])
for key,desc in features['stems'].items():
    assert desc['sha256']==digest(EP/desc['path'])
    sr,y=wavfile.read(EP/desc['path']);assert sr==48000 and len(y)==round(tl['duration']*sr)
    rms=np.sqrt(np.mean((y.astype(float)/32768).reshape(-1,480)**2,axis=1))
    jaw=np.array(features['characters'][key][:-1]);assert len(jaw)==len(rms)
    assert not np.any(jaw[rms<=desc['rmsGate']]>0)
    mask=np.zeros(len(jaw),bool)
    for d in tl['dialogue']:
        if d['character']==key:mask[int(d['start']*100):int(np.ceil(d['end']*100))+1]=True
    assert not np.any(jaw[~mask]>0)
sr,mix=wavfile.read(EP/'assets3d/mixed.wav');assert sr==48000 and len(mix)==round(tl['duration']*sr)
report={'passed':True,'lines':len(timing['lines']),'duration':len(mix)/sr,'stems':len(features['stems']),'mouth':'10 ms final-stem energy; silence gated; no phoneme/artistic claim','mixPeak':float(np.max(np.abs(mix.astype(float)))/32768)}
(EP/'storyboard/audio_sync.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
