"""Full-trajectory mechanical checks and contact sheet; user judges performance."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]

def main():
    board=ROOT/'storyboard/v11'
    trace=json.loads((board/'performance_trace.json').read_text(encoding='utf-8'))
    portraits=json.loads((board/'portrait_trace.json').read_text(encoding='utf-8'))
    plan=json.loads((ROOT/'config/performance_plan_v11.json').read_text(encoding='utf-8'))
    frames=trace['frames']
    floor=min(p[1]-.04125 for f in frames for p in f['feet'])
    clearance=min(f['handClearance'] for f in frames)
    silent=[f for f in frames if f['lip']['index']<0 or f['lip']['level']==0]
    assert len(frames)==1769 and not portraits['errors']
    assert floor>=-.002,f'Feet below floor: {floor}'
    assert clearance>.01,f'Hand enters head: {clearance}'
    assert all(f['vocalOpen']==0 for f in silent)
    old=json.loads((ROOT/'storyboard/v10/performance_trace.json').read_text(encoding='utf-8'))['frames']
    assert all(a['lip']==b['lip'] for a,b in zip(frames,old)), 'V10 viseme regression'
    measurements=[]
    for cue in plan['cues']:
        ff=[f for f in frames if cue['start']<=f['t']<cue['end']]
        assert ff and all(f['move']==cue['move'] for f in ff)
        if cue['move']=='twirl':assert max(f['spinAngle'] for f in ff)>6.20
        if cue['move']=='your_stage':assert min(f['root'][0] for f in ff)<-.27
        if cue['move'] in ('hop','cheer'):
            assert max(f['airborne'] for f in ff)>.95
            assert next(f for f in ff if f['t']>=cue['land'])['airborne']==0
        ranges=[[round(max(f['hands'][i][k] for f in ff)-min(f['hands'][i][k] for f in ff),3) for k in range(3)] for i in (0,1)]
        measurements.append({'move':cue['move'],'intent':cue['intent'],'hand_ranges_xyz':ranges})
    report={'frames':len(frames),'browser_errors':portraits['errors'],'feet_bottom_min':floor,
        'hand_head_clearance_min':clearance,'v10_lip_states_identical':True,'rest_or_silent_frames_closed':len(silent),
        'acting_moods':sorted(set(f['acting']['mood'] for f in frames)),
        'eye_openness_range':[min(f['acting']['eye'] for f in frames),max(f['acting']['eye'] for f in frames)],
        'closed_eyes_frames':sum(f['acting']['closedL'] and f['acting']['closedR'] for f in frames),
        'phrases':measurements,'limits':['Expressiveness and voice likeness require user playback review.',
            'Head checks use a sphere; rendered pose checks are also required.']}
    (board/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    times=[4.72,5.50,6.15,7.95,8.67,10.11,10.78,11.27,12.35,14.07,14.6,17.03,19.15,20.47,23.60,25.18,25.99,29.04]
    sheet=Image.new('RGB',(1080,6*665),(16,12,29));font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    draw=ImageDraw.Draw(sheet)
    for i,t in enumerate(times):
        f=min(portraits['shots'],key=lambda f:abs(f['t']-t));x,y=i%3*360,i//3*665
        sheet.paste(Image.open(board/f['filename']).resize((360,640)),(x,y))
        draw.text((x+6,y+641),f"{f['t']:.2f}s {f['move']} {f['acting']['mood']}",font=font,fill='white')
    sheet.save(board/'review_sheet.jpg',quality=88)
    print(json.dumps({k:v for k,v in report.items() if k not in ('phrases','limits')},indent=2))

if __name__=='__main__':main()
