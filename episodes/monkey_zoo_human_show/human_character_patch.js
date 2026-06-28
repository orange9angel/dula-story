// ─────────────────────────────────────────────────────────────────────────────
// HumanCharacter — 幽游白书风格的高关节人类角色
// ─────────────────────────────────────────────────────────────────────────────

class HumanCharacter extends CharacterBase {
  static get skinColor() { return 0xf1c7a5; }
  static get hairColor() { return 0x2d2018; }
  static get shirtColor() { return 0xffffff; }
  static get pantsColor() { return 0x263238; }
  static get height() { return 1.72; }
  static get shoulderWidth() { return 1.0; }
  static get build() { return 'slim'; } // slim / athletic / bulky

  constructor(name) {
    super(name);
    this.archetypes = ['humanoid', 'teenager', 'fighter'];
    this.boundingRadius = 0.5;
    this.baseY = 0.01;
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'LookAround', 'PointForward', 'CrossArms',
      'Nod', 'WaveHand', 'HandsOnHips', 'Celebrate', 'ReachOut',
      'TurnAround', 'Bow', 'FightingStance', 'Crouch',
      'TakePhoto', 'KnockGlass', 'SelfiePose', 'EatPopcorn',
      'Laugh', 'Surprised', 'AngryShake', 'Shrug',
      'Facepalm', 'Stare', 'StepBack', 'SlowNod',
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

    const skinMat = createSkinMaterial(skinColor);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.75 });
    const shirtMat = createClothMaterial(shirtColor);
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82 });

    const torsoScale = build === 'bulky' ? 1.15 : build === 'athletic' ? 1.05 : 0.95;

    // Torso — 扁长方体，微微前倾像少年站姿
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.38 * torsoScale * shoulderWidth, 0.58, 0.22),
      shirtMat
    );
    torso.position.y = h * 0.55;
    torso.castShadow = true;
    this.mesh.add(torso);
    this.torso = torso;

    // 领口露出的皮肤
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), skinMat);
    neck.position.y = h * 0.83;
    this.mesh.add(neck);

    // Head group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, h * 0.92, 0);
    this.mesh.add(this.headGroup);

    this.buildHead(this.headGroup, skinMat, hairMat);

    // Arms and legs with full 13-joint hierarchy
    this.addArms(skinMat, shirtMat, h, shoulderWidth);
    this.addLegs(skinMat, pantsMat, h);

    this._captureFaceBaseState();
  }

  buildHead(headGroup, skinMat, hairMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 18), skinMat);
    head.scale.set(0.9, 1.05, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // 默认短发 — 子类可 override 做幽游白书发型
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
    // Flat disc eyes that sit flush on the face instead of bulging spheres.
    // Spherical sclera read as floating eyeballs / glasses, especially at
    // oblique angles and on small heads.
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide });
    const pupilMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.FrontSide });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.FrontSide });
    const eyeScale = 1.0;
    const eyeZ = 0.132; // sit just proud of the 0.14 sphere head
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.044, 0.022, eyeZ);
      headGroup.add(eyeGroup);

      // Flat sclera disc (no depth bulge)
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.024 * eyeScale, 16), eyeWhiteMat);
      sclera.scale.set(1, 1.1, 1);
      eyeGroup.add(sclera);

      // Flat pupil disc slightly in front of sclera
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.011 * eyeScale, 12), pupilMat);
      pupil.position.z = 0.0012;
      pupil.userData.baseX = 0;
      pupil.userData.baseY = 0;
      eyeGroup.add(pupil);

      // Tiny highlight
      const highlight = new THREE.Mesh(new THREE.CircleGeometry(0.004 * eyeScale, 8), highlightMat);
      highlight.position.set(0.008 * eyeScale, 0.008 * eyeScale, 0.0018);
      eyeGroup.add(highlight);

      if (side === -1) this.leftEyeGroup = eyeGroup;
      else this.rightEyeGroup = eyeGroup;
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;
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
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), createSkinMaterial(color));
    nose.position.set(0, 0.01, 0.125);
    nose.scale.set(0.8, 1, 0.6);
    headGroup.add(nose);
  }

  _addMouth(headGroup, color) {
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
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

      // Sleeve
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
        new THREE.BoxGeometry(0.05, 0.06, 0.03),
        skinMat
      );
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
    const thighLen = 0.36;
    const shinLen = 0.38;
    const legWidth = 0.08;

    for (const side of [-1, 1]) {
      const hipGroup = new THREE.Group();
      hipGroup.position.set(side * 0.1, h * 0.32, 0);

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

// 幽助风格：热血少年，黑发刺猬头，绿校服裤
class VisitorYusuke extends HumanCharacter {
  static get hairColor() { return 0x1a1a1a; }
  static get shirtColor() { return 0xf5f5f5; }
  static get pantsColor() { return 0x2e7d4a; } // 幽助绿裤
  static get height() { return 1.68; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // 刺猬头：多个小尖刺
    for (let i = 0; i < 12; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.12, 6),
        hairMat
      );
      const angle = (i / 12) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.08, 0.15 + Math.random() * 0.03, Math.sin(angle) * 0.08);
      spike.rotation.x = (Math.random() - 0.5) * 0.6;
      spike.rotation.z = (Math.random() - 0.5) * 0.6;
      headGroup.add(spike);
    }
  }
}

// 藏马风格：红发优雅少年，拿相机
class VisitorKurama extends HumanCharacter {
  static get hairColor() { return 0xa83232; }
  static get shirtColor() { return 0xeeeeee; }
  static get pantsColor() { return 0x3d4f8f; }
  static get height() { return 1.76; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // 中长发，两侧垂下
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.028, 0.22, 6, 8),
        hairMat
      );
      lock.position.set(side * 0.12, -0.02, 0.02);
      lock.rotation.z = side * 0.15;
      headGroup.add(lock);
    }
    // 头顶蓬松
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), hairMat);
    top.scale.set(1, 0.45, 0.9);
    top.position.y = 0.13;
    headGroup.add(top);
  }
}

// 飞影风格：黑衣冷面，抱臂
class VisitorHiei extends HumanCharacter {
  static get hairColor() { return 0x111111; }
  static get skinColor() { return 0xf5d0c5; }
  static get shirtColor() { return 0x1a1a1a; }
  static get pantsColor() { return 0x1a1a1a; }
  static get height() { return 1.58; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // 黑色短发，上扬
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 6), hairMat);
      const angle = -0.6 + (i / 7) * 1.2;
      spike.position.set(Math.sin(angle) * 0.08, 0.14, Math.cos(angle) * 0.08);
      spike.rotation.x = -0.4;
      spike.rotation.z = angle * 0.5;
      headGroup.add(spike);
    }
  }
}

// 桑原风格：金发飞机头，夸张
class VisitorKuwabara extends HumanCharacter {
  static get hairColor() { return 0xd4a863; }
  static get shirtColor() { return 0x264653; }
  static get pantsColor() { return 0x5c4033; }
  static get height() { return 1.8; }
  static get build() { return 'bulky'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // 飞机头：前额高耸
    const pompadour = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.12), hairMat);
    pompadour.position.set(0, 0.18, 0.06);
    pompadour.rotation.x = -0.2;
    headGroup.add(pompadour);
    // 两侧鬓角
    for (const side of [-1, 1]) {
      const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.04), hairMat);
      sideburn.position.set(side * 0.13, -0.02, 0.04);
      headGroup.add(sideburn);
    }
  }
}

// 萤子风格：棕发马尾少女
class VisitorKeiko extends HumanCharacter {
  static get hairColor() { return 0x5c3a2a; }
  static get skinColor() { return 0xf5d0c5; }
  static get shirtColor() { return 0xe8b4b4; }
  static get pantsColor() { return 0x4a6fa5; }
  static get height() { return 1.58; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // 马尾
    const ponytail = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.32, 8, 10), hairMat);
    ponytail.position.set(0, -0.02, -0.14);
    ponytail.rotation.x = -0.4;
    headGroup.add(ponytail);
    // 刘海
    for (let i = 0; i < 5; i++) {
      const bang = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.015), hairMat);
      bang.position.set((i - 2) * 0.04, 0.1, 0.12);
      bang.rotation.x = -0.3;
      headGroup.add(bang);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Human animations
// ─────────────────────────────────────────────────────────────────────────────

class TakePhoto extends AnimationBase {
  constructor(options = {}) {
    super('TakePhoto', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const raise = Math.min(1, t * 3) * (1 - Math.max(0, t - 0.7) * 3.3);
    pose.rightShoulder = { rx: -1.4 * raise, ry: 0.2 * raise };
    pose.rightElbow = { rx: -0.5 * raise };
    pose.rightWrist = { ry: -0.3 * raise };
    pose.headGroup = { rx: -0.15 * raise, ry: 0.1 * raise };
    return pose;
  }
}

class KnockGlass extends AnimationBase {
  constructor(options = {}) {
    super('KnockGlass', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const cycle = Math.sin(t * Math.PI * 6) * Math.exp(-t * 2);
    pose.rightShoulder = { rx: -0.9, ry: -0.3 };
    pose.rightElbow = { rx: -1.6 };
    pose.rightWrist = { rx: cycle * 0.25 };
    pose.headGroup = { rx: -0.1 };
    return pose;
  }
}

class SelfiePose extends AnimationBase {
  constructor(options = {}) {
    super('SelfiePose', positiveNumber(options.duration, 1.8));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const hold = Math.min(1, t * 2);
    pose.rightShoulder = { rx: -1.5 * hold, ry: 0.4 * hold };
    pose.rightElbow = { rx: -0.3 * hold };
    pose.rightWrist = { ry: -0.5 * hold };
    pose.leftShoulder = { rx: -0.3 * hold, ry: -0.2 * hold };
    pose.headGroup = { rx: -0.2 * hold, ry: -0.15 * hold };
    return pose;
  }
}

class EatPopcorn extends AnimationBase {
  constructor(options = {}) {
    super('EatPopcorn', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const scoop = (t % 0.5) / 0.5;
    pose.rightShoulder = { rx: -0.8 - scoop * 0.3, ry: 0.2 };
    pose.rightElbow = { rx: -1.4 - scoop * 0.3 };
    pose.rightWrist = { rx: -0.4 * Math.sin(scoop * Math.PI) };
    pose.headGroup = { rx: 0.05 * Math.sin(scoop * Math.PI) };
    return pose;
  }
}

class Laugh extends AnimationBase {
  constructor(options = {}) {
    super('Laugh', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const bounce = Math.sin(t * Math.PI * 4) * 0.08;
    pose.mesh = { ry: bounce, rx: -0.08 * Math.abs(bounce) };
    pose.leftShoulder = { rx: -0.6, rz: -0.3 };
    pose.rightShoulder = { rx: -0.6, rz: 0.3 };
    pose.leftElbow = { rx: -0.8 };
    pose.rightElbow = { rx: -0.8 };
    pose.headGroup = { rx: -0.15, ry: bounce * 0.5 };
    return pose;
  }
}

class Surprised extends AnimationBase {
  constructor(options = {}) {
    super('Surprised', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.exp(-t * 2);
    pose.headGroup = { rx: -0.25 * amp, ry: 0 };
    pose.rightShoulder = { rx: -0.4 * amp, ry: 0.3 * amp };
    pose.leftShoulder = { rx: -0.4 * amp, ry: -0.3 * amp };
    pose.rightElbow = { rx: -0.8 * amp };
    pose.leftElbow = { rx: -0.8 * amp };
    return pose;
  }
}

class AngryShake extends AnimationBase {
  constructor(options = {}) {
    super('AngryShake', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const shake = Math.sin(t * Math.PI * 10) * 0.08 * (1 - t);
    pose.headGroup = { ry: shake, rx: 0.05 };
    pose.rightShoulder = { rx: -0.5, ry: -0.4 };
    pose.rightElbow = { rx: -1.0 };
    pose.rightWrist = { ry: shake * 2 };
    return pose;
  }
}

class Shrug extends AnimationBase {
  constructor(options = {}) {
    super('Shrug', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.sin(t * Math.PI) * 0.5 + 0.5;
    pose.leftShoulder = { rz: 0.35 * amp };
    pose.rightShoulder = { rz: -0.35 * amp };
    pose.headGroup = { rx: 0.1 * amp };
    return pose;
  }
}
