// E08 painted previz — episode layer on top of dula-assets/lib/flatpreviz.
// Story data (script.story) + lipsync cues are the only inputs; all art is code.

import {
  hash01, clamp, lerp, sstep, ell, ellS, rr, limb, tri,
  SUNPRINT, parseStory, buildCueMap, mouthStateAt, blinkCoverage,
} from '/node_modules/dula-assets/lib/flatpreviz/core.js';
import { drawKidFront } from '/node_modules/dula-assets/lib/flatpreviz/figures.js';
import { drawKidSide, drawBackOfHead, drawKidTop, drawCatLoaf } from '/node_modules/dula-assets/lib/flatpreviz/figures-side.js';
import {
  drawSky, drawFarBank, drawRiver, drawGrassBank, drawWillow, drawBirds, drawGustOverlay, drawCloud,
} from '/node_modules/dula-assets/lib/flatpreviz/env.js';
import { makeDriver } from '/node_modules/dula-assets/lib/flatpreviz/driver.js';

export const W = 1920, H = 1080;
export const PAL = {
  ...SUNPRINT,
  girlHair: '#3A3F58', girlDress: '#4E7FD4', girlShoe: '#33415C',
  boyHair: '#2E2A33', boyTop: '#F0A45C', boyPants: '#C9B189',
};

// Character designs (flat-previz stand-ins for 小蓝 / 阿澈 / 小橘)
const GIRL = { skin: PAL.skin, hair: PAL.girlHair, top: PAL.girlDress, bottom: PAL.girlDress, shoe: PAL.girlShoe, iris: '#2E6E8E', hairStyle: 'bob', clip: PAL.gold, dress: true };
const BOY = { skin: PAL.skin, hair: PAL.boyHair, top: PAL.boyTop, bottom: PAL.boyPants, shoe: '#5C4A38', iris: '#4A5568', hairStyle: 'spikeV', clip: null, dress: false };
const CAT = { fur: '#F2994A', dark: '#D97F33' };

// ---------- story / lipsync data ----------

export async function loadPaintedData(base) {
  const story = parseStory(await (await fetch(`${base}/script.story`)).text());
  const cues = await (await fetch(`${base}/config/lipsync_cues.json`)).json();
  const { byChar, mouthFrameRate } = buildCueMap(cues, ['Girl', 'Boy']);
  return { duration: 60, subtitles: story.subtitles, cuesByChar: byChar, mouthFrameRate };
}

// ---------- episode-specific props ----------

// wind: 0 calm .. 1 gust (envelope locked to the wind_gust SFX cue at 16-18.5s)
function windAt(t) {
  if (t < 15.6 || t > 19.6) return 0;
  if (t < 16.3) return sstep((t - 15.6) / 0.7);
  if (t < 18.6) return 1;
  return 1 - sstep((t - 18.6) / 1.0);
}

// The loose page: pencil-sketch marks only, NEVER the F01 symbol (quarantine discipline).
function drawPage(ctx, x, y, rot, s, flutter = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.transform(1, 0, Math.sin(flutter) * 0.22, 1, 0, 0);
  ctx.fillStyle = PAL.page; rr(ctx, -s * 0.5, -s * 0.36, s, s * 0.72, 6); ctx.fill();
  ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = Math.max(1.2, s * 0.008);
  ctx.beginPath(); ctx.moveTo(-s * 0.38, -s * 0.05); ctx.lineTo(s * 0.38, -s * 0.08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.16); ctx.quadraticCurveTo(0, s * 0.1, s * 0.32, s * 0.17); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.05); ctx.quadraticCurveTo(-s * 0.28, -s * 0.24, -s * 0.22, -s * 0.3); ctx.stroke();
  ctx.restore();
}

// F01: gear-frost symbol — fine, symmetric, quietly strange (pencil lines).
function drawF01(ctx, x, y, r) {
  ctx.save(); ctx.strokeStyle = '#7A7E8C'; ctx.lineWidth = Math.max(1.2, r * 0.035); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const a2 = a + Math.PI / 8;
    ctx.beginPath();
    ctx.moveTo(x + c * r * 0.42, y + s * r * 0.42);
    ctx.lineTo(x + Math.cos(a - 0.16) * r * 0.66, y + Math.sin(a - 0.16) * r * 0.66);
    ctx.lineTo(x + Math.cos(a + 0.16) * r * 0.66, y + Math.sin(a + 0.16) * r * 0.66);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + c * r * 0.34, y + s * r * 0.34); ctx.lineTo(x + c * r * 0.2, y + s * r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a2) * r * 0.42, y + Math.sin(a2) * r * 0.42);
    ctx.lineTo(x + Math.cos(a2) * r * 0.56, y + Math.sin(a2) * r * 0.56); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.1, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ---------- environment ----------

function shotEnv(ctx, t, o = {}, cam = { panXPx: 0 }) {
  const layer = (f, fn) => { ctx.save(); ctx.translate(cam.panXPx * (f - 1), 0); fn(); ctx.restore(); };
  layer(0.12, () => drawSky(ctx, W, t));
  layer(0.35, () => drawFarBank(ctx, W));
  layer(0.6, () => drawRiver(ctx, W, t, windAt(t)));
  layer(1.0, () => {
    drawGrassBank(ctx, W, H, t);
    drawWillow(ctx, 300, 800, 560, t, windAt(t) * 1.4 + (o.calmSway ? 0 : 0.12));
    drawBirds(ctx, W, t, o.birdsAt ?? -1, 4.5);
    if (o.gust) drawGustOverlay(ctx, W, t, windAt(t));
  });
  if (o.pageOnWater) {
    layer(0.75, () => {
      const p = sstep((t - o.pageOnWater.start) / o.pageOnWater.duration);
      const px = lerp(620, 1880, p), py = 610 + Math.sin(t * 2.1) * 7 + p * 40;
      const ps = lerp(150, 92, p);
      ctx.globalAlpha = 0.5; ctx.strokeStyle = PAL.glint; ctx.lineWidth = 3;
      ellS(ctx, px, py + ps * 0.32, ps * (0.7 + 0.2 * Math.sin(t * 3)), ps * 0.14);
      ctx.globalAlpha = 1;
      drawPage(ctx, px, py, -0.06 + Math.sin(t * 1.7) * 0.08, ps, t * 1.2);
    });
  }
}

function bgCloseup(ctx, t) {
  ctx.fillStyle = PAL.horizon; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, 300);
  drawCloud(ctx, ((t * 8) % (W + 400)) - 200, 150, 170, 70);
  ctx.fillStyle = PAL.leaf; ctx.globalAlpha = 0.85;
  ell(ctx, 200, 120, 260, 150); ell(ctx, 1730, 90, 220, 130);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.grass; ctx.fillRect(0, 950, W, 130);
}

// held-page prop shared by hold/offer poses
function pageProp(ctx, x, y, s, dir = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir * -0.06);
  ctx.fillStyle = PAL.page; rr(ctx, -s * 0.11, -s * 0.075, s * 0.22, s * 0.15, 4); ctx.fill();
  ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.04 + i * s * 0.035); ctx.lineTo(s * 0.08, -s * 0.045 + i * s * 0.035); ctx.stroke(); }
  ctx.restore();
}

// ---------- shots ----------

function shotWideTrio(ctx, t, data, cam) {
  shotEnv(ctx, t, { calmSway: true, birdsAt: 4.0 }, cam);
  drawKidSide(ctx, 1080, 830, 300, BOY, { dir: 1, pose: 'sit_sketch', expr: 'calm', drawing: true, t });
  const walkP = sstep((t - 3.5) / 1.6);
  const gx = lerp(280, 760, walkP);
  drawKidSide(ctx, gx, 845 + (walkP < 1 ? Math.abs(Math.sin(t * 6)) * -8 : 0), 310,
    GIRL, { dir: 1, pose: walkP < 1 ? 'walk' : 'stand', expr: 'curious', blink: blinkCoverage('girl_wide', t), walkPhase: walkP < 1 ? t * 9 : undefined });
  drawCatLoaf(ctx, 1500, 890, 170, t, CAT);
}

function shotGirlClose(ctx, t, data, expr) {
  bgCloseup(ctx, t);
  drawKidFront(ctx, 960, 1150, 780, GIRL, { pose: expr === 'alarmed' ? 'alarmed' : 'stand', expr, blink: blinkCoverage('girl_close', t), mouth: mouthStateAt(data, 'Girl', t) });
}

// profile close-up: boy looking at the river while he answers
function shotBoySideClose(ctx, t, data, expr) {
  ctx.fillStyle = PAL.horizon; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, 260);
  drawCloud(ctx, ((t * 8) % (W + 400)) - 200, 140, 170, 70);
  drawRiver(ctx, W, t, 0, 480, 900);
  ctx.fillStyle = PAL.grass; ctx.fillRect(0, 900, W, 180);
  drawKidSide(ctx, 760, 1160, 860, BOY, { dir: 1, pose: 'stand', expr, blink: blinkCoverage('boy_side', t), mouth: mouthStateAt(data, 'Boy', t) });
}

function shotPageLift(ctx, t) {
  // over the boy's shoulder: back-of-head left foreground, book on the grass,
  // the page lifting off to the sky
  shotEnv(ctx, t, {});
  const bx = 1080, by = 880;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.05);
  ctx.fillStyle = '#B98B5E'; rr(ctx, -330, -110, 660, 230, 10); ctx.fill();
  ctx.fillStyle = PAL.page; rr(ctx, -318, -100, 636, 212, 8); ctx.fill();
  ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(0, 112); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-290, -60 + i * 34); ctx.lineTo(-40, -66 + i * 34); ctx.stroke(); }
  ctx.restore();
  const p = sstep((t - 18.6) / 2.3);
  const px = lerp(bx + 130, 1780, p) + Math.sin(t * 6) * 26 * p;
  const py = lerp(by - 90, 150, sstep(p)) - Math.sin(t * 4.2) * 30 * p;
  drawPage(ctx, px, py, -0.1 + p * 0.7 + Math.sin(t * 7) * 0.18 * (0.3 + p), lerp(190, 120, p), t * 6);
  drawBackOfHead(ctx, 330, 1180, 900, BOY);
}

function shotBoyStop(ctx, t) {
  bgCloseup(ctx, t);
  drawKidFront(ctx, 960, 1120, 720, BOY, { pose: 'hand_up', expr: 'gentle', blink: blinkCoverage('boy_stop', t) });
}

// low angle at water level: the page drifts past in the foreground
function shotPageDriftLow(ctx, t, data, cam) {
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, 200);
  ctx.fillStyle = PAL.horizon; ctx.fillRect(0, 200, W, 140);
  ctx.save(); ctx.translate((cam?.panXPx || 0) * (0.3 - 1), 0); drawFarBank(ctx, W, 340); ctx.restore();
  drawRiver(ctx, W, t, 0, 340, H);
  const p = sstep((t - 30.0) / 4.5);
  const px2 = lerp(300, 1700, p), py2 = 560 + Math.sin(t * 2.1) * 9 + p * 90;
  const ps = lerp(300, 170, p);
  ctx.globalAlpha = 0.5; ctx.strokeStyle = PAL.glint; ctx.lineWidth = 4;
  ellS(ctx, px2, py2 + ps * 0.34, ps * (0.75 + 0.2 * Math.sin(t * 3)), ps * 0.15);
  ctx.globalAlpha = 1;
  drawPage(ctx, px2, py2, -0.05 + Math.sin(t * 1.7) * 0.09, ps, t * 1.2);
  ctx.fillStyle = PAL.grassDark; // foreground grass blades framing the bottom corners
  for (const [bx, flip] of [[0, 1], [W, -1]]) {
    for (let i = 0; i < 5; i++) {
      const gx = bx + flip * (30 + i * 46);
      const sway = Math.sin(t * 1.4 + i) * 10;
      ctx.beginPath(); ctx.moveTo(gx - 16, H);
      ctx.quadraticCurveTo(gx + sway, H - 130 - hash01(i * 3 + bx) * 120, gx + 10 + sway * 1.6, H - 200 - hash01(i * 7) * 130);
      ctx.quadraticCurveTo(gx + sway * 0.6, H - 120, gx + 34, H); ctx.closePath(); ctx.fill();
    }
  }
}

// boy answering over the girl's shoulder (her back-of-head right foreground)
function shotBoySmileOverGirl(ctx, t, data) {
  shotEnv(ctx, t, { calmSway: true });
  drawKidFront(ctx, 800, 920, 430, BOY, { pose: 'stand', expr: 'gentle', blink: blinkCoverage('boy_smile', t), mouth: mouthStateAt(data, 'Boy', t) });
  drawBackOfHead(ctx, 1560, 1120, 780, GIRL);
}

function shotRedraw(ctx, t) {
  // high angle: looking down at the boy redrawing from memory
  ctx.fillStyle = PAL.grass; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.gold;
  for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 0.6 + i); ell(ctx, 200 + hash01(i * 13) * 1600, 120 + hash01(i * 7) * 900, 70, 22); }
  ctx.globalAlpha = 1;
  const px = 960, py = 640, pw = 1100, ph = 700;
  ctx.save(); ctx.translate(px, py); ctx.rotate(0.012);
  ctx.fillStyle = '#B98B5E'; rr(ctx, -pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 28, 14); ctx.fill();
  ctx.fillStyle = PAL.page; rr(ctx, -pw / 2, -ph / 2, pw, ph, 8); ctx.fill();
  const strokes = [
    (c) => { c.moveTo(-pw * 0.4, -ph * 0.12); c.lineTo(pw * 0.4, -ph * 0.16); },
    (c) => { c.moveTo(-pw * 0.32, ph * 0.2); c.quadraticCurveTo(0, ph * 0.1, pw * 0.36, ph * 0.2); },
    (c) => { c.moveTo(-pw * 0.26, -ph * 0.12); c.quadraticCurveTo(-pw * 0.3, -ph * 0.34, -pw * 0.22, -ph * 0.4); },
    (c) => { c.moveTo(-pw * 0.34, -ph * 0.34); c.quadraticCurveTo(-pw * 0.2, -ph * 0.44, -pw * 0.08, -ph * 0.36); },
    (c) => { c.moveTo(-pw * 0.2, -ph * 0.3); c.quadraticCurveTo(-pw * 0.22, -ph * 0.1, -pw * 0.18, ph * 0.02); },
    (c) => { c.moveTo(-pw * 0.12, -ph * 0.32); c.quadraticCurveTo(-pw * 0.1, -ph * 0.12, -pw * 0.06, -ph * 0.0); },
    (c) => { c.moveTo(pw * 0.14, -ph * 0.28); c.arc(pw * 0.14, -ph * 0.28, 30, 0, Math.PI * 2); },
    (c) => { c.moveTo(-pw * 0.36, ph * 0.3); c.lineTo(pw * 0.3, ph * 0.28); },
  ];
  const local = t - 40.6;
  ctx.strokeStyle = PAL.pencil; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  strokes.forEach((fn, i) => {
    const start = i * 0.48, frac = clamp((local - start) / 0.42, 0, 1);
    if (frac <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); ctx.clip();
    ctx.beginPath(); fn(ctx);
    if (frac >= 1) { ctx.stroke(); }
    else { ctx.setLineDash([frac * 4000, 4000]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  });
  ctx.restore();
  drawKidTop(ctx, px - 60, 200, 700, BOY, t);
  drawCatLoaf(ctx, 1650, 950, 150, t, CAT);
}

function shotOffer(ctx, t, data) {
  // side two-shot: boy (facing left) extends the page, girl (facing right) receives
  shotEnv(ctx, t, { calmSway: true });
  drawKidSide(ctx, 1330, 870, 350, BOY, { dir: -1, pose: 'offer', expr: 'gentle', blink: blinkCoverage('boy_offer', t), mouth: mouthStateAt(data, 'Boy', t), holdProp: pageProp });
  drawKidSide(ctx, 620, 880, 340, GIRL, { dir: 1, pose: 'stand', expr: 'curious', blink: blinkCoverage('girl_offer', t) });
  drawCatLoaf(ctx, 950, 905, 110, t, CAT);
}

function shotAccept(ctx, t, data) {
  bgCloseup(ctx, t);
  drawKidFront(ctx, 960, 1150, 760, GIRL, { pose: 'hold', holdProp: pageProp, expr: 'happy', blink: blinkCoverage('girl_accept', t), mouth: mouthStateAt(data, 'Girl', t) });
  drawCatLoaf(ctx, 1560, 990, 150, t, CAT);
}

function shotF01(ctx, t) {
  ctx.fillStyle = '#E8DCC4'; ctx.fillRect(0, 0, W, H);
  const pw = 1180, ph = 820, px = W / 2, py = H / 2 - 10;
  ctx.fillStyle = '#B98B5E'; rr(ctx, px - pw / 2 - 20, py - ph / 2 - 20, pw + 40, ph + 40, 16); ctx.fill();
  ctx.fillStyle = PAL.page; rr(ctx, px - pw / 2, py - ph / 2, pw, ph, 10); ctx.fill();
  ctx.strokeStyle = PAL.pencil; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const X = (fx) => px + fx * pw, Y = (fy) => py + fy * ph;
  ctx.beginPath(); ctx.moveTo(X(-0.38), Y(-0.1)); ctx.lineTo(X(0.38), Y(-0.14)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(-0.3), Y(0.16)); ctx.quadraticCurveTo(X(0), Y(0.08), X(0.34), Y(0.17)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(-0.24), Y(-0.1)); ctx.quadraticCurveTo(X(-0.28), Y(-0.32), X(-0.2), Y(-0.38)); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(X(-0.32 + i * 0.045), Y(-0.3));
    ctx.quadraticCurveTo(X(-0.33 + i * 0.045), Y(-0.12), X(-0.29 + i * 0.045), Y(-0.02));
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(X(0.16), Y(-0.28), 34, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(-0.34), Y(0.28)); ctx.lineTo(X(0.28), Y(0.26)); ctx.stroke();
  // F01: bottom-right corner, ~1/12 of the page, nobody ever mentions it
  drawF01(ctx, X(0.28), Y(0.3), 66);
}

// ---------- shot table & driver ----------

export const SHOTS = [
  { at: 0.0, paint: (c, t, d, cam) => shotEnv(c, t, { birdsAt: 0.8 }, cam), move: 'pan_view' },
  { at: 3.5, paint: shotWideTrio, move: 'push_in' },
  { at: 5.5, paint: (c, t, d) => shotGirlClose(c, t, d, 'curious') },
  { at: 8.0, paint: (c, t, d) => shotBoySideClose(c, t, d, 'calm') },
  { at: 11.0, paint: (c, t, d, cam) => shotEnv(c, t, {}, cam), move: 'pan_view' },
  { at: 16.0, paint: (c, t, d, cam) => shotEnv(c, t, { gust: true }, cam), move: 'pan_view' },
  { at: 18.5, paint: shotPageLift },
  { at: 21.0, paint: (c, t, d) => shotGirlClose(c, t, d, 'alarmed') },
  { at: 23.5, paint: shotBoyStop, move: 'push_in' },
  { at: 26.0, paint: (c, t, d) => shotBoySideClose(c, t, d, 'gentle') },
  { at: 30.0, paint: shotPageDriftLow, move: 'pan_view' },
  { at: 34.5, paint: (c, t, d) => shotGirlClose(c, t, d, 'regret') },
  { at: 37.0, paint: shotBoySmileOverGirl },
  { at: 40.5, paint: shotRedraw },
  { at: 45.0, paint: shotOffer },
  { at: 48.5, paint: shotAccept },
  { at: 51.5, paint: shotF01 },
  { at: 54.5, paint: (c, t, d, cam) => shotEnv(c, t, { birdsAt: 55.0 }, cam), move: 'pan_view', transition: 'crossfade' },
];

const driver = makeDriver({
  shots: SHOTS, duration: 60, W, H,
  labels: { Girl: '小蓝', Boy: '阿澈' },
  fadeAt: 58.6,
});

export function paintFrame(ctx, data, t) {
  driver.paintFrame(ctx, data, t);
}
