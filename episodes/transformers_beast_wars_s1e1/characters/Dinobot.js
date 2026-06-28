import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * Dinobot — 迅猛龙（野兽形态）
 * 棕橙配色、手持能量剑、武士气质。
 */
export class Dinobot extends ToonCharacterBase {
  constructor(name) {
    super(name || 'Dinobot');
    this.boundingRadius = 0.5;
    this.archetypes = ['humanoid', 'fighter', 'agile'];
    this.trustedBodyAnimations = [
      'Walk', 'Run', 'Idle', 'LookAround',
      'LeftPunch', 'RightPunch', 'LeftRightPunchCombo',
      'PointForward', 'CrossArms', 'FaceDetermined', 'HitStagger',
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xa06020, gradientMap: toonGradient });
    const darkMat = new THREE.MeshToonMaterial({ color: 0x5a3510, gradientMap: toonGradient });
    const crestMat = new THREE.MeshToonMaterial({ color: 0xd08030, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
    this.bladeMat = new THREE.MeshBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0.8 });

    // 躯干
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 4, 12), bodyMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    this.mesh.add(torso);

    // 头部组
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.65, 0.22);
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.32), bodyMat);
    this.headGroup.add(head);

    // 头冠
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), crestMat);
    crest.position.set(0, 0.22, -0.05);
    this.headGroup.add(crest);

    // 眼睛
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      eye.position.set(side * 0.09, 0.04, 0.17);
      this.headGroup.add(eye);
    }

    // 嘴巴
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), darkMat);
    this.mouth.position.set(0, -0.1, 0.17);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    // 手臂
    this._addArm(-0.35, 1.25, 0, -1);
    this._addArm(0.35, 1.25, 0, 1);

    // 腿
    this._addLeg(-0.22, 0.75, 0, -1);
    this._addLeg(0.22, 0.75, 0, 1);

    // 尾巴
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.0, 8), bodyMat);
    tail.rotation.z = Math.PI / 2 + 0.25;
    tail.position.set(-0.55, 0.85, -0.1);
    this.mesh.add(tail);
  }

  _addArm(x, y, z, sign) {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xa06020, gradientMap: toonGradient });
    const clawMat = new THREE.MeshToonMaterial({ color: 0x3a2010, gradientMap: toonGradient });

    const shoulder = new THREE.Group();
    shoulder.position.set(x, y, z);
    this.mesh.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.26, 4, 8), bodyMat);
    upperArm.position.y = -0.16;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 4, 8), bodyMat);
    lowerArm.position.y = -0.15;
    elbow.add(lowerArm);

    const wrist = new THREE.Group();
    wrist.position.y = -0.3;
    elbow.add(wrist);

    // 右手持能量剑
    if (sign > 0) {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), clawMat);
      hilt.rotation.x = Math.PI / 2;
      wrist.add(hilt);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.02), this.bladeMat);
      blade.position.set(0, 0, 0.45);
      wrist.add(blade);
    } else {
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), clawMat);
      wrist.add(claw);
    }

    if (sign < 0) {
      this.leftArm = shoulder; this.leftElbow = elbow; this.leftWrist = wrist;
    } else {
      this.rightArm = shoulder; this.rightElbow = elbow; this.rightWrist = wrist;
    }
  }

  _addLeg(x, y, z, sign) {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xa06020, gradientMap: toonGradient });
    const clawMat = new THREE.MeshToonMaterial({ color: 0x3a2010, gradientMap: toonGradient });

    const hip = new THREE.Group();
    hip.position.set(x, y, z);
    this.mesh.add(hip);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), bodyMat);
    thigh.position.y = -0.2;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.4;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.3, 4, 8), bodyMat);
    shin.position.y = -0.18;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), clawMat);
    foot.position.set(0, -0.38, 0.08);
    knee.add(foot);

    if (sign < 0) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }

  setPosition(x, y, z) {
    super.setPosition(x, y, z);
    this.baseY = y;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(time * 2.0) * 0.01;
    }
  }
}
