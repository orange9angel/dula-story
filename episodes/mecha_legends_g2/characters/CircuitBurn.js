import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Circuit-Burn — 橙色赛车机器人，Chrome Dominion 突击手
 * 暴躁、冲动，载具形态为橙色改装赛车。
 */
export class CircuitBurn extends RobotCharacterBase {
  constructor(name) {
    super(name || 'CircuitBurn');
    this.boundingRadius = 0.52;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'agile'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'Jump', 'PointForward',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const orangeMat = this.createMetalMaterial(0xe67e22);
    const yellowMat = this.createMetalMaterial(0xf1c40f);
    const darkMat = this.createDarkMetalMaterial(0x2c3e50);
    const visorMat = this.createGlowMaterial(0xff5500);

    this.robotGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.mesh.add(this.robotGroup);
    this.mesh.add(this.vehicleGroup);

    // 机器人形态
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.32), orangeMat);
    torso.position.y = 1.32;
    this.robotGroup.add(torso);

    const flameDecal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.34), yellowMat);
    flameDecal.position.set(0, 1.4, 0);
    this.robotGroup.add(flameDecal);

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.22), darkMat);
    waist.position.y = 0.88;
    this.robotGroup.add(waist);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.78, 0);
    this.robotGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), orangeMat);
    this.headGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05), visorMat);
    visor.position.set(0, 0.02, 0.14);
    this.headGroup.add(visor);

    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.03), darkMat);
    this.mouth.position.set(0, -0.1, 0.14);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = 1; this.mouthBaseScaleY = 1; this.mouthBaseScaleZ = 1;

    this._addArm(-1, orangeMat, yellowMat, darkMat);
    this._addArm(1, orangeMat, yellowMat, darkMat);
    this._addLeg(-1, orangeMat, yellowMat, darkMat);
    this._addLeg(1, orangeMat, yellowMat, darkMat);

    // 载具形态 — 橙色赛车
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 1.35), orangeMat);
    body.position.y = 0.28;
    this.vehicleGroup.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.05, 1.1), yellowMat);
    stripe.position.set(0, 0.4, 0);
    this.vehicleGroup.add(stripe);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.45), this.createGlowMaterial(0x222222));
    cockpit.position.set(0, 0.42, -0.05);
    this.vehicleGroup.add(cockpit);

    const wheelMat = this.createDarkMetalMaterial(0x1a1a1a);
    const wheelPos = [
      [-0.36, 0.16, 0.42], [0.36, 0.16, 0.42],
      [-0.36, 0.16, -0.42], [0.36, 0.16, -0.42],
    ];
    for (const [x, y, z] of wheelPos) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      this.vehicleGroup.add(wheel);
    }

    const flameMat = this.createGlowMaterial(0xff3300);
    for (const side of [-1, 1]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2), flameMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side * 0.18, 0.32, -0.72);
      this.vehicleGroup.add(exhaust);
    }

    this.addOutlines(this.robotGroup);
    this.addOutlines(this.vehicleGroup);
    this.setMode('robot');
  }

  _addArm(side, mainMat, accentMat, darkMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.42, 1.52, 0);
    this.robotGroup.add(shoulder);

    const shoulderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), mainMat);
    shoulder.add(shoulderMesh);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), mainMat);
    upperArm.position.y = -0.3;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.52;
    shoulder.add(elbow);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), accentMat);
    lowerArm.position.y = -0.22;
    elbow.add(lowerArm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), darkMat);
    hand.position.y = -0.46;
    elbow.add(hand);

    if (side === -1) { this.leftArm = shoulder; this.leftElbow = elbow; }
    else { this.rightArm = shoulder; this.rightElbow = elbow; }
  }

  _addLeg(side, mainMat, accentMat, darkMat) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.22, 0.82, 0);
    this.robotGroup.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), mainMat);
    thigh.position.y = -0.21;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.16), accentMat);
    shin.position.y = -0.21;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.26), darkMat);
    foot.position.set(0, -0.48, 0.05);
    knee.add(foot);

    if (side === -1) { this.leftLeg = hip; this.leftKnee = knee; }
    else { this.rightLeg = hip; this.rightKnee = knee; }
  }
}
