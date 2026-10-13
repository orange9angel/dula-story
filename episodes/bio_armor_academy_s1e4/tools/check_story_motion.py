"""R3 cause/effect and prop contact checks against emitted render geometry."""
from pathlib import Path
import json,math

def check(trace,episode):
    data=json.loads(Path(trace).read_text(encoding='utf-8'));frames=data['frames']
    tl=json.loads((episode/'config/timeline.json').read_text(encoding='utf-8'))
    events={e['type']:s['start'] for s in tl['segments'] for e in s['events']}
    order=['EnterRoom','HideMark','ShowLeft','PressMark','Warning','ForceRetract','StopTrying','QuietLeaf',
           'UnclenchAndShowMark','OfferJar','TakeJarWithMarkedHand','Reassure','StudyLeafTogether']
    assert all(events[a]<events[b] for a,b in zip(order,order[1:]))
    sample=lambda t:min(frames,key=lambda f:abs(f['t']-t))
    for event,dt,phase in [('HideMark',1,'hide'),('ShowLeft',1.8,'show'),('PressMark',1,'rub'),
                         ('ForceRetract',1,'tryHard'),('UnclenchAndShowMark',2,'release')]:
        assert sample(events[event]+dt)['acting'][phase]>.95,(event,phase)
    assert sample(events['StopTrying']+1)['acting']['tryHard']<.01
    before=sample(events['ForceRetract']);after=sample(events['ForceRetract']+2)
    assert after['mark']>before['mark'] and after['markVertices']>before['markVertices']>0
    assert all(abs(f['mark']-after['mark'])<1e-7 for f in frames if f['t']>=events['ForceRetract']+2)
    assert sample(67.5)['jarOwner']=='lei' and sample(67.5)['jarPosition'][1]>1.08
    assert sample(61)['jarOwner']=='aoi'
    assert sample(62.2)['jarPosition'][0]<.01
    maxima={'tableDepth':0.,'glassDepth':0.,'heldGap':0.,'jarStep':0.}
    arm_contact_window=(events['PressMark'],events['PressMark']+2.6)
    for f in frames:
        t=f['t'];m=f['metrics']
        assert set(m['tablePenetration'])=={a+':'+p for a in ['lei','aoi'] for p in ['body','leftArm','rightArm','legs']}
        for part,value in m['tablePenetration'].items():
            depth=value['maxDepth'];maxima['tableDepth']=max(maxima['tableDepth'],depth)
            assert math.isfinite(depth) and depth<=.002,f'{t}: {part} penetrates table {depth}'
        for actor in ['lei','aoi']:
            contact=m['jarContact'][actor];depth=contact['penetration']
            maxima['glassDepth']=max(maxima['glassDepth'],depth)
            assert math.isfinite(depth) and depth<=.002,f'{t}: {actor} penetrates glass {depth}'
            if f['jarOwner']==actor:
                maxima['heldGap']=max(maxima['heldGap'],contact['gap'])
                assert contact['gap']<=.005,f'{t}: floating {actor} grip'
            if actor!='lei' or not arm_contact_window[0]<=t<=arm_contact_window[1]:
                assert m[actor]['selfGaps']['arms']>=.002,f'{t}: {actor} arms overlap outside rubbing'
        assert f['jarPosition'][1]>=1.004,f'{t}: jar below tabletop'
    for a,b in zip(frames,frames[1:]):
        step=math.dist(a['jarPosition'],b['jarPosition']);maxima['jarStep']=max(maxima['jarStep'],step)
        assert step<.015,f"Jar teleport at {b['t']}: {step}"
    beats=[('lei',2,0,.8),('lei',3,0,.04),('lei',4,0,.25),('lei',5,1,.20),('lei',7,1,.30),
           ('lei',9,0,.03),('lei',14,0,.25),('lei',16,0,.25),('aoi',8,0,.25),('aoi',10,0,.30),('aoi',15,0,.4),('aoi',17,0,.08)]
    coverage=[]
    for actor,entry,hand,minimum in beats:
        points=[f['metrics'][actor]['wrists'][hand] for f in frames if f['entry']==entry]
        excursion=max(math.dist(a,b) for a in points for b in points)
        assert excursion>=minimum,f'{actor} entry {entry}: wrist excursion {excursion} < {minimum}'
        coverage.append({'actor':actor,'entry':entry,'hand':hand,'excursion':excursion,'minimum':minimum})
    for actor in ['lei','aoi']:
        quats=[f['metrics'][actor]['headQuaternion'] for f in frames]
        change=max(2*math.acos(min(1,abs(sum(a*b for a,b in zip(quats[0],q))))) for q in quats)
        assert change>.20,f'{actor}: frozen head'
        assert len({f['performance'][actor]['gaze'] for f in frames})>=3
    anchors=json.loads((episode/'config/foley_anchors.json').read_text(encoding='utf-8'))
    for row in anchors['landings']:
        at=sample(row['time']);prev=sample(row['time']-1/data['fps'])
        assert not prev['metrics'][row['actor']]['feet'][row['side']]['stance']
        assert at['metrics'][row['actor']]['feet'][row['side']]['stance']
    report={'passed':True,'events':events,'markVerticesBefore':before['markVertices'],'markVerticesAfter':after['markVertices'],
      'performance':coverage,'contactMaximaMeters':maxima,'verifiedLandings':len(anchors['landings']),
      'intentionalContact':{'window':arm_contact_window,'pair':'Lei right hand / left forearm','purpose':'rubbing the persistent mark'},
      'limit':'30 Hz sampled vertices and projection certificates do not prove continuous collision-free motion; rubbing contact and natural acting require image review.'}
    Path(trace).with_name('story_motion.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('story motion: 13 events, 12 geometry-backed beats, mark persistence, jar/table/grip and footfall sync passed')
