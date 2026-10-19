"""Scoped physics assertions for the palace duel; not a mesh collision guarantee."""
from pathlib import Path
import json,math,sys,hashlib
EP=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
def main():
    source=EP/(sys.argv[1] if len(sys.argv)>1 else 'storyboard/palace_r19/physics_final/trace.json')
    data=read(source);frames=data['frames'];T=read(EP/'config/event_times.json');errors=[]
    for item in data['build']['inputs']:
        if hashlib.sha256(Path(item['path']).read_bytes()).hexdigest()!=item['sha256']:errors.append('stale input: '+item['path'])
    if len(frames)!=round(data['duration']*data['fps']):errors.append('incomplete full timeline')
    distance=lambda a,b:math.dist(a,b)
    trap=[];bones=[];effect=[];plant=[];step=[]
    for f in frames:
        if set(f['cast'])-{'aoao','yekari'}:errors.append('unexpected cast')
        if f['t']<T['ARRIVE'] and f['cast']!=['aoao']:errors.append('intruder before arrival')
        if f['scene']!='ember':errors.append('wrong territory')
        if T['TRAP']+.2<=f['t']<=T['HERO_CHARGE']-.1:trap.append(distance(f['shieldRimLow'],f['slot']))
        for who,arms in f['arms'].items():
            expected=[.20,.19] if who=='aoao' else [.21,.20]
            for side,p in arms.items():
                bones.extend(abs(distance(p[i],p[i+1])-expected[i]) for i in range(2))
        for c in f['contacts'].values():effect.append(distance(c['effect'],c['target']))
        for p in f['roots'].values():
            if any(not math.isfinite(v) for v in p):errors.append('non-finite root')
    for key in ['C1','C3','C6']:
        win=[f for f in frames if T[key]-1.8<=f['t']<T[key]+1.6]
        for side in ['left','right']:
            base=win[0]['feet']['yekari'][side]
            plant.extend(math.hypot(f['feet']['yekari'][side][0]-base[0],f['feet']['yekari'][side][2]-base[2]) for f in win)
    for a,b in zip(frames,frames[1:]):
        for who in ['aoao','yekari']:
            if who in a['cast'] and who in b['cast']:step.append(distance(a['roots'][who],b['roots'][who]))
    if max(trap)>.025:errors.append('shield rim misses fixed notch')
    if max(bones)>.002:errors.append('arm bone length changes')
    if max(effect)>.001:errors.append('impact displaced from target')
    if max(plant)>.015:errors.append('attack stance slides')
    if max(step)>.08:errors.append('root discontinuity')
    late=next(f for f in frames if f['t']>=T['RESTORE']+4)
    if late['gateOpen']<.9 or late['windowsLit']!=36:errors.append('street restoration missing')
    result={'passed':not errors,'fps':data['fps'],'frames':len(frames),'duration':data['duration'],'maxShieldNotchGap':max(trap),'maxArmBoneError':max(bones),'maxImpactAnchorError':max(effect),'maxAttackPlantedFootDrift':max(plant),'maxRootStep':max(step),'errors':sorted(set(errors)),'limits':['checks anchors and skeletal lengths, not every deformed triangle','final visual and audio observations are separate']}
    (EP/'storyboard/palace_r19/palace_checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result));return bool(errors)
if __name__=='__main__':raise SystemExit(main())
