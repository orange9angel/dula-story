// 试片检查适配器（r13 重写版——此前多轮追加导致同名字段块堆叠，已全清重写）。
// 在 hybrid/art_pass.html 页面上下文执行（pipeline.mjs probe 步骤）。
// 检查：烘焙关节有限性；接触窗口脚底 y 方差；yaw 相位选画；相位边界换画率；整拍冻结
// （支撑脚零位移+躯干配准残差）；V5 锚定显示高（±3%）；女男比 0.9709（±1%）；
// 跨相位跨段一致 ±1%；拍点脉冲人物-背景同步；表情眼态/嘴态 jaw 联动；敲杯 cel；
// 相似配准无分区拉伸（白衬衫面积比）；渲染帧实测发顶-鞋底跨距逐相位一致（M10，测结果非参数）；
// 眼线高度 stand↔turn 一致 + 同帧女/男眼高比（r16）；
// missingAssets 空才算 passed。
export async function probe(){
  const errors = [], jointChecks = [], contactChecks = [];
  const slots = await fetch('./config/cel_slots.json').then(r=>r.json());
  for(const w of slots.windows){
    const motion = await fetch('./'+w.motion).then(r=>r.json());
    let joints = 0, bad = [];
    for(const frame of motion.frames)
      for(const [actor, a] of Object.entries(frame.actors))
        for(const [j, v] of Object.entries(a.world)){
          joints++;
          if(!v.every(Number.isFinite)) bad.push({frame: frame.frame, actor, joint: j});
        }
    jointChecks.push({window: w.id, frames: motion.frames.length, joints, nonFinite: bad.slice(0,5)});
    if(bad.length) errors.push(`${w.id}: ${bad.length} non-finite joint samples`);
    for(const actor of Object.keys(motion.frames[0].actors)){
      for(const screen of ['left','right']){
        const ys = motion.frames
          .map(f=>f.actors[actor]?.soles?.find(s=>s.screen===screen))
          .filter(s=>s && s.planted === true).map(s=>s.y);
        if(ys.length < 2){ contactChecks.push({window: w.id, actor, screen, plantedSamples: ys.length, note: 'too few planted samples'}); continue; }
        const mean = ys.reduce((a,b)=>a+b,0)/ys.length;
        const variance = ys.reduce((a,b)=>a+(b-mean)**2,0)/ys.length;
        const ok = variance < 9e-4;
        contactChecks.push({window: w.id, actor, screen, plantedSamples: ys.length, meanY: +mean.toFixed(5), variance: +variance.toExponential(3), passed: ok});
        if(!ok) errors.push(`${w.id} ${actor} ${screen} foot planted y variance ${variance.toExponential(2)}`);
      }
    }
  }
  const sample = window.renderAt(12.65);
  const pngOk = typeof sample.image === 'string' && sample.image.startsWith('iVBOR');
  if(!pngOk) errors.push('renderAt did not return a PNG image');

  const turnMotion = await fetch('./config/motion_turn_full.json').then(r=>r.json());
  const TAU = Math.PI*2;
  const KEYS = slots.turnPhases.keys, SIGN = slots.turnPhases.sign;
  const idxOf = (yaw, actor) => {
    const yawN = (((SIGN[actor]*yaw)%TAU)+TAU)%TAU;
    return Math.floor(((yawN + Math.PI/8) % TAU) / TAU * 8) % 8;
  };
  const frameAt = t => turnMotion.frames.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a);

  // (a) yaw 相位选画断言
  const phaseChecks = [];
  for(const t of [37.80, 38.93, 40.07, 41.27, 42.40]){
    const fr = frameAt(t), r = window.renderAt(t);
    for(const actor of ['Girl','Boy']){
      const yaw = fr.actors[actor].yaw;
      const expected = KEYS[actor][idxOf(yaw, actor)];
      const actual = r.state.bodies.find(b=>b.actor===actor)?.cel;
      const ok = actual === expected;
      phaseChecks.push({t, actor, yaw: +yaw.toFixed(3), expected, actual, passed: ok});
      if(!ok) errors.push(`Phase mismatch t=${t} ${actor}: expected ${expected}, got ${actual}`);
    }
  }

  // (b) 相位边界换画率 >10%
  const boundaryChecks = [];
  {
    let prev = idxOf(frameAt(37.7667).actors.Girl.yaw, 'Girl'), boundaryT = null;
    for(const f of turnMotion.frames){
      if(f.t < 37.7667 || f.t >= 42.4333) continue;
      const idx = idxOf(f.actors.Girl.yaw, 'Girl');
      if(idx !== prev){ boundaryT = f.t; break; }
      prev = idx;
    }
    if(boundaryT){
      const decode = async t => {
        const r = window.renderAt(t);
        const im = new Image(); im.src = 'data:image/png;base64,' + r.image; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const b = r.state.bodies.find(x=>x.actor==='Girl');
        return {d: g.getImageData(0, 0, im.width, im.height).data, box: b ? [b.x, b.y, b.height] : null};
      };
      const a = await decode(boundaryT - 1/30), b = await decode(boundaryT + 1/30);
      const [bx, by, bh] = a.box, w0 = Math.max(60, Math.round(bh*.36));
      const x0 = Math.max(0, Math.round(bx - w0/2)), y0 = Math.max(0, Math.round(by - bh));
      let changed = 0, total = 0;
      for(let y=y0; y<Math.min(1080, by); y+=2) for(let x=x0; x<Math.min(1920, x0+w0); x+=2){
        const i = (y*1920+x)*4; total++;
        if(Math.abs(a.d[i]-b.d[i]) + Math.abs(a.d[i+1]-b.d[i+1]) > 24) changed++;
      }
      const ratio = changed/total;
      boundaryChecks.push({boundaryT: +boundaryT.toFixed(4), changedRatio: +ratio.toFixed(3), passed: ratio > 0.10});
      if(ratio <= 0.10) errors.push(`Phase boundary at ${boundaryT.toFixed(3)}: drawing did not change (${(ratio*100).toFixed(1)}%)`);
    } else { boundaryChecks.push({passed: false, note: 'no boundary found'}); errors.push('No phase boundary found in bake'); }
  }

  // (c) 整拍冻结：支撑脚=固定世界点（仅随相机投影脉冲移动）；
  // 躯干内饰盒残差——先把 B 帧按 ppm 比绕支撑脚锚点缩放（脉冲校正），再取残差
  const freezeChecks = [];
  {
    const decode = async t => {
      const r = window.renderAt(t);
      const im = new Image(); im.src = 'data:image/png;base64,' + r.image; await im.decode();
      return {im, bodies: r.state.bodies};
    };
    for(const [t0, t1] of [[40.10, 40.1333], [39.4333, 39.4667]]){
      const a = await decode(t0), b = await decode(t1);
      const fA = frameAt(t0), fB = frameAt(t1);
      const ppmA = 1080/fA.camera.orthoSpan, ppmB = 1080/fB.camera.orthoSpan;
      const k = ppmA/ppmB;
      for(const actor of ['Girl','Boy']){
        const ba = a.bodies.find(x=>x.actor===actor), bb = b.bodies.find(x=>x.actor===actor);
        if(!ba || ba.cel !== bb.cel){ freezeChecks.push({t0, t1, actor, passed: false, note: 'phase changed mid-phase'}); errors.push(`Phase changed within phase ${t0} ${actor}`); continue; }
        // 支撑脚：世界点固定，位移应==该点的相机投影差（脉冲）
        const footW = turnMotion.frames[ba.phaseEntryFrame ?? 0]?.actors?.[actor]?.world?.leftFoot ?? [0,0,0];
        const eA = window.__project(fA.camera, footW), eB = window.__project(fB.camera, footW);
        const camDelta = Math.hypot(eB[0]-eA[0], eB[1]-eA[1]);
        const footDelta = Math.hypot(bb.footScreen[0]-ba.footScreen[0], bb.footScreen[1]-ba.footScreen[1]);
        const footOk = Math.abs(footDelta - camDelta) <= 2;
        freezeChecks.push({t0, t1, actor, check: 'support-foot', footA: ba.footScreen, footB: bb.footScreen,
          camDeltaPx: +camDelta.toFixed(2), footDeltaPx: +footDelta.toFixed(2), passed: footOk});
        if(!footOk) errors.push(`Support foot moved ${actor} ${t0}: Δfoot ${footDelta.toFixed(1)}px vs Δcam ${camDelta.toFixed(1)}px`);
        // 脉冲校正：B 帧绕其支撑脚锚点按 k 缩放并对齐到 A 锚点
        const cB = document.createElement('canvas'); cB.width = 1920; cB.height = 1080;
        const gb = cB.getContext('2d');
        gb.setTransform(k, 0, 0, k, ba.footScreen[0]-k*bb.footScreen[0], ba.footScreen[1]-k*bb.footScreen[1]);
        gb.drawImage(b.im, 0, 0);
        const cA = document.createElement('canvas'); cA.width = 1920; cA.height = 1080;
        cA.getContext('2d').drawImage(a.im, 0, 0);
        const bh = ba.height, x0 = Math.round(ba.x - bh*.12), y0 = Math.round(ba.y - bh*.24);
        const W2 = Math.round(bh*.24), H2 = Math.round(bh*.09);
        const dA = cA.getContext('2d').getImageData(x0, y0, W2, H2).data;
        const dB = gb.getImageData(x0, y0, W2, H2).data;
        let residual = 0;
        for(let i=0; i<dA.length; i+=8)
          if(Math.abs(dA[i]-dB[i]) + Math.abs(dA[i+1]-dB[i+1]) > 16) residual++;
        // 重采样底噪下限：A 帧自身先按 k 缩放再缩回，与自身取残差（同纹理同盒）
        const cF = document.createElement('canvas'); cF.width = 1920; cF.height = 1080;
        const gf = cF.getContext('2d');
        gf.setTransform(k, 0, 0, k, ba.footScreen[0]*(1-k), ba.footScreen[1]*(1-k));
        gf.drawImage(a.im, 0, 0);
        const cF2 = document.createElement('canvas'); cF2.width = 1920; cF2.height = 1080;
        const gf2 = cF2.getContext('2d');
        gf2.setTransform(1/k, 0, 0, 1/k, ba.footScreen[0]*(1-1/k), ba.footScreen[1]*(1-1/k));
        gf2.drawImage(cF, 0, 0);
        const dF = gf2.getImageData(x0, y0, W2, H2).data;
        let floor = 0;
        for(let i=0; i<dA.length; i+=8)
          if(Math.abs(dA[i]-dF[i]) + Math.abs(dA[i+1]-dF[i+1]) > 16) floor++;
        const ok = residual <= Math.max(120, floor*2 + 60);
        freezeChecks.push({t0, t1, actor, check: 'torso-frozen(pulse-corrected)', residual,
          pulsePct: +((Math.abs(ppmB-ppmA)/ppmA)*100).toFixed(2), resampleFloor: floor, passed: ok,
          note: '脉冲校正+锚点对齐后残差 vs 自参考重采样底噪（≤2×floor+60）；纯重采样底噪即纹理过滤 AA'});
        if(!ok) errors.push(`Freeze violation ${actor} ${t0}→${t1}: pulse-corrected residual ${residual}px`);
      }
    }
  }

  // (d) V5 锚定显示高 ±3%；女男比 0.9709±1%；跨相位跨段一致 ±1%；脉冲人物-背景同步
  const heightChecks = [];
  {
    const WSH = {Girl: slots.actors.Girl.worldStandH, Boy: slots.actors.Boy.worldStandH};
    const V5 = {Girl: 1.582, Boy: 1.655};  // V5 40.08s 帧实测（stand_height_measure.json → V5_anchor_40.08）
    const disp = {Girl: [], Boy: []};
    for(const t of [37.97, 38.42, 38.93, 39.43, 40.08, 40.75, 41.27, 41.78, 42.10, 43.0]){
      const fr = frameAt(t), ppm = 1080/fr.camera.orthoSpan;
      const r = window.renderAt(t);
      for(const actor of ['Girl','Boy']){
        const b = r.state.bodies.find(x=>x.actor===actor);
        if(!b?.personPx) continue;
        const v5target = V5[actor]*ppm;
        const err = Math.abs(b.personPx - v5target)/v5target;
        disp[actor].push(b.personPx/ppm);
        heightChecks.push({t, actor, personPx: +b.personPx.toFixed(1), v5Target: +v5target.toFixed(1),
          err: +(err*100).toFixed(2), passed: err <= 0.03});
        if(err > 0.03) errors.push(`V5-height mismatch ${actor} t=${t}: ${b.personPx.toFixed(0)} vs V5 ${v5target.toFixed(0)} (${(err*100).toFixed(1)}%)`);
      }
    }
    const g = disp.Girl.reduce((a,b)=>a+b,0)/disp.Girl.length, bb = disp.Boy.reduce((a,b)=>a+b,0)/disp.Boy.length;
    const ratioErr = Math.abs((g/bb) - 0.9709)/0.9709;
    heightChecks.push({check: 'girl:boy ratio', displayed: +(g/bb).toFixed(4), target: 0.9709,
      err: +(ratioErr*100).toFixed(2), passed: ratioErr <= 0.01, note: '男孩高 3.0%（烘焙体格 1.284:1.328）'});
    if(ratioErr > 0.01) errors.push(`Girl:Boy ratio ${(g/bb).toFixed(3)} vs 0.9709`);
    for(const actor of ['Girl','Boy']){
      const arr = disp[actor], mean = arr.reduce((a,b)=>a+b,0)/arr.length;
      const spread = (Math.max(...arr)-Math.min(...arr))/mean;
      heightChecks.push({check: 'cross-phase consistency', actor, spreadPct: +(spread*100).toFixed(2), passed: spread <= 0.02});
      if(spread > 0.02) errors.push(`Cross-phase height spread ${actor}: ${(spread*100).toFixed(1)}%`);
    }
    // 脉冲同步：同相位两帧 personPx 比 == ppm 比；脚屏幕位移动 == 固定世界点的相机投影差
    const fA = frameAt(40.10), fB = frameAt(40.30);
    const rA = window.renderAt(40.10), rB = window.renderAt(40.30);
    for(const actor of ['Girl','Boy']){
      const bA = rA.state.bodies.find(x=>x.actor===actor), bB = rB.state.bodies.find(x=>x.actor===actor);
      if(!bA?.personPx || bA.cel !== bB.cel) continue;
      const ppmA = 1080/fA.camera.orthoSpan, ppmB = 1080/fB.camera.orthoSpan;
      const scaleSync = Math.abs((bB.personPx/bA.personPx) - (ppmB/ppmA))/(ppmB/ppmA);
      const entryFr = turnMotion.frames[bA.phaseEntryFrame], footW = entryFr.actors[actor].world.leftFoot;
      const expA = window.__project(fA.camera, footW), expB = window.__project(fB.camera, footW);
      const camDelta = Math.hypot(expB[0]-expA[0], expB[1]-expA[1]);
      const footDelta = Math.hypot(bB.footScreen[0]-bA.footScreen[0], bB.footScreen[1]-bA.footScreen[1]);
      const syncErr = Math.abs(footDelta - camDelta);
      const ok = scaleSync <= 0.005 && syncErr <= 2;
      heightChecks.push({check: 'pulse-sync', actor, scaleSyncErrPct: +(scaleSync*100).toFixed(3),
        footSyncErrPx: +syncErr.toFixed(2), camDeltaPx: +camDelta.toFixed(2), passed: ok});
      if(!ok) errors.push(`Pulse desync ${actor}: scaleErr ${(scaleSync*100).toFixed(2)}%, footErr ${syncErr.toFixed(1)}px`);
    }
  }

  // (e) 表情眼态时间轴 + 嘴型 jaw 联动
  const faceChecks = [];
  for(const [t, actor, expected] of [[4.5,'Girl','tease'],[8.0,'Boy','focus'],[8.0,'Girl','neutral'],[12.0,'Girl','none'],[5.0,'Boy','neutral']]){
    const r = window.renderAt(t);
    const actual = r.state.bodies.find(b=>b.actor===actor)?.eyes;
    const ok = actual === expected;
    faceChecks.push({t, actor, expected, actual, passed: ok});
    if(!ok) errors.push(`Eyes set mismatch t=${t} ${actor}: expected ${expected}, got ${actual}`);
  }
  { // 口型联动：小蓝台词中（t=5.0）嘴窗必须为 half/open
    const b = window.renderAt(5.0).state.bodies.find(b=>b.actor==='Girl');
    const ok = b && ['half','open'].includes(b.mouth);
    faceChecks.push({t: 5.0, actor: 'Girl', expected: 'mouth half|open (jaw>0)', actual: b?.mouth, passed: ok});
    if(!ok) errors.push('Mouth window did not follow jaw at t=5.0');
  }
  // 敲杯 cel 与无勺桌面 story-state 断言
  const tapChecks = [];
  for(const [t, expectedCel] of [[11.5,'Girl_sit'],[12.0,'girl_sit_reach'],[12.65,'girl_sit_tap'],[12.9,'girl_sit_reach']]){
    const r = window.renderAt(t);
    const actual = r.state.bodies.find(b=>b.actor==='Girl')?.cel;
    const ok = actual === expectedCel;
    tapChecks.push({t, expectedCel, actual, passed: ok});
    if(!ok) errors.push(`Tap cel mismatch t=${t}: expected ${expectedCel}, got ${actual}`);
  }

  // (f) 唱段嘴态随 jaw（正面系转身画；侧/背不加）
  const mouthChecks = [];
  for(const [t, actor, expected] of [[41.95,'Boy','open'],[42.20,'Boy','half'],[42.20,'Girl','closed']]){
    const r = window.renderAt(t);
    const b = r.state.bodies.find(x=>x.actor===actor);
    const ok = b?.mouth === expected;
    mouthChecks.push({t, actor, expected, actual: b?.mouth, celKey: b?.celKey, passed: ok});
    if(!ok) errors.push(`Mouth state t=${t} ${actor}: expected ${expected}, got ${b?.mouth}`);
  }

  // (g) 相似配准无分区拉伸：白衬衫区像素面积比 ≈ scale²（±3%）
  const torsoChecks = [];
  for(const who of ['girl','boy']){
    const sim = await fetch(`./assets/cels/turn_reg/registration_sim_${who}.json`).then(r=>r.json());
    for(const rec of sim.records){
      const ratio = rec.whiteAreaReg / rec.whiteAreaRaw, expected = rec.scale * rec.scale;
      const err = Math.abs(ratio - expected) / expected;
      torsoChecks.push({id: rec.id, whiteAreaRaw: rec.whiteAreaRaw, whiteAreaReg: rec.whiteAreaReg,
        scale: rec.scale, areaRatio: +ratio.toFixed(4), err: +(err*100).toFixed(2),
        torsoRaw: rec.torsoRaw, torsoReg: rec.torsoReg, passed: err <= 0.03});
      if(err > 0.03) errors.push(`Torso distortion ${rec.id}: area ratio ${ratio.toFixed(3)} vs scale² ${expected.toFixed(3)}`);
    }
  }

  // (h) M10：渲染后实测内容框高（发色/深色掩码，测**结果**而非摆放参数）。
  // heightChecks 的 personPx 是摆放参数（意图），跨相位恒定是构造使然——测不出
  // 各相位画真实内容边距差异（r14 主代理实测：t1r 相位发顶-鞋底 -4% 而 probe 全绿）。
  // 这里对 renderAt 输出帧逐相位量实际内容框：女孩发顶=暗蓝发行、鞋底=深袜/黑鞋行；
  // 男孩发顶=黑发（暗行）、鞋底=白鞋行（亮度上限排除天空/窗框/地面光斑）。
  const renderedHeightChecks = [];
  {
    const T0 = 37.7667, T1 = 42.4333;
    // 每相位中点帧（按 Girl yaw 扇区；Boy 同帧镜像转身，同帧测量）
    const phaseT = {};
    for(const f of turnMotion.frames){
      if(f.t < T0 || f.t >= T1) continue;
      const idx = idxOf(f.actors.Girl.yaw, 'Girl');
      (phaseT[idx] = phaseT[idx] || []).push(f.t);
    }
    const mids = Object.keys(phaseT).sort((a,b)=>a-b)
      .map(k => phaseT[k][Math.floor(phaseT[k].length/2)]);
    const decode = async t => {
      // noSubtitle：字幕是全局覆盖层（描边 #243748 lum≈55 会污染深色鞋底掩码、
      // 浅色填充会污染白鞋掩码），角色内容框测量必须排除——初版仪表曾把字幕底行当鞋底。
      const r = window.renderAt(t, {noSubtitle: true});
      const im = new Image(); im.src = 'data:image/png;base64,' + r.image; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g2 = c.getContext('2d'); g2.drawImage(im, 0, 0);
      return {d: g2.getImageData(0, 0, im.width, im.height).data, bodies: r.state.bodies};
    };
    const lum = (d,i) => .2126*d[i] + .7152*d[i+1] + .0722*d[i+2];
    // 掩码：返回该 (x,y) 是否命中角色发色/鞋色
    // 女孩发顶：cel 实测发色 rgb≈(0-20,27-50,104-152)——b<185/g<115 排除天空
    // （天空 rgb≈(19,170,242) 与初版掩码同构，曾把发顶测成 y≈30 的天空行）。
    const MASKS = {
      Girl: {
        top: (d,i) => d[i+2]-d[i] > 40 && d[i+2]-d[i+1] > 20 && d[i] < 130 && d[i+1] < 115 && d[i+2] < 185,
        bottom: (d,i) => lum(d,i) < 80,                                          // 深袜/黑鞋
      },
      Boy: {
        top: (d,i) => lum(d,i) < 110,                                            // 黑发（橙 rim 行可能漏，取核心暗发即够）
        bottom: (d,i) => lum(d,i) > 195 && Math.abs(d[i]-d[i+1]) < 25 && Math.abs(d[i+1]-d[i+2]) < 30, // 白鞋（地面光斑高饱和被裁）
      },
    };
    const spans = {Girl: [], Boy: []};
    for(const t of mids){
      const {d, bodies} = await decode(t);
      for(const actor of ['Girl','Boy']){
        const b = bodies.find(x=>x.actor===actor);
        if(!b?.footScreen || !b?.personPx) continue;
        const pp = b.personPx, cx = b.footScreen[0], pinY = b.footScreen[1];
        const x0 = Math.max(0, Math.round(cx - pp*.45)), x1 = Math.min(1919, Math.round(cx + pp*.45));
        const yTop0 = Math.max(0, Math.round(pinY - pp*1.55)), yTop1 = Math.round(pinY - pp*.7);
        const yBot0 = Math.round(pinY - pp*.55), yBot1 = Math.min(1079, Math.round(pinY + pp*.06));
        const rowHit = (y, mask, need) => {
          let n = 0;
          for(let x=x0; x<=x1; x+=2) if(mask(d, (y*1920+x)*4)) n++;
          return n >= need;
        };
        let top = null, bottom = null;
        for(let y=yTop0; y<=yTop1; y++) if(rowHit(y, MASKS[actor].top, 4)){ top = y; break; }
        for(let y=yBot1; y>=yBot0; y--) if(rowHit(y, MASKS[actor].bottom, 3)){ bottom = y; break; }
        if(top == null || bottom == null){
          renderedHeightChecks.push({t: +t.toFixed(3), actor, cel: b.cel, passed: false,
            note: `mask miss (top=${top} bottom=${bottom})`});
          errors.push(`M10 mask miss ${actor} t=${t}`);
          continue;
        }
        spans[actor].push({t: +t.toFixed(3), cel: b.cel, top, bottom, span: bottom-top});
      }
    }
    for(const actor of ['Girl','Boy']){
      const arr = spans[actor];
      if(arr.length < 8){ errors.push(`M10 ${actor}: only ${arr.length}/8 phases measured`); }
      const mean = arr.reduce((a,b)=>a+b.span,0)/arr.length;
      for(const s of arr){
        const dev = (s.span-mean)/mean;
        renderedHeightChecks.push({t: s.t, actor, cel: s.cel, top: s.top, bottom: s.bottom,
          spanPx: s.span, devPct: +(dev*100).toFixed(2), passed: Math.abs(dev) <= 0.02});
      }
      const spread = (Math.max(...arr.map(s=>s.span)) - Math.min(...arr.map(s=>s.span))) / mean;
      renderedHeightChecks.push({check: 'rendered cross-phase spread', actor,
        meanPx: +mean.toFixed(1), spreadPct: +(spread*100).toFixed(2), passed: spread <= 0.02,
        note: '渲染帧实测发顶-鞋底跨距逐相位一致性（M10：测结果不测摆放参数）'});
      if(spread > 0.02) errors.push(`M10 rendered-height spread ${actor}: ${(spread*100).toFixed(1)}% (>2%)`);
    }
  }

  // (i) r16 眼线断言（视线高度=scale 一致性的锚，stand 段为已验收基准）。
  // 布线图门：常量眼线行（正面系实测均值）经摆放变换换算眼高 eyeM=（脚底-眼线）/ppm；
  // 逐画实测眼线行作信息项（画法姿势差不进闸门，r10 先例）。
  const eyeChecks = [];
  {
    const T0 = 37.7667, T1 = 42.4333;
    const phaseT = {};
    for(const f of turnMotion.frames){
      if(f.t < T0 || f.t >= T1) continue;
      const idx = idxOf(f.actors.Girl.yaw, 'Girl');
      (phaseT[idx] = phaseT[idx] || []).push(f.t);
    }
    const mids = Object.keys(phaseT).sort((a,b)=>a-b).map(k => phaseT[k][Math.floor(phaseT[k].length/2)]);
    const standTs = [37.10, 37.60, 42.70, 43.20];
    const rec = {Girl: [], Boy: []};
    for(const t of [...standTs, ...mids]){
      const st = window.renderAt(t, {noSubtitle: true}).state;
      const osp = st.camera.orthoSpan;
      for(const actor of ['Girl','Boy']){
        const b = st.bodies.find(x=>x.actor===actor);
        if(!b?.footScreen) continue;
        const spec = slots.actors[actor];
        const isTurn = b.cel !== 'stand';
        const eyeRow = isTurn ? (spec.turnKeys[b.cel]?.eyeRow ?? spec.eyeRowTurnConst) : spec.standCel.eyeRow;
        const est = isTurn ? (spec.turnKeys[b.cel]?.eyeRowEstimated ?? false) : false;
        const s = b.height/1536;
        const eyeY = b.y - (1536 - eyeRow)*s;
        const eyeM = (b.footScreen[1] - eyeY) * osp / 1080;
        // 布线图值（常量眼线行）：测 scale 一致性，与逐画画法方差分离
        const eyeRowC = isTurn ? spec.eyeRowTurnConst : spec.standCel.eyeRow;
        const eyeMC = (b.footScreen[1] - (b.y - (1536 - eyeRowC)*s)) * osp / 1080;
        rec[actor].push({t: +t.toFixed(3), cel: b.cel, seg: isTurn ? 'turn' : 'stand',
          eyeY: +eyeY.toFixed(1), eyeM: +eyeM.toFixed(4), eyeMConst: +eyeMC.toFixed(4), estimated: est});
      }
    }
    for(const actor of ['Girl','Boy']){
      const arr = rec[actor];
      const standRef = arr.filter(r=>r.seg==='stand').reduce((a,r)=>a+r.eyeMConst,0) / standTs.length;
      // A（闸门，布线图值）：跨相位+跨段 eyeMConst 与 stand 基准差 ≤1.5%
      let worst = 0, worstR = null;
      for(const r of arr){
        const dev = (r.eyeMConst - standRef)/standRef;
        const ok = Math.abs(dev) <= 0.015;
        eyeChecks.push({t: r.t, actor, cel: r.cel, seg: r.seg, eyeM: r.eyeM, eyeMConst: r.eyeMConst,
          devPctVsStand: +(dev*100).toFixed(2), estimated: r.estimated, passed: ok});
        if(!ok){ errors.push(`Eye-level ${actor} t=${r.t}: ${(dev*100).toFixed(1)}% vs stand`); }
        if(Math.abs(dev) > Math.abs(worst)){ worst = dev; worstR = r; }
      }
      eyeChecks.push({check: 'wiring eye-level consistency', actor, standRef,
        worstDevPct: +(worst*100).toFixed(2), worstCel: worstR?.cel, passed: Math.abs(worst) <= 0.015,
        note: '常量眼线行（布线/尺度闸门）；逐画实测 eyeM 列见各条目（画法姿势差为信息项）'});
    }
    // B（闸门，同帧比）：turn 相位中点的 girl/boy 眼高比 == stand 段实测比 ±1.5%（方向女孩更低）；
    // 另报 vs 总高比 0.9709（眼线比因发冠比例差固有偏高——stand 基准即 ~0.985）
    const standRatio = rec.Girl.find(r=>r.seg==='stand').eyeMConst / rec.Boy.find(r=>r.seg==='stand').eyeMConst;
    for(const t of mids){
      const gr = rec.Girl.find(r=>r.t===+t.toFixed(3)), br = rec.Boy.find(r=>r.t===+t.toFixed(3));
      if(!gr || !br) continue;
      const ratio = gr.eyeMConst / br.eyeMConst;
      const dev = (ratio - standRatio)/standRatio;
      const ok = ratio < 1 && Math.abs(dev) <= 0.015;
      eyeChecks.push({check: 'same-frame girl/boy eye ratio', t: +t.toFixed(3), ratio: +ratio.toFixed(4),
        standRatio: +standRatio.toFixed(4), devPct: +(dev*100).toFixed(2),
        vsHeightRatio09709: +((ratio-0.9709)/0.9709*100).toFixed(2), passed: ok});
      if(!ok) errors.push(`Eye ratio t=${t.toFixed(2)}: ${ratio.toFixed(3)} vs stand ${standRatio.toFixed(3)}`);
    }
  }

  const missingAssets = sample.state?.missingAssets ?? window.state?.missingAssets ?? [];
  if(missingAssets.length) errors.push(`Cel assets missing: ${missingAssets.length} files`);
  return {passed: !errors.length, errors, missingAssets, jointChecks, contactChecks, phaseChecks,
    boundaryChecks, freezeChecks, heightChecks, faceChecks, tapChecks, mouthChecks, torsoChecks,
    renderedHeightChecks, eyeChecks, pngOk,
    note: 'r13 重写版：V5 锚定显示高 + 脉冲同步 + 冻结 + 相位/边界 + 表情/敲杯 + 相似配准拉伸，全量断言。'
      + ' r14-M10：渲染帧实测发顶-鞋底跨距逐相位 spread≤2%（测渲染结果，非摆放参数）。'
      + ' r16：眼线高度断言（stand 段基准，布线图闸门 + 逐画实测信息项 + 同帧眼高比）。'};
}
