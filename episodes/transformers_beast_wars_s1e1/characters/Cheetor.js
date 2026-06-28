import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * Cheetor — 猎豹（野兽形态）
 * 黄色机体、黑色斑点、热血少年。
 */
export class Cheetor extends ToonCharacterBase {
  constructor(name) {
    super(name || 'Cheetor');
    this.boundingRadius = 0.45;
    this.archetypes = ['quadruped', 'agile', 'fighter'];
    this.trustedBodyAnimations = ['Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'HitStagger', 'LeftPunch', 'RightPunch', 'PointForward'];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xf0c040, gradientMap: toonGradient });
    const spotMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const lightMat = new THREE.MeshToonMaterial({ color: 0xf8e8a0, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x33ccff });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x330000 });

    // 躯干
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 12), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.8;
    body.castShadow = true;
    this.mesh.add(body);

    // 斑点装饰
    for (let i = 0; i < 8; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), spotMat);
      spot.position.set(
        (Math.random() - 0.5) * 0.5,
        0.85 + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.3
      );
      spot.scale.y = 0.4;
      this.mesh.add(spot);
    }

    // 头部组
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0.55, 1.05, 0);
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.3), bodyMat);
    this.headGroup.add(head);

    // 耳朵
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 8), bodyMat);
      ear.position.set(side * 0.1, 0.2, -0.05);
      this.headGroup.add(ear);
    }

    // 眼睛
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.04), eyeMat);
      eye.position.set(side * 0.08, 0.04, 0.16);
      this.headGroup.add(eye);
    }

    // 嘴巴
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), mouthMat);
    this.mouth.position.set(0, -0.08, 0.16);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    // 四条腿
    this._addLeg(-0.25, 0.55, 0.25, 'frontLeft');
    this._addLeg(0.25, 0.55, 0.25, 'frontRight');
    this._addLeg(-0.25, 0.55, -0.25, 'backLeft');
    this._addLeg(0.25, 0.55, -0.25, 'backRight');

    // 尾巴
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.6, 8), bodyMat);
    tail.rotation.z = -0.4;
    tail.position.set(-0.55, 0.85, 0);
    this.mesh.add(tail);
  }

  _addLeg(x, y, z, label) {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xf0c040, gradientMap: toonGradient });
    const pawMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });

    const shoulder = new THREE.Group();
    shoulder.position.set(x, y, z);
    this.mesh.add(shoulder);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.25, 4, 8), bodyMat);
    upper.position.y = -0.16;
    shoulder.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -0.32;
    shoulder.add(knee);

    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 8), bodyMat);
    lower.position.y = -0.14;
    knee.add(lower);

    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.12), pawMat);
    paw.position.y = -0.28;
    knee.add(paw);

    // 映射到 humanoid 关节以兼容动画系统
    if (label.includes('front')) {
      if (label === 'frontLeft') { this.leftArm = shoulder; this.leftElbow = knee; }
      else { this.rightArm = shoulder; this.rightElbow = knee; }
    } else {
      if (label === 'backLeft') { this.leftLeg = shoulder; this.leftKnee = knee; }
      else { this.rightLeg = shoulder; this.rightKnee = knee; }
    }
  }

  setPosition(x, y, z) {
    super.setPosition(x, y, z);
    this.baseY = y;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(time * 3.0) * 0.01;
    }
  }
}
