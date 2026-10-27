// cel-cinema 粒子 3D 层重宿主（A3）：3D 集 effects/magic.js 的 20 套粒子系统
// 不改一帧参数地搬进二维合成页——发射器锚点从活体对象换成 bake（motion_full.json）
// 逐帧世界坐标（fn 锚点），静态场景件（星阶/瓶阵/窗/天窗/月轮/塔）用
// config/static_anchors.json 一次性快照（capture_static_anchors.mjs，t=1/470 零漂移验证）。
// 相机用 bake 的 position/quaternion/fov 逐帧重建（PerspectiveCamera），
// 绝对时钟 + LCG 种子原样保留 → 顺序/seek 天然一致。
// 合成纪律：发光粒子层整体以 'lighter' 叠到二维画面（3D 版 additive 语义的外推；
// 本集粒子全是发光点精灵，无烟层——若未来接入烟类系统需拆层普通 alpha，见
// draw-over-animation/references/executable-pipeline.md 粒子与场景接合）。
// 已知边界：无场景几何 → 无深度遮挡（depthTest 无对象可测）；遮挡评价见 NOTES A3。
import * as THREE from 'three';
import {assembleMagicFX} from '../effects/magic.js';

export function createRehostedFX({motion, statics, TL, width, height}){
  const FPS = motion.fps;
  const frameAt = t => motion.frames[Math.max(0, Math.min(motion.frames.length - 1, Math.round((t - motion.start) * FPS)))];
  // fn 锚点：从 bake 帧读世界坐标（绝对时间纯函数，seek 安全）
  const baked = getter => {
    const fn = (t, out) => { const p = getter(frameAt(t)); return out.set(p[0], p[1], p[2]); };
    return fn;
  };
  const anchors = {
    flameAnchor: baked(f => f.anchors.world.flameAnchor),
    eyeAnchor:   baked(f => f.anchors.world.eyeAnchor),
    tearAnchor:  baked(f => f.anchors.world.tearAnchor),
    chestAnchor: baked(f => f.anchors.world.chestAnchor),
    wakeBottle:  baked(f => f.anchors.world.wakeBottle),
    clockFace:   baked(f => f.anchors.world.clockFace),
    eileenHead:  baked(f => f.actors.Eileen.world.head ?? f.actors.Eileen.root),
    eileenRoot:  baked(f => f.actors.Eileen.root),
    ladyRoot:    baked(f => f.actors.LadyMoon.root),
  };
  const scenes = {};
  for (const k of ['snowtown', 'clocktower', 'towertop', 'moonpalace']) scenes[k] = {scene: new THREE.Scene()};
  const staticObj = p => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); o.updateMatrixWorld(true); return o; };
  const world = {
    scenes, anchors,
    statics: {
      skylight: statics.skylight ? new THREE.Vector3(...statics.skylight) : null,
      steps: statics.steps.map(p => new THREE.Vector3(...p)),
      step0Anchor: staticObj(statics.steps[0]),
      bottles: statics.bottles.map(p => new THREE.Vector3(...p)),
      windows: statics.windows.map(p => new THREE.Vector3(...p)),
      moonSnow: staticObj(statics.moonSnow), moonTower: staticObj(statics.moonTower),
      tower: staticObj(statics.tower),
      petalHand: null, // 2D 模式不建花瓣实体（mode 守护，不会读到）
    },
  };
  const fx = assembleMagicFX({TL, world, mode: '2d'});
  const cam = new THREE.PerspectiveCamera(44, width / height, .05, 200);
  // update：按 bake 帧重建相机并驱动当帧粒子（fx.update 内部按场景键取系统组）
  function update(t){
    const f = frameAt(t);
    cam.position.fromArray(f.camera.position);
    cam.quaternion.fromArray(f.camera.quaternion);
    cam.fov = f.camera.fov;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    fx.update(t, {scene: f.scene}, cam);
    return f.scene;
  }
  // draw：渲染当帧场景键的粒子场景并 'lighter' 叠到 2D 上下文
  function draw(ctx, t, renderer){
    const key = update(t);
    const scene = scenes[key]?.scene;
    if (!scene) return {scene: key, systems: 0};
    renderer.render(scene, cam);
    renderer.render(scene, cam); // 双渲染沉淀（viewer 同纪律：首渲染 GPU 资源滞后）
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(renderer.domElement, 0, 0); ctx.restore();
    const systems = fx.director.systems.get(key) ?? [];
    return {scene: key, systems: systems.length, visible: systems.filter(s => s.points.visible).length};
  }
  return {draw, update, fx, cam, frameAt};
}
