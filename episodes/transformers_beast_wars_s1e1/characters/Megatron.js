import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * Megatron — 霸王龙（野兽形态）
 * 紫黑机体、红色光学镜、庞大反派。
 */
export class Megatron extends ToonCharacterBase {
  constructor(name) {
    super(name || 'Megatron');
    this.boundingRadius = 0.7;
    this.archetypes = ['humanoid', 'fighter', 'strong', 'monster'];
    this.trustedBodyAnimations = [
      'Walk', 'Idle', 'LookAround', 'LeftPunch', 'RightPunch',
      'CrossArms', 'PointForward', 'FaceDetermined', 'HitStagger',
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x4a2a5a, gradientMap: toonGradient });
    const darkMat = new THREE.MeshToonMaterial({ color: 0x2a1a35, gradientMap: toonGradient });
    const accentMat = new THREE.MeshToonMaterial({ color: 0x882244, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });

    // 躯干
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.65, 4, 12), bodyMat);
    torso.position.y = 1.45;
    torso.castShadow = true;
    this.mesh.add(torso);

    // 胸甲细节
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), darkMat);
    chest.position.set(0, 1.55, 0.2);
    this.mesh.add(chest);

    // 头部组
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.95, 0.25);
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.45), bodyMat);
    this.headGroup.add(head);

    // 眼睛
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
      eye.position.set(side * 0.12, 0.06, 0.22);
      this.headGroup.add(eye);
    }

    // 下颚（嘴巴）
    this.jaw = new THREE.Group();
    this.jaw.position.set(0, -0.1, 0.25);
    this.headGroup.add(this.jaw);

    const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.35), darkMat);
    jawMesh.position.set(0, -0.06, 0.1);
    this.jaw.add(jawMesh);

    // 牙齿
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 6), toothMat);
      tooth.position.set((i - 2) * 0.06, 0.03, 0.18);
      this.jaw.add(tooth);
    }

    this.mouth = this.jaw;
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    // 小手臂（霸王龙小前肢）
    this._addArm(-0.42, 1.45, 0, -1);
    this._addArm(0.42, 1.45, 0, 1);

    // 大腿
    this._addLeg(-0.3, 0.95, 0, -1);
    this._addLeg(0.3, 0.95, 0, 1);

    // 尾巴
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.2, 10), bodyMat);
    tail.rotation.z = Math.PI / 2 + 0.2;
    tail.position.set(-0.65, 1.0, -0.2);
    this.mesh.add(tail);
  }

  _addArm(x, y, z, sign) {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x4a2a5a, gradientMap: toonGradient });

    const shoulder = new THREE.Group();
    shoulder.position.set(x, y, z);
    this.mesh.add(shoulder);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 4, 8), bodyMat);
    arm.position.y = -0.12;
    shoulder.add(arm);

    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), bodyMat);
    claw.position.y = -0.24;
    shoulder.add(claw);

    if (sign < 0) { this.leftArm = shoulder; } else { this.rightArm = shoulder; }
  }

  _addLeg(x, y, z, sign) {
    const toonGradient = this.createToonGradient();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x4a2a5a, gradientMap: toonGradient });
    const clawMat = new THREE.MeshToonMaterial({ color: 0x2a1a35, gradientMap: toonGradient });

    const hip = new THREE.Group();
    hip.position.set(x, y, z);
    this.mesh.add(hip);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4, 4, 10), bodyMat);
    thigh.position.y = -0.26;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.55;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.38, 4, 10), bodyMat);
    shin.position.y = -0.24;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.35), clawMat);
    foot.position.set(0, -0.5, 0.1);
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
      this.mesh.position.y = this.baseY + Math.sin(time * 1.2) * 0.012;
    }
  }
}
