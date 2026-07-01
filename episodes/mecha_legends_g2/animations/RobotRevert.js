import { AnimationBase } from 'dula-engine';

/**
 * RobotRevert — 载具变回机器人
 */
export class RobotRevert extends AnimationBase {
  constructor(options = {}) {
    super('RobotRevert', options.duration || 1.5);
    this.tags.suits = ['vehicle', 'humanoid'];
  }

  update(t, character) {
    if (typeof character.transform === 'function') {
      character.transform(1 - t);
    }
    // Snap to final mode before the animation ends so discrete time steps
    // don't leave the character stuck in a partial cross-fade.
    if (t >= 0.9) {
      character.setMode('robot');
    }
  }
}
