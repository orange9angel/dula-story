import { AnimationBase } from 'dula-engine';

/**
 * RobotTransform — 机器人变形为载具
 * progress 0=机器人，1=载具
 */
export class RobotTransform extends AnimationBase {
  constructor() {
    super('RobotTransform', 1.0);
  }

  update(t, character) {
    if (typeof character.transform !== 'function') return;
    character.transform(t);
    if (t >= 1) {
      character.setMode('vehicle');
    }
  }
}
