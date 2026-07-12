import { AnimationBase } from 'dula-engine';

/**
 * RobotRevert — 载具变回机器人
 * progress 0=载具，1=机器人
 */
export class RobotRevert extends AnimationBase {
  constructor() {
    super('RobotRevert', 1.0);
  }

  update(t, character) {
    if (typeof character.transform !== 'function') return;
    character.transform(1 - t);
    if (t >= 1) {
      character.setMode('robot');
    }
  }
}
