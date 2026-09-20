// E08 片头 OP（《漂吧》对唱版）painter — 纯 Canvas 自绘，零生成模型。
// 两个片段：
//   duet  — 对唱副歌新绘（覆盖歌曲 79.21-100.07s）：河堤双人 → 小蓝唱 →
//           碎玻璃映人（阿澈唱「碎玻璃里映着你的模样」，镜面碎片里是小蓝）→
//           小蓝唱「当春风吹动我的头发」（强风吹发梢）→ 阿澈唱收尾 →
//           河面漂页远去。
//   title — 版名卡「漂走的那张画」。
// 口型吃 config/theme_alignment.json 的逐字 DTW 时间（歌曲时间轴）。
import {
  clamp, lerp, sstep, mulberry32, PAL, GIRL, BOY,
  drawSky, drawCloud, drawFarBank, drawRiver, drawGrassBank, drawWillow,
  drawGustOverlay, windAt, drawKidSingFront, drawKidSingSide, drawCatLoaf,
  drawPage, drawGlassShards, makeMouthMap, blinkAt, ell, rr,
} from './lib.js';

export const W = 1920, H = 1080;
const DUET_OFFSET = 79.21; // 段内 t=0 ↔ 歌曲 79.21s（对唱副歌前 1s 器乐意口）

export async function loadOpData(base) {
  // 修订（监制否决对唱版）：原曲人声，画面取消唱歌口型——角色中性/微笑 +
  // 氛围动作。alignment 仅用于歌词字幕的句级时间。
  const al = await (await fetch(`${base}/config/theme_alignment.json`)).json();
  return { alignment: al, lines: al.lines };
}

// ---------- 共享场景 ----------
function envWide(ctx, t, wind) {
  const skip = window.__skipEnv ?? -1;
  const layers = [
    () => drawSky(ctx, W, t),
    () => drawCloud(ctx, ((t * 8) % (W + 500)) - 250, 110, 260, 90),
    () => drawCloud(ctx, ((t * 5 + 600) % (W + 500)) - 250, 200, 200, 70),
    () => drawFarBank(ctx, W),
    () => drawRiver(ctx, W, t, wind),
    () => drawGrassBank(ctx, W, H, t, wind),
    () => drawWillow(ctx, 300, 880, 560, t, wind * 1.4 + .12),
    () => { if (wind > .3) drawGustOverlay(ctx, W, t, wind); },
  ];
  layers.forEach((f, i) => { if (i !== skip) f(); });
}
function closeupBg(ctx, t, wind) {
  ctx.fillStyle = PAL.horizon; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, 280);
  drawCloud(ctx, ((t * 8) % (W + 400)) - 200, 140, 170, 70);
  drawRiver(ctx, W, t, wind * .5, 420, 860);
  ctx.fillStyle = PAL.grass; ctx.fillRect(0, 860, W, 220);
  if (wind > .3) drawGustOverlay(ctx, W, t, wind);
}

// 对唱卡拉 OK 字幕条：正在唱的字染金色
function drawLyric(ctx, line, tSong) {
  if (!line) return;
  const chars = line.text.replace(/ /g, '');
  ctx.save();
  ctx.font = '600 44px "Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // 定位当前字：用对齐 chars 的 start/end
  ctx.fillStyle = 'rgba(30,40,60,.45)';
  const w = ctx.measureText(line.text).width + 80;
  rr(ctx, W / 2 - w / 2, 952, w, 76, 38); ctx.fill();
  let x = W / 2 - ctx.measureText(line.text).width / 2;
  ctx.textAlign = 'left';
  for (const ch of line.text) {
    if (ch === ' ') { x += ctx.measureText(' ').width; continue; }
    const cw = ctx.measureText(ch).width;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(25,25,35,.8)';
    ctx.strokeText(ch, x, 990);
    ctx.fillStyle = PAL.white;
    ctx.fillText(ch, x, 990);
    x += cw;
  }
  ctx.restore();
}
function currentLine(data, tSong) {
  return data.lines.find(l => tSong >= l.start - .05 && tSong < l.end + .1) ?? null;
}

// ---------- duet 镜头 ----------
function shotWideIn(ctx, t, data) {
  const w = windAt(t);
  envWide(ctx, t, w);
  if (!window.__noKids) {
    drawKidSingSide(ctx, 660, 816, 330, GIRL, { dir: 1, mouth: 0, blink: blinkAt('gi', t), wind: w, t });
    drawKidSingSide(ctx, 1240, 816, 330, BOY, { dir: -1, mouth: 0, blink: blinkAt('bi', t), wind: w, t });
    drawCatLoaf(ctx, 1550, 950, 150, t);
  }
}
function shotGirlSing(ctx, t, data, windy = false) {
  const w = windy ? .55 + .45 * Math.sin(t * .53) * Math.sin(t * 1.31 + 2) : windAt(t) * .4;
  closeupBg(ctx, t, Math.max(w, 0));
  drawKidSingFront(ctx, 960, 620, 560, GIRL, {
    mouth: 0, blink: blinkAt('gs', t),
    wind: Math.max(w, windy ? .5 : 0), expr: 'gentle', t,
  });
  drawLyric(ctx, currentLine(data, DUET_OFFSET + t), DUET_OFFSET + t);
}
function shotBoySing(ctx, t, data) {
  const w = windAt(t) * .4;
  closeupBg(ctx, t, w);
  drawKidSingSide(ctx, 860, 640, 620, BOY, {
    dir: 1, mouth: 0, blink: blinkAt('bs', t), wind: w, t,
  });
  drawLyric(ctx, currentLine(data, DUET_OFFSET + t), DUET_OFFSET + t);
}
// 碎玻璃：河景裂成碎片，镜面碎片里映着小蓝（"映着你的模样"）；
// 左下角小圆窗里阿澈在唱这一句（口型同步）。
let faceCanvas = null;
function shotGlass(ctx, t, data) {
  if (!faceCanvas) {
    faceCanvas = document.createElement('canvas');
    faceCanvas.width = W; faceCanvas.height = H;
  }
  const fx = faceCanvas.getContext('2d');
  fx.clearRect(0, 0, W, H);
  fx.fillStyle = PAL.horizon; fx.fillRect(0, 0, W, H);
  fx.fillStyle = PAL.skyTop; fx.fillRect(0, 0, W, 280);
  drawKidSingFront(fx, 960, 640, 540, GIRL, { mouth: 0, blink: blinkAt('gf', t), wind: .2, expr: 'gentle', t });
  const w = windAt(t) * .3;
  envWide(ctx, t, w);
  ctx.fillStyle = 'rgba(20,40,70,.45)'; ctx.fillRect(0, 0, W, H);
  drawGlassShards(ctx, W, H, t, faceCanvas, 7);
  // 左下角阿澈小圆窗
  ctx.save();
  ctx.beginPath(); ctx.arc(300, 800, 200, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = PAL.horizon; ctx.fillRect(80, 580, 440, 440);
  drawKidSingSide(ctx, 270, 860, 330, BOY, {
    dir: 1, mouth: 0, blink: blinkAt('bg', t), wind: .2, t,
  });
  ctx.restore();
  ctx.strokeStyle = 'rgba(240,250,255,.9)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(300, 800, 200, 0, Math.PI * 2); ctx.stroke();
  drawLyric(ctx, currentLine(data, DUET_OFFSET + t), DUET_OFFSET + t);
}
function shotWideOut(ctx, t, data) {
  const w = windAt(t) * .6;
  envWide(ctx, t, w);
  // 画页从上游漂回两人之间（"你还会回到我身旁"）
  const p = sstep((t - 17.2) / 3.2);
  const px = lerp(1780, 900, p), py = 620 + Math.sin(t * 2.1) * 8;
  ctx.globalAlpha = .5; ctx.strokeStyle = PAL.glint; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(px, py + 40, 90, 14, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  drawPage(ctx, px, py, -.05 + Math.sin(t * 1.7) * .08, 150, t * 1.2);
  drawKidSingSide(ctx, 660, 816, 330, GIRL, { dir: 1, mouth: 0, blink: blinkAt('go', t), wind: w, t });
  drawKidSingSide(ctx, 1240, 816, 330, BOY, { dir: -1, mouth: 0, blink: blinkAt('bo', t), wind: w, t });
  drawCatLoaf(ctx, 1550, 950, 150, t);
}

export const DUET_SHOTS = [
  { at: 0.0, paint: shotWideIn, fade: 0 },
  { at: 0.8, paint: (c, t, d) => shotGirlSing(c, t, d), fade: .3 },
  { at: 4.0, paint: shotGlass, fade: .4 },
  { at: 7.6, paint: (c, t, d) => shotGirlSing(c, t, d, true), fade: .3 },
  { at: 13.1, paint: shotBoySing, fade: .3 },
  { at: 17.0, paint: shotWideOut, fade: .5 },
];
export const DUET_DURATION = 20.86;

// ---------- 版名卡 ----------
function shotTitle(ctx, t) {
  const w = windAt(t) * .5;
  envWide(ctx, t, w);
  const px = 1500 - t * 90, py = 620 + Math.sin(t * 2.1) * 8;
  drawPage(ctx, px, py, -.05 + Math.sin(t * 1.7) * .08, 150, t * 1.2);
  const a = sstep((t - .4) / .8) * (1 - sstep((t - 3.6) / .5));
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '800 108px "Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(40,55,80,.85)';
  ctx.strokeText('漂走的那张画', W / 2, 380);
  ctx.fillStyle = PAL.white;
  ctx.fillText('漂走的那张画', W / 2, 380);
  ctx.font = '500 40px "Microsoft YaHei",sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeText('片头曲「漂吧」· 对唱版', W / 2, 470);
  ctx.fillStyle = '#eaf4fb';
  ctx.fillText('片头曲「漂吧」· 对唱版', W / 2, 470);
  ctx.restore();
}
export const TITLE_SHOTS = [{ at: 0, paint: (c, t) => shotTitle(c, t), fade: 0 }];
export const TITLE_DURATION = 4.3;

export function paintFrameFor(seg) {
  if (seg === 'title') {
    return (ctx, data, t) => TITLE_SHOTS[0].paint(ctx, t);
  }
  return (ctx, data, t) => {
    let i = DUET_SHOTS.length - 1;
    while (i > 0 && DUET_SHOTS[i].at > t) i--;
    const cur = DUET_SHOTS[i], prev = DUET_SHOTS[i - 1];
    if (prev && cur.fade > 0 && t < cur.at + cur.fade) {
      prev.paint(ctx, t, data);
      ctx.save(); ctx.globalAlpha = sstep((t - cur.at) / cur.fade);
      cur.paint(ctx, t, data); ctx.restore();
    } else {
      cur.paint(ctx, t, data);
    }
  };
}
