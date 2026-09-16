"""Compile the selected V4 track into explicit, discrete character changes with dance moves."""
from pathlib import Path
import hashlib
import json
import shutil
import wave
import numpy as np
from prepare_v2 import load, onsets, SR, stamp

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/audio/music/v4/audition_e.wav'
y=load(source)
hits=onsets(y)
# Editorial selection of audible principal attacks on the eighth-note grid.
# Each planned hit changes costume/accessory/expression and may fire a move.
targets=[0,.885,2.14,2.89,3.41,4.135,4.87,6.135,6.62,7.37,8.135,8.87,10.115,10.87,11.89,12.635]
starts=[0]+[min(hits,key=lambda h:abs(h['time']-t))['time'] for t in targets[1:]]
# outfit, accessory, expression, gesture, move, outgoing(camera)
looks=[
 ('original','none','curious','peek','none','none'),
 ('original','shades','smile','cool','none','none'),
 ('bunny','none','grin','paws','jump','none'),
 ('sailor','none','wink','salute','none','none'),
 ('sunny','shades','smile','cool','twirl','none'),
 ('princess','none','grin','ta_da','none','none'),
 ('bunny','none','pout','paws','dance','none'),
 ('sailor','none','surprise','peek','jump','none'),
 ('sunny','none','wink','salute','none','none'),
 ('princess','none','tongue','paws','twirl','none'),
 ('bunny','shades','smile','cool','none','none'),
 ('original','none','curious','peek','wave','none'),
 ('sailor','none','grin','ta_da','dance','none'),
 ('princess','shades','smile','cool','none','spin'),
 ('sunny','none','grin','ta_da','jump','none'),
 ('original','none','wink','paws','none','none'),
]
duration=13.6
# End on the final chosen attack and its natural decay; exclude later notes.
y=y[:round(13.35*SR)].copy()
fade=round(.22*SR);y[-fade:]*=np.linspace(1,0,fade)[:,None]
y=np.pad(y,((0,round(duration*SR)-len(y)),(0,0)))
y*=.75/max(float(np.abs(y).max()),1e-9)
output=ROOT/'assets/audio/mixed_v4.wav'
with wave.open(str(output),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype('<i2').tobytes())
shutil.copyfile(output,ROOT/'assets/audio/music/mixed_v4.wav')
blocks=[]
for i,(start,end,look) in enumerate(zip(starts,starts[1:]+[duration],looks),1):
    outfit,accessory,face,pose,move,outgoing=look
    prefix='@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n{Music:Play|name=mixed_v4|endTime=13.6|baseVolume=1|fadeIn=0|fadeOut=0}\n' if i==1 else ''
    blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
        f'{{Event:Animate|character=Yuki|action=AdPose|pose=hello|duration={end-start:.3f}|expression={face}|edit=change|outfit={outfit}|accessory={accessory}|gesture={pose}|move={move}|outgoing={outgoing}}}\n'
        '{Camera:AdCamera|shot=hello}')
(ROOT/'script_v4.story').write_text('\n\n'.join(blocks)+'\n',encoding='utf-8')
report={'source':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'provider':'Seed-Audio 1.0','selection':'E (toy-piano/chip cute), selected after model-assisted blind audio comparison; not human approval',
 'duration':duration,'onsets':onsets(load(output)),'selected_attacks':starts[1:], 'fps':60,
 'look_changes':len(looks)-1,'moves':[l[4] for l in looks],'timeline_source':'script_v4.story','music_tail_trim_at':13.35,
 'review_limit':'audio-only model review; user listening remains decisive'}
(ROOT/'config/music_analysis_v4.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'duration':duration,'selected_attacks':starts[1:],'changes':len(looks)-1},indent=2))
