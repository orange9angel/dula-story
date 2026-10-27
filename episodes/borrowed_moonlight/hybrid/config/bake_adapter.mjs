// 《借走月光的女孩》cel-cinema 全片 bake 适配器（draw-over-pipeline-v1）。
// 在源 viewer 页面上下文执行（pipeline.mjs page.evaluate）：先 stepAt(t) 驱动当帧
// （(t,state) 纯函数，顺序/seek 同源），再从 window.__dbg 活体对象树读世界坐标。
// 采集：三角色 根/头/肩/肘/双手/双脚/骨盆 世界坐标+同帧像素投影+yaw+planted 接触、
// 相机 position/quaternion/fov、粒子发射器活体锚点（effects/magic.js fx.anchors）。
// 纪律：capture 内禁止 new 页面外对象——全部用现有 Vector3.clone() 派生（s1e2 适配器同款）。
export function capture(t, context) {
  const trace = window.stepAt(t);
  const {actors, camera, anchors} = window.__dbg;
  camera.updateMatrixWorld(true);
  const W = context.width, H = context.height;
  const r5 = x => Number(x.toFixed(5)), r3 = x => Number(x.toFixed(3)), r6 = x => Number(x.toFixed(6)), r8 = x => Number(x.toFixed(8));
  const vec = () => camera.position.clone(); // 零分配 scratch（clone 出自页面内 Vector3）
  const arr = v => [r5(v.x), r5(v.y), r5(v.z)];
  const project = v => {
    // 只保留构图窗口内（NDC |x|,|y|<=2，即画幅 2 倍过扫描）且远离相机奇点的投影；
    // 远画外/近平面点的投影对相机参数亚微量级超敏（像素差被放大到数百 px），
    // 且不参与构图——记 null=不可投影，指纹比对跳过（NOTES A0 翻车实录）
    const lv = v.clone().applyMatrix4(camera.matrixWorldInverse);
    if (lv.z >= -0.1) return null;
    const p = v.clone().project(camera);
    if (Math.abs(p.x) > 2 || Math.abs(p.y) > 2) return null;
    return [r3((p.x + 1) * W / 2), r3((1 - p.y) * H / 2)];
  };
  const cast = {};
  for (const [name, g] of Object.entries(actors)) {
    const a = g.userData.actor;
    const points = {
      root: g.getWorldPosition(vec()),
      head: a.headGroup.getWorldPosition(vec()),
      // 眼高面心/面前点：头局部 UV 约定量程（三角色共享 paintFace eyeY=246 → y=.0856），
      // localToWorld 自动含 headScale——占位头圆心与朝向用（chin/skull 点被领口遮挡且发帽超颅顶，实测不可靠）
      faceCenter: a.headGroup.localToWorld(vec().set(0, .0856, 0)),
      faceFront: a.headGroup.localToWorld(vec().set(0, .0856, .30)),
      leftHand: a.hands.left.getWorldPosition(vec()),
      rightHand: a.hands.right.getWorldPosition(vec()),
      leftFoot: a.feet.left.getWorldPosition(vec()),
      rightFoot: a.feet.right.getWorldPosition(vec()),
    };
    // 肩/肘/骨盆取自 performAt emitTrace 的世界坐标（与接触探针同源）；
    // 不可见角色当帧不跑表演谱 → 无 trace，记 null（不等于穿模/接触失败）
    const arms = trace.contact?.arms?.[name], torso = trace.contact?.torsoAxis?.[name];
    for (const side of ['left', 'right']) {
      points[side + 'Shoulder'] = arms ? vec().fromArray(arms[side][0]) : null;
      points[side + 'Elbow'] = arms ? vec().fromArray(arms[side][1]) : null;
    }
    points.pelvis = torso ? vec().fromArray(torso[0]) : null;
    const world = {}, projected = {};
    for (const [k, v] of Object.entries(points)) {
      world[k] = v ? arr(v) : null;
      projected[k] = v ? project(v) : null;
    }
    cast[name] = {
      visible: g.visible === true,
      root: arr(points.root),
      yaw: r6(g.rotation.y),
      // 头世界四元数：headYaw/Pitch/Roll 驱动——占位头心/朝向与后续 raster-face 都需要真头向
      headQuat: a.headGroup.getWorldQuaternion(camera.quaternion.clone()).toArray().map(r8),
      world, projected,
      // planted：走拍 walkingFeet 的 stance；非走拍=源无接触元数据（null 不是通过）
      contact: Object.fromEntries(['left', 'right'].map(s => [s, trace.locomotion?.[name]?.feet?.[s]?.stance ?? null])),
    };
  }
  const anchorVisible = {
    flameAnchor: actors.Eileen.userData.flame.visible === true,       // LAMP_OUT→RELIGHT 熄灭窗
    wakeBottle: actors.Eileen.userData.bottle.visible === true,       // 抱瓶拍才显形
    eyeAnchor: actors.Eileen.visible === true,
    tearAnchor: actors.LadyMoon.visible === true,
    chestAnchor: actors.Alder.visible === true,
    clockFace: true,                                                   // 钟面静件，锚点恒定
  };
  const anchorPos = {};
  for (const [k, o] of Object.entries(anchors)) anchorPos[k] = arr(o.getWorldPosition(vec()));
  return {
    beat: trace.beat, scene: trace.scene, shot: trace.shot, lampLit: trace.lampLit,
    actors: cast,
    anchors: {world: anchorPos, visible: anchorVisible},
    camera: {
      position: camera.position.toArray().map(r8),
      quaternion: camera.quaternion.toArray().map(r8),
      fov: r8(camera.fov),
    },
  };
}
