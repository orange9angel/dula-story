"""Check that restrained geometry still tells the scripted action, from numeric state."""
from pathlib import Path
import json

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
    r={'passed':True,'events':events,'markVerticesBefore':before['markVertices'],'markVerticesAfter':after['markVertices'],
       'checks':['first attempt','lasting attached marking','distinct second attempt','interruption','release without resetting mark']}
    Path(trace).with_name('story_motion.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
    print('story motion: all 5 causal checks passed')
