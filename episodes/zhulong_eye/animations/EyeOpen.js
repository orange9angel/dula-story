import { AnimationBase } from 'dula-engine';

/**
 * Animation: Zhulong's eyes slowly open, blazing with divine fire.
 * Progress t goes 0 -> 1 over the animation duration.
 */
export class EyeOpen extends AnimationBase {
  constructor() {
    super('EyeOpen', 3.0); // 3 seconds for the slow dramatic reveal
  }

  update(t, character) {
    if (character.setEyeGlow) {
      // Use smoothstep for a more cinematic ease-in
      const smoothT = t * t * (3 - 2 * t);
      character.setEyeGlow(smoothT);
    }
  }
}
