// E08 片头 OP 自绘库 — flatpreviz 风格的最小自包含子集。
// 背景：dula-assets/lib/flatpreviz 在当前工作区丢失（git 历史中也无），
// 本库按 E08 painted 的 storyboard 剧照重建了 OP 需要的子集：
// 河堤环境（天/太阳/云/远岸/河/草/柳）、正面/侧面唱歌小孩（三态嘴型+
// 表情+风吹发梢）、非匀速阵风、碎玻璃映人特效、画页、迷你镜头驱动。
// 全部纯 Canvas 2D，零依赖，确定性（seeded）。
const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const hash01 = n => mulberry32(Math.floor(n * 9973) + 17)();
export const ell = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
export const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// 取自 E08 剧照像素采样的晴印平涂调色板
export const PAL = {
  skyTop: '#2e9bd6', horizon: '#7fd4e8', farbank: '#8d7cc2', river: '#4b9bd8',
  riverDeep: '#2d7cbf', glint: '#8fc8ee', grass: '#7cb669', grassDark: '#5d9c4e',
  dapple: '#c9d97a', treeLeaf: '#59a05c', treeLeafDark: '#478f4c', trunk: '#8a5a3a',
  sun: '#e7e2ab', sunRing: '#addbd9', cloud: '#f6f6f4', cloudShade: '#dce9ee',
  skin: '#fee3c8', skinShade: '#f2cfae', blush: '#f2a9a0', mouthDark: '#7c3a3a',
  mouthIn: '#5c2433', tongue: '#f28399', inkSoft: '#6b6f7a', pencil: '#7a7e8c',
  page: '#fffff0', gold: '#f5c94e', white: '#ffffff',
  girlHair: '#3a3f58', girlDress: '#4f7fd4', girlShoe: '#33415c', girlIris: '#386a83',
  boyHair: '#2e2a33', boyTop: '#f0a45c', boyPants: '#c9b189', boyIris: '#4a5568',
  catFur: '#f2994a', catDark: '#d97f33',
};
export const GIRL = { skin: PAL.skin, hair: PAL.girlHair, top: PAL.girlDress, bottom: PAL.girlDress, shoe: PAL.girlShoe, iris: PAL.girlIris, style: 'bob' };
export const BOY = { skin: PAL.skin, hair: PAL.boyHair, top: PAL.boyTop, bottom: PAL.boyPants, shoe: '#5c4a38', iris: PAL.boyIris, style: 'spikeV' };

// ---------- 环境积木 ----------
export function drawSky(ctx, W, t) {
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, 300);
  // 横向色带压到远岸之下，盖住远岸波峰下沉处的透明缝（曾漏出底色黑带）
  ctx.fillStyle = PAL.horizon; ctx.fillRect(0, 300, W, 230);
  const sx = 1590, sy = 195;
  ctx.strokeStyle = PAL.sunRing; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(sx, sy, 118, 0, TAU); ctx.stroke();
  ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(sx, sy, 96, 0, TAU); ctx.fill();
}
export function drawCloud(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.cloudShade;
  ell(ctx, x + w * .1, y + h * .18, w * .52, h * .52);
  ctx.fillStyle = PAL.cloud;
  for (const [fx, fy, fr] of [[0, .1, .42], [.3, -.12, .5], [.62, .05, .44], [.85, .16, .3]])
    ell(ctx, x + fx * w, y + fy * h, w * fr, h * fr);
}
export function drawFarBank(ctx, W, y = 460) {
  ctx.fillStyle = PAL.farbank;
  ctx.beginPath(); ctx.moveTo(0, y + 30);
  for (let x = 0; x <= W; x += 120) ctx.lineTo(x, y + Math.sin(x * .004 + 1) * 26 - 14);
  ctx.lineTo(W, y + 60); ctx.lineTo(0, y + 60); ctx.closePath(); ctx.fill();
}
export function drawRiver(ctx, W, t, wind = 0, y0 = 480, y1 = 900) {
  ctx.fillStyle = PAL.river; ctx.fillRect(0, y0, W, y1 - y0);
  ctx.strokeStyle = PAL.riverDeep; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
  ctx.strokeStyle = PAL.glint; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const gy = y0 + 40 + hash01(i * 3.7) * (y1 - y0 - 80);
    const gw = 60 + hash01(i * 7.1) * 160;
    const gx = (hash01(i * 13.3) * (W + 400) + t * (14 + wind * 30) * (i % 2 ? 1 : -1)) % (W + 300) - 150;
    ctx.globalAlpha = .5 + .3 * Math.sin(t * 2 + i);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw * (1 + wind * .4), gy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
export function drawGrassBank(ctx, W, H, t, wind = 0) {
  ctx.fillStyle = PAL.grass; ctx.fillRect(0, 900, W, H - 900);
  ctx.fillStyle = PAL.dapple;
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = .35 + .1 * Math.sin(t * .6 + i);
    ell(ctx, 100 + hash01(i * 13) * (W - 200), 940 + hash01(i * 7) * 120, 60 + hash01(i * 5) * 70, 16);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.grassDark;
  for (let i = 0; i < 26; i++) {
    const gx = hash01(i * 31) * W, gy = 915 + hash01(i * 17) * (H - 930);
    const sway = Math.sin(t * 1.8 + i) * (2 + wind * 5);
    ctx.beginPath();
    ctx.moveTo(gx, gy); ctx.lineTo(gx + 4 + sway, gy - 14 - wind * 5); ctx.lineTo(gx + 8, gy);
    ctx.closePath(); ctx.fill();
  }
}
export function drawWillow(ctx, x, y, s, t, wind = 0) {
  ctx.fillStyle = PAL.trunk;
  ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.quadraticCurveTo(x - 10, y - s * .55, x - 16, y - s * .82);
  ctx.lineTo(x + 20, y - s * .82); ctx.quadraticCurveTo(x + 8, y - s * .5, x + 26, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.treeLeaf;
  ell(ctx, x, y - s * .92, s * .42, s * .3);
  ell(ctx, x - s * .2, y - s * .8, s * .3, s * .22);
  ell(ctx, x + s * .22, y - s * .82, s * .28, s * .2);
  ctx.fillStyle = PAL.treeLeafDark;
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI + i * .5, bx = x + Math.cos(a) * s * .36;
    const sway = Math.sin(t * 1.6 + i * 1.7) * (3 + wind * 14);
    const len = s * (.34 + hash01(i * 3) * .2);
    const by = y - s * .8 + Math.abs(Math.sin(a)) * s * .12;
    for (let j = 0; j < 4; j++) {
      const p = j / 3;
      ell(ctx, bx + sway * p, by + len * p, 7 - j, 12 - j * 1.5);
    }
  }
}
// 非匀速阵风：多个无理数频率叠加 + 偶发阵风窗，绝不是匀速摆动
export function windAt(t) {
  const base = Math.max(0, Math.sin(t * .53) + .6 * Math.sin(t * 1.31 + 2.1) - .35);
  const gust = Math.max(0, Math.sin(t * .21 + 4) - .72) * 3.2;
  return clamp(.12 + base * .55 + gust);
}
export function drawGustOverlay(ctx, W, t, wind) {
  if (wind < .3) return;
  ctx.strokeStyle = PAL.white; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const p = ((t * (.3 + wind * .5) + hash01(i * 7)) % 1);
    const gx = p * (W + 300) - 150, gy = 200 + hash01(i * 13) * 620;
    ctx.globalAlpha = wind * .35 * Math.sin(p * Math.PI);
    ctx.beginPath(); ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + 60, gy - 18, gx + 130, gy + 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- 人物（唱歌版：三态嘴 + 表情 + 风吹发梢） ----------
function mouthFront(ctx, x, y, s, state) {
  ctx.save(); ctx.translate(x, y);
  if (state <= 0) {
    ctx.strokeStyle = PAL.mouthDark; ctx.lineWidth = s * .05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * .16, 0); ctx.quadraticCurveTo(0, s * .06, s * .16, 0); ctx.stroke();
  } else if (state === 1) {
    ctx.fillStyle = PAL.mouthIn; ell(ctx, 0, 0, s * .13, s * .08);
  } else {
    ctx.fillStyle = PAL.mouthIn; ell(ctx, 0, 0, s * .17, s * .15);
    ctx.fillStyle = PAL.tongue; ell(ctx, 0, s * .05, s * .1, s * .06);
  }
  ctx.restore();
}
function eyeFront(ctx, x, y, s, iris, blink) {
  ctx.save(); ctx.translate(x, y);
  if (blink > .6) {
    ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * .16, 0); ctx.quadraticCurveTo(0, s * .08, s * .16, 0); ctx.stroke();
  } else {
    const sc = 1 - .6 * blink;
    ctx.scale(1, sc);
    ctx.fillStyle = PAL.white; ell(ctx, 0, 0, s * .2, s * .23);
    ctx.fillStyle = iris; ell(ctx, 0, s * .02, s * .12, s * .15);
    ctx.fillStyle = '#1c2230'; ell(ctx, 0, s * .03, s * .06, s * .08);
    ctx.fillStyle = PAL.white; ell(ctx, -s * .05, -s * .06, s * .04, s * .04);
  }
  ctx.restore();
}
// 正面唱歌小孩（头+肩+裙/衣近景构图）。wind 吹发梢（非匀速）。
export function drawKidSingFront(ctx, x, y, s, d, o = {}) {
  const wind = o.wind ?? 0, t = o.t ?? 0;
  ctx.save(); ctx.translate(x, y);
  const sway = Math.sin(t * 2.1) * .01 + wind * Math.sin(t * 3.7) * .02;
  ctx.rotate(sway);
  // body: dress/top trapezoid + arms
  ctx.fillStyle = d.top;
  ctx.beginPath(); ctx.moveTo(-s * .34, s * .52); ctx.lineTo(-s * .5, s * 1.25); ctx.lineTo(s * .5, s * 1.25); ctx.lineTo(s * .34, s * .52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = d.skin;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * s * .42, s * .62); ctx.rotate(side * (.5 + (o.armUp ? -.9 : 0)));
    rr(ctx, -s * .055, 0, s * .11, s * .5, s * .05); ctx.fill(); ctx.restore();
  }
  // head
  const hy = 0;
  ctx.fillStyle = d.skin; ell(ctx, 0, hy, s * .42, s * .44);
  // hair: bob frames the face (face stays skin — 吸取旧版"头发盖脸"教训)
  ctx.fillStyle = d.hair;
  if (d.style === 'bob') {
    ctx.beginPath();
    ctx.arc(0, hy - s * .06, s * .5, Math.PI * .95, Math.PI * 2.05);
    ctx.quadraticCurveTo(s * .52, hy + s * .34, s * .42, hy + s * .42); // right side down
    ctx.lineTo(s * .34, hy + s * .1);
    ctx.quadraticCurveTo(s * .42, hy - s * .3, 0, hy - s * .5);
    ctx.quadraticCurveTo(-s * .42, hy - s * .3, -s * .34, hy + s * .1);
    ctx.lineTo(-s * .42, hy + s * .42);
    ctx.quadraticCurveTo(-s * .52, hy + s * .34, -s * .5, -s * .06 + hy);
    ctx.closePath(); ctx.fill();
    // bangs
    ctx.beginPath();
    ctx.moveTo(-s * .4, hy - s * .18);
    ctx.quadraticCurveTo(0, hy - s * .52, s * .4, hy - s * .18);
    ctx.quadraticCurveTo(s * .3, hy - s * .3, 0, hy - s * .34);
    ctx.quadraticCurveTo(-s * .3, hy - s * .3, -s * .4, hy - s * .18);
    ctx.closePath(); ctx.fill();
    // wind-blown hair tips (非匀速)
    const tipSway = wind * s * .1 * (Math.sin(t * 3.7) + .5 * Math.sin(t * 5.3 + 1));
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * .42, hy + s * .1);
      ctx.quadraticCurveTo(side * (s * .5 + tipSway * .4), hy + s * .3, side * s * .4 + tipSway, hy + s * .46);
      ctx.quadraticCurveTo(side * s * .34, hy + s * .3, side * s * .34, hy + s * .1);
      ctx.closePath(); ctx.fill();
    }
    // hair clip
    ctx.fillStyle = PAL.gold; ell(ctx, s * .3, hy - s * .28, s * .05, s * .05);
  } else {
    // spikeV: 短刺发
    ctx.beginPath();
    ctx.arc(0, hy - s * .1, s * .46, Math.PI, TAU);
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const fx = -s * .3 + i * s * .15;
      const sway2 = wind * s * .06 * Math.sin(t * 4.1 + i);
      ctx.beginPath();
      ctx.moveTo(fx - s * .08, hy - s * .32);
      ctx.lineTo(fx + sway2, hy - s * .06 - (i % 2) * s * .06);
      ctx.lineTo(fx + s * .08, hy - s * .32);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = d.hair; ell(ctx, 0, hy - s * .36, s * .44, s * .18);
  }
  // face
  const blink = o.blink ?? 0;
  eyeFront(ctx, -s * .17, hy - s * .04, s * .5, d.iris, blink);
  eyeFront(ctx, s * .17, hy - s * .04, s * .5, d.iris, blink);
  ctx.fillStyle = PAL.blush; ctx.globalAlpha = .55;
  ell(ctx, -s * .27, hy + s * .14, s * .06, s * .035); ell(ctx, s * .27, hy + s * .14, s * .06, s * .035);
  ctx.globalAlpha = 1;
  // brows by expr
  ctx.strokeStyle = d.hair; ctx.lineWidth = s * .035; ctx.lineCap = 'round';
  const browLift = o.expr === 'sing' ? -.05 : o.expr === 'gentle' ? -.02 : 0;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * .1, hy - s * .2 + s * browLift);
    ctx.quadraticCurveTo(side * s * .2, hy - s * .24 + s * browLift, side * s * .28, hy - s * .2 + s * browLift);
    ctx.stroke();
  }
  mouthFront(ctx, 0, hy + s * .2, s * .6, o.mouth ?? 0);
  ctx.restore();
}
// 侧面唱歌小孩（面向 dir=+1 右）。y = 髋部锚点；全身高约 1.25s，
// 头径 ≈ 0.42s（E08 剧照比例），脚底的鞋在 y+s*0.42 附近落地。
export function drawKidSingSide(ctx, x, y, s, d, o = {}) {
  const wind = o.wind ?? 0, t = o.t ?? 0, dir = o.dir ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.rotate(Math.sin(t * 1.9) * .008);
  const hr = s * .21, hx = s * .02, hy = -s * .68; // 头心
  // legs + shoes
  ctx.fillStyle = d.bottom;
  rr(ctx, -s * .12, -s * .06, s * .11, s * .42, s * .05); ctx.fill();
  rr(ctx, s * .04, -s * .06, s * .11, s * .42, s * .05); ctx.fill();
  ctx.fillStyle = d.shoe;
  rr(ctx, -s * .13, s * .34, s * .16, s * .08, s * .03); ctx.fill();
  rr(ctx, s * .03, s * .34, s * .16, s * .08, s * .03); ctx.fill();
  // torso
  ctx.fillStyle = d.top;
  rr(ctx, -s * .17, -s * .52, s * .34, s * .5, s * .1); ctx.fill();
  // front arm: 唱歌时微微抬起
  ctx.save();
  ctx.translate(s * .1, -s * .44);
  ctx.rotate(-.9 - (o.mouth > 0 ? .12 : 0));
  ctx.fillStyle = d.top; rr(ctx, -s * .05, 0, s * .1, s * .3, s * .05); ctx.fill();
  ctx.fillStyle = d.skin; ell(ctx, 0, s * .32, s * .06, s * .06);
  ctx.restore();
  // head
  ctx.fillStyle = d.skin;
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
  ell(ctx, hx + hr * .95, hy + hr * .12, hr * .17, hr * .13); // nose
  // hair
  ctx.fillStyle = d.hair;
  if (d.style === 'spikeV') {
    ctx.beginPath(); ctx.arc(hx - hr * .1, hy - hr * .12, hr * 1.1, Math.PI * .68, TAU); ctx.closePath(); ctx.fill();
    // V 形刘海贴发际线（侧脸教训：刘海垂到额头中间会读成怒眉）
    for (let i = 0; i < 3; i++) {
      const fx = hx + hr * (.1 + i * .3), sway = wind * hr * .18 * Math.sin(t * 4.3 + i * 2);
      ctx.beginPath();
      ctx.moveTo(fx - hr * .18, hy - hr * .55);
      ctx.lineTo(fx + sway, hy - hr * .1 - (i % 2) * hr * .12);
      ctx.lineTo(fx + hr * .18, hy - hr * .55);
      ctx.closePath(); ctx.fill();
    }
  } else {
    // bob：后脑整片 + 颈后垂发（发梢随风）
    ctx.beginPath(); ctx.arc(hx - hr * .14, hy - hr * .16, hr * 1.12, Math.PI * .55, TAU); ctx.closePath(); ctx.fill();
    const ts = wind * hr * .3 * Math.sin(t * 3.9);
    ctx.beginPath();
    ctx.moveTo(hx - hr * .95, hy - hr * .2);
    ctx.quadraticCurveTo(hx - hr * 1.25, hy + hr * .8, hx - hr * .75 + ts, hy + hr * 1.35);
    ctx.quadraticCurveTo(hx - hr * .55, hy + hr * .7, hx - hr * .5, hy + hr * .1);
    ctx.closePath(); ctx.fill();
    // 额发
    ctx.beginPath();
    ctx.moveTo(hx + hr * .6, hy - hr * .6);
    ctx.quadraticCurveTo(hx, hy - hr * 1.15, hx - hr * .75, hy - hr * .55);
    ctx.quadraticCurveTo(hx - hr * .2, hy - hr * .75, hx + hr * .55, hy - hr * .35);
    ctx.closePath(); ctx.fill();
  }
  // eye + mouth (side)
  const blink = o.blink ?? 0;
  ctx.save(); ctx.translate(hx + hr * .38, hy - hr * .08);
  if (blink > .6) {
    ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = hr * .12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hr * .22, 0); ctx.quadraticCurveTo(0, hr * .12, hr * .22, 0); ctx.stroke();
  } else {
    ctx.scale(1, 1 - .6 * blink);
    ctx.fillStyle = PAL.white; ell(ctx, 0, 0, hr * .22, hr * .26);
    ctx.fillStyle = d.iris; ell(ctx, hr * .04, 0, hr * .13, hr * .17);
    ctx.fillStyle = '#1c2230'; ell(ctx, hr * .06, 0, hr * .06, hr * .09);
  }
  ctx.restore();
  const ms = o.mouth ?? 0;
  ctx.save(); ctx.translate(hx + hr * .72, hy + hr * .42);
  if (ms <= 0) {
    ctx.strokeStyle = PAL.mouthDark; ctx.lineWidth = hr * .1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hr * .18, 0); ctx.quadraticCurveTo(hr * .05, hr * .1, hr * .22, -hr * .02); ctx.stroke();
  } else if (ms === 1) {
    ctx.fillStyle = PAL.mouthIn; ell(ctx, hr * .05, 0, hr * .2, hr * .13);
  } else {
    ctx.fillStyle = PAL.mouthIn; ell(ctx, hr * .05, 0, hr * .22, hr * .24);
    ctx.fillStyle = PAL.tongue; ell(ctx, hr * .07, hr * .07, hr * .13, hr * .1);
  }
  ctx.restore();
  ctx.restore();
}
export function drawCatLoaf(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = PAL.catFur;
  ell(ctx, 0, 0, s * .5, s * .34);
  ell(ctx, -s * .3, -s * .22, s * .24, s * .2);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-s * .3 + side * s * .12, -s * .36); ctx.lineTo(-s * .3 + side * s * .2, -s * .5); ctx.lineTo(-s * .3 + side * s * .28, -s * .34);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = PAL.catDark; ctx.lineWidth = s * .03; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-s * .36 + side * s * .07, -s * .24); ctx.quadraticCurveTo(-s * .3 + side * s * .07, -s * .2, -s * .24 + side * s * .07, -s * .24); ctx.stroke();
  }
  const tw = Math.sin(t * 2.3) * s * .06;
  ctx.beginPath(); ctx.moveTo(s * .42, -s * .05);
  ctx.quadraticCurveTo(s * .62, -s * .12 + tw, s * .66, -s * .3 + tw); ctx.stroke();
  ctx.restore();
}
// 画页（铅笔速写线条；永不出现 F01 符号 —— 沿用伏笔隔离纪律）
export function drawPage(ctx, x, y, rot, s, flutter = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.transform(1, 0, Math.sin(flutter) * .22, 1, 0, 0);
  ctx.fillStyle = PAL.page; rr(ctx, -s * .5, -s * .36, s, s * .72, 6); ctx.fill();
  ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = Math.max(1.2, s * .008);
  ctx.beginPath(); ctx.moveTo(-s * .38, -s * .05); ctx.lineTo(s * .38, -s * .08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * .3, s * .16); ctx.quadraticCurveTo(0, s * .1, s * .32, s * .17); ctx.stroke();
  ctx.restore();
}

// ---------- 碎玻璃映人特效 ----------
// 画面裂成多边形碎片（种子确定），镜面碎片里是另一帧画面（小蓝的脸/河景），
// 碎片间白色裂纹线。faceCanvas 每帧由调用方画好传入。
export function drawGlassShards(ctx, W, H, t, faceCanvas, seed = 7) {
  const rand = mulberry32(seed);
  const cx = W * .5, cy = H * .46;
  // 辐射+环带生成碎片顶点
  const shards = [];
  const rays = 11, rings = [0, .22, .5, 1];
  const angles = []; for (let i = 0; i < rays; i++) angles.push(i / rays * TAU + (rand() - .5) * .12);
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let ai = 0; ai < rays; ai++) {
      const a0 = angles[ai], a1 = angles[(ai + 1) % rays];
      const r0 = rings[ri], r1 = rings[ri + 1];
      const P = (a, r) => [cx + Math.cos(a) * r * W * .62, cy + Math.sin(a) * r * H * .62];
      shards.push([P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1)]);
    }
  }
  ctx.save();
  shards.forEach((poly, i) => {
    const jx = (hash01(i * 3.3) - .5) * 10 * (1 + t * .1), jy = (hash01(i * 7.7) - .5) * 8;
    const rot = (hash01(i * 5.1) - .5) * .03;
    ctx.save();
    const mx = poly.reduce((s, p) => s + p[0], 0) / 4, my = poly.reduce((s, p) => s + p[1], 0) / 4;
    ctx.translate(mx + jx, my + jy); ctx.rotate(rot); ctx.translate(-mx, -my);
    ctx.beginPath();
    poly.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.clip();
    if (i % 3 === 1) {
      // 镜面碎片：小蓝的脸（带角度偏移，像碎镜片各自反射）
      const zoom = 1.15 + hash01(i * 11) * .5;
      const ox = (hash01(i * 13) - .5) * 220, oy = (hash01(i * 17) - .5) * 160;
      ctx.drawImage(faceCanvas, W / 2 - (W / 2 - ox) * zoom, H / 2 - (H / 2 - oy) * zoom, W * zoom, H * zoom);
      ctx.fillStyle = 'rgba(140,190,220,.18)'; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = `rgba(30,60,90,${.22 + hash01(i) * .2})`; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  });
  // 裂纹
  ctx.strokeStyle = 'rgba(240,250,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const a of angles) {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * W * .62, cy + Math.sin(a) * H * .62); ctx.stroke();
  }
  for (const r of [rings[1], rings[2]]) {
    ctx.beginPath(); ctx.ellipse(cx, cy, r * W * .62, r * H * .62, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ---------- 口型 cue（逐字对齐 -> 三态） ----------
export function makeMouthMap(chars) {
  const spans = chars.map(c => [c.start - .02, c.end]).sort((a, b) => a[0] - b[0]);
  return t => {
    let state = 0;
    for (const [a, b] of spans) {
      if (t >= a && t <= b) return 2;
      if (t > b && t <= b + .09) state = 1;
      if (a > t + .2) break;
    }
    return state;
  };
}
export function blinkAt(key, t) {
  const c = (t + hash01(key.length + key.charCodeAt(0)) * 3) % 3.4;
  return c < .14 ? 1 - Math.abs(c - .07) / .07 : 0;
}

// ---------- 迷你镜头驱动（镜头表 + 叠化） ----------
export function makeDriver({ shots }) {
  return {
    paintFrame(ctx, data, t) {
      let i = shots.length - 1;
      while (i > 0 && shots[i].at > t) i--;
      const cur = shots[i], prev = shots[i - 1];
      const fade = cur.fade ?? .5;
      if (prev && t < cur.at + fade) {
        prev.paint(ctx, data, t);
        ctx.save(); ctx.globalAlpha = sstep((t - cur.at) / fade);
        cur.paint(ctx, data, t); ctx.restore();
      } else {
        cur.paint(ctx, data, t);
      }
    },
  };
}
