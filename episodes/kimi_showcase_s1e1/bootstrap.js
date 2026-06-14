import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterBase,
  CharacterRegistry,
  registerAnimation,
  registerCharacter,
  registerScene,
  SceneRegistry,
} from 'dula-engine';

registerAll();

const BaseSpaceStationScene = SceneRegistry.SpaceStationScene;
const BaseDoraemon = CharacterRegistry.Doraemon;
const BaseZorak = CharacterRegistry.Zorak;

const TAU = Math.PI * 2;

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function baseState(obj) {
  if (!obj) return null;
  if (!obj.userData.kimiBase) {
    obj.userData.kimiBase = {
      px: obj.position.x,
      py: obj.position.y,
      pz: obj.position.z,
      rx: obj.rotation.x,
      ry: obj.rotation.y,
      rz: obj.rotation.z,
      sx: obj.scale.x,
      sy: obj.scale.y,
      sz: obj.scale.z,
    };
  }
  return obj.userData.kimiBase;
}

function setRot(obj, rx = 0, ry = 0, rz = 0) {
  const b = baseState(obj);
  if (!b) return;
  obj.rotation.set(b.rx + rx, b.ry + ry, b.rz + rz);
}

function setPos(obj, px = 0, py = 0, pz = 0) {
  const b = baseState(obj);
  if (!b) return;
  obj.position.set(b.px + px, b.py + py, b.pz + pz);
}

function setScale(obj, sx = 1, sy = 1, sz = 1) {
  const b = baseState(obj);
  if (!b) return;
  obj.scale.set(b.sx * sx, b.sy * sy, b.sz * sz);
}

function makeGlowMaterial(color, intensity = 1.2, opacity = 1.0) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.2,
    metalness: 0.3,
    transparent: opacity < 1.0,
    opacity,
  });
}

function makeToonGradient() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 4, 0);
  g.addColorStop(0, '#444');
  g.addColorStop(0.4, '#888');
  g.addColorStop(0.7, '#ccc');
  g.addColorStop(1, '#fff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
// Kimi — 原创 AI 助手角色
// ═════════════════════════════════════════════════════════════════════════════

class KimiCharacter extends CharacterBase {
  constructor() {
    super('Kimi');
    this.boundingRadius = 0.45;
    this.archetypes = ['humanoid', 'robot', 'floating', 'agile'];
    this.trustedBodyAnimations = [
      'KimiSpawn', 'KimiFloatIdle', 'KimiExpressionDemo', 'KimiDance',
      'KimiPowerUp', 'KimiFinalPose', 'WaveHand', 'PointForward',
      'CrossArms', 'Celebrate', 'FaceHappy', 'FaceSurprised', 'FaceDetermined',
      'FaceReset', 'Nod', 'Bow', 'HandsOnHips',
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
    this.baseY = 0.35;
    this.hoverPhase = Math.random() * TAU;
  }

  build() {
    const gradient = makeToonGradient();
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xf5f7fa, gradientMap: gradient });
    const cyanMat = new THREE.MeshToonMaterial({ color: 0x00d4ff, gradientMap: gradient });
    const darkCyanMat = new THREE.MeshToonMaterial({ color: 0x0099cc, gradientMap: gradient });
    const orangeMat = new THREE.MeshToonMaterial({ color: 0xff7a00, gradientMap: gradient });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x051018,
      roughness: 0.1,
      metalness: 0.6,
    });
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const mouthGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff7a00,
      transparent: true,
      opacity: 0.85,
    });

    // ── Head ──
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.55;

    const headShell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 32), whiteMat);
    headShell.castShadow = true;
    headGroup.add(headShell);

    // Screen face panel
    const facePanel = new THREE.Mesh(
      new THREE.SphereGeometry(0.30, 32, 16, 0, TAU, 0, Math.PI * 0.35),
      screenMat
    );
    facePanel.position.set(0, 0, 0.05);
    facePanel.rotation.x = -Math.PI / 2;
    facePanel.scale.set(1, 0.85, 1);
    headGroup.add(facePanel);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
    leftEye.position.set(-0.10, 0.06, 0.30);
    leftEye.scale.set(1, 1.4, 0.5);
    headGroup.add(leftEye);
    this.leftPupil = leftEye;

    const rightEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
    rightEye.position.set(0.10, 0.06, 0.30);
    rightEye.scale.set(1, 1.4, 0.5);
    headGroup.add(rightEye);
    this.rightPupil = rightEye;

    // Mouth (sphere scaled to LED line)
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), mouthGlowMat);
    mouth.position.set(0, -0.10, 0.30);
    mouth.scale.set(1.6, 0.18, 0.4);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;
    this.mouthBaseY = mouth.position.y;

    // Brow ridges (subtle expression)
    const browGeo = new THREE.BoxGeometry(0.08, 0.015, 0.02);
    const leftBrow = new THREE.Mesh(browGeo, cyanMat);
    leftBrow.position.set(-0.10, 0.14, 0.30);
    headGroup.add(leftBrow);
    this.leftEyebrow = leftBrow;

    const rightBrow = new THREE.Mesh(browGeo, cyanMat);
    rightBrow.position.set(0.10, 0.14, 0.30);
    headGroup.add(rightBrow);
    this.rightEyebrow = rightBrow;

    // Kimi "K" glyph on forehead
    const kGroup = new THREE.Group();
    kGroup.position.set(0, 0.18, 0.31);
    const kStem1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.005), orangeMat);
    kStem1.position.set(-0.025, 0, 0);
    kGroup.add(kStem1);
    const kStem2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.045, 0.005), orangeMat);
    kStem2.position.set(0.025, 0.022, 0);
    kStem2.rotation.z = -0.5;
    kGroup.add(kStem2);
    const kStem3 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.045, 0.005), orangeMat);
    kStem3.position.set(0.025, -0.022, 0);
    kStem3.rotation.z = 0.5;
    kGroup.add(kStem3);
    headGroup.add(kGroup);

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    // ── Body ──
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 16), whiteMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    this.mesh.add(torso);

    // Chest core glow
    const chestCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), coreGlowMat);
    chestCore.position.set(0, 1.02, 0.18);
    this.mesh.add(chestCore);
    this.chestCore = chestCore;

    // Orange accent ring
    const chestRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.10, 0.015, 8, 24),
      orangeMat
    );
    chestRing.position.set(0, 1.02, 0.17);
    chestRing.rotation.x = Math.PI / 2;
    this.mesh.add(chestRing);

    // ── Arms ──
    const addArm = (isRight) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(isRight ? 0.28 : -0.28, 1.18, 0);

      const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), cyanMat);
      shoulder.add(shoulderJoint);

      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.26, 4, 12),
        whiteMat
      );
      upperArm.position.y = -0.13;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -0.26;
      shoulder.add(elbow);

      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), darkCyanMat);
      elbow.add(elbowJoint);

      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.038, 0.24, 4, 12),
        whiteMat
      );
      forearm.position.y = -0.12;
      elbow.add(forearm);

      const wrist = new THREE.Group();
      wrist.position.y = -0.24;
      elbow.add(wrist);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), cyanMat);
      hand.scale.set(1, 1.2, 0.6);
      wrist.add(hand);

      this.mesh.add(shoulder);

      if (isRight) {
        this.rightArm = shoulder;
        this.rightElbow = elbow;
        this.rightWrist = wrist;
      } else {
        this.leftArm = shoulder;
        this.leftElbow = elbow;
        this.leftWrist = wrist;
      }
    };
    addArm(true);
    addArm(false);

    // ── Hover base (no legs) ──
    const hoverGroup = new THREE.Group();
    hoverGroup.position.y = 0.32;

    const hoverRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.025, 8, 32),
      cyanMat
    );
    hoverRing.rotation.x = Math.PI / 2;
    hoverGroup.add(hoverRing);

    const hoverInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.015, 8, 24),
      orangeMat
    );
    hoverInner.rotation.x = Math.PI / 2;
    hoverInner.position.y = 0.02;
    hoverGroup.add(hoverInner);

    const hoverGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.25, 0.05, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    hoverGlow.position.y = -0.12;
    hoverGroup.add(hoverGlow);

    this.mesh.add(hoverGroup);
    this.hoverBase = hoverGroup;

    // Aura sphere (hidden by default)
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    aura.position.y = 0.9;
    aura.visible = false;
    this.mesh.add(aura);
    this.aura = aura;

    this._captureFaceBaseState();
  }

  update(time, delta) {
    super.update(time, delta);

    // Idle hover bob
    const hoverY = Math.sin(time * 2 + this.hoverPhase) * 0.025;
    if (this.mesh) {
      this.mesh.position.y = this.baseY + hoverY;
    }

    // Hover ring spin
    if (this.hoverBase) {
      this.hoverBase.rotation.y += delta * 1.5;
      this.hoverBase.children[2].rotation.y -= delta * 2;
    }

    // Chest core pulse
    if (this.chestCore) {
      const pulse = 0.85 + Math.sin(time * 3) * 0.15;
      this.chestCore.scale.setScalar(pulse);
      this.chestCore.material.opacity = pulse * 0.85;
    }

    // Aura pulse if visible
    if (this.aura && this.aura.visible) {
      this.aura.material.opacity = 0.15 + Math.sin(time * 8) * 0.05;
    }
  }
}

registerCharacter('Kimi', KimiCharacter);

// ═════════════════════════════════════════════════════════════════════════════
// Engineer Doraemon — 戴着测试耳麦和护目镜的哆啦A梦
// ═════════════════════════════════════════════════════════════════════════════

class EngineerDoraemon extends BaseDoraemon {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'WaveHand', 'PointForward', 'CrossArms', 'Celebrate',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    super.build();
    const gradient = makeToonGradient();
    const orangeMat = new THREE.MeshToonMaterial({ color: 0xff7a00, gradientMap: gradient });
    const greyMat = new THREE.MeshToonMaterial({ color: 0x8899aa, gradientMap: gradient });

    // Visor
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.12, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xff7a00,
        emissive: 0xff4400,
        emissiveIntensity: 0.3,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true,
        opacity: 0.85,
      })
    );
    visor.position.set(0, 0.35, 0.68);
    this.headGroup.add(visor);

    // Headset antenna
    const headset = new THREE.Mesh(
      new THREE.TorusGeometry(0.40, 0.025, 8, 24, Math.PI),
      greyMat
    );
    headset.rotation.x = Math.PI / 2;
    headset.position.set(0, 0.35, 0);
    this.headGroup.add(headset);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), greyMat);
    antenna.position.set(0.38, 0.50, 0);
    this.headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), orangeMat);
    antennaTip.position.set(0.38, 0.60, 0);
    this.headGroup.add(antennaTip);

    // Clipboard in right hand (hidden by default, shown during animations)
    if (this.rightWrist) {
      const clipboard = new THREE.Group();
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.36, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.2 })
      );
      clipboard.add(board);
      const clip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.02),
        greyMat
      );
      clip.position.set(0, 0.16, 0.015);
      clipboard.add(clip);
      clipboard.rotation.set(0, 0, Math.PI / 2);
      clipboard.position.set(0, -0.05, 0.04);
      clipboard.visible = false;
      this.rightWrist.add(clipboard);
      this.clipboard = clipboard;
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.clipboard) {
      this.clipboard.visible = time > 12 && time < 32;
    }
  }
}

registerCharacter('Doraemon', EngineerDoraemon);

// ═════════════════════════════════════════════════════════════════════════════
// Inspector Zorak — 手持平板、佩戴徽章的 inspector
// ═════════════════════════════════════════════════════════════════════════════

class InspectorZorak extends BaseZorak {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'WaveHand', 'PointForward', 'CrossArms', 'Celebrate',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    super.build();
    const gradient = makeToonGradient();
    const silverMat = new THREE.MeshToonMaterial({ color: 0xc0c8d0, gradientMap: gradient });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.6,
    });

    // Inspector badge on chest
    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.01, 6),
      silverMat
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0.10, 1.34, 0.20);
    this.mesh.add(badge);

    // Tablet in left hand
    if (this.leftWrist) {
      const tablet = new THREE.Group();
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.30, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 })
      );
      tablet.add(frame);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.24, 0.014),
        screenMat
      );
      screen.position.z = 0.003;
      tablet.add(screen);
      tablet.rotation.set(-Math.PI / 4, 0, Math.PI / 2);
      tablet.position.set(0.02, -0.05, 0.04);
      tablet.visible = false;
      this.leftWrist.add(tablet);
      this.tablet = tablet;
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.tablet) {
      this.tablet.visible = time > 20 && time < 36;
    }
  }
}

registerCharacter('Zorak', InspectorZorak);

// ═════════════════════════════════════════════════════════════════════════════
// 自定义动画
// ═════════════════════════════════════════════════════════════════════════════

class KimiSpawn extends AnimationBase {
  constructor(options = {}) {
    super('KimiSpawn', positiveNumber(options.duration, 2.0));
  }

  update(t, character) {
    const e = easeOutBack(Math.min(1, t * 1.2));
    if (character.mesh) {
      setScale(character.mesh, e, e, e);
      setRot(character.mesh, 0, t * TAU * 0.5, 0);
    }
    if (character.aura) {
      character.aura.visible = true;
      character.aura.material.opacity = (1 - t) * 0.4;
      character.aura.scale.setScalar(0.8 + t * 0.4);
    }
  }
}

class KimiFloatIdle extends AnimationBase {
  constructor(options = {}) {
    super('KimiFloatIdle', positiveNumber(options.duration, 10));
  }

  update(t, character) {
    // Complementary to update() hover, adds gentle arm sway
    if (character.rightArm) {
      setRot(character.rightArm, 0, 0, Math.sin(t * TAU * 2) * 0.08);
    }
    if (character.leftArm) {
      setRot(character.leftArm, 0, 0, -Math.sin(t * TAU * 2) * 0.08);
    }
  }
}

class KimiExpressionDemo extends AnimationBase {
  constructor(options = {}) {
    super('KimiExpressionDemo', positiveNumber(options.duration, 16));
  }

  update(t, character) {
    const cycle = (t * 3) % 3;
    let mood;
    if (cycle < 1) mood = 'happy';
    else if (cycle < 2) mood = 'surprised';
    else mood = 'determined';

    const phase = cycle % 1;
    const e = Math.sin(phase * Math.PI);

    if (mood === 'happy') {
      this._setEyes(character, 1.0 + e * 0.2, 1.0 + e * 0.2, 0);
      this._setMouth(character, 1 + e * 0.8, 1 + e * 1.2);
      this._setBrows(character, e * 0.02, -e * 0.15);
    } else if (mood === 'surprised') {
      this._setEyes(character, 1.0 + e * 0.4, 1.0 + e * 0.8, e * 0.05);
      this._setMouth(character, 1 + e * 0.2, 1 + e * 2.5);
      this._setBrows(character, e * 0.05, 0);
    } else {
      this._setEyes(character, 1.0, 1.0, 0);
      this._setMouth(character, 1 + e * 0.4, 1 + e * 0.3);
      this._setBrows(character, -e * 0.01, 0);
    }
  }

  _setEyes(character, sx, sy, rz) {
    if (character.leftPupil) character.leftPupil.scale.set(1.0 * sx, 1.4 * sy, 0.5);
    if (character.rightPupil) character.rightPupil.scale.set(1.0 * sx, 1.4 * sy, 0.5);
    if (character.leftEyebrow) character.leftEyebrow.rotation.z = -rz;
    if (character.rightEyebrow) character.rightEyebrow.rotation.z = rz;
  }

  _setMouth(character, sx, sy) {
    if (!character.mouth) return;
    character.mouth.scale.set(
      character.mouthBaseScaleX * sx,
      character.mouthBaseScaleY * sy,
      character.mouthBaseScaleZ
    );
    character.mouth.position.y = character.mouthBaseY + (sy - 1) * 0.02;
  }

  _setBrows(character, y, rz) {
    if (character.leftEyebrow) {
      character.leftEyebrow.position.y = baseState(character.leftEyebrow).py + y;
      character.leftEyebrow.rotation.z = baseState(character.leftEyebrow).rz - rz;
    }
    if (character.rightEyebrow) {
      character.rightEyebrow.position.y = baseState(character.rightEyebrow).py + y;
      character.rightEyebrow.rotation.z = baseState(character.rightEyebrow).rz + rz;
    }
  }
}

class KimiDance extends AnimationBase {
  constructor(options = {}) {
    super('KimiDance', positiveNumber(options.duration, 20));
  }

  update(t, character) {
    const beat = t * 8;
    const sway = Math.sin(beat * 0.5);
    const bounce = Math.abs(Math.sin(beat)) * 0.08;

    if (character.mesh) {
      setPos(character.mesh, sway * 0.12, bounce, 0);
      setRot(character.mesh, 0, sway * 0.3, sway * 0.08);
    }

    if (character.headGroup) {
      setRot(character.headGroup, 0, -sway * 0.25, sway * 0.05);
    }

    if (character.rightArm) {
      setRot(character.rightArm, 0, 0, -0.6 + Math.sin(beat) * 0.5);
    }
    if (character.rightElbow) {
      setRot(character.rightElbow, 0, 0, -0.6 + Math.abs(Math.sin(beat)) * 0.8);
    }
    if (character.leftArm) {
      setRot(character.leftArm, 0, 0, 0.6 + Math.cos(beat) * 0.5);
    }
    if (character.leftElbow) {
      setRot(character.leftElbow, 0, 0, 0.6 - Math.abs(Math.cos(beat)) * 0.8);
    }
  }
}

class KimiPowerUp extends AnimationBase {
  constructor(options = {}) {
    super('KimiPowerUp', positiveNumber(options.duration, 14));
  }

  update(t, character) {
    const charge = Math.min(1, t * 1.5);
    const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 6);

    if (character.mesh) {
      setRot(character.mesh, 0, t * TAU * 0.25, 0);
      setPos(character.mesh, 0, charge * 0.25, 0);
    }

    if (character.rightArm && character.leftArm) {
      const armRaise = charge * 1.6;
      setRot(character.rightArm, 0, 0, -armRaise);
      setRot(character.leftArm, 0, 0, armRaise);
      setRot(character.rightElbow, 0, 0, -charge * 0.8);
      setRot(character.leftElbow, 0, 0, charge * 0.8);
    }

    if (character.headGroup) {
      setRot(character.headGroup, -charge * 0.15, 0, 0);
    }

    if (character.aura) {
      character.aura.visible = true;
      character.aura.material.opacity = 0.1 + charge * 0.25 * pulse;
      const s = 0.8 + charge * 0.6 + pulse * 0.1;
      character.aura.scale.set(s, s, s);
    }

    if (character.chestCore) {
      character.chestCore.material.opacity = 0.9 + pulse * 0.1;
      character.chestCore.scale.setScalar(1.2 + pulse * 0.3);
    }
  }
}

class KimiFinalPose extends AnimationBase {
  constructor(options = {}) {
    super('KimiFinalPose', positiveNumber(options.duration, 14));
  }

  update(t, character) {
    const e = easeInOut(Math.min(1, t * 1.5));
    if (character.mesh) {
      setPos(character.mesh, 0, 0, 0);
      setRot(character.mesh, 0, 0, 0);
    }
    if (character.headGroup) {
      setRot(character.headGroup, 0, 0, 0);
    }
    if (character.rightArm) {
      setRot(character.rightArm, 0, 0, -0.2 - e * 0.3);
    }
    if (character.rightElbow) {
      setRot(character.rightElbow, 0, 0, -e * 0.4);
    }
    if (character.leftArm) {
      setRot(character.leftArm, 0, 0, 0.2 + e * 0.3);
    }
    if (character.leftElbow) {
      setRot(character.leftElbow, 0, 0, e * 0.4);
    }
  }
}

registerAnimation('KimiSpawn', KimiSpawn);
registerAnimation('KimiFloatIdle', KimiFloatIdle);
registerAnimation('KimiExpressionDemo', KimiExpressionDemo);
registerAnimation('KimiDance', KimiDance);
registerAnimation('KimiPowerUp', KimiPowerUp);
registerAnimation('KimiFinalPose', KimiFinalPose);

// ═════════════════════════════════════════════════════════════════════════════
// VirtualStudio — 未来感虚拟演播室场景
// ═════════════════════════════════════════════════════════════════════════════

class VirtualStudioScene extends BaseSpaceStationScene {
  constructor() {
    super();
    this.name = 'VirtualStudio';
    this.studioLights = [];
    this.displayMaterials = [];
    this.particles = [];
  }

  build() {
    const scene = super.build();

    // Deep space background
    scene.background = new THREE.Color(0x0a0f1a);

    // Remove/override default lights
    this.lights.forEach((light) => {
      if (light.isAmbientLight) {
        light.intensity = 0.6;
        light.color.setHex(0x1a2438);
      }
      if (light.isDirectionalLight) {
        light.intensity = 1.2;
        light.color.setHex(0xffffff);
        light.position.set(3, 8, 5);
      }
    });

    const ambient = new THREE.AmbientLight(0x223344, 0.8);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x88ccff, 0x111122, 0.9);
    scene.add(hemi);

    // Main stage key light
    const keyLight = new THREE.SpotLight(0xffffff, 4.5, 25, Math.PI / 5, 0.4, 1.5);
    keyLight.position.set(0, 6, 4);
    keyLight.target.position.set(0, 1.0, 0);
    keyLight.castShadow = true;
    scene.add(keyLight);
    scene.add(keyLight.target);
    this.studioLights.push({ light: keyLight, base: keyLight.intensity, phase: 0 });

    // Cyan rim light
    const cyanRim = new THREE.SpotLight(0x00d4ff, 3.0, 20, Math.PI / 4, 0.6, 1.5);
    cyanRim.position.set(-4, 3, -3);
    cyanRim.target.position.set(0, 1.0, 0);
    scene.add(cyanRim);
    scene.add(cyanRim.target);
    this.studioLights.push({ light: cyanRim, base: cyanRim.intensity, phase: 1 });

    // Orange rim light
    const orangeRim = new THREE.SpotLight(0xff7a00, 3.0, 20, Math.PI / 4, 0.6, 1.5);
    orangeRim.position.set(4, 3, -3);
    orangeRim.target.position.set(0, 1.0, 0);
    scene.add(orangeRim);
    scene.add(orangeRim.target);
    this.studioLights.push({ light: orangeRim, base: orangeRim.intensity, phase: 2 });

    // Floor glow
    const floorGlow = new THREE.PointLight(0x00d4ff, 2.5, 8, 1.5);
    floorGlow.position.set(0, 0.3, 0);
    scene.add(floorGlow);
    this.studioLights.push({ light: floorGlow, base: floorGlow.intensity, phase: 3 });

    this.addStagePlatform(scene);
    this.addHologramScreens(scene);
    this.addStarParticles(scene);

    return scene;
  }

  addStagePlatform(scene) {
    // Main circular platform
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      metalness: 0.7,
    });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.15, 64), platformMat);
    platform.position.y = -0.075;
    platform.receiveShadow = true;
    scene.add(platform);

    // Glowing ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.035, 8, 64), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);
    this.displayMaterials.push(ringMat);

    // Inner ring
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff7a00,
      transparent: true,
      opacity: 0.6,
    });
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.02, 8, 48), innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.008;
    scene.add(innerRing);
    this.displayMaterials.push(innerRingMat);

    // Radial tick marks
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.01, 0.03), tickMat);
      tick.position.set(Math.cos(angle) * 1.8, 0.01, Math.sin(angle) * 1.8);
      tick.rotation.y = -angle;
      scene.add(tick);
    }

    // Kimi "K" logo glyph on floor
    const glyphGroup = new THREE.Group();
    glyphGroup.position.set(0, 0.012, 0);
    const glyphMat = new THREE.MeshBasicMaterial({ color: 0xff7a00 });
    const stem1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.35), glyphMat);
    stem1.position.set(-0.08, 0, 0);
    glyphGroup.add(stem1);
    const stem2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.18), glyphMat);
    stem2.position.set(0.08, 0.08, 0);
    stem2.rotation.y = -0.5;
    glyphGroup.add(stem2);
    const stem3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.18), glyphMat);
    stem3.position.set(0.08, -0.08, 0);
    stem3.rotation.y = 0.5;
    glyphGroup.add(stem3);
    scene.add(glyphGroup);
  }

  addHologramScreens(scene) {
    const configs = [
      { x: -3.5, y: 2.8, z: -2.5, w: 1.8, h: 1.0, color: 0x00d4ff },
      { x: 3.5, y: 2.8, z: -2.5, w: 1.8, h: 1.0, color: 0xff7a00 },
      { x: 0, y: 3.6, z: -4.0, w: 2.4, h: 0.7, color: 0x00d4ff },
    ];

    for (const cfg of configs) {
      const group = new THREE.Group();
      group.position.set(cfg.x, cfg.y, cfg.z);
      group.lookAt(0, 1.2, 0);

      const screenMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      screenMat.userData.baseOpacity = screenMat.opacity;
      screenMat.userData.phase = cfg.x * 0.5 + cfg.y;
      this.displayMaterials.push(screenMat);

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, cfg.h), screenMat);
      group.add(screen);

      // Frame
      const frameMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.6,
      });
      const top = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.06, 0.02, 0.01), frameMat);
      top.position.y = cfg.h / 2 + 0.02;
      const bottom = top.clone();
      bottom.position.y = -cfg.h / 2 - 0.02;
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.02, cfg.h + 0.06, 0.01), frameMat);
      left.position.x = -cfg.w / 2 - 0.02;
      const right = left.clone();
      right.position.x = cfg.w / 2 + 0.02;
      group.add(top, bottom, left, right);

      // Data lines
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      for (let i = 0; i < 4; i++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(cfg.w * (0.7 - i * 0.12), 0.01, 0.005),
          lineMat
        );
        line.position.set(0, cfg.h * 0.2 - i * cfg.h * 0.12, 0.01);
        group.add(line);
      }

      scene.add(group);

      // Screen light
      const screenLight = new THREE.PointLight(cfg.color, 0.8, 5, 1.5);
      screenLight.position.set(cfg.x, cfg.y, cfg.z + 0.5);
      scene.add(screenLight);
      this.studioLights.push({ light: screenLight, base: 0.8, phase: cfg.x });
    }
  }

  addStarParticles(scene) {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 25;
      const theta = Math.random() * TAU;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color(Math.random() > 0.7 ? 0x00d4ff : 0xffffff);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
    this.starField = stars;
  }

  update(time, delta) {
    super.update(time, delta);

    // Pulse studio lights
    for (const entry of this.studioLights) {
      const pulse = 1 + Math.sin(time * 1.5 + entry.phase) * 0.08;
      entry.light.intensity = entry.base * pulse;
    }

    // Pulse hologram opacity
    for (const mat of this.displayMaterials) {
      const base = mat.userData.baseOpacity || mat.opacity;
      const phase = mat.userData.phase || 0;
      mat.opacity = base * (1 + Math.sin(time * 1.2 + phase) * 0.1);
    }

    // Rotate stars slowly
    if (this.starField) {
      this.starField.rotation.y += delta * 0.02;
      this.starField.rotation.x += delta * 0.01;
    }
  }
}

registerScene('VirtualStudio', VirtualStudioScene);
