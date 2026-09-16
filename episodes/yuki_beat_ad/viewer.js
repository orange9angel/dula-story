import * as THREE from 'three';
import { Storyboard } from 'dula-engine';
import './bootstrap.js';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 150);
window.__dulaCamera = camera;
const board = new Storyboard(renderer, camera, null, null);
await board.load('/episode/script.story', '/episode/assets/audio/manifest.json');
const copy = await (await fetch('/episode/config/ad_copy.json')).json();
const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H; document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
window.duration = Math.max(...board.entries.map(e => e.endTime));
window.shotEntries = board.entries.map(e => ({index:e.index,startTime:e.startTime,endTime:e.endTime}));
let lastSampleTime = -1;

function label(text, x, y, size, weight = 700, align = 'left', color = '#262638') {
  ctx.fillStyle = color; ctx.textAlign = align;
  ctx.font = `${weight} ${size}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(text, x, y);
}
function draw(t) {
  const entry = board.entries.findLast(e => e.startTime <= t) ?? board.entries[0];
  const holdAfter = entry.storyEvents?.find(c=>c.options?.holdAfter !== undefined)?.options.holdAfter;
  const sampleTime = holdAfter !== undefined ? Math.min(t,entry.startTime+Number(holdAfter)) : t;
  if (sampleTime !== lastSampleTime) {
    board.update(sampleTime);
    renderer.render(board.currentScene.scene, camera);
    lastSampleTime = sampleTime;
  }
  const actor = board.characters.get('Yuki');
  const pose = actor.mesh.userData.adPose ?? 'hello';
  const shot = copy[pose];
  const local = t - entry.startTime;
  const last = pose === 'finale';
  ctx.clearRect(0,0,W,H);
  ctx.drawImage(renderer.domElement, 0, 0);
  const titleWash = ctx.createLinearGradient(0,0,0,285);
  titleWash.addColorStop(0,'rgba(255,248,240,0.94)');
  titleWash.addColorStop(0.8,'rgba(255,248,240,0.90)');
  titleWash.addColorStop(1,'rgba(255,248,240,0)');
  ctx.fillStyle=titleWash;ctx.fillRect(0,0,W,285);

  // Quiet brand strip, title and CTA occupy reserved portrait safe areas.
  label('DULA', 46, 65, 29, 900);
  label('小雪 YUKI', W - 46, 63, 17, 600, 'right');
  ctx.strokeStyle = '#262638'; ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.moveTo(46,86); ctx.lineTo(W-46,86); ctx.stroke(); ctx.globalAlpha = 1;
  const enter = Math.min(1, local / 0.18);
  ctx.save(); ctx.globalAlpha = enter; ctx.translate(0, (1-enter)*22);
  label(shot.kicker, W/2, 145, 18, 700, 'center');
  label(shot.headline, W/2, 218, last ? 52 : 59, 900, 'center');
  ctx.restore();

  if (last) {
    ctx.fillStyle = '#262638'; ctx.beginPath(); ctx.roundRect(104, 1015, 512, 80, 40); ctx.fill();
    label('DULA  ORIGINALS', W/2, 1067, 32, 900, 'center', '#fff6eb');
    label(shot.footer, W/2, 1146, 25, 600, 'center');
  } else {
    ctx.save(); ctx.globalAlpha=0.92;ctx.fillStyle='#fff8f0';ctx.beginPath();ctx.roundRect(46,1060,628,112,24);ctx.fill();ctx.restore();
    label(shot.footer, W/2, 1110, 27, 700, 'center');
    label('让每一个角色，都有自己的节奏', W/2, 1150, 17, 400, 'center');
  }
  // Beat dots and a subtle progress line; effects follow the exact music pulse.
  for(let i=0;i<4;i++) {
    const active = Math.floor(t*2.5)%4 === i;
    ctx.fillStyle = active ? '#ff694f' : '#b9b1ac';
    ctx.beginPath(); ctx.arc(327 + i*22, 1204, active ? 5 : 3,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#262638'; ctx.globalAlpha = 0.13; ctx.fillRect(46, 1232, 628, 3);
  ctx.globalAlpha = 1; ctx.fillStyle = '#ff694f'; ctx.fillRect(46,1232,628*t/window.duration,3);
  if (local < 0.1 && entry.index > 1 && pose !== 'wink' && pose !== 'finale') {
    // A colored wipe only at cut boundaries, below six frames in length.
    ctx.fillStyle = '#ff694f';
    ctx.fillRect(W * (local / 0.1), 0, W * (1-local/0.1), H);
  }
  return {pose, root:actor.mesh.position.toArray(), camera:camera.position.toArray(), calls:renderer.info.render.calls};
}
window.renderAt = t => {
  const state = draw(t);
  return {image:canvas.toDataURL('image/jpeg',0.95).split(',')[1], state};
};
await document.fonts.ready;
window.ready = true;
draw(0);
if (!new URLSearchParams(location.search).has('capture')) {
  const music = new Audio('/episode/assets/audio/mixed.wav');
  document.body.title = '点击播放 / 暂停';
  let playing = false;
  document.body.onclick = async () => { if(playing) music.pause(); else await music.play(); playing = !playing; };
  music.loop = true;
  function animate(){ draw(music.currentTime); requestAnimationFrame(animate); } animate();
}
