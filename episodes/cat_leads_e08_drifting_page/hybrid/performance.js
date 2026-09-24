import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';
import {smooth,mix,clamp,mouthAt} from './timeline.js';
import {arrivalWalk} from './arrival-walk.js';
export const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const lerp=(a,b,u)=>a.clone().lerp(b,u);
const envelope=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const path=(n,fn)=>Array.from({length:n},(_,i)=>fn(i/(n-1)));
const strokes=[
  path(22,u=>[mix(-.40,.40,u),-.055+.012*Math.sin(u*5)]),
  path(22,u=>[mix(-.40,.39,u),.23-.04*Math.sin(u*Math.PI)]),
  path(12,u=>[-.235-.015*Math.sin(u*3),mix(-.045,-.31,u)]),
  path(18,u=>[mix(-.38,-.04,u),-.28-.095*Math.sin(u*Math.PI)]),
  ...[-.34,-.28,-.22,-.16,-.09].map((x,i)=>path(12,u=>[x+.012*Math.sin(u*3),mix(-.285,.04-i*.015,u)])),
  path(24,u=>[.205+.051*Math.cos(u*Math.PI*2),-.285+.067*Math.sin(u*Math.PI*2)]),
  path(10,u=>[mix(-.31,-.02,u),.09+.008*Math.sin(u*3)]),
  path(10,u=>[mix(.08,.34,u),.13+.008*Math.sin(u*3)]),
  path(16,u=>[mix(-.36,.27,u),.335-.015*u])
];
export const SKETCH=[],SKETCH_BREAKS=new Set();
for(const stroke of strokes){if(SKETCH.length)SKETCH_BREAKS.add(SKETCH.length);SKETCH.push(...stroke);}
export function sketchAt(t,plan){
  const progress=t<plan.beats.draw?1:clamp((t-plan.beats.draw)/3.95);
  const value=t<plan.beats.draw?SKETCH.length-15+12*(.5+.5*Math.sin(t*1.1)):progress*(SKETCH.length-1),i=Math.min(SKETCH.length-2,Math.floor(value));
  return {progress,x:mix(SKETCH[i][0],SKETCH[i+1][0],value-i),y:mix(SKETCH[i][1],SKETCH[i+1][1],value-i),lift:SKETCH_BREAKS.has(i+1)?.022*Math.sin((value-i)*Math.PI):0};
}
export function bookLocal(p){return {position:V(-.11*(p.bookShift??0),p.hipY+.290,.38-.065*(p.bookShift??0)),quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2+.16,0,0))};}
export function penLocal(p,t,plan){
  const b=bookLocal(p),s=sketchAt(t,plan),tip=V(s.x*.40,-s.y*.29,.009+s.lift).applyQuaternion(b.quaternion).add(b.position);
  const grip=tip.clone().add(V(.015,.095,-.025)),direction=V(0,-.85,.5).normalize();
  return {tip,grip,wrist:grip.clone().addScaledVector(direction,-.065),direction};
}
function solve(start,target,pole,a,b){
  const d=target.clone().sub(start),max=a+b-.002;if(d.length()>max)target=start.clone().add(d.setLength(max));
  return [start,twoBone(start,target,pole,a,b),target];
}
export function sampleKid(kind,t,plan,wind){
  const B=plan.beats,girl=kind==='Girl';
  let rootX=girl?-.68:.52,rootZ=girl?.46:.18,yaw=girl?.88:-.58,hipY=girl?.6925:.45;
  const p={t,rootX,rootZ,yaw,hipY,bob:hipY-.6925,point:0,anticipation:0,headYaw:0,headPitch:0,headRoll:0,
    mouth:mouthAt(plan,kind,t),emotion:'calm',windWorld:wind,leftContact:true,rightContact:true,armLengths:girl?[.19,.18]:[.275,.26],legLengths:girl?[.305,.295]:[.36,.35]};
  let feet=[V(-.086,.095,girl?0:.49),V(.086,.095,girl?0:.49)];
  const alarm=envelope(t,B.alarm-.35,B.alarm+.3,B.stop-.3,B.calm+.1);
  const reach=envelope(t,B.offer-.25,B.offer+1.5,B.accept-.1,B.accept+.7);
  const hold=smooth((t-(B.accept-.55))/.7);
  const drawing=t<B.lift||t>=B.draw&&t<B.offer;
  p.bookShift=smooth((t-B.offer)/.45)*(1-smooth((t-(B.accept-.1))/.6));
  p.bodyTilt=girl?0:.075;
  p.bodyRoll=girl?0:.045;
  if(girl&&t<B.arrived)feet=arrivalWalk(p,t,B);
  const speaking=girl?0:Math.max(0,...plan.entries.filter(e=>e.character==='Boy').map(e=>smooth((t-e.start+.2)/.4)*(1-smooth((t-e.end)/.3))));
  p.emotion=girl?(t<B.gust?'curious':alarm>.15?'alarmed':t>=B.regret&&t<B.reassure?'regret':t>=B.accept?'happy':'gentle'):'gentle';
  p.blink=Math.max(0,1-Math.abs(((t+(girl?.2:1.35))%4.3)-3.6)/.11);
  p.headYaw=girl?.30-alarm*.45:mix(drawing?0:-.35,-.35,speaking);
  p.headPitch=girl?(.055+alarm*-.12):mix(drawing?.10:-.11,-.12,speaking);
  p.headRoll=girl?-.018-.028*Math.sin(t*.6):-.07;
  let wrists=[V(-.23,1.075+p.bob-.348,.05),V(.23,1.075+p.bob-.348,.05)];
  if(girl){
    wrists[1]=lerp(wrists[1],V(.28,1.08,.17),alarm);p.rightGesture={open:alarm};p.rightRoll=-.6*alarm;
    wrists[0]=lerp(wrists[0],V(-.14,.99,.27),hold);wrists[1]=lerp(wrists[1],V(.14,.99,.27),hold);
    p.leftGesture={fist:.23*hold};p.rightGesture={fist:.23*hold,open:alarm*(1-hold)};
    p.leftRoll=mix(.35,-1.3,hold);p.rightRoll=mix(-.35,1.3,hold);
    if(reach>0&&!hold){wrists[1]=lerp(wrists[1],V(.33,.98,.13),reach);p.rightGesture={open:.6};}
  }else{
    const book=bookLocal(p),bookHand=V(0,-.75,.55).normalize();
    for(const [i,side,sign] of [[0,'left',-1],[1,'right',1]]){
      const grip=V(sign*.218,-.025,.026).applyQuaternion(book.quaternion).add(book.position);
      wrists[i]=grip.addScaledVector(bookHand,-.065);p[side+'HandDirection']=bookHand.clone();p[side+'Gesture']={fist:.20};p[side+'Roll']=0;
    }
    const stop=envelope(t,B.stop-.25,B.stop+.65,B.calm+1,B.drift-.1);
    wrists[0]=lerp(wrists[0],V(-.34,.98,.08),stop);p.leftGesture={open:stop,fist:.20*(1-stop)};p.leftRoll=-1.1*stop;
    p.leftHandDirection=lerp(bookHand,V(-.2,1,0),stop).normalize();
    if(drawing){
      const pen=penLocal(p,t,plan);wrists[1]=pen.wrist;p.rightHandDirection=pen.direction;p.rightGesture={fist:.58};p.rightRoll=.0;
    }
    wrists[0]=lerp(wrists[0],V(-.36,.78,.10),reach);p.leftGesture={fist:.18*reach,open:stop};
  }
  for(const [i,side,sign] of [[0,'left',-1],[1,'right',1]]){
    const hip=V(sign*.075,p.hipY),shoulder=V(sign*(girl?.175:.2065),(girl?1.075:1.16875)-.70).applyEuler(new THREE.Euler(p.bodyTilt,0,p.bodyRoll)).add(V(0,.70+p.bob,0));
    if(girl&&t<B.arrived){wrists[i]=V(sign*.228,shoulder.y-.345,.045+sign*p.stride*.28);}
    p[side+'Leg']=solve(hip,feet[i],V(0,0,1),...p.legLengths);
    p[side+'Arm']=solve(shoulder,wrists[i],V(sign*.25,-.7,-.7),...p.armLengths);
  }
  return p;
}
export function worldPoint(p,point){return point.clone().applyAxisAngle(V(0,1,0),p.yaw).add(V(p.rootX,0,p.rootZ));}
export function loosePageAt(t,plan,boy){
  const B=plan.beats,b=bookLocal(boy),start=worldPoint(boy,b.position.clone().add(V(0,.012,0)));
  if(t<B.lift)return {position:start,quaternion:new THREE.Quaternion().setFromAxisAngle(V(0,1,0),boy.yaw).multiply(b.quaternion),air:0};
  const u=clamp((t-B.lift)/(B.drift-B.lift)),air=Math.sin(Math.PI*u);
  let position;
  if(t<B.drift){position=lerp(start,V(1.25,.024,-2.6),smooth(u));position.y+=1.40*air;position.x+=smooth(u/.10)*(1-smooth((u-.40)/.60));}
  else position=V(1.25+.09*(t-B.drift),.025+.006*Math.sin(t*2),-2.6-.035*(t-B.drift));
  const rotation=new THREE.Euler(-Math.PI/2+air*(.38+.23*Math.sin(t*4)),air*.24*Math.sin(t*3),-.32+.09*Math.sin(t*1.6));
  return {position,quaternion:new THREE.Quaternion().setFromEuler(rotation),air};
}
