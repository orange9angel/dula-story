// R3: native painted coordinates drive camera, cast, practicals and contact clock.
// 3D bake remains the absolute-time source for narrative particle simulations.
import * as THREE from 'three';
import {createCelStage,clamp,ease} from './assets/draw_over_runtime/cel-stage.js';
import {createFeatheredVariantFace as createLockedVariantFace} from './assets/draw_over_runtime/feathered-variant-face.js';
import {directRoomActor,roomComposite,storyParticles,performanceMotion} from './cinema_direction_r4.js';
import {createBakedCelClip} from './assets/draw_over_runtime/baked-cel-clip.js';
import {createRehostedFX} from './fx_rehost.js';
import {paintedCamera,actorInPlate,contactSchedule,softContact} from './assets/draw_over_runtime/painted-space.js';
import {radialLight,cloudTransmission} from './assets/draw_over_runtime/painted-weather.js';
import {drawRegisteredFX} from './cinema_fx.js';
import {backgroundAtmosphere,particles,drawDoor,tableOcclusion} from './cinema_direction.js';
const staging=await fetch('./config/cinema_staging_r4.json').then(r=>r.json());


const W=1280,H=720,FPS=30,END=478;
const json=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status} ${u}`);return r.json();});
const [motion,shotTable,TL,envs,cast,grade,statics,manifest,ground,winGlows]=await Promise.all([
  json('./config/motion_full.json'),json('./config/art_shots.json'),json('../config/timeline.json'),
  json('../config/voice_envs.json'),json('./config/art_cast_r4.json'),json('./config/plate_grade.json'),
  json('./config/static_anchors.json'),json('./assets/manifest_r4.json'),json('./config/ground_calib.json'),
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
    if(def.faceRig){
      const vr={};for(const [k,v] of Object.entries(def.faceRig.variants))vr[k]={...v,src:'./assets/'+v.img};
      meta.face=await createLockedVariantFace({id:celKey,base:'./assets/'+def.img,variants:vr,mouth:def.faceRig.mouth,blink:def.faceRig.blink});
    }
    cels.register(celKey,trimmed,{dynamic:!!meta.face});
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
  for(const [k,v] of Object.entries(fc.variants))variants[k]={...v,src:'./assets/'+v.img};
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
  const preset=JAW_CFG[line.speaker]??{half:.085,open:.31};
  const positive=line.jaw.filter(v=>v>.008).sort((a,b)=>a-b),p80=positive[Math.floor(positive.length*.8)]??.4;
  const k=Math.max(.40,Math.min(1,p80/.48));
  const cfg={half:Math.max(.025,preset.half*k),open:Math.max(.09,preset.open*k)};
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
  return JAW_OUT[line.jawState[Math.floor((Math.floor((t-line.t0)*15)/15)/line.dt)]??0];
}
const blinkTimes={};
for(const [i,actor] of ['Eileen','Alder','LadyMoon'].entries()){
  const times=[];let at=1.3+i*1.1,n=0;
  while(at<END){times.push(at);at+=3.0+((Math.sin(++n*8.12+i*3.7)+1)/2)*2.7;}
  for(const l of envs.lines.filter(l=>l.character===actor))times.push(l.t0+l.dur+.15);
  times.sort((a,b)=>a-b);blinkTimes[actor]=times.filter((v,j)=>!j||v-times[j-1]>.65);
}
function blinkFor(actor,t){for(const at of blinkTimes[actor]??[]){const u=(t-at)/.23;if(u>=0&&u<=1)return Math.sin(u*Math.PI);}return 0;}
function snapToBlink(actor,t0){const at=(blinkTimes[actor]??[]).find(v=>v>=t0&&v-t0<.65);return at===undefined?t0:at+.115;}
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

const lowK=t=>clamp((t-376)/2.5)*clamp((398-t)/2.5);
const palDimK=t=>t<317?1:Math.max(.22,1-(t-317)/9);
const palGlowK=t=>t<369?0:Math.min(1,(t-369)/6);
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

// Generated paint layers registered to the original facial drawings.
const cloudImg=await loadImg('cinema_r3/clouds.png');
const roofClean=await loadImg('cinema_r3/roof_clean.png');
const alphaMasks={};
for(const actor of ['Eileen','Alder','LadyMoon'])alphaMasks[actor]=await loadImg(`cinema_r3/${actor.toLowerCase()}_alpha.png`);
function getLamp(b){
  if(!b)return null;
  const m=celMeta[b.key];
  const frac=m?.lampFrac??(b.walk?[.80,.64]:b.key?.includes('hold_lamp_close')?[.5,.27]:[.76,.66]);
  return[b.x+(frac[0]-.5)*b.w,b.y-(1-frac[1])*b.h];
}
function paintedFX(t,f,bodies,faceStates,camera){if(segAt(t).scene==='clocktower')return{scene:'clocktower',replacedBy:'story-particles'};return drawRegisteredFX({g,fx,t,bodies,faceStates,camera,getLamp});}
function draw(t){
  const f=frameAt(t),shot=segAt(t),sd=staging.shots[shot.id];rebuild(f);
  const camera=paintedCamera(sd.camera,t,shot.start,shot.end,W,H);
  const pk=sd.plate??plateFor(shot.scene,t);
  const stairK=clamp((t-235)/6)*(1-clamp((t-382)/5));
  const plate=pk==='s03_star_stairs'&&stairK===0?roofClean:plates[pk];
  const pt={cx:camera.x+960*camera.scale,cy:camera.y+540*camera.scale,z:camera.z/1.2};
  g.clearRect(0,0,W,H);g.fillStyle='#101724';g.fillRect(0,0,W,H);
  if(plate){
    g.save();if(sd.portrait)g.filter='blur(4px)';g.drawImage(plate,camera.x,camera.y,1920*camera.scale,1080*camera.scale);
    if(pk==='s03_star_stairs'&&stairK>0&&stairK<1){g.globalAlpha=1-stairK;g.drawImage(roofClean,camera.x,camera.y,1920*camera.scale,1080*camera.scale);}
    g.restore();
  }
  const envInfo=backgroundAtmosphere(g,{t,shot:sd,plate,camera,clouds:cloudImg});
  if(sd.door)drawDoor(g,plate,camera,t);
  // Retained footprints follow contact events in painting space, independently of camera.
  if(shot.scene==='snowtown'&&t<91){
    for(const walkId of ['m04','m11','m12']){
      const ws=staging.shots[walkId],spec=ws.actors.Eileen;
      for(const e of contactSchedule(spec,ws.start,ws.end)){
        if(e.time>t||t-e.time>70)continue;
        const b=actorInPlate(spec,e.time,ws.start,ws.end,camera),dx=(e.side==='left'?-1:1)*b.h*.04;
        g.save();g.translate(b.x+dx,b.y);g.rotate(-.25);g.fillStyle='rgba(30,52,83,.23)';g.beginPath();g.ellipse(0,0,b.h*.025,b.h*.012,0,0,6.283);g.fill();g.restore();
      }
    }
  }
  particles(g,t,sd,false);
  cels.begin();const bodies=[],faceStates=[];
  for(const [actor,authored] of Object.entries(sd.actors)){
    const spec=directRoomActor(actor,authored,t,shot);
    const b=actorInPlate(spec,t,shot.start,shot.end,camera);b.actor=actor;
    const color=shot.scene==='clocktower'?[.84,.75,.63]:t>=422?[1,.97,.87]:shot.scene==='moonpalace'?[.86,.91,1]:[.77,.86,1];
    if(spec.cel==='portrait'){
      const face=faces[actor],entry=castFor(shot,actor,t),emotion=emotionFor(actor,shot,t,entry);
      const st=face.paint({jaw:jawFor(actor,t),emotion,blink:blinkFor(actor,t)});
      const q=face.canvas.getContext('2d');q.globalCompositeOperation='destination-in';q.drawImage(alphaMasks[actor],0,0,face.canvas.width,face.canvas.height);q.globalCompositeOperation='source-over';
      b.w=face.canvas.width/face.canvas.height*b.h;b.portrait=true;b.key=`face:${actor}`;
      b.eyeScreen=[b.x,b.y-b.h*(1-face.anchor.eyeY)];
      // Small head inclination is safe only after removing the rectangular backing.
      const roll=.008*Math.sin((t-shot.start)*.4);
      cels.place(b.key,{rigid:true,x:b.x,y:b.y,height:b.h,rotation:roll,view:VIEW_ID,order:5,tint:color});
      faceStates.push({...b,mouth:st.mouthCel,expr:st.expressionCel,emotion,roll});
    }else if(spec.cel==='walk'){
      const clip=walkClips[actor],bb=walkCells[actor][b.index],bh=bb[3]-bb[1],scale=b.h/bh;
      b.w=(bb[2]-bb[0])*scale;b.walk=true;b.key=`${actor}:walk`;b.footScreen=[b.x,b.y];
      const x=b.x-((bb[0]+bb[2])/2-clip.spec.anchor[0])*scale,y=b.y-(bb[3]-clip.spec.anchor[1])*scale;
      const st=clip.place({distance:b.phase*clip.spec.cycleTravel,x,y,height:scale*512,view:VIEW_ID,order:3,tint:color});
      b.sourceImage=st.sourceImage;
      softContact(g,b.x,b.y,b.h,{opacity:.36});bodies.push(b);
    }else{
      b.key=`${actor}:${spec.cel}`;const meta=celMeta[b.key];
      if(!meta){missingAssets.push(b.key);continue;}
      b.w=meta.canvas.width/meta.canvas.height*b.h;
      if(meta.face){
        const state=meta.face.paint({jaw:jawFor(actor,t),blink:blinkFor(actor,t)});
        const q=meta.canvas.getContext('2d');q.clearRect(0,0,meta.canvas.width,meta.canvas.height);q.drawImage(meta.face.canvas,-meta.bbox[0],-meta.bbox[1]);
        b.facial=state;b.eyeScreen=[b.x,b.y-b.h*(1-meta.eyeFrac)];
      }
      b.bottleFrac=meta.def.bottleFrac;
      if(!spec.screen)softContact(g,b.x,b.y,b.h,{opacity:shot.scene==='moonpalace'?.26:.34});
      if(shot.scene==='moonpalace'&&!spec.screen){
        g.save();g.translate(b.x,b.y+3);g.scale(1,-.28);g.globalAlpha=.15;g.filter='blur(2px)';g.drawImage(meta.canvas,-b.w/2,-b.h,b.w,b.h);g.restore();
      }
      cels.place(b.key,{rigid:false,x:b.x,y:b.y,height:b.h,view:VIEW_ID,time:t,breath:.55,...performanceMotion(actor,t,shot),order:spec.occlusion?2:3,tint:color});
      bodies.push(b);
    }
  }
  cels.render();g.drawImage(celRenderer.domElement,0,0);
  roomComposite(g,{t,shot,sd,camera,bodies,canvas:celRenderer.domElement});
  if(Object.values(sd.actors).some(a=>a.occlusion==='table'))tableOcclusion(g,plate,camera);
  // Moon passage and local practicals color the final cast, not an unrelated world anchor.
  if(shot.scene==='snowtown'&&t<422){g.fillStyle=`rgba(12,25,58,${(1-cloudTransmission(t))*.10})`;g.fillRect(0,0,W,H);}
  envInfo.dimVeil=sceneDimVeils(t);
  if(t>=456){g.fillStyle=`rgba(3,5,10,${.91*clamp((t-456)/7)})`;g.fillRect(0,0,W,H);}
  const lamp=getLamp(bodies.find(b=>b.actor==='Eileen'));
  if(lamp&&f.lampLit){radialLight(g,lamp[0],lamp[1],55,'#ffc579',.18*(.9+.1*Math.sin(t*7)));}
  const fxInfo=paintedFX(t,f,bodies,faceStates,camera);
  particles(g,t,sd,true);
  storyParticles(g,{t,shot,camera,bodies,faceStates,getLamp});
  if(t>=369&&t<374)radialLight(g,700,320,650,'#dceaff',.13*clamp((t-369)/3));
  // Hand petal has its own authored contact on the visible cel.
  if(shot.id==='m53'){
    const b=bodies.find(b=>b.actor==='Alder'),m=b&&celMeta[b.key];
    if(b&&m.handFrac){const k=clamp((t-395.2)/1.1),x=b.x+(m.handFrac[0]-.5)*b.w,y=b.y-(1-m.handFrac[1])*b.h-(1-k)*(1-k)*150;
      if(t>=395.2){g.save();g.translate(x,y);g.rotate(.35*(1-k));g.fillStyle='#efb4cc';g.beginPath();g.ellipse(0,0,8,3.3,0,0,6.283);g.fill();g.restore();}}
  }
  if(t<1){g.fillStyle=`rgba(3,4,8,${.7*(1-ease(t))})`;g.fillRect(0,0,W,H);}
  if(t>=473){g.fillStyle=`rgba(3,4,8,${clamp((t-473)/4)})`;g.fillRect(0,0,W,H);}
  const subtitle=drawSubtitle(t);
  return{t,shot:shot.id,kind:shot.kind,scene:shot.scene,plate:pk,plateView:pt,coverage:[camera.x,camera.y,camera.x+1920*camera.scale,camera.y+1080*camera.scale],bodies,faces:faceStates,particles:fxInfo,env:envInfo,subtitle,missingAssets};
}


// 必须先 draw 后 toDataURL（A0 翻车实录：先抓图=拿上一帧画布）
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};
window.stepAt=t=>draw(t);

// ── probe 接口（a3_probe.mjs 消费）：渲染实测断言（测像素不测参数）──
const measureCanvas=document.createElement('canvas');measureCanvas.width=W;measureCanvas.height=H;
const mg=measureCanvas.getContext('2d',{willReadFrequently:true});
window.__art={
  missingAssets,landmarkCheck,staging,
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
    const ss=staging.shots[st.shot];if(ss.actors[actor]?.occlusion==='table')tableOcclusion(mg,null,paintedCamera(ss.camera,t,ss.start,ss.end,W,H),true);
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
    const ss=staging.shots[st.shot];if(ss.actors[actor]?.occlusion==='table')tableOcclusion(mg,null,paintedCamera(ss.camera,t,ss.start,ss.end,W,H),true);
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
window.__r4={faces,celMeta,envs,blinkTimes,jawFor};
await document.fonts.ready;
window.ready=true;
