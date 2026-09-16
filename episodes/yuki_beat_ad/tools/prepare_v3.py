"""Compile selected music attacks into explicit, discrete character changes."""
from pathlib import Path
import hashlib
import json
import shutil
import wave
import numpy as np
from prepare_v2 import load, onsets, SR, stamp

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/audio/music/v3/audition_c.wav'
y=load(source)
hits=onsets(y)
# Editorial selection of audible principal attacks, not automatic every-onset
# decoration. Each planned hit changes costume/accessory or facial expression.
targets=[0,.935,1.675,2.925,3.670,4.925,5.655,6.935,7.695,8.410,8.980,9.685,10.955,11.710,12.695]
starts=[0]+[min(hits,key=lambda h:abs(h['time']-t))['time'] for t in targets[1:]]
looks=[
 ('original','none','curious','peek'),
 ('original','shades','smile','cool'),
 ('bunny','none','grin','paws'),
 ('sailor','none','wink','salute'),
 ('sunny','shades','smile','cool'),
 ('princess','none','grin','ta_da'),
 ('bunny','none','pout','paws'),
 ('bunny','shades','smile','cool'),
 ('sailor','none','surprise','peek'),
 ('sunny','none','wink','salute'),
 ('princess','none','tongue','paws'),
 ('princess','shades','smile','cool'),
 ('sailor','none','grin','ta_da'),
 ('original','none','curious','peek'),
 ('bunny','none','wink','paws'),
]
duration=13.2
# End on the final chosen attack and its natural decay; exclude later notes.
y=y[:round(12.97*SR)].copy()
fade=round(.20*SR);y[-fade:]*=np.linspace(1,0,fade)[:,None]
y=np.pad(y,((0,round(duration*SR)-len(y)),(0,0)))
y*=.75/max(float(np.abs(y).max()),1e-9)
bed=ROOT/'assets/audio/mixed_v3_bed.wav'
with wave.open(str(bed),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype('<i2').tobytes())
# Musical stop/start edit: keep each selected attack and short motif, pull the
# accompaniment back during the hold, then make a 90 ms intake before the next
# reveal. This edits recorded music; it does not synthesize a new drum loop.
envelope=np.full(len(y),.12,dtype=np.float64)
for start,end in zip(starts,starts[1:]+[duration]):
    a,b=round(start*SR),round(end*SR)
    local=np.arange(b-a)/SR
    e=np.where(local<.20,1.0,.12+.88*np.exp(-(local-.20)*7))
    if start==0:e*=.65
    # The waveform's event peak lands inside this 5 ms detector block. Restore
    # gain at the attack, with a tiny ramp to avoid clicks.
    ramp=min(round(.004*SR),len(e));e[:ramp]*=np.linspace(.04,1,ramp)
    remaining=end-start-local
    e*=np.where(remaining<.09,.04+.96*np.clip((remaining-.025)/.065,0,1),1)
    envelope[a:b]=e
y*=envelope[:,None]
staccato=ROOT/'assets/audio/mixed_v3_staccato.wav'
with wave.open(str(staccato),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype('<i2').tobytes())
output=ROOT/'assets/audio/mixed_v3.wav'
# Blind A/B listening preferred the original phrase shape. Keep the more
# aggressively gated experiment as an audition, not the default delivery.
shutil.copyfile(bed,output)
shutil.copyfile(output,ROOT/'assets/audio/music/mixed_v3.wav')
blocks=[]
for i,(start,end,look) in enumerate(zip(starts,starts[1:]+[duration],looks),1):
    outfit,accessory,face,pose=look
    prefix='@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n{Music:Play|name=mixed_v3|endTime=13.2|baseVolume=1|fadeIn=0|fadeOut=0}\n' if i==1 else ''
    blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
        f'{{Event:Animate|character=Yuki|action=AdPose|pose=hello|duration={end-start:.3f}|expression={face}|edit=change|outfit={outfit}|accessory={accessory}|gesture={pose}|outgoing={"spin" if i==5 else "none"}}}\n'
        '{Camera:AdCamera|shot=hello}')
(ROOT/'script_v3.story').write_text('\n\n'.join(blocks)+'\n',encoding='utf-8')
report={'source':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'provider':'Seed-Audio 1.0','selection':'C, selected after model-assisted blind audio comparison; not human approval',
 'duration':duration,'onsets':onsets(load(output)),'selected_attacks':starts[1:], 'fps':60,
 'look_changes':len(looks)-1,'timeline_source':'script_v3.story','music_tail_trim_at':12.97,
 'mix_edit':'retain natural motif phrasing and short tail; original mix preferred in blind A/B over gated experiment',
 'comparison_bed':'assets/audio/mixed_v3_bed.wav',
 'alternate_mix':'assets/audio/mixed_v3_staccato.wav',
 'review_limit':'audio-only reviews favor this selection; the AV model disagreed about perceived synchronization; user listening remains decisive'}
(ROOT/'config/music_analysis_v3.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'duration':duration,'selected_attacks':starts[1:],'changes':len(looks)-1},indent=2))
