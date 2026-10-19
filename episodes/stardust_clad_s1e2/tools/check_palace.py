"""Scoped physics assertions for the palace duel; not a mesh collision guarantee."""
from pathlib import Path
import json,math,sys,hashlib,argparse
EP=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
def main():
    parser=argparse.ArgumentParser();parser.add_argument('trace',nargs='?',default='storyboard/palace_r20/physics_final/trace.json');parser.add_argument('--out',default='storyboard/palace_r20/palace_checks.json');args=parser.parse_args()
    source=EP/args.trace
    data=read(source);frames=data['frames'];T=read(EP/'config/event_times.json');errors=[]
    for item in data['build']['inputs']:
        if hashlib.sha256(Path(item['path']).read_bytes()).hexdigest()!=item['sha256']:errors.append('stale input: '+item['path'])
    if len(frames)!=round(data['duration']*data['fps']):errors.append('incomplete full timeline')
    if not frames:raise ValueError('empty trace')
    if data['fps']<60:errors.append('environment sampling below 60Hz')
    expected_obstacles=read(EP/'config/palace_stage_contract.json')['obstacleCount']
    env_pairs=0;env_broad=0;env_narrow=0;env_depth=0;env_bad=[]
    for i,f in enumerate(frames):
        if abs(f['t']-i/data['fps'])>.001:errors.append('missing or nonsequential sample')
        env=f.get('environment')
        if not env:errors.append('missing environment surface audit');continue
        if env['obstacles']!=expected_obstacles or env['pairs']!=len(f['cast'])*expected_obstacles:errors.append('incomplete actor/environment pairing')
        if env['pairs']!=env['broadSeparated']+env['narrowPairs']:errors.append('unaccounted environment pairs')
        if not all(math.isfinite(env[k]) for k in ['maxDepth','minBroadGap','pairs']):errors.append('nonfinite environment audit')
        env_pairs+=env['pairs'];env_broad+=env['broadSeparated'];env_narrow+=env['narrowPairs'];env_depth=max(env_depth,env['maxDepth'])
        if env['collisions']:
            errors.append('actor intersects stage solid')
            if len(env_bad)<12:env_bad.append({'t':f['t'],'collisions':env['collisions']})
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
    if not all([trap,bones,effect,plant,step]):errors.append('empty required action window')
    result={'passed':not errors,'fps':data['fps'],'frames':len(frames),'duration':data['duration'],'maxShieldNotchGap':max(trap,default=None),'maxArmBoneError':max(bones,default=None),'maxImpactAnchorError':max(effect,default=None),'maxAttackPlantedFootDrift':max(plant,default=None),'maxRootStep':max(step,default=None),'environment':{'obstacles':expected_obstacles,'pairs':env_pairs,'broadSeparated':env_broad,'narrowPairs':env_narrow,'maxDepth':env_depth,'examples':env_bad},'errors':sorted(set(errors)),'limits':['stage solids: actual rendered geometry bounds; overlap uses triangle/box SAT and surface vertices','60Hz sampled validation, not continuous-time CCD or full self collision','final visual and audio observations are separate']}
    (EP/args.out).write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result));return bool(errors)
if __name__=='__main__':raise SystemExit(main())
