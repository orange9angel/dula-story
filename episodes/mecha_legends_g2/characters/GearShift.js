import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Gear-Shift — 蓝色重型卡车机器人，灰狐安保 力量担当
 * 忠诚、沉稳，载具形态为蓝色越野卡车。
 */
export class GearShift extends RobotCharacterBase {
  constructor(name) {
    super(name || '布洛克');
    this.boundingRadius = 0.65;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'slow', 'strong'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
      'Punch', 'Kick', 'Uppercut', 'SpinKick', 'ComboPunch', 'DashForward',
      'Block', 'Dodge', 'WeaveStep', 'CounterStance', 'AxeKick', 'JumpAttack',
      'JumpFlyingKick', 'HurricaneKick', 'DragonPunch', 'BackFist', 'SweepKick',
      'KneeStrike', 'AirTatsumaki', 'HeadStomp', 'KneeDrop', 'RollingThunder',
      'GalaxyWhirl', 'BlitzBall', 'Hadoken', 'UltraBeam', 'PlasmaRifle',
      'PlasmaRifleCharge', 'CrouchPlasmaRifle', 'SpiritGunFire', 'SpiritGunCharge', 'FightingStance', 'HitStagger', 'Knockdown', 'GetUp',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const blueMat = this.createMetalMaterial(0x2e5aac);
    const silverMat = this.createMetalMaterial(0xbdc3c7);
    const darkMat = this.createDarkMetalMaterial(0x2c3e50);
    const blackMat = this.createDarkMetalMaterial(0x1a1a1a);
    const visorMat = this.createGlowMaterial(0x66ffcc);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    // 躯干组：分层胸甲 + 进气格栅 + 能量核心 + 侧排气烟囱
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.45;
    this.robotGroup.add(torsoGroup);

    // 主胸甲：厚重卡车型，分层前后装甲
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.88, 0.48), blueMat);
    torso.castShadow = true;
    torsoGroup.add(torso);

    // 胸甲前盖板（银色分层）
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.06), silverMat);
    chestPlate.position.set(0, 0.08, 0.25);
    torsoGroup.add(chestPlate);

    // 进气格栅（重卡风格）
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.04), darkMat);
    grille.position.set(0, 0.18, 0.29);
    torsoGroup.add(grille);
    this.addVents(torsoGroup, { x: 0, y: 0.18, z: 0.31 }, { x: 0.48, y: 0.26, z: 0.03 }, { x: 0, y: 0, z: 0 }, 0x050505, 6);

    // 能量核心
    this.addChestCore(torsoGroup, { x: 0, y: -0.12, z: 0.27 }, 0x66ffcc, { x: 0.16, y: 0.14, z: 0.04 });

    // 侧排气烟囱 / 进气口（重型卡车特征）
    for (const side of [-1, 1]) {
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 12), silverMat);
      chimney.position.set(side * 0.42, 0.22, -0.05);
      torsoGroup.add(chimney);

      const chimneyCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), darkMat);
      chimneyCap.position.set(side * 0.42, 0.52, -0.05);
      torsoGroup.add(chimneyCap);

      const sideIntake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.22), darkMat);
      sideIntake.position.set(side * 0.44, -0.08, 0.06);
      torsoGroup.add(sideIntake);
      this.addVents(torsoGroup, { x: side * 0.5, y: -0.08, z: 0.08 }, { x: 0.04, y: 0.28, z: 0.12 }, { x: 0, y: 0, z: 0 }, 0x111111, 5);
    }

    // 装甲接缝线
    this.addPanelLine(torsoGroup, { x: 0, y: 0.18, z: 0.32 }, { x: 0.56, y: 0.01, z: 0.02 });
    this.addPanelLine(torsoGroup, { x: 0, y: -0.12, z: 0.30 }, { x: 0.20, y: 0.01, z: 0.02 });

    // 腰部
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.32), darkMat);
    waist.position.y = -0.56;
    torsoGroup.add(waist);

    // 头部：厚重但比例更接近人脸的装甲头盔，visor 大眼、粗眉、宽嘴
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.0, 0);
    this.robotGroup.add(this.headGroup);

    // 主头盔：偏方正的圆角块
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.32), blueMat);
    cranium.position.set(0, 0.02, -0.02);
    this.headGroup.add(cranium);

    const craniumTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.30, 14), blueMat);
    craniumTop.rotation.z = Math.PI / 2;
    craniumTop.position.set(0, 0.16, -0.02);
    this.headGroup.add(craniumTop);

    // 两侧重护颊
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.24), silverMat);
      cheek.position.set(side * 0.18, -0.04, 0.02);
      this.headGroup.add(cheek);
    }

    // 面甲
    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.05), blueMat);
    facePlate.position.set(0, 0.02, 0.16);
    this.headGroup.add(facePlate);

    // 下巴装甲（厚重）
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.18), blueMat);
    chin.position.set(0, -0.18, 0.08);
    this.headGroup.add(chin);

    // 双眼系统：visor 发光带 + 独立瞳孔
    const eyeGlowMat = visorMat;
    const eyeWhiteMat = this.createDarkMetalMaterial(0xaaaaaa);

    const visorBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.065, 0.025), eyeWhiteMat);
    visorBack.position.set(0, 0.05, 0.175);
    this.headGroup.add(visorBack);

    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.03), eyeGlowMat.clone());
    visorBand.material.opacity = 0.85;
    visorBand.position.set(0, 0.05, 0.182);
    this.headGroup.add(visorBand);

    for (const side of [-1, 1]) {
      const eyeX = side * 0.065;

      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(eyeX, 0.05, 0.18);
      this.headGroup.add(eyeGroup);
      if (side === -1) this.leftEyeGroup = eyeGroup;
      else this.rightEyeGroup = eyeGroup;

      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.032, 0.016), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending }));
      pupil.position.z = 0.012;
      pupil.userData.baseX = pupil.position.x;
      pupil.userData.baseY = pupil.position.y;
      pupil.userData.eyeRadius = 0.016;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.02), darkMat);
      eyelid.position.set(eyeX, 0.095, 0.185);
      this.headGroup.add(eyelid);
      if (side === -1) this.leftEyelid = eyelid;
      else this.rightEyelid = eyelid;

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.02), silverMat);
      brow.position.set(eyeX, 0.125, 0.185);
      brow.rotation.z = side * -0.05;
      this.headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }

    // 鼻凸（短粗三角）
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), darkMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.02, 0.19);
    this.headGroup.add(nose);

    // 下颌嘴：宽嘴缝
    this.mouth = new THREE.Group();
    this.mouth.position.set(0, -0.11, 0.17);
    this.headGroup.add(this.mouth);
    this.mouthBaseRotationX = 0;

    const lipMat = this.createDarkMetalMaterial(0x1a1a1a);
    this.lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.035), lipMat);
    this.lowerLip.position.set(0, -0.015, 0.012);
    this.mouth.add(this.lowerLip);

    this.upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.035), lipMat);
    this.upperLip.position.set(0, -0.06, 0.175);
    this.headGroup.add(this.upperLip);

    // 脸部补光：特写时五官清晰可见
    this.addFaceLight(this.headGroup, 0xddeeff, 2.2, 3.0, 1.5);

    // 背部推进器背包
    const backpack = this.addBackpackThrusters(this.robotGroup, 0x2e5aac, 0x66ffcc, 2);
    backpack.position.set(0, 1.55, -0.28);

    this._addArm(-1, blueMat, silverMat, darkMat, blackMat);
    this._addArm(1, blueMat, silverMat, darkMat, blackMat);
    this._addLeg(-1, blueMat, silverMat, darkMat, blackMat);
    this._addLeg(1, blueMat, silverMat, darkMat, blackMat);

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态 — 蓝色卡车
    // ═══════════════════════════════════════════════════════════════════
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.38, 1.9), blueMat);
    chassis.position.y = 0.5;
    this.vehicleGroup.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.48, 0.75), blueMat);
    cabin.position.set(0, 0.92, 0.38);
    this.vehicleGroup.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.05), this.createGlowMaterial(0x88ccff));
    windshield.position.set(0, 1.02, 0.76);
    this.vehicleGroup.add(windshield);

    // 卡车进气格栅细节
    const truckGrille = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.04), darkMat);
    truckGrille.position.set(0, 0.55, 0.96);
    this.vehicleGroup.add(truckGrille);

    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const wheelPos = [
      [-0.55, 0.28, 0.58], [0.55, 0.28, 0.58],
      [-0.55, 0.28, -0.58], [0.55, 0.28, -0.58],
      [-0.55, 0.28, 0], [0.55, 0.28, 0],
    ];
    for (const [x, y, z] of wheelPos) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      this.vehicleGroup.add(wheel);
    }

    const headlightMat = this.createGlowMaterial(0xffffaa);
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.05), headlightMat);
      light.position.set(side * 0.30, 0.62, 0.96);
      this.vehicleGroup.add(light);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, blueMat, silverMat, darkMat, blackMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.60, 1.72, 0);
    this.robotGroup.add(shoulder);

    // 肩甲：厚重卡车风格分层装甲
    this.addShoulderPad(shoulder, side, 0x2e5aac, 0xbdc3c7, 0.36, 0.28, 0.32);

    // 肩关节
    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), blueMat);
    shoulder.add(shoulderMesh);

    // 上臂
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.22), blueMat);
    upperArm.position.y = -0.36;
    shoulder.add(upperArm);

    // 上臂外侧装甲板
    const armPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.40, 0.05), silverMat);
    armPanel.position.set(0, -0.36, 0.12);
    shoulder.add(armPanel);

    this.addPanelLine(shoulder, { x: 0, y: -0.36, z: 0.15 }, { x: 0.14, y: 0.01, z: 0.01 });
    this.addBoltRow(shoulder, { x: side * 0.08, y: -0.16, z: 0.16 }, { x: side * 0.08, y: -0.52, z: 0.16 }, 4);

    // 肘部
    const elbow = new THREE.Group();
    elbow.position.y = -0.64;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.065, 0x2c3e50);
    this.addElbowGuard(elbow, 0xbdc3c7, 0.15);

    // 前臂
    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.48, 0.20), silverMat);
    lowerArm.position.y = -0.26;
    elbow.add(lowerArm);

    // 前臂液压杆（重卡机械感）
    this.addHydraulic(elbow, { x: side * 0.06, y: -0.04, z: 0.12 }, { x: side * 0.06, y: -0.42, z: 0.12 }, 0.032, 0x555555);

    // 前臂排气管
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), blackMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * -0.05, -0.26, 0.12);
    elbow.add(exhaust);

    this.addBoltRow(elbow, { x: side * 0.06, y: -0.06, z: 0.11 }, { x: side * 0.06, y: -0.42, z: 0.11 }, 3);

    // 分指机械手
    const hand = this.addHandFingers(elbow, 0x2e5aac, 0x2c3e50, 1.05);
    if (side === 1) {
      // 右手持等离子步枪
      this.addPlasmaRifle(hand, side, 0xbdc3c7, 0x66ffcc, 1.05);
    }

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, blueMat, silverMat, darkMat, blackMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.30, 0.82, 0);
    this.robotGroup.add(hip);

    // 大腿
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.58, 0.28), blueMat);
    thigh.position.y = -0.29;
    hip.add(thigh);

    // 大腿前装甲板
    const thighPanel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.05), silverMat);
    thighPanel.position.set(0, -0.29, 0.14);
    hip.add(thighPanel);

    this.addPanelLine(hip, { x: 0, y: -0.29, z: 0.17 }, { x: 0.08, y: 0.32, z: 0.01 });

    // 膝盖
    const knee = new THREE.Group();
    knee.position.y = -0.60;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.07, 0x2c3e50);
    this.addKneeGuard(knee, 0x2e5aac, 0xbdc3c7, 0.20);

    // 小腿
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.58, 0.26), silverMat);
    shin.position.y = -0.29;
    knee.add(shin);

    // 小腿散热 vents
    this.addVents(knee, { x: side * 0.07, y: -0.29, z: 0.14 }, { x: 0.04, y: 0.26, z: 0.03 }, { x: 0, y: 0, z: 0 }, 0x111111, 4);

    // 小腿后侧推进器
    const shinThruster = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 8), blackMat);
    shinThruster.rotation.x = Math.PI / 2;
    shinThruster.position.set(0, -0.29, -0.14);
    knee.add(shinThruster);

    this.addBoltRow(knee, { x: side * 0.07, y: -0.06, z: 0.16 }, { x: side * 0.07, y: -0.48, z: 0.16 }, 3);

    // 脚：厚靴子形
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.42), blackMat);
    foot.position.set(0, -0.62, 0.06);
    knee.add(foot);

    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.16), blackMat);
    toe.position.set(0, -0.59, 0.24);
    knee.add(toe);

    // 脚踝护甲
    const ankleGuard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.08), silverMat);
    ankleGuard.position.set(0, -0.54, 0.15);
    knee.add(ankleGuard);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
