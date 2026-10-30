// 借我一小段旋律 8 秒试片 R4：R3 身份锚原画 + 已知歌词对齐驱动的口型 + 12 角度单向转圈 + 节拍吸附曝光。
// 曝光表 config/art_pilot8_r4.json（tools/build_r4_sheet.py 生成）；口型数据 config/song_alignment_pilot8.json
// （tools/align_song_pilot.py：诺娅最终分轨 DTW + 声学地标吸附）；全景嘴型 config/face_rigs_r4.json（同图图集局部编辑，可缺省）。
// 每帧 state.noya = 实际显示的嘴/眼/是否可见正脸，供 tools/check_av_sync.py 与音频对账。
import * as THREE from 'three';
import {createCelStage,ease} from '../assets/draw_over_runtime/cel-stage.js';
import {createCelIntegration,drawGroundContact} from '../assets/draw_over_runtime/cel-integration.js';
import {createDialogueFaceTrack,blinkExposure} from '../assets/draw_over_runtime/dialogue-face-track.js';
import {createFeatheredVariantFace} from '../assets/draw_over_runtime/feathered-variant-face.js';
const W=1280,H=720,FPS=30,T0=30,T1=38;
const json=u=>fetch(u).then(r=>{if(!r.ok)throw Error(u);return r.json();});
const cfg=await json('../config/art_pilot8_r4.json'),align=await json('../config/song_alignment_pilot8.json');
// R4c：逐原画原生编辑的锁回嘴型（借月光同法）优先；缺省回退 R4 图集件
const rigs=await json('../config/face_rigs_r4c.json').catch(()=>json('../config/face_rigs_r4.json')).catch(()=>({rigs:{}}));
const meta3=await json('r3/clean/meta.json'),meta4=await json('r4/clean/meta.json');
const meta={...meta3,...meta4},dirOf=k=>k in meta4?'r4/clean':'r3/clean';
const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
const plate=await load('dance/plates/plate_empty.png'),audience=await load('pilot8/v3/audience_row.png');
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const cels=createCelStage({THREE,renderer,width:W,height:H}),fuse=createCelIntegration({width:W,height:H});
// 口型轨：绝对时钟、逐输出帧；唱句前与换气点显示吸气画
const speech=createDialogueFaceTrack({clips:align.clips,start:T0,end:T1,fps:FPS,inhaleLead:.3});
// 开合由歌声强弱驱动（借月光的少女 art_pass_r5 同法）：20ms RMS → 30ms hanning → 句峰归一 ×.85、8% 静默门 →
// p80 缩放阈值的三态迟滞（升阈开/降阈关）→ 15fps 采样。字只决定形状：圆唇韵母开口用 round，其余 narrow/open。
const JAW={half:.085,open:.31};
for(const c of align.clips){
 const e=c.energy,env=[];for(let i=0;i+1<e.length;i+=2)env.push((e[i]+e[i+1])/2);
 const k5=[.1,.25,.3,.25,.1],sm=env.map((_,i)=>k5.reduce((a,w,j)=>a+w*(env[Math.min(env.length-1,Math.max(0,i+j-2))]),0));
 const peak=Math.max(...sm,1e-9),jaw=sm.map(v=>v<peak*.08?0:Math.min(.85,v/peak*.85));
 const pos=jaw.filter(v=>v>.008).sort((a,b)=>a-b),p80=pos[Math.floor(pos.length*.8)]??.4,kk=Math.max(.40,Math.min(1,p80/.48));
 const th={half:Math.max(.025,JAW.half*kk),open:Math.max(.09,JAW.open*kk)};let cur=0;
 c.jawState=jaw.map((_,i)=>{const v=(jaw[i]+(jaw[i+1]??jaw[i]))/2;
  if(cur===0){if(v>th.half)cur=1;}else if(cur===1){if(v>th.open)cur=2;else if(v<th.half*.55)cur=0;}else if(v<th.open*.68)cur=1;return cur;});
}
function mouthAt(t){
 const sp=speech.at(t),tq=Math.floor((t+1e-6)*15)/15,c=align.clips.find(c=>tq>=c.start&&tq<c.start+c.duration);
 const st=c?c.jawState[Math.floor((tq-c.start)/.02)]??0:0;
 const ch=c?.chars.find(x=>tq+.025>=x.start&&tq+.025<x.end),round=ch&&/[uüv]|o/.test(ch.final)&&!/[aei]/.test(ch.final);
 // 字内且在发声（擦音 x/sh、渐弱长音尾）时至少窄口；只有休止/换气才闭口
 if(st===0)return sp.mouth==='inhale'?'inhale':sp.mouth==='labial'?'labial':(sp.voiced&&ch)?(round?'round':'narrow'):'rest';
 return round?'round':st===2?'open':'narrow';
}
const HIDDEN=new Set(cfg.faceHidden??['noya_twirl_b1','noya_twirl_b2','noya_twirl_b3','noya_twirl_b4']);
const used=new Set();for(const s of cfg.shots)for(const k of ['noya','selene','pair'])for(const e of s[k]??[])if(e[1])used.add(e[1]);
const painters={};
for(const key of used){
 const m=meta[key],hv=m.head_top/m.size[1],src=`${dirOf(key)}/${key}.png`,rig=rigs.rigs?.[key];
 if(rig){painters[key]=await createFeatheredVariantFace({id:key,base:src,variants:rig.variants,mouth:rig.mouth});
  cels.register(key,painters[key].canvas,{dynamic:true,head:[.5,hv+.06,.22,.08],hair:[.5,hv+.03,.34,.07]});}
 else cels.register(key,await load(src),{dynamic:false,head:[.5,hv+.06,.22,.08],hair:[.5,hv+.03,.34,.07]});
}
const portrait=document.createElement('canvas');portrait.width=1672;portrait.height=941;const pg=portrait.getContext('2d');
cels.register('portrait',portrait,{dynamic:true,head:[.56,.30,.12,.16],hair:[.50,.22,.22,.18]});
const faces={};for(const s of cfg.shots)if(s.kind==='portrait'){faces.base??=await load('../hybrid/anchors/noya_face.png');
 for(const n of new Set(Object.values(s.mouthMap).concat(s.blinkCel?[s.blinkCel]:[])))if(n!=='base')faces[n]??=await load(`../${s.dir}/${n}.png`);}
const at=(seq,t)=>{let cur=seq[0];for(const e of seq)if(t>=e[0]-1e-3)cur=e;return cur;};
const mix=(a,b,u)=>a+(b-a)*u;
const rand=i=>{const n=Math.sin(i*91.37+17.13)*43758.54;return n-Math.floor(n);};
function bodyHeight(key,who){const m=meta[key];if(m.scaleRef)return cfg.bodyH.noya*m.size[1]/m.scaleRef;
 return (who==='pair'?cfg.bodyH.selene:cfg.bodyH[who])*m.size[1]/(m.size[1]-(who==='pair'?0:m.head_top));}
// 节拍弹压：每个四分拍落点上身轻压后衰减（舞者在拍上的重心起伏）
function beatBounce(t){const a=cfg.beatAccent;if(!a)return 0;let last=null;for(const b of a.beats)if(b<=t)last=b;return last===null?0:a.compress*Math.exp(-(t-last)*a.decay);}
let view={cx:640,cy:360,z:1,roll:0};
function actor(who,shot,t,order,mouth){
 const list=shot[who];if(!list)return null;const e=at(list,t);if(!e[1]||t<e[0]-1e-3)return null;
 const [t0,key,x0,settle]=e,dt=t-t0,h=bodyHeight(key,who),m=meta[key],phase=who==='selene'?1.7:who==='pair'?.9:0;
 // 转圈：按头部竖轴对齐（x0 = 轴位置），不按图像中心
 // 托手转圈：手尖对齐交握点（轴心是交握的手）；否则按头部竖轴
 const x=shot.alignHand&&m.hand&&who==='noya'?shot.joinHand[0]+(m.size[0]/2-m.hand[0])*h/m.size[1]:shot.alignAxis&&m.axis!=null?x0+(m.size[0]/2-m.axis)*h/m.size[1]:x0;
 if(painters[key])painters[key].paint({mouthCel:mouth});
 const lean=1.6*Math.sin((t-.07)/.8189*Math.PI+phase),compress=settle*Math.exp(-dt*9)+(who==='selene'?.5:1)*beatBounce(t),hair=1.2*Math.sin(t*2.1+phase);
 cels.place(key,{x,y:cfg.floorY,height:h,view,order,time:t+phase,breath:1.1,lean,compress,headTilt:.01*Math.sin(t*1.3+phase),hair});
 // 嘴区屏幕坐标（审片裁区用；不含局部网格的亚像素偏移）
 const vv=rigs.rigs?.[key]?.variants,core=vv?(Object.values(vv)[0].cores?.[0]):null,sc=h/m.size[1];
 const mouthXY=core?[Math.round((x-m.size[0]*sc/2+(core[0]+core[2]/2)*sc-view.cx)*view.z+640),Math.round((cfg.floorY-h+(core[1]+core[3]/2)*sc-view.cy)*view.z+360)]:null;
 return{who,key,x,h,meta:m,mouthXY};
}
function contact(a){
 const m=a.meta,s=a.h/m.size[1],left=a.x-m.size[0]*s/2;
 g.save();g.translate(640,360);g.scale(view.z,view.z);g.translate(-view.cx,-view.cy);
 for(const [f0,f1] of m.feet){const cx=left+(f0+f1)/2*s,rw=Math.max(10,(f1-f0)*s*.75);drawGroundContact(g,{x:cx,y:cfg.floorY-1,radiusX:rw,radiusY:4.5,opacity:.33,cast:[46,-9]});}
 g.restore();
}
function stageLight(t,noyaX){
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
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#0d0b10';g.fillRect(0,0,W,H);cels.begin();
 const sp0=speech.at(t),sp={...sp0,mouth:mouthAt(t)},state={t,shot:shot.id,char:sp0.char};
 if(shot.kind==='portrait'){
  const eyes=shot.blinkCel?blinkExposure(t,shot.blinks??[]):'open';
  const name=eyes==='closed'?shot.blinkCel:shot.mouthMap[sp.mouth];
  pg.clearRect(0,0,1672,941);pg.drawImage(name==='base'?faces.base:faces[name],0,0);
  cels.place('portrait',{x:640,y:H,height:H,view,order:1,time:t,breath:1.4,lean:1.2*Math.sin(t*.9),headTilt:.006*Math.sin(t*1.1),hair:1.0*Math.sin(t*1.7),compress:0});
  g.drawImage(cels.render(),0,0);
  // 眨眼画是闭眼+底图嘴：闭眼的两帧里嘴随之回到底图形
  state.face=name;state.noya={faceVisible:true,mouth:eyes==='closed'&&shot.mouthMap.rest===shot.mouthMap[sp.mouth]?sp.mouth:eyes==='closed'?'rest':sp.mouth,eyes,cel:name};
 }else{
  g.save();g.translate(640,360);g.scale(view.z,view.z);g.translate(-view.cx,-view.cy);g.drawImage(plate,0,0,W,H);g.restore();
  const actors=[actor('selene',shot,t,1,null),actor('pair',shot,t,2,sp.mouth),actor('noya',shot,t,3,sp.mouth)].filter(Boolean);
  for(const a of actors)contact(a);
  fuse.draw(g,cels.render(),{warmPoint:[(220-view.cx)*view.z+640,(300-view.cy)*view.z+360],warmRadius:900*view.z,time:t});
  stageLight(t,noyaXAt(shot,Math.max(shot.t[0],t-.3)));dust(t);audienceRow(view.cx-693);
  state.drawings=actors.map(a=>a.key);
  const na=actors.find(a=>a.who==='noya'||a.who==='pair'),nk=na?.key;
  state.noya=nk?{faceVisible:!HIDDEN.has(nk),mouth:painters[nk]?sp.mouth:'drawn',eyes:'open',cel:nk,mouthXY:na.mouthXY}:{faceVisible:false};
 }
 const fade=Math.min(1,(t-T0)/.25,(T1-t)/.35);if(fade<1){g.fillStyle=`rgba(0,0,0,${1-fade})`;g.fillRect(0,0,W,H);}
 return state;
}
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};
window.stepAt=draw;window.duration=T1-T0;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){const audio=new Audio('../assets/audio/mix/pilot8_mix.wav'),f=document.createElement('footer');f.innerHTML='<button>播放</button> <input type="range" min="30" max="37.96" value="30" step="0.033333">';document.body.append(f);let t=T0,playing=false;const s=f.querySelector('input');f.querySelector('button').onclick=()=>{playing=!playing;if(playing){audio.currentTime=t-T0;audio.play();}else audio.pause();};s.oninput=()=>{t=Number(s.value);audio.currentTime=t-T0;draw(t);};audio.onended=()=>playing=false;(function loop(){if(playing)t=Math.min(37.96,T0+audio.currentTime);s.value=t;draw(t);requestAnimationFrame(loop);})();}
