import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

function toonMaterial(color, options = {}) {
  return new THREE.MeshToonMaterial({ color, ...options });
}

function addSegment(parent, length, radius, material, y = -length / 2) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.008, length - radius * 2), 4, 10),
    material,
  );
  mesh.position.y = y;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Episode-local, procedural cartoon mouse with a complete Dula biped rig. */
export class Jerry extends CharacterBase {
  constructor(name = 'Jerry') {
    super(name);
    // "small" is intentional: the stock Run animation rejects the engine's
    // "tiny" archetype even though this character has a compatible biped rig.
    this.archetypes = ['humanoid', 'cartoon-animal', 'rodent', 'agile', 'small'];
    this.boundingRadius = 0.32;
    this.baseY = 0.02;
    this.trustedBodyAnimations = [
      'Walk', 'Run', 'LookAround', 'ReachOut', 'PointForward', 'ShakeHead',
      'Nod', 'Think', 'Crouch', 'Jump', 'SurprisedJump', 'FlailArms',
      'Celebrate', 'HitStagger', 'Knockdown', 'GetUp', 'FaceConfused',
      'FaceHappy', 'FacePain', 'FaceSmirk', 'FaceSurprised',
    ];
    this.allowedBodyAnimations = null;
  }

  build() {
    const fur = toonMaterial(0xa96b3d);
    const darkFur = toonMaterial(0x6e3f27);
    const bellyMat = toonMaterial(0xe8bd86);
    const innerEar = toonMaterial(0xf09aa2);
    const black = toonMaterial(0x171514);
    const noseMat = toonMaterial(0x3a2522);
    const eyeWhite = toonMaterial(0xfffdf2);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.22, 5, 14), fur);
    body.name = 'JerryTorso';
    body.position.y = 0.34;
    body.scale.set(0.94, 1.06, 0.84);
    body.castShadow = true;
    this.mesh.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), bellyMat);
    belly.name = 'JerryBelly';
    belly.position.set(0, 0.345, 0.115);
    belly.scale.set(0.80, 1.28, 0.30);
    this.mesh.add(belly);

    this.headGroup = new THREE.Group();
    this.headGroup.name = 'JerryHead';
    this.headGroup.position.set(0, 0.69, 0.015);
    this.headBaseY = this.headGroup.position.y;
    this.mesh.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.225, 20, 16), fur);
    head.scale.set(0.94, 0.96, 0.88);
    head.castShadow = true;
    this.headGroup.add(head);

    this.earGroups = [];
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.name = side < 0 ? 'JerryLeftEar' : 'JerryRightEar';
      earGroup.position.set(side * 0.17, 0.155, -0.018);

      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 14), fur);
      outer.scale.set(0.82, 1.05, 0.38);
      outer.castShadow = true;
      earGroup.add(outer);

      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), innerEar);
      inner.position.z = 0.043;
      inner.scale.set(0.82, 1.0, 0.28);
      earGroup.add(inner);

      this.headGroup.add(earGroup);
      this.earGroups.push(earGroup);
    }

    const muzzleGeo = new THREE.SphereGeometry(0.095, 14, 10);
    for (const side of [-1, 1]) {
      const muzzle = new THREE.Mesh(muzzleGeo, bellyMat);
      muzzle.position.set(side * 0.060, -0.060, 0.177);
      muzzle.scale.set(0.95, 0.66, 0.50);
      this.headGroup.add(muzzle);
    }

    const eyeGeo = new THREE.SphereGeometry(0.067, 14, 12);
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.072, 0.045, 0.185);

      const white = new THREE.Mesh(eyeGeo, eyeWhite);
      white.scale.set(0.88, 1.24, 0.46);
      eyeGroup.add(white);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), black);
      pupil.position.set(0, -0.006, 0.052);
      pupil.scale.set(0.72, 1.18, 0.42);
      pupil.userData.baseX = 0;
      pupil.userData.baseY = pupil.position.y;
      pupil.userData.eyeRadius = 0.055;
      eyeGroup.add(pupil);

      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), eyeWhite);
      highlight.position.set(-side * 0.006, 0.010, 0.069);
      eyeGroup.add(highlight);

      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.069, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        fur,
      );
      eyelid.scale.set(0.88, 1.24, 0.47);
      eyelid.visible = false;
      eyeGroup.add(eyelid);

      if (side < 0) {
        this.leftEyeGroup = eyeGroup;
        this.leftPupil = pupil;
        this.leftEyelid = eyelid;
      } else {
        this.rightEyeGroup = eyeGroup;
        this.rightPupil = pupil;
        this.rightEyelid = eyelid;
      }
      this.headGroup.add(eyeGroup);
    }

    const browGeo = new THREE.CapsuleGeometry(0.006, 0.055, 3, 6);
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(browGeo, darkFur);
      brow.position.set(side * 0.075, 0.124, 0.193);
      brow.rotation.z = Math.PI / 2 - side * 0.06;
      this.headGroup.add(brow);
      if (side < 0) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }
    this.leftBrow = this.leftEyebrow;
    this.rightBrow = this.rightEyebrow;
    this.leftBrowBaseY = this.leftEyebrow.position.y;
    this.rightBrowBaseY = this.rightEyebrow.position.y;

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), noseMat);
    nose.name = 'JerryNose';
    nose.position.set(0, -0.055, 0.252);
    nose.scale.set(1.15, 0.82, 0.82);
    this.headGroup.add(nose);

    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), black);
    this.mouth.name = 'JerryMouth';
    this.mouth.position.set(0, -0.145, 0.205);
    this.mouth.scale.set(1.0, 0.17, 0.31);
    this.mouthVisual = this.mouth;
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = this.mouth.scale.x;
    this.mouthBaseScaleY = this.mouth.scale.y;
    this.mouthBaseScaleZ = this.mouth.scale.z;
    this.mouthBaseY = this.mouth.position.y;

    const whiskerGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.19, 5);
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        const whisker = new THREE.Mesh(whiskerGeo, black);
        whisker.position.set(side * 0.145, -0.075 + i * 0.028, 0.205);
        whisker.rotation.z = Math.PI / 2 + side * i * 0.13;
        this.headGroup.add(whisker);
      }
    }

    this._buildArm(-1, fur, bellyMat);
    this._buildArm(1, fur, bellyMat);
    this._buildLeg(-1, fur, bellyMat);
    this._buildLeg(1, fur, bellyMat);
    this._buildTail(innerEar);

    this.mesh.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
    });
    return this.mesh;
  }

  _buildArm(side, fur, pawMaterial) {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? 'JerryLeftShoulder' : 'JerryRightShoulder';
    shoulder.position.set(side * 0.16, 0.45, 0.01);
    shoulder.rotation.z = -side * 0.16;
    this.mesh.add(shoulder);

    const upperLength = 0.135;
    const lowerLength = 0.105;
    addSegment(shoulder, upperLength, 0.035, fur);

    const elbow = new THREE.Group();
    elbow.name = side < 0 ? 'JerryLeftElbow' : 'JerryRightElbow';
    elbow.position.y = -upperLength;
    shoulder.add(elbow);
    addSegment(elbow, lowerLength, 0.030, fur);

    const wrist = new THREE.Group();
    wrist.name = side < 0 ? 'JerryLeftWrist' : 'JerryRightWrist';
    wrist.position.y = -lowerLength;
    elbow.add(wrist);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), pawMaterial);
    paw.position.y = -0.015;
    paw.scale.set(1.0, 0.72, 1.05);
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
    hip.name = side < 0 ? 'JerryLeftHip' : 'JerryRightHip';
    hip.position.set(side * 0.070, 0.22, 0);
    this.mesh.add(hip);

    const upperLength = 0.115;
    const lowerLength = 0.085;
    addSegment(hip, upperLength, 0.041, fur);

    const knee = new THREE.Group();
    knee.name = side < 0 ? 'JerryLeftKnee' : 'JerryRightKnee';
    knee.position.y = -upperLength;
    hip.add(knee);
    addSegment(knee, lowerLength, 0.034, fur);

    const ankle = new THREE.Group();
    ankle.name = side < 0 ? 'JerryLeftAnkle' : 'JerryRightAnkle';
    ankle.position.y = -lowerLength;
    knee.add(ankle);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.060, 12, 9), footMaterial);
    foot.position.set(0, -0.010, 0.030);
    foot.scale.set(0.90, 0.50, 1.40);
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

  _buildTail(tailMaterial) {
    this.tail = new THREE.Group();
    this.tail.name = 'JerryTail';
    this.tail.position.set(0, 0.31, -0.12);
    this.mesh.add(this.tail);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.16, 0.01, -0.03),
      new THREE.Vector3(0.34, 0.05, -0.01),
      new THREE.Vector3(0.50, 0.14, 0.02),
      new THREE.Vector3(0.62, 0.10, 0.06),
    ]);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.018, 7, false), tailMaterial);
    tailMesh.castShadow = true;
    this.tail.add(tailMesh);
    this.tail.userData.baseRotationZ = -0.04;
  }

  animateMouth(time, delta) {
    super.animateMouth(time, delta);
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.tail && !this.tail.userData.lockMotion) {
      this.tail.rotation.z = this.tail.userData.baseRotationZ + Math.sin(time * 3.2 + 1.1) * 0.10;
      this.tail.rotation.x = Math.sin(time * 2.0) * 0.04;
    }
    if (this.earGroups && !this.headGroup?.userData.lockEars) {
      const twitch = Math.max(0, Math.sin(time * 1.7 + 0.7)) ** 20 * 0.12;
      this.earGroups[0].rotation.y = twitch;
      this.earGroups[1].rotation.y = -twitch * 0.65;
    }
  }
}
