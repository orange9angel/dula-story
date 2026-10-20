"""Narrow measured checks; does not certify deformation, acting or natural gait."""
from pathlib import Path
import hashlib,json,math,sys
EP=Path(__file__).resolve().parents[1]
trace=EP/(sys.argv[1] if len(sys.argv)>1 else 'storyboard/r10/trace.json')
d=json.loads(trace.read_text(encoding='utf-8'));frames=d['frames']
def dist(a,b):return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))
stale=[s['path'] for s in d['build']['inputs'] if hashlib.sha256(Path(s['path']).read_bytes()).hexdigest()!=s['sha256']]
checks=[]
for who,side,a,b in [('xiaozao','left',27.05,28.00),('xiaozao','right',26.05,27.05),('xiaozao','right',28.05,29.90),('xiaozao','left',28.75,29.90)]:
 ps=[f[who][side]['footWorld'] for f in frames if a<=f['t']<=b]
 drift=max(dist(p,ps[0]) for p in ps)
 checks.append(dict(character=who,side=side,start=a,end=b,samples=len(ps),ankle_drift_m=drift,passed=drift<.001))
grip=[(f['t'],dist(f['contact']['xiaozao']['right'],f['contact']['weihe']['left'])) for f in frames if 80.2<=f['t']<=91.4]
reach=[]
for who in ['xiaozao','jianwang','weihe']:
 for side in ['left','right']:
  worst=max(frames,key=lambda f:f[who][side]['reachError'])
  reach.append(dict(character=who,side=side,time=worst['t'],clamp_m=worst[who][side]['reachError']))
report={'trace':str(trace.relative_to(EP)),'fps':d['fps'],'frames':len(frames),'stale':stale,'stance_checks':checks,
 'grip':{'min_m':min(x[1] for x in grip),'max_m':max(x[1] for x in grip),'target_wrist_separation_m':.055,'palm_contact_not_measured':True},
 'arm_reach':reach,'scope':'Actual ankle centers and wrist origins, not skin/cloth collision or perceptual naturalness.',
 'passed':not stale and all(c['passed'] for c in checks),'artistic_acceptance':False}
(trace.parent/'motion_check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
