import { AnimationBase, PoseMatrix } from 'dula-engine';

const TAU = Math.PI * 2;

function durationOf(options, fallback) {
  const value = Number(options?.duration);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

class CartoonAction extends AnimationBase {
  constructor(name, options, fallbackDuration, suits) {
    super(name, durationOf(options, fallbackDuration));
    this.usePoseMatrix = true;
    this.tags = {
      requires: ['rightArm', 'leftArm', 'rightLeg', 'leftLeg'],
      suits,
      notSuits: [],
      minHeight: 0,
      maxHeight: 3,
    };
  }
}

export class CatSneak extends CartoonAction {
  constructor(options = {}) {
    super('CatSneak', options, 1.4, ['cartoon-cat']);
  }

  getPoseMatrix(t, elapsed = t * this.duration) {
    const pose = new PoseMatrix();
    const gait = Math.sin(elapsed * TAU * 1.35);
    const lift = Math.max(0, Math.sin(elapsed * TAU * 2.7));
    pose.mesh = { rx: 0.18, y: -0.12 + lift * 0.035, rz: gait * 0.025 };
    pose.leftHip = { rx: gait * 0.48 };
    pose.rightHip = { rx: -gait * 0.48 };
    pose.leftKnee = { rx: Math.max(0, -gait) * 0.65 + 0.18 };
    pose.rightKnee = { rx: Math.max(0, gait) * 0.65 + 0.18 };
    pose.leftShoulder = { rx: -gait * 0.3, rz: 0.18 };
    pose.rightShoulder = { rx: gait * 0.3, rz: -0.18 };
    pose.leftElbow = { rx: -0.7 };
    pose.rightElbow = { rx: -0.7 };
    return pose;
  }
}

export class MouseScamper extends CartoonAction {
  constructor(options = {}) {
    super('MouseScamper', options, 0.9, ['cartoon-mouse']);
  }

  getPoseMatrix(t, elapsed = t * this.duration) {
    const pose = new PoseMatrix();
    const gait = Math.sin(elapsed * TAU * 4.2);
    const bounce = Math.abs(gait);
    pose.mesh = { rx: 0.12, y: bounce * 0.055, rz: gait * 0.055 };
    pose.leftHip = { rx: gait * 0.72 };
    pose.rightHip = { rx: -gait * 0.72 };
    pose.leftKnee = { rx: Math.max(0, -gait) * 0.9 };
    pose.rightKnee = { rx: Math.max(0, gait) * 0.9 };
    pose.leftShoulder = { rx: -gait * 0.68 };
    pose.rightShoulder = { rx: gait * 0.68 };
    return pose;
  }
}

export class CatPounce extends CartoonAction {
  constructor(options = {}) {
    super('CatPounce', options, 1.1, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const anticipation = t < 0.22 ? Math.sin((t / 0.22) * Math.PI) : 0;
    const flightT = Math.max(0, Math.min(1, (t - 0.18) / 0.62));
    const flight = Math.sin(flightT * Math.PI);
    const settle = Math.max(0, (t - 0.8) / 0.2);
    pose.mesh = {
      rx: -0.35 * flight + 0.22 * settle,
      y: -0.16 * anticipation + 0.72 * flight - 0.08 * settle,
      rz: Math.sin(t * Math.PI) * 0.04,
    };
    pose.leftShoulder = { rx: -1.3 * flight, rz: 0.55 * flight };
    pose.rightShoulder = { rx: -1.3 * flight, rz: -0.55 * flight };
    pose.leftElbow = { rx: -0.3 - flight * 0.55 };
    pose.rightElbow = { rx: -0.3 - flight * 0.55 };
    pose.leftHip = { rx: -0.75 * flight + 0.45 * settle };
    pose.rightHip = { rx: -0.9 * flight + 0.5 * settle };
    pose.leftKnee = { rx: 1.05 * flight };
    pose.rightKnee = { rx: 1.2 * flight };
    return pose;
  }
}

export class CatCatchStack extends CartoonAction {
  constructor(options = {}) {
    super('CatCatchStack', options, 1.25, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const wobble = Math.sin(t * TAU * 3.5) * (1 - t * 0.55);
    const dip = Math.sin(t * Math.PI) * 0.09;
    pose.mesh = { y: -dip, rz: wobble * 0.11 };
    pose.leftShoulder = { rx: -0.55, rz: 1.75 + wobble * 0.25 };
    pose.rightShoulder = { rx: -0.55, rz: -1.75 + wobble * 0.25 };
    pose.leftElbow = { rx: -0.38 - Math.abs(wobble) * 0.3 };
    pose.rightElbow = { rx: -0.38 - Math.abs(wobble) * 0.3 };
    pose.leftHip = { rz: 0.12 - wobble * 0.08 };
    pose.rightHip = { rz: -0.12 - wobble * 0.08 };
    return pose;
  }
}

export class CatSkid extends CartoonAction {
  constructor(options = {}) {
    super('CatSkid', options, 0.95, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const shake = Math.sin(t * TAU * 6) * (1 - t);
    const brake = Math.sin(Math.min(1, t * 1.25) * Math.PI);
    pose.mesh = { rx: 0.34 * brake, y: -0.14 * brake, rz: shake * 0.08 };
    pose.leftShoulder = { rx: 0.95 * brake, rz: 0.42 + shake * 0.2 };
    pose.rightShoulder = { rx: 0.95 * brake, rz: -0.42 + shake * 0.2 };
    pose.leftHip = { rx: -0.62 * brake, rz: 0.25 };
    pose.rightHip = { rx: -0.62 * brake, rz: -0.25 };
    pose.leftKnee = { rx: 0.7 * brake };
    pose.rightKnee = { rx: 0.7 * brake };
    return pose;
  }
}

export class MouseOffer extends CartoonAction {
  constructor(options = {}) {
    super('MouseOffer', options, 1.0, ['cartoon-mouse']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const present = Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5);
    pose.mesh = { rx: -0.05, y: Math.sin(t * Math.PI) * 0.025 };
    pose.leftShoulder = { rx: -1.0 * present, rz: 0.35 * present };
    pose.rightShoulder = { rx: -1.0 * present, rz: -0.35 * present };
    pose.leftElbow = { rx: -0.6 * present };
    pose.rightElbow = { rx: -0.6 * present };
    return pose;
  }
}

export class CartoonShush extends CartoonAction {
  constructor(options = {}) {
    super('CartoonShush', options, 0.9, ['cartoon-cat', 'cartoon-mouse']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const raise = Math.sin(Math.min(1, t * 1.8) * Math.PI * 0.5);
    pose.mesh = { rx: -0.04 };
    pose.rightShoulder = { rx: -1.25 * raise, rz: -0.28 * raise };
    pose.rightElbow = { rx: -1.1 * raise };
    pose.leftShoulder = { rz: 0.18 * raise };
    return pose;
  }
}

export class MouseTaunt extends CartoonAction {
  constructor(options = {}) {
    super('MouseTaunt', options, 0.85, ['cartoon-mouse']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const sway = Math.sin(t * TAU * 2.2);
    pose.mesh = { y: Math.abs(sway) * 0.055, rz: sway * 0.12 };
    pose.leftShoulder = { rz: 0.95 + sway * 0.18 };
    pose.rightShoulder = { rz: -0.95 + sway * 0.18 };
    pose.leftHip = { rz: 0.12 };
    pose.rightHip = { rz: -0.12 };
    return pose;
  }
}

export class CatTrapPress extends CartoonAction {
  constructor(options = {}) {
    super('CatTrapPress', options, 1.3, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const strain = Math.sin(t * TAU * 4) * 0.035;
    pose.mesh = { rx: 0.24, y: -0.16, rz: strain };
    pose.leftShoulder = { rx: -1.2, rz: 0.25 };
    pose.rightShoulder = { rx: -1.2, rz: -0.25 };
    pose.leftElbow = { rx: -0.45 };
    pose.rightElbow = { rx: -0.45 };
    pose.leftHip = { rx: 0.75, rz: 0.12 };
    pose.rightHip = { rx: -0.1, rz: -0.12 };
    pose.leftKnee = { rx: 0.75 };
    return pose;
  }
}

export class CatDoom extends CartoonAction {
  constructor(options = {}) {
    super('CatDoom', options, 1.5, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const rise = Math.min(1, t * 2.4);
    const tremble = Math.sin(t * TAU * 8) * (0.03 + 0.05 * t);
    pose.mesh = { rx: -0.08 * rise, rz: tremble };
    pose.leftShoulder = { rz: 0.35 + tremble * 2 };
    pose.rightShoulder = { rz: -0.35 + tremble * 2 };
    pose.leftElbow = { rx: -0.65 };
    pose.rightElbow = { rx: -0.65 };
    pose.leftHip = { rz: 0.1 };
    pose.rightHip = { rz: -0.1 };
    return pose;
  }
}

export class CatReachCake extends CartoonAction {
  constructor(options = {}) {
    super('CatReachCake', options, 1.0, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const reach = Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5);
    pose.mesh = { rx: 0.22 * reach, y: -0.08 * reach };
    pose.rightShoulder = { rx: -1.15 * reach, rz: -0.35 * reach };
    pose.rightElbow = { rx: -0.55 * reach };
    pose.rightWrist = { rx: -0.3 * reach };
    pose.leftShoulder = { rx: -0.35 * reach, rz: 0.2 * reach };
    pose.leftElbow = { rx: -0.25 * reach };
    pose.headGroup = { rx: -0.12 * reach };
    return pose;
  }
}

export class CatGrab extends CartoonAction {
  constructor(options = {}) {
    super('CatGrab', options, 0.8, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const grab = Math.sin(Math.min(1, t * 1.8) * Math.PI * 0.5);
    pose.mesh = { rx: 0.18 * grab, y: -0.12 * grab };
    pose.rightShoulder = { rx: -1.05 * grab, rz: -0.25 * grab };
    pose.rightElbow = { rx: -0.85 * grab };
    pose.rightWrist = { rx: -0.55 * grab };
    pose.leftShoulder = { rx: -1.05 * grab, rz: 0.25 * grab };
    pose.leftElbow = { rx: -0.85 * grab };
    pose.leftWrist = { rx: -0.55 * grab };
    return pose;
  }
}

export class CatSlip extends CartoonAction {
  constructor(options = {}) {
    super('CatSlip', options, 1.1, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const slip = Math.min(1, t * 1.3);
    const wobble = Math.sin(t * TAU * 7) * (1 - slip) * 0.12;
    pose.mesh = { rx: 0.45 * slip, y: -0.18 * slip, rz: wobble };
    pose.rightShoulder = { rx: 0.95 * slip, rz: -0.55 * slip };
    pose.rightElbow = { rx: -0.55 * slip };
    pose.leftShoulder = { rx: 0.85 * slip, rz: 0.55 * slip };
    pose.leftElbow = { rx: -0.45 * slip };
    pose.rightHip = { rx: -0.35 * slip };
    pose.leftHip = { rx: -0.55 * slip };
    pose.rightKnee = { rx: 0.45 * slip };
    pose.leftKnee = { rx: 0.65 * slip };
    pose.headGroup = { rx: -0.25 * slip };
    return pose;
  }
}

export class CatPieFace extends CartoonAction {
  constructor(options = {}) {
    super('CatPieFace', options, 0.9, ['cartoon-cat']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const hit = t < 0.25 ? t / 0.25 : Math.max(0, 1 - (t - 0.25) / 0.75);
    const recoilPhase = Math.max(0, Math.min(1, (t - 0.25) / 0.75));
    const recoil = Math.sin(recoilPhase * Math.PI);
    pose.mesh = { rx: -0.35 * hit + 0.25 * recoil, y: 0.08 * hit - 0.12 * recoil };
    pose.rightShoulder = { rx: -1.0 * hit, rz: -0.45 * hit };
    pose.rightElbow = { rx: -0.9 * hit };
    pose.leftShoulder = { rx: -1.0 * hit, rz: 0.45 * hit };
    pose.leftElbow = { rx: -0.9 * hit };
    pose.headGroup = {
      rx: -0.45 * hit + 0.2 * recoil,
      rz: Math.sin(t * TAU * 11) * hit * 0.05,
    };
    return pose;
  }
}

export class MousePushCake extends CartoonAction {
  constructor(options = {}) {
    super('MousePushCake', options, 0.8, ['cartoon-mouse']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const push = Math.sin(Math.min(1, t * 1.8) * Math.PI * 0.5);
    pose.mesh = { rx: -0.15 * push, y: -0.02 * push };
    pose.rightShoulder = { rx: -0.95 * push, rz: -0.25 * push };
    pose.rightElbow = { rx: -0.55 * push };
    pose.leftShoulder = { rx: -0.95 * push, rz: 0.25 * push };
    pose.leftElbow = { rx: -0.55 * push };
    pose.headGroup = { rx: 0.08 * push };
    return pose;
  }
}

export class MouseDodge extends CartoonAction {
  constructor(options = {}) {
    super('MouseDodge', options, 0.6, ['cartoon-mouse']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const dodge = Math.sin(Math.min(1, t * 2.2) * Math.PI);
    pose.mesh = { y: 0.06 * dodge, rz: -0.55 * dodge };
    pose.rightShoulder = { rx: -0.55 * dodge, rz: 0.35 * dodge };
    pose.leftShoulder = { rx: -0.45 * dodge, rz: -0.35 * dodge };
    pose.rightHip = { rz: 0.2 * dodge };
    pose.leftHip = { rz: -0.2 * dodge };
    return pose;
  }
}

export class MouseWaveGoodbye extends CartoonAction {
  constructor(options = {}) {
    super('MouseWaveGoodbye', options, 1.0, ['cartoon-mouse']);
  }

  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const wave = Math.sin(t * TAU * 4);
    const raise = Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5);
    pose.mesh = { y: Math.abs(wave) * 0.02 * raise, rz: wave * 0.04 * raise };
    pose.rightShoulder = { rx: -1.4 * raise, rz: -0.35 * raise };
    pose.rightElbow = { rx: -0.55 * raise, rz: wave * 0.45 * raise };
    pose.rightWrist = { rz: wave * 0.55 * raise };
    pose.headGroup = { rz: -wave * 0.05 * raise };
    return pose;
  }
}
