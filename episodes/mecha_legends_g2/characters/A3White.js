import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * A3_WHITE — Stellar Vanguard 空中侦察兵
 * 白色三角翼喷气机机器人：喷气进气口胸甲、机翼肩甲、尖顶头盔、起落架小腿。
 */
export class A3White extends RobotCharacterBase {
  constructor(name) {
    super(name || 'A3_WHITE');
    this.boundingRadius = 0.5;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'agile'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const whiteMat = this.createMetalMaterial(0xe8e8e8);
    const redMat = this.createMetalMaterial(0xc0392b);
    const darkMat = this.createDarkMetalMaterial(0x34495e);
    const visorMat = this.createGlowMaterial(0xff3333);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.35;
    this.robotGroup.add(torsoGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.62, 0.26), whiteMat);
    torsoGroup.add(torso);

    // 三角翼胸甲
    const chestWingShape = new THREE.Shape();
    chestWingShape.moveTo(0, 0);
    chestWingShape.lineTo(0.32, -0.25);
    chestWingShape.lineTo(0.22, 0.18);
    chestWingShape.lineTo(0, 0);
    const chestWingGeo = new THREE.ExtrudeGeometry(chestWingShape, { depth: 0.04, bevelEnabled: false });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(chestWingGeo, redMat);
      wing.position.set(side * 0.08, 0.05, 0.14);
      if (side === -1) wing.rotation.z = Math.PI;
      torsoGroup.add(wing);
    }

    // 喷气进气口
    for (const side of [-1, 1]) {
      const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 12), darkMat);
      intake.rotation.z = Math.PI / 2;
      intake.position.set(side * 0.26, 0.1, 0.05);
      torsoGroup.add(intake);
      const intakeGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), this.createGlowMaterial(0xff6600));
      intakeGlow.rotation.z = Math.PI / 2;
      intakeGlow.position.set(side * 0.37, 0.1, 0.05);
      torsoGroup.add(intakeGlow);
    }

    this.addChestCore(torsoGroup, { x: 0, y: 0.18, z: 0.14 }, 0xff3333, { x: 0.12, y: 0.09, z: 0.03 });

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.16), darkMat);
    waist.position.y = 0.88;
    this.robotGroup.add(waist);

    // 头部
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.78, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), whiteMat);
    this.headGroup.add(head);

    const helmetFin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.16), redMat);
    helmetFin.position.set(0, 0.24, -0.06);
    this.headGroup.add(helmetFin);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.05), visorMat);
    visor.position.set(0, 0.02, 0.13);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.03), darkMat);
    this.mouth.position.set(0, -0.08, 0.13);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, whiteMat, redMat, darkMat);
    this._addArm(1, whiteMat, redMat, darkMat);
    this._addLeg(-1, whiteMat, redMat, darkMat);
    this._addLeg(1, whiteMat, redMat, darkMat);

    // 背部三角翼
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.65), redMat);
      wing.position.set(side * 0.3, 1.45, -0.22);
      wing.rotation.z = side * 0.3;
      wing.rotation.y = side * 0.15;
      this.robotGroup.add(wing);
    }

    // 尾部喷射器
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 12), darkMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 1.35, -0.42);
    this.robotGroup.add(thruster);
    const nozzleGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), this.createGlowMaterial(0xff6600));
    nozzleGlow.rotation.x = Math.PI / 2;
    nozzleGlow.position.set(0, 1.35, -0.58);
    this.robotGroup.add(nozzleGlow);

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态：三角翼喷气机
    // ═══════════════════════════════════════════════════════════════════
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 1.7), whiteMat);
    fuselage.position.y = 0.32;
    this.vehicleGroup.add(fuselage);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.55), this.createGlowMaterial(0x66aaff));
    cockpit.position.set(0, 0.52, 0.25);
    this.vehicleGroup.add(cockpit);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.0, -0.5);
    wingShape.lineTo(1.0, 0.5);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, whiteMat);
      wing.position.set(side * 0.1, 0.32, -0.1);
      wing.rotation.y = side * 0.1;
      if (side === -1) wing.rotation.z = Math.PI;
      this.vehicleGroup.add(wing);

      // 翼尖红条
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.2), redMat);
      tip.position.set(side * 1.05, 0.32, -0.1);
      this.vehicleGroup.add(tip);
    }

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.08), redMat);
    tail.position.set(0, 0.58, -0.78);
    this.vehicleGroup.add(tail);

    const engineMat = this.createGlowMaterial(0xff6600);
    for (const side of [-1, 1]) {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.28), engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 0.18, 0.28, -0.9);
      this.vehicleGroup.add(engine);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, whiteMat, redMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.4, 1.55, 0);
    this.robotGroup.add(shoulder);

    // 机翼肩甲
    const wingPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.32), redMat);
    wingPanel.position.set(side * 0.04, -0.28, -0.05);
    wingPanel.rotation.z = side * 0.2;
    shoulder.add(wingPanel);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.17, 0.15), whiteMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.12), whiteMat);
    upperArm.position.y = -0.28;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.48;
    shoulder.add(elbow);

    this.addElbowGuard(elbow, 0xc0392b, 0.11);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), whiteMat);
    lowerArm.position.y = -0.2;
    elbow.add(lowerArm);

    this.addHandFingers(elbow, 0xe8e8e8, 0x34495e, 0.85);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, whiteMat, redMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.85, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.15), whiteMat);
    thigh.position.y = -0.2;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    this.addKneeGuard(knee, 0xe8e8e8, 0xc0392b, 0.14);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.12), whiteMat);
    shin.position.y = -0.2;
    knee.add(shin);

    // 起落架式小腿细节
    const landingStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), darkMat);
    landingStrut.position.set(side * 0.05, -0.2, -0.06);
    knee.add(landingStrut);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.2), darkMat);
    foot.position.set(0, -0.42, 0.04);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
