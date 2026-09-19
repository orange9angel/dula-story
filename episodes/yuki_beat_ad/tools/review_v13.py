"""Measure rendered aperture, not only the requested lip state."""
from pathlib import Path
import json,hashlib,subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]

def main():
    read=lambda p:json.loads((ROOT/p).read_text(encoding='utf-8'))
    frames=read('storyboard/v13/performance_trace.json')['frames']
    old=read('storyboard/v12/performance_trace.json')['frames']
    portraits=read('storyboard/v13/portrait_trace.json')
    assert len(frames)==1769 and not portraits['errors']
    keys=['root','feet','hands','acting','camera','spinAngle','move']
    assert all(all(a[k]==b[k] for k in keys) for a,b in zip(frames,old))
    assert all(f['lip']['index']==o['lip']['index'] and f['lip']['audioIndex']==o['lip']['audioIndex'] for f,o in zip(frames,old))
    for f in frames:
        lip,render=f['lip'],f['mouthRender']
        assert abs(render['actualAperture']-render['height'])<1e-6
        assert render['cavityVisible']==(lip['open']>.018)
        if lip['index']<0 or lip.get('seal') or (lip['level']==0 and lip['phase']!='prepare'):
            assert not render['cavityVisible'] and render['actualAperture']==0
            assert not render['toothVisible'] and not render['tongueVisible']
        assert render['width']<=.118 and render['height']<=.066
    active=[f for f in frames if f['lip']['phase']=='voice' and f['lip']['open']>.02]
    old_active=[f for f in old if f['lip']['phase']=='voice' and f['lip']['open']>.02]
    assert sum(f['lip']['amplitude']>=.999 for f in active)/len(active)<.05
    assert all(any(f['lip']['index']==i and f['lip']['open']>.06 for f in frames) for i in range(80))
    report={'frames':1769,'browser_errors':portraits['errors'],'v12_body_and_timing_unchanged':True,
        'old_saturated_energy_gate_frames':sum(f['lip']['level']>=.12 for f in old_active),
        'old_voiced_open_frames':len(old_active),'new_saturated_amplitude_frames':sum(f['lip']['amplitude']>=.999 for f in active),
        'new_voiced_open_frames':len(active),'mouth_geometry_matches_controls':True,'silent_and_bilabial_geometry_closed':True,
        'labiodental_contact_frames':sum(f['mouthRender']['toothVisible'] for f in frames),
        'rendered_aperture_range':[min(f['mouthRender']['height'] for f in active),max(f['mouthRender']['height'] for f in active)],
        'limits':['Pinyin visemes and consonant lengths are approximations, not measured phonemes.',
                  'More expressive contours and audio dynamics do not prove perceptual synchrony.',
                  'Morning voice candidates are separate from the original-song V13 master.']}
    target=ROOT/'storyboard/v13'
    video=ROOT/'output/yuki_beat_ad_v13.mp4'
    if video.exists():
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
        vs=next(s for s in probe['streams'] if s['codec_type']=='video')
        assert (vs['width'],vs['height'],vs['r_frame_rate'],int(vs['nb_frames']))==(720,1280,'60/1',1769)
        report['video']={'duration':probe['format']['duration'],'size':probe['format']['size']}
    (target/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    # Actual mouth crops at identical song times, with old and new below each other.
    before=read('storyboard/v12/portrait_trace.json')['shots']
    times=[.34,1.22,4.32,5.21,7.65,9.58,11.37,15.55,18.07,23.45,24.5,28.8]
    sheet=Image.new('RGB',(1200,4*475),(17,13,28));font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17);d=ImageDraw.Draw(sheet)
    for i,t in enumerate(times):
        x,y=i%3*400,i//3*475
        for row,(ver,shots) in enumerate([('v12',before),('v13',portraits['shots'])]):
            f=min(shots,key=lambda f:abs(f['t']-t))
            frame=Image.open(ROOT/f'storyboard/{ver}'/f['filename'])
            # Wide/medium mouth stays inside this face area; close singing lower.
            frame=frame.crop((160,420,560,800)).resize((220,209))
            sheet.paste(frame,(x+88,y+24+row*222))
            d.text((x+8,y+40+row*222),ver,font=font,fill='white')
        d.text((x+90,y+2),f'{t:.2f}s',font=font,fill='#ffe199')
    sheet.save(target/'mouth_review.jpg',quality=93)
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
