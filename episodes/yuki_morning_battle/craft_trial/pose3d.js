// Episode-local deformation study. +Z is the character's forward direction.
// Poles are defined in character space, never in the camera's screen plane.
import {clamp,smooth,mix} from './pose.js';
const v=(x,y,z=0)=>({x,y,z});
const add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(a,s)=>v(a.x*s,a.y*s,a.z*s);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const length=a=>Math.hypot(a.x,a.y,a.z);
const unit=a=>mul(a,1/(length(a)||1));
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));

export function twoBone(start,end,pole,a,b){
  const delta=sub(end,start),raw=length(delta);
  if(raw>a+b+1e-7)throw new Error(`Unreachable limb: ${raw} > ${a+b}`);
  const axis=unit(delta),d=clamp(raw,Math.abs(a-b)+1e-6,a+b-1e-6);
  const along=(a*a-b*b+d*d)/(2*d);
  const bend=unit(sub(pole,mul(axis,dot(pole,axis))));
  return add(add(start,mul(axis,along)),mul(bend,Math.sqrt(Math.max(0,a*a-along*along))));
}

export function samplePose3D(time,kind,duration){
  const t=Math.floor((time+1e-7)*15)/15;
  let rootX=0,yaw=0,hipY=.6925,point=0,anticipation=0;
  let lf=v(-.086,.095),rf=v(.086,.095),leftContact=true,rightContact=true;
  if(kind==='walk'){
    yaw=Math.PI/2;
    const q=t/duration*3.4;
    const foot=(steps)=>{
      let forward=-.29,lift=0,contact=true;
      for(const [start,end,target] of steps){
        if(q<start)break;
        if(q>=end){forward=target;continue;}
        const u=(q-start)/(end-start);
        forward=mix(forward,target,smooth(u));lift=.095*Math.sin(Math.PI*u);
        contact=false;break;
      }
      return {forward,lift,contact};
    };
    const l=foot([[.22,.80,-.05],[1.57,2.15,.43]]);
    const r=foot([[.91,1.49,.19],[2.29,2.87,.43]]);
    rootX=mix(-.29,.43,smooth((q-.05)/3.10));
    lf=v(-.086,.095+l.lift,l.forward-rootX);
    rf=v(.086,.095+r.lift,r.forward-rootX);
    leftContact=l.contact;rightContact=r.contact;
    // The pelvis yields to the planted foot; bone lengths never stretch.
    hipY=Math.min(.688,...[lf,rf].map(f=>f.y+Math.sqrt(.596**2-f.z**2-.011**2)));
    hipY-=.006*Math.sin(q*Math.PI/.66)**2;
  }else if(kind==='point'){
    anticipation=smooth((t-.23)/.32)*(1-smooth((t-.69)/.25));
    point=smooth((t-.62)/.38)*(1-smooth((t-2.30)/.52));
    hipY-=.009*anticipation;
  }else if(kind==='turn'){
    // Turntable inspection, not a planted-foot locomotion animation.
    yaw=2*Math.PI*smooth(time/duration);
  }
  const bob=hipY-.6925,arms={},legs={};
  for(const [side,sign,foot] of [['left',-1,lf],['right',1,rf]]){
    const hip=v(sign*.075,hipY),shoulder=v(sign*.175,1.075+bob);
    legs[side+'Leg']=[hip,twoBone(hip,foot,v(0,0,1),.305,.295),foot];
    let wrist=v(sign*.228,.713+bob,.035);
    if(side==='right'&&kind==='point'){
      wrist=lerp(wrist,v(.505,1.018+bob,.035),point);
      wrist=lerp(wrist,v(.27,.91+bob,.15),anticipation*.5);
    }
    if(kind==='walk'){
      const stride=rf.z-lf.z;
      wrist.z+=sign*stride*.35;
      wrist.y=shoulder.y-Math.sqrt(.357**2-(wrist.x-shoulder.x)**2-wrist.z**2);
    }
    const pole=side==='right'&&point>.01?v(.15,-1,-.1):v(sign*.1,-.1,-1);
    arms[side+'Arm']=[shoulder,twoBone(shoulder,wrist,pole,.19,.18),wrist];
  }
  const world=f=>v(rootX+Math.cos(yaw)*f.x+Math.sin(yaw)*f.z,f.y,-Math.sin(yaw)*f.x+Math.cos(yaw)*f.z);
  return {t,kind,rootX,yaw,hipY,bob,point,anticipation,...arms,...legs,leftContact,rightContact,
    leftFoot:world(lf),rightFoot:world(rf),blink:Math.max(0,1-Math.abs(t-2.8)/.1)};
}
