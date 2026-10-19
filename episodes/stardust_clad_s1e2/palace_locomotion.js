import {createLocomotion,angleDelta} from 'dula-assets/lib/craft3d/locomotion.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,u)=>a+(b-a)*u;
const turn=createLocomotion({turnLift:.025,turnStepAngle:1.65,hipDelta:.010});

// A finite, time-bounded foot plan: the trailing foot finishes before the root
// arrives. The last two footfalls already carry the final facing direction.
export const palaceGait={
 turningFeet:turn.turningFeet,
 walkingFeet(walk,rootX,rootZ,yaw,half,footY,stride){
  const {from,to}=walk,dx=to[0]-from[0],dz=to[1]-from[1],D=Math.hypot(dx,dz);
  const heading=walk.facingYaw??Math.atan2(dx,dz),endYaw=walk.endYaw??heading;
  const count=Math.max(2,Math.ceil(D/(stride*.68))),progress=clamp(walk.a/.95)*(count+1),j=Math.min(count,Math.floor(progress)),phase=progress>=count+1?1:progress-j;
  const q=smooth((phase-.10)/.80),moving=j%2===0?'left':'right',result={};
  const target=(step,sign)=>{
   const fraction=clamp(step/count),h=heading+angleDelta(heading,endYaw)*smooth((fraction-.56)/.44);
   return {x:from[0]+dx*fraction+Math.cos(h)*sign*half,z:from[1]+dz*fraction-Math.sin(h)*sign*half,h};
  };
  for(const [side,sign] of [['left',-1],['right',1]]){
   const swing=side===moving,oldStep=Math.max(0,j-1),nextStep=Math.min(count,j+1),supportStep=Math.min(count,j);
   const a=target(swing?oldStep:supportStep,sign),b=target(swing?nextStep:supportStep,sign),u=swing?q:0;
   const wx=mix(a.x,b.x,u),wz=mix(a.z,b.z,u),h=a.h+angleDelta(a.h,b.h)*u;
   const back=Math.cos(heading-Math.atan2(dx,dz))<0;
   const strike=back?.08:.22,push=back?.10:.20;
   const supportPhase=clamp((phase+.10)/1.10);
   const stancePitch=supportPhase<.29?mix(-strike,0,smooth(supportPhase/.29)):supportPhase<.66?0:push*smooth((supportPhase-.66)/.34);
   let pitch=swing?mix(push,-strike,smooth(q)):stancePitch;
   if(j===0&&swing)pitch*=smooth(phase/.10);
   if(j===0&&!swing)pitch=push*smooth(phase);
   const terminal=swing?nextStep===count:supportStep===count;
   if(terminal){if(swing)pitch*=1-smooth((q-.73)/.27);else pitch=0;}
   if(walk.a>=.95)pitch=0;
   const lift=swing?.055*Math.sin(Math.PI*q)**1.2:0;
   const cx=wx-rootX,cz=wz-rootZ;
   result[side]={x:Math.cos(yaw)*cx-Math.sin(yaw)*cz,z:Math.sin(yaw)*cx+Math.cos(yaw)*cz,
    y:footY+lift+Math.sin(Math.abs(pitch))*(pitch<0?.08:.17),pitch,yaw:angleDelta(yaw,h),
    stance:!swing||q===0||q===1,contact:`planned:${side}:${swing?(q===1?nextStep:oldStep):supportStep}`};
  }
  const envelope=Math.sin(Math.PI*phase)**2*smooth(walk.a/.07)*smooth((1-walk.a)/.08),sign=moving==='left'?-1:1;
  return {...result,phase,step:j,steps:count+1,heading,sway:-sign*.010*envelope,hipDelta:.018*envelope,
   armSwing:Math.max(-.065,Math.min(.065,(result.left.z-result.right.z)*.18))};
 }
};

export function directNaturalTravel(s,name,t,T){
 if(name==='yekari'){
  const startYaw=Math.atan2(-4.15,-1.88);
  if(t>=T.ARRIVE&&t<26&&s.walk){
   s.walk.endYaw=-.85;s.yaw=startYaw+angleDelta(startYaw,-.85)*smooth((s.walk.a-.58)/.36);
   s.headYaw=angleDelta(s.yaw,-.85)*smooth((s.walk.a-.28)/.25)*.65;
  }
  if(t>=26&&t<27){s.turn=null;s.yaw=-.85;s.headYaw=0;}
 }
 if(s.walk){
  // Weapon-bearing hands remain restrained, but both arms no longer freeze at
  // identical angles. Preserve attack/guard poses outside ordinary travel.
  const ordinary=name==='yekari'&&(t<27||t>=T.RETREAT+2);
  if(ordinary){s.noSwing=0;s.left={x:-.17,y:1.16,z:.035};s.right={x:.17,y:1.18,z:.055};s.fist=.35;}
 }
}
