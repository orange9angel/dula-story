import * as THREE from 'three';
import { RobotCharacterBase } from './RobotCharacterBase.js';

/**
 * Overdrive — 黑色坦克机器人，克洛斯公司 指挥官
 * 冷酷、威严，载具形态为重型履带坦克。
 */
export class Overdrive extends RobotCharacterBase {
  constructor(name) {
    super(name || '维克');
    this.boundingRadius = 0.7;
    this.archetypes = ['humanoid', 'fighter', 'vehicle', 'slow', 'strong'];
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'Idle', 'LookAround', 'PointForward', 'StompFoot',
      'CrossArms', 'HandsOnHips', 'Nod', 'ShakeHead', 'LeftPunch', 'RightPunch',
      'Punch', 'Kick', 'Uppercut', 'SpinKick', 'ComboPunch', 'DashForward',
      'Block', 'Dodge', 'WeaveStep', 'CounterStance', 'AxeKick', 'JumpAttack',
      'JumpFlyingKick', 'HurricaneKick', 'DragonPunch', 'BackFist', 'SweepKick',
      'KneeStrike', 'AirTatsumaki', 'HeadStomp', 'KneeDrop', 'RollingThunder',
      'GalaxyWhirl', 'BlitzBall', 'Hadoken', 'UltraBeam', 'PlasmaRifle',
      'PlasmaRifleCharge', 'FightingStance', 'HitStagger', 'Knockdown', 'GetUp',
      'RobotTransform', 'RobotRevert'
    ]);
  }

  build() {
    const blackMat = this.createMetalMaterial(0x2a2a2a);
    const purpleMat = this.createMetalMaterial(0x7a22b0);
    const darkMat = this.createDarkMetalMaterial(0x1c1c1c);
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

    // 头部：重型指挥官头盔，前倾压迫感，窄眼，厚重眉骨，方颚甲
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.1, 0);
    this.robotGroup.add(this.headGroup);

    // 主头盔（厚重前倾）
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 0.34), blackMat);
    this.headGroup.add(cranium);

    // 顶部指挥冠
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.28), purpleMat);
    crown.position.set(0, 0.18, -0.02);
    this.headGroup.add(crown);

    // 眉骨装甲（厚重阴影）
    const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.10), purpleMat);
    browRidge.position.set(0, 0.12, 0.18);
    this.headGroup.add(browRidge);

    // 面甲
    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.04), blackMat);
    facePlate.position.set(0, -0.02, 0.18);
    this.headGroup.add(facePlate);

    // 下巴颚甲
    const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.18), blackMat);
    chinGuard.position.set(0, -0.22, 0.12);
    this.headGroup.add(chinGuard);

    // 双眼系统：窄长、眼角下压
    const eyeGlowMat = visorMat;
    const eyeWhiteMat = this.createDarkMetalMaterial(0x888888);
    for (const side of [-1, 1]) {
      const eyeX = side * 0.075;

      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(eyeX, 0.02, 0.18);
      this.headGroup.add(eyeGroup);
      if (side === -1) this.leftEyeGroup = eyeGroup;
      else this.rightEyeGroup = eyeGroup;

      const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.025, 0.012), eyeWhiteMat);
      eyeGroup.add(sclera);

      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), eyeGlowMat.clone());
      pupil.material.opacity = 0.95;
      pupil.position.z = 0.006;
      pupil.userData.baseX = pupil.position.x;
      pupil.userData.baseY = pupil.position.y;
      pupil.userData.eyeRadius = 0.02;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.018), darkMat);
      eyelid.position.set(eyeX, 0.04, 0.185);
      this.headGroup.add(eyelid);
      if (side === -1) this.leftEyelid = eyelid;
      else this.rightEyelid = eyelid;

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.018), purpleMat);
      brow.position.set(eyeX, 0.08, 0.185);
      brow.rotation.z = side * -0.08;
      this.headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }

    // 鼻凸（棱角分明）
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), darkMat);
    nose.position.set(0, -0.05, 0.195);
    this.headGroup.add(nose);

    // 下颌嘴：宽厚方嘴
    this.mouth = new THREE.Group();
    this.mouth.position.set(0, -0.13, 0.18);
    this.headGroup.add(this.mouth);
    this.mouthBaseRotationX = 0;

    const lipMat = this.createDarkMetalMaterial(0x1a1a1a);
    this.lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), lipMat);
    this.lowerLip.position.set(0, -0.02, 0.015);
    this.mouth.add(this.lowerLip);

    this.upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.04), lipMat);
    this.upperLip.position.set(0, -0.09, 0.19);
    this.headGroup.add(this.upperLip);

    const cavityMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    this.mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.03), cavityMat);
    this.mouthCavity.position.set(0, -0.105, 0.18);
    this.headGroup.add(this.mouthCavity);

    // 脸部补光：特写时五官清晰可见
    this.addFaceLight(this.headGroup, 0xddeeff, 2.0, 3.0, 1.5);

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
