// cel-cinema A0 原型页：纯 bake 数据驱动的占位色块人形（工程底座验收，非美术）。
// 证明 motion_full.json 的 世界坐标+相机(position/quaternion/fov) 足以重建 viewer 同帧构图：
// 相机重建 → 关节重投影 → 占位骨架绘制。窗口契约与 viewer 相同（renderAt/stepAt/ready/duration），
// renderAt 输出 PNG（pipeline render 步骤要求无损）。
// ?transparent=1：只画骨架（透明底），供 ffmpeg overlay 叠到 3D 原帧做重合度目检。
import * as THREE from 'three';

const W = 1280, H = 720, FPS = 30;
const [motion, shotTable] = await Promise.all([
  fetch('./config/motion_full.json').then(r => r.json()),
  fetch('./config/art_shots.json').then(r => r.json()),
]);
if (motion.schema !== 'dula-motion-2d-pilot-v1') throw new Error('bad motion schema');
window.duration = motion.end;

const TRANSPARENT = new URLSearchParams(location.search).has('transparent');
const canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H; document.body.append(canvas);
const g = canvas.getContext('2d');

const cam = new THREE.PerspectiveCamera(44, W / H, .05, 200);
const rebuild = c => {
  cam.position.fromArray(c.position); cam.quaternion.fromArray(c.quaternion);
  cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
};
const _v = new THREE.Vector3();
const proj = p => { _v.set(p[0], p[1], p[2]).project(cam); return [(_v.x + 1) * W / 2, (1 - _v.y) * H / 2]; };

const frameAt = t => motion.frames[Math.max(0, Math.min(motion.frames.length - 1, Math.round((t - motion.start) * FPS)))];
const segAt = t => shotTable.shots.find(s => t >= s.start && t < s.end) ?? shotTable.shots.at(-1);

const COLORS = {Eileen: '#8fb4e8', Alder: '#d8916a', LadyMoon: '#e6e9f4'};
// 头占位：圆心=bake 的 faceCenter（头局部眼高点 .0856，经 localToWorld 含 headScale），
// 半径覆盖发帽超出颅顶极点的余量（A0 实测：profile 颅顶 .229 投影 103px vs 实测发顶 74px，
// 几何下巴尖 271px 被斗篷领口遮挡、可见颌线 197px——故不用 profile 端点做占位边界）
const HEAD_R = {Eileen: .145, Alder: .135, LadyMoon: .14};
const ANCHOR_STYLE = {
  flameAnchor: '#ffcf70', wakeBottle: '#ffe9a8', eyeAnchor: '#7d93b8',
  tearAnchor: '#cfe0f4', chestAnchor: '#b08c3a', clockFace: '#d8d4c8',
};

function seg2(a, b, color, width) {
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.stroke();
}
function disc(p, r, color, fill = true) {
  g.beginPath(); g.arc(p[0], p[1], r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = color; g.fill(); } else { g.strokeStyle = color; g.lineWidth = 2; g.stroke(); }
}

function drawFigure(f, name) {
  const a = f.actors[name];
  if (!a?.visible) return;
  const w = a.world, col = COLORS[name];
  const P = k => w[k] ? proj(w[k]) : null;
  const pelvis = P('pelvis'), root = P('root');
  // 头：圆心=faceCenter（眼高面心），朝向=faceCenter→faceFront（跟随望月抬头）
  const head = P('faceCenter'), faceFront = P('faceFront');
  // 头像素半径：世界半径 HEAD_R 在面心高度再投一次
  const hr = w.faceCenter ? Math.abs(proj([w.faceCenter[0], w.faceCenter[1] + HEAD_R[name], w.faceCenter[2]])[1] - head[1]) : 10;
  // 躯干：骨盆→颈（肩中点），肩线
  const ls = P('leftShoulder'), rs = P('rightShoulder');
  const neck = ls && rs ? [(ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2] : head;
  if (pelvis && neck) seg2(pelvis, neck, col, 16);
  if (pelvis && !neck && root) seg2(root, head, col, 16);
  if (ls && rs) seg2(ls, rs, col, 10);
  // 手臂：肩→肘→手
  for (const side of ['left', 'right']) {
    const s = P(side + 'Shoulder'), e = P(side + 'Elbow'), h = P(side + 'Hand');
    if (s && e) seg2(s, e, col, 8);
    if (e && h) seg2(e, h, col, 7);
    if (!s && h && neck) seg2(neck, h, col, 7); // 不可见拍无 trace 的兜底（不会命中：visible 才有 trace）
    if (h) disc(h, 5, col);
  }
  // 腿：骨盆→脚（占位不画膝；planted=绿圈，非走拍=灰圈）
  for (const side of ['left', 'right']) {
    const foot = P(side + 'Foot');
    if (pelvis && foot) seg2(pelvis, foot, col, 9);
    else if (root && foot) seg2(root, foot, col, 9);
    if (foot) {
      const planted = a.contact?.[side];
      disc(foot, 6, planted === true ? '#7de88a' : '#9aa0ac', false);
    }
  }
  // 头 + 朝向（faceCenter→faceFront 鼻尖线——跟随望月抬头/回眸）
  if (head) {
    disc(head, Math.max(4, hr), col);
    if (faceFront) seg2(head, faceFront, '#ffffff', 3);
  }
  if (!TRANSPARENT && head) {
    g.font = '13px monospace'; g.fillStyle = col; g.textAlign = 'center';
    g.fillText(name, head[0], head[1] - hr - 8);
  }
}

function drawAnchors(f) {
  for (const [k, p] of Object.entries(f.anchors.world)) {
    if (!f.anchors.visible[k]) continue;
    const [x, y] = proj(p);
    g.strokeStyle = ANCHOR_STYLE[k] ?? '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.lineTo(x, y + 6); g.stroke();
    if (!TRANSPARENT) { g.font = '11px monospace'; g.fillStyle = ANCHOR_STYLE[k] ?? '#fff'; g.textAlign = 'left'; g.fillText(k, x + 8, y - 6); }
  }
}

function draw(t) {
  const f = frameAt(t), seg = segAt(t);
  rebuild(f.camera);
  g.clearRect(0, 0, W, H);
  if (!TRANSPARENT) {
    g.fillStyle = '#141a24'; g.fillRect(0, 0, W, H);
    // 地平面参考线（世界 y=0 与相机水平线）辅助读构图
    g.strokeStyle = 'rgba(120,130,150,.25)'; g.lineWidth = 1;
    for (const gx of [-10, -5, 0, 5, 10]) {
      const a = proj([gx, 0, -30]), b = proj([gx, 0, 10]);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    const c = proj([0, 0, -13]); // 钟楼基座参考点
    disc(c, 3, 'rgba(200,200,210,.5)');
    g.font = '16px monospace'; g.fillStyle = '#d8dce6'; g.textAlign = 'left';
    g.fillText(`${seg.id} ${seg.kind} · ${seg.scene}/${seg.shot} · t=${t.toFixed(2)}`, 16, 28);
  }
  drawAnchors(f);
  for (const name of ['LadyMoon', 'Alder', 'Eileen']) drawFigure(f, name); // 夫人最远先画
  return {t, beat: f.beat, scene: f.scene, shot: f.shot};
}

// 必须先 draw 后 toDataURL（先抓图=拿到上一帧画布——A0 翻车实录：m05 骨架整体偏高 74px
// 实为 t=36.5 帧画面贴上了 t=39 的标签）
window.renderAt = t => { const state = draw(t); return {image: canvas.toDataURL('image/png').split(',')[1], state}; };
window.stepAt = t => draw(t);
// 相机重建指纹：重投影 vs bake 时 viewer 活体相机投影，逐关节最大像素差
window.__verify = t => {
  const f = frameAt(t);
  rebuild(f.camera);
  let max = 0, worst = null;
  for (const [name, a] of Object.entries(f.actors))
    for (const [k, p] of Object.entries(a.projected)) {
      if (!p || !a.world[k]) continue;
      const q = proj(a.world[k]);
      const d = Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]));
      if (d > max) { max = d; worst = {actor: name, joint: k, delta: d}; }
    }
  return {t, maxDelta: max, worst};
};
window.checkTimes = [...new Set(shotTable.shots.flatMap(s => [s.start + .15, (s.start + s.end) / 2, s.end - .10])
  .filter(t => t > 0 && t < window.duration))].sort((a, b) => a - b);
window.__motion = motion; // probe 适配器消费（帧数/有限性扫描）
await document.fonts.ready;
window.ready = true;
