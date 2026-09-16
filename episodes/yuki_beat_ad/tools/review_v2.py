"""Produce review sheets and measure the actual encoded file, without changing it."""
from pathlib import Path
import json
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'storyboard/v2'
trace=json.loads((DIR/'portrait_trace.json').read_text())
for page in range(math.ceil(len(trace['shots'])/12)):
    shots=trace['shots'][page*12:(page+1)*12]
    sheet=Image.new('RGB',(960,math.ceil(len(shots)/4)*455),'#282438')
    draw=ImageDraw.Draw(sheet)
    for i,s in enumerate(shots):
        x,y=(i%4)*240,(i//4)*455
        frame=Image.open(DIR/s['filename']).resize((240,427))
        sheet.paste(frame,(x,y))
        draw.text((x+5,y+430),f"{s['t']:.3f}s {s.get('face')} roll {s.get('roll',0):.2f}",fill='white')
    sheet.save(DIR/f'review_{page+1}.jpg',quality=93)
video=ROOT/'output/yuki_beat_ad_v2.mp4'
if video.exists():
    media=json.loads(subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)],capture_output=True,check=True).stdout)
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-vn','-f','f32le','-'],capture_output=True,check=True).stdout
    audio=np.frombuffer(raw,np.float32)
    visual=next(s for s in media['streams'] if s['codec_type']=='video')
    track=next(s for s in media['streams'] if s['codec_type']=='audio')
    music=json.loads((ROOT/'config/music_analysis_v2.json').read_text())
    errors=[round((math.ceil(c['time']*30-1e-8)/30-c['time'])*1000,3) for c in music['cuts']]
    report={'width':visual['width'],'height':visual['height'],'fps':visual['avg_frame_rate'],
            'frames':int(visual['nb_frames']),'duration':float(media['format']['duration']),
            'audio_channels':track['channels'],'sample_rate':track['sample_rate'],
            'decoded_aac_peak':float(np.abs(audio).max()),'decoded_aac_out_of_range':int((np.abs(audio)>1).sum()),
            'cut_to_detected_attack_error_ms_at_30fps':errors,'max_cut_error_ms':max(errors),
            'browser_errors':trace['errors'],'human_listening_review':False,
            'reference_video_review':False}
    (DIR/'media_review.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))
    assert report['frames']==384 and report['width']==720 and report['height']==1280
    assert report['decoded_aac_out_of_range']==0 and not report['browser_errors']
    assert report['max_cut_error_ms']<=1000/30
