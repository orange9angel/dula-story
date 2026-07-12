import * as THREE from 'three';
import { AnimationRegistry } from 'dula-engine';
import { LaserBeam } from 'dula-engine/lib/LaserBeam.js';
import { HitExplosion, Shockwave, ScreenFlash } from 'dula-engine/lib/HitExplosion.js';

const DEFAULT_SHOT_COLOR = 0x55ccff;
const DEFAULT_ENEMY_COLOR = 0xff3344;

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function color(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (text.startsWith('#')) return Number.parseInt(text.slice(1), 16);
  if (text.startsWith('0x')) return Number.parseInt(text.slice(2), 16);
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function play(char, name, startTime, duration) {
  const AnimClass = AnimationRegistry[name];
  if (!char || !AnimClass) return;
  if (name.startsWith('Readable') && !char.rightArm) return;
  char.playAnimation(AnimClass, startTime, duration);
}

function isBlocked(options = {}) {
  return options.block === true || options.block === 'true' || options.reaction === 'Block';
}

function reactionName(options = {}) {
  return String(options.reaction || 'HitStagger');
}

function face(a, b) {
  if (!a?.mesh || !b?.mesh) return;
  const aPos = a.mesh.position;
  const bPos = b.mesh.position;
  a.mesh.lookAt(bPos.x, aPos.y, bPos.z);
}

function centerOf(char, fallbackHeight = 1.0) {
  if (!char?.mesh) return new THREE.Vector3();
  char.mesh.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(char.mesh);
  if (!box.isEmpty()) {
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }
  const p = new THREE.Vector3();
  char.mesh.getWorldPosition(p);
  p.y += fallbackHeight;
  return p;
}

function muzzleOf(char) {
  if (char?.getPlasmaRifleMuzzleWorldPosition) {
    const p = char.getPlasmaRifleMuzzleWorldPosition();
    if (p) return p;
  }
  const p = centerOf(char, 1.2);
  p.y += 0.2;
  return p;
}

class TimedShield {
  constructor(position, colorValue, duration = 0.45) {
    this.duration = duration;
    this.age = 0;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    const mat = new THREE.MeshBasicMaterial({
      color: colorValue,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), mat);
    disc.rotation.x = Math.PI / 2;
    this.group.add(disc);
    mat.userData.baseOpacity = mat.opacity;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ringMat.userData.baseOpacity = ringMat.opacity;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.86, 40),
      ringMat
    );
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
  }

  addTo(scene) {
    scene.add(this.group);
  }

  update(delta) {
    this.age += delta;
    const p = Math.min(1, this.age / this.duration);
    const scale = 0.85 + p * 0.55;
    this.group.scale.setScalar(scale);
    this.group.children.forEach((child) => {
      if (child.material) {
        const baseOpacity = child.material.userData.baseOpacity ?? child.material.opacity;
        child.material.opacity = baseOpacity * Math.max(0, 1 - p);
      }
    });
    if (p >= 1) {
      this.dispose();
      return true;
    }
    return false;
  }

  dispose() {
    this.group.traverse((obj) => {
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
    });
    this.group.parent?.remove(this.group);
  }
}

export class ReadableCombatDirector {
  constructor(storyboard) {
    this.sb = storyboard;
    this.phaseEvents = [];
    this.effects = [];
  }

  addEvent(ev) {
    const options = ev.options || {};
    const start = ev.startTime + num(options.offset, 0);
    const name = String(ev.name || ev.type || '').toLowerCase();
    if (name === 'readableshot') {
      const fireDelay = num(options.fire, 0.75);
      this.phaseEvents.push({ time: start, type: 'shot-aim', options, triggered: false });
      this.phaseEvents.push({ time: start + fireDelay, type: 'shot-fire', options, triggered: false });
      return;
    }
    if (name === 'readablemelee') {
      const hitDelay = num(options.hit, 0.55);
      this.phaseEvents.push({ time: start, type: 'melee-start', options, triggered: false });
      this.phaseEvents.push({ time: start + hitDelay, type: 'melee-hit', options, triggered: false });
    }
  }

  update(time, delta = 1 / 30) {
    const dt = Number.isFinite(delta) ? delta : 1 / 30;
    for (const ev of this.phaseEvents) {
      if (ev.triggered || time < ev.time) continue;
      ev.triggered = true;
      if (ev.type === 'shot-aim') this._shotAim(ev);
      if (ev.type === 'shot-fire') this._shotFire(ev);
      if (ev.type === 'melee-start') this._meleeStart(ev);
      if (ev.type === 'melee-hit') this._meleeHit(ev);
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (this.effects[i].update(dt)) {
        this.effects.splice(i, 1);
      }
    }
  }

  _scene() {
    return this.sb.currentScene?.scene || this.sb.currentScene;
  }

  _chars(options) {
    return {
      attacker: this.sb.characters.get(options.attacker),
      defender: this.sb.characters.get(options.defender),
    };
  }

  _shotAim(ev) {
    const { attacker, defender } = this._chars(ev.options);
    if (!attacker || !defender) return;
    face(attacker, defender);
    face(defender, attacker);
    const fireDelay = num(ev.options.fire, 0.75);
    play(attacker, 'ReadableAimRifle', ev.time, fireDelay);
    play(attacker, 'PlasmaRifleCharge', ev.time, Math.min(0.7, fireDelay));

    if (isBlocked(ev.options)) {
      play(defender, 'Block', Math.max(ev.time, ev.time + fireDelay - 0.35), 0.95);
    } else if (reactionName(ev.options) === 'Dodge') {
      play(defender, 'Dodge', Math.max(ev.time, ev.time + fireDelay - 0.28), 0.65);
    }

    const start = muzzleOf(attacker);
    const end = centerOf(defender, 1.0);
    const beam = new LaserBeam({
      start,
      end,
      color: color(ev.options.color, ev.options.enemy ? DEFAULT_ENEMY_COLOR : DEFAULT_SHOT_COLOR),
      coreColor: 0xffffff,
      duration: Math.max(0.25, num(ev.options.fire, 0.75)),
      width: 0.012,
      glowWidth: 0.055,
    });
    beam.addTo(this._scene());
    this.effects.push(beam);
  }

  _shotFire(ev) {
    const { attacker, defender } = this._chars(ev.options);
    if (!attacker || !defender) return;
    face(attacker, defender);
    face(defender, attacker);

    const c = color(ev.options.color, ev.options.enemy ? DEFAULT_ENEMY_COLOR : DEFAULT_SHOT_COLOR);
    const blocked = isBlocked(ev.options);
    const reaction = reactionName(ev.options);
    const dodged = !blocked && reaction === 'Dodge';
    play(attacker, 'ReadableFireRifle', ev.time, 0.62);
    play(attacker, 'PlasmaRifle', ev.time, 0.55);

    const start = muzzleOf(attacker);
    const end = centerOf(defender, 1.0);
    if (dodged) {
      const dodgeSide = ev.options.enemy ? -1 : 1;
      end.x += dodgeSide * 0.55;
      end.y += 0.15;
    }
    const beam = new LaserBeam({
      start,
      end,
      color: c,
      coreColor: 0xffffff,
      duration: num(ev.options.beamDuration, 0.28),
      width: num(ev.options.width, 0.07),
      glowWidth: num(ev.options.glowWidth, 0.22),
    });
    beam.addTo(this._scene());
    this.effects.push(beam);

    if (!dodged) {
      const explosion = new HitExplosion({
        position: end,
        color: c,
        duration: num(ev.options.impactDuration, 0.42),
        maxRadius: num(ev.options.impactRadius, 0.62),
        sparkCount: 18,
      });
      explosion.addTo(this._scene());
      this.effects.push(explosion);
    }

    if (blocked) {
      const shield = new TimedShield(end, c, 0.5);
      shield.addTo(this._scene());
      this.effects.push(shield);
      play(defender, 'Block', Math.max(0, ev.time - 0.08), 0.85);
    } else if (dodged) {
      play(defender, 'Dodge', Math.max(0, ev.time - 0.08), 0.65);
    } else if (reaction === 'Knockdown') {
      play(defender, 'HitStagger', ev.time + 0.03, 0.28);
      play(defender, 'Knockdown', ev.time + 0.16, 0.9);
    } else {
      play(defender, reaction, ev.time + 0.04, 0.78);
    }

    if (!dodged) {
      this._knockback(attacker, defender, ev.time + 0.04, num(ev.options.knockback, 0.35), num(ev.options.knockTime, 0.38));
    }

    const flash = new ScreenFlash({
      color: c,
      duration: 0.12,
      intensity: num(ev.options.flash, 0.18),
      camera: this.sb.camera,
    });
    this.effects.push(flash);
  }

  _meleeStart(ev) {
    const { attacker, defender } = this._chars(ev.options);
    if (!attacker || !defender) return;
    face(attacker, defender);
    face(defender, attacker);
    const range = num(ev.options.range, 0.95);
    const a = attacker.mesh.position;
    const d = defender.mesh.position;
    const dir = new THREE.Vector3(a.x - d.x, 0, a.z - d.z);
    if (dir.lengthSq() < 0.001) dir.set(1, 0, 0);
    dir.normalize();
    const target = { x: d.x + dir.x * range, y: a.y, z: d.z + dir.z * range };
    attacker.moveTo?.(target, ev.time, Math.max(0.12, num(ev.options.windup, 0.35)));
    play(attacker, ev.options.approach || 'DashForward', ev.time, num(ev.options.windup, 0.35));
  }

  _meleeHit(ev) {
    const { attacker, defender } = this._chars(ev.options);
    if (!attacker || !defender) return;
    face(attacker, defender);
    face(defender, attacker);
    const c = color(ev.options.color, 0xffcc55);
    const anim = ev.options.anim || 'Uppercut';
    play(attacker, anim, ev.time, 0.55);
    const reaction = reactionName(ev.options);
    if (reaction === 'Knockdown') {
      play(defender, 'HitStagger', ev.time + 0.04, 0.24);
      play(defender, 'Knockdown', ev.time + 0.16, 0.8);
    } else {
      play(defender, reaction, ev.time + 0.05, 0.74);
    }

    const end = centerOf(defender, 1.0);
    const explosion = new HitExplosion({
      position: end,
      color: c,
      duration: num(ev.options.impactDuration, 0.36),
      maxRadius: num(ev.options.impactRadius, 0.55),
      sparkCount: 16,
    });
    explosion.addTo(this._scene());
    this.effects.push(explosion);

    const shock = new Shockwave({
      position: new THREE.Vector3(end.x, 0.03, end.z),
      color: c,
      duration: num(ev.options.shockDuration, 0.5),
      maxRadius: num(ev.options.shockRadius, 1.7),
    });
    shock.addTo(this._scene());
    this.effects.push(shock);
    this._knockback(attacker, defender, ev.time, num(ev.options.knockback, 0.55), num(ev.options.knockTime, 0.32));
  }

  _knockback(attacker, defender, startTime, distance, duration) {
    if (!attacker?.mesh || !defender?.mesh || distance <= 0) return;
    const a = attacker.mesh.position;
    const d = defender.mesh.position;
    const dir = new THREE.Vector3(d.x - a.x, 0, d.z - a.z);
    if (dir.lengthSq() < 0.001) dir.set(1, 0, 0);
    dir.normalize();
    defender.moveTo?.({ x: d.x + dir.x * distance, y: d.y, z: d.z + dir.z * distance }, startTime, duration);
  }
}
