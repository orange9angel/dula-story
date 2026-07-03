import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * V1_RED — Stellar Vanguard 速度型先锋
 * 红色跑车机器人：流线型车头胸甲、侧进气口、单目面罩、尾翼背包。
 */
export class V1Red extends RobotCharacterBase {
  constructor(name) {
    super(name || 'V1_RED');
    this.boundingRadius = 0.55;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'agile'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch', 'SpiritGunFire',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const redMat = this.createMetalMaterial(0xd82626);
    const yellowMat = this.createMetalMaterial(0xffcc00);
    const darkMat = this.createDarkMetalMaterial(0x2c3e50);
    const glassMat = this.createGlowMaterial(0x00ffff, 0.85);
    const visorMat = this.createGlowMaterial(0x00ffff);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    // 躯干：跑车车头胸甲，前低后高
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.35;
    this.robotGroup.add(torsoGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.34), redMat);
    torsoGroup.add(torso);

    // 进气格栅
    this.addVents(torsoGroup, { x: 0, y: 0.12, z: 0.18 }, { x: 0.3, y: 0.16, z: 0.05 }, { x: 0, y: 0, z: 0 }, 0x111111, 4);

    // 侧进气口
    for (const side of [-1, 1]) {
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.2), darkMat);
      intake.position.set(side * 0.32, 0.05, 0.05);
      torsoGroup.add(intake);
      this.addVents(torsoGroup, { x: side * 0.38, y: 0.05, z: 0.1 }, { x: 0.04, y: 0.22, z: 0.12 }, { x: 0, y: side * 0.2, z: 0 }, 0x050505, 3);
    }

    // 能量核心窗
    this.addChestCore(torsoGroup, { x: 0, y: 0.18, z: 0.18 }, 0x00ffff, { x: 0.16, y: 0.12, z: 0.04 });

    // 腰部
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), darkMat);
    waist.position.y = 0.88;
    this.robotGroup.add(waist);

    // 头部：流线头盔 + 单目宽面罩 + 天线鳍
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.82, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.26), redMat);
    this.headGroup.add(head);

    const helmetTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.28), redMat);
    helmetTop.position.y = 0.14;
    this.headGroup.add(helmetTop);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.18), yellowMat);
    fin.position.set(0, 0.18, -0.08);
    this.headGroup.add(fin);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.05), visorMat);
    visor.position.set(0, 0.02, 0.14);
    this.headGroup.add(visor);

    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3), yellowMat);
      antenna.position.set(side * 0.16, 0.22, -0.08);
      this.headGroup.add(antenna);
    }

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), darkMat);
    this.mouth.position.set(0, -0.09, 0.14);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    // 手臂
    this._addArm(-1, redMat, yellowMat, darkMat);
    this._addArm(1, redMat, yellowMat, darkMat);
    this._addLeg(-1, redMat, yellowMat, darkMat);
    this._addLeg(1, redMat, yellowMat, darkMat);

    // 尾翼背包
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.14), yellowMat);
    spoiler.position.set(0, 1.6, -0.28);
    spoiler.rotation.x = -0.25;
    this.robotGroup.add(spoiler);
    const spoilerStand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.04), darkMat);
    spoilerStand.position.set(0, 1.5, -0.22);
    this.robotGroup.add(spoilerStand);

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态：红色低趴跑车
    // ═══════════════════════════════════════════════════════════════════
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 1.45), redMat);
    body.position.y = 0.28;
    this.vehicleGroup.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.55), glassMat);
    cabin.position.set(0, 0.46, -0.1);
    this.vehicleGroup.add(cabin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 1.1), yellowMat);
    stripe.position.set(0, 0.39, 0);
    this.vehicleGroup.add(stripe);

    // 带轮辐的轮毂
    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const rimMat = this.createBrushedMetalMaterial(0xcccccc);
    const wheelPos = [
      [-0.38, 0.17, 0.45], [0.38, 0.17, 0.45],
      [-0.38, 0.17, -0.45], [0.38, 0.17, -0.45],
    ];
    for (const [x, y, z] of wheelPos) {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 18), wheelMat);
      tire.rotation.z = Math.PI / 2;
      wheelGroup.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.13, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);
      for (let i = 0; i < 6; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), rimMat);
        spoke.rotation.x = (i / 6) * Math.PI;
        spoke.rotation.z = Math.PI / 2;
        wheelGroup.add(spoke);
      }
      this.vehicleGroup.add(wheelGroup);
    }

    const headlightMat = this.createGlowMaterial(0xffffaa);
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.04), headlightMat);
      light.position.set(side * 0.22, 0.32, 0.73);
      this.vehicleGroup.add(light);
    }

    const tailLightMat = this.createGlowMaterial(0xff0000);
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), tailLightMat);
      tail.position.set(side * 0.22, 0.34, -0.73);
      this.vehicleGroup.add(tail);
    }

    const spoilerV = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.12), yellowMat);
    spoilerV.position.set(0, 0.52, -0.62);
    this.vehicleGroup.add(spoilerV);

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, redMat, yellowMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.45, 1.55, 0);
    this.robotGroup.add(shoulder);

    this.addShoulderPad(shoulder, side, 0xd82626, 0xffcc00, 0.3, 0.22, 0.26);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.18), redMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.12), redMat);
    upperArm.position.y = -0.28;
    shoulder.add(upperArm);

    this.addPanelLine(shoulder, { x: 0, y: -0.28, z: 0.07 }, { x: 0.08, y: 0.24, z: 0.01 });
    this.addBoltRow(shoulder, { x: side * 0.05, y: -0.12, z: 0.07 }, { x: side * 0.05, y: -0.44, z: 0.07 }, 4);

    const elbow = new THREE.Group();
    elbow.position.y = -0.48;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.055, 0x2c3e50);
    this.addElbowGuard(elbow, 0xffcc00, 0.12);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.11), yellowMat);
    lowerArm.position.y = -0.2;
    elbow.add(lowerArm);

    this.addVents(elbow, { x: side * 0.06, y: -0.2, z: 0.06 }, { x: 0.04, y: 0.18, z: 0.02 }, { x: 0, y: side * 0.15, z: 0 }, 0x111111, 3);
    this.addBoltRow(elbow, { x: side * 0.04, y: -0.05, z: 0.07 }, { x: side * 0.04, y: -0.35, z: 0.07 }, 3);

    this.addHandFingers(elbow, 0xd82626, 0x2c3e50, 0.95);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, redMat, yellowMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.22, 0.8, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), redMat);
    thigh.position.y = -0.22;
    hip.add(thigh);

    // 侧进气口
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.12), darkMat);
    intake.position.set(side * 0.1, -0.22, 0.05);
    hip.add(intake);

    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.06, 0x2c3e50);
    this.addKneeGuard(knee, 0xd82626, 0xffcc00, 0.17);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.15), yellowMat);
    shin.position.y = -0.22;
    knee.add(shin);

    this.addVents(knee, { x: side * 0.06, y: -0.22, z: 0.08 }, { x: 0.03, y: 0.2, z: 0.02 }, { x: 0, y: side * 0.1, z: 0 }, 0x111111, 3);
    this.addBoltRow(knee, { x: side * 0.05, y: -0.05, z: 0.09 }, { x: side * 0.05, y: -0.4, z: 0.09 }, 3);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.28), darkMat);
    foot.position.set(0, -0.5, 0.06);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
