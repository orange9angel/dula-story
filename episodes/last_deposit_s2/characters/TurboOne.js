import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Turbo-1 — 红色跑车机器人，灰狐安保 队长
 * 勇敢、果断，载具形态为低趴红色跑车。
 */
export class TurboOne extends RobotCharacterBase {
  constructor(name) {
    super(name || '雷恩');
    this.boundingRadius = 0.55;
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
    const redMat = this.createMetalMaterial(0xd82626);
    const silverMat = this.createMetalMaterial(0xbdc3c7);
    const darkMat = this.createDarkMetalMaterial(0x2c3e50);
    const blackMat = this.createDarkMetalMaterial(0x1a1a1a);
    const blueGlassMat = this.createGlowMaterial(0x22aaff);
    const visorMat = this.createGlowMaterial(0x00ffff);
    const yellowMat = this.createMetalMaterial(0xffc107);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    // 躯干组：分层胸甲 + 进气口 + 能量核心
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.35;
    this.robotGroup.add(torsoGroup);

    // 主胸甲
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.34), redMat);
    torso.castShadow = true;
    torsoGroup.add(torso);

    // 胸甲窗户（跑车挡风玻璃）
    const chestWindow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.04), blueGlassMat);
    chestWindow.position.set(0, 0.12, 0.18);
    torsoGroup.add(chestWindow);

    // 能量核心
    this.addChestCore(torsoGroup, { x: 0, y: 0.12, z: 0.2 }, 0x00ffff, { x: 0.12, y: 0.09, z: 0.03 });

    // 侧进气口
    for (const side of [-1, 1]) {
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.18), darkMat);
      intake.position.set(side * 0.32, 0.05, 0.05);
      torsoGroup.add(intake);
      this.addVents(torsoGroup, { x: side * 0.37, y: 0.05, z: 0.08 }, { x: 0.03, y: 0.2, z: 0.1 }, { x: 0, y: side * 0.15, z: 0 }, 0x050505, 4);
    }

    // 装甲接缝线
    this.addPanelLine(torsoGroup, { x: 0, y: 0.12, z: 0.18 }, { x: 0.42, y: 0.01, z: 0.02 });

    // 腰部
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.24), darkMat);
    waist.position.y = -0.42;
    torsoGroup.add(waist);

    // 头部：更贴近人脸比例的机甲头盔，visor 式大眼、小鼻、简洁嘴缝
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.85, 0);
    this.robotGroup.add(this.headGroup);

    // 主头盔：圆角胶囊状
    const cranium = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.26, 16), redMat);
    cranium.rotation.z = Math.PI / 2;
    cranium.position.set(0, 0.04, -0.02);
    this.headGroup.add(cranium);

    const craniumCap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), redMat);
    craniumCap.rotation.x = -Math.PI / 2;
    craniumCap.position.set(0, 0.04, 0.11);
    this.headGroup.add(craniumCap);

    // 前额装饰 / 赛车头盔中脊
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.22), yellowMat);
    crest.position.set(0, 0.16, 0.05);
    this.headGroup.add(crest);

    // 面甲（visor 眼眶底）
    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.05), redMat);
    facePlate.position.set(0, 0.0, 0.13);
    this.headGroup.add(facePlate);

    // 下巴装甲
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.15), redMat);
    chin.position.set(0, -0.16, 0.08);
    this.headGroup.add(chin);

    // 双眼系统：一体化 visor 发光带 + 两侧独立瞳孔
    const eyeGlowMat = visorMat; // 青色发光
    const eyeWhiteMat = this.createDarkMetalMaterial(0xaaaaaa);

    const visorBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.025), eyeWhiteMat);
    visorBack.position.set(0, 0.03, 0.155);
    this.headGroup.add(visorBack);

    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.03), eyeGlowMat.clone());
    visorBand.material.opacity = 0.85;
    visorBand.position.set(0, 0.03, 0.162);
    this.headGroup.add(visorBand);

    for (const side of [-1, 1]) {
      const eyeX = side * 0.065;

      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(eyeX, 0.03, 0.16);
      this.headGroup.add(eyeGroup);
      if (side === -1) this.leftEyeGroup = eyeGroup;
      else this.rightEyeGroup = eyeGroup;

      // 瞳孔（短竖条，更像人眼）
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.035, 0.018), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending }));
      pupil.position.z = 0.012;
      pupil.userData.baseX = pupil.position.x;
      pupil.userData.baseY = pupil.position.y;
      pupil.userData.eyeRadius = 0.018;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      // 上眼睑（眨眼时垂下）
      const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.02), darkMat);
      eyelid.position.set(eyeX, 0.075, 0.165);
      this.headGroup.add(eyelid);
      if (side === -1) this.leftEyelid = eyelid;
      else this.rightEyelid = eyelid;

      // 眉毛
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.010, 0.02), yellowMat);
      brow.position.set(eyeX, 0.105, 0.165);
      brow.rotation.z = side * -0.10;
      this.headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }

    // 鼻凸（小型三角脊）
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), darkMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.05, 0.17);
    this.headGroup.add(nose);

    // 嘴：简洁横向缝隙，带下唇可动
    this.mouth = new THREE.Group();
    this.mouth.position.set(0, -0.10, 0.155);
    this.headGroup.add(this.mouth);
    this.mouthBaseRotationX = 0;

    const lipMat = this.createDarkMetalMaterial(0x1a1a1a);
    this.lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.03), lipMat);
    this.lowerLip.position.set(0, -0.012, 0.012);
    this.mouth.add(this.lowerLip);

    this.upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.03), lipMat);
    // 上唇放入 mouth Group，与下唇共用同一局部坐标系，嘴型动画才能同步开合
    this.upperLip.position.set(0, 0.042, 0.005);
    this.mouth.add(this.upperLip);

    // 通讯天线
    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22), silverMat);
      antenna.position.set(side * 0.16, 0.18, -0.05);
      this.headGroup.add(antenna);
    }

    // 脸部补光：特写时五官清晰可见
    this.addFaceLight(this.headGroup, 0xddeeff, 2.0, 3.0, 1.5);

    // 背部推进器背包
    const backpack = this.addBackpackThrusters(this.robotGroup, 0xd82626, 0x00ffff, 2);
    backpack.position.set(0, 1.45, -0.22);

    // 手臂
    this._addArm(-1, redMat, silverMat, darkMat, yellowMat, blackMat);
    this._addArm(1, redMat, silverMat, darkMat, yellowMat, blackMat);

    // 腿
    this._addLeg(-1, redMat, silverMat, darkMat, yellowMat, blackMat);
    this._addLeg(1, redMat, silverMat, darkMat, yellowMat, blackMat);

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

  _addArm(side, redMat, silverMat, darkMat, yellowMat, blackMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.48, 1.58, 0);
    this.robotGroup.add(shoulder);

    // 肩甲：圆角分层装甲
    this.addShoulderPad(shoulder, side, 0xd82626, 0xffc107, 0.3, 0.22, 0.26);

    // 肩关节
    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.18), redMat);
    shoulder.add(shoulderMesh);

    // 上臂
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.13), redMat);
    upperArm.position.y = -0.28;
    shoulder.add(upperArm);

    // 上臂外侧装甲板
    const armPanel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.28, 0.04), silverMat);
    armPanel.position.set(0, -0.28, 0.08);
    shoulder.add(armPanel);

    this.addPanelLine(shoulder, { x: 0, y: -0.28, z: 0.1 }, { x: 0.1, y: 0.01, z: 0.01 });
    this.addBoltRow(shoulder, { x: side * 0.06, y: -0.12, z: 0.11 }, { x: side * 0.06, y: -0.42, z: 0.11 }, 4);

    // 肘部
    const elbow = new THREE.Group();
    elbow.position.y = -0.5;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.055, 0x2c3e50);
    this.addElbowGuard(elbow, 0xffc107, 0.12);

    // 前臂
    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.12), silverMat);
    lowerArm.position.y = -0.2;
    elbow.add(lowerArm);

    // 前臂排气管细节
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8), blackMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 0.04, -0.2, 0.08);
    elbow.add(exhaust);

    this.addBoltRow(elbow, { x: side * 0.04, y: -0.05, z: 0.07 }, { x: side * 0.04, y: -0.35, z: 0.07 }, 3);

    // 分指机械手
    const hand = this.addHandFingers(elbow, 0xd82626, 0x2c3e50, 0.95);
    if (side === 1) {
      // 右手持等离子步枪
      this.addPlasmaRifle(hand, side, 0xbdc3c7, 0x00ffff, 0.95);
    }

    if (side === -1) {
      this.leftArm = shoulder;
      this.leftElbow = elbow;
    } else {
      this.rightArm = shoulder;
      this.rightElbow = elbow;
    }
  }

  _addLeg(side, redMat, silverMat, darkMat, yellowMat, blackMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.24, 0.8, 0);
    this.robotGroup.add(hip);

    // 大腿
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.44, 0.19), redMat);
    thigh.position.y = -0.22;
    hip.add(thigh);

    // 大腿前装甲板
    const thighPanel = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.04), silverMat);
    thighPanel.position.set(0, -0.22, 0.1);
    hip.add(thighPanel);

    this.addPanelLine(hip, { x: 0, y: -0.22, z: 0.12 }, { x: 0.06, y: 0.28, z: 0.01 });

    // 膝盖
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.06, 0x2c3e50);
    this.addKneeGuard(knee, 0xd82626, 0xffc107, 0.17);

    // 小腿
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.15), silverMat);
    shin.position.y = -0.22;
    knee.add(shin);

    // 小腿后侧推进器
    const shinThruster = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), blackMat);
    shinThruster.rotation.x = Math.PI / 2;
    shinThruster.position.set(0, -0.22, -0.11);
    knee.add(shinThruster);

    this.addVents(knee, { x: side * 0.05, y: -0.22, z: 0.08 }, { x: 0.03, y: 0.2, z: 0.02 }, { x: 0, y: side * 0.1, z: 0 }, 0x111111, 3);
    this.addBoltRow(knee, { x: side * 0.05, y: -0.05, z: 0.09 }, { x: side * 0.05, y: -0.4, z: 0.09 }, 3);

    // 脚：靴子形
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.28), blackMat);
    foot.position.set(0, -0.48, 0.06);
    knee.add(foot);

    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), blackMat);
    toe.position.set(0, -0.46, 0.18);
    knee.add(toe);

    if (side === -1) {
      this.leftLeg = hip;
      this.leftKnee = knee;
    } else {
      this.rightLeg = hip;
      this.rightKnee = knee;
    }
  }
}
