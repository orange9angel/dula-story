import { AnimationBase } from 'dula-engine';

export class ReadableFireRifle extends AnimationBase {
  constructor() {
    super('ReadableFireRifle', 0.45);
  }

  update(t, character) {
    const rightArm = character.rightArm;
    const leftArm = character.leftArm;
    const head = character.headGroup;
    if (!rightArm) return;

    const recoil = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.28);
    const settle = Math.min(1, Math.max(0, t / 0.35));
    const rightBaseX = character.rightArmBaseX || 0;
    const rightBaseZ = character.rightArmBaseZ || 0;
    const leftBaseX = character.leftArmBaseX || 0;
    const leftBaseZ = character.leftArmBaseZ || 0;

    rightArm.rotation.x = rightBaseX - 1.25 + recoil * 0.28;
    rightArm.rotation.z = rightBaseZ - 0.55 + recoil * 0.12;

    if (leftArm) {
      leftArm.rotation.x = leftBaseX - 0.9 + recoil * 0.14;
      leftArm.rotation.z = leftBaseZ + 0.48;
    }
    if (head) {
      head.rotation.y = -0.12 * (1 - settle * 0.35);
    }

    character._syncPlasmaRifleVisibility?.(true);
  }
}
