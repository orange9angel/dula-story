"""Verify the renderer used calibrated windows, then export visual evidence.

These are execution/geometry/media checks, not perceptual lip-sync ground truth.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]

def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))

def main():
    music=read('config/music_analysis_v12.json');cal=read('config/lipsync_calibration_v12.json')
    frames=read('storyboard/v12/performance_trace.json')['frames']
    old=read('storyboard/v11/performance_trace.json')['frames']
    shots=read('storyboard/v12/portrait_trace.json')
    chars=music['lyric_chars'];n=round(music['duration']*60)
    assert len(frames)==len(old)==n==1769 and not shots['errors']
    assert all(a['end']<=b['start'] for a,b in zip(chars,chars[1:]))
    assert ''.join(c['ch'] for c in chars)==''.join((ROOT/'config/diva_lyrics.txt').read_text(encoding='utf-8').split())
    body_keys=['root','hands','feet','acting','camera','spinAngle','move','outfit','scene']
    assert all(all(a[k]==b[k] for k in body_keys) for a,b in zip(frames,old))
    assert all(not f['mouthVisible'] and f['lip']['open']==0 for f in frames if f['lip']['index']<0)
    assert all(not f['mouthVisible'] and f['lip']['open']==0 for f in frames if f['vocal']=='MBP')
    assert all(f['lip']['open']==0 for f in frames if f['lip']['level']==0 and f['lip']['phase']!='prepare')
    assert min(f['handClearance'] for f in frames)>.01
    assert min(p[1]-.04125 for f in frames for p in f['feet'])>=-.002
    coverage=[]
    for i,c in enumerate(chars):
        ff=[f for f in frames if c['start']<=f['t']<c['end']]
        assert ff and all(f['lip']['index']==i for f in ff),(i,c)
        assert max(f['lip']['open'] for f in ff)>.08,(i,c)
        first=ff[0]['t'];error=(first-c['start'])*1000
        assert -.001<=error<16.668
        prior=next((f['t'] for f in old if f['lip']['index']==i),None)
        coverage.append({'char':c['ch'],'index':i,'visual_start':c['start'],'acoustic_start':c['audio_start'],
            'first_rendered_frame':ff[0]['frame'],'sampling_delay_ms':round(error,3),
            'old_first_rendered_time':prior,'visible_change_ms':round((first-prior)*1000,2) if prior is not None else None})
    video=ROOT/'output/yuki_beat_ad_v12.mp4'
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    vs=next(s for s in probe['streams'] if s['codec_type']=='video');aus=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (vs['width'],vs['height'],vs['r_frame_rate'],int(vs['nb_frames']))==(720,1280,'60/1',n)
    assert vs['start_time']==aus['start_time']=='0.000000'
    assert abs(float(probe['format']['duration'])-music['duration'])<.04
    audio=lambda p:subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vn','-f','f32le','-acodec','pcm_f32le','pipe:1'])
    decoded=audio(video);old_decoded=audio(ROOT/'output/yuki_beat_ad_v11.mp4')
    assert decoded==old_decoded,'Encoded comparison audio must be identical'
    assert hashlib.sha256((ROOT/'assets/audio/mixed_v12.wav').read_bytes()).hexdigest()==cal['master_sha256']
    peak=float(np.max(np.abs(np.frombuffer(decoded,dtype='<f4'))));assert peak<1
    report={'video':str(video.relative_to(ROOT)),'frames':n,'duration':probe['format']['duration'],
        'resolution':[720,1280],'fps':60,'browser_errors':shots['errors'],'master_and_decoded_aac_identical_to_v11':True,
        'aac_peak':peak,'v11_body_and_camera_unchanged':True,'old_overlaps':len(cal['inherited_overlaps']),'new_overlaps':0,
        'characters_with_actual_rendered_coverage':len(coverage),
        'max_start_to_render_delay_ms':max(c['sampling_delay_ms'] for c in coverage),
        'rest_frames_closed':sum(f['lip']['index']<0 for f in frames),
        'bilabial_frames_closed':sum(f['vocal']=='MBP' for f in frames),
        'anticipation_frames':sum(f['lip']['phase']=='prepare' for f in frames),
        'global_calibration':cal['global'],'coverage':coverage,
        'limits':['Render sampling error is not acoustic alignment accuracy.',
                  'Local spectral/energy onsets remain estimates; singing phoneme timing is not measured.',
                  'Normal-speed user playback acceptance remains pending.']}
    target=ROOT/'storyboard/v12';(target/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    # Show actual encoded mouth transitions, with the same crop and timestamp.
    times=[.133,.583,1.083,4.333,5.18,9.55,10.15,11.34,21.55,23.65,24.50,28.8]
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    sheet=Image.new('RGB',(1200,4*415),(18,14,28));draw=ImageDraw.Draw(sheet)
    for j,t in enumerate(times):
        cols=[]
        for ver in ('v11','v12'):
            raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(ROOT/f'output/yuki_beat_ad_{ver}.mp4'),
                '-frames:v','1','-vf','scale=200:356','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
            cols.append(Image.frombytes('RGB',(200,356),raw))
        x,y=j%3*400,j//3*415
        sheet.paste(cols[0],(x,y+24));sheet.paste(cols[1],(x+200,y+24))
        draw.text((x+8,y),f'{t:.3f}s   V11                  V12',font=font,fill='white')
        frame=frames[min(n-1,round(t*60))]
        draw.text((x+8,y+385),f"{frame['lip']['char'] or '休止'}  {frame['vocal']}  {frame['lip']['phase']}",font=font,fill='#ffe399')
    sheet.save(target/'review_sheet.jpg',quality=90)
    plot_timing(music,cal,frames,old,target)
    print(json.dumps({k:v for k,v in report.items() if k not in ('coverage','global_calibration','limits')},ensure_ascii=False,indent=2))

def plot_timing(music,cal,frames,old,target):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.font_manager import FontProperties
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc',size=9)
    fig,axes=plt.subplots(3,1,figsize=(15,8),layout='constrained')
    scan=cal['scan'];axes[0].plot([s['offset_ms'] for s in scan],[s['flux_score'] for s in scan],label='vocal spectral rise')
    for x in (-125,110):axes[0].axvline(x,color='#c7641c',ls='--',alpha=.7)
    axes[0].set(title='Lag scan: -125 ms and +110 ms are near-tied; global shift not accepted',xlabel='shift (ms)')
    for ax,(begin,end) in zip(axes[1:],[(.0,1.55),(9.1,11.65)]):
        env=[e for e in music['vocal_envelope'] if begin<=e['t']<=end]
        ax.plot([e['t'] for e in env],[e['level'] for e in env],color='#aaaaaa',label='vocal RMS',alpha=.8)
        for fs,label,col in [(old,'V11 mouth opening','#ab4369'),(frames,'V12 mouth opening','#1565ac')]:
            ff=[f for f in fs if begin<=f['t']<=end]
            ax.plot([f['t'] for f in ff],[f['lip']['open'] for f in ff],label=label,color=col,lw=1.5)
        for c in music['lyric_chars']:
            if begin<=c['audio_start']<=end:
                ax.axvline(c['audio_start'],color='#389c62',lw=.8,ls=':')
                ax.text(c['audio_start'],1.05,c['ch'],fontproperties=font,color='#22663d')
        ax.set(xlim=(begin,end),ylim=(-.03,1.2),xlabel='song time (s)');ax.legend(loc='upper right',fontsize=8)
    fig.savefig(target/'timing_review.png',dpi=150);plt.close(fig)

if __name__=='__main__':main()
