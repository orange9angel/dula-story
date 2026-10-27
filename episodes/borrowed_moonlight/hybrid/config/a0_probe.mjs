// A0 运动数据探针（pipeline --step probe，在 art_pass_a0 原型页上下文执行）。
// 断：帧数/有限性/相机重建指纹/可见性与 planted 接触取样——全绿才算 bake 可信。
export function probe() {
  const motion = window.__motion;
  if (!motion) return {passed: false, error: 'motion not loaded'};
  const report = {passed: false, checks: {}};
  const fps = motion.fps, expect = Math.round((motion.end - motion.start) * fps) + 1;

  // 1) 帧数与 schema
  report.checks.frameCount = {expect, actual: motion.frames.length, ok: motion.frames.length === expect};

  // 2) 全帧有限性扫描（世界坐标/相机/锚点——pipeline bake 已断过一遍，这里复核落盘数据）
  let bad = null;
  const fin = v => typeof v !== 'number' || Number.isFinite(v);
  outer:
  for (let i = 0; i < motion.frames.length; i++) {
    const f = motion.frames[i];
    const flat = [];
    for (const a of Object.values(f.actors)) {
      flat.push(...a.root, a.yaw);
      for (const p of Object.values(a.world)) if (p) flat.push(...p);
      for (const p of Object.values(a.projected)) if (p) flat.push(...p);
    }
    flat.push(...f.camera.position, ...f.camera.quaternion, f.camera.fov);
    for (const p of Object.values(f.anchors.world)) flat.push(...p);
    for (const v of flat) if (!fin(v)) { bad = {frame: i}; break outer; }
  }
  report.checks.finite = {ok: !bad, ...(bad ?? {})};

  // 3) 相机重建指纹：重投影 vs bake 投影（每 150 帧 + m05/m15 代表帧），阈 0.05px
  const sampleIdx = [];
  for (let i = 0; i < motion.frames.length; i += 150) sampleIdx.push(i);
  for (const t of [36.5, 39, 42, 110.5, 113, 116]) sampleIdx.push(Math.round(t * fps));
  let maxDelta = 0, worst = null;
  for (const i of sampleIdx) {
    const r = window.__verify(motion.start + i / fps);
    if (r.maxDelta > maxDelta) { maxDelta = r.maxDelta; worst = {frame: i, ...r.worst}; }
  }
  report.checks.cameraFingerprint = {ok: maxDelta < .05, maxDelta, worst, samples: sampleIdx.length};

  // 4) 相机参数域（ANCHORS fov 16..68）
  const fovs = sampleIdx.map(i => motion.frames[i].camera.fov);
  report.checks.fovRange = {ok: fovs.every(f => f >= 15.9 && f <= 68.1), min: Math.min(...fovs), max: Math.max(...fovs)};

  // 5) 可见性取样（staging 契约）：m05 艾琳可见、m15 艾琳+奥尔德可见、m39 夫人可见、m01 全不可见
  const at = t => motion.frames[Math.round(t * fps)];
  const vis = (t, name) => at(t).actors[name].visible === true;
  report.checks.staging = {
    ok: vis(39, 'Eileen') && !vis(39, 'Alder') && vis(113, 'Eileen') && vis(113, 'Alder')
      && vis(290, 'LadyMoon') && !vis(290, 'Alder') && !vis(5, 'Eileen') && !vis(5, 'LadyMoon'),
    m05: {Eileen: vis(39, 'Eileen'), Alder: vis(39, 'Alder')},
    m15: {Eileen: vis(113, 'Eileen'), Alder: vis(113, 'Alder')},
    m39: {LadyMoon: vis(290, 'LadyMoon')},
    m01: {Eileen: vis(5, 'Eileen'), LadyMoon: vis(5, 'LadyMoon')},
  };

  // 6) planted 接触：走拍（m04 中点 t=31、m18 迈步 t=133）双脚 stance 必为布尔；站桩拍（m05 t=39）为 null
  const contact = (t, name) => at(t).actors[name].contact;
  const cWalk = contact(31, 'Eileen'), cStep = contact(133, 'Eileen'), cStand = contact(39, 'Eileen');
  const boolPair = c => typeof c?.left === 'boolean' && typeof c?.right === 'boolean';
  report.checks.planted = {
    ok: boolPair(cWalk) && boolPair(cStep) && cStand.left === null && cStand.right === null,
    m04_t31: cWalk, m18_t133: cStep, m05_t39: cStand,
  };

  report.passed = Object.values(report.checks).every(c => c.ok);
  return report;
}
