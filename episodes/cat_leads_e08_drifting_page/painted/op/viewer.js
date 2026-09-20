import { W, H, loadOpData, paintFrameFor, DUET_DURATION, TITLE_DURATION } from './painter.js';

const params = new URLSearchParams(location.search);
const seg = params.get('seg') ?? 'duet';
const duration = seg === 'title' ? TITLE_DURATION : DUET_DURATION;
const paint = paintFrameFor(seg);
const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const data = await loadOpData('/episode');

window.duration = duration;
window.stepAt = t => { ctx.clearRect(0, 0, W, H); paint(ctx, data, t); return { t, seg }; };
window.renderAt = t => {
  ctx.clearRect(0, 0, W, H); paint(ctx, data, t);
  return { image: canvas.toDataURL('image/jpeg', .95).split(',')[1], state: { t, seg } };
};
window.renderPNG = t => {
  ctx.clearRect(0, 0, W, H); paint(ctx, data, t);
  return canvas.toDataURL('image/png').split(',')[1];
};
// 修订后角色不再张嘴唱：口型抽查断言恒为 0（闭嘴微笑）。
window.mouthAt = t => ({ girl: 0, boy: 0 });
window.ready = true;
if (!params.has('capture')) {
  function animate() {
    const t = (performance.now() / 1000) % duration;
    ctx.clearRect(0, 0, W, H); paint(ctx, data, t);
    requestAnimationFrame(animate);
  }
  animate();
}
