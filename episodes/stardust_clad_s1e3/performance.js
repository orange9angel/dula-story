import * as THREE from 'three';
import {T,B} from './config/event_times.js';
const clamp=x=>Math.max(0,Math.min(1,x)),S=x=>{x=clamp(x);return x*x*(3-2*x);},L=(a,b,u)=>a+(b-a)*u;
const pulse=(t,a,b,c)=>S((t-a)/(b-a))*(1-S((t-b)/(c-b)));
const v=(a,b,u)=>a.map((x,i)=>L(x,b[i],u));
const eyeBlink=(t,list)=>Math.max(0,...list.map(a=>pulse(t,a,a+.07,a+.17)));
// Pose curves use an authored coordinate, retimed through compiled story beats
// and contact cues. Editing story timing moves picture and audio together.
const authoredBeats=[0,6,10,15,21,26,30,34,39,45,50,55,60,66,72,77,83,88,94,99,105,111,117,123,129];
const originalCues={entry_pull:17.4,step_one:26.9,step_two:28,step_three:28.7,snare:28.9,punch:40.45,bind_hit:40.65,crack:51.1,dust_release:60.8,disc_break:78.8,catch:80.1,haul_land:91.5,counter_step:99.65,counter_swing:100.2,thread_cut:100.48,enemy_land:101.9,final_step:131};
const clockAnchors=[...Object.values(B).map((actual,i)=>[actual,authoredBeats[i]]),...Object.entries(originalCues).map(([id,t])=>[T[id],t]),[T.duration,136]].sort((a,b)=>a[0]-b[0]);
function authoredClock(t){
 const i=Math.max(1,clockAnchors.findIndex(a=>a[0]>=t));
 if(t>=T.duration)return 136;
 const a=clockAnchors[i-1],b=clockAnchors[i];return L(a[1],b[1],clamp((t-a[0])/(b[0]-a[0])));
}
function basic(t,root,yaw){
 return {root,yaw,hip:.915,leftHand:[-.24,.95,.06],rightHand:[.24,.95,.06],leftFoot:[-.11,.075,0],rightFoot:[.11,.075,0],
 breath:Math.sin(t*2.0)*.65,face:{gaze:[.3,0],focus:.20,blink:eyeBlink(t,[8.2,13.1,22.4,30.8,36.2,48.4,57.1,66.2,72.3,84.2,96.1,110.3,118.8,127.4])}};
}
// Explicit three-step sequence. World support locations are held throughout each
// stance, including the settle; root and foot timings are sampled independently.
function approach(p,t,start=26){
 const u=S((t-start)/2.7),from=[-2,0,-.2],to=[-1.3,0,.5],yaw=Math.PI/4;
 p.root=v(from,to,u);p.yaw=yaw;
 const right=[Math.cos(yaw),0,-Math.sin(yaw)],forward=[Math.sin(yaw),0,Math.cos(yaw)];
 for(const [side,sign,delay]of[['left',-1,0],['right',1,.90]]){
  const swing=S((t-start-.20-delay)/.80),last=S((t-start-2.05)/.65);
  const a=from.map((n,i)=>n+right[i]*sign*.11),b=to.map((n,i)=>n+right[i]*sign*.11);
  const fraction=side==='left'?swing*.5+last*.5:swing;
  const foot=v(a,b,fraction);foot[1]=.075+.09*Math.sin(Math.PI*(side==='left'&&t>start+2?last:swing));
  const dx=foot[0]-p.root[0],dz=foot[2]-p.root[2];
  p[side+'Foot']=[dx*Math.cos(yaw)-dz*Math.sin(yaw),foot[1],dx*Math.sin(yaw)+dz*Math.cos(yaw)];
  p[side+'FootPitch']=Math.sin(Math.PI*swing)*.20;
 }
 // Keep enough reach while feet straddle the root; sway follows support.
 p.hip=.78+.135*S((t-start-2.25)/.55);
 p.sway=.015*Math.sin(u*Math.PI*2);p.twist=-.05*Math.sin(u*Math.PI*2);
 p.leftHand[2]+=.09*Math.sin(u*Math.PI*2);p.rightHand[2]-=.09*Math.sin(u*Math.PI*2);
}
// Finite world-space footholds for the forced approach and the last step.
// Each swing advances one foot; a stance foot never inherits root translation.
function travel(p,t,from,to,start,duration,yaw,size=1){
 const u=clamp((t-start)/duration),phase=u*4,rootU=S(u);
 p.root=v(from,to,rootU);p.yaw=yaw;
 const c=Math.cos(yaw),s=Math.sin(yaw);
 for(const [side,sgn,events]of[['left',-1,[[0,.4],[2,1]]],['right',1,[[1,.7],[3,1]]]]){
  let fraction=0,lift=0;
  for(const [at,target]of events){const q=S((phase-at-.10)/.80);if(phase>at){fraction=L(fraction,target,q);lift=.065*Math.sin(q*Math.PI);}}
  const world=v(from,to,fraction);world[0]+=c*sgn*.11*size;world[2]-=s*sgn*.11*size;
  const dx=world[0]-p.root[0],dz=world[2]-p.root[2];
  p[side+'Foot']=[(dx*c-dz*s)/size,.075+lift,(dx*s+dz*c)/size];
  p[side+'FootPitch']=0;
 }
 p.hip=.79+.125*S((u-.82)/.18);p.sway=.010*Math.sin(phase*Math.PI);
}
function worldHand(p,side,world,size=1){
 const dx=(world[0]-p.root[0])/size,dz=(world[2]-p.root[2])/size,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
 p[side+'Hand']=[dx*c-dz*s,(world[1]-p.root[1])/size,dx*s+dz*c];
}
export function performance(t){
 t=authoredClock(t);
 const h=basic(t,[-2,0,-.2],.78),e=basic(t,[1.1,0,0],-.75),w=basic(t,[-2.9,0,.30],.65);
 h.headYaw=.20;e.headYaw=-.18;
 e.face.gaze=[-.30,-.05];e.face.focus=.33;e.face.smile=.12;
 w.leftHand=[-.15,1.04,.25];w.rightHand=[.15,1.04,.25];w.face.fear=.12;
 e.leftHand=[-.22,1.05,.18];e.rightHand=[.24,1.16,.24];
 const entry=S((t-15)/3);e.root[1]=L(.42,0,entry);e.hip=.91-.08*pulse(t,17,18,19);
 e.face.blink=1-S((t-18.2)/.45);e.headPitch=.14*(1-S((t-18)/1.2));
 if(t>19)e.face.blink=eyeBlink(t,[24.7,36,47.3,56,67.5,86.2,96.3,108.1,120]);
 if(t>9&&t<15){h.rightHand=v([.24,.90,.06],[.29,1.16,.29],S((t-10)/.6));h.headPitch=.11;h.face.gaze=[.3,-.8];h.face.focus=.65;}
 if(t>=26){approach(h,t);h.face.gaze=[.6,-.3];}
 const snare=S((t-28.9)/.16);
 if(t>=28.9&&t<77){
  h.leftHand=[-.30,1.20,.28];h.leftFist=.7;h.twist=-.09;h.roll=.035;
  h.face.focus=.5;h.face.strain=.45*snare;h.face.fear=.20;
  e.rightFist=.4;
 }
 // Inhale / loaded rear leg / hip turn / shoulder follow / restrained recoil.
 const prep=pulse(t,39.2,40.0,40.45),strike=pulse(t,40.25,40.48,40.67),recoil=pulse(t,40.65,40.90,42.2);
 if(t>=39&&t<45){
  h.hip=.855-.06*prep-.08*recoil;h.twist=-.22*prep+.34*strike-.24*recoil;
  h.lean=-.10*prep+.20*strike-.24*recoil;h.roll=-.10*recoil;
  h.rightHand=v([.22,1.16,.03],[.12,1.28,.53],strike);
  h.rightHand[2]-=.09*prep;h.rightFist=1;h.leftFist=.95;
  h.face.focus=.9;h.face.strain=.95;h.face.blink=recoil*.7;h.face.gaze=[.1,0];
 }
 if(t>=45&&t<55){h.lean=-.08;h.headPitch=.13;h.face.strain=.8;}
 const fall=S((t-51.1)/1.05);
 if(t>=50&&t<91.5){
  w.root=[-1.72,-.62*fall, .71+.22*fall];w.yaw=.1;w.hip=.69;
  w.hip+=.04*S((t-79.7)/.4);
  w.leftHand=[-.20,1.30,.14];w.rightHand=[.13,1.02,.24];w.lean=.18;w.face.fear=.9;w.headPitch=-.13;
  w.leftFoot=[-.13,.075,.10];w.rightFoot=[.15,.075,-.12];
 }
 if(t>=50&&t<57){e.rightFist=S((t-50.2)/.4);e.face.focus=.6;e.face.fear=.25;}
 if(t>=55&&t<66){
  h.face.strain=.3;h.face.focus=.55;h.headPitch=.14;h.face.gaze=[-.5,-.65];h.leftFist=.10;
  h.leftPalm=.85;h.leftHand=[-.22,1.22,.30];h.headYaw=-.10;
  if(t>=60.8)h.face.gaze=[L(-.5,.8,S((t-61)/1)),L(-.6,.1,S((t-62)/1))];
 }
 if(t>=66&&t<77){
  h.headYaw=-.30;h.headPitch=.12;h.face.gaze=[-.75,-.5];h.face.fear=.55;
  h.face.focus=L(.25,.7,S((t-72)/1));h.face.blink=eyeBlink(t,[70.2,72.3]);
  h.rightHand=v([.24,.9,.06],[.26,1.08,.36],S((t-74)/1));h.rightOpen=1;
 }
 const brace=S((t-77)/2.6),haul=S((t-88)/3.5);
 if(t>=77&&t<99){
  h.root=v([-1.30,0,.5],[-1.20,0,.25],haul);h.yaw=-.25;
  h.hip=.70+.13*haul;h.lean=.26-.21*haul;h.twist=-.13;h.roll=-.10;
  h.leftFoot=[-.19,.075,-.20];h.rightFoot=[.18,.075,.22];
  h.leftHand=[-.35,1.04,.20];h.rightHand=[.25,.91,.36];
  h.leftFist=1;h.rightFist=.65;h.face.focus=.8;h.face.strain=.9-.3*haul;h.headPitch=.10;
  h.broken=t>=78.8;h.discRoll=-.4;
  if(t<80.1){h.hip=L(.855,.70,brace);h.lean=.26*brace;}
  if(t>=80.1&&t<91.5){
   w.root=v([-1.72,-.62,.93],[-1.72,0,-.32],haul);w.hip=L(.73,.91,haul);
   // Shared wrist rendezvous; both local targets derive from one world point.
   const catchPoint=v([-1.57,.88,.85],[-1.50,1.20,.05],haul);
   worldHand(h,'right',catchPoint);worldHand(w,'left',[catchPoint[0],catchPoint[1]-.055,catchPoint[2]],.91);
   w.leftFist=.5;w.face.fear=.70*(1-haul);
  }
  const pulled=S((t-90.8)/5.8);
  if(t>=90.8)travel(e,t,[1.1,0,0],[-.15,0,0],90.8,5.8,-.75);
  e.lean=.13*pulled;e.face.fear=.2+.45*pulled;e.face.smile=0;
 }
 if(t>=91.5){
  w.root=[-1.72,0,-.32];w.hip=.91;w.face.fear=.12;w.yaw=.5;
  w.leftHand=[-.15,1.04,.25];w.rightHand=[.15,1.04,.25];
 }
 const counter=pulse(t,100.0,100.48,100.70);
 if(t>=99&&t<105){
  travel(h,t,[-1.20,0,.25],[-.70,0,.33],99,.95,.9);
  h.broken=true;
  h.twist=-.20+.57*counter;h.lean=.06+.16*counter;
  h.leftHand=v([-.28,1.04,.21],[-.02,1.30,.51],counter);
  h.rightHand=[.29,1.10,.05];h.leftFist=1;h.rightFist=.8;h.face.focus=.95;h.face.strain=.7;
  e.root=[-.15,0,0];e.hip=.81;e.face.fear=.75;e.rightFist=.2;
 }
 if(t>=100.48){
  const recoil=pulse(t,100.48,100.70,101.8),retreat=S((t-100.5)/1.4);
  e.root=[L(-.15,.65,retreat),.15*Math.sin(retreat*Math.PI),0];
  e.hip=.83-.18*pulse(t,101.2,101.65,103);e.lean=-.35*recoil+.2*pulse(t,101.5,102,104);
  e.twist=.22*recoil;e.headPitch=.25*recoil;e.face.blink=.7*recoil;e.face.fear=.7;e.face.smile=0;
  e.rightHand=[.25,.93,.20];e.leftHand=[-.24,1.01,.24];e.rightFist=0;
 }
 if(t>=105){
  h.root=[-.70,0,.33];h.yaw=.55;h.hip=.915;h.broken=true;h.leftHand=[-.25,.95,.14];
  h.face.focus=.3;h.face.fear=.12;h.face.strain=.4;h.headPitch=.10;h.face.gaze=[-.4,-.3];
  h.leftHand[0]+=Math.sin(t*30)*.0025;h.leftHand[1]+=Math.sin(t*27)*.002;
  if(t>116){h.headYaw=-.15;h.face.smile=.2;h.face.gaze=[-.6,.1];}
 }
 if(t>=129){
  // Ending repeats the first step's intent with no counting pause.
  if(t>=130)travel(h,t,[-.70,0,.33],[-.25,0,.60],130,2.8,.55);
  h.headPitch=0;h.face.gaze=[.5,0];
  travel(w,t,[-1.72,0,-.32],[-.35,0,-.32],129,4.3,Math.PI/2,.91);
 }
 h.face.hairYaw=-(h.twist??0)*.24;h.face.hairPitch=(h.lean??0)*.12;
 e.face.hairYaw=-(e.twist??0)*.25;e.face.hairPitch=(e.lean??0)*.10;
 for(const p of [h,e,w])p.face.windTime=t;
 return {xiaozao:h,jianwang:e,weihe:w,swing:Math.max(strike,counter),t};
}
export function cameraAt(t,s){
 t=authoredClock(t);
 let pos=[-1.2,2.4,5.8],look=[-.5,1.1,0],fov=35;
 const hero=s.xiaozao.root,enemy=s.jianwang.root,girl=s.weihe.root;
 const close=(r,dx=.40,dy=1.56,dz=1.50)=>{pos=[r[0]+dx,r[1]+dy,r[2]+dz];look=[r[0],r[1]+1.52,r[2]];fov=30;};
 if(t<6){pos=[-3.2+S(t/6)*.3,3.2,7.6];look=[-.5,.6,0];fov=43;}
 else if(t<10)close(girl,.35,1.38,1.6);
 else if(t<15)close(hero,.65,1.55,1.5);
 else if(t<18){pos=[1.6,.65,3.8];look=[1.1,1.05,0];fov=34;}
 else if(t<26)close(enemy,-.5,1.70,1.7);
 else if(t<30){pos=[-.9,1.3,4.0];look=[-1.6,.9,.2];fov=37;}
 else if(t<34)close(hero,.55,1.52,1.50);
 else if(t<39)close(enemy,-.48,1.70,1.65);
 else if(t<40.1){pos=[hero[0]+.65,1.05,hero[2]+2.0];look=[hero[0],1.13,hero[2]];fov=35;}
 else if(t<45){pos=[-.9,1.45,3.8];look=[-.65,1.0,.2];fov=37;}
 else if(t<50)close(hero,.55,1.56,1.55);
 else if(t<55){pos=[-1.9,1.45,4];look=[-1.55,.70,.2];fov=37;}
 else if(t<60){pos=[-3.2,1.5,4.2];look=[-1.8,-2.4,.7];fov=36;}
 else if(t<63){pos=[-1.0,1.6,2.5];look=[-.60,1.14,.15];fov=34;}
 else if(t<66)close(hero,.4,1.57,1.45);
 else if(t<70){pos=[girl[0]+.25,girl[1]+1.65,girl[2]+1.35];look=[girl[0],girl[1]+1.23,girl[2]];fov=25;}
 else if(t<77)close(hero,.40,1.55,1.5);
 else if(t<80){pos=[-1.30,1.22,2.5];look=[-1.4,.95,.65];fov=34;}
 else if(t<83){pos=[-2.5,1.50,3.5];look=[-1.5,.7,.5];fov=35;}
 else if(t<88){pos=[hero[0]+.50,1.45,hero[2]+2.0];look=[hero[0],1.18,hero[2]+.15];fov=32;}
 else if(t<94){pos=[-2.7,1.6,4.0];look=[-1.40,.85,.35];fov=35;}
 else if(t<99){pos=[.9,1.4,3];look=[-.65,1.10,.30];fov=35;}
 else if(t<105){pos=[-1.4,1.35,3.6];look=[-.3,.95,.2];fov=35;}
 else if(t<111)close(enemy,-.6,1.60,2.1);
 else if(t<117)close(girl,.4,1.38,1.7);
 else if(t<123)close(hero,.5,1.57,1.60);
 else if(t<129)close(girl,.4,1.38,1.6);
 else {pos=[-2.7,2.4,6];look=[-.3,1,.1];fov=39;}
 return {pos,look,fov};
}
