"""Check final-render trajectory, stem/lyric provenance and encoded media.

These checks prove implementation invariants, not perceptual lip-sync accuracy.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def main():
    board = ROOT / 'storyboard/v10'
    music = json.loads((ROOT / 'config/music_analysis_v10.json').read_text(encoding='utf-8'))
    trace = json.loads((board / 'performance_trace.json').read_text(encoding='utf-8'))
    portraits = json.loads((board / 'portrait_trace.json').read_text(encoding='utf-8'))
    frames = trace['frames']
    chars = music['lyric_chars']
    assert len(frames) == round(music['duration'] * 60) == 1769
    assert not portraits['errors']
    assert ''.join(c['ch'] for c in chars) == ''.join((ROOT / 'config/diva_lyrics.txt').read_text(encoding='utf-8').split())
    assert all(a['end'] <= b['start'] for a, b in zip(chars, chars[1:]))
    assert hashlib.sha256((ROOT / 'assets/audio/mixed_v10.wav').read_bytes()).hexdigest() == music['master_sha256']
    silent = [f for f in frames if f['lip']['index'] < 0 or f['lip']['level'] == 0]
    assert all(f['vocalOpen'] == 0 for f in silent), 'Rest mouth overridden by expression'
    bilabial = [f for f in frames if f['vocal'] == 'MBP']
    assert bilabial and all(f['vocalOpen'] == 0 for f in bilabial)
    coverage = []
    for i, c in enumerate(chars):
        ff = [f for f in frames if f['lip']['index'] == i]
        assert ff and max(f['vocalOpen'] for f in ff) > .08, f'No articulation for {i} {c}'
        coverage.append({'ch': c['ch'], 'frames': len(ff), 'peak_open': max(f['vocalOpen'] for f in ff)})
    feet_bottom = min(p[1]-.075*.55 for f in frames for p in f['feet'])
    assert feet_bottom >= -.002, f'Foot below stage {feet_bottom}'
    clearance = min(f['handClearance'] for f in frames)
    assert clearance > .01, f'Hand enters head proxy: {clearance}'
    movement = []
    for cue in music['choreography']:
        ff = [f for f in frames if cue['start'] <= f['t'] < cue['end']]
        assert ff and all(f['move'] == cue['move'] for f in ff)
        if cue['move'] == 'twirl':
            assert min(f['rotY'] for f in ff) < .05 and max(f['rotY'] for f in ff) > 6.20
        if cue['move'] == 'step_left':
            assert min(f['root'][0] for f in ff) < -.20
        if cue['move'] == 'step_right':
            assert max(f['root'][0] for f in ff) > .20
        if cue['move'] == 'double_hop':
            assert max(f['airborne'] for f in ff) > .9
            landings = music['beat_grid']['beats']
            landings = [b for b in landings if cue['start']+.25 <= b < cue['end']-.035]
            for b in landings:
                first = next(f for f in ff if f['t'] >= b)
                assert first['airborne'] == 0
        movement.append({'move': cue['move'], 'start': cue['start'], 'end': cue['end'],
                         'root_x_range': [min(f['root'][0] for f in ff),max(f['root'][0] for f in ff)]})
    video = ROOT / 'output/yuki_beat_ad_v10.mp4'
    probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    vstream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    astream = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
    assert (vstream['width'],vstream['height'],vstream['r_frame_rate']) == (720,1280,'60/1')
    assert int(vstream['nb_frames']) == len(frames)
    assert abs(float(probe['format']['duration'])-music['duration']) < .04
    assert vstream['start_time'] == astream['start_time'] == '0.000000'
    decoded = subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-vn','-f','f32le','-acodec','pcm_f32le','pipe:1'])
    peak = float(np.max(np.abs(np.frombuffer(decoded,dtype='<f4'))))
    assert peak < 1, f'AAC decoded peak {peak}'
    summary = {'video': str(video.relative_to(ROOT)), 'duration': probe['format']['duration'],
        'resolution': [720,1280], 'fps':60,'frames':len(frames),'browser_errors':portraits['errors'],
        'codec':[vstream['codec_name'],astream['codec_name']], 'aac_decoded_peak':peak,
        'aligned_characters':len(chars),'mouth_shapes':sorted(set(f['vocal'] for f in frames)),
        'rest_or_silent_frames_closed':len(silent),'bilabial_frames_closed':len(bilabial),
        'foot_bottom_min_scene_units':feet_bottom,'hand_head_proxy_min_clearance_scene_units':clearance,
        'choreography':movement,'character_coverage':coverage,
        'limits':['Character DTW is not phoneme ground truth; visemes use pinyin rules.',
                  'No human normal-speed listening acceptance; user review remains pending.',
                  'Head collision check uses a conservative sphere; selected rendered frames reviewed separately.',
                  'This remains a stylized procedural character, not captured human dance.']}
    (board / 'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    # Diagnostic sheet, sampled chronologically from the final render.
    times=[.5,1.12,3.95,6.6,7.46,10.8,14.03,14.85,17.7,18.52,23.4,29.0]
    sheet=Image.new('RGB',(1080,4*665),(16,12,29))
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    draw=ImageDraw.Draw(sheet)
    for i,t in enumerate(times):
        f=min(portraits['shots'],key=lambda f:abs(f['t']-t))
        x,y=(i%3)*360,(i//3)*665
        sheet.paste(Image.open(board/f['filename']).resize((360,640)),(x,y))
        draw.text((x+8,y+641),f"{f['t']:.2f}s · {f['move']} · {f['vocal']}",font=font,fill='white')
    sheet.save(board/'review_sheet.jpg',quality=88)
    print(json.dumps({k:v for k,v in summary.items() if k not in ('character_coverage','choreography','limits')},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
