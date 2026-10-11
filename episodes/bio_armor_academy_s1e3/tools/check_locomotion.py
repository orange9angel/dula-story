"""Validate rendered foot contacts, leg reach and facing for the R21 walk segments."""
import argparse
import json
import math
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('trace',type=Path)
args=parser.parse_args()
data=json.loads(args.trace.read_text())
previous={};stats={};failures=[]
for frame in data['frames']:
    for actor,pose in frame.get('locomotion',{}).items():
        t=frame['t'];key=(actor,pose['kind'])
        out=stats.setdefault(key,dict(frames=0,support_pairs=0,max_slip=0.,max_rotation=0.,max_heading_error=0.,max_leg_error=0.,min_track_width=100.,min_sole_height=100.))
        out['frames']+=1
        for foot in pose['feet'].values():out['min_sole_height']=min(out['min_sole_height'],foot.get('soleMin',100.))
        old=previous.get(actor)
        if old and t-old[0]<.04 and pose['kind']==old[1]['kind']:
            prev=old[1]
            for side,foot in pose['feet'].items():
                before=prev['feet'][side]
                if foot['stance'] and before['stance'] and foot['id']==before['id']:
                    out['support_pairs']+=1
                    # 滑步按 XZ 判（支撑期足踝滚动会让踝部 Y 起伏，竖直分量不是滑步）
                    slip=math.hypot(foot['position'][0]-before['position'][0],foot['position'][2]-before['position'][2])
                    # 支撑期足踝滚动=绕踝俯仰（正当），rotations 只判偏航漂移：YXZ 欧拉取 yaw 差
                    def yawOf(q):
                        x,y,z,w=q
                        return math.atan2(2*(w*y+x*z),1-2*(y*y+x*x))
                    dy=yawOf(foot['quaternion'])-yawOf(before['quaternion'])
                    rotation=abs(math.atan2(math.sin(dy),math.cos(dy)))
                    out['max_slip']=max(out['max_slip'],slip)
                    out['max_rotation']=max(out['max_rotation'],rotation)
            dx=pose['root'][0]-prev['root'][0];dz=pose['root'][2]-prev['root'][2]
            speed=math.hypot(dx,dz)/(t-old[0])
            if pose['kind']=='walk' and speed>.25:
                dot=(dx*math.sin(pose['yaw'])+dz*math.cos(pose['yaw']))/math.hypot(dx,dz)
                out['max_heading_error']=max(out['max_heading_error'],math.degrees(math.acos(max(-1,min(1,dot)))))
        if pose['kind']!='turn':
            a,b=pose['feet']['left']['position'],pose['feet']['right']['position']
            width=(b[0]-a[0])*math.cos(pose['yaw'])-(b[2]-a[2])*math.sin(pose['yaw'])
            out['min_track_width']=min(out['min_track_width'],width)
        expected=.40 if actor=='lei' else .45
        for leg in pose['legs'].values():
            for a,b in zip(leg,leg[1:]):
                length=math.dist([a[x] for x in 'xyz'],[b[x] for x in 'xyz'])
                out['max_leg_error']=max(out['max_leg_error'],abs(length-expected))
        previous[actor]=(t,pose)
for key,out in stats.items():
    if out['max_slip']>1e-6:failures.append(f'{key}: support slides {out["max_slip"]}')
    if out['max_rotation']>1e-5:failures.append(f'{key}: support rotates {out["max_rotation"]}')
    if out['max_heading_error']>20:failures.append(f'{key}: heading {out["max_heading_error"]}')
    if out['min_track_width']<.10:failures.append(f'{key}: crossed tracks {out["min_track_width"]}')
    if out['max_leg_error']>.002:failures.append(f'{key}: stretched leg {out["max_leg_error"]}')
    if out['min_sole_height']<-.015:failures.append(f'{key}: sole penetrates {out["min_sole_height"]}')
assert stats,'No rendered locomotion samples'
report={'passed':not failures,'segments':{':'.join(k):v for k,v in stats.items()},'failures':failures,
    'limits':'Ankle/contact checks do not certify sole collision or artistic quality; inspect normal-speed video too.'}
args.trace.with_name('locomotion_validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
raise SystemExit(bool(failures))
