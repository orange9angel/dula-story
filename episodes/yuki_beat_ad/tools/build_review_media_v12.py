"""Export synchronized face comparisons and the existing 6s voice audition."""
from pathlib import Path
import json
import argparse
import subprocess
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--before',choices=['v11','v12'],default='v11')
    parser.add_argument('--after',choices=['v12','v13'],default='v12')
    args=parser.parse_args()
    # One audio clock, equal crops, continuous speed. Both picture columns show
    # the exact same frame times in each excerpt.
    inputs=[]
    for ver in (args.before,args.after):inputs+=['-i',str(ROOT/f'output/yuki_beat_ad_{ver}.mp4')]
    filters=[];segments=[]
    for i,(start,end) in enumerate([(0,3.4),(9.1,12.7),(21.3,24.55)]):
        for j,ver in enumerate((args.before.upper(),args.after.upper())):
            filters.append(f'[{j}:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,'
                f'crop=480:640:120:260,pad=480:700:0:60:color=0x120e1c,'
                f'drawtext=text={ver}:fontcolor=white:fontsize=30:x=(w-tw)/2:y=14[v{j}_{i}]')
        filters.append(f'[v0_{i}][v1_{i}]hstack=inputs=2[v{i}]')
        filters.append(f'[1:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}]')
        segments.append(f'[v{i}][a{i}]')
    filters.append(''.join(segments)+'concat=n=3:v=1:a=1[outv][outa]')
    target=ROOT/f'output/yuki_lips_{args.before}_{args.after}_compare.mp4'
    subprocess.run(['ffmpeg','-y','-v','error',*inputs,'-filter_complex',';'.join(filters),'-map','[outv]','-map','[outa]',
        '-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(target)],check=True)
    print(f'Lip comparison: {target.name}')
    if args.after!='v12':return
    # Finish the previously generated audition, without adopting its voice in
    # V12. Actual likeness and singing quality need normal-speed user listening.
    folder=ROOT/'assets/audio/voice_audition'
    converted=folder/'converted/vc_original_vocal_6s_yuki_reference_1.0_30_0.7.wav'
    if not converted.exists():return
    cv,csr=sf.read(converted,always_2d=True)
    master,sr=sf.read(ROOT/'assets/audio/mixed_v11.wav',always_2d=True)
    vocal,vsr=sf.read(ROOT/'assets/audio/stems_v10/vocals.wav',always_2d=True)
    cv=resample_poly(cv.mean(axis=1),sr,csr)
    vocal=resample_poly(vocal,sr,vsr,axis=0)
    n=round(sr*6.0);cv=np.pad(cv[:n],(0,max(0,n-len(cv))))
    master=master[:n];vocal=vocal[:n]
    gain=float(np.sqrt(np.mean(vocal**2))/max(np.sqrt(np.mean(cv**2)),1e-8))
    candidate=master-vocal+cv[:,None]*gain
    common_gain=min(1,.92/max(np.max(abs(candidate)),np.max(abs(master))))
    original_path=ROOT/'output/yuki_voice_original_6s.wav'
    audition_path=ROOT/'output/yuki_voice_audition_6s.wav'
    sf.write(original_path,master*common_gain,sr,subtype='PCM_16')
    sf.write(audition_path,candidate*common_gain,sr,subtype='PCM_16')
    meta=json.loads((ROOT/'config/voice_audition.json').read_text(encoding='utf-8'))
    meta.update(status='6s_conversion_rendered_not_accepted',converted_file=str(converted.relative_to(ROOT)),
        comparison_original=str(original_path.relative_to(ROOT)),comparison_candidate=str(audition_path.relative_to(ROOT)),
        vocal_rms_match_gain=gain,comparison_common_gain=common_gain,sample_rate=sr,
        limits=['Zero-shot reference timbre conversion; no measured identity or user listening acceptance.',
                'Original pitch and duration settings requested, not a claim of perfect phonetic preservation.',
                'V12 final master and mouth timing do not use this audition.'])
    (ROOT/'config/voice_audition.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Voice audition: {audition_path.name}; {n/sr:.2f}s; peak {np.max(abs(candidate*common_gain)):.3f}')

if __name__=='__main__':main()
