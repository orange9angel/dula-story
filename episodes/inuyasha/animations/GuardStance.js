import { AnimationBase } from 'dula-engine';

export class GuardStance extends AnimationBase {
  constructor() {
    super('GuardStance', 1.6);
  }

  update(t, character) {
    const rArm = character.rightArm;
    const lArm = character.leftArm;
    const ease = t < 0.28 ? t / 0.28 : 1;

    if (rArm) {
      const baseZ = character.rightArmBaseZ || rArm.rotation.z;
      rArm.rotation.z = baseZ - 0.45 * ease;
      rArm.rotation.x = -0.22 * ease;
    }
    if (lArm) {
      const baseZ = character.leftArmBaseZ || lArm.rotation.z;
      lArm.rotation.z = baseZ + 0.38 * ease;
      lArm.rotation.x = -0.18 * ease;
    }
    if (character.headGroup) {
      character.headGroup.rotation.y = -0.08 * ease;
    }
  }
}
