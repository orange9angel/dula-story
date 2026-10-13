"""Check final speech PCM, DTW text coverage, silent-mouth gating and Foley anchors."""
from pathlib import Path
import hashlib,json,re
import numpy as np
from scipy.io import wavfile
EP=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((EP/p).read_text(encoding='utf-8'))
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
tl=load('config/timeline.json');features=load('config/voice_features.json');timing=load('config/audio_timing.json')
alignment=load('config/dialogue_alignment.json');cues=load('config/sound_cues.json');anchors=load('config/foley_anchors.json')
assert features['sourceStory']==timing['sourceStory']==alignment['sourceStory']==anchors['sourceStory']==tl['source']
assert tl['source']['sha256']==digest(EP/'script.story')
assert anchors['performanceSha256']==digest(EP/'performance_remake.js')
assert timing['mix_sha256']==digest(EP/'assets3d/mixed.wav')
assert timing['ambience']['sha256']==digest(EP/timing['ambience']['path'])
assert len(timing['lines'])==len(tl['dialogue']) and len(tl['dialogue'])>0
for line,source in zip(timing['lines'],tl['dialogue']):
    assert all(line[k]==source[k] for k in source)
    assert line['audioEnd']<=line['end'] and line['duration']>.2
    assert line['processed_sha256']==digest(EP/line['processed'])
    chars=[c for c in alignment['chars'] if c['line']==line['id']]
    assert ''.join(c['ch'] for c in chars)==''.join(re.findall('[\u4e00-\u9fff]',line['text']))
    assert all(line['start']-.001<=c['start']<=c['end']<=line['audioEnd']+.05 for c in chars)
    assert all(a['start']<=b['start'] for a,b in zip(chars,chars[1:]))
for key,desc in features['stems'].items():
    assert desc['sha256']==digest(EP/desc['path'])
    sr,y=wavfile.read(EP/desc['path']);assert sr==48000 and len(y)==round(tl['duration']*sr)
    rms=np.sqrt(np.mean((y.astype(float)/32768).reshape(-1,480)**2,axis=1))
    vis=load(f'config/viseme_{key.lower()}.json');assert vis['sourceStemSha256']==desc['sha256']
    gate=np.array(vis['gate'][:-1]);assert np.array_equal(gate,(rms>.004).astype(float))
    assert all(a['t']<b['t'] for a,b in zip(vis['keyframes'],vis['keyframes'][1:]))
    mask=np.zeros(len(gate),bool)
    for d in tl['dialogue']:
        if d['character']==key:mask[int(d['start']*100):int(np.ceil(d['end']*100))+1]=True
    assert not np.any(gate[~mask]>0)
for cue in cues['music']+cues['sfx']:assert cue['sha256']==digest(EP/cue['source'])
steps=next(c for c in cues['sfx'] if c['id']=='step')
assert len(steps['times'])==len(anchors['landings'])
assert all(abs(t+.03-row['time'])<.001 for t,row in zip(steps['times'],anchors['landings']))
assert next(c for c in cues['sfx'] if c['id']=='glass_slide')['times']==[anchors['slideStart']]
sr,music=wavfile.read(EP/'assets3d/music_stem.wav')
assert np.max(np.abs(music[int(44.5*sr):int(53.2*sr)]))==0
assert np.sqrt(np.mean(music.astype(float)**2))>10
sr,mix=wavfile.read(EP/'assets3d/mixed.wav');assert sr==48000 and len(mix)==round(tl['duration']*sr)
peak=float(np.max(np.abs(mix.astype(float)))/32768);assert .05<peak<.98
report={'passed':True,'lines':len(timing['lines']),'duration':len(mix)/sr,'stems':len(features['stems']),
 'mouth':'Known-text character DTW, pinyin V17 visemes, exact 10 ms final-PCM gate',
 'footsteps':len(steps['times']),'musicSilence':[44.5,53.2],'mixPeak':peak,
 'minSpeechWindowSpare':min(l['end']-l['audioEnd'] for l in timing['lines']),
 'limits':'Numerical/ASR verification only; subjective sound and emotional performance not auditioned by this agent.'}
(EP/'storyboard/audio_sync.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
