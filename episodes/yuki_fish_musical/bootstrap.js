import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import { CharacterRegistry, registerCharacter, registerScene, registerAnimation, registerCameraMove } from 'dula-engine';
import { HomeKitchenScene } from './scenes/HomeKitchenScene.js';
import { AdPose, AdCamera } from './performance.js';
import { buildDanceRig } from './performance_v10.js';

registerAll();

// 干净均匀描线（监制口径：标准 TV 动画赛璐璐描边，不是速写线）。
// sketchify 的 per-vertex 宽度抖动和 overshoot 碎线无法参数关停，这里独立实现：
// 逆向壳法 —— BackSide 克隆顶点沿法线外推固定量，宽度按部件 boundingSphere
// 自适应收缩（同 sketchify 的局部单位处理），无抖动、无 boil、无硬边碎线。
// 只保留轮廓壳；资产里的小部件（瞳孔/眼皮/高光/睫毛等）已由 userData.noSketch 跳过。
function cleanOutline(root, { color = 0x25222a, width = 0.012, minRadius = 0.02 } = {}) {
  root.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.userData.noSketch || obj.userData.stroke || obj.userData.sketchLine || obj.userData.cleanOutline) return;
    const geo = obj.geometry;
    const pos = geo.attributes.position;
    if (!pos) return;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.computeBoundingSphere?.();
    const radius = geo.boundingSphere ? geo.boundingSphere.radius : 1;
    if (radius < minRadius) return;
    const w = Math.min(width, radius * 0.3);
    const norm = geo.attributes.normal;
    const p = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p[i * 3] = pos.getX(i) + norm.getX(i) * w;
      p[i * 3 + 1] = pos.getY(i) + norm.getY(i) * w;
      p[i * 3 + 2] = pos.getZ(i) + norm.getZ(i) * w;
    }
    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    if (geo.index) hullGeo.setIndex(geo.index.clone());
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
    hull.userData.cleanOutline = true;
    hull.frustumCulled = false;
    obj.add(hull);
  });
}

// Cel-look (dula-skills/cel-look): hard 2-3-step toon gradient instead of the
// asset's soft 4-step one — cel shading is "base color + one shadow band".
const celGradient = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 3; canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#7f7f7f'; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#c9c9c9'; ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 0, 1, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
})();
function hardenToon(root, deepen = null) {
  const materials = new Map();
  root.traverse(object => {
    if (!object.isMesh) return;
    const old = object.material;
    const isToon = old?.isMeshToonMaterial, isStd = old?.isMeshStandardMaterial;
    if (!isToon && !isStd) return;
    if (!materials.has(old)) {
      const color = old.color.clone();
      if (deepen && color.getHex() === deepen.from) color.setHex(deepen.to);
      materials.set(old, new THREE.MeshToonMaterial({
        color, gradientMap: celGradient, flatShading: !!old.flatShading,
        transparent: old.transparent, opacity: old.opacity, side: old.side,
      }));
    }
    object.material = materials.get(old);
  });
}

// 手型集（cel-look/character-modeler 纪律的首次实施）：连指手套为默认手型，
// 另加 fist/open/point/hold/wave 五个固定手型。全部挂在舞蹈 IK 前臂(lower)
// 末端同一锚点（y=-0.18），visible 切换、不做渐变；原球手保留为不可见的位置
// 锚点（handClearance/手势投影读它的世界坐标），枢轴契约不动。
// 手掌局部坐标：前臂沿 -Y，掌心朝 +Z，拇指在内侧（-side 方向）。
function buildHandPoses(c) {
  const skin = new THREE.MeshToonMaterial({ color: 0xffe3d0, gradientMap: celGradient });
  const mesh = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, skin);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
    m.castShadow = true;
    return m;
  };
  const palmGeo = new THREE.CapsuleGeometry(0.043, 0.048, 4, 12);
  const thumbGeo = new THREE.CapsuleGeometry(0.015, 0.030, 4, 8);
  const fingerGeo = new THREE.CapsuleGeometry(0.0115, 0.034, 4, 8);
  const knuckleGeo = new THREE.CapsuleGeometry(0.026, 0.058, 4, 10);
  const indexGeo = new THREE.CapsuleGeometry(0.013, 0.052, 4, 10);

  function palm(group, sx, sy, sz, rx = 0) {
    group.add(mesh(palmGeo, 0, -0.038, 0.004, rx, 0, 0, sx, sy, sz));
  }
  function thumb(group, side, x, y, z, rz, rx = -0.35) {
    group.add(mesh(thumbGeo, side * x, y, z, rx, 0, side * rz));
  }
  function fingers(group, fan, curl, spreadX) {
    for (let i = 0; i < 4; i++) {
      const o = i - 1.5;
      group.add(mesh(fingerGeo, o * spreadX, -0.092, 0.006, curl, 0, o * fan));
    }
  }
  const builders = {
    // 连指手套（默认）：压扁胶囊手掌 + 拇指楔形
    mitten(side) {
      const g = new THREE.Group();
      palm(g, 0.92, 1, 0.48);
      thumb(g, -side, 0.040, -0.020, 0.016, -0.85);
      return g;
    },
    // 握拳：手掌卷收，指节卷起一条，拇指压外侧
    fist(side) {
      const g = new THREE.Group();
      palm(g, 0.95, 0.78, 0.55, 0.35);
      g.add(mesh(knuckleGeo, 0, -0.082, 0.026, 0, 0, Math.PI / 2)); // 指节卷
      thumb(g, -side, 0.020, -0.048, 0.046, -1.30, -0.15);
      return g;
    },
    // 张开：手掌压扁，四指微张
    open(side) {
      const g = new THREE.Group();
      palm(g, 0.92, 1, 0.42);
      fingers(g, 0.10, -0.06, 0.020);
      thumb(g, -side, 0.042, -0.022, 0.014, -0.95);
      return g;
    },
    // 指认：握拳基底 + 食指沿前臂轴指出
    point(side) {
      const g = new THREE.Group();
      palm(g, 0.95, 0.78, 0.55, 0.35);
      g.add(mesh(knuckleGeo, -side * 0.012, -0.082, 0.024, 0, 0, Math.PI / 2));
      g.add(mesh(indexGeo, side * 0.018, -0.128, 0.012, -0.28, 0, side * 0.06)); // 食指
      thumb(g, -side, 0.026, -0.040, 0.040, -1.15, -0.15);
      return g;
    },
    // 半握持物：四指半屈，拇指对掌
    hold(side) {
      const g = new THREE.Group();
      palm(g, 0.92, 0.92, 0.46, 0.15);
      fingers(g, 0.05, -0.75, 0.019);
      thumb(g, -side, 0.036, -0.030, 0.026, -0.70, -0.55);
      return g;
    },
    // 张开微展（挥手/亮相）：指扇更开，拇指展开
    wave(side) {
      const g = new THREE.Group();
      palm(g, 0.95, 1, 0.40);
      fingers(g, 0.17, -0.04, 0.021);
      thumb(g, -side, 0.045, -0.018, 0.016, -1.15);
      return g;
    },
  };
  c.handPoses = {};
  for (const side of [-1, 1]) {
    const limb = c.danceRig.limbs[side < 0 ? 'leftArm' : 'rightArm'];
    limb.hand.visible = false; // ball hand stays as the invisible wrist anchor
    const set = {};
    for (const [name, build] of Object.entries(builders)) {
      const g = build(side);
      g.position.y = -0.18; // same forearm-end anchor as the old ball hand
      g.visible = name === 'mitten';
      limb.lower.add(g);
      set[name] = g;
    }
    c.handPoses[side < 0 ? 'left' : 'right'] = set;
  }
}

// 手型切换：同一帧跳变（一拍二网格），默认回落 mitten。
export function setHandPose(c, side, name) {
  const set = c.handPoses?.[side];
  if (!set) return;
  for (const [k, g] of Object.entries(set)) g.visible = k === name;
}

const BaseYuki = CharacterRegistry.Yuki;
class StudioYuki extends BaseYuki {
  build() {
    super.build();
    // The asset exposes pupils and lids, but not whole-eye group handles.
    this.leftEye = this.leftPupil.parent;
    this.rightEye = this.rightPupil.parent;
    this.leftEye.userData.adBaseScaleY = this.leftEye.scale.y;
    // Build the dance rig BEFORE the outline pass so the IK arm/leg segments
    // and all six hand poses carry outlines too (the rig is otherwise created
    // lazily, after the pass). The asset already marks pupils / eyelids /
    // catchlights / brows / lashes userData.noSketch.
    buildDanceRig(this);
    buildHandPoses(this);
    this.danceRig.headset.traverse(o => { o.userData.noSketch = true; });
    hardenToon(this.mesh);
    cleanOutline(this.mesh, { color: 0x25222a, width: 0.012 });
  }
  update(time, delta) {
    super.update(time, delta);
  }
}
registerCharacter('Yuki', StudioYuki);

// StudioMochi: eye-group handles for the shared AdPose writes (pupil parents),
// cel-look hard toon gradient (fur kept deep orange), clean uniform outline
// (close-up width tier). Cat paws are mitten-shaped already — kept as-is.
const BaseMochi = CharacterRegistry.Mochi;
if (BaseMochi) {
  class StudioMochi extends BaseMochi {
    build() {
      super.build();
      this.leftEye = this.leftPupil.parent;
      this.rightEye = this.rightPupil.parent;
      this.leftEye.userData.adBaseScaleY = this.leftEye.scale.y;
      this.rightEye.userData.adBaseScaleY = this.rightEye.scale.y;
      hardenToon(this.mesh, { from: 0xe8a050, to: 0xd98a3c });
      cleanOutline(this.mesh, { color: 0x25222a, width: 0.006 });
    }
  }
  registerCharacter('Mochi', StudioMochi);
}
registerScene('HomeKitchenScene', HomeKitchenScene);
registerAnimation('AdPose', AdPose);
registerCameraMove('AdCamera', AdCamera);
