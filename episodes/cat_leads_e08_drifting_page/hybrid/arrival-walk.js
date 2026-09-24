import * as THREE from 'three';
import {clamp,smooth,mix} from './timeline.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// World-space foot placements. The last two swing phases turn the feet;
// a planted foot never inherits the pelvis turn.
export function arrivalWalk(p,t,beats){
  const duration=beats.arrived-beats.arrival,q=clamp((t-beats.arrival)/duration)*2;
  p.rootX=mix(-1.40,-.68,smooth(q/1.96));
  p.yaw=mix(Math.PI/2,.88,smooth((q-.83)/1.03));
  const inv=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),-p.yaw),feet=[];
  for(const [side,sign] of [['left',-1],['right',1]]){
    const finish=V(-.68+Math.cos(.88)*sign*.086,.095,.46-Math.sin(.88)*sign*.086);
    let anchor=V(-1.40,.095,.46-sign*.086),yaw=Math.PI/2,lift=0,pitch=0,contact=true;
    const steps=sign<0?[[.10,.54,V(-1.12,.095,.546),Math.PI/2],[1.02,1.51,finish,.88]]:
      [[.56,1.02,V(-.86,.095,.374),1.40],[1.53,1.90,finish,.88]];
    for(const [start,end,target,targetYaw] of steps){
      if(q<start){if(q>start-.10)pitch=.16*smooth((q-start+.10)/.10);break;}
      if(q>=end){anchor=target.clone();yaw=targetYaw;pitch=-.11*(1-smooth((q-end)/.09));continue;}
      const u=(q-start)/(end-start);
      anchor.lerp(target,smooth(u));yaw=mix(yaw,targetYaw,smooth(u));
      lift=.032*Math.sin(Math.PI*u)**2;
      pitch=mix(.16,-.11,smooth(u));contact=false;break;
    }
    const pivot=V(0,-.095,pitch>=0?.150:-.073),rolled=pivot.clone().sub(pivot.clone().applyAxisAngle(V(1,0,0),pitch));
    const ankle=anchor.clone().add(rolled.applyAxisAngle(V(0,1,0),yaw));ankle.y+=lift;
    feet.push(ankle.clone().sub(V(p.rootX,0,p.rootZ)).applyQuaternion(inv));
    p[side+'FootYaw']=yaw-p.yaw;p[side+'FootPitch']=pitch;p[side+'Contact']=contact;
    p[side+'SupportAnchor']=anchor;p[side+'Clearance']=lift;
  }
  p.hipY=Math.min(.6925,...feet.map((f,i)=>f.y+Math.sqrt(Math.max(0,.595**2-(f.x-(i===0?-.075:.075))**2-f.z*f.z))));
  p.bob=p.hipY-.6925;p.bodyTilt=.024*Math.sin(Math.PI*q/2);p.bodyRoll=.016*Math.sin(q*Math.PI*2)*(1-smooth((q-1.5)/.5));
  p.stride=feet[1].z-feet[0].z;
  return feet;
}
