import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * R4_ORANGE — 克洛斯公司 突击型破坏者
 * 橙色沙漠越野车机器人：防滚架胸甲、外露引擎背包、大号轮胎肩甲、减震器小腿。
 */
export class R4Orange extends RobotCharacterBase {
  constructor(name) {
    super(name || 'R4_ORANGE');
    this.boundingRadius = 0.52;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'agile'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch', 'PlasmaRifle',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const orangeMat = this.createMetalMaterial(0xe67e22);
    const blackMat = this.createDarkMetalMaterial(0x1a1a1a);
    const yellowMat = this.createMetalMaterial(0xf1c40f);
    const visorMat = this.createGlowMaterial(0xff5500);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.32;
    this.robotGroup.add(torsoGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.3), orangeMat);
    torsoGroup.add(torso);

    this.addChestCore(torsoGroup, { x: 0, y: 0.18, z: 0.16 }, 0xff5500, { x: 0.13, y: 0.1, z: 0.03 });

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), blackMat);
    waist.position.y = 0.86;
    this.robotGroup.add(waist);

    // 头部
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.8, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), orangeMat);
    this.headGroup.add(head);

    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.05), visorMat);
    goggles.position.set(0, 0.03, 0.13);
    this.headGroup.add(goggles);

    // 防滚架头箍
    const headCage = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.26), blackMat);
    headCage.position.y = 0.14;
    this.headGroup.add(headCage);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.03), blackMat);
    this.mouth.position.set(0, -0.1, 0.13);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, orangeMat, yellowMat, blackMat);
    this._addArm(1, orangeMat, yellowMat, blackMat);
    this._addLeg(-1, orangeMat, yellowMat, blackMat);
    this._addLeg(1, orangeMat, yellowMat, blackMat);

    // 背部外露引擎
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 12), blackMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(0, 1.45, -0.28);
    this.robotGroup.add(engine);
    const exhaustGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), this.createGlowMaterial(0xff3300));
    exhaustGlow.rotation.x = Math.PI / 2;
    exhaustGlow.position.set(0, 1.45, -0.48);
    this.robotGroup.add(exhaustGlow);
    const engineLight = new THREE.PointLight(0xff3300, 1.0, 2.5, 1.5);
    engineLight.position.set(0, 1.45, -0.5);
    this.robotGroup.add(engineLight);

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态：沙漠越野车
    // ═══════════════════════════════════════════════════════════════════
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 1.25), orangeMat);
    body.position.y = 0.3;
    this.vehicleGroup.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 1.0), yellowMat);
    stripe.position.set(0, 0.42, 0);
    this.vehicleGroup.add(stripe);

    // 防滚架
    const cageGroup = new THREE.Group();
    cageGroup.position.set(0, 0.55, 0.05);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), blackMat);
      post.position.set(side * 0.22, 0, 0.25);
      cageGroup.add(post);
      const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), blackMat);
      post2.position.set(side * 0.22, 0, -0.25);
      cageGroup.add(post2);
    }
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.6), blackMat);
    topBar.position.y = 0.22;
    cageGroup.add(topBar);
    this.vehicleGroup.add(cageGroup);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.4), this.createGlowMaterial(0x222222));
    cockpit.position.set(0, 0.42, 0.1);
    this.vehicleGroup.add(cockpit);

    // 大轮胎
    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const wheelPos = [
      [-0.4, 0.22, 0.42], [0.4, 0.22, 0.42],
      [-0.42, 0.28, -0.42], [0.42, 0.28, -0.42],
    ];
    const wheelSizes = [0.18, 0.18, 0.24, 0.24];
    for (let i = 0; i < wheelPos.length; i++) {
      const [x, y, z] = wheelPos[i];
      const r = wheelSizes[i];
      this.addTreadCylinder(this.vehicleGroup, r, 0.16, { x, y, z }, { x: 0, y: 0, z: Math.PI / 2 }, 0x1a1a1a);
    }

    // 排气管
    const flameMat = this.createGlowMaterial(0xff3300);
    for (const side of [-1, 1]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22), flameMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side * 0.18, 0.35, -0.68);
      this.vehicleGroup.add(exhaust);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, orangeMat, yellowMat, blackMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.44, 1.52, 0);
    this.robotGroup.add(shoulder);

    // 大号轮胎肩甲
    this.addTreadCylinder(shoulder, 0.14, 0.14, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: Math.PI / 2 }, 0x1a1a1a);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.19, 0.17), orangeMat);
    shoulder.add(shoulderMesh);

    const rollBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.16), blackMat);
    rollBar.position.set(side * 0.04, -0.25, -0.05);
    shoulder.add(rollBar);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.13), orangeMat);
    upperArm.position.y = -0.3;
    shoulder.add(upperArm);
    this.addBoltRow(shoulder, { x: side * 0.05, y: -0.1, z: 0.09 }, { x: side * 0.05, y: -0.45, z: 0.09 }, 3);

    const elbow = new THREE.Group();
    elbow.position.y = -0.52;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.055, 0x1a1a1a);
    this.addElbowGuard(elbow, 0xf1c40f, 0.12);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.12), yellowMat);
    lowerArm.position.y = -0.22;
    elbow.add(lowerArm);
    this.addBoltRow(elbow, { x: side * 0.04, y: -0.05, z: 0.08 }, { x: side * 0.04, y: -0.38, z: 0.08 }, 3);

    this.addHandFingers(elbow, 0xe67e22, 0x1a1a1a, 1.0);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, orangeMat, yellowMat, blackMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.22, 0.82, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.17), orangeMat);
    thigh.position.y = -0.21;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.06, 0x1a1a1a);
    this.addKneeGuard(knee, 0xe67e22, 0xf1c40f, 0.16);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.4, 0.14), yellowMat);
    shin.position.y = -0.21;
    knee.add(shin);

    // 减震器
    const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), blackMat);
    shock.position.set(side * 0.05, -0.22, -0.05);
    knee.add(shock);

    const shockCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 8, 1, true), blackMat);
    shockCoil.position.set(side * 0.05, -0.22, -0.05);
    knee.add(shockCoil);
    this.addBoltRow(knee, { x: side * 0.05, y: -0.05, z: 0.09 }, { x: side * 0.05, y: -0.38, z: 0.09 }, 3);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.24), blackMat);
    foot.position.set(0, -0.48, 0.05);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
