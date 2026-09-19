"""V14: anti-vibrato amplitude envelope for mouth performance; V13 timing/schema kept."""
from pathlib import Path
import hashlib,json
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d
from scipy.signal import stft,resample_poly

ROOT=Path(__file__).resolve().parents[1]
HOP=.01  # 10ms frames
ATTACK=.020   # fast attack keeps consonant onsets crisp
RELEASE=.250  # slow release ignores vibrato dips
LOWPASS=.100  # ~100ms smoothing window kills 5-7Hz vibrato modulation

def envelope(rms):
    a=1-np.exp(-HOP/ATTACK);r=1-np.exp(-HOP/RELEASE)
    out=np.empty_like(rms);prev=0.0
    for i,x in enumerate(rms):
        prev=x+(prev-x)*(r if x<prev else a);out[i]=prev
    return out

def main():
    stem=ROOT/'assets/audio/stems_v10/vocals.wav'
    y,sr=sf.read(stem,always_2d=True);x=resample_poly(y.mean(axis=1),16000,sr)
    hop=160;size=320;n=int(np.ceil(len(x)/hop));padded=np.pad(x,(size//2,size))
    rms=np.array([np.sqrt(np.mean(padded[i*hop:i*hop+size]**2)) for i in range(n)])
    rms=gaussian_filter1d(rms,.7)
    # V13 path (kept only for the comparison report)
    ref13=float(np.quantile(rms,.99));floor13=ref13*.026
    amp13=np.clip((rms-floor13)/(ref13-floor13),0,1)**.58
    # V14: asymmetric envelope follower, then a ~100ms low-pass on the envelope
    env=gaussian_filter1d(envelope(rms),LOWPASS/HOP)
    reference=float(np.quantile(env,.99));floor=reference*.026
    amplitude=np.clip((env-floor)/(reference-floor),0,1)**.58
    gate=np.clip((rms-floor)/(floor*2),0,1)
    freq,tt,z=stft(x,16000,nperseg=512,noverlap=352,boundary='zeros')
    power=abs(z)**2
    high=power[(freq>2500)&(freq<7000)].sum(axis=0)
    total=power[(freq>120)&(freq<7000)].sum(axis=0)
    noise=high/(total+1e-12)
    features=[{'t':round(i*.01,3),'rms':round(float(rms[i]),6),'amplitude':round(float(amplitude[i]),4),
               'gate':round(float(gate[i]),4),'high_ratio':round(float(np.interp(i*.01,tt,noise)),4)} for i in range(n)]
    report={'method':'20ms centered RMS / 10ms hop -> asymmetric envelope (20ms attack / 250ms release) -> ~100ms low-pass, 99th-percentile reference, dynamic amplitude; high-band ratio for consonant support',
        'source':'assets/audio/stems_v10/vocals.wav','source_sha256':hashlib.sha256(stem.read_bytes()).hexdigest(),
        'sample_step':.01,'rms_floor':floor,'rms_reference':reference,'frames':features,
        'limits':'Audio controls aperture; pinyin still approximates vowel/closure identity, not measured phonemes.'}
    (ROOT/'config/vocal_features_v14.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'V14 {n} feature frames; saturation {sum(amplitude>=.999)/n:.1%}; story/mixed reused from V13')
    # Vibrato validation: sustained tail chars from the alignment
    music=json.loads((ROOT/'config/music_analysis_v12.json').read_text(encoding='utf-8'))
    longs=[c for c in music['lyric_chars'] if c['audio_end']-c['audio_start']>=.4
           and c['ch'] in '来光嗨拍大雪世奏' ]
    def vib(a,seg):  # vibrato-band jitter: 4-9Hz band-limited modulation depth
        d=a[seg]-a[seg].mean();L=len(d)
        sp=np.abs(np.fft.rfft(d*np.hanning(L)))*2/L
        fr=np.fft.rfftfreq(L,HOP)
        band=sp[(fr>=4)&(fr<=9)]
        return float(np.sqrt(np.sum(band**2)/2)),float(np.std(a[seg]))
    print(f"{'char':<4}{'span(s)':<16}{'vib_v13':<9}{'vib_v14':<9}{'vib_drop':<9}{'std_v13':<9}{'std_v14':<9}")
    for c in longs:
        i0=int(c['audio_start']/HOP)+4;i1=int(c['audio_end']/HOP)-3  # skip onset/offset edges
        if i1-i0<15:continue
        seg=slice(i0,i1)
        v13,s13=vib(amp13,seg);v14,s14=vib(amplitude,seg)
        print(f"{c['ch']:<4}{c['audio_start']:.2f}-{c['audio_end']:.2f}     {v13:<9.4f}{v14:<9.4f}"
              f"{(1-v14/max(v13,1e-9))*100:6.1f}%  {s13:<9.4f}{s14:<9.4f}")
    # Onset-edge delay: time from audio_start to 50% of the local peak
    delays=[]
    for c in music['lyric_chars']:
        if c.get('anchor_status')!='clear_unique_vocal_attack':continue
        i0=int(c['audio_start']/HOP);w=slice(max(i0-2,0),min(i0+30,n))
        for tag,amp in (('v13',amp13),('v14',amplitude)):
            seg=amp[w];pk=seg.max()
            if pk<.35:continue
            th=np.where(seg>=pk*.5)[0]
            if len(th):delays.append((tag,(w.start+th[0]-i0)*HOP))
    d13=[d for tag,d in delays if tag=='v13'];d14=[d for tag,d in delays if tag=='v14']
    print(f'attack 50%-rise delay: v13 mean {np.mean(d13)*1000:.1f}ms, v14 mean {np.mean(d14)*1000:.1f}ms '
          f'(added {(np.mean(d14)-np.mean(d13))*1000:+.1f}ms, must stay <30ms)')

if __name__=='__main__':main()
