"""Check that restrained geometry still tells the scripted action, from numeric state."""
from pathlib import Path
import json, math

def check(trace, episode):
    data=json.loads(Path(trace).read_text(encoding='utf-8'));frames=data['frames']
    tl=json.loads((episode/'config/timeline.json').read_text(encoding='utf-8'))
    events={e['type']:s['start'] for s in tl['segments'] for e in s['events']}
    sample=lambda t: min(frames,key=lambda f:abs(f['t']-t))
    for a,b in zip(['ShowRight','ShowLeft','TestMark','ObserveMark','TryAgain','StopTrying','QuietLeaf'],['ShowLeft','TestMark','ObserveMark','TryAgain','StopTrying','QuietLeaf','ReleaseHand']):
        assert events[a]<events[b],f'Event order {a}/{b}'
    assert sample(events['ShowRight']+1.5)['acting']['liftR']>.99
    assert sample(events['ShowLeft']+2.6)['acting']['liftL']>.99
    assert sample(events['TestMark']+3)['acting']['testing']>.99
    assert sample(events['ObserveMark']+1)['acting']['testing']<.01
    assert sample(events['TryAgain']+2.4)['acting']['testing']>.99
    assert sample(events['StopTrying']+1)['acting']['testing']<.01
    assert sample(events['ReleaseHand']+1.8)['acting']['release']>.99
    assert sample(events['ReleaseHand']+1.8)['acting']['liftL']<.01
    before=sample(events['TestMark']);after=sample(events['TestMark']+3.2)
    assert after['mark']>before['mark'] and after['markVertices']>before['markVertices']>0
    assert all(abs(f['mark']-after['mark'])<1e-7 for f in frames if f['t']>=events['TestMark']+3.2)
    # Measure emitted world-space geometry, not just a named cue or mouth channel.
    # These are authored beats, not a demand for perpetual idle motion.
    beats=[('lei',3,1,.15),('lei',4,0,.15),('lei',5,1,.09),('lei',11,0,.03),('lei',13,0,.15),('lei',15,1,.09),
           ('aoi',4,0,.13),('aoi',6,1,.12),('aoi',8,0,.17),('aoi',11,0,.17),('aoi',14,0,.08),('aoi',16,1,.07)]
    coverage=[]
    for actor,entry,hand,minimum in beats:
        samples=[f for f in frames if f['entry']==entry]
        points=[f['metrics'][actor]['wrists'][hand] for f in samples]
        excursion=max(math.dist(a,b) for a in points for b in points)
        assert excursion>=minimum,f'{actor} entry {entry}: frozen/weak wrist beat {excursion:.3f} < {minimum}'
        coverage.append({'actor':actor,'entry':entry,'hand':hand,'excursion':excursion,'minimum':minimum})
    for actor in ('lei','aoi'):
        quats=[f['metrics'][actor]['headQuaternion'] for f in frames]
        change=max(2*math.acos(min(1,abs(sum(a*b for a,b in zip(quats[0],q))))) for q in quats)
        assert change>.20,f'{actor}: frozen head'
        assert len({f['performance'][actor]['gaze'] for f in frames})>=3,f'{actor}: no attention changes'
    r={'passed':True,'events':events,'markVerticesBefore':before['markVertices'],'markVerticesAfter':after['markVertices'],
       'checks':['first attempt','lasting attached marking','distinct second attempt','interruption','release without resetting mark',
                 '12 geometry-backed acting beats','both heads turn','attention changes'], 'performance':coverage,
       'limit':'Excursion and event coverage reject frozen output; they do not prove natural acting or character appeal.'}
    Path(trace).with_name('story_motion.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
    print('story motion: 5 causal checks and 12 geometry-backed acting beats passed')
