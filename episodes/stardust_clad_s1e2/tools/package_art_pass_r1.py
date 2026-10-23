"""Package the two art-pass excerpts against the fixed R27 release.

No audio generation: presentation audio is decoded from the accepted MP4.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
BOARD = ROOT / 'storyboard/art_pass_pilot/r1'
SOURCE = OUT / 'stardust_clad_s1e2_palace_r27.mp4'
WINDOWS = [('resolve', 132, 5, '决意近景 132–137 秒'),
           ('guard', 56.5, 2.5, '格挡与反应 56.5–59 秒')]

def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)

def probe(file):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_type,width,height,r_frame_rate,nb_frames,duration:format=duration',
        '-of', 'json', str(file)], text=True))

def pcm(file, start=0, duration=None):
    args=['ffmpeg','-v','error','-ss',str(start),'-i',str(file)]
    if duration is not None:
        args += ['-t',str(duration)]
    args += ['-vn','-ac','1','-ar','16000','-f','f32le','pipe:1']
    return np.frombuffer(subprocess.check_output(args), dtype=np.float32)

def audio_check(file, start, duration):
    expected,actual=pcm(SOURCE,start,duration),pcm(file,0,duration)
    n=min(len(expected),len(actual));a=expected[:n];b=actual[:n]
    # Search small offsets as well as checking the zero-offset correlation.
    scores=[]
    for lag in range(-160,161):
        x,y=(a[lag:],b[:n-lag]) if lag>=0 else (a[:n+lag],b[-lag:])
        denominator=float(np.linalg.norm(x)*np.linalg.norm(y))
        scores.append((float(np.dot(x,y)/denominator) if denominator else 0,lag))
    corr,lag=max(scores)
    return {'correlation':corr,'offset_ms':lag/16,'samples':n,
            'passed':corr>.98 and abs(lag)<=16}

report={'source':str(SOURCE.relative_to(ROOT)),
        'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'windows':[], 'status':'technical_validation_only'}
font=r"fontfile='C\:/Windows/Fonts/msyh.ttc'"
for name,start,duration,label in WINDOWS:
    raw=OUT/f'art_pass_{name}_r1.mp4'
    voiced=OUT/f'art_pass_{name}_r1_voiced.mp4'
    run('-i',raw,'-ss',start,'-t',duration,'-i',SOURCE,
        '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k',
        '-t',duration,'-movflags','+faststart',voiced)
    compare=OUT/f'art_pass_{name}_comparison_r1.mp4'
    filters=(f'[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];'
        f'[a][b]hstack=inputs=2,pad=2560:768:0:48:color=0x121723,'
        f"drawtext={font}:text='R27 原版 · {label}':fontcolor=white:fontsize=27:x=28:y=10,"
        f"drawtext={font}:text='二维作画试片 · 同机位与原声':fontcolor=0xffd99b:fontsize=27:x=1308:y=10[v]")
    run('-ss',start,'-t',duration,'-i',SOURCE,'-i',voiced,'-filter_complex',filters,
        '-map','[v]','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18',
        '-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',duration,
        '-movflags','+faststart',compare)
    media=probe(voiced);video=next(x for x in media['streams'] if x['codec_type']=='video')
    assert int(video['nb_frames'])==round(duration*30)
    check=audio_check(voiced,start,duration)
    assert check['passed'], check
    report['windows'].append({'id':name,'source_start':start,'duration':duration,
        'video':str(voiced.relative_to(ROOT)),'comparison':str(compare.relative_to(ROOT)),
        'media':media,'audio':check})

for suffix,outname in [('r1_voiced','art_pass_pilot_r1.mp4'),
                      ('comparison_r1','art_pass_pilot_comparison_r1.mp4')]:
    first=OUT/f'art_pass_resolve_{suffix}.mp4';second=OUT/f'art_pass_guard_{suffix}.mp4'
    run('-i',first,'-i',second,'-filter_complex',
        '[0:a]atrim=duration=5,asetpts=PTS-STARTPTS[a0];'
        '[1:a]atrim=duration=2.5,asetpts=PTS-STARTPTS[a1];'
        '[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[v][a]',
        '-map','[v]','-map','[a]','-c:v','libx264','-preset','medium','-crf','18',
        '-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','7.5','-movflags','+faststart',OUT/outname)
    info=probe(OUT/outname)
    assert int(next(s for s in info['streams'] if s['codec_type']=='video')['nb_frames'])==225
    final_audio=[]
    for source_start,assembled_start,duration in [(132,0,5),(56.5,5,2.5)]:
        a,b=pcm(SOURCE,source_start,duration),pcm(OUT/outname,assembled_start,duration)
        n=min(len(a),len(b));corr=float(np.dot(a[:n],b[:n])/(np.linalg.norm(a[:n])*np.linalg.norm(b[:n])))
        assert corr>.98,(outname,assembled_start,corr)
        final_audio.append({'source_start':source_start,'assembled_start':assembled_start,
                            'zero_offset_correlation':corr,'passed':True})
    report[outname]={'media':info,'sha256':hashlib.sha256((OUT/outname).read_bytes()).hexdigest(),'assembled_audio':final_audio}

report['passed']=True
(BOARD/'delivery.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':True,'outputs':['art_pass_pilot_r1.mp4','art_pass_pilot_comparison_r1.mp4'],
                  'audio':[w['audio'] for w in report['windows']]},ensure_ascii=False))
