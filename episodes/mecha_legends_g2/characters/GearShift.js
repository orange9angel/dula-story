import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Gear-Shift — 蓝色重型卡车机器人，Steel Guard 力量担当
 * 忠诚、沉稳，载具形态为蓝色越野卡车。
 */
export class GearShift extends RobotCharacterBase {
  constructor(name) {
    super(name || 'GearShift');
    this.boundingRadius = 0.65;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'slow', 'strong'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
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

    // 机器人形态
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.45), blueMat);
    torso.position.y = 1.45;
    torso.castShadow = true;
    this.robotGroup.add(torso);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.06), silverMat);
    grille.position.set(0, 1.5, 0.24);
    this.robotGroup.add(grille);

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.3), darkMat);
    waist.position.y = 0.92;
    this.robotGroup.add(waist);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.0, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.3), blueMat);
    this.headGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.05), visorMat);
    visor.position.set(0, 0.03, 0.16);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), darkMat);
    this.mouth.position.set(0, -0.12, 0.16);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, blueMat, silverMat, darkMat);
    this._addArm(1, blueMat, silverMat, darkMat);
    this._addLeg(-1, blueMat, silverMat, darkMat);
    this._addLeg(1, blueMat, silverMat, darkMat);

    // 载具形态 — 蓝色卡车
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 1.8), blueMat);
    chassis.position.y = 0.5;
    this.vehicleGroup.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.7), blueMat);
    cabin.position.set(0, 0.9, 0.35);
    this.vehicleGroup.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.05), this.createGlowMaterial(0x88ccff));
    windshield.position.set(0, 1.0, 0.71);
    this.vehicleGroup.add(windshield);

    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const wheelPos = [
      [-0.52, 0.28, 0.55], [0.52, 0.28, 0.55],
      [-0.52, 0.28, -0.55], [0.52, 0.28, -0.55],
      [-0.52, 0.28, 0], [0.52, 0.28, 0],
    ];
    for (const [x, y, z] of wheelPos) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      this.vehicleGroup.add(wheel);
    }

    const headlightMat = this.createGlowMaterial(0xffffaa);
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.05), headlightMat);
      light.position.set(side * 0.28, 0.6, 0.91);
      this.vehicleGroup.add(light);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, mainMat, silverMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.55, 1.7, 0);
    this.robotGroup.add(shoulder);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), mainMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), mainMat);
    upperArm.position.y = -0.35;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.62;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), silverMat);
    lowerArm.position.y = -0.25;
    elbow.add(lowerArm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), darkMat);
    hand.position.y = -0.55;
    elbow.add(hand);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, mainMat, silverMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.28, 0.82, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.26), mainMat);
    thigh.position.y = -0.28;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.58;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.24), silverMat);
    shin.position.y = -0.28;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.36), darkMat);
    foot.position.set(0, -0.62, 0.06);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
