import * as THREE from 'three';
import {T} from './config/event_times.js';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=THREE.MathUtils.lerp;

// Shot choices remain subordinate to the story's shot/phase tags. Cameras stay
// on the positive-Z side of the duel axis; no automatic orbit or dialogue zoom.
export function palaceCamera(t,perf,line,actors,legacy){
 const shot=perf.opts.shot,phase=perf.phase,u=ease((t-perf.entry.startTime)/(perf.entry.endTime-perf.entry.startTime));
 const head=n=>actors[n].headGroup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.08,0));
 const portrait=(n,{close=false,over=false}={})=>{
  const p=head(n),hero=n==='aoao',s=perf.states[n],yaw=s.yaw+(hero?-.28:.28);
  if(over){
   const other=head(hero?'yekari':'aoao');
   return {pos:[other.x+(hero?1.05:-1.05),p.y+.03,other.z+.50],look:[p.x+(hero?.10:-.10),p.y-.30,p.z],fov:26};
  }
  const d=close?1.57:2.28;
  return {pos:[p.x+Math.sin(yaw)*d,p.y-.06,p.z+Math.cos(yaw)*d],look:[p.x+(hero?.045:-.045),p.y-(close?.025:.16),p.z],fov:close?28:30};
 };
 const pair=(fov=34)=>({pos:[mix(.58,.30,u),1.06,5.30],look:[.12,1.07,-.07],fov});
 if(shot==='palace'){
  if(t<7)return {pos:[mix(3.7,3.3,u),mix(2.0,1.8,u),8.1],look:[-.15,1.85,-2.8],fov:47};
  return {pos:[2.3,1.55,7.0],look:[-.45,1.25,-2.4],fov:44};
 }
 if(phase==='arrival'){
  const p=head('yekari');return {pos:[p.x-1.0,p.y-.27,p.z+3.65],look:[p.x,p.y-.48,p.z],fov:34};
 }
 if(shot==='hero'||shot==='enemy')return portrait(shot==='hero'?'aoao':'yekari',{close:['threat','low','confession','resolve','locked','answer'].includes(phase)});
 if(shot==='two'){
  if(phase==='retreat')return {pos:[.25,1.20,6.2],look:[1.3,1.03,-.15],fov:40};
  // Stable editorial coverage at authored dialogue onsets. A gap between lines
  // holds its shot rather than snapping back to a distant gameplay overview.
  const speaker=line?.speaker;
  if(speaker)return portrait(speaker,{over:true});
  return pair(35);
 }
 if(shot==='wrist'){
  if(t<68){const p=actors.aoao.hands.left.getWorldPosition(new THREE.Vector3());return{pos:[p.x+.85,p.y+.27,p.z+1.52],look:p.toArray(),fov:32};}
  return portrait('aoao',{close:true});
 }
 if(shot==='enemy_charge')return portrait('yekari');
 if(shot==='hero_charge'){
  if(t>=T.HERO_CHARGE+1.2&&t<T.HERO_CHARGE+2.0)return legacy();
  if(t<T.CALL)return portrait('aoao');
  return portrait('aoao',{close:true});
 }
 if(shot==='impact'||shot==='side'){
  if(phase==='trap'&&t>T.TRAP-.15){const p=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());return{pos:[p.x+1.1,.79,p.z+2.0],look:[p.x,.55,p.z],fov:36};}
  if([T.C1,T.C3,T.C6].some(h=>t>=h+.18&&t<h+1.05))return portrait('aoao');
  return pair(34);
 }
 if(shot==='gate_fight')return {pos:[.20,1.12,4.7],look:[-.55,1.05,-.35],fov:37};
 if(shot==='finisher'){
  if(t<T.RELEASE)return portrait('aoao');
  return {pos:[.35,.91,5.65],look:[.65,1.05,0],fov:41};
 }
 if(shot==='gate_detail')return {pos:[.24,.85,2.0],look:[-1.0,.48,.35],fov:38};
 return legacy();
}
