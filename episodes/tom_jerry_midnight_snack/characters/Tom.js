import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

function toonMaterial(color, options = {}) {
  return new THREE.MeshToonMaterial({ color, ...options });
}

function addSegment(parent, length, radius, material, y = -length / 2) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 4, 12),
    material,
  );
  mesh.position.y = y;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * Episode-local, procedural cartoon cat.
 *
 * The rig deliberately exposes the standard Dula joints so common pose-matrix
 * animations and later episode-specific chase animations can share one model.
 */
export class Tom extends CharacterBase {
  constructor(name = 'Tom') {
    super(name);
    this.archetypes = ['humanoid', 'cartoon-animal', 'feline', 'agile'];
    this.boundingRadius = 0.72;
    this.baseY = 0.02;
    this.trustedBodyAnimations = [
      'Walk', 'Run', 'LookAround', 'ReachOut', 'PointForward', 'ShakeHead',
      'Nod', 'Think', 'Crouch', 'Jump', 'SurprisedJump', 'FlailArms',
      'StompFoot', 'HitStagger', 'Knockdown', 'GetUp', 'FaceAngry',
      'FaceConfused', 'FaceHappy', 'FacePain', 'FaceSmirk', 'FaceSurprised',
    ];
    this.semanticPerformanceProfile = {
      contempt: { emotion: 'smile', action: 'CrossArms', intensity: 0.55, layer: 'upper' },
      panic: { emotion: 'fear', action: 'CatSlip', intensity: 0.9, layer: 'full' },
      despair: { emotion: 'sad', action: 'CatDoom', intensity: 0.85, layer: 'full' },
    };
    // Do not install an allowlist yet: the episode bootstrap adds chase-specific
    // animations after the character class is constructed.
    this.allowedBodyAnimations = null;
  }

  build() {
    const fur = toonMaterial(0x586d7d);
    const darkFur = toonMaterial(0x344754);
    const lightFur = toonMaterial(0xdde5e3);
    const innerEar = toonMaterial(0xe99aa2);
    const black = toonMaterial(0x17191b);
    const noseMat = toonMaterial(0xb75b67);
    const eyeWhite = toonMaterial(0xfffdf2);
    const irisMat = toonMaterial(0xb6d95c);
    const collarMat = toonMaterial(0xb82d36);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.52, 6, 18), fur);
    body.name = 'TomTorso';
    body.position.y = 0.94;
    body.scale.set(1.0, 1.04, 0.82);
    body.castShadow = true;
    this.mesh.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 16), lightFur);
    belly.name = 'TomBelly';
    belly.position.set(0, 0.94, 0.265);
    belly.scale.set(0.78, 1.22, 0.28);
    this.mesh.add(belly);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 24), collarMat);
    collar.name = 'TomCollar';
    collar.position.set(0, 1.30, 0);
    collar.rotation.x = Math.PI / 2;
    this.mesh.add(collar);

    this.headGroup = new THREE.Group();
    this.headGroup.name = 'TomHead';
    this.headGroup.position.set(0, 1.63, 0.02);
    this.headBaseY = this.headGroup.position.y;
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 20), fur);
    head.scale.set(0.94, 1.0, 0.86);
    head.castShadow = true;
    this.headGroup.add(head);

    this.earGroups = [];
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.name = side < 0 ? 'TomLeftEar' : 'TomRightEar';
      earGroup.position.set(side * 0.27, 0.35, -0.015);
      earGroup.rotation.z = -side * 0.12;

      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.43, 3), darkFur);
      outer.rotation.y = Math.PI;
      outer.castShadow = true;
      earGroup.add(outer);

      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.28, 3), innerEar);
      inner.position.set(0, -0.012, 0.035);
      inner.rotation.y = Math.PI;
      earGroup.add(inner);

      this.headGroup.add(earGroup);
      this.earGroups.push(earGroup);
    }

    // ── 更夸张的脸部：大眼睛、可动粗眉毛、胶囊嘴、鼓脸颊 ──
    const cheekGeo = new THREE.SphereGeometry(0.21, 18, 14);
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo, lightFur);
      cheek.position.set(side * 0.155, -0.12, 0.345);
      cheek.scale.set(1.05, 0.78, 0.62);
      cheek.name = side < 0 ? 'TomLeftCheek' : 'TomRightCheek';
      this.headGroup.add(cheek);
    }

    const eyeRadius = 0.16;
    const eyeScale = new THREE.Vector3(0.88, 1.38, 0.55);
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.name = side < 0 ? 'TomLeftEye' : 'TomRightEye';
      eyeGroup.position.set(side * 0.152, 0.095, 0.365);

      const white = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 22, 18), eyeWhite);
      white.name = side < 0 ? 'TomLeftEyeWhite' : 'TomRightEyeWhite';
      white.scale.copy(eyeScale);
      eyeGroup.add(white);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), irisMat);
      iris.name = side < 0 ? 'TomLeftIris' : 'TomRightIris';
      iris.position.set(0, -0.02, 0.075);
      iris.scale.set(0.85, 1.18, 0.46);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), black);
      pupil.name = side < 0 ? 'TomLeftPupil' : 'TomRightPupil';
      pupil.position.set(0, -0.026, 0.112);
      pupil.scale.set(0.6, 1.18, 0.44);
      pupil.userData.baseX = 0;
      pupil.userData.baseY = pupil.position.y;
      pupil.userData.eyeRadius = 0.12;
      eyeGroup.add(pupil);

      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeWhite);
      highlight.name = side < 0 ? 'TomLeftEyeHighlight' : 'TomRightEyeHighlight';
      highlight.position.set(-side * 0.016, 0.02, 0.138);
      eyeGroup.add(highlight);

      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(eyeRadius, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        fur,
      );
      eyelid.name = side < 0 ? 'TomLeftEyelid' : 'TomRightEyelid';
      eyelid.scale.copy(eyeScale);
      eyelid.visible = false;
      eyeGroup.add(eyelid);

      if (side < 0) {
        this.leftEyeGroup = eyeGroup;
        this.leftPupil = pupil;
        this.leftEyelid = eyelid;
        this.leftEyelidBaseY = eyelid.position.y;
        this.leftEyelidBaseScaleY = eyelid.scale.y;
      } else {
        this.rightEyeGroup = eyeGroup;
        this.rightPupil = pupil;
        this.rightEyelid = eyelid;
        this.rightEyelidBaseY = eyelid.position.y;
        this.rightEyelidBaseScaleY = eyelid.scale.y;
      }
      this.headGroup.add(eyeGroup);
    }

    const browGeo = new THREE.CapsuleGeometry(0.02, 0.18, 4, 8);
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(browGeo, darkFur);
      brow.name = side < 0 ? 'TomLeftEyebrow' : 'TomRightEyebrow';
      brow.position.set(side * 0.165, 0.285, 0.388);
      brow.rotation.z = Math.PI / 2 - side * 0.08;
      this.headGroup.add(brow);
      if (side < 0) {
        this.leftEyebrow = brow;
        this.leftBrow = brow;
      } else {
        this.rightEyebrow = brow;
        this.rightBrow = brow;
      }
    }
    this.leftBrowBaseY = this.leftEyebrow.position.y;
    this.rightBrowBaseY = this.rightEyebrow.position.y;

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 10), noseMat);
    nose.name = 'TomNose';
    nose.position.set(0, -0.095, 0.482);
    nose.scale.set(1.15, 0.75, 0.72);
    this.headGroup.add(nose);

    // Flattened sphere keeps the standard mouth axes: X=width, Y=open/close.
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), black);
    this.mouth.name = 'TomMouth';
    this.mouth.position.set(0, -0.245, 0.425);
    this.mouth.scale.set(1.0, 0.18, 0.34);
    this.mouthVisual = this.mouth;
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = this.mouth.scale.x;
    this.mouthBaseScaleY = this.mouth.scale.y;
    this.mouthBaseScaleZ = this.mouth.scale.z;
    this.mouthBaseY = this.mouth.position.y;

    // 捕获完整面部基线，供 FaceReset 使用
    this._captureFaceBaseState();

    const whiskerGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.37, 6);
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        const whisker = new THREE.Mesh(whiskerGeo, black);
        whisker.position.set(side * 0.28, -0.10 + i * 0.055, 0.405);
        whisker.rotation.z = Math.PI / 2 + side * i * 0.12;
        this.headGroup.add(whisker);
      }
    }

    this._buildArm(-1, fur, lightFur);
    this._buildArm(1, fur, lightFur);
    this._buildLeg(-1, fur, lightFur);
    this._buildLeg(1, fur, lightFur);
    this._buildTail(fur, darkFur);

    this.mesh.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
    });
    return this.mesh;
  }

  _buildArm(side, fur, pawMaterial) {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? 'TomLeftShoulder' : 'TomRightShoulder';
    shoulder.position.set(side * 0.39, 1.20, 0);
    shoulder.rotation.z = -side * 0.13;
    this.mesh.add(shoulder);

    const upperLength = 0.31;
    const lowerLength = 0.27;
    addSegment(shoulder, upperLength, 0.075, fur);

    const elbow = new THREE.Group();
    elbow.name = side < 0 ? 'TomLeftElbow' : 'TomRightElbow';
    elbow.position.y = -upperLength;
    shoulder.add(elbow);
    addSegment(elbow, lowerLength, 0.067, fur);

    const wrist = new THREE.Group();
    wrist.name = side < 0 ? 'TomLeftWrist' : 'TomRightWrist';
    wrist.position.y = -lowerLength;
    elbow.add(wrist);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), pawMaterial);
    paw.position.y = -0.035;
    paw.scale.set(1.05, 0.78, 1.12);
    wrist.add(paw);

    if (side < 0) {
      this.leftArm = shoulder;
      this.leftElbow = elbow;
      this.leftWrist = wrist;
    } else {
      this.rightArm = shoulder;
      this.rightElbow = elbow;
      this.rightWrist = wrist;
      this.rightArmLength = upperLength + lowerLength;
    }
  }

  _buildLeg(side, fur, footMaterial) {
    const hip = new THREE.Group();
    hip.name = side < 0 ? 'TomLeftHip' : 'TomRightHip';
    hip.position.set(side * 0.18, 0.68, 0);
    this.mesh.add(hip);

    const upperLength = 0.29;
    const lowerLength = 0.23;
    addSegment(hip, upperLength, 0.10, fur);

    const knee = new THREE.Group();
    knee.name = side < 0 ? 'TomLeftKnee' : 'TomRightKnee';
    knee.position.y = -upperLength;
    hip.add(knee);
    addSegment(knee, lowerLength, 0.085, fur);

    const ankle = new THREE.Group();
    ankle.name = side < 0 ? 'TomLeftAnkle' : 'TomRightAnkle';
    ankle.position.y = -lowerLength;
    knee.add(ankle);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), footMaterial);
    foot.position.set(0, -0.025, 0.075);
    foot.scale.set(0.88, 0.52, 1.42);
    ankle.add(foot);

    if (side < 0) {
      this.leftLeg = hip;
      this.leftKnee = knee;
      this.leftAnkle = ankle;
    } else {
      this.rightLeg = hip;
      this.rightKnee = knee;
      this.rightAnkle = ankle;
    }
  }

  _buildTail(fur, tipMaterial) {
    this.tail = new THREE.Group();
    this.tail.name = 'TomTail';
    this.tail.position.set(0, 0.88, -0.28);
    this.mesh.add(this.tail);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.18, 0.08, -0.11),
      new THREE.Vector3(0.39, 0.25, -0.09),
      new THREE.Vector3(0.48, 0.48, 0.01),
      new THREE.Vector3(0.40, 0.68, 0.08),
    ]);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.07, 10, false), fur);
    tailMesh.castShadow = true;
    this.tail.add(tailMesh);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), tipMaterial);
    tip.position.set(0.40, 0.68, 0.08);
    this.tail.add(tip);
    this.tail.userData.baseRotationZ = -0.08;
  }

  animateMouth(time, delta) {
    super.animateMouth(time, delta);
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.tail && !this.tail.userData.lockMotion) {
      this.tail.rotation.z = this.tail.userData.baseRotationZ + Math.sin(time * 2.4) * 0.10;
      this.tail.rotation.x = Math.sin(time * 1.7 + 0.8) * 0.045;
    }
    if (this.earGroups && !this.headGroup?.userData.lockEars) {
      const twitch = Math.max(0, Math.sin(time * 1.25 + 0.4)) ** 18 * 0.14;
      this.earGroups[0].rotation.x = twitch;
      this.earGroups[1].rotation.x = -twitch * 0.7;
    }
  }
}
