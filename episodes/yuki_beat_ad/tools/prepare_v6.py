"""Compile the V6 element-expansion timeline on the V5 music, unchanged.

V6 does not touch the soundtrack: mixed_v6.wav is a byte copy of the V5
master, and the beat grid comes from the same low-band (<150 Hz) kick
detector as V5 (prepare_v5.kicks) run on that same file, so every editorial
point stays on the V5 kick grid. What V6 adds is element variety on those
existing beats:

- scene jump-cuts: candy stage -> neon night street -> starry cloud sea,
  switched on the section-boundary accents (character never moves off center)
- snap zoom: quick push-in with a ~6-frame ease-out rebound on 5 strong hits
- kinetic cards: 3 short cards slamming onto their accents
- swipe transitions: a color block wipes across at each scene cut, in the
  direction of the character's on-beat gesture
- dance ghosts: 2 delayed afterimages during the 1.3 s+ dance window
"""
from pathlib import Path
import hashlib
import json
import shutil
from prepare_v5 import kicks
from prepare_v2 import load, onsets, stamp

ROOT = Path(__file__).resolve().parents[1]
DURATION = 13.6

# Identical looks/targets as V5 (only the first 14 looks are used).
LOOKS = [
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
]
TARGETS = [0,1.37,2.745,4.095,5.015,5.71,7.295,7.72,8.64,9.525,10.85,11.32,12.66,13.135]

# Scene per entry: candy 0-4.09s, neon night street 4.09-9.53s, starry cloud
# sea 9.53-13.6s. Cuts land on the section-boundary accents 4.09 and 9.53.
def scene_of(i):
    return 'candy' if i <= 3 else 'neon' if i <= 9 else 'star'

# Extra elements per entry index (1-based), all on V5 beats:
#  4 (4.090): scene cut 1 — salute raises the right arm, so the swipe travels
#             left-to-right; snap zoom; card 「下一拍」
#  5 (5.020): strongest kick of the track (0.29) + jump -> snap zoom, card 「萌力全开」
#  7 (7.300): second-strongest kick (0.27) -> snap zoom
# 10 (9.530): scene cut 2 + dance window -> swipe right-to-left (paws pull
#             inward), snap zoom, card 「你登场」, ghosts on the 1.325 s dance
# 14 (13.100): final jump -> snap zoom
ELEMENTS = {
 4:  {'swipe':'right','snap':1,'card':'next'},
 5:  {'snap':1,'card':'power'},
 7:  {'snap':1},
 10: {'swipe':'left','snap':1,'card':'debut','ghost':1},
 14: {'snap':1},
}
CARD_TEXT = {'next':'下一拍','power':'萌力全开','debut':'你登场'}


def main():
    source = ROOT/'assets/audio/mixed_v5.wav'
    y = load(source)
    hit_list = kicks(y)
    # The V6 mix is a copy of the V5 master; no new music is generated.
    output = ROOT/'assets/audio/mixed_v6.wav'
    shutil.copyfile(source, output)
    shutil.copyfile(output, ROOT/'assets/audio/music/mixed_v6.wav')
    snap_pool = hit_list + [o for o in onsets(y) if o['time'] < 5.0]
    starts = [0] + [min(snap_pool, key=lambda h: abs(h['time']-t))['time'] for t in TARGETS[1:]]
    v5 = json.loads((ROOT/'config/music_analysis_v5.json').read_text())
    assert starts[1:] == v5['selected_attacks'], \
        f'V6 beat grid drifted from V5: {starts[1:]} vs {v5["selected_attacks"]}'
    blocks = []
    for i, (start, end, look) in enumerate(zip(starts, starts[1:]+[DURATION], LOOKS), 1):
        outfit, accessory, face, pose, move, outgoing = look
        el = ELEMENTS.get(i, {})
        prefix = '@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n{Music:Play|name=mixed_v6|endTime=13.6|baseVolume=1|fadeIn=0|fadeOut=0}\n' if i == 1 else ''
        blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
            f'{{Event:Animate|character=Yuki|action=AdPose|pose=hello|duration={end-start:.3f}|expression={face}|edit=change|outfit={outfit}|accessory={accessory}|gesture={pose}|move={move}|outgoing={outgoing}'
            f"|scene={scene_of(i)}|snap={el.get('snap',0)}|card={el.get('card','none')}|swipe={el.get('swipe','none')}|ghost={el.get('ghost',0)}}}\n"
            '{Camera:AdCamera|shot=hello}')
    (ROOT/'script_v6.story').write_text('\n\n'.join(blocks)+'\n', encoding='utf-8')
    report = {'source':'assets/audio/mixed_v5.wav (V5 master, copied to mixed_v6.wav)',
     'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
     'music':'unchanged from V5; see assets/audio/music/v5/model_listening_review.txt; not human approval',
     'duration':DURATION,'onsets':onsets(y),'kicks':hit_list,'selected_attacks':starts[1:],'fps':60,
     'look_changes':len(LOOKS)-1,'moves':[l[4] for l in LOOKS],'timeline_source':'script_v6.story',
     'beat_lock':'attacks snapped to low-band (<150Hz) kick onsets only (same grid as V5)',
     'elements':{
       'scene_cuts':[{'time':starts[i-1],'from':scene_of(i-1) if i>1 else None,'to':scene_of(i),'swipe':ELEMENTS[i]['swipe']} for i in (4,10)],
       'snap_zooms':[{'time':starts[i-1],'frames':'push 2 + ease-out 4','amplitude':0.13} for i in (4,5,7,10,14)],
       'cards':[{'time':starts[i-1],'text':CARD_TEXT[ELEMENTS[i]['card']],'hold_s':0.6} for i in (4,5,10)],
       'ghosts':[{'window':[starts[9],starts[10]],'delays_frames':[2,4],'opacity':[0.3,0.15]}],
     },
     'review_limit':'audio-only model review; user listening remains decisive'}
    (ROOT/'config/music_analysis_v6.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'duration':DURATION,'selected_attacks':starts[1:],'changes':len(LOOKS)-1,
                      'scene_cuts':[starts[3],starts[9]],'snap_zooms':[starts[i-1] for i in (4,5,7,10,14)]}, indent=2))


if __name__ == '__main__':
    main()
