"""Review adjacent frames at every change, then inspect the encoded delivery."""
from pathlib import Path
import json
import math
import subprocess
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'storyboard/v4'
trace=json.loads((DIR/'portrait_trace.json').read_text())
shots=trace['shots']
for page in range(math.ceil(len(shots)/12)):
    current=shots[page*12:(page+1)*12]
    sheet=Image.new('RGB',(960,math.ceil(len(current)/4)*455),'#272336');d=ImageDraw.Draw(sheet)
    for i,s in enumerate(current):
        x,y=i%4*240,i//4*455
        sheet.paste(Image.open(DIR/s['filename']).resize((240,427)),(x,y))
        d.text((x+4,y+430),f"{s['t']:.3f}s {s['outfit']}/{s['move']}",fill='white')
    sheet.save(DIR/f'review_{page+1}.jpg',quality=94)
first={}
for s in shots:first.setdefault(s['index'],s)
sheet=Image.new('RGB',(1200,math.ceil(len(first)/5)*455),'#272336');d=ImageDraw.Draw(sheet)
for i,s in enumerate(first.values()):
    x,y=i%5*240,i//5*455
    sheet.paste(Image.open(DIR/s['filename']).resize((240,427)),(x,y))
    d.text((x+5,y+430),f"{s['t']:.3f}s {s['expression']}/{s['move']}",fill='white')
sheet.save(DIR/'lookbook.jpg',quality=94)
music=json.loads((ROOT/'config/music_analysis_v4.json').read_text())
changes=[]
for j,attack in enumerate(music['selected_attacks'],2):
    frame=math.ceil(attack*60-1e-7);before=next(s for s in shots if abs(s['t']-(frame-1)/60)<.0001);after=next(s for s in shots if abs(s['t']-frame/60)<.0001)
    fields=['outfit','accessory','expression','gesture','move']
    changed=[f for f in fields if before[f]!=after[f]]
    assert changed and after['index']==j and before['index']==j-1
    assert after['sunglasses']==(after['accessory']=='shades')
    assert len(after['activeOutfits'])==(0 if after['outfit']=='original' else 1)
    changes.append({'attack':attack,'display_frame':frame,'display_time':frame/60,'error_ms':round((frame/60-attack)*1000,3),'changed':changed,
                    'before':{k:before[k] for k in fields},'after':{k:after[k] for k in fields}})
# Dance moves must be observable: twirl rotates the body, jump leaves the ground
move_checks={}
for move in ['twirl','jump']:
    entries=[s for s in shots if s['move']==move]
    if move=='twirl':
        rotated=[s for s in entries if abs(s['rotY'])>.5]
        move_checks['twirl']={'shots':len(entries),'rotated_frames':len(rotated)}
        assert rotated,'twirl never rotated the body'
    else:
        airborne=[s for s in entries if s['airborne']>.3]
        move_checks['jump']={'shots':len(entries),'airborne_frames':len(airborne)}
        assert airborne,'jump never left the ground'
report={'duration':trace['duration'],'fps':trace['fps'],'browser_errors':trace['errors'],
 'changes':changes,'max_change_error_ms':max(c['error_ms'] for c in changes),'move_checks':move_checks,
 'listening_review':'model-assisted comparison, no human approval','reference_video_available':False}
video=ROOT/'output/yuki_beat_ad_v4.mp4'
if video.exists():
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)],capture_output=True,check=True).stdout)
    v=next(s for s in probe['streams'] if s['codec_type']=='video')
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-vn','-f','f32le','-'],capture_output=True,check=True).stdout
    audio=np.frombuffer(raw,np.float32)
    report['encoded']={'width':v['width'],'height':v['height'],'frames':int(v['nb_frames']),'fps':v['avg_frame_rate'],
                       'duration':float(probe['format']['duration']),'decoded_aac_peak':float(np.abs(audio).max()),'clipped_samples':int((np.abs(audio)>1).sum())}
    assert report['encoded']['frames']==round(trace['duration']*60) and report['encoded']['clipped_samples']==0
(DIR/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='changes'},indent=2))
