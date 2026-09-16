"""Compile the selected V5 track into character changes locked to KICK DRUM hits.

V4 lesson: full-band onset detection fires on every eighth-note artifact
(0.245 s spacing at 122 BPM), so some costume changes landed between drum
hits. V5 detects the beat grid in a low-passed (<150 Hz) band first — the
kick drum is the actual beat the audience taps along to — then snaps
editorial targets to kick times only.
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfiltfilt, find_peaks
from prepare_v2 import load, onsets, SR, stamp

ROOT=Path(__file__).resolve().parents[1]

def kicks(y, cutoff=150):
    """Onset detection restricted to the kick-drum band."""
    mono=np.mean(y,axis=1)
    sos=butter(4,cutoff/(SR/2),'low',output='sos')
    low=sosfiltfilt(sos,mono)
    hop=240
    energy=np.sqrt(np.mean(low[:len(low)//hop*hop].reshape(-1,hop)**2,axis=1))
    floor=np.convolve(np.abs(energy),np.ones(12)/12,'full')[:len(energy)]
    novelty=np.maximum(0,energy-np.r_[0,floor[:-1]])
    peaks,_=find_peaks(novelty,distance=60,prominence=max(.002,np.max(novelty)*.08))
    return [{'time':round(float(p*hop/SR),3),'strength':round(float(novelty[p]),5)} for p in peaks]

def master(y):
    """ffmpeg mastering: gentle compression, low-end shelf, limiter."""
    raw=(y*32767).astype('<i2').tobytes()
    chain='acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=3dB,equalizer=f=110:t=q:w=1:g=2.5,alimiter=limit=0.85:level=false'
    out=subprocess.run(['ffmpeg','-v','error','-f','s16le','-ar',str(SR),'-ac','2','-i','pipe:0',
                        '-af',chain,'-f','f32le','-'],input=raw,capture_output=True,check=True).stdout
    return np.frombuffer(out,np.float32).reshape(-1,2).copy()

def main(source_name='audition_a.wav',targets=None,duration=13.6,trim=13.35,looks=None):
    source=ROOT/'assets/audio/music/v5'/source_name
    y=load(source)
    y=y[:round(trim*SR)].copy()
    fade=round(.22*SR);y[-fade:]*=np.linspace(1,0,fade)[:,None]
    y*= .7/max(float(np.abs(y).max()),1e-9)
    y=master(y)
    y=np.pad(y,((0,max(0,round(duration*SR)-len(y))),(0,0)))
    y=y[:round(duration*SR)]
    y*=.8/max(float(np.abs(y).max()),1e-9)
    output=ROOT/'assets/audio/mixed_v5.wav'
    with wave.open(str(output),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype('<i2').tobytes())
    shutil.copyfile(output,ROOT/'assets/audio/music/mixed_v5.wav')
    hit_list=kicks(y)
    report_kicks=hit_list
    # Snap pool: kick-band hits for the body, plus full-band hook accents for
    # the quiet intro (drums have not entered yet; the motif IS the beat there).
    snap_pool=hit_list+[o for o in onsets(y) if o['time']<5.0]
    if targets is None or looks is None:
        print(json.dumps({'kicks':report_kicks,'full_onsets':len(onsets(y))},indent=2))
        return
    starts=[0]+[min(snap_pool,key=lambda h:abs(h['time']-t))['time'] for t in targets[1:]]
    blocks=[]
    for i,(start,end,look) in enumerate(zip(starts,starts[1:]+[duration],looks),1):
        outfit,accessory,face,pose,move,outgoing=look
        prefix='@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n{Music:Play|name=mixed_v5|endTime=13.6|baseVolume=1|fadeIn=0|fadeOut=0}\n' if i==1 else ''
        blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
            f'{{Event:Animate|character=Yuki|action=AdPose|pose=hello|duration={end-start:.3f}|expression={face}|edit=change|outfit={outfit}|accessory={accessory}|gesture={pose}|move={move}|outgoing={outgoing}}}\n'
            '{Camera:AdCamera|shot=hello}')
    (ROOT/'script_v5.story').write_text('\n\n'.join(blocks)+'\n',encoding='utf-8')
    report={'source':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
     'provider':'Seed-Audio 1.0','selection':'see assets/audio/music/v5/model_listening_review.txt; not human approval',
     'duration':duration,'onsets':onsets(y),'kicks':report_kicks,'selected_attacks':starts[1:],'fps':60,
     'look_changes':len(looks)-1,'moves':[l[4] for l in looks],'timeline_source':'script_v5.story',
     'music_tail_trim_at':trim,'mastering':'acompressor 3:1 + 110Hz shelf +2.5dB + alimiter 0.85',
     'beat_lock':'attacks snapped to low-band (<150Hz) kick onsets only',
     'review_limit':'audio-only model review; user listening remains decisive'}
    (ROOT/'config/music_analysis_v5.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'duration':duration,'selected_attacks':starts[1:],'changes':len(looks)-1},indent=2))

if __name__=='__main__':
    LOOKS=[
     ('original','none','curious','peek','none','none'),
     ('original','shades','smile','cool','none','none'),
     ('bunny','none','grin','paws','none','none'),
     ('sailor','none','wink','salute','none','none'),
     ('princess','none','grin','ta_da','jump','none'),
     ('sunny','shades','smile','cool','twirl','none'),
     ('bunny','none','pout','paws','none','none'),
     ('sailor','none','surprise','peek','jump','none'),
     ('sunny','none','wink','salute','none','none'),
     ('princess','none','tongue','paws','dance','none'),
     ('bunny','shades','smile','cool','none','none'),
     ('original','none','curious','peek','twirl','none'),
     ('sailor','none','grin','ta_da','none','spin'),
     ('princess','shades','smile','cool','jump','none'),
     ('original','none','wink','paws','none','none'),
    ]
    TARGETS=[0,1.37,2.745,4.095,5.015,5.71,7.295,7.72,8.64,9.525,10.85,11.32,12.66,13.135]
    main('audition_d.wav',TARGETS,13.6,13.35,LOOKS)
