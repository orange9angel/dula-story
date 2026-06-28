import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

const TAU = Math.PI * 2;

// ─────────────────────────────────────────────────────────────────────────────
// Texture helpers (from monkey_zoo_human_show)
// ─────────────────────────────────────────────────────────────────────────────

function createNoiseTexture(width = 128, height = 128, baseColor = '#8b5a3c', noiseIntensity = 0.12) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const v = Math.floor((Math.random() - 0.5) * 255 * noiseIntensity + 128);
    ctx.fillStyle = `rgba(${v},${v},${v},0.15)`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFurMaterial(color, roughness = 0.95) {
  const tex = createNoiseTexture(128, 128, '#' + new THREE.Color(color).getHexString(), 0.14);
  tex.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({
    color,
    map: tex,
    bumpMap: tex,
    bumpScale: 0.025,
    roughness,
    metalness: 0.0,
  });
}

function createHeadMaterial(baseFurMat) {
  const mat = baseFurMat.clone();
  mat.side = THREE.DoubleSide;
  return mat;
}

function computeFaceSurfaceZ(headGroup, x, y, fallbackZ) {
  for (const child of headGroup.children) {
    if (child.userData && child.userData.isFace && child.geometry && child.geometry.type === 'SphereGeometry') {
      const r = child.geometry.parameters.radius;
      const sx = child.scale.x || 1;
      const sy = child.scale.y || 1;
      const sz = child.scale.z || 1;
      const dx = (x - child.position.x) / sx;
      const dy = (y - child.position.y) / sy;
      const rr = r * r - dx * dx - dy * dy;
      if (rr > 0) {
        return child.position.z + sz * Math.sqrt(rr);
      }
    }
  }
  return fallbackZ;
}

function createSkinMaterial(color, roughness = 0.65) {
  const tex = createNoiseTexture(128, 128, '#' + new THREE.Color(color).getHexString(), 0.08);
  tex.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({ color, map: tex, bumpMap: tex, bumpScale: 0.01, roughness, metalness: 0.0 });
}

function createClothMaterial(color, roughness = 0.92) {
  const tex = createNoiseTexture(128, 128, '#888888', 0.12);
  tex.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, bumpMap: tex, bumpScale: 0.012 });
}

// ─────────────────────────────────────────────────────────────────────────────
// MonkeyCharacter base — expressive monkey rig
// ─────────────────────────────────────────────────────────────────────────────

class MonkeyCharacter extends CharacterBase {
  static get furColor() { return 0x888888; }
  static get skinColor() { return 0xdca982; }
  static get suitColor() { return 0x556677; }
  static get height() { return 1.35; }
  static get armScale() { return 1.0; }
  static get shoulderWidth() { return 1.0; }
  static get bellyScale() { return 1.0; }
  static get hasTail() { return true; }
  static get legScale() { return 1.0; }

  constructor(name) {
    super(name);
    this.archetypes = ['humanoid', 'monkey', 'round'];
    this.boundingRadius = 0.55;
    this.baseY = 0.01;
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'LookAround', 'PointForward', 'CrossArms',
      'Nod', 'WaveHand', 'HandsOnHips', 'Celebrate', 'ReachOut',
      'TurnAround', 'Bow', 'FightingStance', 'Crouch',
      'Sniff', 'NoseTwitch', 'Intimidate', 'Flex', 'Facepalm',
      'OpenFridge', 'HoldBelly', 'Confess', 'ShakeFist', 'SweatDrop',
      'Gasp', 'Stare', 'StepBack', 'SlowNod', 'SniffWalk',
      'OrangutanWalk', 'MandrillStrut', 'HatTip', 'MagnifyInspect',
      'DramaticPose', 'PanicWave', 'Shrug', 'NervousLaugh',
      'MonkeyWave', 'ScratchBelly', 'JumpExcited', 'InspectGlass', 'TailFlick',
      'MonkeyCross',
    ]);
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.leftPupil) {
      this.leftPupil.position.x = this.leftPupil.userData.baseX ?? 0;
      this.leftPupil.position.y = this.leftPupil.userData.baseY ?? 0;
    }
    if (this.rightPupil) {
      this.rightPupil.position.x = this.rightPupil.userData.baseX ?? 0;
      this.rightPupil.position.y = this.rightPupil.userData.baseY ?? 0;
    }
  }

  _updateIdle(time) {
    const t = time * 2.0;
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(t) * 0.004;
    }
    if (this.leftClavicle) {
      this.leftClavicle.rotation.z = Math.sin(t * 0.7 + 0.5) * 0.02;
    }
    if (this.rightClavicle) {
      this.rightClavicle.rotation.z = Math.sin(t * 0.7 + 2.5) * 0.02;
    }
    if (this.rightArm && !this._actionMatrix?.currentAction) {
      this.rightArm.rotation.x = -0.25 + Math.sin(t * 0.55 + 0.3) * 0.04;
      this.rightArm.rotation.y = 0.10 + Math.sin(t * 0.45 + 0.2) * 0.03;
    }
    if (this.leftArm && !this._actionMatrix?.currentAction) {
      this.leftArm.rotation.x = -0.25 + Math.sin(t * 0.55 + 0.3) * 0.04;
      this.leftArm.rotation.y = -0.10 - Math.sin(t * 0.45 + 0.2) * 0.03;
    }
    if (this.tail) {
      this.tail.rotation.y = Math.sin(time * 1.8) * 0.18;
      this.tail.rotation.z = Math.sin(time * 2.4 + 1.0) * 0.06;
    }
    if (this.headGroup) {
      this.headGroup.rotation.x = Math.sin(t * 0.6) * 0.015;
      this.headGroup.rotation.y = Math.sin(t * 0.35) * 0.03;
    }
  }

  createJointMarkers() {
    this.removeJointMarkers();
  }

  updateEyeTracking(time, delta = 0.016) {
    if (!this.headGroup) return;

    const cam = (typeof window !== 'undefined' && window.__dulaCamera) ? window.__dulaCamera : null;
    if (cam) {
      const headPos = new THREE.Vector3();
      this.headGroup.getWorldPosition(headPos);
      const toCam = new THREE.Vector3().subVectors(cam.position, headPos).normalize();
      const headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.headGroup.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const facingCamera = toCam.dot(headForward) > 0.05;
      if (this.leftEyeGroup) this.leftEyeGroup.visible = facingCamera;
      if (this.rightEyeGroup) this.rightEyeGroup.visible = facingCamera;
    }

    if (!this.eyeTracking.active || time < this.eyeTracking.startTime || time > this.eyeTracking.endTime) {
      const returnSpeed = 4 * delta;
      this.headGroup.rotation.y += (0 - this.headGroup.rotation.y) * returnSpeed;
      this.headGroup.rotation.x += (0 - this.headGroup.rotation.x) * returnSpeed;
      if (Math.abs(this.headGroup.rotation.y) < 0.002) this.headGroup.rotation.y = 0;
      if (Math.abs(this.headGroup.rotation.x) < 0.002) this.headGroup.rotation.x = 0;
      return;
    }

    const headWorldPos = new THREE.Vector3();
    this.headGroup.getWorldPosition(headWorldPos);
    const target = this.eyeTracking.target;

    const dx = target.x - headWorldPos.x;
    const dy = target.y - headWorldPos.y;
    const dz = target.z - headWorldPos.z;

    const distXZ = Math.sqrt(dx * dx + dz * dz);
    let yaw = Math.atan2(dx, dz) - this.mesh.rotation.y;
    let pitch = -Math.atan2(dy, distXZ);

    while (yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw < -Math.PI) yaw += Math.PI * 2;

    const maxYaw = 0.5;
    const maxPitch = 0.3;
    const targetYaw = Math.max(-maxYaw, Math.min(maxYaw, yaw));
    const targetPitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    const smooth = 6 * delta;
    this.headGroup.rotation.y += (targetYaw - this.headGroup.rotation.y) * smooth;
    this.headGroup.rotation.x += (targetPitch - this.headGroup.rotation.x) * smooth;

    const maxShiftX = 0.009;
    const maxShiftY = 0.006;
    const pupilShiftX = Math.max(-maxShiftX, Math.min(maxShiftX, yaw * 0.015));
    const pupilShiftY = Math.max(-maxShiftY, Math.min(maxShiftY, pitch * 0.012));

    if (this.leftPupil) {
      const baseX = this.leftPupil.userData.baseX ?? 0;
      const baseY = this.leftPupil.userData.baseY ?? 0;
      this.leftPupil.position.x = baseX + pupilShiftX;
      this.leftPupil.position.y = baseY + pupilShiftY;
    }
    if (this.rightPupil) {
      const baseX = this.rightPupil.userData.baseX ?? 0;
      const baseY = this.rightPupil.userData.baseY ?? 0;
      this.rightPupil.position.x = baseX + pupilShiftX;
      this.rightPupil.position.y = baseY + pupilShiftY;
    }
  }

  _applyBlink(factor) {
    const baseScale = this.leftPupil?.userData.baseScale;
    const sx = baseScale ? baseScale.x : 1;
    const sy = baseScale ? baseScale.y : 1;
    const sz = baseScale ? baseScale.z : 1;
    const shrink = 1 - factor * 0.25;

    if (this.leftEyelid) {
      this.leftEyelid.visible = factor >= 0.05;
      if (this.leftEyelid.visible) this.leftEyelid.scale.y = 1 - factor * 0.95;
    }
    if (this.rightEyelid) {
      this.rightEyelid.visible = factor >= 0.05;
      if (this.rightEyelid.visible) this.rightEyelid.scale.y = 1 - factor * 0.95;
    }
    if (this.leftPupil) {
      this.leftPupil.scale.set(sx * shrink, sy * shrink, sz * shrink);
    }
    if (this.rightPupil) {
      this.rightPupil.scale.set(sx * shrink, sy * shrink, sz * shrink);
    }
  }

  build() {
    const furColor = this.constructor.furColor;
    const skinColor = this.constructor.skinColor;
    const suitColor = this.constructor.suitColor;
    const h = this.constructor.height;
    const armScale = this.constructor.armScale;
    const shoulderWidth = this.constructor.shoulderWidth;
    const bellyScale = this.constructor.bellyScale;
    const legScale = this.constructor.legScale;

    const furMat = createFurMaterial(furColor);
    const skinMat = createSkinMaterial(skinColor);
    const clothMat = createClothMaterial(suitColor);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.29 * bellyScale, 24, 24), furMat);
    torso.scale.set(shoulderWidth * 0.9, 1.12, 0.82);
    torso.position.y = h * 0.52;
    torso.castShadow = true;
    this.mesh.add(torso);
    this.torso = torso;

    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 * bellyScale, 20, 20),
      skinMat
    );
    belly.scale.set(1, 1.22, 0.55);
    belly.position.set(0, h * 0.47, 0.16 * bellyScale);
    this.mesh.add(belly);

    const coat = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 * Math.max(shoulderWidth, bellyScale), 24, 24),
      clothMat
    );
    coat.scale.set(shoulderWidth * 0.82, 0.58, 0.68);
    coat.position.set(0, h * 0.63, 0.02);
    coat.castShadow = true;
    this.mesh.add(coat);

    for (let b = 0; b < 2; b++) {
      const button = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.3 })
      );
      button.position.set(0, h * (0.58 + b * 0.08), 0.27 * bellyScale);
      this.mesh.add(button);
    }

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), skinMat);
    neck.position.y = h * 0.78;
    this.mesh.add(neck);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, h * 0.86, 0);
    this.mesh.add(this.headGroup);

    this.buildHead(this.headGroup, furMat, skinMat, clothMat);

    this.addArms(furMat, skinMat, clothMat, h, armScale, shoulderWidth);
    this.addLegs(furMat, skinMat, clothMat, h, legScale);

    if (this.constructor.hasTail) {
      this.tail = this._createTail(furMat, h);
    }

    this._captureFaceBaseState();
  }

  addArms(furMat, skinMat, clothMat, h, armScale, shoulderWidth) {
    const upperLen = 0.28 * armScale;
    const lowerLen = 0.26 * armScale;

    const addArm = (clavicleX, clavicleY, clavicleZ, shoulderX, shoulderY, shoulderZ, isRight) => {
      const clavicleGroup = new THREE.Group();
      clavicleGroup.position.set(clavicleX, clavicleY, clavicleZ);

      const shoulderGroup = new THREE.Group();
      shoulderGroup.position.set(shoulderX, shoulderY, shoulderZ);
      clavicleGroup.add(shoulderGroup);

      const armPivot = new THREE.Group();
      armPivot.rotation.x = Math.PI / 2;
      shoulderGroup.add(armPivot);

      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.095 * armScale, upperLen, 8, 12),
        furMat
      );
      upperArm.rotation.x = -Math.PI / 2;
      upperArm.position.z = upperLen / 2;
      upperArm.castShadow = true;
      armPivot.add(upperArm);

      const sleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.11 * armScale, upperLen * 0.25, 8, 12),
        clothMat
      );
      sleeve.rotation.x = -Math.PI / 2;
      sleeve.position.z = upperLen * 0.16;
      sleeve.castShadow = true;
      armPivot.add(sleeve);

      const shoulderTuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.09 * armScale, 10, 10),
        furMat
      );
      shoulderTuft.scale.set(1, 0.8, 0.7);
      shoulderTuft.position.set(0, 0, -0.04);
      armPivot.add(shoulderTuft);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.z = upperLen + 0.01;
      armPivot.add(elbowGroup);

      const elbowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075 * armScale, 10, 10), furMat);
      elbowGroup.add(elbowMesh);

      const elbowTwistGroup = new THREE.Group();
      elbowGroup.add(elbowTwistGroup);

      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085 * armScale, lowerLen, 8, 12),
        skinMat
      );
      forearm.rotation.x = -Math.PI / 2;
      forearm.position.z = lowerLen / 2;
      forearm.castShadow = true;
      elbowTwistGroup.add(forearm);

      const wristGroup = new THREE.Group();
      wristGroup.position.z = lowerLen + 0.03;
      elbowTwistGroup.add(wristGroup);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * armScale, 12, 12),
        skinMat
      );
      hand.scale.set(1.1, 0.8, 1.3);
      hand.position.z = 0.04;
      hand.castShadow = true;
      wristGroup.add(hand);

      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.014 * armScale, 0.06 * armScale, 4, 8),
          skinMat
        );
        const fAngle = (f - 1.5) * 0.3;
        finger.position.set(Math.sin(fAngle) * 0.045, -0.02, 0.09 + Math.cos(fAngle) * 0.02);
        finger.rotation.x = Math.PI / 2;
        finger.rotation.y = fAngle;
        wristGroup.add(finger);
      }

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

    const sx = 0.22 * shoulderWidth;
    addArm(-sx * 0.4, h * 0.74, 0.04, -sx, -0.04, -0.04, false);
    addArm(sx * 0.4, h * 0.74, 0.04, sx, -0.04, -0.04, true);
  }

  addLegs(furMat, skinMat, clothMat, h, legScale) {
    const thighLen = 0.22 * legScale;
    const shinLen = 0.22 * legScale;
    for (const side of [-1, 1]) {
      const hipGroup = new THREE.Group();
      hipGroup.position.set(side * 0.13, h * 0.34, 0);

      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.105, thighLen, 8, 12),
        furMat
      );
      thigh.position.y = -thighLen / 2;
      thigh.castShadow = true;
      hipGroup.add(thigh);

      const pants = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.115, thighLen * 0.35, 8, 12),
        clothMat
      );
      pants.position.y = -thighLen * 0.22;
      pants.castShadow = true;
      hipGroup.add(pants);

      const hipTuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        furMat
      );
      hipTuft.scale.set(0.8, 0.6, 0.8);
      hipTuft.position.set(side * 0.08, -0.02, -0.05);
      hipGroup.add(hipTuft);

      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -thighLen, 0.03);
      hipGroup.add(kneeGroup);

      const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), furMat);
      kneeMesh.scale.set(1, 0.7, 0.6);
      kneeGroup.add(kneeMesh);

      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, shinLen, 8, 12),
        furMat
      );
      shin.position.y = -shinLen / 2;
      shin.castShadow = true;
      kneeGroup.add(shin);

      const ankleGroup = new THREE.Group();
      ankleGroup.position.y = -shinLen;
      kneeGroup.add(ankleGroup);

      const foot = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        skinMat
      );
      foot.scale.set(1, 0.55, 1.6);
      foot.position.set(0, -0.03, 0.06);
      foot.castShadow = true;
      ankleGroup.add(foot);

      this.mesh.add(hipGroup);
      if (side === -1) {
        this.leftLeg = hipGroup;
        this.leftKnee = kneeGroup;
        this.leftAnkle = ankleGroup;
      } else {
        this.rightLeg = hipGroup;
        this.rightKnee = kneeGroup;
        this.rightAnkle = ankleGroup;
      }
    }
  }

  _createTail(furMat, h) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.05, -0.25),
      new THREE.Vector3(0, 0.25, -0.45),
      new THREE.Vector3(0, 0.15, -0.55),
    ]);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.04, 8, false), furMat);
    tailMesh.position.set(0, h * 0.45, -0.22);
    tailMesh.castShadow = true;
    this.mesh.add(tailMesh);
    return tailMesh;
  }

  buildHead(headGroup, furMat, skinMat) {
    const faceColor = this.constructor.skinColor;
    const faceMat = createSkinMaterial(faceColor);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 24), faceMat);
    face.scale.set(0.95, 1.05, 0.6);
    face.position.set(0, -0.02, 0.1);
    headGroup.add(face);
    face.userData.isFace = true;

    this._addEyes(headGroup);
    this._addEyebrows(headGroup);
    this._addNose(headGroup);
    this._addMouth(headGroup);
    this._addEars(headGroup, furMat);
  }

  _addEyes(headGroup, pupilColor = 0x1a1008) {
    const eyeScale = this.constructor.eyeScale ?? 1.0;
    const eyeRadius = 0.032 * eyeScale;
    const pupilRadius = 0.012 * eyeScale;
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
    const pupilMat = new THREE.MeshStandardMaterial({ color: pupilColor, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });

    let headRadius = 0.22;
    for (const child of headGroup.children) {
      if (child.geometry && child.geometry.type === 'SphereGeometry') {
        const r = child.geometry.parameters.radius * Math.max(child.scale.x, child.scale.y, child.scale.z);
        if (r > headRadius) headRadius = r;
      }
    }

    const eyeX = this.constructor.eyeX ?? 0.074;
    const eyeY = this.constructor.eyeY ?? 0.028;
    const fallbackZ = headRadius * 0.88;
    const faceZ = computeFaceSurfaceZ(headGroup, eyeX, eyeY, fallbackZ);
    const eyeZ = Math.max(faceZ + 0.003, headRadius * 0.65);

    const pupilZ = 0.002;
    const highlightZ = pupilZ + 0.001;
    const eyelidZ = 0.001;

    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * eyeX, eyeY, eyeZ);

      const socketMat = createFurMaterial(this.constructor.furColor);
      const socket = new THREE.Mesh(
        new THREE.TorusGeometry(eyeRadius * 1.08, 0.012, 8, 24),
        socketMat
      );
      socket.position.set(0, 0, -0.001);
      eyeGroup.add(socket);

      const eyeWhite = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius, 24), eyeWhiteMat);
      eyeWhite.position.z = 0;
      eyeGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(pupilRadius, 16), pupilMat);
      pupil.position.set(0, 0, pupilZ);
      pupil.userData.baseX = 0;
      pupil.userData.baseY = 0;
      pupil.userData.baseScale = new THREE.Vector3(1, 1, 1);
      pupil.userData.eyeRadius = eyeRadius;
      eyeGroup.add(pupil);

      const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const highlight = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), highlightMat);
      highlight.position.set(0.009, 0.009, highlightZ);
      eyeGroup.add(highlight);

      const eyelidGeo = new THREE.SphereGeometry(eyeRadius * 1.15, 20, 20, 0, TAU, 0, Math.PI * 0.55);
      const eyelidMat = createFurMaterial(this.constructor.furColor);
      const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
      eyelid.scale.set(1.15, 1, 0.18);
      eyelid.position.set(0, 0.004, eyelidZ);
      eyelid.visible = false;
      eyeGroup.add(eyelid);

      if (side === -1) {
        this.leftPupil = pupil;
        this.leftEyelid = eyelid;
        this.leftEyeWhite = eyeWhite;
        this.leftEyeGroup = eyeGroup;
      } else {
        this.rightPupil = pupil;
        this.rightEyelid = eyelid;
        this.rightEyeWhite = eyeWhite;
        this.rightEyeGroup = eyeGroup;
      }

      headGroup.add(eyeGroup);
    }
  }

  _addEyebrows(headGroup, browColor = 0x221100) {
    const browMat = new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.9 });
    const browGeo = new THREE.CapsuleGeometry(0.012, 0.12, 4, 8);
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.rotation.z = Math.PI / 2;
      brow.position.set(side * 0.095, 0.13, 0.23);
      headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }
  }

  _addNose(headGroup, noseColor = 0x111111) {
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({ color: noseColor })
    );
    nose.position.set(0, -0.03, 0.23);
    headGroup.add(nose);
  }

  _addMouth(headGroup, mouthColor = 0x552222) {
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshStandardMaterial({ color: mouthColor, roughness: 0.6 })
    );
    mouth.position.set(0, -0.11, 0.2);
    mouth.scale.set(1.3, 0.55, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.3;
    this.mouthBaseScaleY = 0.55;
    this.mouthBaseScaleZ = 0.8;
  }

  _addEars(headGroup, furMat) {
    const skinMat = createSkinMaterial(this.constructor.skinColor);
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.22, 0.02, -0.02);
      earGroup.rotation.z = side * 0.2;

      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), furMat);
      outer.scale.set(1, 1.35, 0.55);
      earGroup.add(outer);

      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), skinMat);
      inner.scale.set(0.8, 1.1, 0.4);
      inner.position.set(side * 0.01, 0, 0.02);
      earGroup.add(inner);

      headGroup.add(earGroup);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bai (white-faced monkey)
// ─────────────────────────────────────────────────────────────────────────────

export default class Bai extends MonkeyCharacter {
  static get furColor() { return 0x151515; }
  static get skinColor() { return 0xf5f5f5; }
  static get suitColor() { return 0xffffff; }
  static get height() { return 1.45; }
  static get armScale() { return 1.05; }
  static get shoulderWidth() { return 0.95; }
  static get bellyScale() { return 0.92; }

  constructor() {
    super('Bai');
    this.displayName = '白冷森';
    this.bio = '白冷森，白面僧面猴，综艺严肃担当。越想保持体面，越容易被节目规则针对。';
    this.allowedBodyAnimations.add('BroadcastLegKickBai');
  }

  buildHead(headGroup, furMat, skinMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const maskMat = createSkinMaterial(0xf5f5f5);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), maskMat);
    face.scale.set(0.9, 1.15, 0.7);
    face.position.set(0, 0, 0.13);
    headGroup.add(face);
    face.userData.isFace = true;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.4 });
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), frameMat);
      lens.position.set(side * 0.055, 0.04, 0.24);
      headGroup.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), frameMat);
    bridge.position.set(0, 0.04, 0.24);
    headGroup.add(bridge);

    for (const side of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), furMat);
      tuft.scale.set(1, 1.5, 0.6);
      tuft.position.set(side * 0.24, -0.05, 0.02);
      headGroup.add(tuft);
    }

    this._addEyes(headGroup, 0x1a1a1a);
    this._addEyebrows(headGroup, 0x111111);
    this._addNose(headGroup, 0x111111);

    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x331111 })
    );
    mouth.position.set(0, -0.1, 0.24);
    mouth.scale.set(1.2, 0.5, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.2;
    this.mouthBaseScaleY = 0.5;
    this.mouthBaseScaleZ = 0.8;

    this._addEars(headGroup, furMat);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cheng (orange-furred monkey in a blue suit)
// ─────────────────────────────────────────────────────────────────────────────

export class Cheng extends MonkeyCharacter {
  static get furColor() { return 0xc65d26; }
  static get skinColor() { return 0xe8b896; }
  static get suitColor() { return 0x4a90a4; }
  static get height() { return 1.42; }
  static get armScale() { return 1.25; }
  static get shoulderWidth() { return 1.05; }
  static get bellyScale() { return 0.95; }
  static get hasTail() { return false; }
  static get eyeScale() { return 2.8; }
  static get eyeX() { return 0.10; }
  static get eyeY() { return 0.06; }

  constructor() {
    super('Cheng');
    this.displayName = '橙大力';
    this.bio = '橙大力，红猩猩，体能担当。擅长把简单关卡搬成大型事故。';
    this.allowedBodyAnimations.add('BroadcastLegKickCheng');
  }

  build() {
    super.build();
    const furMat = createFurMaterial(this.constructor.furColor);
    for (const side of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), furMat);
      tuft.scale.set(1.5, 1, 0.8);
      tuft.position.set(side * 0.35, this.constructor.height * 0.74, 0);
      this.mesh.add(tuft);
    }
  }

  buildHead(headGroup, furMat, skinMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    // 不再用突出的整个脸部圆球，避免中间大圆挡住眼睛
    // 眼睛会直接落到头部表面上

    this._addEyes(headGroup, 0x050505);
    this._addEyebrows(headGroup, 0x221100);

    // 红猩猩突出的嘴套（muzzle），让嘴部有立体感
    const muzzleSkinMat = createSkinMaterial(this.constructor.skinColor);
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 20, 20),
      muzzleSkinMat
    );
    muzzle.scale.set(1.35, 0.85, 0.9);
    muzzle.position.set(0, -0.07, 0.18);
    muzzle.castShadow = true;
    headGroup.add(muzzle);

    // 真正的嘴巴：扁平椭球，更像猩猩宽嘴
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.6 });
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), mouthMat);
    mouth.position.set(0, -0.12, 0.255);
    mouth.scale.set(1.55, 0.52, 0.85);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.55;
    this.mouthBaseScaleY = 0.52;
    this.mouthBaseScaleZ = 0.85;

    // 下唇小突起，增加嘴部层次
    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), mouthMat);
    lowerLip.position.set(0, -0.145, 0.248);
    lowerLip.scale.set(1.3, 0.6, 0.8);
    headGroup.add(lowerLip);

    this._addEars(headGroup, furMat);
  }
}
