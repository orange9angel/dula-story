import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterRegistry,
  registerAnimation,
  registerCharacter,
  registerScene,
  SceneRegistry,
} from 'dula-engine';

registerAll();

const BaseSpaceStationScene = SceneRegistry.SpaceStationScene;
const BaseZorak = CharacterRegistry.Zorak;
const BaseDoraemon = CharacterRegistry.Doraemon;
const BaseRockLee = CharacterRegistry.RockLee;
const TAU = Math.PI * 2;

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

const EXERCISE_EXPRESSIONS = [
  { start: 2.5, end: 10.1, mood: 'determined' },
  { start: 10.1, end: 17.7, mood: 'happy' },
  { start: 17.7, end: 18.6, mood: 'surprised' },
  { start: 18.6, end: 25.3, mood: 'determined' },
  { start: 25.3, end: 32.9, mood: 'happy' },
];

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function baseState(obj) {
  if (!obj) return null;
  if (!obj.userData.broadcastExerciseBase) {
    obj.userData.broadcastExerciseBase = {
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
  return obj.userData.broadcastExerciseBase;
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

function makeExerciseGlow(color, intensity = 1.2) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.24,
    metalness: 0.08,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 角色改造：太空广播体操版
// ─────────────────────────────────────────────────────────────────────────────

class ExerciseZorak extends BaseZorak {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'BroadcastWaistTwist',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    super.build();
    // 教练哨子
    const whistle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.022, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 })
    );
    whistle.rotation.z = Math.PI / 2;
    whistle.position.set(0.06, -0.02, 0.04);
    this.rightWrist?.add(whistle);
    this.exerciseWhistle = whistle;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.exerciseWhistle) {
      this.exerciseWhistle.rotation.x += delta * 2;
    }
  }
}

class ExerciseDoraemon extends BaseDoraemon {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'RoundWaistTwist',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    super.build();
    this.mesh.scale.set(0.62, 0.62, 0.62);
    this.baseY = 0.01;

    // 胸前小红旗
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.18, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xff3333 })
    );
    flag.position.set(0.12, 0.62, 0.58);
    flag.rotation.y = -0.2;
    this.mesh.add(flag);
    this.exerciseFlag = flag;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.exerciseFlag) {
      this.exerciseFlag.rotation.z = Math.sin(time * 8) * 0.15;
    }
  }
}

class ExerciseRockLee extends BaseRockLee {
  constructor() {
    super();
    this.trustedBodyAnimations = [
      ...new Set([
        ...(this.trustedBodyAnimations || []),
        'BroadcastWaistTwist',
      ]),
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    super.build();
    // 小学生红领巾
    const scarf = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.06, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x330000 })
    );
    scarf.position.set(0, 1.42, 0.18);
    scarf.rotation.x = 0.1;
    this.mesh.add(scarf);
    this.exerciseScarf = scarf;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.exerciseScarf) {
      this.exerciseScarf.rotation.z = Math.sin(time * 6) * 0.05;
    }
  }
}

registerCharacter('Zorak', ExerciseZorak);
registerCharacter('Doraemon', ExerciseDoraemon);
registerCharacter('RockLee', ExerciseRockLee);

// ─────────────────────────────────────────────────────────────────────────────
// 动画：广播体操第三节 —— 扭腰运动
// ─────────────────────────────────────────────────────────────────────────────

class BroadcastWaistTwist extends AnimationBase {
  constructor(options = {}) {
    super('BroadcastWaistTwist', positiveNumber(options.duration, 30.4));
    this.beatSeconds = positiveNumber(options.beatSeconds ?? options.beatDuration, COUNTING_BEAT_SECONDS);
  }

  update(t, character) {
    const elapsed = t * this.duration;
    const beat = elapsed / this.beatSeconds;
    // 2 beats = 一次左右扭腰：左→右
    const cycle = beat % 2;
    let twistSign;
    let phase;
    if (cycle < 0.2) {
      twistSign = -1;
      phase = cycle / 0.2;
    } else if (cycle < 1.0) {
      twistSign = -1;
      phase = 1;
    } else if (cycle < 1.2) {
      twistSign = 1;
      phase = (cycle - 1.0) / 0.2;
    } else {
      twistSign = 1;
      phase = 1;
    }
    const e = easeInOut(phase);
    // 扭腰角度：约 50 度，从正面能看出明显的肩部转向
    const twistAngle = twistSign * e * 0.9;
    // 伴随躯干的侧倾，让正面观众也能读出扭腰
    const sideLean = twistSign * e * 0.12;
    const bounce = Math.sin(phase * Math.PI) * 0.018;

    if (character.mesh) {
      setPos(character.mesh, twistSign * e * 0.025, bounce, 0);
      // ry = 躯干水平扭动，rz = 侧倾强调，rx = 轻微前后压
      setRot(character.mesh, sideLean * 0.25, twistAngle, sideLean);
    }

    if (character.rightClavicle && character.leftClavicle) {
      this._animateFullHumanoid(character, twistAngle, sideLean, e);
    } else {
      this._animateSimpleHumanoid(character, twistAngle, sideLean, e);
    }

    this._face(character, e, twistSign);
  }

  _animateFullHumanoid(character, twistAngle, sideLean, e) {
    // 锁骨随肩膀一起扭
    setRot(character.rightClavicle, 0, 0, -twistAngle * 0.2);
    setRot(character.leftClavicle, 0, 0, -twistAngle * 0.2);

    // 双臂平举侧伸，像广播体操里的「侧平举」
    // 肩膀外展 90 度，配合躯干扭动产生明显的手臂扫动
    setRot(character.rightArm, -1.55, 0.15, 0.55 + twistAngle * 0.35);
    setRot(character.leftArm, -1.55, -0.15, -0.55 + twistAngle * 0.35);

    if (character.rightElbow) {
      setRot(character.rightElbow, -0.25, 0, 0);
    }
    if (character.leftElbow) {
      setRot(character.leftElbow, -0.25, 0, 0);
    }

    // 髋部反向稳定，膝盖弯曲产生弹性
    if (character.rightLeg && character.leftLeg) {
      setRot(character.rightLeg, 0, 0, -twistAngle * 0.15 + sideLean * 0.3);
      setRot(character.leftLeg, 0, 0, -twistAngle * 0.15 + sideLean * 0.3);
    }
    if (character.rightKnee) {
      setRot(character.rightKnee, 0.28, 0, 0);
    }
    if (character.leftKnee) {
      setRot(character.leftKnee, 0.28, 0, 0);
    }
  }

  _animateSimpleHumanoid(character, twistAngle, sideLean, e) {
    // RockLee：没有锁骨/肘关节，直接摆动整根手臂
    // 手臂自然下垂略向外，跟随躯干扭动做反向摆动
    if (character.rightArm) {
      // 先让右臂回到身体侧面，再跟随扭腰做前后摆动
      setRot(character.rightArm, 0.15, 0, -0.25 + twistAngle * 0.55);
    }
    if (character.leftArm) {
      setRot(character.leftArm, 0.15, 0, 0.25 + twistAngle * 0.55);
    }
    if (character.rightLeg) {
      setRot(character.rightLeg, 0, 0, -twistAngle * 0.15 + sideLean * 0.4);
      setPos(character.rightLeg, -twistAngle * 0.018, 0, 0);
    }
    if (character.leftLeg) {
      setRot(character.leftLeg, 0, 0, -twistAngle * 0.15 + sideLean * 0.4);
      setPos(character.leftLeg, twistAngle * 0.018, 0, 0);
    }
  }

  _face(character, e, twistSign) {
    if (character.headGroup) {
      // 头部保持朝前，抵消躯干扭动，让表情始终面向镜头
      setRot(character.headGroup, 0, -twistSign * e * 0.75, twistSign * e * 0.05);
    }
    if (character.leftPupil && character.rightPupil) {
      const pop = 1 + e * 0.04;
      character.leftPupil.scale.setScalar(pop);
      character.rightPupil.scale.setScalar(pop);
    }
  }
}

class RoundWaistTwist extends AnimationBase {
  constructor(options = {}) {
    super('RoundWaistTwist', positiveNumber(options.duration, 30.4));
    this.beatSeconds = positiveNumber(options.beatSeconds ?? options.beatDuration, COUNTING_BEAT_SECONDS);
  }

  update(t, character) {
    const elapsed = t * this.duration;
    const beat = elapsed / this.beatSeconds;
    // 2 beats = 一次左右扭腰
    const cycle = beat % 2;
    let side;
    let phase;
    if (cycle < 0.2) {
      side = -1;
      phase = cycle / 0.2;
    } else if (cycle < 1.0) {
      side = -1;
      phase = 1;
    } else if (cycle < 1.2) {
      side = 1;
      phase = (cycle - 1.0) / 0.2;
    } else {
      side = 1;
      phase = 1;
    }
    const e = easeInOut(phase);
    const twist = side * e;

    if (character.mesh) {
      // 圆身体明显左右扭动，带点侧倾让正面可读
      setPos(character.mesh, side * e * 0.10, Math.sin(phase * Math.PI) * 0.02, 0);
      setRot(character.mesh, twist * 0.15, twist * 0.70, twist * 0.25);
      // 取消明显的整体缩放，避免像气球
      setScale(character.mesh, 1, 1, 1);
    }

    // 短手臂侧平举，跟随扭腰反向摆动
    if (character.rightArm) {
      setRot(character.rightArm, 0, 0, -0.85 + twist * 0.45);
    }
    if (character.leftArm) {
      setRot(character.leftArm, 0, 0, 0.85 + twist * 0.45);
    }

    // 短腿分开站立，随扭腰小幅度转动
    if (character.rightLeg) {
      setRot(character.rightLeg, 0, 0, -twist * 0.22);
      setPos(character.rightLeg, -0.02 - twist * 0.012, 0, 0);
    }
    if (character.leftLeg) {
      setRot(character.leftLeg, 0, 0, -twist * 0.22);
      setPos(character.leftLeg, 0.02 + twist * 0.012, 0, 0);
    }

    if (character.headGroup) {
      setRot(character.headGroup, 0, -side * e * 0.55, side * e * 0.08);
    }

    // 嘴巴微笑幅度随扭腰变化
    if (character.mouth) {
      character.mouth.scale.set(
        character.mouthBaseScaleX,
        character.mouthBaseScaleY * (1 + Math.abs(twist) * 0.12),
        character.mouthBaseScaleZ
      );
    }
  }
}

registerAnimation('BroadcastWaistTwist', BroadcastWaistTwist);
registerAnimation('RoundWaistTwist', RoundWaistTwist);

// ─────────────────────────────────────────────────────────────────────────────
// 配音嘴型工具
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
    const t = i / frameRate;
    const progress = Math.min(1, t / duration);
    const energy = getCountingMouthEnergy(progress);

    frames.push({
      t,
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
    this.displayMaterials = [];
  }

  build() {
    const scene = super.build();

    scene.background = new THREE.Color(0x314667);

    const softAmbient = new THREE.AmbientLight(0xffffff, 1.08);
    scene.add(softAmbient);
    const domeLight = new THREE.HemisphereLight(0xdff7ff, 0x435777, 1.35);
    scene.add(domeLight);

    this.lights.forEach((light) => {
      if (light.isAmbientLight) {
        light.intensity = Math.max(light.intensity, 1.75);
        light.color.setHex(0xe8f3ff);
      }
      if (light.isDirectionalLight) {
        light.intensity = Math.max(light.intensity, 2.55);
        light.color.setHex(0xffffff);
        light.position.set(4, 12, 7);
      }
    });

    const keyLight = new THREE.SpotLight(0xffffff, 6.4, 20, Math.PI / 4.6, 0.5, 1.0);
    keyLight.position.set(0, 5.0, 3.2);
    keyLight.target.position.set(0, 1.15, 0);
    keyLight.castShadow = true;
    scene.add(keyLight);
    scene.add(keyLight.target);
    keyLight.userData.baseIntensity = keyLight.intensity;
    this.exerciseLights.push(keyLight);

    const frontFill = new THREE.PointLight(0xfff4dd, 4.6, 13, 1.35);
    frontFill.position.set(0, 2.7, 3.8);
    scene.add(frontFill);
    frontFill.userData.baseIntensity = frontFill.intensity;
    this.exerciseLights.push(frontFill);

    const sideFill = new THREE.PointLight(0x9fd6ff, 3.2, 13, 1.5);
    sideFill.position.set(-3.2, 2.2, 1.5);
    scene.add(sideFill);
    sideFill.userData.baseIntensity = sideFill.intensity;
    this.exerciseLights.push(sideFill);

    const rightFill = new THREE.PointLight(0xc7e7ff, 2.8, 12, 1.45);
    rightFill.position.set(3.0, 2.0, 2.0);
    scene.add(rightFill);
    rightFill.userData.baseIntensity = rightFill.intensity;
    this.exerciseLights.push(rightFill);

    const rim = new THREE.PointLight(0xb6ccff, 3.4, 13, 1.45);
    rim.position.set(3.2, 2.8, -2.2);
    scene.add(rim);
    rim.userData.baseIntensity = rim.intensity;
    this.exerciseLights.push(rim);

    const floorGlow = new THREE.PointLight(0x66eaff, 3.2, 8, 1.8);
    floorGlow.position.set(0, 0.35, 0.8);
    scene.add(floorGlow);
    floorGlow.userData.baseIntensity = floorGlow.intensity;
    this.exerciseLights.push(floorGlow);

    const wallWash = new THREE.PointLight(0xb8ecff, 2.2, 18, 1.55);
    wallWash.position.set(0, 3.2, -3.8);
    scene.add(wallWash);
    wallWash.userData.baseIntensity = wallWash.intensity;
    this.exerciseLights.push(wallWash);

    const floorFill = new THREE.PointLight(0x9ef8ff, 1.65, 10, 1.9);
    floorFill.position.set(0, 0.55, -1.4);
    scene.add(floorFill);
    floorFill.userData.baseIntensity = floorFill.intensity;
    this.exerciseLights.push(floorFill);

    const lightBarMat = new THREE.MeshBasicMaterial({
      color: 0xeaffff,
      transparent: true,
      opacity: 1.0,
    });
    const lightHaloMat = new THREE.MeshBasicMaterial({
      color: 0x8cecff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    lightHaloMat.userData.baseOpacity = lightHaloMat.opacity;
    this.displayMaterials.push(lightHaloMat);
    for (const z of [2.45, -1.05]) {
      for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.055, 0.16), lightBarMat);
        bar.position.set(x, 4.93, z);
        scene.add(bar);

        const halo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.32), lightHaloMat);
        halo.position.set(x, 4.89, z);
        scene.add(halo);
      }
    }

    const floorLampMat = new THREE.MeshBasicMaterial({
      color: 0x76efff,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    floorLampMat.userData.baseOpacity = floorLampMat.opacity;
    floorLampMat.userData.phase = 1.8;
    this.displayMaterials.push(floorLampMat);
    for (const [x, z] of [
      [-2.6, -1.8],
      [2.6, -1.8],
      [-3.4, 0.9],
      [3.4, 0.9],
    ]) {
      const lamp = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 24), floorLampMat);
      lamp.rotation.x = -Math.PI / 2;
      lamp.position.set(x, 0.028, z);
      scene.add(lamp);
    }

    this.addShipDisplays(scene);

    const floorMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x7ff5ff,
      transparent: true,
      opacity: 0.88,
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
    innerMarker.material.opacity = 0.52;
    innerMarker.rotation.x = -Math.PI / 2;
    markerGroup.add(innerMarker);

    const tickMat = floorMarkerMat.clone();
    tickMat.opacity = 0.62;
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.035), tickMat);
      tick.position.set(Math.cos(angle) * 0.82, 0, Math.sin(angle) * 0.82);
      tick.rotation.y = -angle;
      markerGroup.add(tick);
    }
    scene.add(markerGroup);

    return scene;
  }

  addShipDisplays(scene) {
    const displays = [
      { x: -5.4, y: 2.75, z: -9.50, width: 2.65, height: 1.28, color: 0x63ddff, light: 1.25 },
      { x: 5.4, y: 2.72, z: -9.50, width: 2.55, height: 1.20, color: 0x88ffd7, light: 1.1 },
      { x: 0, y: 3.58, z: -9.48, width: 3.35, height: 0.72, color: 0xd7f7ff, light: 0.9 },
    ];

    for (const cfg of displays) {
      const group = new THREE.Group();
      group.name = 'ShipDisplay';
      group.position.set(cfg.x, cfg.y, cfg.z);

      const screenMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      screenMat.userData.baseOpacity = screenMat.opacity;
      screenMat.userData.phase = cfg.x * 0.37 + cfg.y;
      this.displayMaterials.push(screenMat);

      const glowMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      glowMat.userData.baseOpacity = glowMat.opacity;
      glowMat.userData.phase = cfg.x * 0.31;
      this.displayMaterials.push(glowMat);

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, cfg.height), screenMat);
      group.add(screen);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width * 1.12, cfg.height * 1.16), glowMat);
      glow.position.z = -0.01;
      group.add(glow);

      const frameMat = new THREE.MeshBasicMaterial({
        color: 0xb9f6ff,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const top = new THREE.Mesh(new THREE.BoxGeometry(cfg.width + 0.12, 0.035, 0.025), frameMat);
      top.position.set(0, cfg.height / 2 + 0.03, 0.025);
      const bottom = top.clone();
      bottom.position.y = -cfg.height / 2 - 0.03;
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.035, cfg.height + 0.12, 0.025), frameMat);
      left.position.set(-cfg.width / 2 - 0.03, 0, 0.025);
      const right = left.clone();
      right.position.x = cfg.width / 2 + 0.03;
      group.add(top, bottom, left, right);

      const lineMat = new THREE.MeshBasicMaterial({
        color: 0xe8ffff,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      for (let i = 0; i < 5; i++) {
        const lineWidth = cfg.width * (0.62 - i * 0.07);
        const line = new THREE.Mesh(new THREE.BoxGeometry(lineWidth, 0.018, 0.018), lineMat);
        line.position.set(-cfg.width * 0.03, cfg.height * 0.24 - i * cfg.height * 0.105, 0.04);
        group.add(line);
      }

      for (let i = 0; i < 4; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.055, cfg.height * (0.20 + i * 0.08), 0.018), lineMat);
        bar.position.set(cfg.width * (-0.32 + i * 0.12), -cfg.height * 0.30 + bar.geometry.parameters.height / 2, 0.04);
        group.add(bar);
      }

      const radarMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.76,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const radar = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 32), radarMat);
      radar.position.set(cfg.width * 0.34, -cfg.height * 0.18, 0.045);
      group.add(radar);

      scene.add(group);

      const displayLight = new THREE.PointLight(cfg.color, cfg.light, 6, 1.6);
      displayLight.position.set(cfg.x, cfg.y, cfg.z + 1.0);
      scene.add(displayLight);
      displayLight.userData.baseIntensity = displayLight.intensity;
      this.exerciseLights.push(displayLight);
    }
  }

  findCountingSpeaker() {
    return this.characters.find((character) => character?.name === 'Zorak');
  }

  syncCountingMouth(time) {
    const zorak = this.findCountingSpeaker();
    if (!zorak) return;

    if (time < COUNTING_START || time >= COUNTING_END) {
      if (zorak._broadcastCountingActive && time >= COUNTING_END && time < COUNTING_END + 0.25) {
        zorak.stopSpeaking();
      }
      zorak._broadcastCountingActive = false;
      zorak._broadcastCountingSpeakKey = null;
      zorak._broadcastCountingMouthBoost = 0;
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
      zorak._broadcastCountingMouthBoost = getCountingMouthEnergy((time - beatStart) / speakDuration);
      if (!zorak.isSpeaking || zorak._broadcastCountingSpeakKey !== speakKey) {
        zorak.speak(beatStart, speakDuration, digit, createCountingMouthCue(speakDuration, digit));
        zorak._broadcastCountingSpeakKey = speakKey;
        zorak._broadcastCountingActive = true;
      }
      return;
    }

    if (zorak._broadcastCountingSpeakKey === speakKey && zorak.isSpeaking) {
      zorak.stopSpeaking();
    }
    zorak._broadcastCountingActive = false;
    zorak._broadcastCountingMouthBoost = 0;
  }

  applyCountingMouthBoost() {
    const zorak = this.findCountingSpeaker();
    const boost = zorak?._broadcastCountingMouthBoost || 0;
    if (boost <= 0 || !zorak.zorakMouthBase || !zorak.mouth || !zorak.upperLip || !zorak.lowerLip || !zorak.mouthCavity) {
      return;
    }

    const open = 0.022 * boost;
    zorak.upperLip.position.y += open * 0.20;
    zorak.mouth.position.y -= open * 0.90;
    zorak.mouth.position.z += open * 0.12;
    zorak.mouth.rotation.x -= open * 1.6;
    zorak.lowerLip.scale.x *= 1 + boost * 0.05;
    zorak.lowerLip.scale.y *= 1 + boost * 0.16;
    zorak.mouthCavity.position.y -= open * 0.60;
    zorak.mouthCavity.scale.x *= 1 + boost * 0.12;
    zorak.mouthCavity.scale.y *= 1 + boost * 1.10;
    for (const corner of zorak.mouthCorners || []) {
      corner.position.y -= open * 0.22;
    }
  }

  captureExpressionBase(zorak) {
    if (!zorak || zorak._broadcastExpressionBase) return;
    const capture = (obj) => obj ? {
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone(),
      visible: obj.visible,
    } : null;

    zorak._broadcastExpressionBase = {
      leftEyebrow: capture(zorak.leftEyebrow),
      rightEyebrow: capture(zorak.rightEyebrow),
      leftEyelid: capture(zorak.leftEyelid),
      rightEyelid: capture(zorak.rightEyelid),
      leftPupil: capture(zorak.leftPupil),
      rightPupil: capture(zorak.rightPupil),
    };
  }

  restoreExpressionBase(zorak) {
    const base = zorak?._broadcastExpressionBase;
    if (!base) return;
    const restore = (obj, state) => {
      if (!obj || !state) return;
      obj.position.copy(state.position);
      obj.rotation.copy(state.rotation);
      obj.scale.copy(state.scale);
      obj.visible = state.visible;
    };
    restore(zorak.leftEyebrow, base.leftEyebrow);
    restore(zorak.rightEyebrow, base.rightEyebrow);
    restore(zorak.leftEyelid, base.leftEyelid);
    restore(zorak.rightEyelid, base.rightEyelid);
    restore(zorak.leftPupil, base.leftPupil);
    restore(zorak.rightPupil, base.rightPupil);
    zorak._faceTension = 0;
  }

  getExerciseMood(time) {
    return EXERCISE_EXPRESSIONS.find((entry) => time >= entry.start && time < entry.end)?.mood || null;
  }

  applyExerciseExpression(time) {
    const zorak = this.findCountingSpeaker();
    if (!zorak) return;
    this.captureExpressionBase(zorak);

    const mood = this.getExerciseMood(time);
    if (!mood) {
      this.restoreExpressionBase(zorak);
      zorak._broadcastExpressionMood = null;
      return;
    }

    this.restoreExpressionBase(zorak);
    const base = zorak._broadcastExpressionBase;
    if (!base) return;

    const setBrow = (obj, state, yOffset, rzOffset) => {
      if (!obj || !state) return;
      obj.position.y = state.position.y + yOffset;
      obj.rotation.z = state.rotation.z + rzOffset;
    };
    const setEyelid = (obj, state, visible, yOffset = 0, scaleY = 1) => {
      if (!obj || !state) return;
      obj.visible = visible;
      obj.position.y = state.position.y + yOffset;
      obj.scale.y = state.scale.y * scaleY;
    };
    const setPupil = (obj, state, scale = 1, xOffset = 0) => {
      if (!obj || !state) return;
      obj.scale.set(state.scale.x * scale, state.scale.y * scale, state.scale.z * scale);
      obj.position.x = state.position.x + xOffset;
    };

    if (mood === 'determined') {
      setBrow(zorak.leftEyebrow, base.leftEyebrow, -0.008, -0.08);
      setBrow(zorak.rightEyebrow, base.rightEyebrow, -0.008, 0.08);
      setEyelid(zorak.leftEyelid, base.leftEyelid, true, -0.010, 1.35);
      setEyelid(zorak.rightEyelid, base.rightEyelid, true, -0.010, 1.35);
      setPupil(zorak.leftPupil, base.leftPupil, 1.0, 0.004);
      setPupil(zorak.rightPupil, base.rightPupil, 1.0, -0.004);
      zorak._faceTension = 0.25;
    } else if (mood === 'happy') {
      setBrow(zorak.leftEyebrow, base.leftEyebrow, 0.014, -0.16);
      setBrow(zorak.rightEyebrow, base.rightEyebrow, 0.014, 0.16);
      setEyelid(zorak.leftEyelid, base.leftEyelid, false);
      setEyelid(zorak.rightEyelid, base.rightEyelid, false);
      setPupil(zorak.leftPupil, base.leftPupil, 1.04, 0.002);
      setPupil(zorak.rightPupil, base.rightPupil, 1.04, -0.002);
      zorak._faceTension = 0;
    } else if (mood === 'surprised') {
      setBrow(zorak.leftEyebrow, base.leftEyebrow, 0.030, -0.05);
      setBrow(zorak.rightEyebrow, base.rightEyebrow, 0.030, 0.05);
      setEyelid(zorak.leftEyelid, base.leftEyelid, false);
      setEyelid(zorak.rightEyelid, base.rightEyelid, false);
      setPupil(zorak.leftPupil, base.leftPupil, 0.78, 0);
      setPupil(zorak.rightPupil, base.rightPupil, 0.78, 0);
      zorak._faceTension = -0.15;
    }

    zorak._broadcastExpressionMood = mood;
  }

  update(time, delta) {
    this.syncCountingMouth(time);
    super.update(time, delta);
    this.applyExerciseExpression(time);
    this.applyCountingMouthBoost();
    const pulse = 1 + Math.sin(time * 1.6) * 0.05;
    for (const light of this.exerciseLights) {
      light.intensity = (light.userData.baseIntensity || light.intensity) * pulse;
    }
    for (const mat of this.displayMaterials) {
      const baseOpacity = mat.userData.baseOpacity || mat.opacity;
      const phase = mat.userData.phase || 0;
      mat.opacity = baseOpacity * (1 + Math.sin(time * 1.2 + phase) * 0.08);
    }
  }
}

registerScene('BrightSpaceStationScene', BrightSpaceStationScene);
