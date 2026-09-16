"""Review adjacent frames at every change, verify V6 elements, inspect the encoded delivery."""
from pathlib import Path
import json
import math
import subprocess
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'storyboard/v6'
trace=json.loads((DIR/'portrait_trace.json').read_text())
shots=trace['shots']
for page in range(math.ceil(len(shots)/12)):
    current=shots[page*12:(page+1)*12]
    sheet=Image.new('RGB',(960,math.ceil(len(current)/4)*455),'#272336');d=ImageDraw.Draw(sheet)
    for i,s in enumerate(current):
        x,y=i%4*240,i//4*455
        sheet.paste(Image.open(DIR/s['filename']).resize((240,427)),(x,y))
        d.text((x+4,y+430),f"{s['t']:.3f}s {s['outfit']}/{s['move']}/{s['scene']}",fill='white')
    sheet.save(DIR/f'review_{page+1}.jpg',quality=94)
first={}
for s in shots:first.setdefault(s['index'],s)
sheet=Image.new('RGB',(1200,math.ceil(len(first)/5)*455),'#272336');d=ImageDraw.Draw(sheet)
for i,s in enumerate(first.values()):
    x,y=i%5*240,i//5*455
    sheet.paste(Image.open(DIR/s['filename']).resize((240,427)),(x,y))
    d.text((x+5,y+430),f"{s['t']:.3f}s {s['expression']}/{s['move']}/{s['scene']}",fill='white')
sheet.save(DIR/'lookbook.jpg',quality=94)
music=json.loads((ROOT/'config/music_analysis_v6.json').read_text())
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

def shot_near(t):
    return min(shots,key=lambda s:abs(s['t']-t))

def first_shot_at_or_after(t):
    later=[s for s in shots if s['t']>=t]
    return min(later,key=lambda s:s['t']) if later else None

# --- V6 element checks ---
elements={}
# 1. Scene jump-cuts: candy -> neon -> star across the two section accents
cuts=music['elements']['scene_cuts']
scene_seq=[]
for cut in cuts:
    before=shot_near(cut['time']-.02);after=shot_near(cut['time']+.2)
    scene_seq.append({'time':cut['time'],'before':before['scene'],'after':after['scene']})
    assert before['scene']==cut['from'] and after['scene']==cut['to'],f"scene cut at {cut['time']} failed: {before['scene']} -> {after['scene']}"
elements['scene_cuts']=scene_seq
# 2. Snap zoom: peak push-in 2 frames after each flagged hit
snap_checks=[]
for snap in music['elements']['snap_zooms']:
    peak=shot_near(snap['time']+2/60);settled=shot_near(snap['time']+.3)
    snap_checks.append({'time':snap['time'],'peak':peak['snapZoom'],'settled':settled['snapZoom']})
    assert peak['snapZoom']>1.08,f"snap zoom at {snap['time']} never pushed in (peak {peak['snapZoom']})"
    assert settled['snapZoom']<=1.001,f"snap zoom at {snap['time']} did not rebound (settled {settled['snapZoom']})"
elements['snap_zooms']=snap_checks
# 3. Kinetic cards visible on their accents, gone after the hold
card_checks=[]
for card in music['elements']['cards']:
    shown=shot_near(card['time']+.3);gone=first_shot_at_or_after(card['time']+.78)
    card_checks.append({'time':card['time'],'text':shown['card'],'after':gone['card'] if gone else None})
    assert shown['card']==card['text'],f"card at {card['time']} shows {shown['card']!r}, expected {card['text']!r}"
    # .6s hold + .15s fade = gone by +.75s; the next card may already be up
    assert gone and gone['card']!=card['text'],f"card at {card['time']} still visible after the fade"
elements['cards']=card_checks
# 4. Swipe active mid-transition, direction as planned
swipe_checks=[]
for cut in cuts:
    mid=shot_near(cut['time']+.15)
    swipe_checks.append({'time':cut['time'],'mid_swipe':mid['swipe']})
    assert mid['swipe']==cut['swipe'],f"swipe at {cut['time']} is {mid['swipe']!r}, expected {cut['swipe']!r}"
elements['swipes']=swipe_checks
# 5. Ghosts visible inside the dance window, absent outside it
ghost_window=music['elements']['ghosts'][0]['window']
mid=shot_near(sum(ghost_window)/2)
outside=shot_near(ghost_window[0]-.2)
elements['ghosts']={'mid_dance':mid['ghostCount'],'before_window':outside['ghostCount']}
assert mid['ghostCount']==2,f"dance ghosts missing mid-window ({mid['ghostCount']})"
assert outside['ghostCount']==0,'ghosts visible outside the dance window'

report={'duration':trace['duration'],'fps':trace['fps'],'browser_errors':trace['errors'],
 'changes':changes,'max_change_error_ms':max(c['error_ms'] for c in changes),'move_checks':move_checks,
 'element_checks':elements,
 'listening_review':'model-assisted comparison, no human approval','reference_video_available':False}
video=ROOT/'output/yuki_beat_ad_v6.mp4'
if video.exists():
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)],capture_output=True,check=True).stdout)
    v=next(s for s in probe['streams'] if s['codec_type']=='video')
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-vn','-f','f32le','-'],capture_output=True,check=True).stdout
    audio=np.frombuffer(raw,np.float32)
    report['encoded']={'width':v['width'],'height':v['height'],'frames':int(v['nb_frames']),'fps':v['avg_frame_rate'],
                       'duration':float(probe['format']['duration']),'decoded_aac_peak':float(np.abs(audio).max()),'clipped_samples':int((np.abs(audio)>1).sum())}
    assert report['encoded']['frames']==round(trace['duration']*60) and report['encoded']['clipped_samples']==0
(DIR/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='changes'},ensure_ascii=False,indent=2))
