"""Prepare cached procedural music; never calls a model or a network service."""
from pathlib import Path
import json
import re
import sys
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[2]
sys.path.insert(0, str(WORKSPACE / 'dula-skills/beatcut-edit/scripts'))
from beatcut import load_mono, detect_onsets

def timestamp(h, m, s, ms):
    return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000

def main():
    story = (ROOT/'script.story').read_text(encoding='utf-8')
    windows = []
    for m in re.finditer(r'(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})', story):
        windows.append((timestamp(*m.groups()[:4]), timestamp(*m.groups()[4:])))
    duration = max(end for _,end in windows)
    source = ROOT.parent/'worm_dance/assets/audio/music/gym_beat.wav'
    sr,y = load_mono(source)
    y = y[:round(duration*sr)].copy()
    # Keep the native 150 BPM grid. Intro is restrained; melody enters at 3.2 s.
    for i,(start,end) in enumerate(windows):
        gain = 0.73 if i < 2 else (0.92 if i < 6 else 0.82)
        y[round(start*sr):round(end*sr)] *= gain
    fade = round(0.35*sr)
    y[-fade:] *= np.linspace(1,0,fade)
    peak = float(np.max(np.abs(y)))
    # The synthesized drum transients overshoot in AAC; retain encoding headroom.
    y *= min(1, 0.62/max(peak,1e-9))
    audio = ROOT/'assets/audio'
    (audio/'music').mkdir(parents=True, exist_ok=True)
    for dest in [audio/'music/beat_ad.wav', audio/'mixed.wav']:
        with wave.open(str(dest),'wb') as out:
            out.setnchannels(1);out.setsampwidth(2);out.setframerate(sr)
            out.writeframes((y*32767).astype('<i2').tobytes())
    (audio/'manifest.json').write_text(json.dumps({'entries':[], 'duration':duration, 'producer':'tools/prepare_audio.py'},indent=2),encoding='utf-8')
    onsets = detect_onsets(y,sr)
    report = {'source':str(source.relative_to(WORKSPACE)), 'source_type':'existing numpy synthesizer output',
      'source_generator':'dula-story/episodes/worm_dance/tools/generate_bgm.py',
      'bpm':150,'duration':duration,'sample_rate':sr,'peak':float(np.max(np.abs(y))),
      'onsets':onsets,'cuts':[{'time':s,'nearest_onset':min((t for t,_ in onsets),key=lambda t:abs(t-s))} for s,_ in windows if s>0],
      'per_second_rms':[float(np.sqrt(np.mean(y[sr*i:sr*(i+1)]**2))) for i in range(int(duration))]}
    (ROOT/'config/music_analysis.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['bpm','duration','peak','cuts']},indent=2))

if __name__=='__main__': main()
