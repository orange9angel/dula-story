"""Check the exported frames and the actual scheduled audio, not old templates."""
from pathlib import Path
import json,hashlib,subprocess
import numpy as np
import soundfile as sf
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def main():
    tl=read('config/timeline.json');pt=read('storyboard/portrait_trace.json');frames=read('storyboard/performance_trace.json')['frames']
    assert not pt['errors'];assert len(frames)==round(tl['duration']*60)
    assert tl['story_sha256']==hashlib.sha256((ROOT/'script.story').read_bytes()).hexdigest()
    features=read('config/final_voice_features.json')
    assert features['voice_bus_sha256']==hashlib.sha256((ROOT/'assets/audio/voice_bus.wav').read_bytes()).hexdigest()
    # Character roots and real geometry: song A must open the CAT cavity.
    assert min(np.linalg.norm(np.array(f['root'])-f['catRoot']) for f in frames)>1
    assert min(f['handClearance'] for f in frames)>0
    rest=[f for f in frames if f['segment'] in ('reaction','freeze')]
    assert all(f['yukiLip']['jaw']<=.015 and not f['mochi']['open'] for f in rest)
    for s in tl['segments']:
        fs=[f for f in frames if s['start']<=f['t']<s['end']]
        if s.get('character')=='Mochi':assert any(f['mochi']['open'] for f in fs),s['id']
        if s.get('character')=='Yuki':assert any(f['mouth']['cavityVisible'] for f in fs),s['id']
        if s.get('character')=='Mochi':assert max(f['yukiLip']['jaw'] for f in fs)<.015
        if s.get('character')=='Yuki':assert not any(f['mochi']['open'] for f in fs)
    mixed,sr=sf.read(ROOT/'assets/audio/mixed.wav',always_2d=True)
    assert abs(len(mixed)/sr-tl['duration'])<1/sr
    assert np.max(abs(mixed))<.93 and np.isfinite(mixed).all()
    video=ROOT/'output/yuki_fish_musical.mp4'
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    vs=next(s for s in probe['streams'] if s['codec_type']=='video');au=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (vs['width'],vs['height'],vs['r_frame_rate'],int(vs['nb_frames']))==(720,1280,'60/1',len(frames))
    assert abs(float(vs['start_time'])-float(au['start_time']))<.025
    report={'frames':len(frames),'duration':probe['format']['duration'],'bytes':int(probe['format']['size']),
        'browser_errors':pt['errors'],'reaction_frames_closed':len(rest),'both_character_cavities_animate':True,
        'inactive_speaker_closed':True,'min_root_separation':min(np.linalg.norm(np.array(f['root'])-f['catRoot']) for f in frames),
        'min_hand_head_proxy_clearance':min(f['handClearance'] for f in frames),
        'audio_peak':float(np.max(abs(mixed))),'video_sha256':hashlib.sha256(video.read_bytes()).hexdigest(),
        'limits':['DTW character timing and pinyin visemes remain approximate.','Voice conversion identity needs user listening; correlation is not an identity score.','Custom viewer is authoritative for runtime checks; stock dula-verify does not execute these poses.']}
    (ROOT/'storyboard/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    shots=pt['shots'];times=[1.1,6.6,12.8,20.2,23.2,27,32,38.5,45.5]
    sheet=Image.new('RGB',(900,3*560),'#211724');d=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    for i,t in enumerate(times):
        f=min(shots,key=lambda f:abs(f['t']-t));im=Image.open(ROOT/'storyboard'/f['filename']).resize((300,533))
        x,y=i%3*300,i//3*560;sheet.paste(im,(x,y+25));d.text((x+8,y+2),f'{f["t"]:.2f}s / {f["segment"]}',font=font,fill='white')
    sheet.save(ROOT/'storyboard/review_sheet.jpg',quality=92)
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
