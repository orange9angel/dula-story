import { AnimationBase } from 'dula-engine';

export class ArcheryAim extends AnimationBase {
  constructor() {
    super('ArcheryAim', 1.4);
  }

  update(t, character) {
    const ease = t < 0.25 ? t / 0.25 : 1;
    if (character.setArcheryPose) {
      character.setArcheryPose(true);
    }
    if (character.headGroup) {
      character.headGroup.rotation.y = -0.1 * ease;
      character.headGroup.rotation.x = -0.04 * ease;
    }
  }
}
