// T3 probe：渲染实测断言。adapter.probe 被序列化进页面执行，只用 window.__art。
export function probe() {
  const art = window.__art;
  const checks = [];
  const add = (name, passed, detail) => checks.push({ name, passed: !!passed, detail });

  add('missingAssets=0', art.missingAssets.length === 0, [...new Set(art.missingAssets)]);

  // 画幅覆盖：每个非插入镜的首/中/末，底图变换后必须盖满 1280x720
  let coverageOK = true, bad = [];
  for (let t = 1; t < 480; t += 3.7) {
    const st = art.state(t);
    if (!st.plate) continue;
    const c = st.coverage;
    if (!(c[0] <= 0.5 && c[1] <= 0.5 && c[2] >= 1279.5 && c[3] >= 719.5)) {
      coverageOK = false; bad.push({ t, c });
    }
  }
  add('plate_coverage', coverageOK, bad.slice(0, 5));

  // M-07 在位：凡 staging 有 m07 的镜，抽样 body 必须在画幅内且高度合理
  let bodyOK = true, bbad = [];
  for (let t = 19; t < 474; t += 4.3) {
    const st = art.state(t);
    if (st.kind === 'eye_insert') continue;
    if (!st.body) continue;
    const b = st.body;
    if (!(b.alpha > 0.05 && b.h > 30 && b.h < 900 && b.x > -200 && b.x < 1480 && (b.y - b.h) < 720 && b.y > 60)) {
      bodyOK = false; bbad.push({ t, b });
    }
  }
  add('m07_in_frame', bodyOK, bbad.slice(0, 5));

  // seek 一致：乱序重复渲染同帧像素等
  let seekOK = true;
  for (const t of [477.2, 233.3, 96.5, 367.5, 5.5, 300.1]) {
    if (!art.seekPair(t)) { seekOK = false; }
  }
  add('seek_determinism', seekOK);

  return { passed: checks.every(c => c.passed), checks };
}
