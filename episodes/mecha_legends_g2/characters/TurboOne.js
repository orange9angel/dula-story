import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Turbo-1 — 红色跑车机器人，Steel Guard 队长
 * 勇敢、果断，载具形态为低趴红色跑车。
 */
export class TurboOne extends RobotCharacterBase {
  constructor(name) {
    super(name || 'TurboOne');
    this.boundingRadius = 0.55;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'agile'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const redMat = this.createMetalMaterial(0xd82626);
    const silverMat = this.createMetalMaterial(0xbdc3c7);
    const darkMat = this.createDarkMetalMaterial(0x2c3e50);
    const blueGlassMat = this.createGlowMaterial(0x22aaff);
    const visorMat = this.createGlowMaterial(0x00ffff);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    // 躯干
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), redMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    this.robotGroup.add(torso);

    // 胸甲窗户（跑车挡风玻璃）
    const chestWindow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.05), blueGlassMat);
    chestWindow.position.set(0, 1.45, 0.18);
    this.robotGroup.add(chestWindow);

    // 腰部
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.25), darkMat);
    waist.position.y = 0.9;
    this.robotGroup.add(waist);

    // 头部
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.85, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.25, 0.28), redMat);
    this.headGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05), visorMat);
    visor.position.set(0, 0.02, 0.15);
    this.headGroup.add(visor);

    // 天线
    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25), silverMat);
      antenna.position.set(side * 0.16, 0.22, -0.05);
      this.headGroup.add(antenna);
    }

    // 嘴巴
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.03), darkMat);
    this.mouth.position.set(0, -0.1, 0.15);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    // 手臂
    this._addArm(-1, redMat, silverMat, darkMat);
    this._addArm(1, redMat, silverMat, darkMat);

    // 腿
    this._addLeg(-1, redMat, silverMat, darkMat);
    this._addLeg(1, redMat, silverMat, darkMat);

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态 — 红色跑车
    // ═══════════════════════════════════════════════════════════════════
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 1.4), redMat);
    body.position.y = 0.3;
    this.vehicleGroup.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.55), blueGlassMat);
    cabin.position.set(0, 0.5, -0.1);
    this.vehicleGroup.add(cabin);

    // 轮子
    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const wheelPos = [
      [-0.38, 0.18, 0.45],
      [0.38, 0.18, 0.45],
      [-0.38, 0.18, -0.45],
      [0.38, 0.18, -0.45],
    ];
    for (const [x, y, z] of wheelPos) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      this.vehicleGroup.add(wheel);
    }

    // 车灯
    const headlightMat = this.createGlowMaterial(0xffffaa);
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), headlightMat);
      light.position.set(side * 0.22, 0.32, 0.71);
      this.vehicleGroup.add(light);
    }

    // 尾翼
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.12), silverMat);
    spoiler.position.set(0, 0.55, -0.62);
    this.vehicleGroup.add(spoiler);

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, redMat, silverMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.45, 1.55, 0);
    this.robotGroup.add(shoulder);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.2), redMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), redMat);
    upperArm.position.y = -0.28;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.5;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.35, 0.13), silverMat);
    lowerArm.position.y = -0.2;
    elbow.add(lowerArm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), darkMat);
    hand.position.y = -0.45;
    elbow.add(hand);

    if (side === -1) {
      this.leftArm = shoulder;
      this.leftElbow = elbow;
    } else {
      this.rightArm = shoulder;
      this.rightElbow = elbow;
    }
  }

  _addLeg(side, redMat, silverMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.22, 0.8, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.2), redMat);
    thigh.position.y = -0.22;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.18), silverMat);
    shin.position.y = -0.22;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.3), darkMat);
    foot.position.set(0, -0.5, 0.05);
    knee.add(foot);

    if (side === -1) {
      this.leftLeg = hip;
      this.leftKnee = knee;
    } else {
      this.rightLeg = hip;
      this.rightKnee = knee;
    }
  }
}
