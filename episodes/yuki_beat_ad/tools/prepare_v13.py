"""Extract unsaturated vocal features for mouth performance; keep V12 timing."""
from pathlib import Path
import hashlib,json,shutil
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d
from scipy.signal import stft,resample_poly

ROOT=Path(__file__).resolve().parents[1]

def main():
    stem=ROOT/'assets/audio/stems_v10/vocals.wav'
    y,sr=sf.read(stem,always_2d=True);x=resample_poly(y.mean(axis=1),16000,sr)
    hop=160;size=320;n=int(np.ceil(len(x)/hop));padded=np.pad(x,(size//2,size))
    rms=np.array([np.sqrt(np.mean(padded[i*hop:i*hop+size]**2)) for i in range(n)])
    rms=gaussian_filter1d(rms,.7)
    reference=float(np.quantile(rms,.99));floor=reference*.026
    amplitude=np.clip((rms-floor)/(reference-floor),0,1)**.58
    gate=np.clip((rms-floor)/(floor*2),0,1)
    freq,tt,z=stft(x,16000,nperseg=512,noverlap=352,boundary='zeros')
    power=abs(z)**2
    high=power[(freq>2500)&(freq<7000)].sum(axis=0)
    total=power[(freq>120)&(freq<7000)].sum(axis=0)
    noise=high/(total+1e-12)
    features=[{'t':round(i*.01,3),'rms':round(float(rms[i]),6),'amplitude':round(float(amplitude[i]),4),
               'gate':round(float(gate[i]),4),'high_ratio':round(float(np.interp(i*.01,tt,noise)),4)} for i in range(n)]
    report={'method':'20ms centered RMS / 10ms hop, 99th-percentile reference, dynamic amplitude; high-band ratio for consonant support',
        'source':'assets/audio/stems_v10/vocals.wav','source_sha256':hashlib.sha256(stem.read_bytes()).hexdigest(),
        'sample_step':.01,'rms_floor':floor,'rms_reference':reference,'frames':features,
        'limits':'Audio controls aperture; pinyin still approximates vowel/closure identity, not measured phonemes.'}
    (ROOT/'config/vocal_features_v13.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    story=(ROOT/'script_v12.story').read_text(encoding='utf-8').replace('name=mixed_v12|','name=mixed_v13|')
    (ROOT/'script_v13.story').write_text(story,encoding='utf-8')
    for name in ['assets/audio/mixed_v13.wav','assets/audio/music/mixed_v13.wav']:
        shutil.copyfile(ROOT/'assets/audio/mixed_v12.wav',ROOT/name)
    print(f'V13 {n} feature frames; saturation {sum(amplitude>=.999)/n:.1%}; original audio preserved')

if __name__=='__main__':main()
