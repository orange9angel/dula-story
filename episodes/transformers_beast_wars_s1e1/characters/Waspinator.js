import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * Waspinator — 黄蜂（野兽形态）
 * 黑黄条纹、透明翅膀、受气包反派。
 */
export class Waspinator extends ToonCharacterBase {
  constructor(name) {
    super(name || 'Waspinator');
    this.boundingRadius = 0.3;
    this.archetypes = ['flying', 'agile', 'tiny'];
    this.trustedBodyAnimations = ['Idle', 'LookAround', 'Dodge', 'HitStagger'];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const toonGradient = this.createToonGradient();
    const yellowMat = new THREE.MeshToonMaterial({ color: 0xf0d020, gradientMap: toonGradient });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xccffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x330000 });

    // 胸部（黄黑条纹胶囊）
    const thorax = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.25, 4, 10), yellowMat);
    thorax.position.y = 1.2;
    thorax.castShadow = true;
    this.mesh.add(thorax);

    const stripe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.08, 12), blackMat);
    stripe1.position.y = 1.25;
    this.mesh.add(stripe1);

    // 腹部
    const abdomen = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.35, 4, 10), blackMat);
    abdomen.position.set(0, 1.05, -0.18);
    abdomen.rotation.x = 0.4;
    this.mesh.add(abdomen);

    const abdStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.08, 12), yellowMat);
    abdStripe.position.set(0, 1.0, -0.22);
    abdStripe.rotation.x = 0.4;
    this.mesh.add(abdStripe);

    // 头部组
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.42, 0.12);
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), blackMat);
    this.headGroup.add(head);

    // 复眼
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), eyeMat);
      eye.position.set(side * 0.08, 0.02, 0.09);
      this.headGroup.add(eye);
    }

    // 触角
    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.25, 6), blackMat);
      antenna.position.set(side * 0.05, 0.16, 0);
      antenna.rotation.z = side * 0.4;
      this.headGroup.add(antenna);
    }

    // 嘴巴
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.02), mouthMat);
    this.mouth.position.set(0, -0.08, 0.12);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    // 翅膀
    this.wings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), wingMat);
      wing.position.set(side * 0.32, 1.35, -0.1);
      wing.rotation.y = side * 0.5;
      wing.rotation.z = side * 0.2;
      this.mesh.add(wing);
      this.wings.push(wing);
    }

    // 四肢（细）
    this._addLimb(-0.12, 1.15, 0.12, -1, 'arm');
    this._addLimb(0.12, 1.15, 0.12, 1, 'arm');
    this._addLimb(-0.1, 1.05, -0.12, -1, 'leg');
    this._addLimb(0.1, 1.05, -0.12, 1, 'leg');
  }

  _addLimb(x, y, z, sign, type) {
    const toonGradient = this.createToonGradient();
    const blackMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });

    const root = new THREE.Group();
    root.position.set(x, y, z);
    this.mesh.add(root);

    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.22, 4, 6), blackMat);
    seg.position.y = -0.12;
    root.add(seg);

    if (type === 'arm') {
      if (sign < 0) this.leftArm = root; else this.rightArm = root;
    } else {
      if (sign < 0) this.leftLeg = root; else this.rightLeg = root;
    }
  }

  setPosition(x, y, z) {
    super.setPosition(x, y, z);
    this.baseY = y;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(time * 8.0) * 0.04;
    }
    if (this.wings) {
      for (let i = 0; i < this.wings.length; i++) {
        this.wings[i].rotation.z = (i === 0 ? -1 : 1) * (0.2 + Math.sin(time * 25) * 0.35);
      }
    }
  }
}
