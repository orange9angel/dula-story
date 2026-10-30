// 借我一小段旋律 8 秒试片 R3：身份锚派生原画 × 共享 cel-stage 局部网格表演。
// 曝光表与摆放在 config/art_pilot8_r3.json；本页只做本集合成，通用实现取自 draw_over_runtime。
import * as THREE from 'three';
import {createCelStage,ease} from '../assets/draw_over_runtime/cel-stage.js';
import {createCelIntegration,drawGroundContact} from '../assets/draw_over_runtime/cel-integration.js';
const W=1280,H=720,FPS=30,T0=30,T1=38;
const cfg=await fetch('../config/art_pilot8_r3.json').then(r=>r.json());
const meta=await fetch('r3/clean/meta.json').then(r=>r.json());
const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
const plate=await load('dance/plates/plate_empty.png'),audience=await load('pilot8/v3/audience_row.png');
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const cels=createCelStage({THREE,renderer,width:W,height:H}),fuse=createCelIntegration({width:W,height:H});
// 全身画：头部高斯区按 meta 的头顶位置给出，头/发梢局部动作不带动脚
const used=new Set();for(const s of cfg.shots)for(const k of ['noya','selene','pair'])for(const e of s[k]??[])if(e[1])used.add(e[1]);
for(const key of used){
 const im=await load(`r3/clean/${key}.png`),m=meta[key],hv=m.head_top/m.size[1];
 cels.register(key,im,{dynamic:false,head:[.5,hv+.06,.22,.08],hair:[.5,hv+.03,.34,.07]});
}
// 肖像（中近景/近景）：同一张锚的变体逐帧换入同一块画布，注册为动态 cel 以接局部表演
const portrait=document.createElement('canvas');portrait.width=1672;portrait.height=941;const pg=portrait.getContext('2d');
cels.register('portrait',portrait,{dynamic:true,head:[.56,.30,.12,.16],hair:[.50,.22,.22,.18]});
const faces={};for(const s of cfg.shots)if(s.kind==='portrait'){faces[s.base]=await load('../'+s.base);for(const [,n] of s.seq)if(n!=='base')faces[`${s.dir}/${n}.png`]=await load(`../${s.dir}/${n}.png`);}
const at=(seq,t)=>{let cur=seq[0];for(const e of seq)if(t>=e[0])cur=e;return cur;};
const mix=(a,b,u)=>a+(b-a)*u;
const rand=i=>{const n=Math.sin(i*91.37+17.13)*43758.54;return n-Math.floor(n);};
function bodyHeight(key,who){const m=meta[key];return (who==='pair'?cfg.bodyH.selene:cfg.bodyH[who])*m.size[1]/(m.size[1]-(who==='pair'?0:m.head_top));}
function actor(who,shot,t,order){
 const list=shot[who];if(!list)return null;const e=at(list,t);if(!e[1]||t<e[0])return null;
 const [t0,key,x,settle]=e,dt=t-t0,h=bodyHeight(key,who),phase=who==='selene'?1.7:who==='pair'?.9:0;
 // 局部网格表演：呼吸（3.2s 周期）、上身随拍轻倾（四分音符≈0.82s）、落地压缩衰减、发梢滞后
 const lean=1.6*Math.sin((t-.07)/.8189*Math.PI+phase),compress=settle*Math.exp(-dt*9),hair=1.2*Math.sin(t*2.1+phase);
 cels.place(key,{x,y:cfg.floorY,height:h,view,order,time:t+phase,breath:1.1,lean,compress,headTilt:.01*Math.sin(t*1.3+phase),hair});
 return{who,key,x,h,meta:meta[key]};
}
let view={cx:640,cy:360,z:1,roll:0};
function contact(a){
 const m=a.meta,s=a.h/m.size[1],left=a.x-m.size[0]*s/2;
 g.save();g.translate(640,360);g.scale(view.z,view.z);g.translate(-view.cx,-view.cy);
 for(const [f0,f1] of m.feet){const cx=left+(f0+f1)/2*s,rw=Math.max(10,(f1-f0)*s*.75);drawGroundContact(g,{x:cx,y:cfg.floorY-1,radiusX:rw,radiusY:4.5,opacity:.33,cast:[46,-9]});}
 g.restore();
}
function stageLight(t,noyaX){
 // 追光跟诺娅（滞后 0.3s 由调用方给出位置）；高潮前收窄。与人物同一层之后施加，人景一起变
 const [sx,sy]=[(noyaX-view.cx)*view.z+640,(cfg.floorY-200-view.cy)*view.z+360],narrow=t>=35.42?ease((t-35.42)/.9):0,r=(330-90*narrow)*view.z;
 const q=g.createRadialGradient(sx,sy,r*.35,sx,sy,r*1.6);q.addColorStop(0,'rgba(0,0,0,0)');q.addColorStop(1,`rgba(8,4,10,${.20+.22*narrow})`);
 g.fillStyle=q;g.fillRect(0,0,W,H);
 const w=g.createRadialGradient(sx,sy,0,sx,sy,r);w.addColorStop(0,'rgba(255,196,120,.07)');w.addColorStop(1,'rgba(255,196,120,0)');g.fillStyle=w;g.fillRect(0,0,W,H);
}
function dust(t){
 g.save();g.globalCompositeOperation='lighter';
 for(let i=0;i<90;i++){const birth=T0-8+rand(i)*16,life=4+rand(i+90)*5,age=t-birth;if(age<0||age>life)continue;
  const v=(rand(i+180)+age*.018)%1,u=rand(i+270),px=(46+v*536+(u-.5)*(70+v*200)-view.cx)*view.z+640,py=(v*582-view.cy)*view.z+360;
  g.fillStyle=`rgba(255,214,150,${.5*Math.sin(Math.PI*age/life)})`;g.beginPath();g.arc(px,py,(1+u*1.4)*Math.min(1.4,view.z),0,Math.PI*2);g.fill();}
 g.restore();
}
function audienceRow(pan){
 // 第一排 POV：前排头顶占画面下缘约 13%，机位前景，随镜头横移反向视差
 const k=.50,sw=audience.width*k,sh=audience.height*k,band=H*.085,top=audience.height*.72*k;
 g.save();g.filter='blur(1.2px) brightness(.72)';
 for(let i=-1;i<3;i++){const x=i*sw-((60+pan*.08)%sw);g.save();if(i%2){g.translate(x+sw,0);g.scale(-1,1);g.drawImage(audience,0,0,audience.width,audience.height,0,H-band-top+4,sw,sh);}else g.drawImage(audience,0,0,audience.width,audience.height,x,H-band-top+4,sw,sh);g.restore();}
 g.restore();
}
function noyaXAt(shot,t){const e=shot.noya?at(shot.noya,t):null;if(e&&e[1])return e[2];const p=shot.pair?at(shot.pair,t):null;return p&&p[1]?p[2]-60:640;}
function draw(t){
 if(t<T0||t>=T1)throw Error('Outside pilot');
 const shot=cfg.shots.find(s=>t>=s.t[0]&&t<s.t[1]),u=(t-shot.t[0])/(shot.t[1]-shot.t[0]),[a,b]=shot.cam,e=ease(u);
 view={cx:mix(a[0],b[0],e),cy:mix(a[1],b[1],e),z:mix(a[2],b[2],e),roll:0};
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#0d0b10';g.fillRect(0,0,W,H);cels.begin();let state={t,shot:shot.id};
 if(shot.kind==='portrait'){
  const cur=at(shot.seq,t),src=cur[1]==='base'?shot.base:`${shot.dir}/${cur[1]}.png`;
  pg.clearRect(0,0,1672,941);pg.drawImage(faces[src],0,0);
  cels.place('portrait',{x:640,y:H,height:H,view,order:1,time:t,breath:1.4,lean:1.2*Math.sin(t*.9),headTilt:.006*Math.sin(t*1.1),hair:1.0*Math.sin(t*1.7),compress:0});
  g.drawImage(cels.render(),0,0);state.face=cur[1];
 }else{
  g.save();g.translate(640,360);g.scale(view.z,view.z);g.translate(-view.cx,-view.cy);g.drawImage(plate,0,0,W,H);g.restore();
  const actors=[actor('selene',shot,t,1),actor('pair',shot,t,2),actor('noya',shot,t,3)].filter(Boolean);
  for(const a of actors)contact(a);
  fuse.draw(g,cels.render(),{warmPoint:[(220-view.cx)*view.z+640,(300-view.cy)*view.z+360],warmRadius:900*view.z,time:t});
  stageLight(t,noyaXAt(shot,Math.max(shot.t[0],t-.3)));dust(t);audienceRow(view.cx-693);
  state.drawings=actors.map(a=>a.key);
 }
 const fade=Math.min(1,(t-T0)/.25,(T1-t)/.35);if(fade<1){g.fillStyle=`rgba(0,0,0,${1-fade})`;g.fillRect(0,0,W,H);}
 return state;
}
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};
window.stepAt=draw;window.duration=T1-T0;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){const audio=new Audio('../assets/audio/mix/pilot8_mix.wav'),f=document.createElement('footer');f.innerHTML='<button>播放</button> <input type="range" min="30" max="37.96" value="30" step="0.033333">';document.body.append(f);let t=T0,playing=false;const s=f.querySelector('input');f.querySelector('button').onclick=()=>{playing=!playing;if(playing){audio.currentTime=t-T0;audio.play();}else audio.pause();};s.oninput=()=>{t=Number(s.value);audio.currentTime=t-T0;draw(t);};audio.onended=()=>playing=false;(function loop(){if(playing)t=Math.min(37.96,T0+audio.currentTime);s.value=t;draw(t);requestAnimationFrame(loop);})();}
