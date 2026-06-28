import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  AnimationRegistry,
  CharacterRegistry,
  PoseMatrix,
  registerAnimation,
  registerCharacter,
  registerScene,
  SceneRegistry,
} from 'dula-engine';

import Bai, { Cheng } from './characters/Bai.js';
import AXiang from './characters/AXiang.js';

registerAll();

class ExerciseBai extends Bai {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'BroadcastLegKickBai',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }
}

class ExerciseCheng extends Cheng {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'BroadcastLegKickCheng',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }
}

class ExerciseAXiang extends AXiang {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'BroadcastLegKickAXiang',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }
}

registerCharacter('Bai', ExerciseBai);
registerCharacter('Cheng', ExerciseCheng);
registerCharacter('AXiang', ExerciseAXiang);

const BaseSpaceStationScene = SceneRegistry.SpaceStationScene;
const BaseVex = CharacterRegistry.Vex;

const COUNTING_START = 2.5;
const COUNTING_BEAT_SECONDS = 0.95;
const COUNTING_SEQUENCE = [
  '一', '二', '三', '四', '五', '六', '七', '八',
  '二', '二', '三', '四', '五', '六', '七', '八',
  '三', '二', '三', '四', '五', '六', '七', '八',
  '四', '二', '三', '四', '五', '六', '七', '八',
];
const COUNTING_END = COUNTING_START + COUNTING_SEQUENCE.length * COUNTING_BEAT_SECONDS;
const COUNTING_DIGIT_DURATIONS = {
  '一': 0.43,
  '二': 0.36,
  '三': 0.52,
  '四': 0.55,
  '五': 0.50,
  '六': 0.60,
  '七': 0.47,
  '八': 0.63,
};

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// 角色改造：广播体操版
// ─────────────────────────────────────────────────────────────────────────────

class ExerciseVex extends BaseVex {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'BroadcastLegKickVex',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    super.build();
    // 发光运动护腕
    const wristBandMat = new THREE.MeshBasicMaterial({ color: 0x66ffcc });
    this.exerciseBands = [];
    for (const wrist of [this.rightWrist, this.leftWrist].filter(Boolean)) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 24), wristBandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.01;
      wrist.add(band);
      this.exerciseBands.push(band);
    }
  }

  update(time, delta) {
    super.update(time, delta);
    for (const band of this.exerciseBands || []) {
      band.rotation.z += delta * 2;
    }
  }
}

registerCharacter('Vex', ExerciseVex);

// ─────────────────────────────────────────────────────────────────────────────
// 动画：广播体操第四节 —— 踢腿运动
// ─────────────────────────────────────────────────────────────────────────────

function buildBroadcastLegKickPose(t, duration, beatSeconds, rightShoulderSign = 1, leftShoulderSign = -1) {
  const elapsed = t * duration;
  const beat = elapsed / beatSeconds;
  const rightLegFirst = Math.floor(beat) % 2 === 0;
  const local = beat % 1;

  // 一拍一次踢腿：0.45 起，0.1 停，0.45 落
  let phase;
  if (local < 0.45) {
    phase = easeInOut(local / 0.45);
  } else if (local < 0.55) {
    phase = 1;
  } else {
    phase = easeInOut((1 - local) / 0.45);
  }

  const kickAngle = phase * 1.0;
  const kneeBend = phase * 1.05;
  const side = rightLegFirst ? -1 : 1; // -1 右腿，+1 左腿
  const lean = -side * phase * 0.08;
  const bounce = Math.sin(phase * Math.PI) * 0.018;
  const armSpread = phase * 1.15;
  const armSwing = side * phase * 0.15;

  const pose = new PoseMatrix();

  pose.mesh = {
    x: -side * phase * 0.02,
    y: bounce,
    rx: lean,
    ry: side * phase * 0.04,
  };

  if (rightLegFirst) {
    pose.rightHip = { rx: -kickAngle * 0.9, rz: -0.05 };
    pose.rightKnee = { rx: kneeBend * 0.95 };
    pose.rightAnkle = { rx: -kickAngle * 0.35 };
  } else {
    pose.leftHip = { rx: -kickAngle * 0.9, rz: 0.05 };
    pose.leftKnee = { rx: kneeBend * 0.95 };
    pose.leftAnkle = { rx: -kickAngle * 0.35 };
  }

  pose.rightShoulder = { rz: rightShoulderSign * armSpread, rx: armSwing };
  pose.leftShoulder = { rz: leftShoulderSign * armSpread, rx: -armSwing };
  pose.rightElbow = { rx: -0.18 };
  pose.leftElbow = { rx: -0.18 };

  pose.headGroup = {
    rx: -lean * 0.4,
    ry: -side * phase * 0.04,
  };

  return pose;
}

class BroadcastLegKickVex extends AnimationBase {
  constructor(options = {}) {
    super('BroadcastLegKickVex', positiveNumber(options.duration, 30.4));
    this.beatSeconds = positiveNumber(options.beatSeconds ?? options.beatDuration, COUNTING_BEAT_SECONDS);
    this.usePoseMatrix = true;
    this.tags.requires = ['rightLeg', 'leftLeg', 'rightArm', 'leftArm'];
    this.tags.suits = ['humanoid'];
  }
  getPoseMatrix(t) {
    return buildBroadcastLegKickPose(t, this.duration, this.beatSeconds, 1, -1);
  }
}

function buildBaiKickPose(t, duration, beatSeconds) {
  const pose = buildBroadcastLegKickPose(t, duration, beatSeconds, 1, -1);
  const elapsed = t * duration;
  const beat = elapsed / beatSeconds;
  const local = beat % 1;
  const phase = local < 0.45
    ? easeInOut(local / 0.45)
    : local < 0.55
      ? 1
      : easeInOut((1 - local) / 0.45);

  // Keep arms forward and slightly up so paws don't clip into the round belly.
  const armReach = 0.35 + phase * 0.28;
  pose.rightShoulder = { rx: -armReach, rz: 0.22 };
  pose.leftShoulder = { rx: -armReach, rz: -0.22 };
  pose.rightElbow = { rx: -0.3 };
  pose.leftElbow = { rx: -0.3 };

  return pose;
}

class BroadcastLegKickBai extends AnimationBase {
  constructor(options = {}) {
    super('BroadcastLegKickBai', positiveNumber(options.duration, 30.4));
    this.beatSeconds = positiveNumber(options.beatSeconds ?? options.beatDuration, COUNTING_BEAT_SECONDS);
    this.usePoseMatrix = true;
    this.tags.requires = ['rightLeg', 'leftLeg', 'rightArm', 'leftArm'];
    this.tags.suits = ['humanoid'];
  }
  getPoseMatrix(t) {
    return buildBaiKickPose(t, this.duration, this.beatSeconds);
  }
}

function buildChengKickPose(t, duration, beatSeconds) {
  const pose = buildBroadcastLegKickPose(t, duration, beatSeconds, 1, -1);
  const elapsed = t * duration;
  const beat = elapsed / beatSeconds;
  const local = beat % 1;
  const phase = local < 0.45
    ? easeInOut(local / 0.45)
    : local < 0.55
      ? 1
      : easeInOut((1 - local) / 0.45);

  // Cheng has long arms; keep them a bit forward and wide to avoid the belly.
  const armReach = 0.28 + phase * 0.22;
  pose.rightShoulder = { rx: -armReach, rz: 0.30 };
  pose.leftShoulder = { rx: -armReach, rz: -0.30 };
  pose.rightElbow = { rx: -0.25 };
  pose.leftElbow = { rx: -0.25 };

  return pose;
}

class BroadcastLegKickCheng extends AnimationBase {
  constructor(options = {}) {
    super('BroadcastLegKickCheng', positiveNumber(options.duration, 30.4));
    this.beatSeconds = positiveNumber(options.beatSeconds ?? options.beatDuration, COUNTING_BEAT_SECONDS);
    this.usePoseMatrix = true;
    this.tags.requires = ['rightLeg', 'leftLeg', 'rightArm', 'leftArm'];
    this.tags.suits = ['humanoid'];
  }
  getPoseMatrix(t) {
    return buildChengKickPose(t, this.duration, this.beatSeconds);
  }
}

class BroadcastLegKickAXiang extends AnimationBase {
  constructor(options = {}) {
    super('BroadcastLegKickAXiang', positiveNumber(options.duration, 30.4));
    this.beatSeconds = positiveNumber(options.beatSeconds ?? options.beatDuration, COUNTING_BEAT_SECONDS);
    this.usePoseMatrix = true;
    this.tags.requires = ['rightLeg', 'leftLeg', 'rightArm', 'leftArm'];
    this.tags.suits = ['humanoid'];
  }
  getPoseMatrix(t) {
    return buildBroadcastLegKickPose(t, this.duration, this.beatSeconds, 1, -1);
  }
}

registerAnimation('BroadcastLegKickVex', BroadcastLegKickVex);
registerAnimation('BroadcastLegKickBai', BroadcastLegKickBai);
registerAnimation('BroadcastLegKickCheng', BroadcastLegKickCheng);
registerAnimation('BroadcastLegKickAXiang', BroadcastLegKickAXiang);

// ─────────────────────────────────────────────────────────────────────────────
// 配音嘴型工具（数拍子用）
// ─────────────────────────────────────────────────────────────────────────────

function getCountingMouthEnergy(progress) {
  const attack = Math.min(1, progress / 0.16);
  const release = progress > 0.70 ? Math.max(0, 1 - (progress - 0.70) / 0.30) : 1;
  const pulse = 0.86 + Math.sin(progress * Math.PI) * 0.14;
  return Math.max(0, Math.min(1, attack * release * pulse));
}

function createCountingMouthCue(duration, digit) {
  const frameRate = 30;
  const frameCount = Math.ceil(duration * frameRate) + 1;
  const roundedDigits = new Set(['五', '六', '八']);
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    const time = i / frameRate;
    const progress = Math.min(1, time / duration);
    const energy = getCountingMouthEnergy(progress);

    frames.push({
      t: time,
      energy,
      jawOpen: energy,
      onset: progress < 0.18 ? 1 - progress / 0.18 : 0,
      brightness: roundedDigits.has(digit) ? 0.38 : 0.58,
    });
  }

  return {
    type: 'audio-mouth-cue',
    frameRate,
    duration,
    frames,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 场景：亮版空间站
// ─────────────────────────────────────────────────────────────────────────────

class BrightSpaceStationScene extends BaseSpaceStationScene {
  constructor() {
    super();
    this.name = 'BrightSpaceStationScene';
    this.exerciseLights = [];
  }

  build() {
    const scene = super.build();

    scene.background = new THREE.Color(0x314667);

    // 降低环境光强度，避免浅色材质过曝
    const softAmbient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(softAmbient);
    const domeLight = new THREE.HemisphereLight(0xdff7ff, 0x435777, 0.55);
    scene.add(domeLight);

    this.lights.forEach((light) => {
      if (light.isAmbientLight) {
        light.intensity = Math.max(light.intensity, 0.55);
        light.color.setHex(0xe8f3ff);
      }
      if (light.isDirectionalLight) {
        light.intensity = Math.max(light.intensity, 1.1);
        light.color.setHex(0xffffff);
        light.position.set(4, 12, 7);
      }
    });

    const keyLight = new THREE.SpotLight(0xffffff, 2.8, 20, Math.PI / 4.6, 0.5, 1.0);
    keyLight.position.set(0, 5.0, 3.2);
    keyLight.target.position.set(0, 1.15, 0);
    keyLight.castShadow = true;
    scene.add(keyLight);
    scene.add(keyLight.target);
    keyLight.userData.baseIntensity = keyLight.intensity;
    this.exerciseLights.push(keyLight);

    const frontFill = new THREE.PointLight(0xfff4dd, 1.8, 13, 1.35);
    frontFill.position.set(0, 2.7, 3.8);
    scene.add(frontFill);
    frontFill.userData.baseIntensity = frontFill.intensity;
    this.exerciseLights.push(frontFill);

    const sideFill = new THREE.PointLight(0x9fd6ff, 1.2, 13, 1.5);
    sideFill.position.set(-3.2, 2.2, 1.5);
    scene.add(sideFill);
    sideFill.userData.baseIntensity = sideFill.intensity;
    this.exerciseLights.push(sideFill);

    const rightFill = new THREE.PointLight(0xc7e7ff, 1.0, 12, 1.45);
    rightFill.position.set(3.0, 2.0, 2.0);
    scene.add(rightFill);
    rightFill.userData.baseIntensity = rightFill.intensity;
    this.exerciseLights.push(rightFill);

    const rim = new THREE.PointLight(0xb6ccff, 1.3, 13, 1.45);
    rim.position.set(3.2, 2.8, -2.2);
    scene.add(rim);
    rim.userData.baseIntensity = rim.intensity;
    this.exerciseLights.push(rim);

    const floorGlow = new THREE.PointLight(0x66eaff, 1.2, 8, 1.8);
    floorGlow.position.set(0, 0.35, 0.8);
    scene.add(floorGlow);
    floorGlow.userData.baseIntensity = floorGlow.intensity;
    this.exerciseLights.push(floorGlow);

    // 地面运动标记
    const floorMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x7ff5ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const markerGroup = new THREE.Group();
    markerGroup.name = 'ExerciseCenterMarker';
    markerGroup.position.set(0, 0.024, 0);

    const outerMarker = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.08, 72), floorMarkerMat);
    outerMarker.rotation.x = -Math.PI / 2;
    markerGroup.add(outerMarker);

    const innerMarker = new THREE.Mesh(new THREE.RingGeometry(0.54, 0.58, 72), floorMarkerMat.clone());
    innerMarker.material.opacity = 0.5;
    innerMarker.rotation.x = -Math.PI / 2;
    markerGroup.add(innerMarker);

    const tickMat = floorMarkerMat.clone();
    tickMat.opacity = 0.6;
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.035), tickMat);
      tick.position.set(Math.cos(angle) * 0.82, 0, Math.sin(angle) * 0.82);
      tick.rotation.y = -angle;
      markerGroup.add(tick);
    }
    scene.add(markerGroup);

    return scene;
  }

  findCountingSpeaker() {
    return this.characters.find((character) => character?.name === 'Bai')
      || this.characters.find((character) => character?.name === 'Cheng');
  }

  syncCountingMouth(time) {
    const speaker = this.findCountingSpeaker();
    if (!speaker) return;

    if (time < COUNTING_START || time >= COUNTING_END) {
      if (speaker._broadcastCountingActive && time >= COUNTING_END && time < COUNTING_END + 0.25) {
        speaker.stopSpeaking();
      }
      speaker._broadcastCountingActive = false;
      speaker._broadcastCountingSpeakKey = null;
      return;
    }

    const beatIndex = Math.min(
      COUNTING_SEQUENCE.length - 1,
      Math.floor((time - COUNTING_START) / COUNTING_BEAT_SECONDS)
    );
    const digit = COUNTING_SEQUENCE[beatIndex];
    const beatStart = COUNTING_START + beatIndex * COUNTING_BEAT_SECONDS;
    const speakDuration = COUNTING_DIGIT_DURATIONS[digit] || 0.5;
    const speakKey = `broadcast-count:${beatIndex}:${digit}`;

    if (time < beatStart + speakDuration) {
      if (!speaker.isSpeaking || speaker._broadcastCountingSpeakKey !== speakKey) {
        speaker.speak(beatStart, speakDuration, digit, createCountingMouthCue(speakDuration, digit));
        speaker._broadcastCountingSpeakKey = speakKey;
        speaker._broadcastCountingActive = true;
      }
      return;
    }

    if (speaker._broadcastCountingSpeakKey === speakKey && speaker.isSpeaking) {
      speaker.stopSpeaking();
    }
    speaker._broadcastCountingActive = false;
  }

  update(time, delta) {
    this.syncCountingMouth(time);
    super.update(time, delta);
    const pulse = 1 + Math.sin(time * 1.6) * 0.05;
    for (const light of this.exerciseLights) {
      light.intensity = (light.userData.baseIntensity || light.intensity) * pulse;
    }
  }
}

registerScene('BrightSpaceStationScene', BrightSpaceStationScene);


