"""Quiet generated room tone: numerical envelope/spectrum checks, no synthesized replacement."""
from pathlib import Path
import json,subprocess,hashlib
import numpy as np
from scipy.signal import butter,sosfiltfilt,welch
from scipy.ndimage import uniform_filter1d
from scipy.io import wavfile
EP=Path(__file__).resolve().parents[1];source=EP/'assets3d/ambience/biology_room.wav';sr=48000
b=subprocess.run(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ac','2','-ar',str(sr),'pipe:1'],capture_output=True,check=True).stdout
y=np.frombuffer(b,dtype='<f4').reshape(-1,2).astype(float)
assert len(y)>=81*sr
# Use the interior 75 seconds; avoid the generator's entrance/exit fade.
y=y[5*sr:80*sr]
def measures(z):
    mono=z.mean(axis=1);n=len(mono)//4800;env=np.sqrt(np.mean(mono[:n*4800].reshape(-1,4800)**2,axis=1))
    sec=np.sqrt(np.mean(mono[:(len(mono)//sr)*sr].reshape(-1,sr)**2,axis=1))
    x=env-env.mean();power=float(x@x);rel=float(env.std()/max(env.mean(),1e-9))
    corr=max(float(x[:-k]@x[k:]/max(power,1e-15)) for k in range(5,11)) if rel>.005 else 0
    f,p=welch(mono,sr,nperseg=8192)
    return {'rmsMaxMean':float(sec.max()/sec.mean()),'periodicAutocorrelation':corr,'envelopeRelativeStd':rel,'hissFraction':float(p[(f>=4000)&(f<=8000)].sum()/p.sum())}
before=measures(y)
if before['hissFraction']>=.2:y=sosfiltfilt(butter(3,[60,1500],btype='bandpass',fs=sr,output='sos'),y,axis=0)
if before['rmsMaxMean']>=1.4 or before['periodicAutocorrelation']>=.15:
    energy=uniform_filter1d(np.mean(y*y,axis=1),size=round(.4*sr),mode='nearest')
    target=float(np.sqrt(np.median(energy)));y*=np.clip(target/np.sqrt(np.maximum(energy,1e-10)),.15,6)[:,None]
after=measures(y)
if after['rmsMaxMean']>=1.4 or after['periodicAutocorrelation']>=.15 or after['hissFraction']>=.2:
    raise ValueError('Ambience envelope/spectrum not acceptable: '+json.dumps(after))
# -53 dBFS RMS: audible only as very quiet space between the voices.
y*=10**(-53/20)/np.sqrt(np.mean(y*y));dest=source.with_name('biology_room_prepared.wav')
wavfile.write(dest,sr,(np.clip(y,-.95,.95)*32767).astype(np.int16))
r={'passed':True,'before':before,'after':after,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'prepared_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'duration':len(y)/sr,'origin':'Seed-Audio 1.0; generated isolated ambience','rmsDbfs':-53}
(EP/'storyboard/ambience_qc.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r))
