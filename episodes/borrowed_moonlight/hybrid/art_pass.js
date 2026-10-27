// 《借走月光的女孩》cel-cinema A3 二维原画合成页（art_pass）。
// 骨架学 stardust_clad_s1e2 art_pass_full_r6：镜表驱动、cel-stage 刚性摆放、raster-face、
// 粒子 3D 层重宿主、接触影、字幕条。数据全部来自 bake 与 A1/A2 已验收资产：
//   场景底图 plates（S01 雪/春按 t=422 切）+ 镜表视差取景（阻尼跟随 bake 相机）
//   人物 cel：位置/尺度/朝向 = motion_full.json 逐帧烘焙投影（眼线对 faceCenter、
//     座/足对 root；走拍 = baked-cel-clip 距离驱动相位 + bbox 脚底锚点补偿）
//   raster-face：locked-variant-face（同图锁回变体），jaw 三态接 voice_envs.json
//     能量包络，blink 周期，表情按镜表 emotion（m49 泪碎后切 revived）
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
const [motion,shotTable,TL,envs,cast,grade,statics,manifest]=await Promise.all([
  json('./config/motion_full.json'),json('./config/art_shots.json'),json('../config/timeline.json'),
  json('../config/voice_envs.json'),json('./config/art_cast.json'),json('./config/plate_grade.json'),
  json('./config/static_anchors.json'),json('./assets/manifest.json')]);
if(motion.schema!=='dula-motion-2d-pilot-v1')throw Error('bad motion schema');
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
const _f0=new THREE.Vector3(),_f1=new THREE.Vector3();
function plateTransform(shot,f){
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
  const cx=640-dAz*ppr*PAN_K,cy=360+dEl*ppr*PAN_K; // 相机右转 → 底图左移
  const zFull=(d0*Math.tan(fov0*Math.PI/360))/Math.max(.5,d1*Math.tan(f.camera.fov*Math.PI/360));
  // 底图在拍内只放不收：推近主体时远景真实缩放<1（相机离背景更远），但底图是有限画幅，
  // 收缩会露边（m47 推灯左侧黑带翻车实录）——压掉收缩，保留推近的放大。
  return{cx,cy,z:Math.min(2.5,Math.max(1,1+(zFull-1)*ZOOM_K))};
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
function jawFor(actor,t){
  const sp=actor.toLowerCase();
  const line=envs.lines.find(l=>l.speaker===sp&&t>=l.t0&&t<l.t0+l.dur);
  if(!line)return 0;
  return Math.max(0,line.jaw[Math.floor((t-line.t0)/line.dt)]??0);
}
const BLINK_PHASE={Eileen:.47,Alder:1.82,LadyMoon:2.9};
function blinkFor(actor,t){const b=((t+BLINK_PHASE[actor])%4.7);return b<.16?Math.sin(b/.16*Math.PI):0;}
function emotionFor(actor,shot,t,entry){
  // emotionTimeline 取代镜表 emotion：[[t0,emotion],...] 取最后一个 t0<=t；之前=base（null）
  if(entry?.emotionTimeline){let em=null;for(const [t0,e] of entry.emotionTimeline)if(t>=t0)em=e;return em;}
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

// ── 摆放（全部刚性：位置/尺度来自 bake 逐帧投影）──
function placement(actor,fracY,fracX,f,refWorldY){
  const a=f.actors[actor];
  const rootW=a.world.root,faceW=a.world.faceCenter??[rootW[0],rootW[1]+1.25,rootW[2]];
  const depth=Math.max(.25,depthOf(rootW));
  const ppu=(H/2)/(Math.tan(cam.fov*Math.PI/360)*depth);
  const eyeToRef=faceW[1]-(refWorldY??rootW[1]);
  const drawnH=eyeToRef*ppu/Math.max(.05,(fracY.ref-fracY.eye));
  return{a,faceW,rootW,ppu,drawnH};
}
function placeBody(actor,celKey,f,anchor='eye',opts={}){
  const meta=celMeta[celKey];if(!meta||meta.missing)return null;
  const {drawnH,faceW,rootW,a}=placement(actor,{ref:meta.refFrac,eye:meta.eyeFrac},0,f);
  if(depthOf(rootW)<.25)return{actor,key:celKey,culled:true,reason:'behind-camera'};
  const s=drawnH/meta.canvas.height,drawnW=meta.canvas.width*s;
  let target,frac;
  if(anchor==='lamp'&&meta.lampFrac){target=proj(f.anchors.world.flameAnchor);frac=meta.lampFrac;}
  else{target=proj(faceW);frac=[meta.faceX,meta.eyeFrac];}
  let x=target[0]-(frac[0]-.5)*drawnW;
  // groundY：画幅级落地修正——bake 脚底投影落在底图无支撑处（如屋脊线）时，
  // 显式给定脚底屏幕 y（仅静态机位拍可用；A4：m62 奥尔德远景落在右房屋脊上）
  let y=target[1]+(1-frac[1])*drawnH;
  if(opts.groundY!==undefined)y=opts.groundY;
  // shiftXY：屏幕空间平移修正（pan 拍里 groundY 定点会滑脚，改整画随镜平移；
  //   A4：m56 奥尔德远景随镜横移时投影点爬上屋脊，整体下移回雪院）
  if(opts.shiftXY){x+=opts.shiftXY[0];y+=opts.shiftXY[1];}
  // AABB 剔除：整画在画幅外则不摆放（构图缺席≠数据缺失）
  if(x+drawnW/2<-120||x-drawnW/2>W+120||y<-120||y-drawnH>H+120)return{actor,key:celKey,culled:true};
  cels.place(celKey,{rigid:true,x,y,height:drawnH,view:VIEW_ID,time:0,order:2});
  return{actor,key:celKey,x:+x.toFixed(1),y:+y.toFixed(1),h:+drawnH.toFixed(1),
    eyeScreen:[+target[0].toFixed(1),+target[1].toFixed(1)],anchor,rigid:true};
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
function placeWalk(actor,shot,f,t){
  const clip=walkClips[actor];if(!clip)return null;
  const a=f.actors[actor],rootW=a.world.root,faceW=a.world.faceCenter;
  const depth=depthOf(rootW);
  if(depth<.25)return{actor,walk:true,culled:true,reason:'behind-camera'};
  const ppu=(H/2)/(Math.tan(cam.fov*Math.PI/360)*depth);
  const drawnH=(faceW[1]-rootW[1])*ppu/(1-clip.eyeFrac);
  const arr=walkDist[`${shot.id}:${actor}`]??[0];
  const dist=arr[Math.min(arr.length-1,Math.round((t-shot.start)*FPS))]??0;
  const footP=proj(rootW);
  const N=clip.spec.frames.length,s=drawnH/clip.spec.size[1];
  const index=((Math.floor(dist/clip.spec.cycleTravel*N)%N)+N)%N;
  const bb=walkCells[actor][index]; // [x0,y0,x1,y1] 格内 alpha bbox → 脚底锚点对 bbox 底中
  const bbCx=(bb[0]+bb[2])/2,bbB=bb[3];
  const x=footP[0]-(bbCx-clip.spec.anchor[0])*s,y=footP[1]-(bbB-clip.spec.anchor[1])*s;
  const st=clip.place({distance:dist,direction:1,x,y,height:drawnH,view:VIEW_ID,order:2});
  return{actor,key:`${actor}:walk`,walk:true,index,distance:+dist.toFixed(3),x:+x.toFixed(1),y:+y.toFixed(1),h:+drawnH.toFixed(1),
    footScreen:[+footP[0].toFixed(1),+footP[1].toFixed(1)],contact:f.actors[actor].contact};
}

// ── 接触影（bake 足部投影，贴地才画）──
function contactShadows(actor,f){
  const a=f.actors[actor];if(!a?.visible)return;
  for(const side of ['left','right']){
    const fw=a.world[side+'Foot'];if(!fw)continue;
    if(fw[1]-a.root[1]>.12)continue; // 抬脚不画
    const p=proj(fw);
    if(p[0]<-40||p[0]>W+40||p[1]<-40||p[1]>H+40)continue;
    const s=placementScale(actor,f);
    drawGroundContact(g,{x:p[0],y:p[1]+2,radiusX:22*s,radiusY:5*s,opacity:.26,cast:[60* s,-14*s]});
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

function draw(t){
  const f=frameAt(t),shot=segAt(t);
  rebuild(f);
  g.clearRect(0,0,W,H);
  // 1) 场景底图（视差取景 + 月亮压暗遮罩）
  const pk=plateFor(shot.scene,t),plate=plates[pk];
  const pt=plateTransform(shot,f);
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
  // 2) 接触影 → 人物 cel/走拍/肖像
  cels.begin();
  const bodies=[],faceStates=[];
  for(const actor of ['LadyMoon','Alder','Eileen']){ // 夫人最远先画
    const a=f.actors[actor];
    if(!a?.visible)continue;
    const entry=castFor(shot,actor,t);
    const key=entry.cel;
    let b=null;
    if(key==='portrait')b=placePortrait(actor,shot,f,t,entry);
    else if(key==='walk')b=placeWalk(actor,shot,f,t);
    else if(key)b=placeBody(actor,`${actor}:${key}`,f,entry.anchor,{groundY:entry.groundY,shiftXY:entry.shiftXY});
    if(b&&!b.culled){
      (b.mouth!==undefined?faceStates:bodies).push(b);
      if(b.walk){ // 走拍接触影：bbox 脚底锚点处单椭圆
        const s=placementScale(actor,f);
        drawGroundContact(g,{x:b.footScreen[0],y:b.footScreen[1]+2,radiusX:24*s,radiusY:5*s,opacity:.26,cast:[60*s,-14*s]});
      }else if(!b.portrait)contactShadows(actor,f);
    }
  }
  cels.render();cels.render(); // 双渲染沉淀
  g.drawImage(celRenderer.domElement,0,0);
  // 2.5) 曝光调度：终幕渐暗+片尾淡出——必须在灯光辉光与粒子层之前压暗
  // （3D 版黑场纱罩纪律：灯焰与加色粒子 renderOrder=20 后画保持亮度——
  //   "黑场仅铜灯亮"+金粒聚字签名镜头；A4 前版把纱罩画在粒子上层，聚字被压死）
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
    bodies,faces:faceStates,particles:fxInfo,subtitle,missingAssets};
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
  state(t){return draw(t);},
};
window.__motion=motion;
await document.fonts.ready;
window.ready=true;
