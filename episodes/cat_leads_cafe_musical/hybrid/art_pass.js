// 混合制作试片 viewer v5（r5 路线纠正）：撤销 512² 整脸贴片层。
// 表情 = 各身体 cel 自身脸上的眼/嘴窗整换变体（离线 compose，锁区外零差分），
// 眼态（neutral/tease/focus/blink）按 eyesTimeline+blink、嘴态（closed/half/open）按 visemes jaw，
// 变体 cel 整换、禁叠化。侧/背相位无嘴部处理。其余（背景投影/家具锚定/敲杯/转身相位）同 r3-r4。
// 对话窗口：表情供体时间轴（供体整换禁叠化，jaw 驱动嘴窗）+ 敲杯 reach/tap 相连手臂关键画
//   + 桌面无勺 story-state 变体（abs>=11.9 勺在女孩手中）。
// 转身窗口：5 相位关键画（front_open/side_cross/back_open/side_cross 镜像/front_open 收势），
//   脚底锚定烘焙 soles/projected + 接触影，bob≤3px/rotation±1°（关键画自带重心）；
//   front 相位双角色叠 raster-face；侧/背不叠。
// 背景板/家具真实相机投影（烘焙 camera 含俯仰），椅垫贴 pelvis，桌层锚定杯中点。
import * as THREE from 'three';
import {createCelStage} from './assets/draw_over_runtime/cel-stage.js';
import {createCelIntegration, drawGroundContact} from './assets/draw_over_runtime/cel-integration.js';
import {createMotionController} from './assets/draw_over_runtime/motion-controls.js';

const W = 1920, H = 1080, clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const slots = await fetch('./config/cel_slots.json').then(r=>r.json());
const windows = slots.windows;
const missingAssets = [];
// 404 会进 console error 并被 pipeline 当页面错误——只按 manifest 清单加载，缺失零请求。
const manifest = await fetch('./assets/cels/manifest.json').then(r=>r.json()).catch(()=>({files:[]}));
const present = new Set(manifest.files);

function placeholderCanvas(w, h, color, label, mouth){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.clearRect(0,0,w,h);
  g.fillStyle = color; g.globalAlpha = .62;
  g.beginPath(); g.roundRect(w*.14, h*.03, w*.72, h*.94, Math.min(w,h)*.09); g.fill();
  g.globalAlpha = 1; g.strokeStyle = '#1c2733'; g.lineWidth = Math.max(3,w*.012); g.stroke();
  if(mouth){
    g.strokeStyle = '#1c2733'; g.lineWidth = 8; g.beginPath();
    const my = h*.68, mx = w*.5;
    if(mouth==='closed'){ g.moveTo(mx-40,my); g.lineTo(mx+40,my); }
    else if(mouth==='half'){ g.ellipse(mx, my+6, 26, 16, 0, 0, Math.PI*2); }
    else { g.ellipse(mx, my+12, 30, 38, 0, 0, Math.PI*2); }
    g.stroke();
    g.beginPath(); g.ellipse(w*.38, h*.42, 16, 24, 0, 0, Math.PI*2); g.ellipse(w*.62, h*.42, 16, 24, 0, 0, Math.PI*2);
    g.fillStyle = '#1c2733'; g.fill();
  }
  g.fillStyle = '#10202e'; g.font = `bold ${Math.round(w*.07)}px 'Microsoft YaHei'`; g.textAlign = 'center';
  g.fillText(label, w/2, h*.52); g.font = `${Math.round(w*.045)}px 'Microsoft YaHei'`; g.fillText('占位 cel · 等待原画', w/2, h*.58);
  return c;
}
async function loadImage(path, makePlaceholder){
  if(present.has(path.split('/').pop())){
    const im = new Image(); im.src = path;
    try{ await im.decode(); return {image: im, missing: false}; }catch{/* 落占位 */}
  }
  missingAssets.push(path);
  return {image: makePlaceholder(), missing: true};
}

const canvas = document.querySelector('#film'), g = canvas.getContext('2d');
const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0, 0);
const cels = createCelStage({THREE, renderer, width: W, height: H});
const light = createCelIntegration({width: W, height: H});
const view = {cx: W/2, cy: H/2, z: 1, roll: 0};

const bg = new Image(); bg.src = slots.background; await bg.decode();
const rawCues = await fetch('./'+slots.visemes).then(r=>r.json());
const cues = {Girl: rawCues.filter(c=>c.character==='Girl'), Boy: rawCues.filter(c=>c.character==='Boy')};
const jawAt = (name, t) => cues[name]?.[Math.floor(t*100)]?.jaw ?? 0;
const subtitles = await fetch('./'+slots.subtitles).then(r=>r.json());
// 眼态时间轴（tease/focus 供体眼窗整换语义保留；blink 只在闭嘴帧叠加）
const eyesSetAt = (name, t) => (slots.faceActing.eyesTimeline[name] ?? []).find(w=>t>=w.from && t<w.to)?.set ?? 'neutral';
const mouthAt = (name, t) => {const j = jawAt(name, t); return j>.32 ? 'open' : j>.075 ? 'half' : 'closed';};
// 变体键：同头眼/嘴窗整换变体（离线 compose）；无变体配置/未命中则回退基图
function variantKey(celKey, name, t){
  const spec = slots.faceActing.cels[celKey]; if(!spec) return {key: celKey, eyes: 'none', mouth: 'none'};
  const mouth = mouthAt(name, t);
  let eyes = eyesSetAt(name, t);
  if(!spec.eyes.includes(eyes)) eyes = 'neutral';
  if(blinkAt(t, name==='Girl'?0:.65) > .60 && mouth === 'closed' && spec.blink) eyes = 'blink';
  if(eyes === 'neutral' && mouth === 'closed') return {key: celKey, eyes, mouth};
  const vk = `${celKey}_e${eyes}_m${mouth}`;
  return {key: cels.cells.has(vk) ? vk : celKey, eyes, mouth};
}

const motions = {};
for(const w of windows) motions[w.id] = await fetch('./'+w.motion).then(r=>r.json());
const rigs = Object.fromEntries(Object.entries(slots.actors).map(([name, a])=>[name+'_body', {actor: name, ...a.rig}]));
const controls = Object.fromEntries(windows.map(w=>[w.id,
  createMotionController({motion: motions[w.id], rigs, pixelsPerMeter: 420, maxDelta: 60})]));

// ── 转身段（r8）：纯画序列 + 整拍冻结。删驱动层 warp/bob/rotation/sway——movement 全来自换画，
// 除整画随烘焙根位移的（整数像素）平移外无任何形变/摆动/旋转/呼吸。
// 朝向按绝对角度选画、禁止时间倒放：女孩右起转（sign=+1，含补画 t1r/t7r 与背面 t3/t5 镜像），
// 男孩正向验证序列（sign=-1）。扇区中心对齐标称角（0°=front_open）。
const TAU = Math.PI*2;
const turnPhaseIdxOf = (yaw, name) => {
  const sign = slots.turnPhases.sign[name];
  const yawN = (((sign*yaw)%TAU)+TAU)%TAU;
  return Math.floor(((yawN + Math.PI/8) % TAU) / TAU * 8) % 8;
};
const turnWin = windows.find(w=>w.id===slots.turnWindow);
const turnMotion = motions[slots.turnWindow];
// 相位入场帧：该相位在该角色 yaw 序列中首次出现的烘焙帧（初始化时离线算定——
// 落位/影子锚定入场帧烘焙数据，与播放/seek 顺序无关，保证确定性）
const turnPhaseEntry = {Girl: {}, Boy: {}};
for(const f of turnMotion.frames){
  if(f.t < turnWin.turnStart || f.t >= turnWin.turnEnd) continue;
  for(const name of ['Girl','Boy']){
    const idx = turnPhaseIdxOf(f.actors[name].yaw, name);
    if(!(idx in turnPhaseEntry[name])) turnPhaseEntry[name][idx] = f.frame;
  }
}
const turnPreEntry = 0;  // 窗口首帧（36.9 转前站立）
const turnPostEntry = turnMotion.frames.find(f=>f.t>=turnWin.turnEnd).frame;  // 转后站立段入场


const props = {};
for(const [k, spec] of [['chairLeft', slots.furniture.chairLeft], ['chairRight', slots.furniture.chairRight]])
  props[k] = (await loadImage(spec.src, ()=>placeholderCanvas(800, 800, '#b9a06a', k))).image;
for(const [k, src] of [['table', slots.furniture.table.src], ['tableNoSpoon', slots.furniture.table.srcNoSpoon]])
  props[k] = (await loadImage(src, ()=>placeholderCanvas(1920, 1080, '#b9a06a', k))).image;

const actors = {};
for(const [name, spec] of Object.entries(slots.actors)){
  const sit = await loadImage(spec.sitCel.src, ()=>placeholderCanvas(...spec.sitCel.size, spec.placeholderColor, spec.label+' 坐姿'));
  const stand = await loadImage(spec.standCel.src, ()=>placeholderCanvas(...spec.standCel.size, spec.placeholderColor, spec.label+' 站姿'));
  cels.register(name+'_sit', sit.image);
  cels.register(name+'_stand', stand.image);
  // 转身关键画（含正面系同图嘴部变体，批次5，已并入配准）
  for(const [key, tk] of Object.entries(spec.turnKeys)){
    const got = await loadImage(tk.src, ()=>placeholderCanvas(1024, 1536, spec.placeholderColor, spec.label+' '+key));
    cels.register(`${name}_turn_${key}`, got.image);
    for(const st of ['open','half']){
      if(!tk.mouths) break;
      const mv = await loadImage(tk.mouths[st], ()=>placeholderCanvas(1024, 1536, spec.placeholderColor, `${spec.label} ${key} ${st}`));
      cels.register(`${name}_turn_${key}_mouth_${st}`, mv.image);
    }
  }
  actors[name] = {spec, missing: sit.missing || stand.missing};
}
// 同头眼/嘴窗整换变体（r5，离线 compose 产物）
for(const [celKey, spec] of Object.entries(slots.faceActing.cels)){
  const eyesStates = ['neutral', ...spec.eyes, ...(spec.blink ? ['blink'] : [])];
  for(const eyes of eyesStates)
    for(const mouth of (eyes==='blink' ? ['closed'] : ['closed','half','open'])){
      if(eyes==='neutral' && mouth==='closed') continue;
      const vk = `${celKey}_e${eyes}_m${mouth}`;
      const got = await loadImage(`assets/cels/variants2/${vk}.png`, ()=>placeholderCanvas(1024, 1536, '#888', vk));
      if(!got.missing) cels.register(vk, got.image);
    }
}
// 敲杯关键画（仅 Girl）
const tap = slots.tapAction;
let tapImages = null;
if(tap){
  tapImages = {};
  for(const k of ['reachCel','tapCel']){
    const got = await loadImage(tap[k].src, ()=>placeholderCanvas(1024, 1536, '#86b8e8', '敲杯 '+k));
    cels.register('Girl_'+k, got.image); tapImages[k] = got;
  }
}

const windowAt = t => windows.find(w=>t>=w.start && t<w.end);
function nearestWindow(t){
  let best = windows[0], d = Infinity;
  for(const w of windows){const q = clamp(t, w.start, w.end-1e-6), dd = Math.abs(t-q); if(dd<d){d=dd; best=w;}}
  return best;
}
const blinkAt = (t, off) => {const b = (t+off)%4.7; return b<.16 ? Math.sin(b/.16*Math.PI) : 0;};

// 烘焙相机（position/quaternion/orthoSpan）重建真实投影
const projCam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 30);
const _v = new THREE.Vector3();
function projectWorld(cam, p){
  const span = cam.orthoSpan;
  projCam.left = -span*W/H/2; projCam.right = span*W/H/2; projCam.top = span/2; projCam.bottom = -span/2;
  projCam.position.set(...cam.position); projCam.quaternion.set(...cam.quaternion);
  projCam.updateProjectionMatrix(); projCam.updateMatrixWorld(true);
  _v.set(...p).project(projCam);
  return [(_v.x+1)*W/2, (1-_v.y)*H/2];
}
function drawBackground(cam){
  const {width: bw, height: bh, center: cc} = slots.backgroundWorld;
  const TL = projectWorld(cam, [cc[0]-bw/2, cc[1]+bh/2, cc[2]]);
  const TR = projectWorld(cam, [cc[0]+bw/2, cc[1]+bh/2, cc[2]]);
  const BL = projectWorld(cam, [cc[0]-bw/2, cc[1]-bh/2, cc[2]]);
  g.save();
  g.setTransform((TR[0]-TL[0])/W, (TR[1]-TL[1])/W, (BL[0]-TL[0])/H, (BL[1]-TL[1])/H, TL[0], TL[1]);
  g.drawImage(bg, 0, 0, W, H);
  g.restore();
}
function drawProp(im, anchorPx, worldPos, cam){
  const s = (H/cam.orthoSpan) * slots.furniture.metersPerPlatePx;
  const [sx, sy] = projectWorld(cam, worldPos);
  g.save(); g.translate(sx, sy); g.scale(s, s); g.translate(-anchorPx[0], -anchorPx[1]);
  g.drawImage(im, 0, 0); g.restore();
}
// 敲杯特写：杯锚点直接对齐 cel 勺尖屏幕位（接触钉住优先于世界锚定）
function drawPropAt(im, anchorPx, screenX, screenY, cam){
  const s = (H/cam.orthoSpan) * slots.furniture.metersPerPlatePx;
  g.save(); g.translate(screenX, screenY); g.scale(s, s); g.translate(-anchorPx[0], -anchorPx[1]);
  g.drawImage(im, 0, 0); g.restore();
}
// 身体落位：脚底（烘焙 sole 世界 y）贴地；footX 为 cel 内脚底质心（关键画逐张实测）
function bodyPlacement(A, cel, ppm, footX = null){
  const soleY = Math.min(...(A.soles?.length ? A.soles.map(s=>s.y) : [A.world.leftFoot[1]]));
  const groundY = Math.max(A.projected.leftFoot[1] + (A.world.leftFoot[1]-soleY)*ppm,
                           A.projected.rightFoot[1] + (A.world.rightFoot[1]-soleY)*ppm);
  const footScreenX = (A.projected.leftFoot[0] + A.projected.rightFoot[0]) / 2;
  const contentH = cel.contentBottom - cel.contentTop;
  const s = cel.worldHeight * ppm / contentH;
  const centerX = footScreenX - ((footX ?? cel.size[0]/2) - cel.size[0]/2) * s;
  return {x: centerX, y: groundY + (cel.size[1]-cel.contentBottom)*s, height: cel.size[1]*s, s, groundY, footScreenX};
}
// r9 冻结落位：显示人高 = 烘焙头-脚投影距 + crownM·ppm（头顶余量，V5 同帧实测）；
// 画内支撑脚 pin 对位入场帧烘焙触地脚（contact.planted），整拍锁死零平移。
// r12：单一世界站高常量 worldStandH（=烘焙头-脚距+实测解剖颅顶余量，见 stand_height_measure.json）
// × 相机 ppm / cel 内容高。所有相位画/stand 段统一常量，禁止逐段逐相位估算；蓬发不计身高。
// r13：入场帧**姿势**冻结 + **当前帧相机**投影（背景拍点脉冲同步作用于人物，
// 与原片 3D 一致）；脚世界位固定 → 不滑。显示高 = worldStandH × ppmNow ÷ cel 内容高。
// r14-M10：spanCorr（默认 1）= 渲染实测内容框校准系数，由 hybrid/tools/derive_span_calib.mjs
// 从 probe renderedHeightChecks（渲染结果实测，非摆放参数）派生写入 cel_slots turnKeys；
// 鞋底锚定不受影响（y 由 groundY 与 s 推出，contentBottom 行恒落 groundY）。
// r16：cel.scaleK（display-m/celpx，stand 段眼线锚定派生，见 cel_slots v13）存在时优先于
// worldStandH/span——同一常量作用于该角色全部转身相位画（stand↔turn 眼线一致）。
function frozenPlacement(EA, camNow, worldStandH, pin, cel){
  const ppm = H / camNow.orthoSpan;
  const s = (cel.scaleK ?? worldStandH / (cel.contentBottom - cel.contentTop)) * ppm * (cel.spanCorr ?? 1);
  const head = projectWorld(camNow, EA.world.head);
  const planted = EA.contact?.left === true ? 'left' : EA.contact?.right === true ? 'right' : 'left';
  const footW = EA.world[planted+'Foot'];
  const soleY = Math.min(...(EA.soles?.length ? EA.soles.map(q=>q.y) : [footW[1]]));
  const foot = projectWorld(camNow, footW);
  const groundY = projectWorld(camNow, [footW[0], soleY, footW[2]])[1];
  return {x: foot[0] - (pin[0]-512)*s, y: groundY + (cel.size[1]-cel.contentBottom)*s,
          height: cel.size[1]*s, s, groundY, footX: foot[0], pinY: groundY,
          personPx: (cel.contentBottom-cel.contentTop)*s};
}
// 转身相位已由烘焙 yaw 直接驱动（turnPhaseIdx），见上方驱动层区块。

function draw(t, opts){
  const w = windowAt(t) ?? nearestWindow(t), gap = !windowAt(t);
  const qt = clamp(t, w.start, w.end-1e-6), ctrl = controls[w.id];
  ctrl.update(qt);
  const frame = ctrl.frameAt(qt), cam = frame.camera, ppm = H / cam.orthoSpan;
  g.clearRect(0, 0, W, H);
  drawBackground(cam);
  const shade = g.createLinearGradient(0,0,0,H);
  shade.addColorStop(0,'rgba(30,38,54,.05)'); shade.addColorStop(1,'rgba(30,38,54,.12)');
  g.fillStyle = shade; g.fillRect(0,0,W,H);

  const seated = w.mode==='sit' || (w.mode==='rise' && qt < w.riseEnd);
  const bodies = [];
  let spoonScreen = null;
  // 接触影：转身窗口由相位/段分支按画内 pin 冻结绘制（整段不滑），其余时段用烘焙双脚投影。
  const frozenTurn = w.mode==='turn';
  for(const [name, a] of Object.entries(actors)){
    const A = frame.actors[name]; if(!A) continue;
    if(frozenTurn) continue;  // 转身段影子在相位分支里按画内 pin 冻结
    const soleY = Math.min(...(A.soles?.length ? A.soles.map(s=>s.y) : [A.world.leftFoot[1]]));
    for(const side of ['left','right']){
      const fy = A.projected[side+'Foot'][1] + (A.world[side+'Foot'][1]-soleY)*ppm;
      drawGroundContact(g, {x: A.projected[side+'Foot'][0], y: fy, radiusX: 26*ppm/500, radiusY: 6*ppm/500,
        opacity: A.contact?.[side] === false ? .08 : .26, cast: [70, -16]});
    }
  }
  if(seated) for(const k of ['chairLeft','chairRight']){
    const spec = slots.furniture[k], A = frame.actors[spec.actor]; if(!A) continue;
    drawProp(props[k], spec.cushionAnchorPx,
      [A.world.pelvis[0], A.world.pelvis[1]-spec.seatDrop, A.world.pelvis[2]], cam);
  }
  cels.begin();
  for(const name of Object.keys(actors))
    for(const k of ['_sit','_stand']) cels.cells.get(name+k).mesh.material.opacity = 1;
  for(const [name, a] of Object.entries(actors)){
    const A = frame.actors[name]; if(!A) continue;
    if(w.mode === 'turn'){
      const inTurn = qt >= w.turnStart && qt < w.turnEnd;
      if(inTurn){
        // r9：纯画序列 + 整拍冻结 + 零平移。落位/缩放/影子锚定**相位入场帧**的烘焙数据
        // （初始化算定，与播放/seek 顺序无关）；支撑脚 pin 对位入场帧烘焙触地脚，整拍锁死；
        // 显示人高 = 烘焙头-脚投影距 + crownM（头顶余量，V5 同帧实测）×ppm。
        const idx = turnPhaseIdxOf(A.yaw, name), key8 = slots.turnPhases.keys[name][idx];
        const tk = a.spec.turnKeys[key8];
        let key = `${name}_turn_${key8}`, mouth = 'none';
        if(tk.mouths){  // 正面系同图嘴部变体（批次5）；侧/背相位不加
          const j = jawAt(name, t), st = j > .32 ? 'open' : j > .075 ? 'half' : 'closed';
          mouth = st;
          if(st !== 'closed') key = `${name}_turn_${key8}_mouth_${st}`;
        }
        const entryFr = turnMotion.frames[turnPhaseEntry[name][idx]], EA = entryFr.actors[name];
        const cel = {size: [1024, 1536], contentTop: tk.contentTop, contentBottom: tk.contentBottom,
                     spanCorr: tk.spanCorr, scaleK: a.spec.scaleKTurn};
        const p = frozenPlacement(EA, cam, a.spec.worldStandH, tk.pin, cel);
        drawGroundContact(g, {x: p.footX, y: p.pinY, radiusX: 26*ppm/500,
          radiusY: 6*ppm/500, opacity: .30, cast: [70, -16]});
        cels.place(key, {x: p.x, y: p.y, height: p.height, view, time: 0, order: 2, rigid: true});
        bodies.push({actor: name, route: 'turn-8phase-frozen-v9', cel: key8, celKey: key, phase: idx,
          x: p.x, y: p.y, height: p.height, personPx: p.personPx, headPx: p.headPx, yaw: A.yaw, mouth,
          footScreen: [p.footX, p.pinY], phaseEntryFrame: entryFr.frame});
      }else{
        // r9：转前/转后站立段同样冻结（段入场帧锚定，与相位画同尺度规则）
        const cel = a.spec.standCel;
        const entryFr = qt < w.turnStart ? turnMotion.frames[turnPreEntry] : turnMotion.frames[turnPostEntry];
        const EA = entryFr.actors[name];
        const pin = [512, cel.contentBottom-6];
        const p = frozenPlacement(EA, cam, a.spec.worldStandH, pin,
                                  {size: cel.size, contentTop: cel.contentTop, contentBottom: cel.contentBottom});
        drawGroundContact(g, {x: p.footX, y: p.pinY, radiusX: 26*ppm/500, radiusY: 6*ppm/500, opacity: .30, cast: [70, -16]});
        const key = name+'_stand';
        cels.place(key, {x: p.x, y: p.y, height: p.height, view, time: 0, order: 2, rigid: true});
        bodies.push({actor: name, route: 'stand-cel(front)', cel: 'stand', celKey: key,
          x: p.x, y: p.y, height: p.height, personPx: p.personPx, headPx: p.headPx, yaw: A.yaw,
          footScreen: [p.footX, p.pinY], phaseEntryFrame: entryFr.frame});
      }
      continue;
    }
    // 对话/起身窗口
    const riseU = w.mode === 'rise' ? clamp((qt - w.riseEnd) / w.riseFade, 0, 1) : 1;
    if(w.mode === 'rise' && riseU > 0 && riseU < 1){
      const p = bodyPlacement(A, a.spec.sitCel, ppm), pStand = bodyPlacement(A, a.spec.standCel, ppm);
      cels.cells.get(name+'_sit').mesh.material.opacity = 1-riseU;
      cels.cells.get(name+'_stand').mesh.material.opacity = riseU;
      cels.place(name+'_sit', {x: p.x, y: p.y, height: p.height, view, time: t, order: 2});
      cels.place(name+'_stand', {x: pStand.x, y: pStand.y, height: pStand.height, view, time: t, order: 2});
      bodies.push({actor: name, route: 'rise-crossfade(unfinished)', cel: 'crossfade', u: riseU});
      continue;
    }
    // 敲杯动作：Girl 在 abs>=tap.from 切 reach，hit±holdFrames 帧切 tap，之后回 reach。
    // 批次3 reach/tap 关键画手臂伸向画面左，而杯在画面右（世界 +x）——运行时水平镜像适配；
    // 口袋/刘海随之镜像，属已知偏差，需要主代理决定是否重生成（见 NOTES）。
    let cel = seated ? a.spec.sitCel : a.spec.standCel, key = name + (seated ? '_sit' : '_stand'), celId = key, flip = false;
    if(seated && name === tap.actor && t >= tap.from){
      const hit = tap.hits.some(h => Math.abs(t-h) <= tap.holdFrames/30);
      cel = hit ? tap.tapCel : tap.reachCel; key = 'Girl_' + (hit ? 'tapCel' : 'reachCel');
      celId = hit ? 'girl_sit_tap' : 'girl_sit_reach'; flip = true;
    }
    const p = bodyPlacement(A, cel, ppm);
    const motion2 = ctrl.offsets[name+'_body']?.head ?? [0,0];
    // r5：身体 cel 带眼/嘴窗整换变体（对话窗口全部姿态 + 敲杯 reach/tap）
    const v = variantKey(key, name, t);
    cels.place(v.key, {x: p.x, y: p.y, height: p.height, view, time: t, order: 2, breath: seated?0.8:1.2, motion: motion2,
      scaleX: flip ? -1 : 1});
    if(flip){ // 勺尖（原图坐标）按翻转换算屏幕位，敲杯特写时桌层杯位对齐它
      const tip = cel.spoonTipPx;
      spoonScreen = [p.x - (tip[0]-512)*p.s, p.y - (1536-tip[1])*p.s];
    }
    bodies.push({actor: name, route: seated ? 'sit-cel' : 'stand-cel', cel: celId, celKey: v.key,
      eyes: v.eyes, mouth: v.mouth, mirrored: flip,
      x: p.x, y: p.y, height: p.height, headPx: A.projected.head.map(vv=>Math.round(vv))});
  }
  // 身体（含脸）整体渲染 → 桌层前遮挡 → 字幕
  light.draw(g, cels.render(), {warmPoint: [W*.3, H*.62], warmRadius: W*.7, time: t});
  // 桌面层（前层，遮挡腰腹）；story-state：abs>=11.9 碟上无勺（勺在女孩手中）；
  // 敲杯特写（abs>=tap.from 且镜深 span<0.8）：杯锚点对齐 cel 勺尖（接触钉住）
  if(seated){
    const tableIm = t >= slots.furniture.table.noSpoonFrom ? props.tableNoSpoon : props.table;
    if(spoonScreen && cam.orthoSpan < 0.8)
      drawPropAt(tableIm, slots.furniture.table.cupAnchorPx, spoonScreen[0]+12, spoonScreen[1]+30, cam);
    else
      drawProp(tableIm, slots.furniture.table.cupAnchorPx, slots.furniture.table.cupWorld, cam);
  }
  const sub = opts?.noSubtitle ? null : subtitles.find(s=>s.start<=t && t<s.end);
  if(sub){
    g.save(); g.font = '600 40px "Microsoft YaHei"'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 6;
    g.strokeStyle = '#243748'; g.fillStyle = sub.kind==='song' ? '#fff0b3' : sub.character==='Boy' ? '#d9efff' : '#fff9e8';
    const text = (sub.kind==='song' ? '♪ ' : '') + sub.text;
    g.strokeText(text, W/2, 1018); g.fillText(text, W/2, 1018); g.restore();
  }
  if(gap || w.mode === 'rise'){
    g.save(); g.fillStyle = 'rgba(16,24,36,.72)'; g.fillRect(24, H-96, 720, 64);
    g.fillStyle = '#ffd98a'; g.font = "26px 'Microsoft YaHei'"; g.textAlign = 'left';
    g.fillText(gap ? `窗口外预览 t=${t.toFixed(2)}：保持 ${w.id} 边界帧（无烘焙数据）`
                   : `turnB 起身窗口：站姿过渡未完工（试片骨架）`, 40, H-56); g.restore();
  }
  const state = {t, window: w.id, gap, mode: frame.mode, beat: frame.beat ?? null,
    missingAssets, placeholders: missingAssets.length > 0, bodies, subtitle: sub?.text ?? null,
    camera: {orthoSpan: cam.orthoSpan}, route: 'hybrid-pilot-v5'};
  window.state = state;
  return {image: canvas.toDataURL('image/png').split(',')[1], state};
}

window.renderAt = draw;
window.duration = windows.at(-1).end;
window.ready = true;
window.__drive = {turnWin};  // probe/调试自省（r8 起驱动层已删，仅留窗口配置）
window.__project = (cam, p) => projectWorld(cam, p);  // probe 复算投影用
window.state = {missingAssets, placeholders: missingAssets.length>0, route: 'hybrid-pilot-v5', note: '尚未 renderAt'};
if(!new URLSearchParams(location.search).has('capture')){
  const slider = document.querySelector('#time'), label = document.querySelector('#clock');
  slider.min = windows[0].start; slider.max = windows.at(-1).end;
  let playing = false, t = windows[0].start, last = 0;
  const paint = ()=>{ draw(t); slider.value = t; label.textContent = t.toFixed(2)+'s'; };
  document.querySelector('#play').onclick = ()=>{ playing = !playing; last = performance.now(); };
  slider.oninput = ()=>{ t = +slider.value; paint(); };
  (function tick(){ if(playing){ const now = performance.now(); t += (now-last)/1000; last = now;
    if(t >= windows.at(-1).end){ playing = false; t = windows[0].start; } paint(); } requestAnimationFrame(tick); })();
  paint();
}
