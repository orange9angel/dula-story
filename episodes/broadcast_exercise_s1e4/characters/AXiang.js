import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

function simpleSkin(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.0 });
}
function simpleCloth(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
}

// 通用高关节人类角色（简化自 monkey_zoo_human_show/human_character_patch.js）
class HumanCharacter extends CharacterBase {
  static get skinColor() { return 0xf1c7a5; }
  static get hairColor() { return 0x2d2018; }
  static get shirtColor() { return 0xffffff; }
  static get pantsColor() { return 0x263238; }
  static get height() { return 1.74; }
  static get shoulderWidth() { return 1.0; }
  static get build() { return 'slim'; }

  constructor(name) {
    super(name);
    this.archetypes = ['humanoid', 'teenager'];
    this.boundingRadius = 0.5;
    this.baseY = 0.01;
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'LookAround', 'PointForward', 'CrossArms',
      'Nod', 'WaveHand', 'HandsOnHips', 'Celebrate', 'ReachOut',
      'TurnAround', 'Bow', 'FightingStance', 'Crouch',
    ]);
  }

  build() {
    const skinColor = this.constructor.skinColor;
    const hairColor = this.constructor.hairColor;
    const shirtColor = this.constructor.shirtColor;
    const pantsColor = this.constructor.pantsColor;
    const h = this.constructor.height;
    const shoulderWidth = this.constructor.shoulderWidth;
    const build = this.constructor.build;

    const skinMat = simpleSkin(skinColor);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.75 });
    const shirtMat = simpleCloth(shirtColor);
    const pantsMat = simpleCloth(pantsColor);

    const torsoScale = build === 'bulky' ? 1.15 : build === 'athletic' ? 1.05 : 0.95;

    // 圆润化躯干，避免正面看起来像正方形
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18 * torsoScale, 0.42, 8, 16),
      shirtMat
    );
    torso.scale.set(1.25 * shoulderWidth, 1.0, 0.65);
    torso.position.y = h * 0.55;
    torso.castShadow = true;
    this.mesh.add(torso);
    this.torso = torso;

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), skinMat);
    neck.position.y = h * 0.83;
    this.mesh.add(neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, h * 0.92, 0);
    this.mesh.add(this.headGroup);

    this.buildHead(this.headGroup, skinMat, hairMat);

    this.addArms(skinMat, shirtMat, h, shoulderWidth);
    this.addLegs(skinMat, pantsMat, h);

    this._captureFaceBaseState();
  }

  buildHead(headGroup, skinMat, hairMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 18), skinMat);
    head.scale.set(0.9, 1.05, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 14), hairMat);
    hair.scale.set(0.95, 0.55, 1.0);
    hair.position.y = 0.09;
    headGroup.add(hair);

    this._addEyes(headGroup, 0x1a1a1a);
    this._addEyebrows(headGroup, 0x1a1a1a);
    this._addNose(headGroup, 0x1a1a1a);
    this._addMouth(headGroup, 0x442222);
    this._addEars(headGroup, skinMat);
  }

  _addEyes(headGroup, color) {
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide });
    const pupilMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.FrontSide });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.FrontSide });
    const eyeZ = 0.132;
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.044, 0.022, eyeZ);
      headGroup.add(eyeGroup);

      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), eyeWhiteMat);
      sclera.scale.set(1, 1.1, 1);
      eyeGroup.add(sclera);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.011, 12), pupilMat);
      pupil.position.z = 0.0012;
      pupil.userData.baseX = 0;
      pupil.userData.baseY = 0;
      eyeGroup.add(pupil);

      const highlight = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), highlightMat);
      highlight.position.set(0.008, 0.008, 0.0018);
      eyeGroup.add(highlight);

      if (side === -1) {
        this.leftEyeGroup = eyeGroup;
        this.leftPupil = pupil;
      } else {
        this.rightEyeGroup = eyeGroup;
        this.rightPupil = pupil;
      }
    }
  }

  _addEyebrows(headGroup, color) {
    const browMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.008), browMat);
      brow.position.set(side * 0.05, 0.055, 0.12);
      brow.rotation.z = side * 0.1;
      headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }
  }

  _addNose(headGroup, color) {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), simpleSkin(color));
    nose.position.set(0, 0.01, 0.125);
    nose.scale.set(0.8, 1, 0.6);
    headGroup.add(nose);
  }

  _addMouth(headGroup, color) {
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 10),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 })
    );
    mouth.position.set(0, -0.04, 0.12);
    mouth.scale.set(1.4, 0.5, 0.6);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.4;
    this.mouthBaseScaleY = 0.5;
    this.mouthBaseScaleZ = 0.6;
  }

  _addEars(headGroup, skinMat) {
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), skinMat);
      ear.position.set(side * 0.13, 0, 0);
      ear.scale.set(0.6, 1, 0.5);
      headGroup.add(ear);
    }
  }

  addArms(skinMat, shirtMat, h, shoulderWidth) {
    const upperLen = 0.28;
    const lowerLen = 0.26;
    const armWidth = 0.07;

    const addArm = (clavicleX, shoulderX, isRight) => {
      const clavicleGroup = new THREE.Group();
      clavicleGroup.position.set(clavicleX, h * 0.78, 0.02);

      const shoulderGroup = new THREE.Group();
      shoulderGroup.position.set(shoulderX - clavicleX, 0, 0);
      clavicleGroup.add(shoulderGroup);

      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(armWidth, upperLen, 8, 10),
        skinMat
      );
      upperArm.position.y = -upperLen / 2;
      upperArm.castShadow = true;
      shoulderGroup.add(upperArm);

      const sleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(armWidth * 1.08, upperLen * 0.35, 8, 10),
        shirtMat
      );
      sleeve.position.y = -upperLen * 0.22;
      shoulderGroup.add(sleeve);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.y = -upperLen;
      shoulderGroup.add(elbowGroup);

      const elbowTwistGroup = new THREE.Group();
      elbowGroup.add(elbowTwistGroup);

      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(armWidth * 0.88, lowerLen, 8, 10),
        skinMat
      );
      forearm.position.y = -lowerLen / 2;
      forearm.castShadow = true;
      elbowTwistGroup.add(forearm);

      const wristGroup = new THREE.Group();
      wristGroup.position.y = -lowerLen;
      elbowTwistGroup.add(wristGroup);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        skinMat
      );
      hand.scale.set(1.0, 1.25, 0.8);
      hand.position.y = -0.04;
      wristGroup.add(hand);

      this.mesh.add(clavicleGroup);
      if (isRight) {
        this.rightClavicle = clavicleGroup;
        this.rightArm = shoulderGroup;
        this.rightElbow = elbowGroup;
        this.rightElbowTwist = elbowTwistGroup;
        this.rightWrist = wristGroup;
        this.rightArmLength = upperLen + lowerLen;
      } else {
        this.leftClavicle = clavicleGroup;
        this.leftArm = shoulderGroup;
        this.leftElbow = elbowGroup;
        this.leftElbowTwist = elbowTwistGroup;
        this.leftWrist = wristGroup;
        this.leftArmLength = upperLen + lowerLen;
      }
    };

    const sx = 0.18 * shoulderWidth;
    addArm(-sx * 0.5, -sx, false);
    addArm(sx * 0.5, sx, true);
  }

  addLegs(skinMat, pantsMat, h) {
    const thighLen = 0.28;
    const shinLen = 0.30;
    const legWidth = 0.08;

    for (const side of [-1, 1]) {
      const hipGroup = new THREE.Group();
      hipGroup.position.set(side * 0.1, h * 0.36, 0);

      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(legWidth, thighLen, 8, 10),
        pantsMat
      );
      thigh.position.y = -thighLen / 2;
      thigh.castShadow = true;
      hipGroup.add(thigh);

      const kneeGroup = new THREE.Group();
      kneeGroup.position.y = -thighLen;
      hipGroup.add(kneeGroup);

      const kneeTwistGroup = new THREE.Group();
      kneeGroup.add(kneeTwistGroup);

      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(legWidth * 0.85, shinLen, 8, 10),
        pantsMat
      );
      shin.position.y = -shinLen / 2;
      shin.castShadow = true;
      kneeTwistGroup.add(shin);

      const ankleGroup = new THREE.Group();
      ankleGroup.position.y = -shinLen;
      kneeTwistGroup.add(ankleGroup);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
      );
      foot.position.set(0, -0.03, 0.04);
      ankleGroup.add(foot);

      this.mesh.add(hipGroup);
      if (side === 1) {
        this.rightLeg = hipGroup;
        this.rightKnee = kneeGroup;
        this.rightKneeTwist = kneeTwistGroup;
        this.rightAnkle = ankleGroup;
      } else {
        this.leftLeg = hipGroup;
        this.leftKnee = kneeGroup;
        this.leftKneeTwist = kneeTwistGroup;
        this.leftAnkle = ankleGroup;
      }
    }
  }
}

// 阿翔：动物园里的普通男游客，穿浅色衬衫和牛仔裤
export default class AXiang extends HumanCharacter {
  static get skinColor() { return 0xf1c7a5; }
  static get hairColor() { return 0x2d2018; }
  static get shirtColor() { return 0xe8e4dc; }
  static get pantsColor() { return 0x3d566e; }
  static get height() { return 1.76; }
  static get build() { return 'athletic'; }

  constructor() {
    super('阿翔');
    this.displayName = '阿翔';
    this.bio = '动物园的普通男游客，被拉来凑数做广播体操。';
    this.allowedBodyAnimations.add('BroadcastLegKickAXiang');
  }
}
