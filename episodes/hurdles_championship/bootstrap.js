import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterRegistry,
  SceneBase,
  registerAnimation,
  registerCharacter,
  registerScene,
} from 'dula-engine';

registerAll();

const TAU = Math.PI * 2;

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function baseState(obj) {
  if (!obj) return null;
  if (!obj.userData.wormDanceBase) {
    obj.userData.wormDanceBase = {
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
  return obj.userData.wormDanceBase;
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

function makeNeonMat(color, emissiveIntensity = 1.0, roughness = 0.35) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness,
    metalness: 0.12,
  });
}

function makeBeam(start, end, color, radius = 0.035, opacity = 0.38) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10, 1, true), mat);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  beam.renderOrder = 2;
  return beam;
}

/**
 * RaveDiscoWorm fixes the base character's blink override for this episode and
 * adds small neon markers so arm/foot movement is obvious on camera.
 */
const BaseDiscoWorm = CharacterRegistry.DiscoWorm;

class RaveDiscoWorm extends BaseDiscoWorm {
  build() {
    super.build();

    const glowColors = [0xff2d75, 0x00e5ff, 0xffd400, 0x52ff78];
    const bandGeo = new THREE.TorusGeometry(0.055, 0.009, 8, 24);

    this.raveBands = [];
    const bandTargets = [
      this.rightWrist,
      this.leftWrist,
      this.rightAnkle,
      this.leftAnkle,
      this.rightAnkle2,
      this.leftAnkle2,
    ].filter(Boolean);

    for (let i = 0; i < bandTargets.length; i++) {
      const band = new THREE.Mesh(bandGeo, makeNeonMat(glowColors[i % glowColors.length], 1.6, 0.2));
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.015;
      bandTargets[i].add(band);
      this.raveBands.push(band);
    }

    this.danceJointGlows = [];
    const legGlowColors = [0x00e5ff, 0xff2d75, 0x52ff78, 0xffd400];
    for (let i = 0; i < (this.legs || []).length; i++) {
      const leg = this.legs[i];
      if (!leg) continue;

      const jointMat = makeNeonMat(legGlowColors[i % legGlowColors.length], 1.45, 0.22);
      const kneeGlow = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 8, 24), jointMat);
      kneeGlow.rotation.x = Math.PI / 2;
      leg.knee.add(kneeGlow);
      this.danceJointGlows.push(kneeGlow);

      const shoeMat = makeNeonMat(legGlowColors[(i + 1) % legGlowColors.length], 1.65, 0.18);
      leg.foot.material = shoeMat;
      leg.foot.scale.multiply(new THREE.Vector3(1.35, 1.08, 1.42));

      const toeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), shoeMat);
      toeGlow.position.set(leg.side * 0.018, 0.0, 0.075);
      toeGlow.scale.set(0.9, 0.55, 1.3);
      leg.foot.add(toeGlow);
      this.danceJointGlows.push(toeGlow);
    }

    this.buttRings = [];
    const tail = this.segments?.[0];
    if (tail) {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.31 + i * 0.035, 0.012, 8, 44),
          makeNeonMat([0xff2d75, 0x00e5ff, 0xffd400][i], 1.8, 0.18)
        );
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = i * 0.35;
        ring.position.y = -0.035 + i * 0.015;
        tail.add(ring);
        this.buttRings.push(ring);
      }
    }

    const crownMat = makeNeonMat(0xffd400, 1.8, 0.3);
    const crown = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), crownMat);
      spike.position.set((i - 2) * 0.045, 0.06 + Math.abs(i - 2) * -0.01, 0);
      crown.add(spike);
    }
    crown.position.set(0, 0.28, 0.08);
    crown.rotation.x = -0.25;
    this.headGroup.add(crown);
    this.raveCrown = crown;
  }

  _updateBlink(time, delta) {
    if (delta === undefined) return;
    if (!this.leftEyelid || !this.rightEyelid) return;

    switch (this.blinkState) {
      case 'open':
        this.blinkTimer -= delta;
        if (this.blinkTimer <= 0) {
          this.blinkState = 'closing';
          this.blinkProgress = 0;
        }
        break;
      case 'closing':
        this.blinkProgress += delta / (this.blinkDuration * 0.3);
        if (this.blinkProgress >= 1) {
          this.blinkProgress = 1;
          this.blinkState = 'closed';
          this.blinkTimer = 0.05;
        }
        this._setEyelidOpenness(1 - this.blinkProgress);
        break;
      case 'closed':
        this.blinkTimer -= delta;
        if (this.blinkTimer <= 0) this.blinkState = 'opening';
        break;
      case 'opening':
        this.blinkProgress -= delta / (this.blinkDuration * 0.7);
        if (this.blinkProgress <= 0) {
          this.blinkProgress = 0;
          this.blinkState = 'open';
          this.blinkTimer = Math.random() * 2.2 + 1.4;
          this._setEyelidOpenness(1);
        } else {
          this._setEyelidOpenness(1 - this.blinkProgress);
        }
        break;
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.raveBands) {
      for (let i = 0; i < this.raveBands.length; i++) {
        const band = this.raveBands[i];
        band.material.emissiveIntensity = 1.2 + Math.max(0, Math.sin(time * TAU * 2 + i)) * 1.4;
        band.rotation.z += delta * (2.5 + i * 0.25);
      }
    }
    if (this.raveCrown) {
      this.raveCrown.rotation.z = Math.sin(time * 6) * 0.1;
    }
    if (this.danceJointGlows) {
      for (let i = 0; i < this.danceJointGlows.length; i++) {
        const obj = this.danceJointGlows[i];
        if (obj.material?.emissiveIntensity !== undefined) {
          obj.material.emissiveIntensity = 1.0 + Math.max(0, Math.sin(time * TAU * 3.2 + i * 0.7)) * 1.5;
        }
      }
    }
    if (this.buttRings) {
      for (let i = 0; i < this.buttRings.length; i++) {
        const ring = this.buttRings[i];
        ring.rotation.z += delta * (1.8 + i * 0.7);
        ring.material.emissiveIntensity = 1.0 + Math.max(0, Math.sin(time * TAU * 2.5 + i)) * 1.8;
      }
    }
  }
}

registerCharacter('DiscoWorm', RaveDiscoWorm);

/**
 * ExplosiveWormDance directly drives DiscoWorm's real groups instead of the
 * generic PoseMatrix. That makes the six body segments, rear legs, hands and
 * feet all visibly dance.
 */
class ExplosiveWormDance extends AnimationBase {
  constructor(options = {}) {
    super('WormDance', positiveNumber(options.duration, 52));
    this.bpm = positiveNumber(options.bpm ?? options.tempo, 150);
  }

  update(t, character) {
    const elapsed = t * this.duration;
    const beat = elapsed * this.bpm / 60;
    const beatPhase = beat % 1;
    const bar = Math.floor(beat / 4);
    const drop = beat >= 8 ? 1 : beat / 8;
    const hit = Math.pow(Math.max(0, Math.sin(beatPhase * Math.PI)), 0.55);
    const stomp = Math.max(0, Math.cos(beatPhase * TAU));
    const fast = beat * TAU;
    const eightStep = Math.floor(beat) % 8;

    if (character.mesh) {
      const b = baseState(character.mesh);
      character.mesh.position.y = b.py + 0.06 * hit + 0.035 * stomp * drop;
      character.mesh.rotation.y = b.ry + Math.sin(beat * Math.PI * 0.5) * 0.22 * drop;
    }

    this._bodySegments(character, beat, fast, drop, hit, bar);
    this._arms(character, fast, beat, drop, hit, eightStep);
    this._legs(character, fast, beat, drop, stomp);
    this._face(character, beat, hit, eightStep);
  }

  _bodySegments(character, beat, fast, drop, hit, bar) {
    const segments = character.segments || [];
    const count = Math.max(segments.length - 1, 1);
    for (let i = 0; i < segments.length; i++) {
      const tail = 1 - i / count;
      const head = i / count;
      const wave = Math.sin(fast * 0.95 - i * 0.72);
      const counter = Math.cos(fast * 0.55 + i * 0.48);
      const tailPower = Math.pow(tail, 1.8);
      const buttSwing = Math.sin(fast * 0.92 + bar * 0.28) * tailPower * drop;
      const buttSnap = Math.sin(fast * 2.15 + Math.PI * 0.35) * tailPower * drop;
      const bodyRoll = Math.sin(fast * 0.45 + i * 0.35 + bar * 0.4) * (0.15 + head * 0.22) * drop;
      const tailPop = Math.max(0, Math.sin((beat % 1) * Math.PI)) * tailPower * drop;

      setRot(
        segments[i],
        wave * (0.14 + head * 0.18) * drop + bodyRoll + buttSnap * 0.58,
        counter * (0.18 + tail * 0.2) * drop + buttSwing * 1.55,
        wave * (0.18 + tail * 0.32) * drop + buttSwing * 2.05 + buttSnap * 0.46
      );
      setPos(
        segments[i],
        Math.sin(fast * 0.6 - i * 0.4) * 0.045 * drop + buttSwing * 0.34 + buttSnap * 0.09,
        hit * (0.018 + tail * 0.026) * drop + tailPop * 0.09,
        Math.cos(fast * 0.7 + i * 0.35) * 0.035 * drop + buttSwing * 0.11
      );

      if (i === 0) {
        const squeeze = 1 + Math.sin(fast * 2.0) * 0.28 * drop;
        setScale(segments[i], 1 + 0.34 * hit * drop, 1 - 0.1 * hit * drop, squeeze);
      } else if (i === 1) {
        setScale(segments[i], 1 + 0.12 * tailPop, 1 - 0.05 * tailPop, 1 + 0.16 * Math.abs(buttSwing));
      } else {
        setScale(segments[i], 1, 1, 1);
      }
    }
  }

  _arms(character, fast, beat, drop, hit, eightStep) {
    const arms = character.arms || [];
    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i];
      const side = arm.side || (i === 0 ? 1 : -1);
      const phase = fast * 0.95 + i * Math.PI;
      const windmill = eightStep >= 4 ? 1 : 0.55;

      setRot(
        arm.shoulder,
        -0.35 + Math.sin(phase) * (0.85 + windmill * 0.25) * drop - hit * 0.25,
        side * (0.38 + Math.cos(phase * 0.7) * 0.45 * drop),
        side * (0.62 + Math.sin(phase * 1.25) * 0.56 * drop)
      );
      setRot(
        arm.elbow,
        -0.35 - Math.abs(Math.sin(phase * 1.4)) * 0.82 * drop,
        Math.sin(phase * 0.9) * 0.45 * drop,
        side * Math.cos(phase) * 0.22 * drop
      );
      setRot(
        arm.wrist,
        Math.sin(phase * 2.2) * 0.7 * drop,
        Math.cos(phase * 1.7) * 0.75 * drop,
        side * Math.sin(phase * 1.3) * 0.5 * drop
      );
      setScale(arm.hand, 1 + hit * 0.12, 1 + hit * 0.05, 1 + hit * 0.12);
    }
  }

  _legs(character, fast, beat, drop, stomp) {
    const legs = character.legs || [];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const side = leg.side || (i % 2 === 0 ? -1 : 1);
      const rear = i >= 2 ? 1 : 0;
      const phase = fast * 1.35 + i * Math.PI * 0.5 + rear * 0.35;
      const lift = Math.max(0, Math.sin(phase));
      const stamp = Math.max(0, -Math.sin(phase));
      const swivel = Math.sin(phase * 0.5 + side * 0.4);
      const kick = Math.sin(phase + Math.PI * 0.22);
      const cancan = Math.max(0, Math.sin(beat * Math.PI * 0.5 + i));

      setPos(
        leg.hip,
        side * (0.018 + 0.045 * lift + 0.025 * cancan) * drop,
        lift * 0.045 * drop - stamp * 0.018 * drop,
        (rear ? -0.045 : 0.045) * Math.sin(phase * 0.7) * drop
      );
      setPos(
        leg.knee,
        side * (0.105 * lift - 0.055 * stamp) * drop,
        lift * 0.075 * drop,
        (rear ? -0.095 : 0.095) * Math.cos(phase) * drop
      );
      setPos(
        leg.ankle,
        side * (-0.13 * lift + 0.075 * stamp) * drop,
        lift * 0.055 * drop - stamp * 0.045 * drop,
        (rear ? -0.105 : 0.105) * Math.sin(phase * 1.1) * drop
      );
      setPos(
        leg.foot,
        side * (0.04 * kick + 0.035 * cancan) * drop,
        lift * 0.035 * drop - stamp * 0.04 * drop,
        0.055 * Math.cos(phase) * drop
      );

      setRot(
        leg.hip,
        (rear ? 0.24 : -0.08) + kick * 1.18 * drop + cancan * 0.34,
        side * (0.28 + Math.cos(phase) * 0.72 * drop),
        side * (0.46 + swivel * 0.96 * drop + cancan * 0.3)
      );
      setRot(
        leg.knee,
        0.42 + lift * 1.68 * drop + stomp * 0.22,
        side * Math.sin(phase * 0.6) * 0.42 * drop,
        side * Math.cos(phase * 0.8) * 0.24 * drop
      );
      setRot(
        leg.ankle,
        -lift * 0.78 * drop + stamp * 0.38 * drop,
        Math.cos(phase * 1.7) * 0.42 * drop,
        side * Math.sin(phase * 1.5) * 0.58 * drop
      );
      setRot(
        leg.foot,
        stamp * 0.62 - lift * 0.32,
        side * Math.sin(phase) * 0.36 * drop,
        side * Math.cos(phase) * 0.55 * drop
      );
      setScale(leg.thigh, 1 + lift * 0.08 * drop, 1 - lift * 0.1 * drop, 1 + lift * 0.04 * drop);
      setScale(leg.shin, 1 + stamp * 0.06 * drop, 1 - stamp * 0.08 * drop, 1 + lift * 0.07 * drop);
      setScale(leg.foot, 1 + stamp * 0.3 * drop, 1 - stamp * 0.1 * drop, 1 + lift * 0.28 * drop);
    }
  }

  _face(character, beat, hit, eightStep) {
    if (character.tongue) {
      character.tongue.visible = eightStep >= 4 || hit > 0.82;
      setScale(character.tongue, 1 + hit * 0.4, 1 + hit * 0.3, 1);
    }
    if (character.leftPupil && character.rightPupil) {
      const eyePop = 1 + hit * 0.16;
      character.leftPupil.scale.setScalar(eyePop);
      character.rightPupil.scale.setScalar(eyePop);
      character.leftPupil.position.x = (baseState(character.leftPupil).px || 0) + Math.sin(beat * TAU) * 0.01;
      character.rightPupil.position.x = (baseState(character.rightPupil).px || 0) - Math.sin(beat * TAU) * 0.01;
    }
  }
}

registerAnimation('WormDance', ExplosiveWormDance);

class BugRaveStageScene extends SceneBase {
  constructor() {
    super('BugRaveStageScene');
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.Fog(0x050508, 7, 18);

    this.floorTiles = [];
    this.equalizerBars = [];
    this.beams = [];
    this.rotators = [];

    this._buildDanceFloor();
    this._buildBackWall();
    this._buildSpeakers();
    this._buildDiscoBall();
    this._buildLasers();
    this._buildCrowdSilhouettes();
    this._buildLights();

    return this.scene;
  }

  _buildDanceFloor() {
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.42,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.08, 96), baseMat);
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const tileColors = [0xff2d75, 0x00e5ff, 0xffd400, 0x52ff78, 0xff7a1a];
    const tileGeo = new THREE.BoxGeometry(0.72, 0.018, 0.72);
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        if (Math.sqrt(x * x + z * z) > 4.15) continue;
        const color = tileColors[Math.abs(x * 3 + z * 5) % tileColors.length];
        const mat = makeNeonMat(color, 0.18, 0.28);
        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(x * 0.76, 0.01, z * 0.76);
        tile.userData.phase = (x * 0.7 + z * 1.1);
        tile.userData.colorIndex = Math.abs(x + z) % tileColors.length;
        this.scene.add(tile);
        this.floorTiles.push(tile);
      }
    }

    const ringColors = [0xff2d75, 0x00e5ff, 0xffd400];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5 + i * 1.25, 0.025, 8, 120),
        makeNeonMat(ringColors[i], 1.4, 0.2)
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05 + i * 0.01;
      ring.userData.speed = i % 2 === 0 ? 0.45 : -0.32;
      this.scene.add(ring);
      this.rotators.push(ring);
    }
  }

  _buildBackWall() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x151016,
      roughness: 0.5,
      metalness: 0.1,
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5), wallMat);
    wall.position.set(0, 3.15, -5.15);
    wall.receiveShadow = true;
    this.scene.add(wall);

    const panelColors = [0xff2d75, 0x00e5ff, 0xffd400, 0x52ff78];
    for (let x = -5; x <= 5; x++) {
      const mat = makeNeonMat(panelColors[Math.abs(x) % panelColors.length], 0.9, 0.25);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 5.2, 0.08), mat);
      strip.position.set(x, 2.8, -5.05);
      strip.userData.phase = x * 0.55;
      this.scene.add(strip);
      this.equalizerBars.push(strip);
    }

    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI;
      const radius = 5.6;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 10),
        makeNeonMat(panelColors[i % panelColors.length], 1.8, 0.2)
      );
      dot.position.set(Math.cos(angle) * radius, 0.5 + Math.sin(angle) * 3.6, -5.0);
      dot.userData.phase = i * 0.35;
      this.scene.add(dot);
      this.equalizerBars.push(dot);
    }
  }

  _buildSpeakers() {
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.35, metalness: 0.25 });
    const coneMats = [makeNeonMat(0xff2d75, 1.1, 0.3), makeNeonMat(0x00e5ff, 1.1, 0.3)];

    for (const side of [-1, 1]) {
      const tower = new THREE.Group();
      tower.position.set(side * 4.6, 1.55, -4.65);

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 3.1, 0.72), boxMat);
      body.castShadow = true;
      tower.add(body);

      for (let i = 0; i < 3; i++) {
        const woofer = new THREE.Mesh(new THREE.CircleGeometry(0.32 - i * 0.035, 36), coneMats[(i + side + 2) % 2]);
        woofer.position.set(0, 0.9 - i * 0.85, 0.365);
        woofer.userData.phase = i * 0.8 + side;
        tower.add(woofer);
        this.equalizerBars.push(woofer);
      }

      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 24), makeNeonMat(0xffd400, 1.2, 0.25));
      horn.rotation.x = Math.PI / 2;
      horn.position.set(0, 1.35, 0.53);
      tower.add(horn);

      this.scene.add(tower);
    }
  }

  _buildDiscoBall() {
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xdde8ff,
      emissive: 0x6688ff,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.14,
    });
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 3), ballMat);
    ball.position.set(0, 4.35, -1.45);
    this.scene.add(ball);
    this.discoBall = ball;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.018, 8, 64), makeNeonMat(0xffd400, 1.6, 0.2));
    ring.rotation.x = Math.PI / 2;
    ball.add(ring);
  }

  _buildLasers() {
    const starts = [
      new THREE.Vector3(-5.3, 4.8, -4.8),
      new THREE.Vector3(5.3, 4.8, -4.8),
      new THREE.Vector3(-4.2, 3.4, 3.2),
      new THREE.Vector3(4.2, 3.4, 3.2),
    ];
    const colors = [0xff2d75, 0x00e5ff, 0xffd400, 0x52ff78];
    for (let i = 0; i < starts.length; i++) {
      const beam = makeBeam(starts[i], new THREE.Vector3(0, 0.35, 0), colors[i], 0.03, 0.28);
      beam.userData.start = starts[i].clone();
      beam.userData.colorPhase = i * 0.6;
      this.scene.add(beam);
      this.beams.push(beam);
    }
  }

  _buildCrowdSilhouettes() {
    const colors = [0xff2d75, 0x00e5ff, 0xffd400, 0x52ff78];
    for (let i = 0; i < 18; i++) {
      const angle = Math.PI * 1.05 + (i / 17) * Math.PI * 0.9;
      const radius = 5.7 + (i % 3) * 0.25;
      const group = new THREE.Group();
      group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius + 0.4);

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.08, 0.48 + (i % 4) * 0.04, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 })
      );
      body.position.y = 0.55;
      group.add(body);

      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), makeNeonMat(colors[i % colors.length], 1.7, 0.2));
      stick.position.set((i % 2 ? 0.15 : -0.15), 1.05, 0);
      stick.rotation.z = (i % 2 ? -0.55 : 0.55);
      stick.userData.phase = i * 0.42;
      group.add(stick);
      this.equalizerBars.push(stick);

      this.scene.add(group);
    }
  }

  _buildLights() {
    for (const light of this.lights) {
      if (light.isAmbientLight) {
        light.intensity = 0.34;
        light.color.setHex(0x446688);
      }
      if (light.isDirectionalLight) {
        light.intensity = 0.35;
        light.color.setHex(0xffffff);
        light.position.set(0, 7, 5);
      }
    }

    this.stageLights = [];
    const colors = [0xff2d75, 0x00e5ff, 0xffd400, 0x52ff78];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU;
      const light = new THREE.SpotLight(colors[i % colors.length], 18, 14, Math.PI * 0.16, 0.45, 1);
      light.position.set(Math.cos(angle) * 4.8, 4.9, Math.sin(angle) * 4.8 - 0.6);
      light.target.position.set(0, 0.6, 0);
      this.scene.add(light);
      this.scene.add(light.target);
      this.stageLights.push(light);
    }

    this.floorPulse = new THREE.PointLight(0xff2d75, 3.2, 7);
    this.floorPulse.position.set(0, 0.35, 0);
    this.scene.add(this.floorPulse);
  }

  update(time, delta) {
    super.update(time, delta);

    const beat = time * 128 / 60;
    const beatPulse = Math.pow(Math.max(0, Math.sin((beat % 1) * Math.PI)), 0.4);

    if (this.discoBall) {
      this.discoBall.rotation.y += delta * 0.9;
      this.discoBall.rotation.x = Math.sin(time * 0.7) * 0.14;
      this.discoBall.material.emissiveIntensity = 0.25 + beatPulse * 0.8;
    }

    for (let i = 0; i < this.floorTiles.length; i++) {
      const tile = this.floorTiles[i];
      const pulse = Math.max(0, Math.sin(beat * Math.PI + tile.userData.phase));
      tile.material.emissiveIntensity = 0.08 + pulse * 1.25;
      tile.position.y = 0.01 + pulse * 0.012;
    }

    for (let i = 0; i < this.equalizerBars.length; i++) {
      const obj = this.equalizerBars[i];
      const p = 0.55 + Math.max(0, Math.sin(time * 6 + obj.userData.phase)) * 0.9;
      if (obj.geometry?.type === 'BoxGeometry') {
        obj.scale.y = p;
      } else if (obj.material?.emissiveIntensity !== undefined) {
        obj.material.emissiveIntensity = 0.6 + p * 1.0;
      }
    }

    for (let i = 0; i < this.beams.length; i++) {
      const beam = this.beams[i];
      const start = beam.userData.start;
      const target = new THREE.Vector3(
        Math.sin(time * 1.4 + i) * 2.8,
        0.35 + beatPulse * 0.4,
        Math.cos(time * 1.2 + i * 0.6) * 2.4
      );
      const dir = new THREE.Vector3().subVectors(target, start);
      const len = dir.length();
      beam.scale.y = len / beam.geometry.parameters.height;
      beam.position.copy(start).add(target).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      beam.material.opacity = 0.16 + beatPulse * 0.24;
    }

    for (const obj of this.rotators) {
      obj.rotation.z += delta * obj.userData.speed;
      obj.material.emissiveIntensity = 0.7 + beatPulse * 1.2;
    }

    for (let i = 0; i < this.stageLights.length; i++) {
      const light = this.stageLights[i];
      const angle = time * 1.8 + i * TAU / this.stageLights.length;
      light.target.position.set(Math.cos(angle) * 2.6, 0.5, Math.sin(angle * 0.8) * 2.6);
      light.intensity = 10 + beatPulse * 16 + Math.sin(time * 4 + i) * 3;
    }

    if (this.floorPulse) {
      this.floorPulse.intensity = 1.2 + beatPulse * 5.5;
      this.floorPulse.color.setHSL((time * 0.08) % 1, 0.95, 0.58);
    }
  }
}

registerScene('BugRaveStageScene', BugRaveStageScene);
registerScene('GymRoomScene', BugRaveStageScene);
