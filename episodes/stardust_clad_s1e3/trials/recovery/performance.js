import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {WIND_DIMS} from 'dula-assets/characters/stardust/wind-palace-craft.js';
import {T,B} from './timing.js';
const V=(x,y,z)=>({x,y,z}),vec=p=>new THREE.Vector3(p.x,p.y,p.z);
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},mix=THREE.MathUtils.lerp;
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
export function stateAt(name,t){
 const hero=name==='xiaozao',d=WIND_DIMS[name],h=d.shoulderY;
 const s={rootX:hero?-.56:.62,rootZ:hero?.12:-.12,yaw:hero?.97:-1.03,
  drop:hero?.025:.04,lean:0,twist:0,headYaw:0,headPitch:.02,headRoll:0,
  left:V(-.16,h-.23,.20),right:V(.18,h-.24,.15),
  fist:.45,open:0,point:0,focus:.45,fear:0,emotion:'determined',step:0,retreat:0};
 const wind=pulse(t,B.attack-.2,T.block-.3,T.block-.22,T.block+.20);
 const hit=pulse(t,T.block,T.block+.11,T.block+.22,T.block+.95);
 const bind=pulse(t,T.bind,T.bind+.25,B.yield,B.yield+.65);
 const pull=ease((t-T.pull)/.32)*(1-ease((t-T.cut_hit)/.7));
 const cut=pulse(t,T.cut_hit-.50,T.cut_hit,T.cut_hit+.06,T.cut_hit+.55);
 if(hero){
  s.left=blend(s.left,V(-.10,h+.01,.29),pulse(t,B.attack-.2,T.block-.1,T.bind+.4,B.read+.6));
  s.drop+=.085*hit+.055*bind;s.lean=-.12*hit-.07*bind;s.rootX-=.045*hit;
  s.headPitch=-.10*hit+.10*bind;s.headRoll=.11*hit;s.fear=.32*hit;s.focus=.62;
  if(t>=B.read&&t<B.yield){
   const u=ease((t-B.read)/.7),look=ease((t-B.read-.8)/.7);
   s.headPitch=.18*(1-look);s.headYaw=-.16*(1-look);s.fear=.15*(1-u);s.focus=.55+.35*look;
   s.left=V(-.18,h-.18,.24);s.right=V(.12,h-.25,.22);
  }
  s.step=ease((t-B.yield)/.85);
  s.rootX+=.12*s.step;s.rootZ-=.025*s.step;
  const offer=pulse(t,B.yield,B.yield+.9,T.lock,T.pull+.2);
  s.left=blend(s.left,V(-.09,h-.17,.32),offer);s.twist=-.12*offer;
  s.left=blend(s.left,V(-.20,h-.30,.16),pull);s.right=blend(s.right,V(.10,h-.18,.27),pull);
  s.drop+=.07*pull;s.rootX-=.08*pull;s.twist+=.30*pull;s.lean=.035*pull;
  const contest=pulse(t,T.pull+.8,T.pull+1.05,T.pull+1.2,T.pull+1.5)+pulse(t,T.pull+2.0,T.pull+2.2,T.pull+2.4,T.pull+2.7);
  s.left.z+=.045*contest;s.rootX+=.025*contest;s.drop+=.025*contest;s.headPitch+=.045*contest;
  const prepare=pulse(t,T.cut_hit-.9,T.cut_hit-.36,T.cut_hit-.28,T.cut_hit+.15);
  s.left=blend(s.left,V(-.24,h-.22,.08),prepare);
  s.left=blend(s.left,V(.04,h-.05,.29),cut);
  s.twist-=.55*cut;s.rootX+=.045*cut;s.drop-=.045*cut;s.headPitch=-.04*cut;
  s.right=blend(s.right,V(.16,h-.18,.16),cut);
  if(t>B.aftermath){
   s.left=V(-.12,h-.20,.17);s.right=V(-.04,h-.21,.20);
   s.focus=.45;s.headPitch=.12*(1-ease((t-B.aftermath)/1.6));
   s.left.x+=Math.sin(t*19)*.002;
  }
 }else{
  s.right=blend(s.right,V(.21,h+.12,.02),wind);s.left=blend(s.left,V(-.16,h-.12,.20),wind);
  s.drop+=.07*wind;s.twist=.24*wind;s.headPitch=-.02*wind;
  const strike=pulse(t,T.block-.28,T.block,T.block+.10,T.block+.7);
  s.right=blend(s.right,V(.10,h-.09,.31),strike);s.twist-=.40*strike;s.rootX-=.05*strike;
  const tension=ease((t-T.bind)/.4)*(1-ease((t-T.pull)/.4));
  s.right=blend(s.right,V(.20,h-.29,.12),tension);
  s.right=blend(s.right,V(.07,h-.16,.34),pull);
  s.rootX-=.11*pull;s.lean=.11*pull;s.drop+=.06*pull;s.twist=-.10*pull;
  // React during the spoken line: hand checks the loaded wrist, then attacks
  // the trapped line. The adversary is never waiting idle for the counter.
  const free=pulse(t,T.pull+.45,T.pull+.90,T.cut_hit-.10,T.cut_hit+.30);
  s.left=blend(s.left,V(.01,h-.19,.28),free);s.headPitch=.12*free;s.fear=.25*free;
  const contest=pulse(t,T.pull+.8,T.pull+1.05,T.pull+1.2,T.pull+1.5)+pulse(t,T.pull+2.0,T.pull+2.2,T.pull+2.4,T.pull+2.7);
  s.left.z-=.07*contest;s.right.z-=.04*contest;s.twist+=.10*contest;s.rootX+=.035*contest;
  s.focus=.65;s.open=.5*free;
  const recoil=pulse(t,T.cut_hit,T.cut_hit+.14,T.cut_hit+.3,T.cut_hit+1);
  s.right=blend(s.right,V(.20,h-.12,.03),recoil);s.lean=-.10*recoil;s.drop+=.08*recoil;
  s.headPitch=-.11*recoil;s.fear=.5*recoil;s.twist=.16*recoil;
  s.retreat=ease((t-T.cut_hit-.10)/.50);s.rootX+=.19*s.retreat;s.rootZ-=.05*s.retreat;
  if(t>B.aftermath){s.headPitch=.12*(1-ease((t-B.aftermath-.5)/1.1));s.headYaw=.10*(1-ease((t-B.aftermath-.5)/1.1));s.fear=.14;s.focus=.9;}
 }
 s.blink=Math.max(0,1-Math.abs((t+(hero?0:1.1))%4.7-4.3)/.09);
 if(hero&&t>T.block&&t<T.block+.16)s.blink=Math.max(s.blink,.8);
 return s;
}
function pose(actor,s,t,name){
 const d=WIND_DIMS[name],hero=name==='xiaozao',baseX=hero?-.56:.62,baseZ=hero?.12:-.12;
 const feet={};let hipY=d.footY+d.legA+d.legB-.015-s.drop;
 for(const [side,sign] of [['left',-1],['right',1]]){
  // Authored finite step; both start and destination are on the same stone slab.
  const front=side==='left',advance=hero?(front?s.step*.20:0):(!front?s.retreat*.24:0);
  const f=new THREE.Vector3(sign*.12,d.footY,front?.16:-.17).applyAxisAngle(new THREE.Vector3(0,1,0),s.yaw);
  f.x+=baseX+(hero?advance:advance);f.z+=baseZ-(hero?advance*.15:advance*.20);
  const phase=hero?s.step:s.retreat;
  if((hero&&front)||(!hero&&!front))f.y+=.045*Math.sin(Math.PI*phase);
  f.sub(new THREE.Vector3(s.rootX,0,s.rootZ)).applyAxisAngle(new THREE.Vector3(0,1,0),-s.yaw);
  feet[side]=V(f.x,f.y,f.z);
  hipY=Math.min(hipY,f.y+Math.sqrt(Math.max(.1,(d.legA+d.legB-.004)**2-(f.x-sign*d.hipHalf)**2-f.z*f.z)));
 }
 const bob=hipY-d.hipIdle,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(s.lean,s.twist,0,'YXZ'));
 const pivot=new THREE.Vector3(0,d.hipIdle+bob,0);
 const transform=p=>vec(p).sub(pivot).applyQuaternion(q).add(pivot);
 const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob,lean:0,headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
  fist:s.fist,open:s.open,point:s.point,capeLift:0,blink:s.blink,pelvisOffset:V(0,0,0)};
 let maxClamp=0;
 for(const [side,sign] of [['left',-1],['right',1]]){
  const a=V(sign*d.hipHalf,hipY,0),b=feet[side];
  p[side+'Leg']=[a,twoBone(a,b,V(sign*.08,0,1),d.legA,d.legB),b];
  const shoulder=transform(V(sign*d.shoulderHalf,d.shoulderY+bob,0)),target=transform(V(s[side].x,s[side].y+bob,s[side].z));
  const delta=target.clone().sub(shoulder),max=d.armA+d.armB-.003;
  maxClamp=Math.max(maxClamp,Math.max(0,delta.length()-max));
  if(delta.length()>max)target.copy(shoulder).add(delta.setLength(max));
  p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.30,-.65,-.35),d.armA,d.armB),target];
 }
 const originalPivot=new THREE.Vector3(0,d.hipIdle,0);
 p.torsoQuaternion=q;p.torsoPosition=pivot.clone().sub(originalPivot.applyQuaternion(q));
 actor.setCladState(1);actor.setPose(p);
 actor.mesh.updateMatrixWorld(true);
 return {p,maxClamp,feet:Object.fromEntries(['left','right'].map(side=>[side,actor.feet[side].getWorldPosition(new THREE.Vector3()).toArray()]))};
}
export function perform(actors,t){
 const states={},traces={};
 for(const [name,a] of Object.entries(actors)){const s=states[name]=stateAt(name,t);traces[name]=pose(a,s,t,name);}
 return {states,traces};
}
