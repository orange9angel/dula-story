import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import { CharacterRegistry, registerCharacter, registerScene, registerAnimation, registerCameraMove, sketchify, BoilSystem } from 'dula-engine';
import { HomeKitchenScene } from './scenes/HomeKitchenScene.js';
import { AdPose, AdCamera } from './performance.js';
import { buildDanceRig } from './performance_v10.js';

registerAll();

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

// 连指手套手（cel-look/character-modeler 纪律：球手是硬伤）。压扁胶囊手掌 +
// 拇指楔形，挂在舞蹈 IK 前臂(lower)末端；球手保留为不可见的位置锚点
// （handClearance/手势投影读它的世界坐标），枢轴契约不动。
function mittenize(c) {
  const skin = new THREE.MeshToonMaterial({ color: 0xffe3d0, gradientMap: celGradient });
  for (const side of [-1, 1]) {
    const limb = c.danceRig.limbs[side < 0 ? 'leftArm' : 'rightArm'];
    limb.hand.visible = false; // ball hand stays as the invisible wrist anchor
    const mitten = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, 0.048, 4, 12), skin);
    palm.scale.set(0.92, 1, 0.48);
    palm.position.set(0, -0.038, 0.004);
    palm.castShadow = true;
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.030, 4, 8), skin);
    thumb.position.set(-side * 0.040, -0.020, 0.016);
    thumb.rotation.z = -side * 0.85;
    thumb.rotation.x = -0.35;
    thumb.castShadow = true;
    mitten.add(palm, thumb);
    mitten.position.y = -0.18; // same forearm-end anchor as the old ball hand
    limb.lower.add(mitten);
  }
}

const BaseYuki = CharacterRegistry.Yuki;
class StudioYuki extends BaseYuki {
  build() {
    super.build();
    // The asset exposes pupils and lids, but not whole-eye group handles.
    this.leftEye = this.leftPupil.parent;
    this.rightEye = this.rightPupil.parent;
    this.leftEye.userData.adBaseScaleY = this.leftEye.scale.y;
    // Build the dance rig BEFORE sketchify so the IK arm/leg segments and the
    // mitten hands carry ink lines too (the rig is otherwise created lazily,
    // after the outline pass). The asset already marks pupils / eyelids /
    // catchlights / brows / lashes userData.noSketch.
    buildDanceRig(this);
    mittenize(this);
    this.danceRig.headset.traverse(o => { o.userData.noSketch = true; });
    hardenToon(this.mesh);
    sketchify(this.mesh, { color: 0x25222a, width: 0.012, threshold: 40, seed: 11 });
    BoilSystem.add(this.mesh, { amplitude: 0.0015, fps: 12 });
  }
  update(time, delta) {
    super.update(time, delta);
    BoilSystem.update(time); // tick-seeded from storyboard time: deterministic
  }
}
registerCharacter('Yuki', StudioYuki);

// StudioMochi: eye-group handles for the shared AdPose writes (pupil parents),
// cel-look hard toon gradient (fur kept deep orange), sketchify ink + 12fps
// boil. Cat paws are mitten-shaped already — kept as-is.
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
      sketchify(this.mesh, { color: 0x2a2320, width: 0.006, threshold: 40, seed: 23 });
      BoilSystem.add(this.mesh, { amplitude: 0.0012, fps: 12 });
    }
    update(time, delta) {
      super.update(time, delta);
      BoilSystem.update(time);
    }
  }
  registerCharacter('Mochi', StudioMochi);
}
registerScene('HomeKitchenScene', HomeKitchenScene);
registerAnimation('AdPose', AdPose);
registerCameraMove('AdCamera', AdCamera);
