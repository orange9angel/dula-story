import { AnimationBase } from 'dula-engine';

export class ReadableAimRifle extends AnimationBase {
  constructor() {
    super('ReadableAimRifle', 0.8);
  }

  update(t, character) {
    const rightArm = character.rightArm;
    const leftArm = character.leftArm;
    const head = character.headGroup;
    if (!rightArm) return;

    const p = Math.min(1, Math.max(0, t / 0.55));
    const ease = 1 - Math.pow(1 - p, 3);
    const rightBaseX = character.rightArmBaseX || 0;
    const rightBaseZ = character.rightArmBaseZ || 0;
    const leftBaseX = character.leftArmBaseX || 0;
    const leftBaseZ = character.leftArmBaseZ || 0;

    rightArm.rotation.x = rightBaseX - 1.15 * ease;
    rightArm.rotation.z = rightBaseZ - 0.55 * ease;

    if (leftArm) {
      leftArm.rotation.x = leftBaseX - 0.85 * ease;
      leftArm.rotation.z = leftBaseZ + 0.45 * ease;
    }
    if (head) {
      head.rotation.y = -0.12 * ease;
    }

    character._syncPlasmaRifleVisibility?.(true);
  }
}
