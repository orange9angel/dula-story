import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Sky-Razor — 白色喷气战斗机机器人，灰狐安保 空中侦察兵
 * 话多、敏捷，载具形态为三角翼战斗机。
 */
export class SkyRazor extends RobotCharacterBase {
  constructor(name) {
    super(name || '斯凯');
    this.boundingRadius = 0.5;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'agile'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
      'Punch', 'Kick', 'Uppercut', 'SpinKick', 'ComboPunch', 'DashForward',
      'Block', 'Dodge', 'WeaveStep', 'CounterStance', 'AxeKick', 'JumpAttack',
      'JumpFlyingKick', 'HurricaneKick', 'DragonPunch', 'BackFist', 'SweepKick',
      'KneeStrike', 'AirTatsumaki', 'HeadStomp', 'KneeDrop', 'RollingThunder',
      'GalaxyWhirl', 'BlitzBall', 'Hadoken', 'UltraBeam', 'PlasmaRifle',
      'PlasmaRifleCharge', 'CrouchPlasmaRifle', 'SpiritGunFire', 'SpiritGunCharge', 'FightingStance', 'HitStagger', 'Knockdown', 'GetUp',
      'RobotTransform', 'RobotRevert', 'HoldPlasmaRifle', 'VehicleDrive', 'Crouch'
    ]);
  }

  build() {
    const whiteMat = this.createMetalMaterial(0xe8e8e8);
    const redMat = this.createMetalMaterial(0xc0392b);
    const darkMat = this.createDarkMetalMaterial(0x34495e);
    const blackMat = this.createDarkMetalMaterial(0x1a1a1a);
    const silverMat = this.createMetalMaterial(0xa0a0a0);
    const visorMat = this.createGlowMaterial(0xff3333);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    // 躯干组：流线型分层胸甲 + 进气口 + 能量核心 + 红色条纹
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.35;
    this.robotGroup.add(torsoGroup);

    // 主胸甲：前凸后收的战斗机风格机舱
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.32), whiteMat);
    torso.castShadow = true;
    torsoGroup.add(torso);

    // 胸甲前缘红色装饰条
    const chestStripeTop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.04), redMat);
    chestStripeTop.position.set(0, 0.22, 0.17);
    torsoGroup.add(chestStripeTop);

    const chestStripeMid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.04), redMat);
    chestStripeMid.position.set(0, 0.08, 0.17);
    torsoGroup.add(chestStripeMid);

    // 侧进气口
    for (const side of [-1, 1]) {
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.16), darkMat);
      intake.position.set(side * 0.29, 0.04, 0.04);
      torsoGroup.add(intake);
      this.addVents(torsoGroup, { x: side * 0.34, y: 0.04, z: 0.07 }, { x: 0.03, y: 0.18, z: 0.09 }, { x: 0, y: side * 0.12, z: 0 }, 0x050505, 4);
    }

    // 能量核心
    this.addChestCore(torsoGroup, { x: 0, y: -0.02, z: 0.18 }, 0xff3333, { x: 0.1, y: 0.08, z: 0.03 });

    // 装甲接缝线
    this.addPanelLine(torsoGroup, { x: 0, y: 0.08, z: 0.17 }, { x: 0.38, y: 0.01, z: 0.02 });
    this.addPanelLine(torsoGroup, { x: 0, y: -0.08, z: 0.17 }, { x: 0.36, y: 0.01, z: 0.02 });

    // 腰部
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), darkMat);
    waist.position.y = -0.4;
    torsoGroup.add(waist);

    // 头部：流线飞行员头盔，visor 大眼、尖下巴、后脑三角翼（保持原代码不变）
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.8, 0);
    this.robotGroup.add(this.headGroup);

    // 主头盔：前尖后宽的椭圆块
    const cranium = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.28, 14), whiteMat);
    cranium.rotation.z = Math.PI / 2;
    cranium.position.set(0, 0.03, -0.02);
    this.headGroup.add(cranium);

    const craniumFront = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), whiteMat);
    craniumFront.rotation.x = -Math.PI / 2;
    craniumFront.position.set(0, 0.03, 0.12);
    this.headGroup.add(craniumFront);

    // 后脑三角翼鳍
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.22), redMat);
    tailFin.position.set(0, 0.05, -0.18);
    this.headGroup.add(tailFin);

    // 面甲
    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), whiteMat);
    facePlate.position.set(0, 0.0, 0.13);
    this.headGroup.add(facePlate);

    // 尖下巴
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.13), whiteMat);
    chin.position.set(0, -0.16, 0.07);
    this.headGroup.add(chin);

    // 双眼系统：visor 发光带 + 独立瞳孔
    const eyeGlowMat = visorMat;
    const eyeWhiteMat = this.createDarkMetalMaterial(0xcccccc);

    const visorBack = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.02), eyeWhiteMat);
    visorBack.position.set(0, 0.04, 0.15);
    this.headGroup.add(visorBack);

    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.025), eyeGlowMat.clone());
    visorBand.material.opacity = 0.85;
    visorBand.position.set(0, 0.04, 0.158);
    this.headGroup.add(visorBand);

    for (const side of [-1, 1]) {
      const eyeX = side * 0.050;

      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(eyeX, 0.04, 0.155);
      this.headGroup.add(eyeGroup);
      if (side === -1) this.leftEyeGroup = eyeGroup;
      else this.rightEyeGroup = eyeGroup;

      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.032, 0.016), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending }));
      pupil.position.z = 0.012;
      pupil.userData.baseX = pupil.position.x;
      pupil.userData.baseY = pupil.position.y;
      pupil.userData.eyeRadius = 0.020;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.008, 0.018), darkMat);
      eyelid.position.set(eyeX, 0.075, 0.16);
      this.headGroup.add(eyelid);
      if (side === -1) this.leftEyelid = eyelid;
      else this.rightEyelid = eyelid;

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.018), redMat);
      brow.position.set(eyeX, 0.10, 0.16);
      brow.rotation.z = side * 0.1;
      this.headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }

    // 鼻凸（小进气口）
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 4), darkMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.03, 0.165);
    this.headGroup.add(nose);

    // 下颌嘴：纤细
    this.mouth = new THREE.Group();
    this.mouth.position.set(0, -0.09, 0.15);
    this.headGroup.add(this.mouth);
    this.mouthBaseRotationX = 0;

    const lipMat = this.createDarkMetalMaterial(0x1a1a1a);
    this.lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.022, 0.03), lipMat);
    this.lowerLip.position.set(0, -0.012, 0.012);
    this.mouth.add(this.lowerLip);

    this.upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.018, 0.03), lipMat);
    this.upperLip.position.set(0, -0.06, 0.155);
    this.headGroup.add(this.upperLip);

    // 脸部补光：特写时五官清晰可见
    this.addFaceLight(this.headGroup, 0xddeeff, 2.0, 3.0, 1.5);

    // 背部：矢量推进器背包 + 小型三角尾翼
    const backpack = this.addBackpackThrusters(this.robotGroup, 0xe8e8e8, 0xff3333, 2);
    backpack.position.set(0, 1.42, -0.2);

    for (const side of [-1, 1]) {
      const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.18), redMat);
      stabilizer.position.set(side * 0.16, 1.55, -0.32);
      stabilizer.rotation.y = side * 0.35;
      this.robotGroup.add(stabilizer);
    }

    // 手臂
    this._addArm(-1, whiteMat, redMat, darkMat, silverMat, blackMat);
    this._addArm(1, whiteMat, redMat, darkMat, silverMat, blackMat);

    // 腿
    this._addLeg(-1, whiteMat, redMat, darkMat, silverMat, blackMat);
    this._addLeg(1, whiteMat, redMat, darkMat, silverMat, blackMat);

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态 — 三角翼喷气机（只做微调）
    // ═══════════════════════════════════════════════════════════════════

    // 机身：前尖后粗的流线型
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 1.6), whiteMat);
    fuselage.position.y = 0.36;
    this.vehicleGroup.add(fuselage);

    // 机头雷达罩
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 16), whiteMat);
    noseCone.rotation.x = -Math.PI / 2;
    noseCone.position.set(0, 0.36, 0.98);
    this.vehicleGroup.add(noseCone);

    // 座舱
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.5), this.createGlowMaterial(0x66aaff));
    cockpit.position.set(0, 0.56, 0.25);
    this.vehicleGroup.add(cockpit);

    // 三角主翼
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.95, -0.45);
    wingShape.lineTo(0.95, 0.45);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, whiteMat);
      wing.position.set(side * 0.12, 0.36, -0.1);
      wing.rotation.y = side * 0.1;
      if (side === -1) wing.rotation.z = Math.PI;
      this.vehicleGroup.add(wing);

      // 翼尖红色条纹
      const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.22), redMat);
      wingTip.position.set(side * 0.95, 0.36, 0.35);
      this.vehicleGroup.add(wingTip);
    }

    // 垂直尾翼
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.28, 0.08), redMat);
    tail.position.set(0, 0.58, -0.75);
    this.vehicleGroup.add(tail);

    // 双发引擎
    const engineMat = this.createGlowMaterial(0xff6600);
    for (const side of [-1, 1]) {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.28), engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 0.18, 0.3, -0.88);
      this.vehicleGroup.add(engine);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, whiteMat, redMat, darkMat, silverMat, blackMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.42, 1.58, 0);
    this.robotGroup.add(shoulder);

    // 肩甲：更流线、更小的分层装甲
    this.addShoulderPad(shoulder, side, 0xe8e8e8, 0xc0392b, 0.26, 0.18, 0.22);

    // 肩关节
    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.16), whiteMat);
    shoulder.add(shoulderMesh);

    // 上臂
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), whiteMat);
    upperArm.position.y = -0.26;
    shoulder.add(upperArm);

    // 上臂外侧机翼面板（呼应战斗机主题）
    const wingPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.22), redMat);
    wingPanel.position.set(side * 0.04, -0.26, -0.04);
    wingPanel.rotation.y = side * 0.15;
    shoulder.add(wingPanel);

    this.addPanelLine(shoulder, { x: 0, y: -0.26, z: 0.08 }, { x: 0.09, y: 0.01, z: 0.01 });
    this.addBoltRow(shoulder, { x: side * 0.05, y: -0.12, z: 0.1 }, { x: side * 0.05, y: -0.4, z: 0.1 }, 4);

    // 肘部
    const elbow = new THREE.Group();
    elbow.position.y = -0.48;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.05, 0x34495e);
    this.addElbowGuard(elbow, 0xc0392b, 0.11);

    // 前臂
    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.11), silverMat);
    lowerArm.position.y = -0.19;
    elbow.add(lowerArm);

    // 前臂进气口/散热栅
    this.addVents(elbow, { x: side * 0.04, y: -0.19, z: 0.07 }, { x: 0.03, y: 0.18, z: 0.02 }, { x: 0, y: side * 0.08, z: 0 }, 0x111111, 3);

    // 前臂排气管
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), blackMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 0.03, -0.19, 0.07);
    elbow.add(exhaust);

    this.addBoltRow(elbow, { x: side * 0.03, y: -0.05, z: 0.07 }, { x: side * 0.03, y: -0.33, z: 0.07 }, 3);

    // 分指机械手
    const hand = this.addHandFingers(elbow, 0xe8e8e8, 0x34495e, 0.9);
    if (side === 1) {
      // 右手持等离子步枪
      this.addPlasmaRifle(hand, side, 0xa0a0a0, 0xff3333, 0.9);
    }

    if (side === -1) {
      this.leftArm = shoulder;
      this.leftElbow = elbow;
    } else {
      this.rightArm = shoulder;
      this.rightElbow = elbow;
    }
  }

  _addLeg(side, whiteMat, redMat, darkMat, silverMat, blackMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.22, 0.82, 0);
    this.robotGroup.add(hip);

    // 大腿
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), whiteMat);
    thigh.position.y = -0.21;
    hip.add(thigh);

    // 大腿前装甲板
    const thighPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.04), silverMat);
    thighPanel.position.set(0, -0.21, 0.1);
    hip.add(thighPanel);

    // 大腿外侧红色装甲条
    const thighStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.06), redMat);
    thighStripe.position.set(side * 0.1, -0.21, 0.02);
    hip.add(thighStripe);

    this.addPanelLine(hip, { x: 0, y: -0.21, z: 0.12 }, { x: 0.05, y: 0.26, z: 0.01 });

    // 膝盖
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.055, 0x34495e);
    this.addKneeGuard(knee, 0xe8e8e8, 0xc0392b, 0.16);

    // 小腿
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.14), silverMat);
    shin.position.y = -0.21;
    knee.add(shin);

    // 小腿前侧散热栅
    this.addVents(knee, { x: side * 0.03, y: -0.21, z: 0.08 }, { x: 0.03, y: 0.18, z: 0.02 }, { x: 0, y: side * 0.08, z: 0 }, 0x111111, 3);

    // 小腿后侧推进器
    const shinThruster = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 8), blackMat);
    shinThruster.rotation.x = Math.PI / 2;
    shinThruster.position.set(0, -0.21, -0.1);
    knee.add(shinThruster);

    this.addBoltRow(knee, { x: side * 0.04, y: -0.05, z: 0.09 }, { x: side * 0.04, y: -0.38, z: 0.09 }, 3);

    // 脚：喷气式靴子形
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.28), blackMat);
    foot.position.set(0, -0.46, 0.06);
    knee.add(foot);

    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.14), blackMat);
    toe.position.set(0, -0.44, 0.2);
    knee.add(toe);

    // 脚踝两侧稳定翼
    const ankleFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.1), redMat);
    ankleFin.position.set(side * 0.1, -0.42, -0.08);
    ankleFin.rotation.y = side * 0.4;
    knee.add(ankleFin);

    if (side === -1) {
      this.leftLeg = hip;
      this.leftKnee = knee;
    } else {
      this.rightLeg = hip;
      this.rightKnee = knee;
    }
  }
}
