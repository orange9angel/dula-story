import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
const V=(x,y,z=0)=>({x,y,z}),ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
export const LIMITS={armLengths:[.19,.18],legLengths:[.40,.40],maxHeadTurn:.24,maxWristStep:.028};
export function posesAt(t,cues){
  const tq=Math.floor((t+1e-9)*15)/15;
  const since=(cue,delay=0)=>cues[cue]===undefined?-100:tq-cues[cue]-delay;
  const release=ease(since('ReleaseHand')/1.6);
  const liftR=ease(since('ShowRight')/1.3)*(1-ease(since('ShowLeft',.6)/1.3));
  const liftL=ease(since('ShowLeft',.6)/1.8)*(1-release);
  const firstTry=ease(since('TestMark',2.0)/.7)*(1-ease(since('TestMark',3.5)/.8));
  const secondTry=ease(since('TryAgain',.8)/1.4)*(1-ease(since('StopTrying')/.7));
  const testing=Math.max(firstTry,secondTry);
  const result={};
  for(const key of ['lei','aoi']){
    const p={rootX:key==='lei'?-.9:.9,rootZ:0,yaw:key==='lei'?.12:-.12,bob:0,lean:0,
      headPitch:key==='lei'?.05+.03*liftL:0,headYaw:key==='lei'?.14:-.14,headRoll:key==='lei'?-.02:.02,fist:.12};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const shoulder=V(sign*.17,1.375,0),rest=V(sign*.29,1.065,.035),raised=V(sign*.34,1.15,.20);
      const u=key==='lei'?(side==='left'?liftL:liftR):0,target=mix(rest,raised,u);
      p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.7,-.5,.3),.19,.18),target];
      const hip=V(sign*.075,.85,0),ankle=V(sign*.115,.095,.025);
      p[side+'Leg']=[hip,twoBone(hip,ankle,V(0,0,1),.4,.4),ankle];
    }
    p.leftFist=key==='lei'?.12+.50*testing:.12;
    p.emotion=key==='lei'?(release>.5?'neutral':testing>.2?'worry':'worry'):'neutral';
    p.blink=Math.max(0,1-Math.abs(((tq+(key==='aoi'?1.2:0))%4.3)-4.05)/.12);
    result[key]=p;
  }
  // The first attempt lengthens the attached marking and it stays: no growing free mesh.
  result.mark=.45+.25*ease(since('TestMark',2.3)/.8);
  result.phase={liftL,liftR,testing,release};return result;
}
