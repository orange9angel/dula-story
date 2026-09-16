// E10《等雨停》painted previz — episode layer on top of dula-assets/lib/flatpreviz.
// 全程序绘制版（零生成模型）：三场景天气弧 —— 河堤起风 → 白墙巷阵雨 →
// 便利店雨檐 → 雨后金光。script.story + lipsync_cues.json 是唯一数据输入。
// 纪律：质感集，F01/F02/F03 全静默；速写页只画雨线；全片无 #3DFFC8。

import {
  clamp, lerp, sstep, hash01, ell, ellS, rr, limb, tri, mixHex, mixPal,
  SUNPRINT, parseStory, buildCueMap, mouthStateAt, blinkCoverage,
} from '/node_modules/dula-assets/lib/flatpreviz/core.js';
import { drawKidFront } from '/node_modules/dula-assets/lib/flatpreviz/figures.js';
import { drawKidSide, drawBackOfHead, drawKidTop, drawCatLoaf } from '/node_modules/dula-assets/lib/flatpreviz/figures-side.js';
import { drawCatStand, drawCatWalk, drawCatSit } from '/node_modules/dula-assets/lib/flatpreviz/figures-cat.js';
import {
  drawSky, drawFarBank, drawRiver, drawGrassBank, drawWillow, drawCloud,
  drawRain, drawCloudGap, drawAlley, drawStorefront, drawWetDapples,
} from '/node_modules/dula-assets/lib/flatpreviz/env.js';
import { makeDriver } from '/node_modules/dula-assets/lib/flatpreviz/driver.js';

export const W = 1920, H = 1080;

// ---------- palettes: shower grey-blue → after-rain gold ----------

const SHARED = {
  ...SUNPRINT,
  rain: '#B9CDE0',
  alleyWall: '#E8E5DB', alleyShade: '#CFCBC0', alleyTile: '#48646F', alleyStone: '#A8A398',
  storeWall: '#EDE8DA', storeAwning: '#D95F47', storeGlow: '#FFD98A',
};
const RAINY = {
  ...SHARED,
  skyTop: '#5E7286', horizon: '#93A5B0', cloud: '#B4BEC7', cloudDark: '#7C8894',
  sun: '#D8D4C4', shadowPurple: '#6E7482',
  river: '#46708A', riverDeep: '#32556C', glint: '#AFC4CE',
  grass: '#5F8264', grassDark: '#4A7050', leaf: '#4E7C53', leafDark: '#3C6242',
  trunk: '#6B4B36', gold: '#E8C05A',
};
const GOLDEN = {
  ...SHARED,
  skyTop: '#3E9BD2', horizon: '#F2D68E', cloud: '#FFF4DE', cloudDark: '#C9B998',
  sun: '#F7E9A8', shadowPurple: '#8E7CC3',
  river: '#3F8FCB', riverDeep: '#2F7BC0', glint: '#FFE4A8',
  grass: '#7CB668', grassDark: '#5C9A54', leaf: '#58A05C', leafDark: '#3F7D43',
  trunk: '#7A5238', gold: '#F5C04A',
};
// D1 (62.5–66s): smooth palette transition shower → after-rain gold
function palAt(t) {
  if (t < 62.5) return RAINY;
  if (t < 66) return mixPal(RAINY, GOLDEN, sstep((t - 62.5) / 3.5));
  return GOLDEN;
}

// Character designs (same params as E08 painter)
const GIRL = { skin: SUNPRINT.skin, hair: '#3A3F58', top: '#4E7FD4', bottom: '#4E7FD4', shoe: '#33415C', iris: '#2E6E8E', hairStyle: 'bob', clip: SUNPRINT.gold, dress: true };
const BOY = { skin: SUNPRINT.skin, hair: '#2E2A33', top: '#F0A45C', bottom: '#C9B189', shoe: '#5C4A38', iris: '#4A5568', hairStyle: 'spikeV', clip: null, dress: false };
const CAT = { fur: '#F2994A', dark: '#D97F33' };

// ---------- story / lipsync data ----------

export async function loadPaintedData(base) {
  const story = parseStory(await (await fetch(`${base}/script.story`)).text());
  let cues = { entries: [], mouthFrameRate: 12 };
  try {
    cues = await (await fetch(`${base}/config/lipsync_cues.json`)).json();
  } catch {
    console.warn('lipsync_cues.json not ready yet — mouths stay closed');
  }
  const { byChar, mouthFrameRate } = buildCueMap(cues, ['Girl', 'Boy', 'Cat']);
  return { duration: 76, subtitles: story.subtitles, cuesByChar: byChar, mouthFrameRate };
}

// ---------- weather envelopes (locked to script.story SFX cues) ----------

// rain_shower SFX 14→62s: 0–14 none, quick ramp to moderate by ~16.5s
// (alley must read as actively raining), full 26–58, ease out 58–62.5
function rainAt(t) {
  if (t < 14) return 0;
  if (t < 18) return 0.55 * sstep((t - 14) / 4);
  if (t < 26) return lerp(0.55, 1, sstep((t - 18) / 8));
  if (t < 58) return 1;
  if (t < 62.5) return 1 - sstep((t - 58) / 4.5);
  return 0;
}
// wind: picks up through scene A, holds in the alley, calms after the rain
function windAt(t) {
  if (t < 2) return 0;
  if (t < 10) return sstep((t - 2) / 8);
  if (t < 26) return 1;
  if (t < 58) return 0.45;
  if (t < 62.5) return 0.45 * (1 - sstep((t - 58) / 4.5));
  return 0;
}
// low dark clouds press down through A, break open in D1
function cloudDarkenAt(t) {
  if (t < 14) return lerp(0.3, 1, sstep(t / 14));
  if (t < 62.5) return 1;
  if (t < 66) return 1 - sstep((t - 62.5) / 3.5);
  return 0;
}

// ---------- shared scene compositors ----------

// alley palette: pressed grey — darker sky, rain streaks darkened so they
// stay visible against the white walls
function palAlley(t) {
  const pal = palAt(t);
  return { ...pal, skyTop: mixHex(pal.skyTop, pal.cloudDark, 0.45), rain: '#7E95AA' };
}

// 阿澈的速写本（连续性道具：A1 拿着 → B1/B3 抱着跑 → C5/C6 画）
function bookProp(ctx, x, y, s, dir = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir * -0.08);
  ctx.fillStyle = '#B98B5E'; rr(ctx, -s * 0.09, -s * 0.12, s * 0.18, s * 0.24, 4); ctx.fill();
  ctx.fillStyle = SUNPRINT.page; rr(ctx, -s * 0.075, -s * 0.105, s * 0.15, s * 0.21, 3); ctx.fill();
  ctx.restore();
}

// riverbank with parallax pass-down (rates: sky .12 / far bank .35 / water .6 / fg 1.0)
function envRiver(ctx, t, cam, pal) {
  const layer = (f, fn) => { ctx.save(); ctx.translate((cam?.panXPx || 0) * (f - 1), 0); fn(); ctx.restore(); };
  layer(0.12, () => drawSky(ctx, W, t, { pal, cloudCount: 4, cloudDarken: cloudDarkenAt(t) }));
  layer(0.35, () => drawFarBank(ctx, W, 470, pal));
  layer(0.6, () => drawRiver(ctx, W, t, windAt(t), 470, 780, pal));
  layer(1.0, () => {
    drawGrassBank(ctx, W, H, t, 780, pal);
    drawWillow(ctx, 280, 800, 560, t, windAt(t) * 1.4 + 0.15, pal);
  });
}

// grey-sky closeup backdrop (clouds low and fast)
function bgCloseupGrey(ctx, t, pal) {
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = mixHex(pal.skyTop, pal.cloudDark, 0.3 * cloudDarkenAt(t)); ctx.fillRect(0, 0, W, 340);
  const cpal = { ...pal, cloud: mixHex(pal.cloud, pal.cloudDark, cloudDarkenAt(t) * 0.8) };
  drawCloud(ctx, ((t * 26) % (W + 500)) - 250, 160, 220, 84, cpal);
  drawCloud(ctx, ((t * 18 + 700) % (W + 600)) - 300, 300, 260, 74, cpal);
  ctx.fillStyle = pal.grass; ctx.fillRect(0, 950, W, 130);
}

// simple back-view kid (depth processions / watching-the-rain beats)
function drawKidBack(ctx, x, y, s, D, o = {}) {
  const legCol = D.dress ? D.skin : D.bottom;
  const step = o.walkPhase !== undefined ? Math.sin(o.walkPhase) * s * 0.08 : 0;
  limb(ctx, x - s * 0.05, y - s * 0.42, x - s * 0.05 + step, y - s * 0.02, s * 0.055, legCol);
  limb(ctx, x + s * 0.05, y - s * 0.42, x + s * 0.05 - step, y - s * 0.02, s * 0.055, legCol);
  ctx.fillStyle = D.shoe;
  ell(ctx, x - s * 0.05 + step * 1.2, y - s * 0.015, s * 0.05, s * 0.026);
  ell(ctx, x + s * 0.05 - step * 1.2, y - s * 0.015, s * 0.05, s * 0.026);
  ctx.fillStyle = D.top;
  rr(ctx, x - s * 0.12, y - s * 0.62, s * 0.24, s * 0.24, s * 0.05); ctx.fill();
  if (D.dress) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.13, y - s * 0.46); ctx.lineTo(x + s * 0.13, y - s * 0.46);
    ctx.lineTo(x + s * 0.17, y - s * 0.32); ctx.lineTo(x - s * 0.17, y - s * 0.32); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = D.hair; ell(ctx, x, y - s * 0.74, s * 0.14, s * 0.15);
  if (D.hairStyle === 'bob') {
    ell(ctx, x - s * 0.12, y - s * 0.68, s * 0.045, s * 0.1);
    ell(ctx, x + s * 0.12, y - s * 0.68, s * 0.045, s * 0.1);
    if (D.clip) { ctx.fillStyle = D.clip; ell(ctx, x + s * 0.09, y - s * 0.79, s * 0.025, s * 0.025); }
  }
}

// wet stone ground with puddle sheen
function wetStreet(ctx, yTop, pal) {
  ctx.fillStyle = pal.alleyStone; ctx.fillRect(0, yTop, W, H - yTop);
  ctx.fillStyle = pal.glint; ctx.globalAlpha = 0.35;
  ell(ctx, 420, yTop + 120, 200, 16);
  ell(ctx, 1350, yTop + 190, 260, 20);
  ctx.globalAlpha = 1;
}

// striped awning band across the top of frame (interior-looking-out shots)
function awningFrameTop(ctx, t, pal, depth = 120) {
  ctx.fillStyle = pal.storeAwning; ctx.fillRect(0, 0, W, depth);
  ctx.fillStyle = SUNPRINT.cloud;
  const stripes = 16;
  for (let i = 0; i < stripes; i += 2) ctx.fillRect((i / stripes) * W, 0, W / stripes, depth);
  const flap = Math.sin(t * 2.2) * 3;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? pal.storeAwning : SUNPRINT.cloud;
    ell(ctx, (i + 0.5) * (W / stripes), depth, W / stripes / 2, 16 + flap * (i % 2 ? 1 : -1));
  }
}

// ---------- A 河堤起风 ----------

function shotA1(ctx, t, data, cam) {
  const pal = palAt(t);
  envRiver(ctx, t, cam, pal);
  // stone steps descending the bank
  ctx.fillStyle = mixHex(pal.alleyStone, '#FFFFFF', 0.1);
  for (let i = 0; i < 3; i++) {
    rr(ctx, 660 - i * 50, 810 + i * 46, 640 + i * 100, 46, 5); ctx.fill();
    ctx.fillStyle = pal.alleyStone;
  }
  // trio on the steps: boy sitting with sketchbook, girl standing, cat loaf
  drawKidSide(ctx, 1060, 808, 240, BOY, { dir: -1, pose: 'sit_sketch', expr: 'calm', drawing: true, t });
  drawKidSide(ctx, 840, 810, 250, GIRL, { dir: 1, expr: 'calm', blink: blinkCoverage('girl_a1', t) });
  drawCatLoaf(ctx, 1270, 830, 120, t, CAT);
  drawRain(ctx, W, H, t, rainAt(t), windAt(t), pal);
}

function shotA2(ctx, t) {
  const pal = palAt(t);
  ctx.fillStyle = mixHex(pal.skyTop, pal.cloudDark, 0.5); ctx.fillRect(0, 0, W, 200);
  drawRiver(ctx, W, t, windAt(t) * 1.6, 200, H, pal);
}

function shotA3(ctx, t, data) {
  const pal = palAt(t);
  bgCloseupGrey(ctx, t, pal);
  drawKidSide(ctx, 760, 1160, 860, BOY, { dir: 1, expr: 'calm', blink: blinkCoverage('boy_a3', t), mouth: mouthStateAt(data, 'Boy', t) });
}

function shotA4(ctx, t, data) {
  const pal = palAt(t);
  bgCloseupGrey(ctx, t, pal);
  drawKidFront(ctx, 960, 1150, 780, GIRL, { expr: 'curious', blink: blinkCoverage('girl_a4', t), mouth: mouthStateAt(data, 'Girl', t) });
}

function shotA5(ctx, t) {
  const pal = palAt(t);
  ctx.fillStyle = mixHex(pal.skyTop, pal.cloudDark, 0.5); ctx.fillRect(0, 0, W, 140);
  drawRiver(ctx, W, t, windAt(t), 140, H, pal);
  // the first drops: expanding ripple rings at two impact points
  for (const [sx, sy, start] of [[880, 520, 12.5], [1180, 660, 13.2]]) {
    const local = t - start;
    if (local < 0) continue;
    if (local < 0.12) { // the drop streak itself
      ctx.strokeStyle = pal.glint; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const p = local / 0.12;
      ctx.beginPath(); ctx.moveTo(sx + 8, sy - 260 * (1 - p)); ctx.lineTo(sx + 4, sy - 260 * (1 - p) + 40); ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const p = local * 1.1 - k * 0.28;
      if (p < 0 || p > 1) continue;
      ctx.globalAlpha = (1 - p) * 0.7; ctx.strokeStyle = pal.glint; ctx.lineWidth = 2.5;
      ellS(ctx, sx, sy, 10 + p * 80, (10 + p * 80) * 0.3);
    }
    ctx.globalAlpha = 1;
  }
}

function shotA6(ctx, t, data, cam) {
  const pal = palAt(t);
  envRiver(ctx, t, cam, pal);
  // the cat stands up — the guide wakes
  drawCatStand(ctx, 880, 960, 430, t, CAT, { dir: 1, tailUp: true, mouth: mouthStateAt(data, 'Cat', t) });
  drawKidSide(ctx, 1420, 890, 300, GIRL, { dir: -1, expr: 'curious', blink: blinkCoverage('girl_a6', t) });
  drawKidSide(ctx, 1620, 880, 290, BOY, { dir: -1, blink: blinkCoverage('boy_a6', t) });
  drawRain(ctx, W, H, t, rainAt(t), windAt(t), pal);
}

// ---------- B 白墙巷阵雨 ----------

function shotB1(ctx, t, data, cam) {
  const pal = palAlley(t);
  drawAlley(ctx, W, H, t, cam, pal);
  const drift = (t - 16.5) * 110; // the procession hurries right, camera pans with it
  drawCatWalk(ctx, 760 + drift, 920, 190, t, CAT, { dir: 1, walkPhase: t * 12 });
  drawKidSide(ctx, 470 + drift, 940, 320, GIRL, { dir: 1, pose: 'walk', walkPhase: t * 13, blink: blinkCoverage('girl_b1', t) });
  drawKidSide(ctx, 240 + drift, 950, 330, BOY, { dir: 1, pose: 'hold', holdProp: bookProp, walkPhase: t * 13 + 1.7, blink: blinkCoverage('boy_b1', t) });
  drawRain(ctx, W, H, t, rainAt(t), windAt(t) * 0.5, pal);
}

function shotB2(ctx, t) {
  const pal = palAlley(t);
  // low angle: slab ground fills the frame, wall foot band on top
  ctx.fillStyle = pal.alleyShade; ctx.fillRect(0, 0, W, 150);
  wetStreet(ctx, 150, pal);
  ctx.strokeStyle = mixHex(pal.alleyStone, '#4A4640', 0.25); ctx.lineWidth = 3;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * W / 5, 150); ctx.lineTo(i * W / 5 + 60, H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(W, 540); ctx.stroke();
  // hurrying legs, cropped above the knees; the cat's paws flash past
  const drift = (t - 21) * 130;
  drawKidSide(ctx, 460 + drift, 1240, 780, GIRL, { dir: 1, pose: 'walk', walkPhase: t * 13 });
  drawKidSide(ctx, 950 + drift, 1270, 820, BOY, { dir: 1, pose: 'walk', walkPhase: t * 13 + 1.7 });
  drawCatWalk(ctx, 1420 + drift, 1190, 330, t, CAT, { dir: 1, walkPhase: t * 12 });
  drawRain(ctx, W, H, t, rainAt(t), windAt(t) * 0.4, pal);
}

function shotB3(ctx, t, data, cam) {
  const pal = palAlley(t);
  drawAlley(ctx, W, H, t, cam, pal);
  // depth procession: shrinking toward the bright end of the alley
  const p = sstep((t - 23.5) / 2.4);
  const bx = lerp(760, 1120, p), bs = lerp(1, 0.5, p), by = lerp(0, -110, p);
  drawKidSide(ctx, bx - 170 * bs, 960 + by, 300 * bs, BOY, { dir: 1, pose: 'hold', holdProp: bookProp, walkPhase: t * 13 });
  drawKidSide(ctx, bx, 975 + by, 290 * bs, GIRL, { dir: 1, pose: 'walk', walkPhase: t * 13 + 1.7 });
  drawCatWalk(ctx, bx + 150 * bs, 945 + by, 140 * bs, t, CAT, { dir: 1, walkPhase: t * 12 });
  drawRain(ctx, W, H, t, rainAt(t), windAt(t) * 0.5, pal);
}

// ---------- C 便利店雨檐 ----------

function shotC1(ctx, t, data, cam) {
  const pal = palAt(t);
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 0, W, H);
  wetStreet(ctx, 860, pal);
  drawStorefront(ctx, 960, 870, 560, t, pal);
  // the trio under the awning; the cat shakes the rain off
  const shake = clamp(1 - (t - 26.4) / 1.6, 0, 1);
  drawCatSit(ctx, 700, 905, 190, t, CAT, { dir: 1, shake });
  if (shake > 0.05) {
    ctx.fillStyle = pal.rain;
    for (let i = 0; i < 8; i++) {
      const a = hash01(i * 3 + 1) * Math.PI * 2, d = (1 - shake) * (30 + hash01(i * 7) * 70);
      ctx.globalAlpha = shake * 0.8;
      ell(ctx, 700 + Math.cos(a) * d, 850 + Math.sin(a) * d * 0.5, 4.5, 2.5);
    }
    ctx.globalAlpha = 1;
  }
  drawKidSide(ctx, 1130, 910, 330, GIRL, { dir: -1, expr: 'curious', blink: blinkCoverage('girl_c1', t) });
  drawKidSide(ctx, 1330, 900, 320, BOY, { dir: -1, blink: blinkCoverage('boy_c1', t) });
  drawRain(ctx, W, H, t, rainAt(t), 0.1, pal);
}

function shotC2(ctx, t, data) {
  const pal = palAt(t);
  // from inside the awning: rain curtain, the grey-green far bank beyond
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 0, W, H);
  drawFarBank(ctx, W, 560, pal);
  ctx.fillStyle = pal.grass; ctx.fillRect(0, 560, W, 190);
  ctx.fillStyle = pal.river; ctx.fillRect(0, 700, W, 90); // the river through the rain
  wetStreet(ctx, 790, pal);
  drawRain(ctx, W, H, t, rainAt(t), 0.12, pal);
  awningFrameTop(ctx, t, pal, 130);
  ctx.fillStyle = mixHex(pal.storeAwning, '#3A3630', 0.45); ctx.fillRect(W - 64, 0, 64, H); // awning post
  drawBackOfHead(ctx, 430, 1160, 840, GIRL);
  drawBackOfHead(ctx, 1160, 1130, 600, BOY);
  drawCatSit(ctx, 1620, 1010, 150, t, CAT, { dir: -1 });
}

function shotC3(ctx, t, data) {
  const pal = palAt(t);
  // warm glass-door light behind the proudest cat on the street
  ctx.fillStyle = pal.storeGlow; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = mixHex(pal.storeGlow, '#8A5A20', 0.3);
  ctx.fillRect(0, 180, W, 60);
  for (let i = 0; i < 4; i++) ctx.fillRect(240 + i * 420, 480, 200, 260);
  ctx.fillStyle = mixHex(pal.storeGlow, '#5A3A14', 0.5); ctx.fillRect(0, 0, 90, H); ctx.fillRect(W - 90, 0, 90, H);
  wetStreet(ctx, 940, pal);
  drawCatSit(ctx, 960, 1030, 600, t, CAT, { dir: 1, expr: 'proud', mouth: mouthStateAt(data, 'Cat', t) });
}

function shotC4(ctx, t, data, cam) {
  const pal = palAt(t);
  // street + rain seen past the awning edge
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 0, W, H);
  wetStreet(ctx, 830, pal);
  drawRain(ctx, W, H, t, rainAt(t), 0.1, pal);
  // the warm facade behind the trio
  ctx.fillStyle = pal.storeGlow; ctx.fillRect(500, 240, 920, 620);
  ctx.fillStyle = mixHex(pal.storeGlow, '#8A5A20', 0.3);
  ctx.fillRect(500, 300, 920, 50);
  for (let i = 0; i < 3; i++) ctx.fillRect(620 + i * 300, 520, 170, 200);
  awningFrameTop(ctx, t, pal, 150);
  drawKidFront(ctx, 800, 950, 400, GIRL, { expr: 'gentle', blink: blinkCoverage('girl_c4', t) });
  drawKidSide(ctx, 1170, 960, 380, BOY, { dir: -1, expr: 'calm', blink: blinkCoverage('boy_c4', t) });
  drawCatSit(ctx, 1470, 985, 170, t, CAT, { dir: -1, expr: 'gentle' });
}

function shotC5(ctx, t, data) {
  const pal = palAt(t);
  // top-down: rain lines gathering on the page (pencil only, NO F01 symbol)
  ctx.fillStyle = mixHex(pal.alleyStone, '#4A4640', 0.12); ctx.fillRect(0, 0, W, H);
  const px = 960, py = 660, pw = 1000, ph = 620;
  ctx.save(); ctx.translate(px, py); ctx.rotate(0.012);
  ctx.fillStyle = '#B98B5E'; rr(ctx, -pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 24, 12); ctx.fill();
  ctx.fillStyle = SUNPRINT.page; rr(ctx, -pw / 2, -ph / 2, pw, ph, 8); ctx.fill();
  const local = t - 44.6;
  ctx.strokeStyle = SUNPRINT.pencil; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); ctx.clip();
  for (let i = 0; i < 12; i++) { // slanted rain lines, one by one
    const start = i * 0.3, frac = clamp((local - start) / 0.28, 0, 1);
    if (frac <= 0) continue;
    const lx = -pw * 0.42 + hash01(i * 7 + 2) * pw * 0.84;
    const ly = -ph * 0.38 + hash01(i * 11 + 4) * ph * 0.5;
    const len = (50 + hash01(i * 3) * 70) * frac;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len * 0.18, ly + len); ctx.stroke();
  }
  for (let i = 0; i < 3; i++) { // puddle rings along the bottom
    const start = 3.4 + i * 0.3, frac = clamp((local - start) / 0.3, 0, 1);
    if (frac <= 0) continue;
    const cx = -pw * 0.3 + i * pw * 0.28, cy = ph * 0.3;
    ctx.beginPath(); ctx.ellipse(cx, cy, 44 * frac, 16 * frac, 0, 0, Math.PI * 2 * frac); ctx.stroke();
  }
  ctx.restore(); ctx.restore();
  drawKidTop(ctx, 900, 240, 640, BOY, t);
  drawCatSit(ctx, 1560, 940, 150, t, CAT, { dir: -1 });
}

function shotC6(ctx, t, data) {
  const pal = palAt(t);
  ctx.fillStyle = pal.storeWall; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.storeGlow; ctx.fillRect(0, 300, 420, 560); // door glow at frame left
  // the finished page between them: slanted rain lines + puddle rings
  ctx.save(); ctx.translate(960, 520); ctx.rotate(-0.03);
  ctx.fillStyle = '#B98B5E'; rr(ctx, -350, -250, 700, 500, 10); ctx.fill();
  ctx.fillStyle = SUNPRINT.page; rr(ctx, -338, -240, 676, 480, 8); ctx.fill();
  ctx.strokeStyle = SUNPRINT.pencil; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const lx = -300 + hash01(i * 7 + 2) * 600, ly = -200 + hash01(i * 11 + 4) * 260;
    const len = 46 + hash01(i * 3) * 60;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + len * 0.18, ly + len); ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(-200 + i * 190, 170, 50, 18, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  drawBackOfHead(ctx, 560, 1180, 780, BOY);
  drawBackOfHead(ctx, 1420, 1170, 720, GIRL);
}

function shotC7(ctx, t) {
  const pal = palAt(t);
  // awning corner: drip strings and impact crowns — the quiet beauty beat
  ctx.fillStyle = mixHex(pal.skyTop, pal.cloudDark, 0.4); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.alleyShade; ctx.fillRect(0, 240, W, 260); // far wall across the street
  wetStreet(ctx, 500, pal);
  awningFrameTop(ctx, t, pal, 180);
  const edge = 196; // drip line just under the scallops
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const sx = 260 + i * 290 + (hash01(i * 5) - 0.5) * 80;
    const speed = lerp(0.55, 0.9, hash01(i * 3 + 1));
    const phase = (hash01(i * 7 + 3) + t * speed) % 1;
    const dy = edge + phase * phase * 720; // accelerating fall
    ctx.strokeStyle = pal.rain; ctx.globalAlpha = 0.75; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(sx, dy - 26); ctx.lineTo(sx, dy); ctx.stroke();
    if (phase > 0.9) { // impact crown at the ground
      const life = (phase - 0.9) / 0.1;
      ctx.globalAlpha = 0.75 * life; ctx.lineWidth = 2.5;
      const gy = edge + 720;
      ctx.beginPath();
      ctx.moveTo(sx - 8, gy); ctx.lineTo(sx - 12, gy - 9 * life);
      ctx.moveTo(sx + 8, gy); ctx.lineTo(sx + 12, gy - 7 * life);
      ctx.stroke();
      ctx.globalAlpha = 0.4 * life;
      ellS(ctx, sx, gy + 2, 8 + (1 - life) * 26, (8 + (1 - life) * 26) * 0.3);
    }
    ctx.globalAlpha = 1;
  }
  drawRain(ctx, W, H, t, rainAt(t) * 0.5, 0.08, pal);
}

function shotC8(ctx, t, data, cam) {
  const pal = palAt(t);
  // three backs at the awning edge, watching the rain ease (pull_out, BGM lifts)
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 0, W, H);
  drawFarBank(ctx, W, 540, pal);
  ctx.fillStyle = pal.grass; ctx.fillRect(0, 540, W, 200);
  wetStreet(ctx, 740, pal);
  drawRain(ctx, W, H, t, rainAt(t), 0.1, pal);
  awningFrameTop(ctx, t, pal, 110);
  ctx.fillStyle = SUNPRINT.trunk; rr(ctx, 640, 800, 640, 26, 8); ctx.fill(); // the bench
  drawKidBack(ctx, 800, 868, 300, GIRL);
  drawKidBack(ctx, 1010, 872, 290, BOY);
  drawCatSit(ctx, 1170, 812, 130, t, CAT, { dir: 1 });
}

// ---------- D 雨后金光 ----------

function shotD1(ctx, t, data) {
  const pal = palAt(t);
  ctx.fillStyle = pal.skyTop; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 620, W, H - 620);
  // the cloud deck splits: gold rim around the gap (flat color, no glow)
  const dark = cloudDarkenAt(t);
  if (dark > 0.02) {
    const cpal = { ...pal, cloud: mixHex(pal.cloud, pal.cloudDark, 0.6 + dark * 0.3) };
    drawCloud(ctx, 320, 260, 340, 120, cpal);
    drawCloud(ctx, 1620, 200, 380, 130, cpal);
  }
  drawCloudGap(ctx, W * 0.55, 320, 860, t, pal);
  // last wisps of rain
  drawRain(ctx, W, H, t, rainAt(t), 0, pal);
  // the trio tiny at the bottom, looking up
  ctx.fillStyle = pal.alleyStone; ctx.fillRect(0, 960, W, H - 960);
  drawKidBack(ctx, 760, 1000, 210, GIRL);
  drawKidBack(ctx, 980, 1005, 200, BOY);
  drawCatSit(ctx, 1160, 1010, 110, t, CAT, { dir: -1, mouth: mouthStateAt(data, 'Cat', t) });
}

function shotD2(ctx, t, data, cam) {
  const pal = palAt(t);
  // low angle on the washed street: gold light lying on the wet slabs
  ctx.fillStyle = mixHex(pal.alleyWall, pal.gold, 0.25); ctx.fillRect(0, 0, W, 220);
  ctx.fillStyle = pal.alleyTile; ctx.fillRect(0, 220, W, 36); // eave shadow line
  wetStreet(ctx, 256, pal);
  drawWetDapples(ctx, W, 500, t, pal);
  const drift = (t - 67.5) * 100;
  drawKidSide(ctx, 560 + drift, 1230, 760, GIRL, { dir: 1, pose: 'walk', walkPhase: t * 9 });
  drawKidSide(ctx, 990 + drift, 1250, 780, BOY, { dir: 1, pose: 'walk', walkPhase: t * 9 + 1.7 });
  drawCatWalk(ctx, 1380 + drift, 1180, 320, t, CAT, { dir: 1, walkPhase: t * 8 });
}

function shotD3(ctx, t, data, cam) {
  const pal = palAt(t);
  // three-part look back: riverbank — white-wall alley — storefront
  drawSky(ctx, W, t, { pal, cloudCount: 3, cloudDarken: 0 });
  // mid-ground band behind the three sections (kills gaps between them)
  ctx.fillStyle = pal.horizon; ctx.fillRect(0, 300, W, H - 300);
  // left third: river + willow
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 640, H); ctx.clip();
  drawRiver(ctx, 640, t, 0, 500, 700, pal);
  ctx.restore();
  drawWillow(ctx, 180, 760, 420, t, 0.1, pal);
  // middle: alley walls converging
  ctx.fillStyle = pal.alleyWall;
  ctx.beginPath(); ctx.moveTo(660, 380); ctx.lineTo(1080, 520); ctx.lineTo(1080, 760); ctx.lineTo(660, 900); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.alleyShade;
  ctx.beginPath(); ctx.moveTo(1240, 360); ctx.lineTo(1080, 520); ctx.lineTo(1080, 760); ctx.lineTo(1240, 920); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.alleyTile;
  ctx.beginPath(); ctx.moveTo(660, 380); ctx.lineTo(1080, 520); ctx.lineTo(1080, 545); ctx.lineTo(660, 415); ctx.closePath(); ctx.fill();
  // right: the storefront, warm door lit
  drawStorefront(ctx, 1600, 800, 320, t, pal);
  // wet gold ground across the bottom
  ctx.fillStyle = mixHex(pal.alleyStone, pal.gold, 0.12); ctx.fillRect(0, 760, W, H - 760);
  drawWetDapples(ctx, W, 830, t, pal);
  // the trio walks away down the street, cat leading
  const drift = (t - 71.5) * 70;
  drawCatWalk(ctx, 950 + drift, 1010, 120, t, CAT, { dir: 1, walkPhase: t * 8 });
  drawKidBack(ctx, 800 + drift, 1030, 230, GIRL, { walkPhase: t * 8 });
  drawKidBack(ctx, 640 + drift, 1040, 240, BOY, { walkPhase: t * 8 + 1.7 });
}

// ---------- shot table & driver ----------

export const SHOTS = [
  { at: 0.0, paint: shotA1, move: 'push_in' },                    // A1 黑场淡入·河堤大远景
  { at: 4.0, paint: shotA2 },                                     // A2 河面特写·波光变急
  { at: 5.0, paint: shotA3 },                                     // A3 阿澈侧面望天
  { at: 9.0, paint: shotA4 },                                     // A4 小蓝正面抬头
  { at: 12.0, paint: shotA5 },                                    // A5 第一滴雨
  { at: 14.0, paint: shotA6, move: 'push_in' },                   // A6 小橘站起·带路
  { at: 16.5, paint: shotB1, move: 'pan_view' },                  // B1 巷口侧面·小橘领跑
  { at: 21.0, paint: shotB2 },                                    // B2 低角度脚步（交叠段 21–23.5）
  { at: 23.5, paint: shotB3, move: 'push_in' },                   // B3 巷纵深背影（23.5–26）
  { at: 26.0, paint: shotC1 },                                    // C1 门脸中景·甩水
  { at: 30.0, paint: shotC2 },                                    // C2 檐内过肩看雨幕
  { at: 37.0, paint: shotC3, move: 'push_in' },                   // C3 小橘坐姿特写·骄傲
  { at: 41.0, paint: shotC4 },                                    // C4 檐下三人全景
  { at: 44.5, paint: shotC5, move: 'push_in' },                   // C5 俯视速写·雨线
  { at: 50.0, paint: shotC6 },                                    // C6 双人过肩看速写页
  { at: 53.0, paint: shotC7 },                                    // C7 檐角落水串
  { at: 58.0, paint: shotC8, move: 'pull_out' },                  // C8 并排背影望雨帘
  { at: 62.5, paint: shotD1 },                                    // D1 云层裂开金边·色板过渡
  { at: 67.5, paint: shotD2, move: 'pan_view' },                  // D2 湿路金光斑
  { at: 71.5, paint: shotD3, move: 'pull_out' },                  // D3 三段式回望大远景
  { at: 75.0, paint: shotD3 },                                    // D4 定格余韵 → 淡出
];

const driver = makeDriver({
  shots: SHOTS, duration: 76, W, H,
  labels: { Girl: '小蓝', Boy: '阿澈', Cat: '小橘' },
  fadeInAt: 0, fadeAt: 75,
});

export function paintFrame(ctx, data, t) {
  driver.paintFrame(ctx, data, t);
}
