// 水晶咏叹 · 8 秒试片：水晶球里由粒子组成的女士（塞蕾娜）随 v1b 副歌起舞歌唱。
// 程序化骨架（无模型文件）+ 沿骨骼分布的粒子云 + 纱裙/纱袖滞后 + 人声驱动的光；
// 场景为 painted-space 分层底图（中景修补底图 / 玻璃高光 / 前景椅背），三者共用一台底图相机。
// 一切由绝对时钟 t（歌曲秒）决定：顺序播放与任意 seek 逐帧一致。
import * as THREE from 'three';
import {paintedCamera,saturate,lerp} from '../assets/draw_over_runtime/painted-space.js';

const W=1280,H=720,FPS=30,[T0,T1]=(new URLSearchParams(location.search).get('win')||'40.6,48.6').split(',').map(Number);
const SONG_IN=-3,SONG_OUT=71.0; // 序幕从歌曲 −3s，尾声台词后 71s 淡出 // 全片淡入/淡出点（歌曲秒）
const json=u=>fetch(u).then(r=>{if(!r.ok)throw Error(u);return r.json();});
// 图片加载后立即栅格化为画布：直接画 <img> 时浏览器解码缓存的插值质量随渲染历史变化，导致顺序/seek 偶发 1–2 像素不一致
const img=u=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d',{willReadFrequently:true}).drawImage(i,0,0);res(c);};i.onerror=()=>rej(Error(u));i.src=u;});
const [cal,voc,bg,fg,glass,faceImg,ALIGN,bgNo,celStand,celEE,celHands,celJoy]=await Promise.all([json('../config/plate_calibration.json'),json('../config/vocal_env.json'),
  img('plates/bg_clean.png'),img('plates/fg_seats.png'),img('plates/glass_highlights.png'),img('../assets/anchors/maiden/maiden_face.png'),json('../config/song_alignment.json'),
  img('plates/bg_noball.png'),img('../assets/anchors/maiden/maiden_full.png'),img('cels/maiden_full__ee.png'),img('cels/maiden_hands.png'),img('cels/maiden_joy.png')]);
// ---------- 逐字口型（config/song_alignment.json：DTW+声学地标吸附，按字给韵母）----------
const CHARS=ALIGN.clips.flatMap(c=>c.chars.map((x,i,a)=>({...x,end:Math.min(x.end,a[i+1]?.start??x.end)})));
const VIS={a:[1,0],o:[.62,-.65],e:[.55,.15],i:[.26,.95],u:[.22,-1],v:[.22,-1]}; // [开口上限, 展(+)/圆(−)]
function visOf(f,into,dur){
  if(f.length>1&&/^[iuv]/.test(f)&&into<Math.min(.067,dur*.3))f=f[0];           // 介音先行
  else if(/(ao|ou|uo)$/.test(f)&&dur>.25&&into/dur>.75)f='o';                    // 收尾撮圆
  if(/^(i|in|ing|ie|ia|iang|ian|iao|iong|iu)$/.test(f)&&f!=='i'&&f.length>1){if(/a/.test(f))return[.85,.2];if(/e/.test(f))return[.5,.35];if(/o|u/.test(f))return[.5,-.4];return[.3,.85];}
  if(/^(i|in|ing|er)$/.test(f))return f==='er'?[.45,0]:VIS.i;
  if(/^(u|v|un|vn|ong|ve)$/.test(f))return VIS.u;
  if(/a/.test(f))return[.92,f==='ao'?-.2:.1];
  if(/o/.test(f))return VIS.o;return VIS.e;}
function mouthAt(t){
  const e=energy(t),ch=CHARS.find(c=>t>=c.start-.02&&t<c.end+.04);
  if(!ch)return{open:Math.min(.15,e*.4),wide:0};
  const into=t-ch.start,dur=ch.end-ch.start;
  if(/^[bpm]$/.test(ch.initial??'')&&into>-.02&&into<.05)return{open:0,wide:.1};   // 双唇音起音先闭
  const [cap,wide]=visOf(ch.final??'a',Math.max(0,into),dur),amt=saturate(.25+1.1*e);
  return{open:cap*amt,wide};}
// 以 t+30ms 为中心的对称平滑：嘴略领先声音，且不拖上一个字（只往回看会晚一帧半，「只」被「怕」的 a 拖成大口）
function mouthSmooth(t){const a=mouthAt(t+.03),b=mouthAt(t+.03-1/30),c=mouthAt(t+.03+1/30);return{open:.5*a.open+.25*b.open+.25*c.open,wide:.5*a.wide+.25*b.wide+.25*c.wide};}
// 正脸肖像投影（身份锚 maiden_face.png）：瞳孔 (467,322)/(584,325)、嘴心 (522,435) 对齐粒子头的眼 ±15.5mm、嘴 −33.5mm
const FACE=(()=>{const c=document.createElement('canvas');c.width=faceImg.width;c.height=faceImg.height;const x=c.getContext('2d');
  x.filter='blur(1.2px)';x.drawImage(faceImg,0,0);return{w:c.width,h:c.height,d:x.getImageData(0,0,c.width,c.height).data,
  cx:525.5,cy:323.5,sx:(584-467)/.031,sy:(435-323.5)/.0335};})();
function faceColor(hr){ // hr：相对头心的静止坐标（米）；返回 [r,g,b] 0–1 与权重
  const w=saturate((hr.z-.004)/.022);if(w<=0)return null;
  const px=Math.round(FACE.cx+hr.x*FACE.sx),py=Math.round(FACE.cy-hr.y*FACE.sy);
  if(px<0||py<0||px>=FACE.w||py>=FACE.h)return null;const k=(py*FACE.w+px)*4;
  return{c:[FACE.d[k]/255,FACE.d[k+1]/255,FACE.d[k+2]/255],w};}
const BALL=cal.ball;

// ---------- 时钟上的音频量 ----------
const energy=t=>{const x=t*voc.rate,i=Math.floor(x),f=x-i,e=voc.energy;return i<0||i+1>=e.length?0:e[i]*(1-f)+e[i+1]*f;};
// 半速拍（76 BPM 抒情）：节拍器给的是 152，舞步按每两拍
const beats=voc.beats.filter((_,i)=>i%2===voc.beats.findIndex(b=>b>40.5)%2);
const beatPulse=t=>{let p=0;for(const b of beats){const d=t-b;if(d>=0&&d<.5)p=Math.max(p,Math.exp(-d*7));}return p;};

// ---------- 确定性随机 ----------
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// ---------- 编舞：关键帧（歌曲秒）----------
// 方向向量在胸腔坐标系：x=她的左侧（面向观众时在画面右）、y=上、z=朝观众。右臂由左臂 x 取反得到。
// 「借我一小段旋律 / 哪怕只有一声呼吸」：合手低头 → 吸气抬头 → 双手前伸乞求 → 单臂画弧上扬 →
// 双臂上举踮起 → 打开二位预备 → 收臂两圈旋转（裙摆扬起）→ 张臂 → 高音后仰全开。
const K=[
 {t:0,    hipY:.468,lean:.24,chF:.32,chS:.04,chT:0,nod:.62,tilt:.1,turn:-.15,uL:[.15,-.6,.78],fL:[-.86,.25,.45]},
 {t:9.2,  hipY:.47, lean:.24,chF:.31,chS:.04,chT:0,nod:.6, tilt:.1,turn:-.15,uL:[.15,-.6,.78],fL:[-.86,.25,.45]},
 {t:10.6, hipY:.482,lean:.14,chF:.16,chS:.02,chT:0,nod:.18,tilt:.05,turn:-.05,uL:[.22,-.66,.72],fL:[-.7,.1,.7]},
 {t:11.7, hipY:.494,lean:.06,chF:.04,chS:0,chT:.06,nod:.05,tilt:0,turn:.12,uL:[.5,-.76,.42],fL:[.32,-.55,.77]},
 {t:12.7, hipY:.503,lean:0,chF:-.08,chS:0,chT:0,nod:-.06,tilt:0,turn:.05,uL:[.4,-.88,.26],fL:[.12,-.6,.79]},
 {t:13.6, hipY:.501,lean:.02,chF:-.04,chS:0,chT:0,nod:0,tilt:-.03,turn:0,uL:[.45,-.84,.3],fL:[.28,-.48,.83]},
 {t:14.35,hipY:.497,lean:.06,chF:.02,chS:.03,chT:-.05,nod:.04,tilt:.08,turn:-.08,uL:[.42,-.86,.28],fL:[.3,-.5,.81],uR:[-.38,-.22,.9],fR:[-.18,.04,.98]},
 {t:15.5, hipY:.505,lean:.04,chF:0,chS:-.05,chT:-.02,nod:0,tilt:.1,turn:-.05,uL:[.45,-.84,.3],fL:[.32,-.5,.8],uR:[-.68,-.22,.7],fR:[-.62,.08,.78]},
 {t:16.55,hipY:.5,lean:.06,chF:.06,chS:0,chT:.04,nod:.12,tilt:.04,turn:.05,uL:[.3,-.75,.58],fL:[-.5,.1,.86],uR:[-.3,-.75,.58],fR:[.5,.1,.86]},
 {t:17.4, hipY:.494,lean:.08,chF:.13,chS:.04,chT:.08,nod:.3,tilt:.06,turn:.12,uL:[.24,-.7,.67],fL:[-.8,.45,.4],uR:[-.24,-.7,.67],fR:[.8,.45,.4]},
 {t:19.1, hipY:.486,lean:.1,chF:.2,chS:.05,chT:.1,nod:.38,tilt:.08,turn:.15,uL:[.22,-.66,.72],fL:[-.82,.5,.3],uR:[-.22,-.66,.72],fR:[.82,.5,.3]},
 {t:20.1, hipY:.5,lean:.03,chF:.0,chS:0,chT:0,nod:.06,tilt:0,turn:0,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.8,-.5,.35],fR:[-.72,-.3,.62]},
 {t:21.7, hipY:.503,lean:.02,chF:-.04,chS:-.04,chT:.06,nod:.1,tilt:.12,turn:.1,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.86,-.4,.33],fR:[-.8,-.15,.58]},
 {t:22.9, hipY:.5,lean:.04,chF:.02,chS:-.08,chT:.1,nod:.16,tilt:.2,turn:.18,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.84,-.42,.35],fR:[-.78,-.2,.6]},
 {t:23.75,hipY:.502,lean:0,chF:-.04,chS:0,chT:0,nod:.02,tilt:.05,turn:0,uL:[.75,-.25,.6],fL:[.8,.02,.6]},
 {t:24.95,hipY:.512,lean:-.02,chF:-.1,chS:0,chT:0,nod:-.12,tilt:0,turn:0,uL:[.9,.25,.33],fL:[.85,.42,.3]},
 {t:26.55,hipY:.516,lean:-.03,chF:-.14,chS:.05,chT:0,nod:-.18,tilt:-.06,turn:0,uL:[.82,.45,.35],fL:[.7,.62,.35],uR:[-.86,.38,.34],fR:[-.8,.5,.33]},
 {t:27.3, hipY:.502,lean:0,chF:-.02,chS:0,chT:0,nod:0,tilt:0,turn:0,uL:[.35,-.9,.24],fL:[.3,-.85,.43]},
 {t:27.68,hipY:.497,lean:.04,chF:.12,chS:0,chT:0,nod:.16,tilt:0,turn:0,uL:[.5,-.85,.15],fL:[.1,0,1]},
 {t:28.74,hipY:.5,lean:.02,chF:.06,chS:.04,chT:0,nod:.06,tilt:.2,turn:.1,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.5,-.85,.15],fR:[-.1,0,1]},
 {t:29.85,hipY:.497,lean:.04,chF:.1,chS:0,chT:0,nod:.18,tilt:-.12,turn:-.1,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.45,-.86,.2],fR:[-.05,-.1,1]},
 {t:31.05,hipY:.506,lean:-.02,chF:-.1,chS:0,chT:0,nod:-.28,tilt:0,turn:0,uL:[.3,-.7,.65],fL:[-.3,.35,.89]},
 {t:32.37,hipY:.494,lean:.06,chF:.08,chS:0,chT:0,nod:.22,tilt:0,turn:0,uL:[.3,-.78,.55],fL:[-.35,.1,.93]},
 {t:33.06,hipY:.498,lean:.04,chF:.06,chS:0,chT:0,nod:.15,tilt:.05,turn:0,uL:[.25,-.82,.5],fL:[-.82,.42,.38]},
 {t:33.66,hipY:.505,lean:0,chF:0,chS:0,chT:0,nod:0,tilt:.08,turn:0,uL:[.8,-.42,.3],fL:[.8,-.15,.5]},
 {t:35.4, hipY:.505,lean:0,chF:-.02,chS:0,chT:0,nod:-.04,tilt:-.08,turn:0,uL:[.82,-.38,.3],fL:[.78,-.1,.55]},
 {t:36.42,hipY:.502,lean:0,chF:0,chS:0,chT:0,nod:0,tilt:0,turn:0,uL:[.6,-.78,.18],fL:[.4,-.6,.7]},
 {t:37.2, hipY:.5,lean:.06,chF:.04,chS:-.04,chT:-.06,nod:.04,tilt:.08,turn:-.05,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.4,-.25,.88],fR:[-.2,.1,.97]},
 {t:38.4, hipY:.503,lean:.02,chF:0,chS:0,chT:0,nod:-.04,tilt:.06,turn:0,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.55,.1,.83],fR:[-.25,.82,.5]},
 {t:39.75,hipY:.506,lean:-.02,chF:-.06,chS:0,chT:0,nod:-.08,tilt:0,turn:0,uL:[.25,-.85,.45],fL:[-.85,.45,.1],uR:[-.55,.18,.81],fR:[-.2,.9,.38]},
 {t:40.05,hipY:.515,lean:-.05,chF:-.22,chS:0,chT:0,nod:-.25,tilt:0,turn:0,uL:[.8,.3,.5],fL:[.7,.55,.45]},
 {t:40.6, hipY:.495,lean:.05,chF:.10,chS:0,chT:0,nod:.38,tilt:.05,turn:-.10,uL:[.25,-.95,.18],fL:[-.6,-.3,.74]},
 {t:41.0, hipY:.494,lean:.05,chF:.11,chS:0,chT:0,nod:.40,tilt:.05,turn:-.10,uL:[.25,-.95,.18],fL:[-.6,-.3,.74]},
 {t:41.31,hipY:.503,lean:.0, chF:-.06,chS:0,chT:0,nod:.02,tilt:0,turn:0,uL:[.4,-.88,.25],fL:[-.15,-.25,.95]},
 {t:42.08,hipY:.490,lean:.12,chF:.06,chS:0,chT:0,nod:-.06,tilt:0,turn:0,uL:[.3,-.12,.95],fL:[.12,.08,.99]},
 {t:42.86,hipY:.497,lean:.02,chF:-.04,chS:-.08,chT:.12,nod:-.25,tilt:-.08,turn:.32,uL:[.93,-.28,.22],fL:[.95,-.05,.3],
  uR:[-.38,.6,.7],fR:[.05,.97,.25]},
 {t:43.65,hipY:.516,lean:-.02,chF:-.12,chS:0,chT:0,nod:-.22,tilt:0,turn:0,uL:[.3,.93,.2],fL:[-.42,.89,.16]},
 {t:44.42,hipY:.484,lean:.03,chF:.0,chS:.05,chT:-.15,nod:.05,tilt:.06,turn:-.32,uL:[.97,.05,.22],fL:[.96,.18,.2]},
 {t:44.86,hipY:.505,lean:.0,chF:.0,chS:0,chT:0,nod:0,tilt:0,turn:-.15,uL:[.55,-.25,.8],fL:[-.75,0,.66]},
 {t:45.95,hipY:.522,lean:.0,chF:-.03,chS:0,chT:0,nod:-.05,tilt:0,turn:0,uL:[.5,-.18,.85],fL:[-.8,.05,.6]},
 {t:46.74,hipY:.506,lean:-.02,chF:-.14,chS:0,chT:0,nod:-.16,tilt:.04,turn:0,uL:[.6,.72,.35],fL:[.55,.8,.25]},
 {t:47.54,hipY:.522,lean:-.04,chF:-.24,chS:0,chT:0,nod:-.24,tilt:.10,turn:.05,uL:[.76,.6,.25],fL:[.82,.56,.14]},
 {t:48.2, hipY:.518,lean:-.03,chF:-.2,chS:0,chT:0,nod:-.2,tilt:.10,turn:.08,uL:[.8,.52,.3],fL:[.86,.45,.22]},
 {t:48.8, hipY:.514,lean:-.02,chF:-.16,chS:0,chT:0,nod:-.16,tilt:.08,turn:.1,uL:[.82,.45,.35],fL:[.88,.36,.3]},
 {t:49.6, hipY:.506,lean:.1,chF:.04,chS:0,chT:0,nod:-.02,tilt:0,turn:0,uL:[.4,.05,.92],fL:[.15,.4,.9]},
 {t:50.83,hipY:.506,lean:.12,chF:.04,chS:.04,chT:0,nod:.0,tilt:.22,turn:.15,uL:[.4,.05,.92],fL:[.15,.4,.9]},
 {t:52.1, hipY:.494,lean:.02,chF:.12,chS:0,chT:0,nod:.2,tilt:0,turn:0,uL:[.3,-.75,.58],fL:[-.6,.1,.79]},
 {t:52.75,hipY:.53,lean:-.06,chF:-.25,chS:0,chT:0,nod:-.3,tilt:0,turn:0,uL:[.85,.42,.3],fL:[.8,.55,.25]},
];
for(const k of K){if(!k.uR)k.uR=[-k.uL[0],k.uL[1],k.uL[2]];if(!k.fR)k.fR=[-k.fL[0],k.fL[1],k.fL[2]];}
// 旋转（root yaw）单列：两整圈，单调三次插值不过冲
const TAU=Math.PI*2;
const YAW=[[0,.45],[9.2,.42],[11.7,.18],[13.6,0],[14.35,.48],[15.5,.3],[17.4,-.35],[19.1,-.42],[20.1,0],[22.9,.1],[24.4,.1],[25.8,3.25],[27.2,TAU+.05],[27.68,TAU],[31.05,TAU],[33.66,TAU],[36.42,2*TAU],[37.2,2*TAU+.15],[39.75,2*TAU],
  ...[[40.6,.25],[41.31,.12],[42.08,-.5],[42.86,.35],[43.65,0],[44.42,-.6],[44.86,-.45],[45.3,1.3],[45.95,6.9],[46.45,11.5],[46.85,12.566],[48.8,12.566+.12],[49.6,12.566],[52.75,12.566]].map(([t,y])=>[t,y+2*TAU])];

function monotone(pts){ // Fritsch–Carlson
  const n=pts.length,x=pts.map(p=>p[0]),y=pts.map(p=>p[1]),d=[],m=[];
  for(let i=0;i<n-1;i++)d.push((y[i+1]-y[i])/(x[i+1]-x[i]));
  m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
  for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],s=a*a+b*b;if(s>9){const k=3/Math.sqrt(s);m[i]=k*a*d[i];m[i+1]=k*b*d[i];}}
  return t=>{if(t<=x[0])return y[0];if(t>=x[n-1])return y[n-1];let i=0;while(t>x[i+1])i++;
    const h=x[i+1]-x[i],u=(t-x[i])/h,u2=u*u,u3=u2*u;
    return(2*u3-3*u2+1)*y[i]+(u3-2*u2+u)*h*m[i]+(-2*u3+3*u2)*y[i+1]+(u3-u2)*h*m[i+1];};
}
const curves={};
for(const key of ['hipY','lean','chF','chS','chT','nod','tilt','turn'])curves[key]=monotone(K.map(k=>[k.t,k[key]]));
for(const key of ['uL','fL','uR','fR'])curves[key]=[0,1,2].map(j=>monotone(K.map(k=>[k.t,k[key][j]])));
const yawC=monotone(YAW);
const vec=(c,t)=>new THREE.Vector3(c[0](t),c[1](t),c[2](t)).normalize();

// ---------- 骨架（单位≈米，身高 0.93，少女比例约 7 头身）----------
const qE=(x,y,z,o='YXZ')=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,o));
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const A_POSE=V3(.36,-.93,.03).normalize(); // 静止姿：手臂自然下垂外展
// 正向运动学：参数 → 关节位置 + 10 根蒙皮骨骼的世界帧（原点 O、旋转 Q）
function fk(k){
  const qRoot=qE(0,k.yaw,0),qP=qRoot.clone().multiply(qE(k.lean,0,0));
  const qC=qP.clone().multiply(qE(k.chF,k.chT,k.chS)),qH=qC.clone().multiply(qE(k.nod,k.turn,k.tilt));
  const P=V3(0,k.hipY,0),Wst=P.clone().add(V3(0,.08,0).applyQuaternion(qP));
  const N=Wst.clone().add(V3(0,.20,0).applyQuaternion(qC)),Hb=N.clone().add(V3(0,.033,0).applyQuaternion(qC));
  const head=Hb.clone().add(V3(0,.052,.008).applyQuaternion(qH));
  const bones=[{O:Wst,Q:qP.clone().slerp(qC,.5)},{O:Wst,Q:qC},{O:N,Q:qC.clone().slerp(qH,.5)},{O:Hb,Q:qH}];
  const arm=s=>{
    const m=v=>V3(s*v[0],v[1],v[2]),r0=m([A_POSE.x,A_POSE.y,A_POSE.z]);
    const uL=k['u'+s].clone(),fL=k['f'+s].clone(),hL=fL.clone().add(V3(0,.22,0)).normalize();
    const qUA=new THREE.Quaternion().setFromUnitVectors(r0,uL),qCl=qC.clone().multiply(new THREE.Quaternion().slerp(qUA,.35));
    const clO=Wst.clone().add(V3(s*.012,.172+.006*k.e,-.008).applyQuaternion(qC)),sh=clO.clone().add(V3(s*.071,.011,.004).applyQuaternion(qCl));
    clav.push({O:clO,Q:qCl});
    const u=uL.clone().applyQuaternion(qC),f=fL.clone().applyQuaternion(qC),hd=hL.clone().applyQuaternion(qC);
    const el=sh.clone().addScaledVector(u,.152),wr=el.clone().addScaledVector(f,.138),tip=wr.clone().addScaledVector(hd,.07);
    const Q=d=>qC.clone().multiply(new THREE.Quaternion().setFromUnitVectors(r0,d));
    bones.push({O:sh,Q:Q(uL)},{O:el,Q:Q(fL)},{O:wr,Q:Q(hL)});
    return{sh,el,wr,tip,u,f,hd};
  };
  const clav=[],L=arm(1),Rr=arm(-1);bones.push(...clav); // 骨 10/11 = 左/右锁骨
  return{e:k.e,yaw:k.yaw,qRoot,qP,qC,qH,P,W:Wst,N,head,L,R:Rr,bones};
}
// 木头心段的拍点呼吸：每拍缓进缓出、占 85% 拍长，与真实时间 35% 混合——流畅为主、拍点处略有收放
const ALLB=voc.beats;
function poseTime(t){const cw=saturate((t-27.55)/.3)*saturate((36.9-t)/.3);if(cw<=0)return t;
  let i=0;while(i+1<ALLB.length&&ALLB[i+1]<=t)i++;const b0=ALLB[i],b1=ALLB[i+1]??b0+.4,u=saturate((t-b0)/((b1-b0)*.85)),tq=b0+(b1-b0)*(u*u*(3-2*u));
  return lerp(t,tq,.35*cw);} // 用户否决定格卡点（「女性舞蹈，不是卡点街舞」）：只留轻微的拍点呼吸
const bump=(x,w)=>x<0||x>w?0:Math.sin(Math.PI*x/w);
function yawEff(t){return yawC(poseTime(t))-.32*bump(t-34.97,.42);} // 「拍」字踩错：一顿一偏再摆正
function skeleton(t0){
  // 重叠动作：头晚胸 0.06s，前臂晚上臂 0.05s
  const t=poseTime(t0),e=energy(t0),bp=beatPulse(t0),th=poseTime(t0-.06),breath=.03*e,trip=bump(t0-34.97,.42); // 唱时胸腔上提（后仰为负）
  const sk=fk({e,yaw:yawEff(t0),hipY:curves.hipY(t)+.004*bp-.003*Math.sin(t0*1.9)-.012*trip,lean:curves.lean(t)+.1*trip,
    chF:curves.chF(t)-breath,chT:curves.chT(t),chS:curves.chS(t),nod:curves.nod(th),turn:curves.turn(th),tilt:curves.tilt(th),
    u1:vec(curves.uL,t),f1:vec(curves.fL,poseTime(t0-.05)),'u-1':vec(curves.uR,t),'f-1':vec(curves.fR,poseTime(t0-.05))});
  sk.t=t0;return sk;
}
const REST=fk({e:0,yaw:0,hipY:.5,lean:0,chF:0,chT:0,chS:0,nod:0,turn:0,tilt:0,
  u1:A_POSE.clone(),f1:A_POSE.clone(),'u-1':V3(-A_POSE.x,A_POSE.y,A_POSE.z),'f-1':V3(-A_POSE.x,A_POSE.y,A_POSE.z)});
// 纱裙下摆的扭转滞后：对 yaw 做二阶弹簧，从窗口前 1.5s 积分到 t（与 seek 无关）
function hemState(t){
  let a=yawEff(-1.5),v=0;const dt=1/240,k=38,c=7.5; // 从全曲起点积分：任何分段渲染结果一致
  for(let s=-1.5;s<t;s+=dt){const acc=k*(yawEff(s)-a)-c*v;v+=acc*dt;a+=v*dt;}
  const w=(yawEff(t+.01)-yawEff(t-.01))/.02;
  return{lag:a,omega:w};
}

// ---------- 粒子定义（初始化一次，参数化存储）----------
const R=rng(20261030),parts=[];
// kind: 0 躯干 1 颈 2 头 3 发 4 发髻 5 上臂 6 前臂 7 手 8 纱裙 9 纱袖 10 地面光环 11 球内微尘 12 歌声光点
function add(kind,n,gen){for(let i=0;i<n;i++)parts.push({kind,...gen(i)});}
const surf=()=>R()<.8?.86+R()*.14:Math.sqrt(R());
const BODY=buildSoftBody(R,40000);
add(13,BODY.n,i=>({b:i}));
// 发丝：从发际线（额前高、耳侧平、后颈低）沿头皮向上梳到后脑发髻，每缕 25 粒
// 发型（参照塞蕾娜锚：银发盘起）：发际线→后脑发髻的发丝，左侧分、头顶与后脑蓬起；发际处渐隐避免头盔边
{const bun=V3(0,.62,-.78).normalize(),part=.32;for(let k=0;k<190;k++){const th=R()*Math.PI*2,c=Math.cos(th),el=c>0?lerp(-.08,.4,c):lerp(-.08,-.5,-c);
  const st=V3(Math.sin(th)*Math.cos(el),Math.sin(el),c*Math.cos(el)),side=Math.sign(st.x-part)||1;
  const mid=st.clone().add(bun).normalize().add(V3(side*.18*Math.max(0,c),.25,0)).normalize(),jit=R()*.03,sheen=.75+.5*R();
  add(3,26,i=>{const u=(i+R())/26,a=u<.5?st.clone().lerp(mid,u*2):mid.clone().lerp(bun,(u-.5)*2);a.normalize();
    const top=Math.max(0,a.y);return{x:a.x,y:a.y,z:a.z,r:1.07+(.1+.08*top)*Math.sin(Math.PI*u)+jit,fade:Math.min(1,u*3.5)**1.5,sheen};});}}
// 螺旋发髻：30 缕从外缘绕向中心
for(let k=0;k<36;k++){const f0=k/36*Math.PI*2;add(4,55,i=>{const u=(i+R())/55;return{th:Math.acos(1-2*u),f:f0+u*Math.PI*5,j:R()*.08};});}
// 鬓边卷发：两侧各 3 缕，从太阳穴垂到下颌下方，随头部动作滞后摆动
for(const side of [1,-1])for(let k=0;k<2;k++){const ph=R()*6.28,off=(k-.5)*.003;add(14,160,i=>({side,u:(i+R())/130,ph,off}));}
for(const side of [1,-1]){
  add(9,2600,()=>({side,s:.35+R()*.65,k:Math.pow(R(),.8),a:R()*2-1}));
}
add(8,17000,()=>({v:Math.pow(R(),.85),a:R()*Math.PI*2,r:R()<.75?.9+R()*.12:Math.sqrt(R()),eye:R()<.035}));
add(10,2600,()=>({a:R()*Math.PI*2,r:.16+Math.pow(R(),1.5)*.22,y:R()}));
add(11,900,()=>{let x,y,z;do{x=R()*2-1;y=R()*2-1;z=R()*2-1;}while(x*x+y*y+z*z>1);return{x,y,z,ph:R()*6.28,sp:.3+R()*.7};});
// 歌声光点：人声超过门限时按能量概率发射（固定种子），位置在发射时刻的唇边
const sparks=[];{for(let t=T0-1;t<T1;t+=1/120){const e=energy(t);
  if(e>.18&&R()<(e-.18)*1.15){const sk=skeleton(t),fwd=new THREE.Vector3(0,-.42,1).applyQuaternion(sk.qH).normalize();
    sparks.push({t0:t,p:sk.head.clone().addScaledVector(fwd,.085),d:new THREE.Vector3(R()*2-1,R()*.8+.3,R()*2-1).multiplyScalar(.06).addScaledVector(fwd,.12),
      life:1.1+R()*.9,ph:R()*6.28,size:.8+R()*1.2});}}}
const NS=sparks.length,DROP_N=90;
const NP=parts.length+NS+DROP_N,DROP_I=parts.length+NS;

// ---------- WebGL 粒子层 ----------
const S=1024,pc=document.createElement('canvas');pc.width=pc.height=S;
const pc2=document.createElement('canvas');pc2.width=W;pc2.height=H;
const renderer2=new THREE.WebGLRenderer({canvas:pc2,alpha:true,antialias:false,preserveDrawingBuffer:true});
renderer2.setPixelRatio(1);renderer2.setSize(W,H,false);renderer2.setClearColor(0,0);
const camCU=new THREE.PerspectiveCamera(26,W/H,.05,20);
const renderer=new THREE.WebGLRenderer({canvas:pc,alpha:true,antialias:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(S,S,false);renderer.setClearColor(0,0);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(26,1,.1,20);
const CAM_Y=.55,CAM_D=3.0;cam.position.set(0,CAM_Y+.07,CAM_D);cam.lookAt(0,CAM_Y,0);
const halfH=CAM_D*Math.tan(13*Math.PI/180); // 渲染方框半高 = 球半径（世界单位）
const pos=new Float32Array(NP*3),col=new Float32Array(NP*3),siz=new Float32Array(NP);
const geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setAttribute('size',new THREE.BufferAttribute(siz,1));
const mat=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,
  uniforms:{scale:{value:S/1024}},
  vertexShader:`attribute float size;varying vec3 vC;uniform float scale;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale*2.3*3.2/-mv.z;gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.;float a=exp(-r*3.2);if(a<.01)discard;gl_FragColor=vec4(vC*a,1.);}`});
scene.add(new THREE.Points(geo,mat));
// ---------- 发光肖像面片：贴合粒子头部曲面的浮雕网格 + 肖像贴图，着色器画成细密闪烁光点（脸部细节不受粒子数限制）----------
const faceMesh=(()=>{const NX=80,NY=96,x0=-.05,x1=.05,y0=-.072,y1=.062,hc=REST.head;
  const pos=[],uv=[],wt=[],idx=[],map=new Int32Array((NX+1)*(NY+1)).fill(-1);
  for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const x=lerp(x0,x1,i/NX),y=lerp(y0,y1,j/NY);
    let z=.09,hit=false;for(let k=0;k<80;k++){const d=BODY.headSdf(hc.x+x,hc.y+y,hc.z+z);if(d<.0003){hit=true;break;}z-=Math.max(d*.9,.0006);if(z<-.01)break;}
    if(!hit)continue;const w=saturate((z-.006)/.02)*saturate((.06-Math.hypot(x*.9,y*.75))/.012);if(w<=0)continue;
    map[j*(NX+1)+i]=pos.length/3;pos.push(hc.x+x,hc.y+y,hc.z+z+.0008);
    uv.push((FACE.cx+x*FACE.sx)/FACE.w,1-(FACE.cy-y*FACE.sy)/FACE.h);wt.push(w);}
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=map[j*(NX+1)+i],b=map[j*(NX+1)+i+1],c=map[(j+1)*(NX+1)+i],d=map[(j+1)*(NX+1)+i+1];
    if(a<0||b<0||c<0||d<0)continue;idx.push(a,b,d,a,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('w',new THREE.Float32BufferAttribute(wt,1));g.setIndex(idx);g.computeVertexNormals();
  const tex=new THREE.Texture(faceImg);tex.needsUpdate=true;tex.colorSpace=THREE.NoColorSpace;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.anisotropy=4;
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{map:{value:tex},open:{value:0},wide:{value:0},t:{value:0},gain:{value:1},L:{value:V3(-.5,.72,.48).normalize()},mouth:{value:new THREE.Vector2(522/FACE.w,1-435/FACE.h)}},
    vertexShader:`attribute float w;varying vec2 vUv;varying float vW;varying vec3 vN;void main(){vUv=uv;vec3 nv=normalize(normalMatrix*normal);vW=w*smoothstep(.32,.72,nv.z);vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D map;uniform float open,wide,t,gain;uniform vec3 L;uniform vec2 mouth;varying vec2 vUv;varying float vW;varying vec3 vN;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec2 uv=vUv;float wf=wide>0.?1.+.16*wide:1.+.32*wide;
        float dx0=(uv.x-mouth.x)/.046,dy=uv.y-mouth.y,f=(1.-smoothstep(.035,.075,abs(dy)))*(1.-smoothstep(1.05,1.6,abs(dx0)));
        uv.x=mix(uv.x,mouth.x+(uv.x-mouth.x)/wf,f);float dx=(uv.x-mouth.x)/(.046*wf);
        float lens=sqrt(max(0.,1.-dx*dx)),gap=open*.021*lens*(wide<0.?1.25:1.);vec3 inner=vec3(0.);float inMouth=0.;
        if(abs(dx)<1.){if(abs(dy)<gap){inMouth=1.;float k=dy/max(gap,1e-4);
            inner=vec3(.28,.09,.09)*(.6+.4*(1.-abs(k)));}  // 不画牙：唱 i 时唇几乎遮住牙，亮带读成一排假牙
          else if(abs(dy)<.06)uv.y-=sign(dy)*gap*(1.-(abs(dy)-gap)/(.06-gap));}
        vec3 col=mix(texture2D(map,uv).rgb,inner,inMouth);float dark=1.;float d=max(0.,dot(normalize(vN),L)),sh=.62+.55*d;
        float n=h(floor(gl_FragCoord.xy)+floor(t*15.)*17.),sp=.3+1.05*smoothstep(.42,1.,n);
        gl_FragColor=vec4(col*sh*sp*gain*.82*vW*vW*dark,1.);}`});
  const o=new THREE.Mesh(g,m);o.matrixAutoUpdate=true;scene.add(o);return o;})();

const C={skin:[.82,.88,1],face:[1,.93,.86],hair:[.82,.8,1],gownTop:[.3,.85,.8],gownMid:[.32,.45,1],hem:[1,.82,.48],sleeve:[.45,1,.86],eye:[1,.78,.35],floor:[.55,.8,1],mote:[.7,.85,1],spark:[1,.88,.6]};
const tmp=new THREE.Vector3(),ax=new THREE.Vector3(),bx=new THREE.Vector3();
function basis(d,ref){ax.crossVectors(d,ref);if(ax.lengthSq()<1e-6)ax.set(1,0,0);ax.normalize();bx.crossVectors(ax,d).normalize();}
function limb(a,b,s,ang,r0,r1,rad,ref,out){
  const d=tmp.subVectors(b,a);const L=d.length();d.multiplyScalar(1/L);basis(d,ref);
  const rr=lerp(r0,r1,s)*rad;out.copy(a).addScaledVector(d,L*s).addScaledVector(ax,Math.cos(ang)*rr).addScaledVector(bx,Math.sin(ang)*rr);return out;
}
function put(i,p,c,size,gain=1){pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;col[i*3]=c[0]*gain;col[i*3+1]=c[1]*gain;col[i*3+2]=c[2]*gain;siz[i]=size;}
const mixC=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];

function buildParticles(t){
  const sk=skeleton(t),hem=hemState(t),e=sk.e,bp=beatPulse(t),frames=BODY.frames(sk),nrm=new THREE.Vector3(),hb=heartbeat(t),ws=woodState(t);
  {const hb=sk.bones[3];faceMesh.quaternion.copy(hb.Q);faceMesh.position.copy(hb.O).sub(REST.bones[3].O.clone().applyQuaternion(hb.Q));
   const u=faceMesh.material.uniforms;const mo=mouthSmooth(t);u.open.value=mo.open;u.wide.value=mo.wide;u.t.value=t;u.gain.value=t<GATHER_END?saturate((t-8.2)/1.2):1-saturate((t-BURST)/.25);}
  const spin=saturate(Math.abs(hem.omega)/7);
  // 纱袖用过去时刻的手臂（拖尾）
  const past=[0,.04,.08,.12,.17,.22].map(d=>skeleton(t-d));
  const fwdC=new THREE.Vector3(0,0,1).applyQuaternion(sk.qC),upC=new THREE.Vector3(0,1,0).applyQuaternion(sk.qC);
  const o=new THREE.Vector3(),q=new THREE.Vector3();let i=0;
  const glowVoice=1+1.3*e;
  for(const p of parts){
    let size=1.25,gain=.55,c=C.skin;
    switch(p.kind){
      case 13:{ // 软体：两骨线性蒙皮，法线随主骨旋转；皮肤/胸衣分材质
        const j=p.b,m=BODY.mat[j];BODY.skin(j,frames,o,nrm,e);
        const sh=shade(nrm,m===1?SH.bodice:m===2?SH.trim:SH.skin,.15,m===0?.16:.32);c=sh.c;
        gain=(m===0?.76:m===1?.6:.95)*sh.v*(m===0&&BODY.glow[j]?glowVoice:1);size=.95;
        if(hb>0&&BODY.heart[j]>.01){const k=hb*BODY.heart[j];gain*=1+3.6*k;c=mixC(c,[1,.7,.42],.75*k);}
        if(ws.amt>0){const q=BODY.dbg.P[j],d=Math.hypot(q.x-.03,q.y-.684,q.z-.04),wm=ws.amt*saturate((ws.R-d)/.03);
          if(wm>0){const grain=.5+.5*Math.sin(q.y*260+6*Math.sin(q.x*40+q.z*30)),crack=Math.abs(Math.sin(q.x*118+q.y*71+q.z*53))<.05;
            const wc=mixC(WOOD_D,WOOD,grain*grain);c=mixC(c,wc.map(x=>x*1.15),wm);gain*=1-.5*wm;
            if(crack){c=mixC(c,ws.burst>0?[1,.85,.5]:[.08,.05,.03],wm);gain*=ws.burst>0?1+5*ws.burst:1-.6*wm;}}}
        if(BODY.head[j]===3){size=.8;gain*=.62;const ft=BODY.FT[j];gain*=BODY.FM[j];if(ft){const tc=FACE_TINT[ft];c=[c[0]*tc[0],c[1]*tc[1],c[2]*tc[2]];}
          const pw=BODY.PW[j];if(pw>0){const L=(sh.c[0]+sh.c[1]+sh.c[2])/2.62*1.15,pc=BODY.PC;
            c=[lerp(c[0],pc[j*3]*L,pw),lerp(c[1],pc[j*3+1]*L,pw),lerp(c[2],pc[j*3+2]*L,pw)];gain*=1-.42*pw*pw*pw;}}break;}
      case 3:{o.set(p.x*.046*p.r,p.y*.052*p.r+.008,p.z*.05*p.r-.006);nrm.set(p.x,p.y,p.z).applyQuaternion(sk.qH);o.applyQuaternion(sk.qH).add(sk.head);
        const sh=shade(nrm,SH.hair);c=sh.c;gain=.55*sh.v*p.fade*p.sheen;size=.95;break;}
      case 14:{ // 鬓边卷发：根部随头，越往下越晚（取过去时刻的头），螺旋小卷
        const u=p.u,lagI=Math.min(past.length-2,u*3.2),j=Math.floor(lagI),w=lagI-j,H0=past[j],H1=past[j+1];
        const root=V3(p.side*.036+p.off,-.002,.02),r0=root.clone().applyQuaternion(H0.qH).add(H0.head),r1=root.clone().applyQuaternion(H1.qH).add(H1.head);
        o.copy(r0).lerp(r1,w);const curl=.0045*u,ang=u*22+p.ph;
        o.y-=.05*u;o.add(V3(p.side*(.004*u+curl*Math.cos(ang)),0,curl*Math.sin(ang)+.004*u).applyQuaternion(sk.qRoot));
        nrm.set(p.side*.7,0,.7).applyQuaternion(sk.qRoot).normalize();const sh=shade(nrm,SH.hair);c=sh.c;gain=.75*sh.v*(1-.35*u);size=1.05;break;}
      case 4:{const st=Math.sin(p.th);nrm.set(st*Math.cos(p.f),Math.cos(p.th),st*Math.sin(p.f));const rr=.029*(1+p.j);
        o.set(nrm.x*rr,.05+nrm.y*rr*.85,-.054+nrm.z*rr*.9);nrm.applyQuaternion(sk.qH);o.applyQuaternion(sk.qH).add(sk.head);
        const sh=shade(nrm,SH.hair);c=sh.c;gain=.6*sh.v;break;}
      case 8:{ // 纱裙：腰→地面，扭转滞后 + 旋转外扬 + 褶
        const v=p.v,yaw=lerp(sk.yaw,hem.lag,Math.pow(v,1.4));
        let rad=(.054+.03*Math.min(1,v/.15)+.19*Math.pow(v,1.35))*(1+.42*spin*v*v);
        rad*=1+.07*Math.sin(p.a*8+v*2.5+t*1.6)+.03*Math.sin(p.a*3-t*2.1);
        const top=sk.W,yy=lerp(top.y-.01,.006,v)+.07*spin*v*v*v;
        const cx=lerp(top.x,0,v),cz=lerp(top.z,0,v),ang=p.a+yaw;
        o.set(cx+Math.sin(ang)*rad*p.r,yy,cz+Math.cos(ang)*rad*.86*p.r);
        const base=p.eye?C.eye:v<.5?mixC(C.gownTop,C.gownMid,v/.5):mixC(C.gownMid,C.hem,Math.pow((v-.5)/.5,3));
        nrm.set(Math.sin(ang),.25+.3*spin,Math.cos(ang)).normalize();const sh=shade(nrm,{lit:base,dark:mixC(base,[.15,.12,.4],.6),rim:[.6,.85,1]},.3);
        c=sh.c;gain=(p.eye?.9:.62)*(1+.3*spin)*(v>.94?1.5:1)*sh.v;size=v>.94?1.4:1.1;break;}
      case 9:{ // 纱袖：从上臂中段到手腕垂下的半透明纱，取过去时刻手臂形成拖尾
        const j=Math.min(past.length-2,Math.floor(p.k*(past.length-1))),u=p.k*(past.length-1)-j;
        const A0=p.side>0?past[j].L:past[j].R,A1=p.side>0?past[j+1].L:past[j+1].R;
        const s=p.s,pa=s<.5?q.copy(A0.sh).lerp(A0.el,s*2):q.copy(A0.el).lerp(A0.wr,(s-.5)*2);
        const pb=s<.5?tmp.copy(A1.sh).lerp(A1.el,s*2):tmp.copy(A1.el).lerp(A1.wr,(s-.5)*2);
        o.copy(pa).lerp(pb,u);o.y-=(.03+.13*p.k*p.k)*(.4+s)*(1-.5*spin);o.x+=p.a*.012;o.z+=p.a*.01;
        c=C.sleeve;gain=.17*(1-p.k*.7);size=1.3;break;}
      case 10:{const a=p.a+t*.35;o.set(Math.sin(a)*p.r,.002+p.y*.006,Math.cos(a)*p.r*.86);c=C.floor;gain=.22*(1+.9*bp)*(1+.6*e);size=1.3;break;}
      case 11:{const ww=t*.12*p.sp;o.set(p.x*.62+Math.sin(ww+p.ph)*.05,CAM_Y+p.y*.6+Math.sin(ww*.7+p.ph)*.04,p.z*.4);c=C.mote;gain=.25+.35*Math.max(0,Math.sin(t*2.2*p.sp+p.ph));size=1.1+.6*p.sp;break;}
    }
    if(p.skip){put(i++,o.set(0,-9,0),[0,0,0],0);continue;}
    if(t<GATHER_END&&GATHERS.has(p.kind)){const g=gather(i,o,c,gain,size,t);c=g.c;gain=g.gain;size=g.size;}
    else if(p.kind===10&&t<GATHER_END)gain*=saturate((t-4.5)/2);
    if(t>BURST){const a=t-BURST,k=1-Math.exp(-a*2.4),r0=Math.hypot(o.x,o.z),th=Math.atan2(o.x,o.z)+a*(2.2+1.5*rnd(i,7));
      const rr=lerp(r0,.62*Math.sqrt(rnd(i,8)),k),yy=lerp(o.y,CAM_Y+(rnd(i,9)-.5)*.8,k); // 实心旋转光云（只外推会留下中空甜甜圈）o.set(Math.sin(th)*rr,yy,Math.cos(th)*rr);
      c=mixC(c,[1,.92,.75],Math.min(1,a*1.5));gain*=(1+1.5*Math.exp(-a*3))*saturate((54.2-t)/1.1);}
    // 微颤：粒子不是硬表面
    const ph=i*1.618;o.x+=.0018*Math.sin(t*3.1+ph);o.y+=.0018*Math.sin(t*2.7+ph*1.3);o.z+=.0018*Math.sin(t*2.3+ph*.7);
    put(i++,o,c,size,gain*(.8+.4*fract(ph*7.13)));
  }
  {const dt0=t-31.05;for(let k=0;k<DROP_N;k++){const id=DROP_I+k;
    if(dt0<0||t>33.3){put(id,o.set(0,-9,0),[0,0,0],0);continue;}
    const hand=sk.L.wr.clone().lerp(sk.R.wr,.5).add(V3(0,.03,.02)),u=saturate(dt0/1.32),top=V3(.02,1.25,.05);
    const p=u<1?top.clone().lerp(hand,u*u):hand,a=k/DROP_N*6.28,r=.012*(1-u*.4)+.004*Math.sin(t*9+k);
    o.copy(p).add(V3(Math.cos(a)*r,Math.sin(a*2)*r*.6+(u<1?.03*(k/DROP_N):0),Math.sin(a)*r*.5));
    put(id,o,[1,.86,.55],2+(k%3)*.6,2*(1-saturate((t-32.9)/.4)));}}
  for(const s of sparks){
    const a=t-s.t0;if(a<0||a>s.life){put(i++,o.set(0,-9,0),[0,0,0],0);continue;}
    const u=a/s.life;o.copy(s.p).addScaledVector(s.d,a).add(q.set(.02*Math.sin(a*4+s.ph),.05*a*a,0));
    put(i++,o,C.spark,s.size*(CU_MODE?.5:1.5)*(1+.5*(1-u)),1.4*saturate(a/.18)*Math.sin(Math.PI*Math.min(1,u*3))*(1-u));
  }
  geo.attributes.position.needsUpdate=geo.attributes.color.needsUpdate=geo.attributes.size.needsUpdate=true;
  return sk;
}

// ---------- 心跳（半速拍上的「咚-咚」双击，20–27.4 渐入渐出）----------
function heartbeat(t){const win=saturate((t-19.8)/.6)*saturate((27.4-t)/.5);if(win<=0)return 0;let p=0;
  for(const b of beats){const d=t-b;if(d>=0&&d<.6)p=Math.max(p,Math.exp(-d*14)+.7*Math.exp(-Math.max(0,d-.17)*14)*(d>.17?1:0));}return win*Math.min(1,p);}
// ---------- 木头心 ----------
function woodState(t){const grow=saturate((t-27.68)/2.2),amt=.62*saturate((t-27.62)/.25)*(1-.3*bump(t-32.37,1.3))*(1-saturate((t-39.75)/1.1));
  return{amt,R:.03+.24*grow*grow*(3-2*grow),burst:t>39.7?Math.exp(-(t-39.75)/.5)*saturate((t-39.7)/.05):0};}
const WOOD=[.6,.4,.22],WOOD_D=[.32,.19,.1];
// 心口闷响：「咚」「嗒」为木色闷光；「一二三」逐次变亮；「三」爆开
const THUMPS=[[27.68,.8,1],[31.05,.6,1],[38.96,.55,0],[39.52,.75,0],[39.75,1.4,0]];
function thump(t){let p=0,wood=0;for(const [b,a,w] of THUMPS){const d=t-b;if(d>=0&&d<.8){const v=a*Math.exp(-d*6);if(v>p){p=v;wood=w;}}}return{p,wood};}
// ---------- 前奏聚拢 ----------
const GATHER_END=11,GATHERS=new Set([13,3,4,14,8,9]);
const rnd=(i,k)=>fract(Math.sin(i*12.9898+k*78.233)*43758.5453);
function gather(i,o,c,gain,size,t){
  const hN=saturate(o.y/1.1),arrive=4.3+3.9*hN+.8*(rnd(i,1)-.5),D=2.4,u=saturate((t-(arrive-D))/D);
  // 出发点：球内随机（固定种子），慢漂
  const sx=(rnd(i,2)*2-1)*.55,sy=CAM_Y+(rnd(i,3)*2-1)*.55,sz=(rnd(i,4)*2-1)*.3,dr=t*.15+rnd(i,5)*6.28;
  const Sx=sx+.03*Math.sin(dr),Sy=sy+.03*Math.sin(dr*.7+1),Sz=sz;
  if(u<=0){o.set(Sx,Sy,Sz);const tw=.5+.5*Math.sin(t*1.7+rnd(i,6)*6.28);return{c:C.mote,gain:(.06+.22*saturate((t-1)/3))*tw,size:1};}
  const e=u*u*(3-2*u);
  if(u<1){const rs=Math.hypot(Sx,Sz),ts=Math.atan2(Sx,Sz),rt=Math.hypot(o.x,o.z),tt=Math.atan2(o.x,o.z);
    let dth=tt-ts;dth-=Math.round(dth/(2*Math.PI))*2*Math.PI;
    const th=ts+dth*e+3.2*e*(1-e),r=lerp(rs,rt,e)*(1+.6*Math.sin(Math.PI*e)),y=lerp(Sy,o.y,e);
    o.set(Math.sin(th)*r,y,Math.cos(th)*r);
    return{c:mixC([.75,.88,1],c,e),gain:lerp(.25,gain,e)*(1+.8*Math.sin(Math.PI*e)),size:lerp(1.1,size,e)};}
  const fl=Math.exp(-(t-arrive)/.35);return{c:mixC(c,[1,1,1],.5*fl),gain:gain*(1+1.4*fl),size};
}
// 躯干截面：s=0 腰 → s=1 颈根；宽度在肩线后迅速收向颈根形成斜肩
const fract=x=>x-Math.floor(x);
function torsoW(s){if(s<.88)return s<.5?lerp(.044,.064,s/.5):lerp(.064,.083,(s-.5)/.38);return lerp(.083,.026,Math.pow((s-.88)/.12,.55));}
function torsoD(s){return s<.55?lerp(.036,.05,s/.55):s<.88?lerp(.05,.04,(s-.55)/.33):lerp(.04,.02,(s-.88)/.12);}
// ---------- 软体：平滑融合的隐式曲面（少女体），粒子撒在等值面上，按骨距离两骨蒙皮 ----------
// 骨序：0 腰 1 胸 2 颈 3 头 4/7 上臂 5/8 前臂 6/9 手 10/11 锁骨（左/右）
function buildSoftBody(R,n){
  const r=REST,v=(a,b,c)=>V3(a,b,c),hc=r.head;
  const P=[]; // {k:'e' 椭球 | 'c' 变径胶囊, bone, zone(1=躯干可着衣)}
  const ell=(c,rad,bone,zone=0,bk)=>P.push({k:'e',c,rad,bone,zone,bk});
  const cap=(a,b,r1,r2,bone,zone=0,bk)=>P.push({k:'c',a,b,r1,r2,bone,zone,bk});
  ell(v(0,.578,0),v(.054,.032,.041),0,1);                                  // 髋顶（接裙）
  ell(v(0,.615,0),v(.046,.05,.037),0,1);                                  // 腰
  ell(v(0,.68,-.004),v(.061,.064,.044),1,1);                               // 胸廓
  for(const s of [1,-1])ell(v(s*.029,.671,.027),v(.026,.024,.022),1,1);     // 胸
  cap(v(-.03,.752,-.01),v(.03,.752,-.01),.022,.022,1,1);                    // 肩带中段（胸骨上）
  for(const s of [1,-1]){const cl=s>0?10:11;
    cap(v(s*.016,.79,-.012),v(s*.045,.772,-.012),.016,.018,2,1,.03);        // 斜方肌内段：颈根斜下
    cap(v(s*.04,.774,-.01),v(s*.078,.752,-.004),.019,.018,cl,1,.04);         // 斜方肌外段→肩峰外侧（锁骨骨），盖住上臂根
    ell(v(s*.052,.713,.018),v(.024,.03,.018),1,1,.03);                       // 胸大肌边缘（腋前褶）
    ell(v(s*.05,.713,-.022),v(.022,.034,.02),1,1,.03);}                      // 背阔肌（腋后褶）
  cap(v(0,.765,-.006),v(0,.818,.003),.021,.018,2);                         // 颈
  ell(hc.clone().add(v(0,.008,-.006)),v(.043,.049,.047),3);                 // 颅
  ell(hc.clone().add(v(0,-.019,.012)),v(.034,.039,.036),3);                 // 面颊与下颌
  ell(hc.clone().add(v(0,-.05,.022)),v(.012,.011,.011),3);                  // 下巴
  ell(hc.clone().add(v(0,-.006,.048)),v(.0055,.011,.008),3);                // 鼻
  for(const [s,A,b0] of [[1,r.L,4],[-1,r.R,7]]){
    ell(A.sh.clone().add(v(s*.001,-.022,0)),v(.022,.043,.022),b0,1,.042);   // 三角肌：顺上臂拉长，包住上臂上三分之一
    cap(A.sh,A.el,.018,.0165,b0);cap(A.el,A.wr,.0185,.012,b0+1);
    const pm=A.wr.clone().addScaledVector(A.hd,.034);cap(A.wr,pm,.0115,.0105,b0+2);cap(pm,A.tip,.0085,.004,b0+2);
  }
  const k=.022;
  const smin=(a,b,kk=k)=>{const h=Math.max(kk-Math.abs(a-b),0)/kk;return Math.min(a,b)-h*h*kk*.25;}; // 肩部体块用更大的融合半径
  const prim=(q,p)=>{
    if(p.k==='e'){const x=(q.x-p.c.x)/p.rad.x,y=(q.y-p.c.y)/p.rad.y,z=(q.z-p.c.z)/p.rad.z,k0=Math.hypot(x,y,z),
      k1=Math.hypot(x/p.rad.x,y/p.rad.y,z/p.rad.z);return k1<1e-9?-Math.min(p.rad.x,p.rad.y,p.rad.z):k0*(k0-1)/k1;}
    const bax=p.b.x-p.a.x,bay=p.b.y-p.a.y,baz=p.b.z-p.a.z,pax=q.x-p.a.x,pay=q.y-p.a.y,paz=q.z-p.a.z;
    const h=saturate((pax*bax+pay*bay+paz*baz)/(bax*bax+bay*bay+baz*baz));
    return Math.hypot(pax-bax*h,pay-bay*h,paz-baz*h)-lerp(p.r1,p.r2,h);};
  const sdf=q=>{let d=1e9;for(const p of P)d=smin(d,prim(q,p),p.bk);return d;};
  const ge=.0007,tq=V3(0,0,0);
  const sd=(x,y,z)=>sdf(tq.set(x,y,z));
  const grad=(q,out)=>out.set(sd(q.x+ge,q.y,q.z)-sd(q.x-ge,q.y,q.z),sd(q.x,q.y+ge,q.z)-sd(q.x,q.y-ge,q.z),sd(q.x,q.y,q.z+ge)-sd(q.x,q.y,q.z-ge)).normalize();
  const area=P.map(p=>(p.bone===3?3.2:1)*(p.k==='e'?4*Math.PI*((p.rad.x*p.rad.y+p.rad.y*p.rad.z+p.rad.z*p.rad.x)/3):Math.PI*(p.r1+p.r2)*p.a.distanceTo(p.b)+2*Math.PI*p.r1*p.r1));
  const tot=area.reduce((a,b)=>a+b,0);
  const rest=r.bones.map(b=>({O:b.O.clone(),Qi:b.Q.clone().invert()})),NB=rest.length;
  const B0=new Uint8Array(n),B1=new Uint8Array(n),W0=new Float32Array(n),L0=new Float32Array(n*3),L1=new Float32Array(n*3),NL=new Float32Array(n*3);
  const PC=new Float32Array(n*3),PW=new Float32Array(n);
  const NC=10,CAND=new Int16Array(n*NC).fill(-1),PROJ=new Uint8Array(n);
  const mat=new Uint8Array(n),glow=new Uint8Array(n),mouth=new Uint8Array(n),DP=[],FM=new Float32Array(n).fill(1),FT=new Uint8Array(n);
  const g=V3(0,0,0),wb=new Float32Array(NB);let i=0,guard=0;
  while(i<n&&guard++<n*20){
    let x=R()*tot,pi=0;while(x>area[pi]&&pi<P.length-1){x-=area[pi];pi++;}
    const p=P[pi];let q;
    if(p.k==='e'){const u=R()*2-1,a=R()*Math.PI*2,s=Math.sqrt(1-u*u);q=V3(p.c.x+p.rad.x*s*Math.cos(a),p.c.y+p.rad.y*u,p.c.z+p.rad.z*s*Math.sin(a));}
    else{const h=R(),d=p.b.clone().sub(p.a),L=d.length();d.normalize();const ax=Math.abs(d.y)<.9?V3(0,1,0):V3(1,0,0),u=ax.clone().cross(d).normalize(),w=d.clone().cross(u);
      const a=R()*Math.PI*2,rr=lerp(p.r1,p.r2,h);q=p.a.clone().addScaledVector(d,L*h).addScaledVector(u,Math.cos(a)*rr).addScaledVector(w,Math.sin(a)*rr);}
    {let other=1e9;for(const pp of P)if(pp!==p)other=Math.min(other,prim(q,pp));if(other<-.004)continue;} // 深埋在另一个体块里才丢弃（融合鼓包不算），避免接缝处堆积又不留缺口
    for(let it=0;it<6;it++){const f=sdf(q);grad(q,g);q.addScaledVector(g,-f);}
    if(Math.abs(sdf(q))>.0008)continue;
    grad(q,g);
    // 蒙皮权重：各体块距离的指数衰减按骨累加，取前两骨
    wb.fill(0);let zone=0,best=1e9;
    for(const pp of P){const d=prim(q,pp);wb[pp.bone]+=Math.exp(-Math.max(0,d)/.013);if(d<best){best=d;zone=pp.zone;}}
    let b0=0;for(let b=1;b<NB;b++)if(wb[b]>wb[b0])b0=b;
    let b1=b0===0?1:0;for(let b=0;b<NB;b++)if(b!==b0&&wb[b]>wb[b1])b1=b;
    B0[i]=b0;B1[i]=b1;W0[i]=wb[b0]/(wb[b0]+wb[b1]);
    const l0=q.clone().sub(rest[b0].O).applyQuaternion(rest[b0].Qi),l1=q.clone().sub(rest[b1].O).applyQuaternion(rest[b1].Qi),nl=g.clone().applyQuaternion(rest[b0].Qi);
    L0[i*3]=l0.x;L0[i*3+1]=l0.y;L0[i*3+2]=l0.z;L1[i*3]=l1.x;L1[i*3+1]=l1.y;L1[i*3+2]=l1.z;NL[i*3]=nl.x;NL[i*3+1]=nl.y;NL[i*3+2]=nl.z;
    // 露肩胸衣：领口线（中间微 V）以下为衣料，领口一线金边
    const neck=.704-.02*Math.max(0,1-Math.abs(q.x)/.045);
    mat[i]=zone===1&&b0<=1&&q.y<neck?(q.y>neck-.0035?2:1):0;
    glow[i]=(b0===2||b0===3||(b0===1&&q.y>.69))?1:0;
    const hr=q.clone().sub(hc);mouth[i]=b0===3&&hr.z>.025&&Math.abs(hr.x)<.015&&hr.y<-.02&&hr.y>-.04?1:0;
    if(b0===3){const fc=faceColor(hr);if(fc){PC[i*3]=fc.c[0];PC[i*3+1]=fc.c[1];PC[i*3+2]=fc.c[2];PW[i]=fc.w;}const fm=faceMap(hr);FM[i]=lerp(fm.mul,1,PW[i]);FT[i]=PW[i]>.5?0:fm.tint;}
    {let c=0;const bs=new Set();for(let pi2=0;pi2<P.length&&c<NC;pi2++)if(prim(q,P[pi2])<.035){CAND[i*NC+c++]=pi2;bs.add(P[pi2].bone);}
     PROJ[i]=bs.size>1&&!(b0===3&&b1===3)?1:0;}
    DP.push(q.clone());i++;
  }
  const O=[],Q=[];for(let b=0;b<NB;b++){O.push(V3(0,0,0));Q.push(new THREE.Quaternion());}
  const a=V3(0,0,0),c=V3(0,0,0),mq=new THREE.Quaternion(),mm=new THREE.Matrix4(),restQ=r.bones.map(b=>b.Q.clone());
  const MB=Array.from({length:NB},()=>new Float64Array(9)),RO=r.bones.map(b=>b.O.clone()),pq=V3(0,0,0),GE=.0008;let gx=0,gy=0,gz=1;
  const psdf=(x,y,z,base)=>{let d=1e9;for(let c2=0;c2<NC;c2++){const pi2=CAND[base+c2];if(pi2<0)break;const p=P[pi2],b=p.bone,m=MB[b],o=O[b],ro=RO[b];
    const dx=x-o.x,dy=y-o.y,dz=z-o.z;pq.set(m[0]*dx+m[1]*dy+m[2]*dz+ro.x,m[3]*dx+m[4]*dy+m[5]*dz+ro.y,m[6]*dx+m[7]*dy+m[8]*dz+ro.z);d=smin(d,prim(pq,p),p.bk);}return d;};
  const hcLocalY=hc.clone().sub(rest[3].O).applyQuaternion(rest[3].Qi).y-.028;
  const heart=new Float32Array(i);for(let j=0;j<i;j++){const q=DP[j];heart[j]=Math.exp(-((q.x-.03)**2+(q.y-.684)**2+(q.z-.04)**2)/(.036*.036));}
  return{n:i,mat,glow,FM,FT,PC,PW,heart,head:B0,headSdf:(x,y,z)=>{tq.set(x,y,z);let d=1e9;for(const p of P)if(p.bone===3)d=smin(d,prim(tq,p),p.bk);return d;},dbg:{B0,P:DP},
    frames(sk){for(let b=0;b<NB;b++){O[b].copy(sk.bones[b].O);Q[b].copy(sk.bones[b].Q);
      // 当前→静止 的逆变换：q_rest = M·(q − O_cur) + O_rest，M = Q_rest·Q_cur⁻¹（展开为 3x3）
      mq.copy(Q[b]).invert().premultiply(restQ[b]);mm.makeRotationFromQuaternion(mq);const e=mm.elements,m=MB[b];
      m[0]=e[0];m[1]=e[4];m[2]=e[8];m[3]=e[1];m[4]=e[5];m[5]=e[9];m[6]=e[2];m[7]=e[6];m[8]=e[10];}
      return{O,Q};},
    skin(j,f,out,nOut,e){
      const b0=B0[j],b1=B1[j],w=W0[j];
      a.set(L0[j*3],L0[j*3+1],L0[j*3+2]);if(mouth[j]&&b0===3)a.y+=(a.y>hcLocalY?1:-1)*.0035*e; // 唱：上下唇随声强分开
      a.applyQuaternion(f.Q[b0]).add(f.O[b0]);c.set(L1[j*3],L1[j*3+1],L1[j*3+2]).applyQuaternion(f.Q[b1]).add(f.O[b1]);
      out.copy(a).multiplyScalar(w).addScaledVector(c,1-w);nOut.set(NL[j*3],NL[j*3+1],NL[j*3+2]).applyQuaternion(f.Q[b0]);
      if(PROJ[j]){ // 当前姿态的融合曲面：腋下/肩头露出的部分由相邻体块自然融合补上
        const base=j*NC;for(let it=0;it<2;it++){const d=psdf(out.x,out.y,out.z,base);
          gx=psdf(out.x+GE,out.y,out.z,base)-psdf(out.x-GE,out.y,out.z,base);gy=psdf(out.x,out.y+GE,out.z,base)-psdf(out.x,out.y-GE,out.z,base);
          gz=psdf(out.x,out.y,out.z+GE,base)-psdf(out.x,out.y,out.z-GE,base);const gl=Math.hypot(gx,gy,gz)||1;gx/=gl;gy/=gl;gz/=gl;
          out.x-=gx*d;out.y-=gy*d;out.z-=gz*d;}
        nOut.set(gx,gy,gz);}}};
}
// 五官（头部静止坐标，相对头心，米）：杏仁眼压暗+上睫毛线+瞳孔+高光点、眉弧、鼻孔、上下唇与唇线、腮红。
// 只调粒子亮度/颜色，不挖洞（R1 挖眼窝读成骷髅）。tint：1 唇 2 腮红 3 眉 4 高光
const FACE_TINT=[null,[1.12,.58,.64],[1.1,.72,.75],[.8,.8,.95],[1.3,1.3,1.4]];
function faceMap(hr){
  if(hr.z<.018)return{mul:1,tint:0};
  const x=Math.abs(hr.x),y=hr.y;
  const ex=(x-.0155)/.0108,ey=(y-.001)/(.0056*(1-.25*ex)),de=ex*ex+ey*ey;
  if(de<1){if(ey>.2&&de>.3)return{mul:.06,tint:0};if(Math.hypot(x-.0155,y-.0005)<.0038)return{mul:.12,tint:0};return{mul:.36,tint:0};}
  const yb=.0138+.003*(1-((x-.017)/.011)**2);
  if(x>.006&&x<.029&&Math.abs(y-yb-.002)<.0021)return{mul:.22,tint:3};
  if(x<.0025&&y<.008&&y>-.014)return{mul:1.35,tint:0}; // 鼻梁高光
  if(Math.hypot(x-.0045,y+.0165)<.0021)return{mul:.4,tint:0};
  const lw=.0128*Math.sqrt(Math.max(0,1-(x/.0138)**2));
  if(x<lw*1.1){if(Math.abs(y+.0335)<.0012)return{mul:.25,tint:1};if(y>-.0335&&y<-.029)return{mul:.85,tint:1};if(y<-.0335&&y>-.0395)return{mul:.92,tint:1};}
  if(Math.hypot(x-.022,y+.014)<.009)return{mul:1,tint:2};
  if(de<2.2)return{mul:.88,tint:0}; // 眼窝柔和阴影
  return{mul:1,tint:0};
}
// 明暗：月光自左上前方；受光暖白、背光冷紫（透光感）、轮廓冷光；背向镜头的粒子压暗，形成实心体积
const LIGHT=V3(-.5,.72,.48).normalize(),VIEW=V3(0,.05,1).normalize();
const SH={skin:{lit:[1,.86,.76],dark:[.36,.3,.72],rim:[.65,.85,1]},bodice:{lit:[.3,.9,.82],dark:[.1,.22,.55],rim:[.5,.9,1]},
  trim:{lit:[1,.85,.5],dark:[.6,.45,.3],rim:[1,.9,.6]},hair:{lit:[.96,.95,1],dark:[.45,.42,.72],rim:[.8,.9,1]}};
const FLAT=location.search.includes('flat');
function shade(n,m,wrap=.15,rimK=.32){
  if(FLAT)return{c:[.8,.8,.8],v:1};
  const d=Math.max(0,(n.dot(LIGHT)+wrap)/(1+wrap)),f=n.dot(VIEW),vis=.1+.9*saturate((f+.3)/.55),rim=Math.pow(1-Math.abs(f),3);
  const k=Math.pow(d,.8),amb=.16+1.05*d,rr=rimK*rim;
  return{c:[lerp(m.dark[0],m.lit[0],k)*amb+m.rim[0]*rr,lerp(m.dark[1],m.lit[1],k)*amb+m.rim[1]*rr,lerp(m.dark[2],m.lit[2],k)*amb+m.rim[2]*rr],v:vis};
}
// ---------- 合成 ----------
const out=document.createElement('canvas');out.width=W;out.height=H;document.body.appendChild(out);
let g=out.getContext('2d',{willReadFrequently:true}); // CPU 光栅：GPU 加速 2D 在大量小粒子绘制下顺序/seek 偶发不一致
const blurC=document.createElement('canvas');blurC.width=blurC.height=S/2;const bg2=blurC.getContext('2d',{willReadFrequently:true});
const CAMK=[[-3,BALL.cx,BALL.cy+95,.97],[0,BALL.cx,BALL.cy+75,1.0],[14,BALL.cx,BALL.cy+38,1.1],[20,BALL.cx,BALL.cy+22,1.2],[23.3,BALL.cx,BALL.cy+12,1.27],[26.2,BALL.cx,BALL.cy+34,1.12],[27.5,BALL.cx,BALL.cy+36,1.1],[29.5,BALL.cx,BALL.cy+26,1.17],[32.4,BALL.cx,BALL.cy+20,1.2],[34.2,BALL.cx,BALL.cy+40,1.07],[36.6,BALL.cx,BALL.cy+38,1.08],[39.2,BALL.cx,BALL.cy+22,1.2],[40.1,BALL.cx,BALL.cy+34,1.1],[40.6,BALL.cx,BALL.cy+40,1.06],[48.6,BALL.cx,BALL.cy+10,1.28],[49.3,BALL.cx,BALL.cy+16,1.24],[52.6,BALL.cx,BALL.cy+40,1.1],[54.0,BALL.cx,BALL.cy+90,1.04],[56.6,BALL.cx,610,1.25],[60,BALL.cx,615,1.7],[64.9,BALL.cx,612,2.25],[71,BALL.cx,560,2.75]];
const camC=[1,2,3].map(j=>monotone(CAMK.map(k=>[k[0],k[j]])));
const ease=u=>u*u*(3-2*u);
function camAt(t){const c=[camC[0](t),camC[1](t),camC[2](t)];return paintedCamera({from:c,to:c},0,0,1,W,H);}
function drawPlate(im,cam,par=1){ // par>1：前景视差（相对中景多推 par 倍）
  const s=cam.scale*par,cx=W/2-(W/2-cam.x)*par,cy=H/2-(H/2-cam.y)*par;
  g.drawImage(im,cx,cy,1920*s,1080*s);}
const CU_END=49.0;let CU_MODE=false; // 近景里歌声光点缩小（否则盖住眼鼻）
const CUT=Number(new URLSearchParams(location.search).get("cut")||Infinity); // 近景切入点（歌曲秒），用 ?cut= 打开
function renderCU(t){
  const e=energy(t),bp=beatPulse(t);
  CU_MODE=true;const sk=buildParticles(t);CU_MODE=false;
  const u=ease(saturate((t-CUT)/(CU_END-CUT))),tg=sk.head.clone().lerp(sk.N,.3);
  const fwd=V3(0,0,1).applyQuaternion(sk.qH).lerp(V3(0,0,1),.35).normalize(),dist=lerp(.5,.43,u); // 镜头沿脸的朝向，始终正对
  camCU.position.copy(tg).addScaledVector(fwd,dist);camCU.lookAt(tg.x,tg.y-.006,tg.z);
  mat.uniforms.scale.value=.42;renderer2.render(scene,camCU);mat.uniforms.scale.value=1;
  // 背景：透过玻璃的舞台，放大虚化（景深）
  // 近景贴着玻璃看：球半径约为画面高的 6 倍，球边应在画外（3.2 倍时球边入画，手臂像伸出球外）
  const cam=paintedCamera({from:[BALL.cx,BALL.cy-20,12]},T0,T0,T1,W,H);
  g.globalCompositeOperation='source-over';g.globalAlpha=1;g.filter='blur(7px)';drawPlate(bg,cam);g.filter='none';
  g.fillStyle='rgba(6,10,24,.35)';g.fillRect(0,0,W,H);
  g.globalCompositeOperation='lighter';
  const rg=g.createRadialGradient(W/2,H*.45,40,W/2,H*.45,W*.7);rg.addColorStop(0,`rgba(80,130,200,${.08+.14*e+.04*bp})`);rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);
  g.globalAlpha=1;g.drawImage(pc2,0,0);g.filter='blur(4px)';g.globalAlpha=.55+.45*e;g.drawImage(pc2,0,0);g.filter='none';
  {const gl=g.createLinearGradient(0,0,W*.6,H);gl.addColorStop(0,'rgba(170,200,255,.10)');gl.addColorStop(.35,'rgba(170,200,255,0)');gl.addColorStop(.62,'rgba(255,220,180,.05)');gl.addColorStop(1,'rgba(0,0,0,0)');
   g.globalAlpha=1;g.fillStyle=gl;g.fillRect(0,0,W,H);} // 玻璃：一层淡斜向反光
  g.globalCompositeOperation='source-over';g.globalAlpha=1;
  const vg=g.createRadialGradient(W/2,H*.45,H*.4,W/2,H*.5,H*1.0);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  return{t,shot:'cu_sing',energy:+e.toFixed(3),yaw:+sk.yaw.toFixed(3)};
}
function render(t){
  if(t>=CUT&&t<CU_END)return renderCU(t);
  const cam=camAt(t),e=energy(t),bp=beatPulse(t);
  const sk=buildParticles(Math.min(t,54.3));if(t<54.3)renderer.render(scene,cam3());
  g.globalCompositeOperation='source-over';g.globalAlpha=1;drawPlate(t<BURST?bg:bgNo,cam);
  const [bx,by]=cam.point([BALL.cx,BALL.cy]),br=BALL.r*cam.scale,ballOn=t<BURST;
  // 球光照亮舞台/帷幕（人声越强越亮）
  g.globalCompositeOperation='lighter';
  const rg=g.createRadialGradient(bx,by+br*.3,br*.2,bx,by+br*.3,br*2.4);
  rg.addColorStop(0,`rgba(90,150,200,${(.10+.16*e+.04*bp)*(1-saturate((t-BURST)/3))})`);rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);
  // 粒子：清晰层 + 柔光层，裁在玻璃内
  g.save();if(ballOn){g.beginPath();g.arc(bx,by,br*.965,0,Math.PI*2);g.clip();}
  const box=br*2;if(t<54.3){g.globalAlpha=1;g.drawImage(pc,bx-br,by-br,box,box);
  bg2.clearRect(0,0,S/2,S/2);bg2.filter='blur(5px)';bg2.drawImage(pc,0,0,S/2,S/2);bg2.filter='none';
  g.globalAlpha=.75+.5*e;g.drawImage(blurC,bx-br,by-br,box,box);}g.restore(); // 54.3 后不再读粒子画布（清空后的 WebGL 画布读回有时序不确定性，曾致 54.5 顺序/seek 不一致）
  // 心跳光晕：心口 3D 点投影到球内画面，随「咚-咚」脉动（暖金，lighter）
  {const th=thump(t),hbv=Math.max(heartbeat(t),th.p);const col=th.p>heartbeat(t)&&th.wood?[200,130,70]:[255,200,130];if(hbv>.01){const hp=sk.W.clone().add(V3(.03,.104,.05).applyQuaternion(sk.qC)).project(cam3());
    const hx=bx-br+(hp.x*.5+.5)*box,hy=by-br+(1-(hp.y*.5+.5))*box,hr=box*.035*(1+.35*Math.min(hbv,1)+1.6*woodState(t).burst);
    const hg=g.createRadialGradient(hx,hy,0,hx,hy,hr);hg.addColorStop(0,`rgba(${col[0]},${col[1]},${col[2]},${Math.min(1,.85*hbv)})`);hg.addColorStop(.35,`rgba(${col[0]},${col[1]-40},${col[2]-40},${Math.min(1,.4*hbv)})`);hg.addColorStop(1,'rgba(0,0,0,0)');
    g.globalCompositeOperation='lighter';g.globalAlpha=1;g.fillStyle=hg;g.fillRect(hx-hr,hy-hr,hr*2,hr*2);}}
  // 玻璃前表面的高光盖在粒子上
  if(ballOn){g.globalAlpha=.9;drawPlate(glass,cam);g.globalAlpha=1;if(t>49.4){drawCracks(t,cam);drawCrackChips(t,cam);}}
  g.globalCompositeOperation='source-over';g.globalAlpha=1;drawShards(t,cam);drawMaiden(t,cam);accBegin();drawGlassDust(t,cam);drawGather(t,cam);drawDust(t,cam);accFlush();
  {const f=flash(t);if(f>.01){g.save();g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,248,235,${.75*f})`;g.fillRect(0,0,W,H);g.restore();}}
  g.globalCompositeOperation='source-over';g.globalAlpha=1;drawPlate(fg,cam,1.06);
  // 暗角
  const vg=g.createRadialGradient(W/2,H*.45,H*.35,W/2,H*.5,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');
  g.fillStyle=vg;g.fillRect(0,0,W,H);
  // 头尾淡入淡出
  const fade=Math.min(saturate((t-SONG_IN)/.8),saturate((SONG_OUT-t)/.8));if(fade<1){g.fillStyle=`rgba(0,0,0,${1-fade})`;g.fillRect(0,0,W,H);}
  return{t,shot:t<BURST?'ball_push':t<REVEAL1?'transform':'maiden',camZ:+cam.z.toFixed(3),energy:+e.toFixed(3),yaw:+sk.yaw.toFixed(3),spin:+saturate(Math.abs(hemState(t).omega)/7).toFixed(3)};
}
function cam3(){return cam;}
// ======== 变身（49–65.2）========
const BURST=52.69,REVEAL0=53.9,REVEAL1=56.52;
const STAND={x:BALL.cx,y:800,h:392}; // 她在铜座前的台面（底图像素），身高按透视
const CELS={stand:celStand,ee:celEE,hands:celHands,joy:celJoy};
for(const id of await json('cels/inb/index.json'))CELS[id]=await img(`cels/inb/${id}.png`); // 清单由 tools/gen_inbetweens.py 生成
CELS.joyClosed=await img('cels/maiden_joy__closed.png');CELS.joyOpen=await img('cels/maiden_joy__open.png');
const EPI=await json('../config/epilogue_env.json');
const CELOFF=await json('../config/outro_cel_offsets.json'); // 裙摆相位相关链式配准（tools: 见 NOTES v3b）
const CELBOX={}; // 各 cel 的不透明包围（头顶/裙摆），按裙摆底对齐、按身高统一
for(const [k,im] of Object.entries(CELS)){if(k==='ee'||k==='joyClosed'||k==='joyOpen')continue;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const d=x.getImageData(0,0,c.width,c.height).data;let top=1e9,bot=0,sx=0,n=0,hx=0,hn=0;
  for(let y=0;y<c.height;y+=2)for(let xx=0;xx<c.width;xx+=2){if(d[(y*c.width+xx)*4+3]>128){top=Math.min(top,y);bot=Math.max(bot,y);if(y>c.height*.8){sx+=xx;n++;}if(y<230){hx+=xx;hn++;}}}
  CELBOX[k]={top,bot,cx:sx/n,hx:hx/hn};}
CELBOX.ee=CELBOX.stand;CELBOX.joyClosed=CELBOX.joyOpen=CELBOX.joy;
// 统一比例 + 裙摆配准：她站着不动，裙摆应钉死；按头对齐会让各张肩宽/身位差异变成整身左右跳
const OFFKEY={ee:'stand',joyClosed:'joy',joyOpen:'joy'};
// 用户选定 v2 手感（「v2 抖的还自然一点」）：统一比例、按头顶与头部中心对齐；v4 的裙摆配准保留在 CELOFF 备查
function celRect(k,cam){const b=CELBOX[k],a=CELBOX.stand,sc=STAND.h/(a.bot-a.top)*cam.scale,[fx,fy]=cam.point([STAND.x,STAND.y]);
  const hx=fx+(a.hx-a.cx)*sc,ty=fy-(a.bot-a.top)*sc;return{x:hx-b.hx*sc,y:ty-b.top*sc,w:CELS[k].width*sc,h:CELS[k].height*sc,sc};}
// 聚拢目标：从站立 cel 采样（固定种子）
const GN=14000,GT=(()=>{const im=celStand,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const d=x.getImageData(0,0,c.width,c.height).data,out=[];const b=CELBOX.stand;let k=0;
  while(out.length<GN&&k<GN*40){k++;const px=Math.floor(rnd(k,11)*c.width),py=Math.floor(b.top+rnd(k,12)*(b.bot-b.top)),j=(py*c.width+px)*4;
    if(d[j+3]>160)out.push({px,py,h:(b.bot-py)/(b.bot-b.top),col:[d[j]/255,d[j+1]/255,d[j+2]/255],k});}return out;})();
// 裂纹：从双掌贴玻璃处（底图坐标）放射，分叉；长度随时间
const CRACKS=(()=>{const L=[],seeds=[[BALL.cx-62,BALL.cy+8],[BALL.cx+66,BALL.cy+4]];let k=0;
  for(const [sx,sy] of seeds)for(let j=0;j<9;j++){let a=j/9*6.28+rnd(k++,13),x=sx,y=sy;const pts=[[x,y]],segs=14+Math.floor(rnd(k++,14)*10);
    for(let q=0;q<segs;q++){a+=(rnd(k++,15)-.5)*1.1;const l=7+rnd(k++,16)*12;x+=Math.cos(a)*l;y+=Math.sin(a)*l;if(Math.hypot(x-BALL.cx,y-BALL.cy)>BALL.r*.98)break;pts.push([x,y]);}
    L.push({pts,t0:49.5+(j%3)*.35+rnd(k++,17)*.4});}return L;})();
function drawCracks(t,cam){const grow=u=>saturate(u);g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  for(const c of CRACKS){const u=grow((t-c.t0)/((50.83-c.t0)+1.6*(t>50.83?1:.6)));if(u<=0)continue;const n=Math.max(1,Math.floor(u*(c.pts.length-1)));
    const pulse=1+.8*Math.exp(-Math.max(0,t-50.83)*4)*(t>50.83?1:0);
    g.strokeStyle=`rgba(210,235,255,${Math.min(1,.42*pulse)})`;g.lineWidth=.8*cam.scale;g.beginPath();
    for(let q=0;q<=n;q++){const [x,y]=cam.point(c.pts[q]);q?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
    g.strokeStyle=`rgba(150,200,255,${.08*pulse})`;g.lineWidth=3*cam.scale;g.stroke();}
  g.restore();}
// 碎片：球面区域切成扇环小块，从原底图取像，向外飞散旋转
// 碎片取样源：预栅格化画布（直接画 <img> 时解码缓存的插值质量随渲染历史变化，曾致 54.5 帧 2 像素顺序/seek 不一致）
const BG_RASTER=bg;
const SHARDS=(()=>{const out=[];const R=BALL.r*1.02,NR=9,NA=26,V=[];
  for(let i=0;i<=NR;i++){V.push([]);for(let j=0;j<NA;j++){const jr=i&&i<NR?(rnd(i*31+j,24)-.5)*.6:0,ja=(rnd(i*17+j,25)-.5)*.7;
    const r=R*(i+jr)/NR,a=(j+ja+(i%2)*.5)/NA*6.28;V[i].push([BALL.cx+Math.cos(a)*r,BALL.cy+Math.sin(a)*r]);}}
  let k=0;const push=poly=>{const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length,cy=poly.reduce((s,p)=>s+p[1],0)/poly.length,dir=Math.atan2(cy-BALL.cy,cx-BALL.cx);
    out.push({poly,cx,cy,dir,sp:200+rnd(k++,19)*520,rot:(rnd(k++,20)-.5)*9,del:Math.hypot(cx-BALL.cx,cy-BALL.cy)/R*.06,z:rnd(k++,26)<.18?1+rnd(k++,27)*2.2:0,ph:rnd(k++,28)*6.28,floor:770+rnd(k++,29)*90});};
  for(let i=0;i<NR;i++)for(let j=0;j<NA;j++){const a=V[i][j],b=V[i][(j+1)%NA],c=V[i+1][(j+1)%NA],d=V[i+1][j];
    if(i===0){push([a,c,d]);continue;}if((i+j)%2){push([a,b,c]);push([a,c,d]);}else{push([a,b,d]);push([b,c,d]);}}
  return out;})();
function drawShards(t,cam){const a0=t-BURST;if(a0<0||a0>2.4)return;g.save();
  for(const sh of SHARDS){const a=a0-sh.del;if(a<0)continue;
    const d=sh.sp*(1-Math.exp(-a*2.2))/2.2,dx=Math.cos(sh.dir)*d;let dy=Math.sin(sh.dir)*d+260*a*a;
    if(sh.cy+dy>sh.floor)dy=sh.floor-sh.cy; // 落到台面停住
    const al=saturate(1-a/(sh.z?1.1:2.0));if(al<=0)continue;const zs=1+sh.z*a*1.6; // 飞向镜头的碎片放大、更快淡出
    const [px,py]=cam.point([sh.cx+dx,sh.cy+dy]),ang=sh.rot*Math.min(a,1.2);
    g.save();g.translate(px,py);g.rotate(ang);g.scale(zs,zs);g.translate(-px,-py);
    g.beginPath();sh.poly.forEach(([x,y],q)=>{const [X,Y]=cam.point([x+dx,y+dy]);q?g.lineTo(X,Y):g.moveTo(X,Y);});g.closePath();
    g.save();g.clip();g.globalAlpha=al*.85;const s2=cam.scale;g.drawImage(BG_RASTER,cam.x+dx*s2+6*Math.sin(ang),cam.y+dy*s2,1920*s2,1080*s2);g.restore();
    const glint=Math.pow(Math.max(0,Math.cos(ang*2+sh.ph)),14);
    g.globalCompositeOperation='lighter';g.fillStyle=`rgba(225,240,255,${.65*glint*al})`;g.fill();
    g.strokeStyle=`rgba(215,235,255,${(.35+.5*glint)*al})`;g.lineWidth=.9;g.stroke();g.restore();}
  g.restore();
  // 冲击：球心白闪 + 一圈扩散的光环
  const [bx,by]=cam.point([BALL.cx,BALL.cy]),br=BALL.r*cam.scale,fl=Math.exp(-a0*5);
  g.save();g.globalCompositeOperation='lighter';
  if(fl>.02){const rg=g.createRadialGradient(bx,by,0,bx,by,br*1.6);rg.addColorStop(0,`rgba(255,250,235,${.9*fl})`);rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);}
  const ring=br*(1+a0*2.6),ra=saturate(1-a0/.7);if(ra>0){g.strokeStyle=`rgba(200,230,255,${.35*ra})`;g.lineWidth=6*ra+1;g.beginPath();g.ellipse(bx,by,ring,ring*.92,0,0,6.28);g.stroke();}
  g.restore();}
// 玻璃粉尘：球面崩出的数千颗细屑——阻尼外飞、重力下落、落台面停住闪烁，余下的在光柱里慢飘
const GLASS_N=5200,GLASS=(()=>{const out=[];for(let i=0;i<GLASS_N;i++){const a=rnd(i,40)*6.28,rr=Math.sqrt(.15+.85*rnd(i,41))*BALL.r;
  const x=BALL.cx+Math.cos(a)*rr,y=BALL.cy+Math.sin(a)*rr,sp=120+rnd(i,42)*640*(rr/BALL.r),dir=a+(rnd(i,43)-.5)*.8;
  out.push({x,y,vx:Math.cos(dir)*sp,vy:Math.sin(dir)*sp-80*rnd(i,44),k:1.2+rnd(i,45)*2.8,grav:rnd(i,46)<.35?40:260+rnd(i,47)*200,
    floor:775+rnd(i,48)*95,hue:rnd(i,49),sz:.7+rnd(i,50)*1.6,life:2.2+rnd(i,51)*3.5,del:rnd(i,52)*.08});}return out;})();
// ---- 确定性点累加：小粒子在 JS 里按面积覆盖逐像素加色，一次贴回（浏览器并行光栅叠大量半透明小方块时舍入不定）----
const ACC=new Float32Array(W*H*3),ACC_IMG=new ImageData(W,H),accC=document.createElement('canvas');accC.width=W;accC.height=H;const accG=accC.getContext('2d',{willReadFrequently:true});
let accBox=null;
function accBegin(){ACC.fill(0);accBox=[W,H,0,0];}
function accRect(x,y,z,r,gg,b,a){const x0=x-z/2,y0=y-z/2,x1=x0+z,y1=y0+z;const ix0=Math.max(0,Math.floor(x0)),iy0=Math.max(0,Math.floor(y0)),ix1=Math.min(W-1,Math.ceil(x1)-1),iy1=Math.min(H-1,Math.ceil(y1)-1);
  if(ix1<ix0||iy1<iy0)return;accBox[0]=Math.min(accBox[0],ix0);accBox[1]=Math.min(accBox[1],iy0);accBox[2]=Math.max(accBox[2],ix1);accBox[3]=Math.max(accBox[3],iy1);
  for(let yy=iy0;yy<=iy1;yy++){const cy=Math.min(y1,yy+1)-Math.max(y0,yy);for(let xx=ix0;xx<=ix1;xx++){const cov=cy*(Math.min(x1,xx+1)-Math.max(x0,xx))*a,k=(yy*W+xx)*3;ACC[k]+=r*cov;ACC[k+1]+=gg*cov;ACC[k+2]+=b*cov;}}}
function accFlush(){if(!accBox||accBox[2]<accBox[0])return;const [x0,y0,x1,y1]=accBox,d=ACC_IMG.data;
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const k=(yy*W+xx)*3,j=(yy*W+xx)*4;d[j]=Math.min(255,Math.round(ACC[k]));d[j+1]=Math.min(255,Math.round(ACC[k+1]));d[j+2]=Math.min(255,Math.round(ACC[k+2]));d[j+3]=255;}
  accG.putImageData(ACC_IMG,0,0,x0,y0,x1-x0+1,y1-y0+1);g.save();g.globalCompositeOperation='lighter';g.globalAlpha=1;g.drawImage(accC,x0,y0,x1-x0+1,y1-y0+1,x0,y0,x1-x0+1,y1-y0+1);g.restore();
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const j=(yy*W+xx)*4;d[j]=d[j+1]=d[j+2]=0;}}
function drawGlassDust(t,cam){const a0=t-BURST;if(a0<0||a0>6)return;g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<GLASS_N;i++){const q=GLASS[i],a=a0-q.del;if(a<0)continue;const fade=saturate(1-a/q.life);if(fade<=0)continue;
    const e=(1-Math.exp(-q.k*a))/q.k;let x=q.x+q.vx*e,y=q.y+q.vy*e+q.grav*(a-e)/q.k*1.0;
    let landed=false;if(y>q.floor){y=q.floor;landed=true;}
    if(q.grav<100){x+=Math.sin(t*.8+i)*8*a;y-=10*a;} // 轻的在光柱里慢飘上升
    const [X,Y]=cam.point([x,y]),tw=landed?.25+.75*Math.pow(Math.max(0,Math.sin(t*9+i*1.7)),6):.6+.4*Math.sin(t*14+i);
    const hot=Math.exp(-a*3),c=q.hue<.7?[220+35*hot,235+20*hot,255]:q.hue<.85?[255,215,160]:[190,220,255];
    const z=q.sz*Math.max(1,cam.scale*.8)*(1+hot);accRect(X,Y,z,c[0]|0,c[1]|0,c[2]|0,Math.min(1,(.35+.9*hot)*tw*fade));}
  g.restore();}
// 裂纹积蓄：裂纹端点不断崩出细小玻璃屑落下
function drawCrackChips(t,cam){if(t<50.4||t>=BURST)return;g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<220;i++){const c=CRACKS[i%CRACKS.length],p0=c.pts[Math.min(c.pts.length-1,1+Math.floor(rnd(i,60)*(c.pts.length-1)))];
    const born=50.4+rnd(i,61)*(BURST-50.4),a=t-born;if(a<0||a>.9)continue;
    const x=p0[0]+(rnd(i,62)-.5)*30*a,y=p0[1]+200*a*a;const [X,Y]=cam.point([x,y]);g.fillStyle=`rgba(225,240,255,${.8*(1-a/.9)})`;g.fillRect(X-.8,Y-.8,1.6,1.6);}
  g.restore();}
// 聚拢：光云中的光点按身高先后（裙摆先、头最后）沿螺旋落到 cel 像素位，落位处 cel 逐行显现
const revealH=t=>saturate((t-REVEAL0-.9)/(REVEAL1-REVEAL0-.9));
function drawGather(t,cam){if(t<REVEAL0-.4||t>REVEAL1+1.2)return;const r=celRect('stand',cam),[bx,by]=cam.point([BALL.cx,BALL.cy]),br=BALL.r*cam.scale;
  g.save();g.globalCompositeOperation='lighter';
  for(const q of GT){const arrive=REVEAL0+.9+q.h*(REVEAL1-REVEAL0-.9)+(rnd(q.k,21)-.5)*.35,D=1.25,u=saturate((t-(arrive-D))/D);
    const a0=rnd(q.k,22)*6.28+t*1.6,r0=br*(.25+.85*rnd(q.k,23)),sx=bx+Math.cos(a0)*r0,sy=by+Math.sin(a0)*r0*.8;
    const tx=r.x+q.px*r.sc,ty=r.y+q.py*r.sc,e=u*u*(3-2*u),sw=Math.sin(Math.PI*e)*40*cam.scale;
    const x=lerp(sx,tx,e)+Math.cos(a0+1.6)*sw,y=lerp(sy,ty,e)+Math.sin(a0+1.6)*sw;
    const fadeOut=saturate((REVEAL1+1.2-t)/.8),al=(u>=1?Math.exp(-(t-arrive)*3):.5+.5*e)*fadeOut*(t<REVEAL0?saturate((t-REVEAL0+.4)/.4):1);if(al<.02)continue;
    const cr=Math.round(255*lerp(1,q.col[0],e*.7)),cg=Math.round(255*lerp(.95,q.col[1],e*.7)),cb=Math.round(255*lerp(.85,q.col[2],e*.7));
    const sz=(u>=1?1.6:1.3)*Math.max(1,cam.scale*.9);accRect(x,y,sz,cr,cg,cb,al);}
  g.restore();}
// 真人：显现遮罩（自下而上）→ 站立唱「起」→ 58.7 看手 → 61.6 捧心微笑；姿势间 0.5s 溶接；呼吸微动
const tmpC=document.createElement('canvas');tmpC.width=W;tmpC.height=H;const tg2=tmpC.getContext('2d',{willReadFrequently:true});
const EXPO=(()=>{const seq=[],F=1/30;let t=-1;const push=(k,dur)=>{if(!CELS[k])return;seq.push([t,k]);t+=dur;};
  seq.push([-1,'stand']);t=58.0;[['a1',5],['a2',5],['a3',3],['a4',3]].forEach(([k,n])=>push(k,n*F));push('hands',0);
  t=60.7;[['b1',5],['b2',5],['b3',3],['b4',3]].forEach(([k,n])=>push(k,n*F));push('joy',0);return seq;})(); // v2 曝光；am*/bm* 中间画保留未用
function poseAt(t){let i=0;while(i+1<EXPO.length&&EXPO[i+1][0]<=t)i++;const a=EXPO[i][1],nx=EXPO[i+1];
  if(nx&&t>=nx[0]-1/30)return{a,b:nx[1],w:.5};return{a,b:null,w:0};} // v2：换画前 1 帧 50% 过渡
const EPI_STATE=(()=>{const e=EPI.energy,st=[];let cur=0;for(let i=0;i<e.length;i+=1){const v=e[i];
  if(cur===0){if(v>.16)cur=1;}else if(cur===1){if(v>.55)cur=2;else if(v<.08)cur=0;}else if(v<.38)cur=1;st.push(cur);}return st;})();
function epiMouth(t){const x=Math.floor((Math.floor(t*15)/15-EPI.start)*EPI.rate);if(x<0)return null;if(x>=EPI_STATE.length)return 0;return EPI_STATE[x];}
let gSave=null;function drawCel(k,t,cam,alpha){let key=k;if(k==='stand'){const m=mouthSmooth(t);if(t>56.3&&t<58.1&&m.open>.07)key='ee';}
  if(k==='joy'){const m=epiMouth(t);if(m!==null)key=m===0?'joyClosed':m===2?'joyOpen':'joy';}
  const r=celRect(k,cam),br=1+.006*Math.sin((t-REVEAL1)*2.1),sway=.006*Math.sin((t-REVEAL1)*.9);
  g.save();g.globalAlpha=alpha;g.filter='brightness(.8) saturate(.88) contrast(1.04)';g.translate(r.x+r.w/2,r.y+r.h);g.rotate(sway);g.scale(1/Math.sqrt(br),br);g.drawImage(CELS[key],-r.w/2,-r.h,r.w,r.h);g.restore();}
function drawMaiden(t,cam){if(t<REVEAL0+.8)return;
  const [fx,fy]=cam.point([STAND.x,STAND.y]);
  g.save();g.globalCompositeOperation='multiply';const sh=g.createRadialGradient(fx,fy,0,fx,fy,150*cam.scale);sh.addColorStop(0,'rgba(40,30,30,.55)');sh.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=sh;g.save();g.translate(fx,fy);g.scale(1,.16);g.translate(-fx,-fy);g.fillRect(fx-200*cam.scale,fy-200*cam.scale,400*cam.scale,400*cam.scale);g.restore();g.restore();
  const p=poseAt(t),rv=revealH(t);
  if(rv<1){const r=celRect('stand',cam);tg2.clearRect(0,0,W,H);tg2.save();const g0=g;
    tg2.filter='brightness(.8) saturate(.88) contrast(1.04)';tg2.drawImage(CELS.stand,r.x,r.y,r.w,r.h);tg2.filter='none';const yb=r.y+r.h-((1-rv)*0+rv)*(r.h*.98),soft=40*cam.scale;
    const gr=tg2.createLinearGradient(0,yb-soft,0,yb+soft);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,1)');
    tg2.globalCompositeOperation='destination-in';tg2.fillStyle=gr;tg2.fillRect(0,0,W,H);
    tg2.globalCompositeOperation='source-atop';const lg=tg2.createLinearGradient(0,yb-soft*.6,0,yb+soft*.6);lg.addColorStop(0,'rgba(255,240,210,0)');lg.addColorStop(.5,'rgba(255,240,210,.55)');lg.addColorStop(1,'rgba(255,240,210,0)');
    tg2.fillStyle=lg;tg2.fillRect(r.x,yb-soft,r.w,soft*2);tg2.restore();g.drawImage(tmpC,0,0);return;}
  // 先画到临时层，冷暖光用 source-atop 只染她自己（直接在主画布上叠会把外接矩形的背景也染上）
  const g0=g;g=tg2;tg2.clearRect(0,0,W,H);drawCel(p.a,t,cam,1);if(p.b)drawCel(p.b,t,cam,p.w);g=g0;
  {const r=celRect('stand',cam);tg2.save();tg2.globalCompositeOperation='source-atop';const lg=tg2.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
   lg.addColorStop(0,'rgba(170,200,255,.12)');lg.addColorStop(1,'rgba(255,200,150,.08)');tg2.fillStyle=lg;tg2.fillRect(r.x,r.y,r.w,r.h);tg2.restore();}
  g.drawImage(tmpC,0,0);}
// 残余光尘
function drawDust(t,cam){if(t<BURST)return;g.save();g.globalCompositeOperation='lighter';const [bx,by]=cam.point([BALL.cx,BALL.cy]);
  for(let i=0;i<260;i++){const a=t-BURST,x=bx+(rnd(i,30)-.5)*W*.9+Math.sin(t*.4+i)*20,y=by-200*cam.scale+rnd(i,31)*H*.9+((a*14+rnd(i,32)*600)%600)-120;
    const al=.25+.35*Math.max(0,Math.sin(t*2+i));accRect(x+.8,y+.8,1.6,255,235,200,al*saturate(a/1.2));}g.restore();}
const flash=t=>Math.exp(-Math.max(0,t-REVEAL1)*3.2)*(t>=REVEAL1-.05?saturate((t-REVEAL1+.05)/.05):0);

window.debugArm=t=>{const sk=skeleton(t),fr=BODY.frames(sk),o=V3(0,0,0),n=V3(0,0,0),A=sk.L,hist=new Array(20).fill(0),bones={},rest=new Array(20).fill(0);
  const d=A.tip.clone().sub(A.sh),L=d.length();d.normalize();
  for(let j=0;j<BODY.n;j++){const b=BODY.dbg.B0[j];if(b<4||b>6)continue;bones[b]=(bones[b]||0)+1;BODY.skin(j,fr,o,n,0);
    const u=o.clone().sub(A.sh).dot(d)/L;hist[Math.max(0,Math.min(19,Math.floor(u*20)))]++;
    const r=BODY.dbg.P[j];const ur=r.clone().sub(REST.L.sh).dot(REST.L.tip.clone().sub(REST.L.sh).normalize())/REST.L.tip.distanceTo(REST.L.sh);rest[Math.max(0,Math.min(19,Math.floor(ur*20)))]++;}
  return{hist,rest,bones,L};};
window.dbgCel=t=>{const cam=camAt(t);return{box:CELBOX,stand:celRect('stand',cam),joy:celRect('joy',cam),foot:cam.point([STAND.x,STAND.y]),ped:cam.point([BALL.cx,800])};};
window.stepAt=t=>{const sk=skeleton(t);return{t,shot:t>=CUT?'cu_sing':'ball_push',energy:energy(t),yaw:sk.yaw};};
window.renderAt=t=>{const state=render(t);return{image:out.toDataURL('image/png').split(',')[1],state};};
// 预热：浏览器 2D 光栅对首次绘制的粒子层结果差 1–2 色阶（之后稳定），就绪前先把各层各画两遍
for(const w of [52.8,54.5,56.0,58.3,61.0,52.8,54.5,56.0,58.3,61.0])render(w);
render(T0+Math.min(3.4,(T1-T0)/2));window.ready=true;
