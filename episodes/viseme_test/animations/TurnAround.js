import { AnimationBase } from 'dula-engine';

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

function numberOption(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function shortestAngle(delta) {
  let d = delta;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function directionSign(direction) {
  const d = String(direction || '').toLowerCase();
  return d === 'left' || d === 'ccw' || d === 'counterclockwise' ? -1 : 1;
}

function yawForTarget(target) {
  const map = {
    forward: 0,
    back: Math.PI,
    backward: Math.PI,
    left: -Math.PI / 2,
    right: Math.PI / 2,
  };
  return map[String(target || '').toLowerCase()];
}

/**
 * TurnAround - smooth in-place body turn.
 *
 * Story examples:
 *   {Animation:TurnAround|target=back|duration=1.6}
 *   {Animation:TurnAround|degrees=180|direction=left|duration=1.4}
 */
export class TurnAround extends AnimationBase {
  constructor(options = {}) {
    super('TurnAround', Math.max(0.3, numberOption(options.duration, 1.4)));
    this.direction = options.direction || options.side || 'right';
    this.degrees = clamp(15, 360, numberOption(options.degrees ?? options.angle, 180));
    this.target = options.target || options.face || null;
    this._startYaw = null;
    this._deltaYaw = null;
    this._base = null;
    this.tags = {
      requires: [],
      suits: ['humanoid', 'fighter', 'athletic', 'alien'],
      notSuits: ['quadruped'],
      minHeight: 0.5,
      maxHeight: 4.0,
    };
  }

  update(t, character) {
    if (!character?.mesh) return;

    if (this._startYaw === null) {
      this._startYaw = character.mesh.rotation.y || 0;
      this._base = this._captureBase(character);

      const sign = directionSign(this.direction);
      const targetYaw = yawForTarget(this.target);
      if (targetYaw !== undefined) {
        let delta = shortestAngle(targetYaw - this._startYaw);
        if (Math.abs(Math.abs(delta) - Math.PI) < 0.0001) delta = sign * Math.PI;
        this._deltaYaw = delta;
      } else {
        this._deltaYaw = sign * (this.degrees * Math.PI / 180);
      }
    }

    const p = clamp(0, 1, t);
    const eased = smoothstep(p);
    const swing = Math.sin(p * Math.PI);
    const sign = Math.sign(this._deltaYaw || 1);

    character.mesh.rotation.y = this._startYaw + this._deltaYaw * eased;

    if (character.headGroup && this._base?.headGroup) {
      character.headGroup.rotation.x = this._base.headGroup.x - 0.04 * swing;
      character.headGroup.rotation.y = this._base.headGroup.y + sign * 0.18 * swing;
    }

    if (character.rightArm && this._base?.rightArm) {
      character.rightArm.rotation.x = this._base.rightArm.x - 0.12 * swing;
      character.rightArm.rotation.z = this._base.rightArm.z - sign * 0.16 * swing;
    }

    if (character.leftArm && this._base?.leftArm) {
      character.leftArm.rotation.x = this._base.leftArm.x - 0.08 * swing;
      character.leftArm.rotation.z = this._base.leftArm.z + sign * 0.16 * swing;
    }

    if (character.rightLeg && this._base?.rightLeg) {
      character.rightLeg.rotation.z = this._base.rightLeg.z + sign * 0.035 * swing;
    }

    if (character.leftLeg && this._base?.leftLeg) {
      character.leftLeg.rotation.z = this._base.leftLeg.z - sign * 0.035 * swing;
    }
  }

  _captureBase(character) {
    return {
      headGroup: character.headGroup ? {
        x: character.headGroup.rotation.x,
        y: character.headGroup.rotation.y,
      } : null,
      rightArm: character.rightArm ? {
        x: character.rightArm.rotation.x,
        z: character.rightArm.rotation.z,
      } : null,
      leftArm: character.leftArm ? {
        x: character.leftArm.rotation.x,
        z: character.leftArm.rotation.z,
      } : null,
      rightLeg: character.rightLeg ? {
        z: character.rightLeg.rotation.z,
      } : null,
      leftLeg: character.leftLeg ? {
        z: character.leftLeg.rotation.z,
      } : null,
    };
  }
}
