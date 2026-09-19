"""Package the specified-episode voice audition with reference and blind A/B."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
ROOT=Path(__file__).resolve().parents[1]

def load(path,sr=48000):
    x,rate=sf.read(path,always_2d=True);return resample_poly(x,sr,rate,axis=0)

def main():
    folder=ROOT/'assets/audio/voice_morning';out=ROOT/'output';sr=48000;n=round(6.5*sr)
    settings=[('A',30,.65),('B',40,.85)];candidates=[]
    source=load(ROOT/'assets/audio/stems_v10/vocals.wav')[:n]
    master=load(ROOT/'assets/audio/mixed_v12.wav')[:n]
    for label,steps,cfg in settings:
        path=folder/f'converted/vc_song_6p5s_morning_reference_1.0_{steps}_{cfg}.wav'
        x=load(path).mean(axis=1)
        x=np.pad(x[:n],(0,max(0,n-len(x))))
        gain=np.sqrt(np.mean(source**2))/max(np.sqrt(np.mean(x**2)),1e-8)
        dry=x*gain;mix=master-source+dry[:,None]
        candidates.append((label,mix,dry,{'label':label,'steps':steps,'cfg':cfg,'gain':float(gain),'input':str(path.relative_to(ROOT))}))
    common=min(1,.92/max(np.max(abs(x[1])) for x in candidates))
    for label,mix,dry,meta in candidates:
        sf.write(out/f'yuki_morning_singing_{label}.wav',mix*common,sr,subtype='PCM_16')
        sf.write(out/f'yuki_morning_singing_{label}_dry.wav',dry*common,sr,subtype='PCM_16')
        meta.update(seconds=n/sr,peak=float(np.max(abs(mix*common))))
    sf.write(out/'yuki_morning_singing_original.wav',master*common,sr,subtype='PCM_16')
    ref=load(folder/'morning_reference.wav').mean(axis=1)
    # One-file audio review: reference, original singer, A, B; no identities
    # claimed in the prompt. Normalize excerpts for a fair timbre comparison.
    sections=[];cursor=0;timeline=[]
    for name,x in [('reference',ref),('original',source.mean(axis=1)),('A',candidates[0][2]),('B',candidates[1][2])]:
        gain=min(.12/max(np.sqrt(np.mean(x*x)),1e-8),.9/max(np.max(abs(x)),1e-8));x=x*gain
        timeline.append({'label':name,'start':cursor,'end':cursor+len(x)/sr})
        sections.extend([x,np.zeros(round(.75*sr))]);cursor+=len(x)/sr+.75
    sf.write(folder/'voice_comparison_dry.wav',np.concatenate(sections),sr,subtype='PCM_16')
    meta=json.loads((ROOT/'config/voice_morning_audition.json').read_text(encoding='utf-8'))
    meta.update(status='two_candidates_rendered',accepted=False,candidates=[c[3] for c in candidates],
        common_mix_gain=common,review_timeline=timeline,
        limitations=['Reference episode identity is exact; perceived singing identity remains unaccepted.',
                     'V13 visual comparison uses the original song. A chosen converted master needs fresh lip validation.'])
    (ROOT/'config/voice_morning_audition.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(meta,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
