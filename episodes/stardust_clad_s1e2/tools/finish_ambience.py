"""Filter and level the generated night wind; retain the untouched source."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import welch

EP=Path(__file__).resolve().parents[1]
source=EP/'assets3d/sfx/night_wind.wav';out=source.with_name('night_wind_edited.wav');sr=48000
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-af','highpass=f=220,lowpass=f=1600','-ar',str(sr),'-ac','2','-f','f32le','-'])
x=np.frombuffer(raw,np.float32).reshape(-1,2).copy()
env=np.sqrt(uniform_filter1d(np.mean(x*x,axis=1),round(.4*sr))+1e-10)
gain=np.clip(float(np.median(env))/env,.65,2.2)
gain=uniform_filter1d(gain,round(.6*sr));x*=gain[:,None]
x*=.045/max(float(np.sqrt(np.mean(x*x))),1e-8)
sf.write(out,x,sr,subtype='PCM_16')
rms=np.sqrt(np.mean(x[:len(x)//sr*sr].reshape(-1,sr,2)**2,axis=(1,2)))
f,p=welch(x.mean(axis=1),sr,nperseg=4096)
ratio=float(p[(f>=4000)&(f<=8000)].sum()/max(p.sum(),1e-10))
data={'provider':'volcano-seedaudio','source':str(source.relative_to(EP)),
      'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
      'processing':'highpass 220 Hz; lowpass 1600 Hz; 400 ms RMS, 600 ms gain smoothing, gain .65..2.2; RMS .045',
      'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
      'qc':{'maxMeanRms':float(rms.max()/rms.mean()),'highBandFraction':ratio},
      'limit':'Level and bandwidth checks; listening observation stored separately.'}
out.with_suffix('.source.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(data['qc']))
