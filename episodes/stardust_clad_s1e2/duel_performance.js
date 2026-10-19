import {buildPose} from 'dula-assets/characters/stardust/pose-rig.js';
import {T} from './config/event_times.js';
export {T};
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,u)=>a+(b-a)*u;
const V=(x,y,z=0)=>({x,y,z});
const blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const DIMS={aoao:{hipIdle:.87,shoulderY:1.42,shoulderHalf:.14,hipHalf:.078,legA:.42,legB:.42,armA:.20,armB:.19,footY:.085},
 yekari:{hipIdle:.93,shoulderY:1.52,shoulderHalf:.125,hipHalf:.068,legA:.49,legB:.49,armA:.21,armB:.20,footY:.09}};
export const CAST=['aoao','yekari'];
export const HIT_KEYS=['C1','C2','C3','C4','C5','C6','TRAP','LOCK','C7'];
// Local contact holds preserve the source clock and resume within the same action.
function heldTime(t){for(const key of HIT_KEYS){const h=T[key];if(t>=h&&t<h+.10)return h;if(t>=h+.10&&t<h+.26)return h+(t-h-.10)*1.625;}return t;}
function travel(s,t,a,b,from,to,facing){
 const u=clamp((t-a)/(b-a)),r=.12,k=1/(1-r),p=u<r?k*u*u/(2*r):u>1-r?1-k*(1-u)**2/(2*r):k*(u-r/2);
 s.rootX=mix(from[0],to[0],p);s.rootZ=mix(from[1],to[1],p);s.yaw=facing;
 s.walk=u>0&&u<1?{from,to,a:u,facingYaw:facing}:null;
}
function state(name,t,phase){
 const hero=name==='aoao',sh=hero?1.42:1.52;
 const s={visible:hero||t>=T.ARRIVE,rootX:hero?-.95:1.35,rootZ:hero?.15:-.03,yaw:hero?.85:-.85,
 bob:0,lean:0,air:0,tuck:0,left:V(-.17,sh-.27,.12),right:V(.18,sh-.28,.10),headYaw:0,headPitch:0,headRoll:0,
 fist:.45,open:0,point:0,walk:null,turn:null,cladT:1,emotion:'neutral',blink:null,capeLift:0,noSwing:1};
 const breath=Math.sin(t*2.0)*.004;s.left.y+=breath;s.right.y+=breath;
 if(hero){
  if(t<20){s.headPitch=phase==='repair'?.18:.04;s.emotion='neutral';s.left=V(-.13,1.18,.18);s.right=V(.18,1.16,.1);
   if(phase==='repair'){const press=pulse(t,14.2,15.5,16.2,18.5);s.bob=-.035*press;s.sit={drop:.56*press,feet:.26*press};s.left=blend(s.left,V(-.14,1.12,.22),press);s.headPitch=.22*press;}}
  if(t>=20&&t<51){s.headYaw=.2*ease((t-20)/1.1);s.emotion='determined';s.left=V(-.15,1.27,.20);}
  for(const h of [T.C1,T.C3,T.C5,T.C6]){
   const guard=pulse(t,h-1.8,h-.25,h+.15,h+1.3),recoil=pulse(t,h+.1,h+.3,h+.4,h+1.5);
   s.left=blend(s.left,V(-.11,1.37,.24),guard);s.bob-=.07*recoil;s.headRoll-=.1*recoil;s.headPitch-=.06*recoil;s.fist=Math.max(s.fist,guard);
   if(guard>.1)s.emotion='determined';
  }
  for(const h of [T.C2,T.C4]){
   const pain=pulse(t,h,h+.14,h+.6,h+1.8);s.left=blend(s.left,V(-.20,1.14,.09),pain);s.headPitch+=.15*pain;s.bob-=.11*pain;if(pain>.05)s.emotion='pain';
  }
  if(t>=T.C2+1&&t<T.CHARGE2&&!['probe','gate_strike'].includes(phase)){s.left=V(-.15,1.20,.16);s.headPitch=.10;s.emotion='worry';}
  // The probe deliberately lowers the guard before the higher cut forces it back up.
  if(phase==='probe'){const lower=pulse(t,78,79.1,79.5,80.7);s.left.y-=.17*lower;}
  if(t>=T.GATE_ATTACK&&t<T.C5-.3)travel(s,t,T.GATE_ATTACK,T.C5-.4,[-.95,.15],[-1.55,-.35],.95);
  if(t>=T.C5-.3&&t<132){s.rootX=-1.55;s.rootZ=-.35;s.bob=-.18;s.sit={drop:.12,feet:.12};s.left=V(-.15,1.17,.17);s.emotion='pain';s.headPitch=.18;}
  if(t>=132&&t<138){const u=ease((t-132)/1.2);s.rootX=-1.55;s.rootZ=-.35;s.bob=-.18*(1-u);s.sit={drop:.12*(1-u),feet:.12*(1-u)};s.emotion='determined';
   if(t>133.2)travel(s,t,133.2,137.8,[-1.55,-.35],[-.95,.15],.85);}
  if(t>=T.TRAP-.8&&t<T.RELEASE){
   const u=ease((t-(T.TRAP-.8))/.8);s.bob=-.035*u;s.sit={drop:.56*u,feet:.26*u};s.left=blend(V(-.11,1.37,.24),V(-.14,1.12,.22),u);s.right=V(.09,1.20,.21);s.headPitch=.08;s.emotion='determined';
   const strain=Math.sin(t*24)*.003;s.left.x+=strain;
  }
  if(t>=T.HERO_CHARGE&&t<T.C7+.8){const charge=ease((t-T.HERO_CHARGE)/4),release=ease((t-T.RELEASE)/.38);
   s.left=blend(V(-.14,1.12,.22),V(-.09,1.33,.27),release);s.right=V(.19,1.26,.16);s.bob=-.035*(1-release);s.sit={drop:.56*(1-release),feet:.26*(1-release)};
   s.headPitch=-.05*charge;s.emotion='determined';s.fist=1;
  }
  if(t>=T.C7+.8){s.left=V(-.18,1.14,.08);s.right=V(.16,1.19,.14);s.headPitch=.08;s.emotion='pain';s.fist=.15;
   s.left.x+=Math.sin(t*21)*.003;
   if(t>=T.RESTORE)s.emotion='neutral';}
 }else{
  if(t<T.ARRIVE){s.visible=false;}
  // Enter through the clear bay between the two columns, then plant and turn.
  if(t>=T.ARRIVE&&t<26)travel(s,t,T.ARRIVE,26,[5.5,1.85],[1.35,-.03],Math.atan2(-4.15,-1.88));
  if(t>=26&&t<27){const a=ease(t-26),fromYaw=Math.atan2(-4.15,-1.88);s.yaw=mix(fromYaw,-.85,a);s.turn={fromYaw,toYaw:-.85,a};}
  if(t>=27&&t<51){s.headYaw=-.15;s.right=V(.18,1.26,.14);}
  for(const h of [T.C1,T.C3,T.C5,T.C6]){
   const wind=pulse(t,h-2.1,h-.7,h-.5,h+.35),swing=pulse(t,h-.48,h,h+.1,h+.7);
   s.right=blend(s.right,V(.24,1.69,-.10),wind);s.right=blend(s.right,V(.12,1.42,.30),swing);
   s.left=blend(s.left,V(-.20,1.36,.14),wind);s.bob-=.065*wind;s.capeLift=.4*swing;s.emotion=wind>.1?'determined':s.emotion;
   const step=pulse(t,h-1.8,h-.5,h+.2,h+1.6);s.rootX-=.24*step;s.supportShift={x:(s.supportShift?.x??0)-.24*step,z:0};
  }
  for(const h of [T.C2,T.C4]){const whip=pulse(t,h-.6,h-.1,h+.1,h+.65);s.right=blend(s.right,V(.28,1.27,.24),whip);s.headPitch=-.04*whip;}
  if(t>=T.GATE_ATTACK&&t<T.C5-.3){travel(s,t,T.GATE_ATTACK,T.C5-.4,[1.35,-.03],[.50,-.55],-1.05);s.supportShift=null;}
  if(t>=T.C5-.3&&t<132){s.rootX=.50;s.rootZ=-.55;s.yaw=-1.05;s.supportShift=null;}
  if(t>=132&&t<138)travel(s,t,132,137.5,[.5,-.55],[1.35,-.03],-.85);
  if(t>=T.LOCK&&t<T.C7){const pull=pulse(t,T.LOCK,T.LOCK+.6,T.C7-.4,T.C7);s.right=V(.19,1.42,.22);s.left=V(.02,1.42,.25);
   s.headPitch=.12;s.bob=-.04;s.emotion='surprised';s.right.x+=Math.sin(t*9)*.014*pull;s.capeLift=.2;}
  if(t>=T.C7){const u=clamp((t-T.C7-.1)/1.5),fly=ease(u);s.rootX=mix(1.35,2.9,fly);s.rootZ=mix(-.03,-.45,fly);s.air=.45*Math.sin(u*Math.PI);s.tuck=.12*Math.sin(u*Math.PI);
   s.capeLift=.5*Math.sin(u*Math.PI);s.headPitch=.18;s.emotion='pain';s.left=V(-.19,1.29,.13);s.right=V(.18,1.30,.14);
   if(u>=1){s.sit={drop:.31,feet:.19};s.bob=-.08;}
  }
  if(t>=T.RETREAT){const up=ease((t-T.RETREAT)/.8);s.sit={drop:.31*(1-up),feet:.19*(1-up)};s.bob=-.08*(1-up);s.headPitch=.12*(1-up);s.air=0;s.tuck=0;
   const retreatYaw=Math.atan2(2.6,-1.4);
   if(t>=T.RETREAT+.8&&t<T.RETREAT+2){const a=ease((t-T.RETREAT-.8)/1.2);s.yaw=mix(-.85,retreatYaw,a);s.turn={fromYaw:-.85,toYaw:retreatYaw,a};}
   if(t>=T.RETREAT+2)travel(s,t,T.RETREAT+2,T.RETREAT+6.7,[2.9,-.45],[5.5,-1.85],retreatYaw);
   if(t>T.RETREAT+6.7)s.visible=false;
  }
 }
 return s;
}
export function poseAt(actors,entries,t){
 const entry=entries.findLast(e=>e.startTime<=t)??entries[0],phase=entry.opts.move,pt=heldTime(t),states={},poses={};
 for(const name of CAST){states[name]=state(name,pt,phase);poses[name]=buildPose(actors[name],states[name],pt,DIMS[name]);}
 return{entry,opts:entry.opts,phase,states,poses};
}
