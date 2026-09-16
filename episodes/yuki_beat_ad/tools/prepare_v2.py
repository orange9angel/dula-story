"""Build a reversible rhythm-edit study from a cached track; no network calls."""
from pathlib import Path
import hashlib
import json
import subprocess
import shutil
import wave
import numpy as np
from scipy.signal import find_peaks

ROOT = Path(__file__).resolve().parents[1]
STORY = ROOT.parents[1]
SR = 48000
DURATION = 12.8


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                          '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def onsets(y):
    # Short causal envelope: timestamps refer to waveform attacks, not the start
    # of a long FFT window (the old detector reports events about 30 ms early).
    hop = 240
    mono = np.mean(y, axis=1)
    energy = np.sqrt(np.mean(mono[:len(mono)//hop*hop].reshape(-1, hop)**2, axis=1))
    floor = np.convolve(energy, np.ones(12)/12, 'full')[:len(energy)]
    novelty = np.maximum(0, energy - np.r_[0, floor[:-1]])
    peaks, props = find_peaks(novelty, distance=36, prominence=max(.004, np.max(novelty)*.10))
    return [{'time': round(float(p*hop/SR), 3), 'strength': round(float(novelty[p]), 5)} for p in peaks]


def stamp(t):
    ms = round(t*1000)
    return f'00:00:{ms//1000:02d},{ms%1000:03d}'


def main():
    cached = STORY/'tmp/beatcut_demo/track_v3b.wav'
    source = ROOT/'assets/audio/music/source_v2.wav'
    if not source.exists():
        source.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(cached,source)
    y = load(source)[:round(DURATION*SR)]
    if len(y) < round(DURATION*SR):
        raise ValueError('Cached source is too short')
    hits = onsets(y)
    drop = max((h for h in hits if 4.5 < h['time'] < 6.5), key=lambda h:h['strength'])['time']
    # A short audible intake before the main accent; keep its original attack.
    a, b = round((drop-.18)*SR), round((drop-.015)*SR)
    envelope = np.ones(len(y))
    envelope[a:b] = .13
    edge = round(.012*SR)
    envelope[a:a+edge] = np.linspace(1,.13,edge)
    envelope[b-edge:b] = np.linspace(.13,1,edge)
    envelope[-round(.24*SR):] *= np.linspace(1,0,round(.24*SR))
    y *= envelope[:, None]
    y *= .72/max(float(np.abs(y).max()), 1e-9)
    dest = ROOT/'assets/audio/mixed_v2.wav'
    with wave.open(str(dest), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y*32767).astype('<i2').tobytes())
    shutil.copyfile(dest,ROOT/'assets/audio/music/mixed_v2.wav')
    hits = onsets(y)
    def nearest(target):
        return min(hits, key=lambda h:abs(h['time']-target))['time']
    starts = [0, nearest(1.1), nearest(2.1), nearest(3.15), nearest(drop-.7), drop,
              nearest(drop+.7), nearest(7.55), nearest(8.55), nearest(9.7), nearest(11.15)]
    if any(b-a < .3 for a,b in zip(starts, starts[1:])):
        raise ValueError(f'Shot boundaries overlap: {starts}')
    poses = ['wink','step','swing','wink','turn','pop','swing','wink','pop','wink','finale']
    faces = ['curious','smile','grin','surprise','squeeze','grin','smile','wink','surprise','wink','grin']
    effects = ['pop','tilt','tilt','snap','spin','burst','tilt','snap','burst','snap','stamp']
    blocks=[]
    for i, (start, end, pose, face, effect) in enumerate(zip(starts, starts[1:]+[DURATION],poses,faces,effects),1):
        prefix = '@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n{Music:Play|name=mixed_v2|endTime=12.8|baseVolume=1|fadeIn=0|fadeOut=0}\n' if i==1 else ''
        blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
                      f'{{Event:Animate|character=Yuki|action=AdPose|pose={pose}|duration={end-start:.3f}|bpm=150|expression={face}|edit={effect}}}\n'
                      f'{{Camera:AdCamera|shot={pose}}}')
    (ROOT/'script_v2.story').write_text('\n\n'.join(blocks)+'\n', encoding='utf-8')
    report={'source':str(source.relative_to(STORY)), 'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'status':'cached soundtrack audition; original generation provenance not verified; not a music approval',
            'duration':DURATION, 'sample_rate':SR, 'onsets':hits, 'drop':drop,
            'pre_drop_break':[round(a/SR,3),round(b/SR,3)],
            'peak':float(np.max(np.abs(y))),
            'per_second_rms':[float(np.sqrt(np.mean(y[i*SR:(i+1)*SR]**2))) for i in range(12)],
            'cuts':[{'time':t, 'onset_error_ms':round(min(abs(t-h['time']) for h in hits)*1000,2)} for t in starts[1:]],
            'timeline_source':'script_v2.story (this report is derived analysis)'}
    (ROOT/'config/music_analysis_v2.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'drop':drop,'cuts':starts,'onsets':len(hits),'peak':report['peak']},indent=2))


if __name__ == '__main__':
    main()
