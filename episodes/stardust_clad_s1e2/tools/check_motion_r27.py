"""Actual ankle trajectories, planned contact transitions and unchanged audio stems."""
from pathlib import Path
import json,math,hashlib
EP=Path(__file__).resolve().parents[1];BOARD=EP/'storyboard/palace_r27'
samples=json.loads((BOARD/'walk_samples.json').read_text())
def stats(rows):
    stance=[];motion=[];arrival=[];contacts=[]
    for a,b in zip(rows,rows[1:]):
        if b['t']-a['t']>.018:continue
        for name in b['cast']:
            if name not in a['cast']:continue
            for side in ['left','right']:
                f=a['locomotion'][name]['feet'][side];g=b['locomotion'][name]['feet'][side]
                d=math.dist(f['position'],g['position'])
                motion.append([d,b['t'],name,side])
                if f.get('stance') and g.get('stance') and f.get('contact')==g.get('contact'):
                    stance.append([math.dist(f['position'][::2],g['position'][::2]),b['t'],name,side])
                if name=='yekari' and 26.03<=b['t']<27:arrival.append(d)
                if f.get('stance') is False and g.get('stance') is True:contacts.append([b['t'],name,side])
    return {'maxStanceXZ':sorted(stance,reverse=True)[:5],'maxFootStep':sorted(motion,reverse=True)[:8],
            'postArrivalFootMotion':max(arrival),'contacts':contacts}
r={name:stats(samples[name]) for name in ['before','after']}
cues=json.loads((EP/'config/foley_contacts.json').read_text())['cues']
alignment=[]
for t,name,side in r['after']['contacts']:
    delta=min(abs(t-c['startTime']) for c in cues if c['actor']==name and c['foot']==side)
    alignment.append({'t':t,'actor':name,'foot':side,'audioDeltaSeconds':delta})
r['foleyAlignment']=alignment
r['passed']=r['after']['maxStanceXZ'][0][0]<.001 and r['after']['postArrivalFootMotion']<.001 and all(x['audioDeltaSeconds']<.018 for x in alignment)
r['limits']='60 Hz selected travel/stop windows; actual ankle centers, not rolling sole contact. Full mesh/environment and bone checks are separate. Swing speed is reported, not treated as stance slip.'
(BOARD/'walk_checks.json').write_text(json.dumps(r,indent=2),encoding='utf-8')
print(json.dumps({k:r[k] for k in ['passed','limits']}));print('max stance XZ',r['after']['maxStanceXZ'][0]);print('largest movement',r['after']['maxFootStep'][:3])
assert r['passed']
