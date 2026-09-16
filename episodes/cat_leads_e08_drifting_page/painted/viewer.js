import { W, H, loadPaintedData, paintFrame, SHOTS } from '/painted/painter.js';

const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H; document.body.appendChild(canvas);
const ctx = canvas.getContext('2d', { alpha: false });

const data = await loadPaintedData('');
window.duration = 60;
window.shotStarts = SHOTS.map(s => s.at);
window.checkTimes = [...SHOTS.flatMap(s => [s.at + 0.05, s.at + Math.min(1.2, (SHOTS[SHOTS.indexOf(s) + 1]?.at ?? 60) - s.at - 0.1)]), 59.9]
  .filter((v, i, a) => v > 0 && a.indexOf(v) === i).sort((a, b) => a - b);

function draw(t) {
  paintFrame(ctx, data, t);
  return { t, shot: SHOTS.findLast(s => s.at <= t)?.at };
}
window.stepAt = t => draw(t);
window.renderAt = t => { const state = draw(t); return { image: canvas.toDataURL('image/jpeg', .95).split(',')[1], state }; };
await document.fonts.ready;
window.ready = true; draw(0);
if (!new URLSearchParams(location.search).has('capture')) {
  const audio = new Audio('/assets/audio/mixed.wav');
  document.body.title = '点击播放 / 暂停';
  document.body.onclick = () => audio.paused ? audio.play() : audio.pause();
  function animate() { draw(audio.currentTime); requestAnimationFrame(animate); } animate();
}
