// tomorrow_still_bright T3 art_pass：绘画空间合成页。
// 底图原生像素相机（painted-space.js）+ M-07 cel 刚性摆放 + 道具 cel + 接触影
// + 眼光圈表演轨 + 环境动态 + OSD/字幕/片名卡。2D canvas 单链，绝对时钟纯函数。
import {paintedCamera,actorInPlate,softContact,saturate,lerp} from './assets/draw_over_runtime/painted-space.js';
import {radialLight,drawWeatherParticles} from './assets/draw_over_runtime/painted-weather.js';

const W=1280,H=720,FPS=30,END=480;
const json=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status} ${u}`);return r.json();});
const [TL,staging,cast,manifest]=await Promise.all([
  json('../config/timeline.json'),json('./config/staging.json'),
  json('./config/art_cast.json'),json('./assets/manifest.json')]);
if(TL.duration!==END)throw Error('timeline duration mismatch');
window.duration=END;
const ease=x=>{x=saturate(x);return x*x*(3-2*x);};

// ── 资产装载：只装 manifest 登记项，缺失进 missingAssets ──
const listed=new Set(manifest.assets.map(a=>a.path));
const missingAssets=[];
async function loadImg(p){
  if(!listed.has(p)){missingAssets.push(p);return null;}
  const im=new Image();im.src='./assets/'+p;await im.decode();return im;
}
function trimCel(image){
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
  const a=g.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(a[(y*c.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<x0){x0=0;y0=0;x1=c.width-1;y1=c.height-1;}
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;
  out.getContext('2d').drawImage(c,x0,y0,out.width,out.height,0,0,out.width,out.height);
  return{canvas:out,bbox:[x0,y0,x1,y1]};
}

const plates={},cels={},props={},faces={};
for(const p of ['plate_corridor','plate_corridor_dim','plate_greenhouse','plate_warehouse','plate_lounge','plate_powerroom','plate_cockpit','plate_exterior'])
  plates[p]=await loadImg(`plates/${p}.png`);
for(const [key,def] of Object.entries(cast.cels)){
  const im=await loadImg(def.img);
  if(!im)continue;
  const {canvas,bbox}=trimCel(im);
  cels[key]={canvas,eyeFrac:def.eyeFrac??.10,eyeX:def.eyeX??.5};
}
// walk 相位格：脚锚=画布内身体底部（自适应裁切居中贴回，scale=1）
const walkCellsJson=await json('./assets/'+cast.walk.cells);
const walkFrames=[],walkAnchor=[];
for(let i=0;i<cast.walk.frames.length;i++){
  const im=await loadImg(cast.walk.frames[i]);
  if(!im)continue;
  walkFrames.push(im);
  const bb=walkCellsJson.cells[i].alpha_bbox,bodyH=bb[3]-bb[1]+1,bodyW=bb[2]-bb[0]+1;
  walkAnchor.push({cx:(1024+bodyW)/2-(bb[2]+bb[0]+2)/2+ (bb[0]+bb[2]+2)/2,footY:(1536+bodyH)/2,bodyH});
  // cx 公式化简后 = 512（身体居中贴回）；保留 footY 逐格差异
  walkAnchor[walkAnchor.length-1].cx=512;
}
const propPaths=new Set();
for(const sd of Object.values(staging.shots))
  for(const k of ['lampProp','batteryProp','cupProp','domeProp','drawingPocket'])
    if(sd[k]?.img)propPaths.add(sd[k].img);
for(const p of propPaths)props[p]=await loadImg(p);
faces.base=await loadImg(cast.faces.base);
faces.variants={};
for(const [k,p] of Object.entries(cast.faces.variants))faces.variants[k]=await loadImg(p);

// ── 眼光圈表演轨（与 T1 performance.js EYE 同源）──
const EYE_RAW=[
  [0,{a:1,g:.15,al:0}],
  [66,{a:1.1,g:.9,al:0}],[70,{a:1,g:.15,al:0}],
  [128,{a:.7,g:.3,al:0}],[133,{a:1,g:.15,al:0}],
  [146,{a:1.15,g:1,al:0}],[152,{a:.75,g:.4,al:0}],[157,{a:1,g:.15,al:0}],
  [164,{a:.8,g:.2,al:0}],[172,{a:1,g:.15,al:0}],
  [210.5,{a:1.15,g:1,al:0}],[212.5,{a:.45,g:.08,al:0}],
  [216.5,{a:.45,g:.08,al:0}],[218,{a:1,g:.15,al:0}],
  [304,{a:1.05,g:.6,al:0}],[318,{a:.6,g:.25,al:0}],[326,{a:1,g:.15,al:0}],
  [334,{a:.9,g:.5,al:1}],[342,{a:1,g:.15,al:0}],
  [367.2,{a:1.05,g:.6,al:0}],[368.2,{a:.5,g:.3,al:0}],[373.5,{a:1,g:.15,al:0}],
  [384,{a:1.1,g:.8,al:0}],[388,{a:1,g:.2,al:0}],
  [418,{a:1.05,g:.5,al:0}],[422,{a:1,g:.2,al:0}],
  [458,{a:1.1,g:.4,al:0}],[480,{a:1.1,g:.35,al:0}]];
function eyeAt(t){
  if(t<=EYE_RAW[0][0])return EYE_RAW[0][1];
  let i=0;while(i+1<EYE_RAW.length&&EYE_RAW[i+1][0]<=t)i++;
  if(i+1>=EYE_RAW.length)return EYE_RAW.at(-1)[1];
  const u=ease((t-EYE_RAW[i][0])/(EYE_RAW[i+1][0]-EYE_RAW[i][0]));
  const A=EYE_RAW[i][1],B=EYE_RAW[i+1][1];
  return{a:lerp(A.a,B.a,u),g:lerp(A.g,B.g,u),al:lerp(A.al,B.al,u)};
}

const segAt=t=>TL.segments.find(s=>t>=s.start&&t<s.end)??TL.segments.at(-1);
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const g=canvas.getContext('2d',{willReadFrequently:true});

// ── OSD（顶部等宽屏显，cue 起 2.6s；CRITICAL 红且持续到 342）──
const OSD_TEXT={
  OSD_NONESSENTIAL:'NON-ESSENTIAL OBJECT',
  OSD_LIFE:'LIFE SIGNAL DETECTED / 2.1%',
  OSD_SHUTTLE:'SHUTTLE READY / AUX BATTERY 38%',
  OSD_DISABLES:'REMOVAL DISABLES LAUNCH',
  OSD_CRITICAL:'CORE POWER CRITICAL',
  OSD_LOWPOWER:'LOW-POWER LIGHT ONLINE',
  OSD_HABITAT:'HABITAT STABLE / LIGHT ON',
  OSD_SUNRISE:'NEXT SUNRISE 06:42'};
function drawOSD(t){
  for(const seg of TL.segments){
    for(const c of seg.cues??[]){
      if(!c.name?.startsWith('OSD_'))continue;
      const dur=c.name==='OSD_CRITICAL'?8:2.6;
      if(t<c.at||t>=c.at+dur)continue;
      const red=c.name==='OSD_CRITICAL';
      const a=.92*saturate((t-c.at)/.15)*saturate((c.at+dur-t)/.3+.2);
      g.save();g.globalAlpha=a;
      g.font='bold 21px Consolas, "Courier New", monospace';g.textAlign='center';
      const txt=OSD_TEXT[c.name],tw=g.measureText(txt).width;
      g.fillStyle='rgba(8,12,20,.72)';g.fillRect(W/2-tw/2-16,26,tw+32,34);
      g.fillStyle=red?'#ff5a4a':'#ffd28a';
      g.fillText(txt,W/2,50);g.restore();
      return c.name;
    }
  }
  return null;
}
// ── 字幕 ──
const SUB_COLOR={Eva:'#b8c8dc',Girl:'#ffd9a0',Narrator:'#d8d4c8'};
function drawSubtitle(t){
  const sub=TL.subtitles.find(s=>t>=s.start&&t<s.end);
  if(!sub)return null;
  g.font='bold 24px Microsoft YaHei';g.textAlign='center';g.lineWidth=6;g.lineJoin='round';
  const label=sub.character==='Eva'?'EVA：':'';
  const txt=label+sub.text;
  g.strokeStyle='rgba(10,12,18,.88)';g.fillStyle=SUB_COLOR[sub.character]??'#fff';
  g.strokeText(txt,W/2,H-52);g.fillText(txt,W/2,H-52);
  return sub.text;
}

// ── M-07 绘制（entries 分段 + xfade + 脚锚 + 接触影 + 眼辉光）──
function entryAt(entries,t){
  for(let i=0;i<entries.length;i++)if(entries[i].until===undefined||t<entries[i].until)
    return{cur:entries[i],prev:i>0?entries[i-1]:null,start:i>0?entries[i-1].until:-1};
  return{cur:entries.at(-1),prev:null,start:-1};
}
function drawCel(key,b,alpha=1){
  if(alpha<=0)return;
  g.save();g.globalAlpha=alpha;
  if(key==='walk'){
    const idx=Math.max(0,Math.min(walkFrames.length-1,Math.floor(b.u*(b.steps??2)*2)%walkFrames.length));
    const an=walkAnchor[idx],k=b.h/an.bodyH;
    g.drawImage(walkFrames[idx],b.x-an.cx*k,b.y-an.footY*k,1024*k,1536*k);
  }else{
    const cel=cels[key];
    if(!cel){missingAssets.push(key);g.restore();return;}
    const k=b.h/cel.canvas.height,w=cel.canvas.width*k;
    g.drawImage(cel.canvas,b.x-w/2,b.y-b.h,w,b.h);
    b.w=w;
  }
  g.restore();
}
function m07At(entry,t,seg,camera){
  const spec=entry.path||entry.at?{at:entry.at??entry.path[0],to:entry.to,path:entry.path,walk:entry.walk,screen:entry.screen}:entry;
  const b=actorInPlate(spec,t,seg.start,seg.end,camera);
  b.steps=entry.walk?.steps;
  b.cel=entry.cel;
  return b;
}
function drawM07(t,seg,sd,camera,dips){
  if(!sd.m07)return null;
  const {cur,prev,start}=entryAt(sd.m07,t);
  const b=m07At(cur,t,seg,camera);
  if(dips)for(const d of dips){
    const u=(t-d.at)/d.dur;
    if(u>0&&u<1)b.y+=d.amp*Math.sin(u*Math.PI);
  }
  let fade=1;
  if(cur.fadeOut&&t>=cur.fadeOut[0])fade=1-saturate((t-cur.fadeOut[0])/(cur.fadeOut[1]-cur.fadeOut[0]));
  if(!cur.screen)softContact(g,b.x,b.y,b.h,{opacity:.3*fade});
  const xf=sd.sitXfade&&cur.cel==='m07_sit_rest'?sd.sitXfade:.3;
  const blend=start>=0?saturate((t-start)/xf):1;
  if(prev&&blend<1){
    const pb=m07At(prev,t,seg,camera);
    drawCel(pb.cel,pb,(1-blend)*fade);
  }
  drawCel(cur.cel,b,blend*fade);
  b.alpha=blend*fade;
  return b;
}
function eyeOverlay(b,t){
  if(!b||b.cel==='walk'||b.alpha<=0)return;
  const cel=cels[b.cel];if(!cel)return;
  const e=eyeAt(t),w=b.w??b.h*.5;
  const ex=b.x+(cel.eyeX-.5)*w,ey=b.y-b.h*(1-cel.eyeFrac);
  const pulse=e.al>0?(.5+.5*Math.sin(t*22)):0;
  const glow=.08+.38*e.g+pulse*.3;
  radialLight(g,ex,ey,Math.max(4,b.h*.05*e.a),e.al>0?'#ff4a3a':'#9fd8ff',glow*b.alpha);
  b.eyeScreen=[ex,ey];
}

// ── 环境动态与道具（全部绝对时钟）──
function drawProp(img,at,camera,{alpha=1,rot=0,anchor='bottom'}={}){
  if(!img||alpha<=0)return;
  const[x,y,h]=at,[sx,sy]=camera.point([x,y]),k=h*camera.scale/img.height,w=img.width*k;
  g.save();g.globalAlpha=alpha;g.translate(sx,sy);if(rot)g.rotate(rot*Math.PI/180);
  g.drawImage(img,-w/2,anchor==='bottom'?-h*camera.scale:-h*camera.scale/2,w,h*camera.scale);
  g.restore();
  return[sx,sy,w,h*camera.scale];
}
const rnd=(i,k=0)=>{const v=Math.sin(i*127.1+k*311.7)*43758.5453;return v-Math.floor(v);};
function drawSparks(t,sd){
  const s=sd.sparks;if(!s)return;
  const cam=cameraCache;
  // 焊接弧光：整个焊接窗口可读（蓝白小弧光+暖晕，带轻闪）
  const arcOn=t>=s.t0-3.2&&t<s.t1+6.8;
  if(arcOn){
    const[ax,ay]=cam.point(s.tip);
    const flick=.8+.2*Math.sin(t*31);
    radialLight(g,ax,ay,26*cam.scale,'#ffd9a0',.35*flick);
    radialLight(g,ax,ay,9*cam.scale,'#dff2ff',.75*flick);
  }
  if(t<s.t0||t>s.t1+1.4)return;
  for(let i=0;i<24;i++){
    const born=s.t0+i*.09,life=.5+rnd(i,1)*.5,age=t-born;
    if(age<0||age>life)continue;
    const vx=(rnd(i,2)-.5)*150,vy=-(40+rnd(i,3)*120);
    const px=s.tip[0]+vx*age,py=s.tip[1]+vy*age+260*age*age;
    const[sx,sy]=cam.point([px,py]);
    const a=(1-age/life)*.95;
    radialLight(g,sx,sy,(4*(1-age/life)+1.6)*cam.scale,'#ffc25e',a);
    g.save();g.globalCompositeOperation='lighter';g.globalAlpha=a*.9;
    g.fillStyle='#fff3d8';g.beginPath();g.arc(sx,sy,Math.max(.8,1.4*cam.scale),0,Math.PI*2);g.fill();g.restore();
  }
}
function drawScatter(t,sd){
  const s=sd.scatter;if(!s||t<s.at)return;
  const age=t-s.at,k=ease(saturate(age/.5));
  for(let i=0;i<s.count;i++){
    const dx=(rnd(i,1)-.5)*260*k,dy=(rnd(i,2)-.4)*120*k+40*k;
    const[sx,sy]=cameraCache.point([s.from[0]+dx,s.from[1]+Math.max(0,dy)]);
    g.save();g.translate(sx,sy);g.rotate(rnd(i,3)*6*k);
    g.fillStyle='rgba(96,108,126,.95)';
    g.fillRect(-10,-4,20,8);
    g.fillStyle='rgba(150,160,175,.7)';g.fillRect(-10,-4,20,2);
    g.restore();
  }
}
let cameraCache=null;
function drawShuttle(t,sd){
  const s=sd.shuttle;if(!s)return;
  const u=ease(saturate((t-t0Seg)/(segDur)));
  const x=lerp(s.from[0],s.to[0],u),y=lerp(s.from[1],s.to[1],u)+Math.sin(t*.8)*3;
  const size=lerp(s.sizeFrom,s.sizeTo,u);
  const[sx,sy]=cameraCache.point([x,y]),k=size*cameraCache.scale;
  g.save();g.translate(sx,sy);
  g.fillStyle='#5a6675';
  g.beginPath();g.moveTo(-k*.5,0);g.quadraticCurveTo(-k*.5,-k*.24,0,-k*.24);
  g.quadraticCurveTo(k*.55,-k*.24,k*.62,0);g.quadraticCurveTo(k*.55,k*.24,0,k*.24);
  g.quadraticCurveTo(-k*.5,k*.24,-k*.5,0);g.fill();
  g.fillStyle='#39424e';g.fillRect(-k*.18,-k*.24,k*.1,k*.48);
  g.fillStyle='#ffd28a';g.beginPath();g.arc(k*.22,0,Math.max(1.2,k*.06),0,Math.PI*2);g.fill();
  radialLight(g,-k*.55,0,k*.35,'#9fd8ff',.35);
  g.restore();
}
let t0Seg=0,segDur=1;

function draw(t){
  const seg=segAt(t),sd=staging.shots[seg.id]??{};
  t0Seg=seg.start;segDur=seg.end-seg.start;
  const camera=paintedCamera(sd.camera,t,seg.start,seg.end,W,H);
  cameraCache=camera;
  g.clearRect(0,0,W,H);g.fillStyle='#0b0e14';g.fillRect(0,0,W,H);

  // ── s10 眼部特写插入（screen insert，不走 plate）──
  if(sd.eyeInsert){
    const e=eyeAt(t);
    let key='base';
    if(e.al>0)key='alarm';else if(e.g>.7)key='glow';else if(e.a<.85)key='shrink';
    const imgs={base:faces.base,...faces.variants};
    const order=['base','glow','shrink','alarm'];
    const cur=imgs[key]??faces.base;
    // 简单 crossfade：与上一状态 0.25s
    const size=H*.96;
    g.drawImage(cur,W/2-size/2,(H-size)/2,size,size);
    // 扫描线（146-148）
    if(t>=146&&t<148){
      const u=(t-146)/2;
      g.save();g.globalAlpha=.5*(1-Math.abs(u-.5)*2);
      g.fillStyle='#9fe8ff';g.fillRect(W/2-size/2,H/2-size/2+u*size,size,3);g.restore();
    }
    drawOSD(t);drawSubtitle(t);
    return{t,shot:seg.id,kind:'eye_insert',variant:key,camera};
  }

  // ── 底图（长廊亮/灭双态；s04 逐段熄灭：灭版为底，亮版渐隐）──
  if(sd.plate){
    if(sd.dimPlate){
      const steps=sd.dimSteps.filter(x=>t>=x).length;
      const a=steps/4;
      g.drawImage(plates[sd.dimPlate],camera.x,camera.y,1920*camera.scale,1080*camera.scale);
      if(a<1){g.save();g.globalAlpha=1-a;
        g.drawImage(plates[sd.plate],camera.x,camera.y,1920*camera.scale,1080*camera.scale);g.restore();}
    }else{
      g.drawImage(plates[sd.plate],camera.x,camera.y,1920*camera.scale,1080*camera.scale);
    }
  }

  // ── 环境动态 ──
  if(sd.stationLights){
    sd.stationLights.positions.forEach((p,i)=>{
      if(t>=sd.stationLights.off[i])return;
      const[sx,sy]=camera.point(p);
      radialLight(g,sx,sy,14*camera.scale,'#ffca7a',.5+.1*Math.sin(t*3+i));
    });
  }
  if(seg.id==='s29'){
    // 末盏灯：450 前亮
    if(t<sd.lastLightOff){const[sx,sy]=camera.point([990,340]);radialLight(g,sx,sy,13*camera.scale,'#ffca7a',.55);}
  }
  if(sd.fan){
    const f=sd.fan,[sx,sy]=camera.point(f.pos),r=f.r*camera.scale;
    const speed=t<f.spinUntil?6:Math.max(0,6*(1-(t-f.spinUntil)/(f.stopBy-f.spinUntil)));
    g.save();g.translate(sx,sy);
    g.strokeStyle='rgba(40,48,60,.9)';g.lineWidth=Math.max(1.5,r*.08);
    g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();
    g.rotate(t*speed);
    g.fillStyle='rgba(70,80,96,.95)';
    for(let i=0;i<3;i++){g.rotate(Math.PI*2/3);g.beginPath();g.moveTo(0,0);g.lineTo(r*.9,-r*.14);g.lineTo(r*.9,r*.14);g.closePath();g.fill();}
    g.fillStyle='rgba(30,36,46,1)';g.beginPath();g.arc(0,0,r*.18,0,Math.PI*2);g.fill();
    g.restore();
  }
  if(sd.screwDrop&&t>=sd.screwDrop.t0){
    const s=sd.screwDrop,u=Math.min(1,(t-s.t0)/(s.t1-s.t0));
    const[sx,sy]=camera.point([s.from[0],lerp(s.from[1],s.to[1],u*u)]);
    radialLight(g,sx,sy,5,'#cfe0f0',.9);
  }
  if(sd.doorGlow&&t>=sd.doorGlow.t0){
    const d=sd.doorGlow;let u=ease(saturate((t-d.t0)/(d.t1-d.t0)));
    if(d.taper&&t>=d.taper[0])u*=1-saturate((t-d.taper[0])/(d.taper[1]-d.taper[0]));
    if(u>0.003){
      const w=d.w*u,[sx,sy]=camera.point([d.center[0],d.center[1]]);
      const gw=Math.max(1,w*camera.scale),gh=d.h*camera.scale;
      const grad=g.createLinearGradient(sx-gw/2,0,sx+gw/2,0);
      grad.addColorStop(0,'rgba(255,205,130,0)');grad.addColorStop(.5,`rgba(255,205,130,${.55*u})`);grad.addColorStop(1,'rgba(255,205,130,0)');
      g.save();g.fillStyle=grad;
      g.fillRect(sx-gw/2,sy-gh/2,gw,gh);g.restore();
      radialLight(g,sx,sy,150*camera.scale*u,'#ffca7a',.25*u);
    }
  }
  if(sd.switchPlate){
    const[sx,sy]=camera.point(sd.switchPlate),k=camera.scale;
    g.save();g.translate(sx,sy);
    g.fillStyle='#2e3540';g.fillRect(-9*k,-16*k,18*k,32*k);
    g.fillStyle='#c8cdd6';g.fillRect(-3*k,-8*k,6*k,16*k);
    g.restore();
  }
  if(sd.scanRect&&t>=sd.scanRect.t0&&t<sd.scanRect.t1){
    const r=sd.scanRect,u=(t-r.t0)/(r.t1-r.t0);
    const[sx,sy]=camera.point([r.rect[0],r.rect[1]]),[sx2,sy2]=camera.point([r.rect[0]+r.rect[2],r.rect[1]+r.rect[3]]);
    g.save();g.globalAlpha=.55*(1-Math.abs(u-.5)*2);
    g.fillStyle='#9fe8ff';g.fillRect(sx,lerp(sy,sy2,u),sx2-sx,3);g.restore();
  }
  if(sd.photoFlicker){
    const f=sd.photoFlicker;
    let a=0;
    if(t>=f.from)a=.10+.08*Math.sin(t*37)+.04*Math.sin(t*13.7);
    if(f.dimAt&&t>=f.dimAt)a=.55;
    const[sx,sy]=camera.point([f.rect[0],f.rect[1]]),[sx2,sy2]=camera.point([f.rect[0]+f.rect[2],f.rect[1]+f.rect[3]]);
    if(a>0){g.save();g.fillStyle=`rgba(10,14,24,${Math.max(0,a)})`;g.fillRect(sx,sy,sx2-sx,sy2-sy);g.restore();}
  }
  if(sd.musicBoxGlow&&t>=sd.musicBoxGlow.t0&&t<sd.musicBoxGlow.t1+1){
    const m=sd.musicBoxGlow,u=saturate((t-m.t0)/(m.t1-m.t0));
    const[sx,sy]=camera.point(m.pos);
    radialLight(g,sx,sy,60*camera.scale,'#ffd28a',.3*Math.sin(u*Math.PI)*(1+.2*Math.sin(t*9)));
  }
  // 当帧身体坐标：依赖 body 的环境光一律当帧重算，禁读跨帧缓存（顺序/seek 分叉，T5 踩坑）
  const bNow=sd.m07?m07At(entryAt(sd.m07,t).cur,t,seg,camera):null;
  if(sd.meterBeeps)for(const b of sd.meterBeeps){
    const u=(t-b)/.5;
    if(u>0&&u<1&&bNow){radialLight(g,bNow.x,bNow.y-bNow.h*.45,26*camera.scale,'#8affa0',.4*Math.sin(u*Math.PI));}
  }
  if(sd.lampProp){
    const L=sd.lampProp;
    const alpha=L.fadeIn?saturate((t-L.fadeIn[0])/(L.fadeIn[1]-L.fadeIn[0])):1;
    drawProp(props[L.img],L.at,camera,{alpha});
    if(t>=L.glowFrom){
      let ga=.5;
      if(L.dimWindow&&t>=L.dimWindow[0]&&t<L.dimWindow[1])ga=.22;
      const[sx,sy]=camera.point([L.at[0],L.at[1]-L.at[2]*.7]);
      radialLight(g,sx,sy,110*camera.scale,'#ffca7a',ga*(.92+.08*Math.sin(t*5)));
    }
  }
  if(sd.lampGlow&&t>=sd.lampGlow.onAt){
    const[sx,sy]=camera.point(sd.lampGlow.pos);
    let ga=.55;
    if(sd.lightDimAt&&t>=sd.lightDimAt)ga=.25;
    radialLight(g,sx,sy,150*camera.scale,'#ffc06a',ga*(.92+.08*Math.sin(t*4)));
  }
  if(sd.lightDimAt&&t>=sd.lightDimAt){
    g.fillStyle='rgba(6,10,18,.14)';g.fillRect(0,0,W,H);
  }
  if(sd.batteryProp){
    const bp=sd.batteryProp;
    const at=bp.handAt&&t>=bp.handFrom?bp.handAt:bp.at;
    drawProp(props[bp.img],at,camera,{anchor:'bottom'});
    if(bp.tag&&t<bp.tag.until){
      const[sx,sy]=camera.point([bp.at[0]+30,bp.at[1]-55]);
      g.save();g.fillStyle='#e8d9a8';g.fillRect(sx-16,sy-10,32,18);
      g.fillStyle='#7a2020';g.font='bold 13px Consolas, monospace';g.textAlign='center';
      g.fillText('100%',sx,sy+3);g.restore();
    }
  }
  if(sd.foamPad&&t>=sd.foamPad.from){
    const[sx,sy]=camera.point(sd.foamPad.at);
    g.save();g.fillStyle='#3a4250';
    g.beginPath();g.ellipse(sx,sy,sd.foamPad.at[2]*camera.scale/2,8*camera.scale,0,0,Math.PI*2);g.fill();g.restore();
  }
  if(sd.cupProp){
    let rot=0;
    forconst: for(const tw of sd.cupProp.tilts??[]){
      if(t>=tw[0]&&t<tw[1]){rot=tw[2]*Math.sin(Math.PI*(t-tw[0])/(tw[1]-tw[0]));break forconst;}
    }
    drawProp(props[sd.cupProp.img],sd.cupProp.at,camera,{rot});
  }
  if(sd.domeProp){
    const d=sd.domeProp,alpha=d.fadeIn?saturate((t-d.fadeIn[0])/(d.fadeIn[1]-d.fadeIn[0])):1;
    drawProp(props[d.img],d.at,camera,{alpha});
  }
  if(sd.drawingPocket&&t>=sd.drawingPocket.t0&&t<sd.drawingPocket.t1){
    const d=sd.drawingPocket,u=ease((t-d.t0)/(d.t1-d.t0));
    const at=[lerp(d.from[0],d.to[0],u),lerp(d.from[1],d.to[1],u),lerp(d.from[2],d.to[2],u)];
    drawProp(props[d.img],at,camera,{alpha:1-u*.5});
  }
  if(sd.dust)drawWeatherParticles(g,t,{width:W,height:H,kind:'dust',strength:.9,wind:.4});
  if(sd.shuttle)drawShuttle(t,sd);
  if(sd.dawnGlow){
    const[sx,sy]=camera.point(sd.dawnGlow.pos);
    radialLight(g,sx,sy,700*camera.scale,'#ffcf7e',.4*ease(saturate((t-sd.dawnGlow.from)/4)));
    radialLight(g,sx,sy-120*camera.scale,300*camera.scale,'#ffe9b8',.3*ease(saturate((t-sd.dawnGlow.from)/4)));
  }
  if(sd.alarm&&t>=sd.alarm.t0&&t<sd.alarm.t1){
    const pulse=.25+.75*Math.abs(Math.sin(t*11));
    if(bNow){
      radialLight(g,bNow.x,bNow.y-bNow.h*.45,90*camera.scale,'#ff3a2a',.35*pulse);
    }
    g.fillStyle=`rgba(255,40,20,${.06*pulse})`;g.fillRect(0,0,W,H);
  }

  // ── M-07 ──
  const body=drawM07(t,seg,sd,camera,sd.dips);
  eyeOverlay(body,t);

  // ── 遮挡层：底图子矩形重绘盖住人物下部（桌后站位）──
  if(sd.occluders&&sd.plate){
    const img=plates[sd.dimPlate&&sd.dimSteps?.filter(x=>t>=x).length===4?sd.dimPlate:sd.plate];
    for(const [x0,y0,x1,y1] of sd.occluders){
      const[a,b]=camera.point([x0,y0]),[c,d]=camera.point([x1,y1]);
      g.drawImage(img,x0,y0,x1-x0,y1-y0,a,b,c-a,d-b);
    }
  }
  // 火星/散件在遮挡层之后（焊点就在桌前，遮挡重绘会盖住光效——本集踩坑）
  drawSparks(t,sd);
  drawScatter(t,sd);

  // ── 眼态全局微光（s14 静止 3 秒的暗眼等由 eyeAt 承担）──

  // ── 开场淡入 / 片名卡 / 终场淡出 ──
  if(t<.6){g.fillStyle=`rgba(4,6,10,${.7*(1-ease(t/.6))})`;g.fillRect(0,0,W,H);}
  if(sd.title&&t>=sd.title.from){
    const a=ease(saturate((t-sd.title.from)/1.2));
    g.save();g.globalAlpha=a;g.font='bold 52px "KaiTi", "STKaiti", serif';g.textAlign='center';
    g.fillStyle='#f4ead8';g.shadowColor='rgba(255,200,120,.6)';g.shadowBlur=24;
    g.fillText(sd.title.text,W/2,H/2-20);g.restore();
  }
  if(t>=479.5){g.fillStyle=`rgba(2,3,6,${saturate((t-479.5)/.5)})`;g.fillRect(0,0,W,H);}

  const osd=drawOSD(t),subtitle=drawSubtitle(t);
  return{t,shot:seg.id,scene:seg.scene,plate:sd.plate,camera:{x:camera.x,y:camera.y,scale:camera.scale},
    coverage:[camera.x,camera.y,camera.x+1920*camera.scale,camera.y+1080*camera.scale],
    body:body?{cel:body.cel,x:body.x,y:body.y,h:body.h,alpha:body.alpha}:null,osd,subtitle,missingAssets};
}

window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};
window.stepAt=t=>draw(t);
window.__art={
  missingAssets,
  state:t=>draw(t),
  seekPair:t=>window.renderAt(t).image===window.renderAt(t).image,
  // M-07 当帧 cel 的实测 alpha bbox（测渲染结果不测参数）
  measureBody(t){
    const st=draw(t);
    if(!st.body||st.body.alpha<=0)return{placed:false};
    const data=g.getImageData(0,0,W,H).data;
    // 找身体 cel 大致区域（以 body.x,y,h 为中心窗）内的非底图像素——用 alpha 意义不大
    // （底图不透明），改为回报摆放参数+帧内位置，像素级验证走逐镜目检 PNG。
    return{placed:true,...st.body};
  },
  coverage(t){return draw(t).coverage;},
};
await document.fonts.ready;
window.ready=true;
