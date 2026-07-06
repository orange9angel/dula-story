import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * X0_BLACK — 克洛斯公司 重型指挥官
 * 黑色坦克机器人：倾斜装甲胸甲、履带小腿、肩载炮塔、指挥天线、厚重裙甲。
 */
export class X0Black extends RobotCharacterBase {
  constructor(name) {
    super(name || 'X0_BLACK');
    this.boundingRadius = 0.7;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'slow', 'strong'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'PointForward', 'StompFoot',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch', 'PlasmaRifle',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const blackMat = this.createMetalMaterial(0x151515);
    const purpleMat = this.createMetalMaterial(0x6c1c9c);
    const darkMat = this.createDarkMetalMaterial(0x0a0a0a);
    const visorMat = this.createGlowMaterial(0xff0033);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // ═══════════════════════════════════════════════════════════════════
    // 机器人形态
    // ═══════════════════════════════════════════════════════════════════

    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.52;
    this.robotGroup.add(torsoGroup);

    // 厚重倾斜胸甲
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.92, 0.58), blackMat);
    torsoGroup.add(torso);

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.1), purpleMat);
    chestPlate.position.set(0, 0.18, 0.32);
    chestPlate.rotation.x = -0.15;
    torsoGroup.add(chestPlate);

    this.addChestCore(torsoGroup, { x: 0, y: 0.22, z: 0.34 }, 0xff0033, { x: 0.14, y: 0.1, z: 0.04 });

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.36), darkMat);
    waist.position.y = 0.95;
    this.robotGroup.add(waist);

    // 头部
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.12, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.32), blackMat);
    this.headGroup.add(head);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.34), purpleMat);
    helmet.position.y = 0.2;
    this.headGroup.add(helmet);

    // 指挥天线
    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.45, 6), darkMat);
      antenna.position.set(side * 0.18, 0.38, -0.1);
      this.headGroup.add(antenna);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), this.createGlowMaterial(0xff0033));
      tip.position.set(side * 0.18, 0.62, -0.1);
      this.headGroup.add(tip);
    }

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.06), visorMat);
    visor.position.set(0, 0.03, 0.17);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.045, 0.03), darkMat);
    this.mouth.position.set(0, -0.13, 0.17);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, blackMat, purpleMat, darkMat);
    this._addArm(1, blackMat, purpleMat, darkMat);
    this._addLeg(-1, blackMat, purpleMat, darkMat);
    this._addLeg(1, blackMat, purpleMat, darkMat);

    // 肩载炮塔
    for (const side of [-1, 1]) {
      const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 12), purpleMat);
      turretBase.position.set(side * 0.56, 1.92, 0);
      this.robotGroup.add(turretBase);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), darkMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 0.56, 1.92, 0.22);
      this.robotGroup.add(barrel);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 8), this.createGlowMaterial(0xff0033));
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(side * 0.56, 1.92, 0.45);
      this.robotGroup.add(muzzle);
    }

    // 厚重裙甲
    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.45), darkMat);
      skirt.position.set(side * 0.5, 1.05, 0);
      this.robotGroup.add(skirt);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 载具形态：重型坦克
    // ═══════════════════════════════════════════════════════════════════
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 1.45), blackMat);
    hull.position.y = 0.45;
    this.vehicleGroup.add(hull);

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.28, 16), purpleMat);
    turret.position.y = 0.84;
    this.vehicleGroup.add(turret);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.05, 12), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.84, 0.68);
    this.vehicleGroup.add(barrel);

    const muzzleGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12), this.createGlowMaterial(0xff0033));
    muzzleGlow.rotation.x = Math.PI / 2;
    muzzleGlow.position.set(0, 0.84, 1.2);
    this.vehicleGroup.add(muzzleGlow);

    // 履带
    const trackMat = this.createDarkMetalMaterial(0x050505);
    for (const side of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 1.55), trackMat);
      track.position.set(side * 0.6, 0.32, 0);
      this.vehicleGroup.add(track);

      for (let i = 0; i < 7; i++) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.28, 12), trackMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.6, 0.18, -0.55 + i * 0.183);
        this.vehicleGroup.add(wheel);
      }

      // 履带纹路
      for (let i = 0; i < 18; i++) {
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.04), trackMat);
        ridge.position.set(side * 0.6, 0.34, -0.75 + i * 0.088);
        this.vehicleGroup.add(ridge);
      }
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, blackMat, purpleMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.62, 1.78, 0);
    this.robotGroup.add(shoulder);

    // 重型肩甲
    this.addShoulderPad(shoulder, side, 0x151515, 0x6c1c9c, 0.34, 0.28, 0.32);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), blackMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.5, 0.23), blackMat);
    upperArm.position.y = -0.42;
    shoulder.add(upperArm);

    this.addPanelLine(shoulder, { x: 0, y: -0.42, z: 0.12 }, { x: 0.18, y: 0.36, z: 0.01 });
    this.addBoltRow(shoulder, { x: side * 0.1, y: -0.18, z: 0.13 }, { x: side * 0.1, y: -0.6, z: 0.13 }, 4);

    const elbow = new THREE.Group();
    elbow.position.y = -0.72;
    shoulder.add(elbow);

    this.addBallJoint(elbow, { x: 0, y: 0, z: 0 }, 0.085, 0x0a0a0a);
    this.addElbowGuard(elbow, 0x6c1c9c, 0.16);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.5, 0.21), purpleMat);
    lowerArm.position.y = -0.3;
    elbow.add(lowerArm);

    this.addHydraulic(elbow, { x: side * 0.1, y: -0.05, z: 0 }, { x: side * 0.1, y: -0.4, z: 0 }, 0.038, 0x333333);
    this.addBoltRow(elbow, { x: side * 0.09, y: -0.08, z: 0.12 }, { x: side * 0.09, y: -0.5, z: 0.12 }, 3);

    this.addHandFingers(elbow, 0x151515, 0x0a0a0a, 1.25);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, blackMat, purpleMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.34, 0.85, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.6, 0.3), blackMat);
    thigh.position.y = -0.32;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.68;
    hip.add(knee);

    this.addBallJoint(knee, { x: 0, y: 0, z: 0 }, 0.09, 0x0a0a0a);
    this.addKneeGuard(knee, 0x151515, 0x6c1c9c, 0.26);

    // 履带小腿
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.56, 0.34), darkMat);
    shin.position.y = -0.3;
    knee.add(shin);

    // 履带轮
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10), darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, -0.1 - i * 0.14, 0.02);
      knee.add(wheel);
    }

    const trackLink = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.38), purpleMat);
    trackLink.position.set(0, -0.62, 0.02);
    knee.add(trackLink);
    this.addBoltRow(knee, { x: side * 0.12, y: -0.1, z: 0.2 }, { x: side * 0.12, y: -0.55, z: 0.2 }, 3);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.46), darkMat);
    foot.position.set(0, -0.74, 0.08);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
