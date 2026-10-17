"""Refine existing musical beats against attacks in the unchanged final PCM.
The beat track supplies metre; low/high-band transients refine its local timing.
This numerical alignment does not claim a listening review.
"""
from pathlib import Path
import json,hashlib,re
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfiltfilt,resample_poly
from scipy.ndimage import gaussian_filter1d
EP=Path(__file__).resolve().parents[1]
story=(EP/'script.story').read_text(encoding='utf-8-sig')
block=next(b for b in re.split(r'\r?\n\s*\r?\n',story) if 'CafeDuet' in b)
def sec(s):
 h,m,z=s.replace(',','.').split(':');return int(h)*3600+int(m)*60+float(z)
start,end=map(sec,block.splitlines()[1].split(' --> '))
source=EP/'assets/audio/final/mixed.wav';audio,sr=sf.read(source,always_2d=True);y=audio[round(start*sr):round(end*sr)].mean(axis=1)
rate=1000;bands=[]
for lo,hi in [(40,170),(1400,6500)]:
 filtered=sosfiltfilt(butter(3,[lo,hi],btype='bandpass',fs=sr,output='sos'),y)
 energy=resample_poly(filtered**2,rate,sr);energy=np.sqrt(np.maximum(0,gaussian_filter1d(energy,3)))
 attack=np.maximum(0,energy-np.roll(energy,8));attack[:8]=0
 bands.append(attack/(np.percentile(attack,98)+1e-9))
onset=.72*bands[0]+.28*bands[1]
old=json.loads((EP/'config/song_beats.json').read_text());beats=[];events=[]
for i,t in enumerate(old['beats']):
 if t>end-start-.05:break
 a=max(1,round((t-.050)*rate));b=min(len(onset),round((t+.050)*rate))
 times=np.arange(a,b)/rate;score=onset[a:b]*(.8+.2*np.exp(-((times-t)/.055)**2))
 hit=times[np.argmax(score)];strength=float(onset[round(hit*rate)])
 # Weak/no-drum beats retain the tracked musical pulse instead of chasing noise.
 if strength<.12:hit=t
 frame=round((start+hit)*30);aligned=frame/30-start;beats.append(aligned)
 events.append({'index':i,'tracked':t,'attack':float(hit),'time':aligned,'globalFrame':frame,'strength':strength,'frameErrorMs':round((aligned-hit)*1000,3)})
assert all(b>a for a,b in zip(beats,beats[1:]));intervals=np.diff(beats)
result={'tempo':old['tempo'],'songStart':start,'songEnd':end,'beats':beats,'events':events,'audioSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Tracked metre locally refined within 50ms using final PCM 40-170Hz kick and 1.4-6.5kHz attack envelopes, weak pulses kept; nearest global 30fps frame','listeningReview':False,'maxFrameErrorMs':max(abs(e['frameErrorMs']) for e in events),'intervalRange':list(map(float,[intervals.min(),intervals.max()]))}
(EP/'config/dance_beats_v3.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:result[k] for k in ['tempo','maxFrameErrorMs','intervalRange']}));print('beats',len(beats),'median refinement ms',float(np.median([abs(e['attack']-e['tracked'])*1000 for e in events])))
