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
import {ParticleSystem,clamp} from '../effects/particles.js';

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

  // ═══ R2 环境动态补齐（3D scenes/*.js update(t) 的环境件 → 2D 重宿主）═══
  // 绝对时钟 + LCG 种子，seek 天然一致；包络与场景 update 逐式对齐。
  // 对照：S01 落雪/花瓣（场景 snow/petals 600 点飘落）、S02 齿轮区微尘+琥珀呼吸、
  // S03 星阶金尘缓升（m31+）、S04 银粉缓沉。落雪"落地前化蓝色光点"由 magic.js 既有
  // 雪化蓝光点系统承担（A3 已重宿主）。
  const finK = t => t < 456 ? 1 : Math.max(0, 1 - (t - 456) / 7);
  const morphK = t => clamp((t - 400) / 6);
  const wakeK = t => t < 156 ? 0 : Math.min(1, (t - 156) / 22);
  const palDimK = t => t < 317 ? 1 : Math.max(.22, 1 - (t - 317) / 9);
  const palGlowK = t => t < 369 ? 0 : Math.min(1, (t - 369) / 6);
  const envSys = {};
  // S01 落雪：小而疏、竖直下落取模回绕+水平微漂（场景 drift 同式）；m54 空中转粉渐隐
  envSys.snow = fx.director.add('snowtown', new ParticleSystem(scenes.snowtown.scene, {count: 240, seed: 71,
    build: (i, rnd) => { const x = -22 + rnd() * 44, z = -26 + rnd() * 32, off = rnd() * 24, ph = rnd() * 6.28; return {
      t0: 0, t1: 1e9,
      pos: (u, t, out) => out.set(x + Math.sin(t * .6 + ph) * .35, 24 - ((off + t * .9) % 24), z),
      size: () => .06,
      alpha: (u, t) => { const y = 24 - ((off + t * .9) % 24);
        if (t >= 422 || y < .7) return 0; // 春皮让位；落地前消失（化蓝光点=既有系统）
        return .55 * (1 - morphK(t)) * finK(t); },
      color: (u, t) => { const m = morphK(t); return [.91 + .09 * m, .94 - .09 * m, .98 - .10 * m]; } }; } }));
  // S01/S05 花瓣：m54 转化窗渐入、春皮常驻（场景 petals 同式，更慢更飘）
  envSys.petals = fx.director.add('snowtown', new ParticleSystem(scenes.snowtown.scene, {count: 150, seed: 72,
    build: (i, rnd) => { const x = -22 + rnd() * 44, z = -26 + rnd() * 32, off = rnd() * 24, ph = rnd() * 6.28; return {
      t0: 0, t1: 1e9,
      pos: (u, t, out) => out.set(x + Math.sin(t * .5 + ph) * .9 + Math.sin(t * 1.7 + ph) * .3, 24 - ((off + t * .55) % 24), z),
      size: () => .075,
      alpha: (u, t) => { const y = 24 - ((off + t * .55) % 24); const spring = t >= 422;
        if (y < .5 || (!spring && morphK(t) <= 0)) return 0;
        return .6 * (spring ? 1 : morphK(t)) * finK(t); },
      color: [1, .80, .88] }; } }));
  // S02 齿轮区环境微尘（暖光锥内缓浮，星醒后略增；3D 场景无独立微尘件，R2 按监制令补）
  envSys.dustWork = fx.director.add('clocktower', new ParticleSystem(scenes.clocktower.scene, {count: 90, seed: 73,
    build: (i, rnd) => { const x = -4 + rnd() * 8, y = .4 + rnd() * 6.5, z = -7 + rnd() * 6, ph = rnd() * 6.28, sp = .04 + rnd() * .05; return {
      t0: 0, t1: 1e9,
      pos: (u, t, out) => out.set(x + Math.sin(t * .21 + ph) * .3, y + Math.sin(t * .13 + ph) * .5 + ((t * sp) % 2) - 1, z + Math.cos(t * .17 + ph) * .25),
      size: () => .018,
      alpha: (u, t) => .16 * (.55 + .45 * Math.sin(t * .4 + ph * 2)) * (.5 + .5 * wakeK(t)),
      color: [1, .85, .55] }; } }));
  // S04 银粉缓降（场景 dust 同式：失光段加速下沉、亮度随月光衰减、泪碎后回暖）
  envSys.dustPalace = fx.director.add('moonpalace', new ParticleSystem(scenes.moonpalace.scene, {count: 130, seed: 74,
    build: (i, rnd) => { const x = -9 + rnd() * 18, z = -13 + rnd() * 14, off = rnd() * 12, k = 1 + (i % 3); return {
      t0: 0, t1: 1e9,
      pos: (u, t, out) => { const dist = (Math.min(t, 325) * .05 + Math.max(0, t - 325) * .14) * k;
        const y = (12 - off - dist) % 12; return out.set(x, y < 0 ? y + 12 : y, z); },
      size: () => .04,
      alpha: (u, t) => .42 * (.4 + .6 * palDimK(t)) + .2 * palGlowK(t),
      color: [.74, .82, .91] }; } }));
  // S03 星阶金尘缓升（场景 sparks 同式，m31 群星升起后出现）
  envSys.sparks = fx.director.add('towertop', new ParticleSystem(scenes.towertop.scene, {count: 44, seed: 75,
    build: (i, rnd) => { const x = -7 + rnd() * 14, z = -15 + rnd() * 12, off = rnd() * 22, k = 1 + (i % 3); return {
      t0: 227, t1: 1e9,
      pos: (u, t, out) => out.set(x, (off + t * .18 * k) % 22, z),
      size: () => .045,
      alpha: (u, t) => t < 227 ? 0 : .4 * (.6 + .4 * Math.sin(t * .9 + i)),
      color: [1, .82, .45] }; } }));
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
    return {scene: key, systems: systems.length, visible: systems.filter(s => s.points.visible).length,
      env: Object.fromEntries(Object.entries(envSys).map(([k, s]) => [k, s.points.visible]))};
  }
  return {draw, update, fx, cam, frameAt};
}
