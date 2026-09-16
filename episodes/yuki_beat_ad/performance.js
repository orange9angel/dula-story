import * as THREE from 'three';
import { AnimationBase, CameraMoveBase } from 'dula-engine';

const TAU = Math.PI * 2;
const ease = t => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export class AdPose extends AnimationBase {
  constructor(options = {}) {
    super('AdPose', options.duration ?? 1.6);
    this.options = options;
    this.tags = { requires: ['headGroup', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], suits: ['humanoid'] };
  }
  update(p, c) {
    const pose = this.options.pose ?? 'hello';
    const seconds = p * this.duration;
    const beat = seconds * Number(this.options.bpm ?? 150) / 60;
    const swing = Math.sin(beat * Math.PI);
    // Lift between beats and land on every drum hit.
    const pulse = Math.pow(Math.sin((beat % 1) * Math.PI), 2);
    c.mesh.userData.adPose = pose;
    c.mesh.userData.adProgress = p;
    c.mesh.rotation.set(0, 0, 0);
    c.mesh.position.y = -0.03 + 0.025 * pulse;
    c.headGroup.rotation.set(0.02 * swing, 0.08 * swing, -0.035 * swing);
    c.leftArm.rotation.set(0.05 * swing, 0, -0.38);
    c.rightArm.rotation.set(-0.05 * swing, 0, 0.38);
    c.leftLeg.rotation.set(0, 0, 0);
    c.rightLeg.rotation.set(0, 0, 0);
    if (pose === 'hello') {
      c.rightArm.rotation.z = 2.0 + 0.25 * Math.sin(beat * TAU);
      c.rightArm.rotation.x = -0.8;
      c.mesh.rotation.y = -0.15 + 0.15 * ease(p);
      c.headGroup.rotation.z = -0.10;
    } else if (pose === 'step') {
      c.leftLeg.rotation.x = 0.25 * swing;
      c.rightLeg.rotation.x = -0.25 * swing;
      c.leftArm.rotation.x = -0.65 * swing;
      c.rightArm.rotation.x = 0.65 * swing;
      c.mesh.rotation.y = 0.16 * swing;
    } else if (pose === 'swing') {
      c.leftArm.rotation.z = -0.9 - 0.4 * swing;
      c.rightArm.rotation.z = 0.9 + 0.4 * swing;
      c.mesh.rotation.y = 0.25 * swing;
      c.headGroup.rotation.z = -0.09 * swing;
    } else if (pose === 'turn') {
      c.mesh.rotation.y = TAU * ease(p);
      c.leftArm.rotation.z = -1.0;
      c.rightArm.rotation.z = 1.0;
      c.mesh.position.y = -0.03 + 0.05 * Math.sin(p * Math.PI);
    } else if (pose === 'pop') {
      c.leftArm.rotation.z = -1.55 - 0.2 * pulse;
      c.rightArm.rotation.z = 1.55 + 0.2 * pulse;
      c.mesh.position.y = -0.03 + 0.12 * pulse;
      c.leftLeg.rotation.z = -0.12 * pulse;
      c.rightLeg.rotation.z = 0.12 * pulse;
    } else if (pose === 'wink') {
      c.mesh.rotation.y = -0.12;
      c.headGroup.rotation.z = 0.10;
      c.rightArm.rotation.z = 1.75 + 0.10 * swing;
      c.rightArm.rotation.x = -0.7;
      // Deterministic one-beat blink, on the existing eye group; no generated face.
      const blink = 1 - 0.94 * Math.sin(Math.PI * THREE.MathUtils.clamp((p - 0.2) / 0.25, 0, 1));
      c.leftEye.scale.y = c.leftEye.userData.adBaseScaleY * (p > 0.2 && p < 0.45 ? blink : 1);
    } else if (pose === 'finale') {
      c.mesh.rotation.y = -0.12;
      c.leftArm.rotation.z = -0.65;
      c.rightArm.rotation.z = 1.9 + (p < 0.5 ? 0.18 * Math.sin(beat * TAU) : 0);
      c.rightArm.rotation.x = -0.7;
      c.headGroup.rotation.z = -0.09;
      if (p >= 0.5) c.mesh.position.y = -0.03;
    }
    if (pose !== 'wink') c.leftEye.scale.y = c.leftEye.userData.adBaseScaleY;
  }
}

export class AdCamera extends CameraMoveBase {
  constructor(options = {}) { super(options); this.options = options; }
  update(p, camera) {
    const shot = this.options.shot ?? 'hello';
    const shots = {
      hello: [0.3, 1.35, 4.3, 0, 0.96, 0, 42],
      step: [-0.8, 0.9, 4.0, 0, 0.83, 0, 40],
      swing: [0.8, 1.45, 4.1, 0, 0.99, 0, 39],
      turn: [-0.4, 1.7, 4.25, 0, 0.93, 0, 42],
      pop: [0.0, 0.9, 4.3, 0, 0.95, 0, 42],
      wink: [0.1, 1.6, 3.1, 0, 1.27, 0, 31],
      finale: [0.35, 1.6, 4.7, 0, 1.06, 0, 42],
    };
    const a = shots[shot];
    const push = shot === 'wink' ? 0.08 * ease(p) : 0.15 * ease(p);
    camera.position.set(a[0], a[1], a[2] - push);
    camera.lookAt(a[3], a[4], a[5]);
    camera.fov = a[6];
    camera.updateProjectionMatrix();
  }
}
