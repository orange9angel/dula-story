import { AnimationBase } from 'dula-engine';

/**
 * RobotTransform — 机器人变形成载具
 * 通过 character.transform(t) 从 0（机器人）插值到 1（载具）。
 */
export class RobotTransform extends AnimationBase {
  constructor(options = {}) {
    super('RobotTransform', options.duration || 1.5);
    this.tags.suits = ['vehicle', 'humanoid'];
  }

  update(t, character) {
    if (typeof character.transform === 'function') {
      character.transform(t);
    }
    // Snap to final mode before the animation ends so discrete time steps
    // (e.g., 0.1s verification captures) don't leave the character stuck
    // in a partial cross-fade.
    if (t >= 0.9) {
      character.setMode('vehicle');
    }
  }
}
