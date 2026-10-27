import {emitStoryParticles} from './assets/draw_over_runtime/story-particles.js';
import {radialLight} from './assets/draw_over_runtime/painted-weather.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export function directRoomActor(actor,spec,t,shot){
 if(shot.scene!=='clocktower')return spec;
 const out={...spec};
 if(actor==='Eileen'&&spec.cel==='walk'&&t>=spec.walk.end){out.cel='room_attend';}
 return out;
}
export function performanceMotion(actor,t,shot){
 const nods={Eileen:[113.5,134.8,157.4,173.5,201.9,311.6,348.1,363.0,440.4],Alder:[119.0,145.4,164.3,175.8,432.6],LadyMoon:[304.6,341.7,372.5]};
 let nod=0;for(const at of nods[actor]??[]){const u=(t-at)/.85;if(u>=0&&u<=1)nod+=Math.sin(u*Math.PI);}
 return{headTilt:(actor==='Alder'?.024:-.018)*nod,compress:1.2*nod};
}
let illumination;
export function roomComposite(g,{t,shot,camera,bodies,canvas}){
 if(shot.scene!=='clocktower')return;
 if(!illumination){illumination=document.createElement('canvas');illumination.width=1280;illumination.height=720;}
 const q=illumination.getContext('2d');q.clearRect(0,0,1280,720);q.globalCompositeOperation='source-over';q.drawImage(canvas,0,0);
 q.globalCompositeOperation='source-in';const lamp=camera.point([1017,713]);
 const z=q.createRadialGradient(lamp[0],lamp[1],0,lamp[0],lamp[1],550*camera.scale);
 z.addColorStop(0,'rgba(255,186,87,.32)');z.addColorStop(.38,'rgba(213,146,77,.16)');z.addColorStop(1,'rgba(24,43,62,.30)');
 q.fillStyle=z;q.fillRect(0,0,1280,720);g.save();g.globalCompositeOperation='soft-light';g.drawImage(illumination,0,0);g.restore();q.globalCompositeOperation='source-over';
}
const bottleAnchors=[[305,438],[602,488],[698,506],[769,454],[804,373],[874,577],[962,559],[1038,490],[1146,419],[1357,603],[1477,563],[1699,710],[536,660]];
export function storyParticles(g,{t,shot,camera,bodies,faceStates,getLamp}){
 const e=bodies.find(b=>b.actor==='Eileen'),ef=faceStates.find(b=>b.actor==='Eileen');
 let count=0;
 const emit=o=>count+=emitStoryParticles(g,t,o);
 if(shot.scene==='clocktower'){
  for(let j=0;j<bottleAnchors.length;j++){
   const p=camera.point(bottleAnchors[j]);
   emit({start:91,end:184,count:130,life:2.8,seed:j+21,color:'#f5cc7a',radius:1.1*camera.scale,alpha:t<178?.33:.7,
    trajectory(u,r){return[p[0]+Math.sin(u*5+r[0]*6)*7*camera.scale,p[1]+(r[1]-.5)*9*camera.scale-u*5*camera.scale];}});
  }
  if(e?.bottleFrac){
   const p=[e.x+(e.bottleFrac[0]-.5)*e.w,e.y-(1-e.bottleFrac[1])*e.h],awake=clamp((t-156)/1.5);
   radialLight(g,p[0],p[1],e.h*.16,'#ffc973',.07+.15*awake);
   emit({start:149.8,end:178,count:420,life:1.35,seed:88,radius:1.5+awake,color:'#ffd682',alpha:.35+.4*awake,
    trajectory(u,r){const a=u*8+r[0]*6.283,rr=e.h*.018*(.2+.8*Math.sin(u*Math.PI));return[p[0]+Math.cos(a)*rr,p[1]+Math.sin(a)*rr*.6-(u-.5)*e.h*.028];}});
  }
  if(t>=178){
   const source=camera.point([1220,747]);
   for(let j=0;j<bottleAnchors.length;j++){
    const dest=camera.point(bottleAnchors[j]);
    emit({start:178+j*.19,end:179.5+j*.19,count:24,life:1.7,seed:201+j,radius:2.3,color:'#ffe1a0',alpha:.64,
     trajectory(u,r){const bend=Math.sin(Math.PI*u)*(30+(r[0]-.5)*70);return[source[0]*(1-u)+dest[0]*u+Math.sin(u*8+r[1]*6)*(1-u)*4,source[1]*(1-u)+dest[1]*u-bend];}});
   }
  }
 }
 if(shot.scene==='snowtown'&&t>=58&&t<78){
  const lamp=getLamp(e),p=ef?[ef.eyeScreen[0]+90,ef.eyeScreen[1]+25]:lamp??[720,330];
  emit({start:58.4,end:72,count:24,life:5.6,seed:41,radius:2.2,color:'#ffda8b',alpha:.65,
   trajectory(u,r){const a=u*7+r[0]*6.28,rr=65*(1-u)+12;return[p[0]+Math.cos(a)*rr,p[1]+Math.sin(a)*rr*.65+35*(1-u)];}});
 }
 if(shot.scene==='towertop'&&t>=235&&t<261){
  emit({start:235,end:256,count:230,life:3.8,seed:92,color:'#bcdcff',radius:2.1,alpha:.6,
   trajectory(u,r){const x=960+u*610,y=835-u*520;const p=camera.point([x+(r[0]-.5)*38,y+(r[1]-.5)*15]);return p;}});
 }
 if(shot.scene==='moonpalace'&&t>=369&&t<374){
  const p=[760,335];emit({start:369,end:372.5,count:90,life:2.4,seed:111,color:'#d9e6ff',radius:1.5,alpha:.4,
   trajectory(u,r){const a=r[0]*6.283,rr=25+u*(200+r[1]*500),xy=[p[0]+Math.cos(a)*rr,p[1]+Math.sin(a)*rr*.6-u*50];
    if(xy[0]>450&&xy[0]<800&&xy[1]>160&&xy[1]<450)return null;return xy;}});
 }
 return count;
}
