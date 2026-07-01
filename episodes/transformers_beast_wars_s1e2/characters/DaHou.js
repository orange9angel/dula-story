import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * DaHou — 大猴（野兽形态）
 * 黑色机体、银色胸甲、蓝色光学镜，憨厚领袖。
 */
export class DaHou extends ToonCharacterBase {
  constructor(name) {
    super(name || 'DaHou');
    this.boundingRadius = 0.55;
    this.archetypes = ['humanoid', 'fighter', 'strong'];
    this.trustedBodyAnimations = [
      'Walk', 'Run', 'Idle', 'LookAround',
      'LeftPunch', 'RightPunch', 'Block', 'HitStagger',
      'PointForward', 'Nod', 'CrossArms', 'FaceDetermined', 'FaceHappy',
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const toonGradient = this.createToonGradient();
    const furMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const silverMat = new THREE.MeshToonMaterial({ color: 0xb0c0d0, gradientMap: toonGradient });
    const darkMat = new THREE.MeshToonMaterial({ color: 0x0a0a0a, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x33ccff });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x330000 });

    // 躯干
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.55, 4, 12), furMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.mesh.add(torso);

    // 银色胸甲
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.25), silverMat);
    chest.position.set(0, 1.25, 0.22);
    chest.castShadow = true;
    this.mesh.add(chest);

    // 头部组
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.65, 0);
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), furMat);
    this.headGroup.add(head);

    // 头顶银色冠
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), silverMat);
    crest.position.set(0, 0.2, -0.05);
    this.headGroup.add(crest);

    // 眼睛
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), eyeMat);
      eye.position.set(side * 0.09, 0.05, 0.17);
      this.headGroup.add(eye);
    }

    // 嘴巴（用于说话缩放）
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.04), mouthMat);
    this.mouth.position.set(0, -0.1, 0.17);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1;
    this.mouthBaseScaleY = 1;
    this.mouthBaseScaleZ = 1;

    // 手臂
    this._addArm(-0.48, 1.35, 0, -1);
    this._addArm(0.48, 1.35, 0, 1);

    // 腿
    this._addLeg(-0.22, 0.75, 0, -1);
    this._addLeg(0.22, 0.75, 0, 1);

    // 卡通描边，提升模型“玩具动画”质感
    this.addOutlines();
  }

  _addArm(x, y, z, sign) {
    const toonGradient = this.createToonGradient();
    const furMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const silverMat = new THREE.MeshToonMaterial({ color: 0xb0c0d0, gradientMap: toonGradient });

    const shoulder = new THREE.Group();
    shoulder.position.set(x, y, z);
    this.mesh.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 4, 10), furMat);
    upperArm.position.y = -0.22;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.45;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.32, 4, 10), furMat);
    lowerArm.position.y = -0.2;
    elbow.add(lowerArm);

    const wrist = new THREE.Group();
    wrist.position.y = -0.38;
    elbow.add(wrist);

    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), silverMat);
    wrist.add(fist);

    if (sign < 0) {
      this.leftArm = shoulder;
      this.leftElbow = elbow;
      this.leftWrist = wrist;
    } else {
      this.rightArm = shoulder;
      this.rightElbow = elbow;
      this.rightWrist = wrist;
    }
  }

  _addLeg(x, y, z) {
    const toonGradient = this.createToonGradient();
    const furMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const silverMat = new THREE.MeshToonMaterial({ color: 0xb0c0d0, gradientMap: toonGradient });

    const hip = new THREE.Group();
    hip.position.set(x, y, z);
    this.mesh.add(hip);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.35, 4, 10), furMat);
    thigh.position.y = -0.22;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.35, 4, 10), furMat);
    shin.position.y = -0.22;
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.y = -0.45;
    knee.add(ankle);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.28), silverMat);
    foot.position.set(0, -0.05, 0.05);
    ankle.add(foot);

    if (x < 0) {
      this.leftLeg = hip;
      this.leftKnee = knee;
      this.leftAnkle = ankle;
    } else {
      this.rightLeg = hip;
      this.rightKnee = knee;
      this.rightAnkle = ankle;
    }
  }

  setPosition(x, y, z) {
    super.setPosition(x, y, z);
    this.baseY = y;
  }

  update(time, delta) {
    super.update(time, delta);
    // 轻微呼吸/idle 晃动
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(time * 1.8) * 0.015;
    }
  }
}
