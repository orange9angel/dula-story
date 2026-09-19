"""Compile final-voice mouth tracks and authoritative performance entries.

Run after build_timeline.py. Material scheduling is measured upstream; the
resulting script.story owns performance/camera decisions consumed by viewer.
"""
from pathlib import Path
import json, hashlib, re
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d
from viseme_core import build_viseme_track
ROOT=Path(__file__).resolve().parents[1]
def dump(p,v):
    if p=='config/final_voice_features.json':
        # One frame per line keeps generated-data diffs bounded and inspectable.
        head={k:value for k,value in v.items() if k!='characters'}
        text=json.dumps(head,ensure_ascii=False,indent=2).rstrip()[:-1]+',\n  "characters": {\n'
        groups=[]
        for name,frames in v['characters'].items():
            groups.append('    '+json.dumps(name)+': [\n'+',\n'.join('      '+json.dumps(f,separators=(',',':')) for f in frames)+'\n    ]')
        text+=',\n'.join(groups)+'\n  }\n}\n'
        assert json.loads(text)==v
    else:text=json.dumps(v,ensure_ascii=False,indent=2)
    (ROOT/p).write_text(text,encoding='utf-8')
def main():
    tl=json.loads((ROOT/'config/timeline.json').read_text(encoding='utf-8'))
    voice,sr=sf.read(ROOT/'assets/audio/voice_bus.wav',always_2d=True)
    mono=voice.mean(axis=1);hop=round(sr*.01);size=round(sr*.02)
    padded=np.pad(mono,(size//2,size));n=int(np.ceil(len(mono)/hop))
    rms=np.array([np.sqrt(np.mean(padded[i*hop:i*hop+size]**2)) for i in range(n)])
    rms=gaussian_filter1d(rms,.7)
    # Slow release suppresses vibrato; fast gate below still closes real rests.
    env=np.zeros(n);prev=0
    for i,value in enumerate(rms):
        k=1-np.exp(-.01/(.020 if value>prev else .250))
        prev+=k*(value-prev);env[i]=prev
    env=gaussian_filter1d(env,6)
    tracks={};features={}
    for character in ('Yuki','Mochi'):
        gates=np.zeros(n);amp=np.zeros(n)
        for s in tl['segments']:
            if s.get('character')!=character:continue
            lo,hi=round(s['start']/.01),min(n,round(s['end']/.01))
            ref=max(float(np.quantile(env[lo:hi],.97)),1e-6)
            amp[lo:hi]=np.clip(env[lo:hi]/ref,0,1)**.58
            gates[lo:hi]=np.clip((rms[lo:hi]/ref-.025)/.065,0,1)
        chars=sorted([c for d in tl['dialogue'] if d['character']==character for c in d['chars']]
                     +tl['songB' if character=='Yuki' else 'songA']['chars'],key=lambda c:c['start'])
        def at(t):return float(np.interp(t,np.arange(n)*.01,amp))
        keys=build_viseme_track(chars,at,tl['duration'])
        tracks[character]=keys
        # Runtime gate is separate so sparse viseme interpolation cannot bridge
        # a quiet gap. Features come from the scheduled, converted voice bus.
        features[character]=[{'t':round(i*.01,2),'amplitude':round(float(amp[i]),4),
                              'gate':round(float(gates[i]),4)} for i in range(n)]
        dump(f'config/viseme_{character.lower()}.json',{'sample_step':.01,'keyframes':keys,
            'method':'continuous pinyin visemes + final scheduled voice dynamics; not measured phonemes'})
    dump('config/final_voice_features.json',{'step':.01,'voice_bus_sha256':hashlib.sha256((ROOT/'assets/audio/voice_bus.wav').read_bytes()).hexdigest(),'characters':features})
    blocks=[];index=0
    def stamp(t):
        ms=round(t*1000);return f'00:{ms//60000:02d}:{ms%60000//1000:02d},{ms%1000:03d}'
    def emit(s,start,end,ym,mm,shot,emotion='focused',text='',speaker=None,line=-1):
        nonlocal index
        index+=1
        tags=[]
        if index==1:tags+=['@HomeKitchenScene','{Position:Yuki|x=-0.43|y=0|z=0|face=forward}','{Position:Mochi|x=0.69|y=0|z=0|face=forward}']
        for char,move in [('Yuki',ym),('Mochi',mm)]:
            opts={'character':char,'action':'AdPose','pose':'hello','duration':round(end-start,3),
                'move':move,'emotion':emotion if char=='Yuki' else 'calm','expression':'smile','focus':'right' if ym=='fish_accuse' else 'audience',
                'hit':round(start+.2,3),'land':round(min(tl['beat_grid']['beats'],key=lambda b:abs(b-start-.45)),3),
                'shot':shot,'outfit':'original','accessory':'none','motif':'none','segment':s['id'],'line':line,'kind':s['kind']}
            tags.append('{Event:Animate|'+'|'.join(f'{k}={v}' for k,v in opts.items())+'}')
        tags.append('{Camera:AdCamera|shot=hello}')
        if text:tags.append(f'[{speaker}]{text}')
        blocks.append(f'{index}\n{stamp(start)} --> {stamp(end)}\n'+'\n'.join(tags))
    prev_end=0
    for s in tl['segments']:
        if s['start']>prev_end+.001:
            hold={'id':'reaction','kind':'reaction'}
            emit(hold,prev_end,s['start'],'fish_accuse','cat_idle','wide')
        if s['kind']=='song':
            song=tl[s['id']];lines=song['lines']
            for li,line in enumerate(lines):
                st=s['start'] if li==0 else line['start'];end=lines[li+1]['start'] if li<3 else s['end']
                if s['id']=='songA':
                    ym,mm,em='fish_accuse',['cat_deny','cat_taste','cat_innocent','cat_deny'][li],'focused'
                    shot=['cat','wide','cat','wide'][li]
                else:
                    ym,mm,em=['fish_point','fish_smell','fish_caught','fish_verdict'][li],'cat_guilty','proud'
                    shot=['wide','yuki','wide','wide'][li]
                emit(s,st,end,ym,mm,shot,em,line=li)
        elif s['kind']=='dialogue':
            ym='fish_accuse' if s['character']=='Yuki' else 'fish_listen'
            mm='cat_defeat' if s['id']=='05_mochi_defeat' else 'cat_talk'
            shot='evidence' if s['id']=='03_yuki_press' else 'cat' if s['character']=='Mochi' else 'wide'
            d=next(d for d in tl['dialogue'] if d['id']==s['id'])
            emit(s,s['start'],s['end'],ym,mm,shot,text=d['display'],speaker=s['character'])
        else:emit(s,s['start'],s['end'],'fish_listen','cat_wash','wide','proud')
        prev_end=s['end']
    (ROOT/'script.story').write_text('\n\n'.join(blocks)+'\n',encoding='utf-8')
    tl['story_sha256']=hashlib.sha256((ROOT/'script.story').read_bytes()).hexdigest()
    tl['source_note']='Media schedule cache. Viewer consumes script.story for performance and camera.'
    dump('config/timeline.json',tl)
    dump('config/voice_config.json',{'Yuki':{'provider':'seedtts','speaker':'zh_female_vv_uranus_bigtts','voice':'zh_female_vv_uranus_bigtts'},
        'Mochi':{'provider':'seedtts','speaker':'ICL_uranus_zh_male_youmodaye_tob','voice':'ICL_uranus_zh_male_youmodaye_tob'}})
    print(f'{index} story entries; final voice feature frames {n}; duration {tl["duration"]}')
if __name__=='__main__':main()
