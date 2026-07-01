import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Sky-Razor — 白色喷气战斗机机器人，Steel Guard 空中侦察兵
 * 话多、敏捷，载具形态为三角翼战斗机。
 */
export class SkyRazor extends RobotCharacterBase {
  constructor(name) {
    super(name || 'SkyRazor');
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

    // 机器人形态
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.3), whiteMat);
    torso.position.y = 1.35;
    this.robotGroup.add(torso);

    const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.31), redMat);
    chestStripe.position.set(0, 1.45, 0);
    this.robotGroup.add(chestStripe);

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.2), darkMat);
    waist.position.y = 0.9;
    this.robotGroup.add(waist);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.8, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.26), whiteMat);
    this.headGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.05), visorMat);
    visor.position.set(0, 0.02, 0.14);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.03), darkMat);
    this.mouth.position.set(0, -0.09, 0.14);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, whiteMat, redMat, darkMat);
    this._addArm(1, whiteMat, redMat, darkMat);
    this._addLeg(-1, whiteMat, redMat, darkMat);
    this._addLeg(1, whiteMat, redMat, darkMat);

    // 载具形态 — 三角翼喷气机
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 1.6), whiteMat);
    fuselage.position.y = 0.35;
    this.vehicleGroup.add(fuselage);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.5), this.createGlowMaterial(0x66aaff));
    cockpit.position.set(0, 0.55, 0.25);
    this.vehicleGroup.add(cockpit);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.9, -0.4);
    wingShape.lineTo(0.9, 0.4);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false });
    const wingMat = whiteMat;
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 0.12, 0.35, -0.1);
      wing.rotation.y = side * 0.1;
      if (side === -1) wing.rotation.z = Math.PI;
      this.vehicleGroup.add(wing);
    }

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.08), redMat);
    tail.position.set(0, 0.55, -0.75);
    this.vehicleGroup.add(tail);

    const engineMat = this.createGlowMaterial(0xff6600);
    for (const side of [-1, 1]) {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25), engineMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 0.18, 0.3, -0.85);
      this.vehicleGroup.add(engine);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, mainMat, accentMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.4, 1.55, 0);
    this.robotGroup.add(shoulder);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), mainMat);
    shoulder.add(shoulderMesh);

    const wingPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.25), accentMat);
    wingPanel.position.set(side * 0.05, -0.25, -0.05);
    shoulder.add(wingPanel);

    const elbow = new THREE.Group();
    elbow.position.y = -0.5;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), mainMat);
    lowerArm.position.y = -0.2;
    elbow.add(lowerArm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), darkMat);
    hand.position.y = -0.42;
    elbow.add(hand);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, mainMat, accentMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.85, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.16), mainMat);
    thigh.position.y = -0.2;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.4, 0.14), accentMat);
    shin.position.y = -0.2;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.22), darkMat);
    foot.position.set(0, -0.45, 0.05);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
