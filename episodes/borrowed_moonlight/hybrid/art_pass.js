// 《借走月光的女孩》cel-cinema 二维原画合成页（art_pass，A3 建页 / A4 整集 / R2 监制整改）。
// 骨架学 stardust_clad_s1e2 art_pass_full_r6：镜表驱动、cel-stage 刚性摆放、raster-face、
// 粒子 3D 层重宿主、接触影、字幕条。数据全部来自 bake 与 A1/A2 已验收资产：
//   场景底图 plates（S01 雪/春按 t=422 切）+ 镜表视差取景（阻尼跟随 bake 相机，画幅覆盖钳制）
//   人物 cel：位置/尺度/朝向 = motion_full.json 逐帧烘焙投影（眼线对 faceCenter、
//     座/足对 root；走拍 = baked-cel-clip 距离驱动相位 + bbox 脚底锚点补偿）
//   R2：地面标定（ground_calib.json 底图空间地面线，帧级脚底对齐）+ 分区调色
//     （站位底图采样 tint）+ 场景方向接触影 + 底图色 rim 边 + 呼吸微动（breath）
//   R2 环境动态：月亮光晕呼吸/窗灯呼吸摇曳/门缝光/宫殿失光回暖纱罩（画布层，
//     世界锚点投影）+ 落雪/花瓣/工坊微尘/宫殿银尘/星阶金尘（fx_rehost 粒子层）
//   raster-face：locked-variant-face（同图锁回变体），jaw 三态接 voice_envs.json
//     能量包络（R2：载入期逐角色阈值+迟滞状态机预处理，兼容 voice_envs 重生成），
//     blink 周期，表情按镜表 emotion；表情切换对齐眨眼瞬间（溶解=两张脸，禁溶）
//   粒子：fx_rehost.js 重宿主 effects/magic.js 20 系统（锚点=bake 逐帧世界坐标，
//     相机=bake position/quaternion/fov，'lighter' 合成）
// 窗口契约（pipeline.mjs 依赖）：ready / duration / renderAt(t)→PNG / __art（probe 断言）。
import * as THREE from 'three';
import {createCelStage,clamp,ease} from './assets/draw_over_runtime/cel-stage.js';
import {createLockedVariantFace} from './assets/draw_over_runtime/locked-variant-face.js';
import {createBakedCelClip} from './assets/draw_over_runtime/baked-cel-clip.js';
import {drawGroundContact} from './assets/draw_over_runtime/cel-integration.js';
import {createRehostedFX} from './fx_rehost.js';

const W=1280,H=720,FPS=30,END=478;
const json=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status} ${u}`);return r.json();});
const [motion,shotTable,TL,envs,cast,grade,statics,manifest,ground,winGlows]=await Promise.all([
  json('./config/motion_full.json'),json('./config/art_shots.json'),json('../config/timeline.json'),
  json('../config/voice_envs.json'),json('./config/art_cast.json'),json('./config/plate_grade.json'),
  json('./config/static_anchors.json'),json('./assets/manifest.json'),json('./config/ground_calib.json'),
  json('./config/window_glows.json')]);
if(motion.schema!=='dula-motion-2d-pilot-v1')throw Error('bad motion schema');
if(ground.schema!=='ground-calib-v1')throw Error('bad ground calib schema');
if(winGlows.schema!=='window-glows-v1')throw Error('bad window glows schema');
if(TL.duration!==END)throw Error('timeline duration mismatch');
window.duration=END;

// ── 资产装载纪律：只装 manifest 登记项，缺失路径零请求、进 missingAssets ──
const listed=new Set(manifest.assets.map(a=>a.path));
const missingAssets=[];
function track(p){if(!listed.has(p))missingAssets.push(p);return listed.has(p);}
async function loadImg(p){
  if(!track(p))return null;
  const im=new Image();im.src='./assets/'+p;await im.decode();return im;
}
// alpha bbox（extractCel 同款阈值 32），trim 后 canvas + bbox 原图坐标
function trimCel(image){
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
  const a=g.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<x0||y1<y0)throw Error('Empty cel');
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;
  out.getContext('2d').drawImage(c,x0,y0,out.width,out.height,0,0,out.width,out.height);
  return{canvas:out,bbox:[x0,y0,x1,y1]};
}

// ── bake 帧读取与相机重建（A0 同式）──
const frameAt=t=>motion.frames[Math.max(0,Math.min(motion.frames.length-1,Math.round((t-motion.start)*FPS)))];
const segAt=t=>shotTable.shots.find(s=>t>=s.start&&t<s.end)??shotTable.shots.at(-1);
const cam=new THREE.PerspectiveCamera(44,W/H,.05,200);
const _v=new THREE.Vector3(),_q=new THREE.Quaternion();
function rebuild(f){cam.position.fromArray(f.camera.position);cam.quaternion.fromArray(f.camera.quaternion);cam.fov=f.camera.fov;cam.updateProjectionMatrix();cam.updateMatrixWorld(true);}
const proj=p=>{_v.set(p[0],p[1],p[2]).project(cam);return[(_v.x+1)*W/2,(1-_v.y)*H/2];};
const depthOf=p=>{_v.set(p[0],p[1],p[2]).applyMatrix4(cam.matrixWorldInverse);return-_v.z;};
const VIEW_ID={cx:640,cy:360,z:1,roll:0}; // cel 层：烘焙投影已含全部镜头信息，view 恒等

// ── 场景底图与视差取景（阻尼跟随 bake 相机，shot 起点为参考帧）──
const PLATE_FILE={clocktower:'s02_clocktower_workshop',towertop:'s03_star_stairs',moonpalace:'s04_moon_palace'};
const SCENE_ANCHOR={snowtown:[0,7,-13],clocktower:[0,3,-4],towertop:[0,12,-12],moonpalace:[0,1.2,-8.5]};
const PAN_K=.5,ZOOM_K=.45,OVERSCAN=1.2;
const plateFor=(scene,t)=>scene==='snowtown'?(t<422?'s01_snowtown_night':'s01_snowtown_spring'):PLATE_FILE[scene];
const plates={};
for(const p of ['s01_snowtown_night','s01_snowtown_spring','s02_clocktower_workshop','s03_star_stairs','s04_moon_palace']){
  const key=`plates/${p}.png`;const im=await loadImg(key);if(im)plates[p]=im;
}
// ── R2 底图采样器（分区调色/rim 主色/道具配色）：每 plate 一张 1/4 缩图，帧级小盒均值 ──
const plateSamplers={},plateZoneColor={};
for(const [pk,im] of Object.entries(plates)){
  const c=document.createElement('canvas');c.width=480;c.height=270;
  const cg=c.getContext('2d',{willReadFrequently:true});cg.drawImage(im,0,0,480,270);
  plateSamplers[pk]=cg;
  // 站位区主色：画面中下部（人物活动带）均值——rim 边与平台道具用它
  const d=cg.getImageData(150,165,180,80).data;
  let r=0,gg=0,b=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2];n++;}
  plateZoneColor[pk]=[r/n,gg/n,b/n];
}
const plateScale=(pt,plate)=>(Math.max(W/plate.width,H/plate.height)*OVERSCAN)*pt.z;
function samplePlateAt(pk,pt,plate,sx,sy,box=9){ // 屏幕点→底图缩图小盒均值 [r,g,b]
  const cg=plateSamplers[pk];if(!cg)return[128,128,128];
  const s=plateScale(pt,plate);
  const u=(sx-pt.cx)/s+plate.width/2,v=(sy-pt.cy)/s+plate.height/2;
  const x=Math.max(0,Math.min(480-box,u/plate.width*480-box/2)),y=Math.max(0,Math.min(270-box,v/plate.height*270-box/2));
  const d=cg.getImageData(x,y,box,box).data;
  let r=0,g2=0,b=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];g2+=d[i+1];b+=d[i+2];n++;}
  return[r/n,g2/n,b/n];
}
// 站位实测色温/亮度轻融合：色度方向偏 32%、亮度钳在 [-18%,+12%]（人物是主体，不压没）
function tintFor(sample){
  const L=Math.max(.04,(0.2126*sample[0]+0.7152*sample[1]+0.0722*sample[2])/255);
  const lumaF=Math.max(.82,Math.min(1.12,L/.40));
  return[0,1,2].map(i=>+(1+((sample[i]/255/L)*lumaF-1)*.32).toFixed(4));
}
const _f0=new THREE.Vector3(),_f1=new THREE.Vector3();
function plateTransform(shot,f,plate){
  // 底图位移用"相机朝向差"而非锚点投影：微距拍锚点可在相机背后（m45 递灯拍灯、
  // 宫殿锚点在机位后方），投影奇点会把底图甩没（z=0 全黑翻车实录）。
  const a=SCENE_ANCHOR[shot.scene];
  const f0=frameAt(shot.start);
  rebuild(f0);
  _f0.set(0,0,-1).applyQuaternion(cam.quaternion);
  const az0=Math.atan2(_f0.x,-_f0.z),el0=Math.asin(_f0.y);
  const d0=Math.hypot(cam.position.x-a[0],cam.position.y-a[1],cam.position.z-a[2]),fov0=f0.camera.fov;
  rebuild(f);
  _f1.set(0,0,-1).applyQuaternion(cam.quaternion);
  const az1=Math.atan2(_f1.x,-_f1.z),el1=Math.asin(_f1.y);
  const dAz=Math.atan2(Math.sin(az1-az0),Math.cos(az1-az0)),dEl=el1-el0;
  const d1=Math.hypot(cam.position.x-a[0],cam.position.y-a[1],cam.position.z-a[2]);
  const ppr=(W/2)/Math.tan(f.camera.fov*Math.PI/360); // 像素/弧度
  let cx=640-dAz*ppr*PAN_K,cy=360+dEl*ppr*PAN_K; // 相机右转 → 底图左移
  const zFull=(d0*Math.tan(fov0*Math.PI/360))/Math.max(.5,d1*Math.tan(f.camera.fov*Math.PI/360));
  // 底图在拍内只放不收：推近主体时远景真实缩放<1（相机离背景更远），但底图是有限画幅，
  // 收缩会露边（m47 推灯左侧黑带翻车实录）——压掉收缩，保留推近的放大。
  const z=Math.min(2.5,Math.max(1,1+(zFull-1)*ZOOM_K));
  // 画幅覆盖钳制（R2：m13 末幅俯仰差把底图上抬、下缘露出黑带致人物踩黑）——
  // 平移以"永不露边"为硬约束，超出覆盖范围的俯仰差被钳掉（宁可少移不可露黑）。
  const s=Math.max(W/plate.width,H/plate.height)*OVERSCAN*z,hw=plate.width/2*s,hh=plate.height/2*s;
  cx=Math.min(hw,Math.max(W-hw,cx));cy=Math.min(hh,Math.max(H-hh,cy));
  return{cx,cy,z};
}

// ── 画布与两层 WebGL：cel-stage（source-over）+ 粒子（lighter）──
const canvas=document.createElement('canvas');canvas.id='picture';canvas.width=W;canvas.height=H;document.body.append(canvas);
const g=canvas.getContext('2d');
const celRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
celRenderer.setSize(W,H);celRenderer.setPixelRatio(1);celRenderer.outputColorSpace=THREE.SRGBColorSpace;celRenderer.setClearColor(0,0);
const fxRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
fxRenderer.setSize(W,H);fxRenderer.setPixelRatio(1);fxRenderer.outputColorSpace=THREE.SRGBColorSpace;fxRenderer.setClearColor(0,0);
const cels=createCelStage({THREE,renderer:celRenderer,width:W,height:H});

// ── 人物 cel 注册（trim + 眼线地标 + 画内锚点）──
const celMeta={},landmarkCheck=[];
for(const [actor,cfg] of Object.entries(cast.characters)){
  for(const [key,def] of Object.entries(cfg.cels??{})){
    const celKey=`${actor}:${key}`;
    const im=await loadImg(def.img);
    if(!im){// 占位品红块：缺失即所见
      const ph=document.createElement('canvas');ph.width=64;ph.height=96;
      ph.getContext('2d').fillStyle='#f0f';ph.getContext('2d').fillRect(0,0,64,96);
      cels.register(celKey,ph);celMeta[celKey]={canvas:ph,eyeFrac:.1,refFrac:1,faceX:.5,missing:true};continue;
    }
    const {canvas:trimmed,bbox}=trimCel(im);
    let eyeFrac=def.eyeFrac??null;
    if(def.landmarks){
      const lm=await json('./assets/'+def.landmarks);
      eyeFrac=lm.bands.eyes.top;
      landmarkCheck.push({cel:celKey,trimH:trimmed.height,landmarkH:lm.H,drift:Math.abs(trimmed.height-lm.H)/lm.H});
    }
    const meta={canvas:trimmed,bbox,eyeFrac,refFrac:def.refFrac??1,faceX:def.faceX??.5,actor,def};
    if(def.lampXY)meta.lampFrac=[(def.lampXY[0]-bbox[0])/trimmed.width,(def.lampXY[1]-bbox[1])/trimmed.height];
    if(def.handXY)meta.handFrac=[(def.handXY[0]-bbox[0])/trimmed.width,(def.handXY[1]-bbox[1])/trimmed.height];
    celMeta[celKey]=meta;
    cels.register(celKey,trimmed);
  }
}
// ── R2 rim 环境边光：cel 剪影外圈稀释底图站位区主色，消"贴纸边"。
//   按 (cel, plate) 惰性生成并注册为独立 cel（order 1，压在人物 cel 之下、底图之上）──
const rimCache={};
function rimKeyFor(celKey,pk){
  const k=`${celKey}|${pk}`;
  if(rimCache[k])return rimCache[k];
  const meta=celMeta[celKey],img=meta.canvas;
  const pad=Math.round(img.height*.018)+7;
  const c=document.createElement('canvas');c.width=img.width+pad*2;c.height=img.height+pad*2;
  const g2=c.getContext('2d');
  g2.filter=`blur(${Math.max(3,img.height*.005)}px)`;g2.drawImage(img,pad,pad);g2.filter='none';
  const zc=plateZoneColor[pk]??[128,128,128];
  g2.globalCompositeOperation='source-in';
  g2.fillStyle=`rgb(${zc[0]|0},${zc[1]|0},${zc[2]|0})`;g2.fillRect(0,0,c.width,c.height);
  g2.globalCompositeOperation='destination-out';g2.drawImage(img,pad,pad); // 抠掉本体只留外圈
  g2.globalCompositeOperation='destination-in';g2.fillStyle='rgba(0,0,0,.14)';g2.fillRect(0,0,c.width,c.height);
  const rk=`${celKey}:rim:${pk}`;
  cels.register(rk,c);
  rimCache[k]={rk,pad,img};
  return rimCache[k];
}
// ── R2 地面贴合：ground_calib.json 的底图空间线段，帧级按脚底屏幕 x 反解 gy ──
// 多点折线分段线性插值（走拍/横移拍地面沿路径不共线，两点直线不够：R2 m04/m11 实录）
function lineInterp(L,px){
  if(L.length===1)return L[0][1];
  const P=[...L].sort((a,b)=>a[0]-b[0]);
  let i=0;
  while(i<P.length-2&&px>P[i+1][0])i++;
  const u=Math.max(-.6,Math.min(1.6,(px-P[i][0])/(P[i+1][0]-P[i][0]))); // 端点外有限外推
  return P[i][1]+(P[i+1][1]-P[i][1])*u;
}
function groundDy(shot,actor,f,pt,plate,bottomY){
  const e=ground.shots[shot.id]?.[actor];
  if(!e||e.mode!=='ground'||!plate)return 0;
  const rp=proj(f.actors[actor].world.root); // x 用 bake 根投影（地面接触点正下方位）
  const s=plateScale(pt,plate);
  const px=(rp[0]-pt.cx)/s+plate.width/2;
  const py=lineInterp(e.line,px);
  const gy=pt.cy+(py-plate.height/2)*s;
  // 修正量对 cel 当前底边（y0），不是 bake 根：画内比例与 3D 有差（蹲姿灯底≠根，R2 m15 实录）
  return Math.max(-140,Math.min(140,gy-bottomY));
}
// 走拍：baked-cel-clip（距离驱动相位）+ 逐格 bbox 脚底锚点补偿（A2 遗留：格内不居中）
const walkClips={},walkCells={},walkDist={};
for(const [actor,cfg] of Object.entries(cast.characters)){
  if(!cfg.walk)continue;
  const wc=cfg.walk;
  walkCells[actor]=(await json('./assets/'+wc.cells)).cells.map(c=>c.alpha_bbox);
  const spec={id:`${actor}:walk`,frames:wc.frames.map(f=>'./assets/'+f),size:wc.size,anchor:wc.anchor,cuff:wc.anchor,cycleTravel:wc.cycleTravel};
  walkClips[actor]=await createBakedCelClip({stage:cels,spec});
  walkClips[actor].eyeFrac=wc.eyeFrac;
}
// 走拍行程：逐帧累计根水平位移（每个用到 walk 的拍，从拍头起算）
{
  const need=new Set();
  for(const [sid,sc] of Object.entries(cast.shots))for(const [actor,e] of Object.entries(sc)){
    const entries=Array.isArray(e)?e:[e];
    if(entries.some(x=>(typeof x==='string'?x:x.cel)==='walk'))need.add(`${sid}:${actor}`);
  }
  for(const k of need){
    const [sid,actor]=k.split(':'),shot=shotTable.shots.find(s=>s.id===sid);
    const arr=new Float64Array(Math.ceil((shot.end-shot.start)*FPS)+2);
    let d=0;
    for(let i=1;i<arr.length;i++){
      const f0=frameAt(shot.start+(i-1)/FPS),f1=frameAt(shot.start+i/FPS);
      d+=Math.hypot(f1.actors[actor].root[0]-f0.actors[actor].root[0],f1.actors[actor].root[2]-f0.actors[actor].root[2]);
      arr[i]=d;
    }
    walkDist[k]=arr;
  }
}

// ── raster-face（locked-variant-face，jaw 三态接 voice_envs 能量包络）──
const faces={};
for(const [actor,cfg] of Object.entries(cast.characters)){
  const fc=cfg.face;if(!fc)continue;
  const variants={};
  for(const [k,v] of Object.entries(fc.variants))variants[k]={src:'./assets/'+v.img,rect:v.rect};
  faces[actor]=await createLockedVariantFace({
    id:actor,base:'./assets/'+fc.base,variants,
    mouth:{half:'mouth_half',open:'mouth_open'},blink:'blink',emotions:fc.emotions,
  });
  faces[actor].anchor={eyeY:fc.eyeY,headTop:fc.headTop,faceX:fc.faceX};
  cels.register(`face:${actor}`,faces[actor].canvas,{dynamic:true});
}

// ── 粒子重宿主（effects/magic.js 全系统，bake 锚点 + bake 相机）──
const fx=createRehostedFX({motion,statics,TL,width:W,height:H});

// ── 口型/眨眼/表情 ──
// R2 口型：载入期预处理（纯数据离线算定，voice_envs.json 重生成后重载即生效，接口只依赖
// lines[].jaw/dt）——逐角色阈值 + 相邻帧均值 + 三态迟滞（防能量抖动造成的嘴部开关抖动；
// 长停顿/低能量=闭口由迟滞低阈承担）。
const JAW_CFG={eileen:{half:.10,open:.34},alder:{half:.07,open:.28},ladymoon:{half:.085,open:.31}};
const JAW_OUT=[0,.2,.5]; // 态→合成 jaw 值（喂 locked-variant-face 的 .075/.32 阈）
for(const line of envs.lines){
  const cfg=JAW_CFG[line.speaker]??{half:.085,open:.31};
  const raw=line.jaw,n=raw.length,st=new Array(n);
  let cur=0;
  for(let i=0;i<n;i++){
    const v=(raw[i]+(raw[i+1]??raw[i]))/2;
    if(cur===0){if(v>cfg.half)cur=1;}
    else if(cur===1){if(v>cfg.open)cur=2;else if(v<cfg.half*.55)cur=0;}
    else{if(v<cfg.open*.68)cur=1;}
    st[i]=cur;
  }
  line.jawState=st;
}
function jawFor(actor,t){
  const sp=actor.toLowerCase();
  const line=envs.lines.find(l=>l.speaker===sp&&t>=l.t0&&t<l.t0+l.dur);
  if(!line)return 0;
  return JAW_OUT[line.jawState[Math.floor((t-line.t0)/line.dt)]??0];
}
const BLINK_PHASE={Eileen:.47,Alder:1.82,LadyMoon:2.9};
function blinkFor(actor,t){const b=((t+BLINK_PHASE[actor])%4.7);return b<.16?Math.sin(b/.16*Math.PI):0;}
// 表情切换对齐眨眼瞬间（离散画禁溶解；切镜边界由镜头切换天然掩护，拍内切换才需对齐）
function snapToBlink(actor,t0){
  const per=4.7,ph=BLINK_PHASE[actor];
  let t=Math.ceil((t0+ph-.08)/per)*per+.08-ph; // blinkFor 峰值在 b=.08
  if(t<t0-1e-9)t+=per;
  return t-t0>2.2?t0:t; // 拖太久不如直切
}
function emotionFor(actor,shot,t,entry){
  // emotionTimeline 取代镜表 emotion：[[t0,emotion],...] 取最后一个 snap(t0)<=t；之前=base（null）
  if(entry?.emotionTimeline){let em=null;for(const [t0,e] of entry.emotionTimeline)if(t>=snapToBlink(actor,t0))em=e;return em;}
  return shot.emotion;
}

// ── 选角表解析（字符串/对象/时间数组）──
function castFor(shot,actor,t){
  let e=cast.shots[shot.id]?.[actor];
  if(Array.isArray(e))e=e.find(x=>x.until===undefined||t<x.until);
  if(e&&typeof e==='object')return e;
  if(e)return{cel:e};
  if(shot.kind==='face_close'&&shot.character===actor)return{cel:'portrait'};
  return{cel:cast.defaults[actor]};
}

// ── 摆放（位置/尺度来自 bake 逐帧投影；R2：地面贴合+分区 tint+rim 边+呼吸微动）──
const BREATH={Eileen:1.1,Alder:.9,LadyMoon:.75}; // 呼吸级微动（上身纵向，px；整拍冻结太死的整改）
// 场景主光方向（接触影投射向=背光向；rim 偏移向=迎光向）
const LIGHT_STYLE={ // cast: 影投射 [dx,dy]；rim: 边光偏移 [dx,dy]（占位尺度比例系数另行换算）
  snowtown:{cast:[66,-8],rim:[10,-6]},   // 夜：窗灯琥珀在人物前侧，影向后；月光自上
  clocktower:{cast:[30,9],rim:[6,-10]},  // 台上油灯顶光偏前：影短后坠
  towertop:{cast:[-52,10],rim:[-9,-8]},  // 月夜：月在右上，影向左下
  moonpalace:{cast:[0,7],rim:[0,-9]},    // 冷银顶光：影正下
  spring:{cast:[74,-6],rim:[-10,-7]},    // 日出在左低：影向右
};
function placement(actor,fracY,fracX,f,refWorldY){
  const a=f.actors[actor];
  const rootW=a.world.root,faceW=a.world.faceCenter??[rootW[0],rootW[1]+1.25,rootW[2]];
  const depth=Math.max(.25,depthOf(rootW));
  const ppu=(H/2)/(Math.tan(cam.fov*Math.PI/360)*depth);
  const eyeToRef=faceW[1]-(refWorldY??rootW[1]);
  const drawnH=eyeToRef*ppu/Math.max(.05,(fracY.ref-fracY.eye));
  return{a,faceW,rootW,ppu,drawnH};
}
function placeBody(actor,celKey,f,anchor='eye',env=null){
  const meta=celMeta[celKey];if(!meta||meta.missing)return null;
  const {drawnH,faceW,rootW,a}=placement(actor,{ref:meta.refFrac,eye:meta.eyeFrac},0,f);
  if(depthOf(rootW)<.25)return{actor,key:celKey,culled:true,reason:'behind-camera'};
  const s=drawnH/meta.canvas.height,drawnW=meta.canvas.width*s;
  let target,frac;
  if(anchor==='lamp'&&meta.lampFrac){target=proj(f.anchors.world.flameAnchor);frac=meta.lampFrac;}
  else{target=proj(faceW);frac=[meta.faceX,meta.eyeFrac];}
  const x=target[0]-(frac[0]-.5)*drawnW;
  let y=target[1]+(1-frac[1])*drawnH;
  // R2 地面贴合：标定表条目存在时把脚底（=cel 底边）对到底图地面线
  let gdy=0;
  if(env)gdy=groundDy(env.shot,actor,f,env.pt,env.plate,y);
  y+=gdy;
  // AABB 剔除：整画在画幅外则不摆放（构图缺席≠数据缺失）
  if(x+drawnW/2<-120||x-drawnW/2>W+120||y<-120||y-drawnH>H+120)return{actor,key:celKey,culled:true};
  // R2 融合三层：rim 环境边光（后）→ 人物 cel（分区 tint + 呼吸微动）
  let tint=null;
  if(env&&env.plate){
    const rp=proj(rootW);
    tint=tintFor(env.sample(rp[0],Math.min(H-6,rp[1]-drawnH*.35))); // 站位区=脚下到小腿的底图
    const rim=rimKeyFor(celKey,env.pk),ls=env.light;
    const rs=drawnH/meta.canvas.height,pad=rim.pad;
    cels.place(rim.rk,{rigid:true,x:x+(ls?.rim[0]??0),y:y+pad*rs+(ls?.rim[1]??0),
      height:drawnH*(rim.img.height+pad*2)/rim.img.height,view:VIEW_ID,time:0,order:1});
  }
  cels.place(celKey,{rigid:false,x,y,height:drawnH,view:VIEW_ID,time:env?.t??0,
    breath:BREATH[actor]??1,order:2,tint});
  return{actor,key:celKey,x:+x.toFixed(1),y:+y.toFixed(1),h:+drawnH.toFixed(1),
    eyeScreen:[+target[0].toFixed(1),+target[1].toFixed(1)],anchor,rigid:false,tint,
    groundDy:+gdy.toFixed(1)};
}
function placePortrait(actor,shot,f,t,entry){
  const face=faces[actor];if(!face)return null;
  const a=f.actors[actor],faceW=a.world.faceCenter??a.world.head;
  if(!faceW||depthOf(a.world.root)<.25)return null;
  const emotion=emotionFor(actor,shot,t,entry);
  const st=face.paint({jaw:jawFor(actor,t),emotion,blink:blinkFor(actor,t)});
  const p=proj(faceW);
  const drawnH=cast.portraitHeight[shot.kind==='macro'?'macro':'face_close']??1000;
  const s=drawnH/face.canvas.height,drawnW=face.canvas.width*s;
  // 头滚转（headQuat 的世界上向量投影；绕眼线锚点，先旋转再解锚）
  let roll=0;
  if(a.headQuat){
    _q.fromArray(a.headQuat);_v.set(0,1,0).applyQuaternion(_q);
    const p2=proj([faceW[0]+_v.x*.1,faceW[1]+_v.y*.1,faceW[2]+_v.z*.1]);
    roll=Math.max(-.18,Math.min(.18,Math.atan2(p2[0]-p[0],-(p2[1]-p[1]))));
  }
  const fx0=face.anchor.faceX,fy0=face.anchor.eyeY;
  const pe=[(fx0-.5)*drawnW,(fy0-1)*drawnH],cr=Math.cos(roll),sr=Math.sin(roll);
  const x=p[0]-(pe[0]*cr-pe[1]*sr),y=p[1]-(pe[0]*sr+pe[1]*cr);
  cels.place(`face:${actor}`,{rigid:true,x,y,height:drawnH,rotation:roll,view:VIEW_ID,time:0,order:3});
  return{actor,portrait:true,x:+x.toFixed(1),y:+y.toFixed(1),h:drawnH,drawnW:+drawnW.toFixed(1),eyeScreen:[+p[0].toFixed(1),+p[1].toFixed(1)],
    roll:+roll.toFixed(4),mouth:st.mouthCel,expr:st.expressionCel,emotion};
}
function placeWalk(actor,shot,f,t,env=null){
  const clip=walkClips[actor];if(!clip)return null;
  const a=f.actors[actor],rootW=a.world.root,faceW=a.world.faceCenter;
  const depth=depthOf(rootW);
  if(depth<.25)return{actor,walk:true,culled:true,reason:'behind-camera'};
  const ppu=(H/2)/(Math.tan(cam.fov*Math.PI/360)*depth);
  const drawnH=(faceW[1]-rootW[1])*ppu/(1-clip.eyeFrac);
  const arr=walkDist[`${shot.id}:${actor}`]??[0];
  const dist=arr[Math.min(arr.length-1,Math.round((t-shot.start)*FPS))]??0;
  const footP=proj(rootW);
  // R2 地面贴合：走拍脚底锚点（格 bbox 底中）对到底图地面线；星阶拍无条目=不动
  if(env)footP[1]+=groundDy(shot,actor,f,env.pt,env.plate,footP[1]);
  const N=clip.spec.frames.length,s=drawnH/clip.spec.size[1];
  const index=((Math.floor(dist/clip.spec.cycleTravel*N)%N)+N)%N;
  const bb=walkCells[actor][index]; // [x0,y0,x1,y1] 格内 alpha bbox → 脚底锚点对 bbox 底中
  const bbCx=(bb[0]+bb[2])/2,bbB=bb[3];
  const x=footP[0]-(bbCx-clip.spec.anchor[0])*s,y=footP[1]-(bbB-clip.spec.anchor[1])*s;
  const tint=env?.plate?tintFor(env.sample(footP[0],Math.min(H-6,footP[1]-drawnH*.3))):null;
  const st=clip.place({distance:dist,direction:1,x,y,height:drawnH,view:VIEW_ID,order:2,tint});
  return{actor,key:`${actor}:walk`,walk:true,index,distance:+dist.toFixed(3),x:+x.toFixed(1),y:+y.toFixed(1),h:+drawnH.toFixed(1),
    footScreen:[+footP[0].toFixed(1),+footP[1].toFixed(1)],contact:f.actors[actor].contact,tint};
}

// ── 接触影（bake 足部投影，贴地才画；R2：按场景主光方向的方向性软影，强度提升）──
function contactShadows(actor,f,light){
  const a=f.actors[actor];if(!a?.visible)return;
  for(const side of ['left','right']){
    const fw=a.world[side+'Foot'];if(!fw)continue;
    if(fw[1]-a.root[1]>.12)continue; // 抬脚不画
    const p=proj(fw);
    if(p[0]<-40||p[0]>W+40||p[1]<-40||p[1]>H+40)continue;
    const s=placementScale(actor,f);
    drawGroundContact(g,{x:p[0],y:p[1]+2,radiusX:24*s,radiusY:5.5*s,opacity:light?.op??.40,
      cast:[(light?.cast[0]??60)*s,(light?.cast[1]??-14)*s]});
  }
}
function placementScale(actor,f){const d=Math.max(.25,depthOf(f.actors[actor].world.root));return(H/2)/(Math.tan(cam.fov*Math.PI/360)*d)/500;}

// ── 字幕条（样式同 3D 版 viewer.js）──
const SUB_COLOR={Eileen:'#cfe0ff',Alder:'#ffd9a0',LadyMoon:'#e8e4f4',Narrator:'#d8d4c8'};
function drawSubtitle(t){
  const sub=TL.subtitles.find(s=>t>=s.start-.06&&t<s.end);
  if(!sub||!sub.text)return null;
  const fragments=(sub.text.match(/[^，。！？…—]+[，。！？…—]?/g)??[sub.text])
    .flatMap(f=>{const out=[];while(f.length>24){out.push(f.slice(0,24));f=f.slice(24);}if(f)out.push(f);return out;});
  const lines=[];let line='';
  for(const f of fragments){
    if((line+f).length>24&&line){lines.push(line);line='';}
    line+=f;
    if(/[！？]$/.test(f)){lines.push(line);line='';}
  }if(line)lines.push(line);
  const y=H-56-(lines.length-1)*34;
  g.font='bold 25px Microsoft YaHei';g.textAlign='center';g.lineWidth=6;g.lineJoin='round';
  for(let i=0;i<lines.length;i++){
    g.strokeStyle='rgba(12,12,18,.88)';g.fillStyle=SUB_COLOR[sub.character]??'#fff';
    g.strokeText(lines[i],W/2,y+i*34);g.fillText(lines[i],W/2,y+i*34);
  }
  return sub.text;
}

// ── 光效 overlay（2D 承担 3D 反馈光：同包络，径向辉光）──
function glow(x,y,r,color,alpha){
  if(alpha<=0)return;
  g.save();g.globalAlpha=Math.min(1,alpha);g.globalCompositeOperation='lighter';
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
}
// 泪光包络（effects/magic.js 泪光 PointLight 同式，2D 辉光承担）
function tearLight(t){
  if(t<366)return 0;
  if(t<369)return .6+2.4*clamp((t-366)/3);
  if(t<369.6)return 9;
  return 9-4*clamp((t-369.6)/4)+5*clamp((t-373)/3);
}

// ── R2 环境动态（画布层，世界锚点投影，纯 t 闭式=seek 安全；包络同 3D 场景 update）──
// 包络（与 scenes/*.js update 逐式对齐）
const finK=t=>t<456?1:Math.max(0,1-(t-456)/7);                       // FINALE_DIM@456
const lowK=t=>clamp((t-376)/2.5)*clamp((398-t)/2.5);                 // m50-52 低谷
const moonDimK=t=>t<44?1:t<185?.82:.55;                              // S01 月衰
const moonFadeT=t=>t<186?1:Math.max(.45,1-(t-186)*.008);             // S03 月衰
const palDimK=t=>t<317?1:Math.max(.22,1-(t-317)/9);                  // S04 月光逐缕熄灭
const palGlowK=t=>t<369?0:Math.min(1,(t-369)/6);                     // S04 泪碎回暖
const wakeK=t=>t<156?0:Math.min(1,(t-156)/22);                       // S02 星醒
function envOverlays(t,f,pk,pt,plate){
  const info={};
  const sc=segAt(t).scene;
  // 月光光晕呼吸（S01 夜/S03；底图月亮已压暗，光晕由本层补；"黯淡细银"=低透明度银蓝）
  if((sc==='snowtown'&&t<422)||sc==='towertop'){
    const isTower=sc==='towertop';
    const moonW=isTower?statics.moonTower:statics.moonSnow;
    if(moonW){
      const p=proj(moonW),depth=depthOf(moonW);
      const ppu=(H/2)/(Math.tan(cam.fov*Math.PI/360)*Math.max(.6,depth));
      const dim=isTower?moonFadeT(t):moonDimK(t);
      const a=.13*dim*(.85+.15*Math.sin(t*.45))*finK(t);
      const r=5*ppu*2.4*(isTower?(1-(1-moonFadeT(t))*.25):1);
      glow(p[0],p[1],r,'#cfe0f4',a);
      glow(p[0],p[1],r*2.1,'#b8ccee',a*.35); // 月辉洒落感的第二层薄晕
      info.moonHalo=+a.toFixed(3);
    }
  }
  // 窗灯琥珀呼吸摇曳（S01）：**底图空间锚定**——辉光必须落在画出来的窗户上
  //（3D 世界窗位与底图房屋位置不一致，世界锚投影会悬空：R2 实录）。
  // 包络同场景 update：低谷压暗→BELL3@418 依次亮起→终幕熄。
  if(sc==='snowtown'&&plate&&winGlows.plates[pk]){
    const wg=winGlows.plates[pk];
    const winBase=(pk==='s01_snowtown_spring'?1:1-.55*lowK(t));
    const fs=plateScale(pt,plate);
    let mx=0;
    g.save();g.translate(pt.cx,pt.cy);g.scale(fs,fs);g.globalCompositeOperation='lighter';
    wg.glows.forEach((w,i)=>{
      const seq=t>418+i*.5?Math.min(1,(t-418-i*.5)/.8):0;
      const b=Math.max(winBase,seq)*Math.max(finK(t),.001);
      const a=.30*b*(.85+.15*Math.sin(t*1.3+i*1.9));
      if(a<=.003)return;
      mx=Math.max(mx,a);
      const rr=wg.radius;
      const rg=g.createRadialGradient(w[0],w[1],0,w[0],w[1],rr);
      rg.addColorStop(0,`rgba(255,176,80,${a})`);rg.addColorStop(.5,`rgba(255,176,80,${a*.4})`);rg.addColorStop(1,'rgba(255,176,80,0)');
      g.fillStyle=rg;g.fillRect(w[0]-rr,w[1]-rr,rr*2,rr*2);
    });
    g.restore();
    info.winGlow=+mx.toFixed(3);
  }
  // 门缝暖光（m12，84-92s，包络同场景 doorGlow）
  if(sc==='snowtown'&&t>85&&t<92){
    const p=proj([0,1.1,-11.9]);
    glow(p[0],p[1],46,'#ffbe58',Math.min(.75,(t-85)*.5)*.22*finK(t));
    info.doorGlow=true;
  }
  // 工坊油灯琥珀呼吸（S02，星醒反哺包络 warm=24+14*wake）
  if(sc==='clocktower'){
    const p=proj([.8,1.35,-4.1]); // 台面油灯（P5 工作位）
    const a=(.10+.13*wakeK(t))*(.86+.14*Math.sin(t*2.1));
    glow(p[0],p[1],60,'#ffc46a',a);
    info.lampGlow=+a.toFixed(3);
  }
  return info;
}
// S04 失光/回暖纱罩 + S01 低谷窗冷暗（cel 之后、辉光/粒子之前——与终幕纱罩同层纪律）
function sceneDimVeils(t){
  const sc=segAt(t).scene;
  if(sc==='moonpalace'){
    const a=(1-palDimK(t))*.5*(1-palGlowK(t));
    if(a>.003){g.fillStyle=`rgba(8,10,20,${a})`;g.fillRect(0,0,W,H);}
    return a;
  }
  if(sc==='snowtown'&&t<422){
    const a=.34*lowK(t);
    if(a>.003){g.fillStyle=`rgba(10,14,26,${a})`;g.fillRect(0,0,W,H);}
    return a;
  }
  return 0;
}

function draw(t){
  const f=frameAt(t),shot=segAt(t);
  rebuild(f);
  g.clearRect(0,0,W,H);
  // 1) 场景底图（视差取景 + 覆盖钳制 + 月亮压暗遮罩）
  const pk=plateFor(shot.scene,t),plate=plates[pk];
  const pt=plate?plateTransform(shot,f,plate):{cx:640,cy:360,z:1};
  if(plate){
    const fit=Math.max(W/plate.width,H/plate.height)*OVERSCAN;
    g.save();g.translate(pt.cx,pt.cy);g.scale(fit*pt.z,fit*pt.z);
    g.drawImage(plate,-plate.width/2,-plate.height/2);
    for(const d of grade.plates[pk]?.dim??[]){
      const mx=(d.x-.5)*plate.width,my=(d.y-.5)*plate.height,mr=d.r*plate.width;
      // multiply 合成因子 = 1-α+α·L：解 α 使中心因子恰为 d.value（L=0.35 灰保色相）
      const L=89,alpha=(1-d.value)/(1-L/255);
      const rg=g.createRadialGradient(mx,my,0,mx,my,mr);
      rg.addColorStop(0,`rgba(${L},${L},${L+8},${alpha})`);
      rg.addColorStop(.55,`rgba(${L},${L},${L+8},${alpha*.55})`);
      rg.addColorStop(1,'rgba(255,255,255,0)');
      g.globalCompositeOperation='multiply';g.fillStyle=rg;
      g.fillRect(mx-mr,my-mr,mr*2,mr*2);g.globalCompositeOperation='source-over';
    }
    g.restore();
  }else{g.fillStyle='#101522';g.fillRect(0,0,W,H);}
  // 1.5) R2 环境动态画布层（月光晕/窗灯/门缝/油灯——世界锚点投影，跟着镜头走）
  const envInfo=envOverlays(t,f,pk,pt,plate);
  // 1.6) R2 m59 塔顶阳台补件（底图无此 3D 构件；平台色=她脚底处底图塔身木材实测采样）
  if(shot.id==='m59'){
    const rootW=f.actors.Eileen.world.root; // 阳台面=她脚底（topBalcony 世界锚点）
    const p=proj(rootW);
    const ppu=(H/2)/(Math.tan(cam.fov*Math.PI/360)*Math.max(.5,depthOf(rootW)));
    const bw=Math.min(1.25*ppu,W*.35),bh=Math.max(9,.13*ppu);
    const wood=samplePlateAt(pk,pt,plate,p[0],p[1]-24,9); // 脚底紧贴塔身木板
    const post=Math.max(5,.07*ppu);
    g.save();g.translate(p[0],p[1]);
    g.strokeStyle=`rgb(${wood[0]*.62|0},${wood[1]*.6|0},${wood[2]*.62|0})`;g.lineWidth=post;
    const railH=.62*ppu;
    for(const rx of[-bw*.44,-bw*.15,bw*.15,bw*.44]){g.beginPath();g.moveTo(rx,-4);g.lineTo(rx,-4-railH);g.stroke();} // 栏杆立柱
    g.beginPath();g.moveTo(-bw/2,-4-railH);g.lineTo(bw/2,-4-railH);g.stroke();  // 扶手横杆
    g.fillStyle=`rgb(${wood[0]*.95|0},${wood[1]*.93|0},${wood[2]*.95|0})`;
    g.beginPath();g.roundRect(-bw/2,-4,bw,bh,3);g.fill();          // 台面
    g.fillStyle=`rgb(${wood[0]*.72|0},${wood[1]*.7|0},${wood[2]*.74|0})`;
    g.fillRect(-bw/2,bh-6,bw,6);                                     // 前檐板
    g.strokeStyle='rgba(20,16,12,.45)';g.lineWidth=1.2;
    for(let i=1;i<5;i++){g.beginPath();g.moveTo(-bw/2+i*bw/5,-3);g.lineTo(-bw/2+i*bw/5,bh-5);g.stroke();} // 板缝
    g.restore();
  }
  // 2) 接触影 → 人物 cel/走拍/肖像（R2：地面贴合+分区 tint+rim+呼吸）
  cels.begin();
  const bodies=[],faceStates=[];
  const light=LIGHT_STYLE[pk==='s01_snowtown_spring'?'spring':shot.scene];
  const env={shot,pt,plate,pk,t,light,sample:(sx,sy)=>samplePlateAt(pk,pt,plate,sx,sy)};
  for(const actor of ['LadyMoon','Alder','Eileen']){ // 夫人最远先画
    const a=f.actors[actor];
    if(!a?.visible)continue;
    const entry=castFor(shot,actor,t);
    const key=entry.cel;
    let b=null;
    if(key==='portrait')b=placePortrait(actor,shot,f,t,entry);
    else if(key==='walk')b=placeWalk(actor,shot,f,t,env);
    else if(key)b=placeBody(actor,`${actor}:${key}`,f,entry.anchor,env);
    if(b&&!b.culled){
      (b.mouth!==undefined?faceStates:bodies).push(b);
      if(b.walk){ // 走拍接触影：bbox 脚底锚点处单椭圆
        const s=placementScale(actor,f);
        drawGroundContact(g,{x:b.footScreen[0],y:b.footScreen[1]+2,radiusX:26*s,radiusY:5.5*s,opacity:light?.op??.40,cast:[(light?.cast[0]??60)*s,(light?.cast[1]??-14)*s]});
      }else if(!b.portrait)contactShadows(actor,f,light);
    }
  }
  cels.render();cels.render(); // 双渲染沉淀
  g.drawImage(celRenderer.domElement,0,0);
  // 2.5) 曝光调度：场景失光/低谷纱罩 + 终幕渐暗+片尾淡出——必须在灯光辉光与粒子层之前压暗
  // （3D 版黑场纱罩纪律：灯焰与加色粒子 renderOrder=20 后画保持亮度——
  //   "黑场仅铜灯亮"+金粒聚字签名镜头；A4 前版把纱罩画在粒子上层，聚字被压死）
  envInfo.dimVeil=+sceneDimVeils(t).toFixed(3);
  if(shot.scene==='snowtown'&&t>=456)g.fillStyle=`rgba(4,6,12,${.92*(1-clamp(1-(t-456)/7))+0})`,g.fillRect(0,0,W,H);
  if(t>=473){g.fillStyle=`rgba(3,4,8,${clamp((t-473)/4.5)})`;g.fillRect(0,0,W,H);}
  // 2.6) m53 第一片花瓣（3D 版=magic.js petalHand 网格实体、2D 模式不建——
  //   A4 重宿主为画片：纯 t 闭式，395.2 飘落→396.3 落手背→407 前静止。
  //   锚点=奥尔德当前 cel 的**画内手**（handFrac，不是 bake 手——bake 手是 3D 摊掌高位，
  //   与画内手位不同；A4 初版锚 bake 手导致花瓣浮在马甲上）；
  //   飘落行程仍按 bake 深度折算世界 1.1m→像素。道具画片非粒子特效。）
  if(shot.scene==='snowtown'&&t>=395.2&&t<407){
    const b=bodies.find(x=>x.actor==='Alder'&&!x.culled&&x.key);
    const meta=b?celMeta[b.key]:null,hf=meta?.handFrac;
    if(b&&hf){
      const k=clamp((t-395.2)/1.1);
      const dA=Math.max(.25,depthOf(f.actors.Alder.world.root));
      const ppuA=(H/2)/(Math.tan(cam.fov*Math.PI/360)*dA);
      const s=b.h/meta.canvas.height,drawnW=meta.canvas.width*s;
      const hx=b.x+(hf[0]-.5)*drawnW,hy=b.y-(1-hf[1])*b.h;
      const px=hx+.06*(1-k)*Math.sin(t*7)*ppuA,py=hy-(.045+1.1*(1-k)*(1-k))*ppuA;
      const pr=.024*ppuA,rot=.4*(1-k)*Math.sin(t*5);
      g.save();g.translate(px,py);g.rotate(rot);
      g.fillStyle='#ffcce0';g.beginPath();g.ellipse(0,0,pr,pr*.55,0,0,Math.PI*2);g.fill();
      g.strokeStyle='rgba(214,128,150,.85)';g.lineWidth=Math.max(1,pr*.09);
      g.beginPath();g.moveTo(-pr*.8,0);g.quadraticCurveTo(0,pr*.22,pr*.8,0);g.stroke();
      g.restore();
    }
  }
  // 3) 灯光反馈 2D 辉光（灯焰/泪光，包络同 3D）
  if(f.lampLit){const p=proj(f.anchors.world.flameAnchor);glow(p[0],p[1],55,'#ffbe58',.16);}
  const tl=tearLight(t);
  if(tl>0){const p=proj(f.anchors.world.tearAnchor);glow(p[0],p[1],40+tl*20,'#cfe0f4',.05*tl);
    if(t>=369)glow(p[0],p[1],520,'#dfe8f8',.10*clamp((t-369)/2));} // 泪碎后纱幕回暖近似（3D 为逐层点亮，见 NOTES A3）
  // 4) 粒子 3D 层（'lighter'）
  const fxInfo=fx.draw(g,t,fxRenderer);
  // 5) 首帧淡入（盖一切，含粒子——与 3D 版一致：0s 全黑起）
  if(t<1){g.fillStyle=`rgba(3,4,8,${1-ease(t/1)})`;g.fillRect(0,0,W,H);}
  const subtitle=drawSubtitle(t);
  return{t:+t.toFixed(3),shot:shot.id,kind:shot.kind,scene:shot.scene,plate:pk,plateView:pt,
    bodies,faces:faceStates,particles:fxInfo,env:envInfo,subtitle,missingAssets};
}

// 必须先 draw 后 toDataURL（A0 翻车实录：先抓图=拿上一帧画布）
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};
window.stepAt=t=>draw(t);

// ── probe 接口（a3_probe.mjs 消费）：渲染实测断言（测像素不测参数）──
const measureCanvas=document.createElement('canvas');measureCanvas.width=W;measureCanvas.height=H;
const mg=measureCanvas.getContext('2d',{willReadFrequently:true});
window.__art={
  missingAssets,landmarkCheck,
  projAt(t,p){rebuild(frameAt(t));return proj(p);},
  frameAt,
  // 单角色 cel 层实测：只显示该角色当帧 mesh，读 alpha bbox 与列带顶/底
  measureSpan(t,actor){
    const st=draw(t);
    const b=[...st.bodies,...st.faces].find(x=>x.actor===actor);
    if(!b||b.culled)return{actor,placed:false};
    const key=b.portrait?`face:${actor}`:b.key;
    for(const [k,c] of cels.cells)c.mesh.visible=(k===key);
    cels.render();
    mg.clearRect(0,0,W,H);mg.drawImage(celRenderer.domElement,0,0);
    const data=mg.getImageData(0,0,W,H).data;
    let top=H,bottom=0,left=W,right=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>24){
      if(y<top)top=y;if(y>bottom)bottom=y;if(x<left)left=x;if(x>right)right=x;}
    return{actor,key,placed:true,top,bottom,left,right,
      measuredH:bottom-top,expectedH:b.h,eyeScreen:b.eyeScreen,roll:b.roll??0,drawnW:b.drawnW??null};
  },
  // 单角色 cel 层在 (x,y) 半径 r 内的最大 alpha（画中道具对 bake 锚点的像素级验证）
  alphaNear(t,actor,x,y,r=12){
    const st=draw(t);
    const b=[...st.bodies,...st.faces].find(xx=>xx.actor===actor);
    if(!b||b.culled)return{placed:false,maxAlpha:0};
    const key=b.portrait?`face:${actor}`:b.key;
    for(const [k,c] of cels.cells)c.mesh.visible=(k===key);
    cels.render();
    mg.clearRect(0,0,W,H);mg.drawImage(celRenderer.domElement,0,0);
    let max=0;
    const x0=Math.max(0,Math.floor(x-r)),x1=Math.min(W-1,Math.ceil(x+r));
    const y0=Math.max(0,Math.floor(y-r)),y1=Math.min(H-1,Math.ceil(y+r));
    const data=mg.getImageData(x0,y0,x1-x0+1,y1-y0+1).data;
    for(let i=3;i<data.length;i+=4)if(data[i]>max)max=data[i];
    return{placed:true,maxAlpha:max};
  },
  // seek 一致：乱序双渲同帧像素等
  seekPair(t){const a=window.renderAt(t).image;const b=window.renderAt(t).image;return a===b;},
  // R2 地面贴合验收：全 64 拍逐拍分类（ground=断言脚底在地面带 / 其余=显式豁免理由），
  // ground 条目渲染实测：body=该角色 cel 层实测 alpha 底边、walk=走拍脚底锚点，对帧级 gy。
  groundReport(){
    const rows=[];
    for(const shot of shotTable.shots){
      const mid=(shot.start+shot.end)/2;
      const f=frameAt(mid);rebuild(f);
      const plate=plates[plateFor(shot.scene,mid)];
      const pt=plate?plateTransform(shot,f,plate):{cx:640,cy:360,z:1};
      const st=draw(mid);
      const placed=[...st.bodies,...st.faces];
      for(const actor of ['Eileen','Alder','LadyMoon']){
        const a=f.actors[actor];
        const b=placed.find(x=>x.actor===actor);
        const entry=ground.shots[shot.id]?.[actor];
        if(entry&&entry.mode!=='ground'){
          rows.push({shot:shot.id,actor,mode:entry.mode,note:entry.note??''});
          continue;
        }
        if(!a?.visible||!b||b.culled){rows.push({shot:shot.id,actor,mode:'none',note:'不可见/剔除'});continue;}
        if(b.portrait){rows.push({shot:shot.id,actor,mode:'none',note:'肖像拍'});continue;}
        const rp=proj(a.world.root);
        if(!entry){
          // 无条目=按默认规则豁免：脚底出画/微距上身
          rows.push({shot:shot.id,actor,mode:'none',
            note:rp[1]>H+40?'脚底出画下缘':'无标定（脚底出画或道具锚定拍）',bakeFoot:+rp[1].toFixed(0)});
          continue;
        }
        // gy 重解（同 groundDy 的路径）
        const s=plateScale(pt,plate);
        const px=(rp[0]-pt.cx)/s+plate.width/2;
        const gy=pt.cy+(lineInterp(entry.line,px)-plate.height/2)*s;
        let measured;
        if(b.walk)measured=b.footScreen[1];
        else measured=Math.min(719,this.measureSpan(mid,actor).bottom??719);
        const tol=entry.tol??ground.tolerancePx;
        rows.push({shot:shot.id,actor,mode:'ground',gy:+gy.toFixed(1),measured:+measured.toFixed(1),
          diff:+(measured-gy).toFixed(1),tol,ok:Math.abs(measured-gy)<=tol});
      }
    }
    return rows;
  },
  state(t){return draw(t);},
};
window.__motion=motion;
await document.fonts.ready;
window.ready=true;
