import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Overdrive — 黑色坦克机器人，Chrome Dominion 指挥官
 * 冷酷、威严，载具形态为重型履带坦克。
 */
export class Overdrive extends RobotCharacterBase {
  constructor(name) {
    super(name || 'Overdrive');
    this.boundingRadius = 0.7;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'slow', 'strong'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'PointForward', 'StompFoot',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const blackMat = this.createMetalMaterial(0x1a1a1a);
    const purpleMat = this.createMetalMaterial(0x6c1c9c);
    const darkMat = this.createDarkMetalMaterial(0x111111);
    const visorMat = this.createGlowMaterial(0xff0033);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // 机器人形态
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.55), blackMat);
    torso.position.y = 1.5;
    this.robotGroup.add(torso);

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.08), purpleMat);
    chestPlate.position.set(0, 1.55, 0.3);
    this.robotGroup.add(chestPlate);

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.35), darkMat);
    waist.position.y = 0.95;
    this.robotGroup.add(waist);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.1, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.32), blackMat);
    this.headGroup.add(head);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.34), purpleMat);
    helmet.position.y = 0.2;
    this.headGroup.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), visorMat);
    visor.position.set(0, 0.02, 0.17);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.03), darkMat);
    this.mouth.position.set(0, -0.13, 0.17);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, blackMat, purpleMat, darkMat);
    this._addArm(1, blackMat, purpleMat, darkMat);
    this._addLeg(-1, blackMat, purpleMat, darkMat);
    this._addLeg(1, blackMat, purpleMat, darkMat);

    // 载具形态 — 重型坦克
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 1.4), blackMat);
    hull.position.y = 0.45;
    this.vehicleGroup.add(hull);

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.25, 16), purpleMat);
    turret.position.y = 0.82;
    this.vehicleGroup.add(turret);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 12), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.82, 0.65);
    this.vehicleGroup.add(barrel);

    const trackMat = this.createDarkMetalMaterial(0x050505);
    for (const side of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 1.5), trackMat);
      track.position.set(side * 0.55, 0.32, 0);
      this.vehicleGroup.add(track);

      for (let i = 0; i < 6; i++) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 12), trackMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.55, 0.18, -0.55 + i * 0.22);
        this.vehicleGroup.add(wheel);
      }
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, mainMat, accentMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.6, 1.75, 0);
    this.robotGroup.add(shoulder);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mainMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), mainMat);
    upperArm.position.y = -0.4;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.7;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), accentMat);
    lowerArm.position.y = -0.28;
    elbow.add(lowerArm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), darkMat);
    hand.position.y = -0.6;
    elbow.add(hand);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, mainMat, accentMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.32, 0.85, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.3), mainMat);
    thigh.position.y = -0.3;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.65;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.28), accentMat);
    shin.position.y = -0.3;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.45), darkMat);
    foot.position.set(0, -0.68, 0.08);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
