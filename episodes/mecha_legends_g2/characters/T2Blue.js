import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * T2_BLUE — Stellar Vanguard 重装型火力手
 * 蓝色重型卡车机器人：进气格栅胸甲、粗壮排气烟囱、履带护肩、重型膝甲。
 */
export class T2Blue extends RobotCharacterBase {
  constructor(name) {
    super(name || 'T2_BLUE');
    this.boundingRadius = 0.65;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'slow', 'strong'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch', 'SpiritGunFire',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const blueMat = this.createMetalMaterial(0x2e5aac);
    const silverMat = this.createMetalMaterial(0xbdc3c7);
    const darkMat = this.createDarkMetalMaterial(0x2c3e50);
    const visorMat = this.createGlowMaterial(0x66ffcc);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.45;
    this.robotGroup.add(torsoGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.82, 0.46), blueMat);
    torsoGroup.add(torso);

    // 卡车进气格栅胸甲
    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.08), silverMat);
    grilleFrame.position.set(0, 0.12, 0.24);
    torsoGroup.add(grilleFrame);

    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.02), darkMat);
      bar.position.set(-0.2 + i * 0.08, 0.12, 0.29);
      torsoGroup.add(bar);
    }

    // 侧面排气烟囱
    for (const side of [-1, 1]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 10), silverMat);
      stack.position.set(side * 0.42, 0.25, -0.08);
      torsoGroup.add(stack);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), darkMat);
      tip.position.set(side * 0.42, 0.56, -0.08);
      torsoGroup.add(tip);
    }

    this.addChestCore(torsoGroup, { x: 0, y: 0.28, z: 0.24 }, 0x66ffcc, { x: 0.14, y: 0.1, z: 0.04 });

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.3), darkMat);
    waist.position.y = 0.92;
    this.robotGroup.add(waist);

    // 头部
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.02, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.28), blueMat);
    this.headGroup.add(head);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), silverMat);
    brow.position.set(0, 0.16, 0.12);
    this.headGroup.add(brow);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.05), visorMat);
    visor.position.set(0, 0.03, 0.15);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.03), darkMat);
    this.mouth.position.set(0, -0.11, 0.15);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, blueMat, silverMat, darkMat);
    this._addArm(1, blueMat, silverMat, darkMat);
    this._addLeg(-1, blueMat, silverMat, darkMat);
    this._addLeg(1, blueMat, silverMat, darkMat);

    // 背部排气管
    for (const side of [-1, 1]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), silverMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * 0.2, 1.55, -0.25);
      this.robotGroup.add(pipe);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态：蓝色六轮重卡
    // ═══════════════════════════════════════════════════════════════════
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 1.9), blueMat);
    chassis.position.y = 0.5;
    this.vehicleGroup.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.75), blueMat);
    cabin.position.set(0, 0.95, 0.4);
    this.vehicleGroup.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.05), this.createGlowMaterial(0x88ccff));
    windshield.position.set(0, 1.08, 0.78);
    this.vehicleGroup.add(windshield);

    // 进气格栅
    const vGrille = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.06), silverMat);
    vGrille.position.set(0, 0.65, 0.95);
    this.vehicleGroup.add(vGrille);
    for (let i = 0; i < 7; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.02), darkMat);
      bar.position.set(-0.24 + i * 0.08, 0.65, 0.98);
      this.vehicleGroup.add(bar);
    }

    // 车轮
    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const rimMat = this.createBrushedMetalMaterial(0xaaaaaa);
    const wheelPos = [
      [-0.55, 0.28, 0.6], [0.55, 0.28, 0.6],
      [-0.55, 0.28, 0], [0.55, 0.28, 0],
      [-0.55, 0.28, -0.6], [0.55, 0.28, -0.6],
    ];
    for (const [x, y, z] of wheelPos) {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 20), wheelMat);
      tire.rotation.z = Math.PI / 2;
      wheelGroup.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);
      for (let i = 0; i < 8; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.025), rimMat);
        spoke.rotation.x = (i / 8) * Math.PI;
        spoke.rotation.z = Math.PI / 2;
        wheelGroup.add(spoke);
      }
      this.vehicleGroup.add(wheelGroup);
    }

    const headlightMat = this.createGlowMaterial(0xffffaa);
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.05), headlightMat);
      light.position.set(side * 0.3, 0.62, 0.96);
      this.vehicleGroup.add(light);
    }

    // 货箱
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.55, 1.0), blueMat);
    cargo.position.set(0, 0.75, -0.45);
    this.vehicleGroup.add(cargo);

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, blueMat, silverMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.58, 1.72, 0);
    this.robotGroup.add(shoulder);

    // 重型履带式护肩
    this.addTreadCylinder(shoulder, 0.16, 0.18, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0x1a1a1a);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.24), blueMat);
    shoulder.add(pad);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.2), blueMat);
    upperArm.position.y = -0.36;
    shoulder.add(upperArm);

    this.addPanelLine(shoulder, { x: 0, y: -0.36, z: 0.11 }, { x: 0.14, y: 0.32, z: 0.01 });
    this.addBoltRow(shoulder, { x: side * 0.08, y: -0.15, z: 0.12 }, { x: side * 0.08, y: -0.55, z: 0.12 }, 4);

    const elbow = new THREE.Group();
    elbow.position.y = -0.64;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.075, 0x2c3e50);
    this.addElbowGuard(elbow, 0xbdc3c7, 0.15);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.18), silverMat);
    lowerArm.position.y = -0.28;
    elbow.add(lowerArm);

    this.addHydraulic(elbow, { x: side * 0.08, y: -0.05, z: 0 }, { x: side * 0.08, y: -0.35, z: 0 }, 0.032, 0x444444);
    this.addBoltRow(elbow, { x: side * 0.07, y: -0.08, z: 0.11 }, { x: side * 0.07, y: -0.45, z: 0.11 }, 3);

    this.addHandFingers(elbow, 0x2e5aac, 0x2c3e50, 1.15);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, blueMat, silverMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.3, 0.82, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.56, 0.27), blueMat);
    thigh.position.y = -0.28;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.58;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.08, 0x2c3e50);
    this.addKneeGuard(knee, 0x2e5aac, 0xbdc3c7, 0.24);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.24), silverMat);
    shin.position.y = -0.28;
    knee.add(shin);

    this.addVents(knee, { x: side * 0.1, y: -0.28, z: 0.13 }, { x: 0.04, y: 0.28, z: 0.02 }, { x: 0, y: side * 0.1, z: 0 }, 0x111111, 4);
    this.addBoltRow(knee, { x: side * 0.09, y: -0.08, z: 0.14 }, { x: side * 0.09, y: -0.5, z: 0.14 }, 3);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.38), darkMat);
    foot.position.set(0, -0.62, 0.07);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
