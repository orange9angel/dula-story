import * as THREE from 'three';
import {T} from './config/event_times.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const CAST=['aoao','xiaozao','dafu','yekari'];
const eye=(actor)=>actor.headGroup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.065,0));

export function directCamera(t,states,actors,active,fallback){
  const close=(name,dist=1.8,fov=30)=>{
    const p=eye(actors[name]),yaw=states[name].yaw+states[name].headYaw*.45;
    return{pos:[p.x+Math.sin(yaw+.12)*dist,p.y+.03,p.z+Math.cos(yaw+.12)*dist],
      look:[p.x,p.y-.10,p.z],fov};
  };
  if(t>=T.MONO&&t<T.STIR){
    if(active?.acting.camera==='speech'&&actors[active.speaker])return close(active.speaker,1.55,29);
    return{pos:[.5,1.25,-5.3],look:[.67,1.12,-2.05],fov:35};
  }
  if(t>=118&&t<124)return close('yekari',2.3,35);
  if(t>=152.65&&t<153.75)return{pos:[.4,1.42,2.08],look:[-.95,1.0,2.80],fov:38};
  if(t>=150.9&&t<154.7)return{pos:[-3.9,1.22,4.15],look:[-.65,1.1,3.2],fov:34};
  if(t>=162&&t<163)return{pos:[-2.35,1.25,3.5],look:[-1.08,.035,3.08],fov:27};
  if(t>=224&&t<229)return{pos:[2.9,1.22,1.4],look:[3.35,.9,-.6],fov:34};
  if(t>=243.8&&t<246)return close('aoao',1.9,31);
  if(t>=246&&t<250)return close('xiaozao',1.6,28);
  if(t>=T.RAIN_RELEASE&&t<264)return{pos:[2.0,3.6,7.6],look:[-.9,1.0,3.4],fov:48};
  if(t>=264&&t<266)return{pos:[2.45,.70,5.8],look:[.3,.55,4.2],fov:34};
  if(t>=269&&t<T.C4-1.7)return close('dafu',1.75,31);
  if(t>=T.C4-1.7&&t<T.C4+.65)return{pos:[-3.45,1.20,6.65],look:[-.8,1.48,4.35],fov:44};
  if(t>=T.MARK&&t<T.MARK+1.5&&actors.yekari.weaponMark){
    const p=actors.yekari.weaponMark.getWorldPosition(new THREE.Vector3());
    return{pos:[p.x-.7,p.y+.4,p.z+.9],look:p.toArray(),fov:24};
  }
  if(t>=329&&t<337)return{pos:[-.25,1.28,4.0],look:[-.15,1.22,2.88],fov:28};
  if(active?.acting.camera==='speech'&&actors[active.speaker]&&t>=140)return close(active.speaker,1.9,31);
  if(t>=284&&t<298)return{pos:[-3.8,1.55,6.3],look:[-.6,1.15,3.7],fov:41};
  if(t>=298&&t<342)return{pos:[.05,1.65,6.2],look:[0,1.2,2.9],fov:40};
  if(t>=342&&t<374)return{pos:[-2.5,1.9,-.15],look:[-.1,1.25,2.7],fov:41};
  if(t>=374&&t<392)return{pos:[.1,1.65,6.1],look:[0,1.3,2.7],fov:37};
  if(t>=392&&t<408)return{pos:[-3.8,1.7,12.3],look:[.1,1.2,6.8],fov:44};
  if(t>=408){
    if(t>=423&&t<427)return close('aoao',2,32);
    const u=ease((t-408)/23);
    return{pos:[3.8-1.3*u,2.3+.5*u,9.7-.9*u],look:[0,2.1,-3.4],fov:48};
  }
  return fallback;
}

export function directFaces(t,states,actors,dialogue,active){
  const current=dialogue.lines.findLast(l=>l.t<=t),previous=current?dialogue.lines[dialogue.lines.indexOf(current)-1]:null;
  const attention=(name,line)=>{
    let target;
    if(t<100)target=name==='aoao'?'xiaozao':'aoao';
    else if(t<284)target=name==='yekari'?(line&&actors[line.speaker]?line.speaker:'aoao'):'yekari';
    else if(t<307)target=name==='xiaozao'?'ground':name==='yekari'?'aoao':'yekari';
    else if(t<342)target=name==='aoao'?'xiaozao':'aoao';
    else if(t<374)target='radio';
    else if(t<392)target=name==='aoao'?'xiaozao':'aoao';
    else target=t<408?'road':'gate';
    if(line?.speaker===name&&t<line.t+6)target=line.acting.gaze;
    if(target==='enemy')target='yekari';
    if(target===name)target=name==='yekari'?'aoao':'yekari';
    if(target==='shield')return actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());
    if(target==='strap')return new THREE.Vector3(states.yekari.rootX,1.45,states.yekari.rootZ+.06);
    if(target==='ground')return new THREE.Vector3(states[name].rootX,.05,states[name].rootZ+Math.cos(states[name].yaw)*.7);
    if(target==='radio')return new THREE.Vector3(0,1.55,-2.5);
    if(target==='road')return new THREE.Vector3(0,2,20);
    if(target==='gate')return new THREE.Vector3(0,2.8,-5.2);
    return actors[target]?eye(actors[target]):new THREE.Vector3(0,1.5,0);
  };
  for(const name of CAST){
    const actor=actors[name],s=states[name];if(!actor.mesh.visible)continue;
    const a=attention(name,previous),b=attention(name,current),u=current?ease((t-current.t-.08)/.55):1;
    const target=a.lerp(b,u),origin=eye(actor);
    const yaw=wrap(Math.atan2(target.x-origin.x,target.z-origin.z)-s.yaw);
    const pitch=-Math.atan2(target.y-origin.y,Math.hypot(target.x-origin.x,target.z-origin.z));
    actor.headGroup.rotation.y=Math.max(-.72,Math.min(.72,yaw*.76));
    actor.headGroup.rotation.x=Math.max(-.20,Math.min(.30,pitch*.55));
    const emot=active?.speaker===name?active.acting.emotion:s.emotion;
    const fear=emot==='pain'?.25:emot==='worry'?.40:emot==='scared'?.80:emot==='surprised'?.68:0;
    const focus=emot==='determined'?.85:emot==='pain'?.54:emot==='neutral'?.18:0;
    const smile=emot==='happy'?.19:0;
    const blink=Math.max(0,1-Math.abs(((t+CAST.indexOf(name)*.83)%4.1)-3.9)/.115);
    actor.face.setEmotion(emot??'neutral',blink);
    actor.face.setActing({fear,focus,smile,browAsym:emot==='pain'?.6:.10,pupil:emot==='surprised'?.8:1});
    actor.face.lookAtWorld(target);
  }
}

export function drawRoute(ctx,W,H,t){
  if(t<352||t>360)return;
  const fade=ease((t-352)/.8)*(1-ease((t-359)/1));
  ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='rgba(9,16,28,.80)';ctx.fillRect(W*.10,H*.13,W*.80,H*.20);
  ctx.strokeStyle='rgba(151,181,208,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.16,H*.23);ctx.lineTo(W*.84,H*.23);ctx.stroke();
  for(let i=0;i<12;i++){
    const x=W*(.16+i*.68/11);ctx.beginPath();ctx.arc(x,H*.23,i===0?7:4.5,0,Math.PI*2);
    ctx.fillStyle=i===0?'#b8e9ff':'#ac9c83';ctx.shadowColor=i===0?'#85ceff':'transparent';ctx.shadowBlur=12;ctx.fill();
  }
  ctx.shadowBlur=0;ctx.fillStyle='#dce8ed';ctx.font='22px Microsoft YaHei';ctx.textAlign='center';
  ctx.fillText('焰阶宫 · 撤离道中断',W*.27,H*.18);ctx.restore();
}
