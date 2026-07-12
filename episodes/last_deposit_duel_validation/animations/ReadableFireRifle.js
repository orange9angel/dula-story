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

    const recoil = t < 0.1 ? t / 0.1 : Math.max(0, 1 - (t - 0.1) / 0.34);
    const settle = Math.min(1, Math.max(0, t / 0.35));
    const rightBaseX = character.rightArmBaseX || 0;
    const rightBaseZ = character.rightArmBaseZ || 0;
    const leftBaseX = character.leftArmBaseX || 0;
    const leftBaseZ = character.leftArmBaseZ || 0;

    rightArm.rotation.x = rightBaseX - 1.28 + recoil * 0.48;
    rightArm.rotation.z = rightBaseZ - 0.58 + recoil * 0.18;

    if (leftArm) {
      leftArm.rotation.x = leftBaseX - 0.92 + recoil * 0.24;
      leftArm.rotation.z = leftBaseZ + 0.5 + recoil * 0.08;
    }
    if (head) {
      head.rotation.x = -0.04 * recoil;
      head.rotation.y = -0.12 * (1 - settle * 0.35);
    }

    const weapon = character.plasmaRifleGroup;
    if (weapon) {
      if (!weapon.userData.fireBasePosition) {
        weapon.userData.fireBasePosition = weapon.position.clone();
        weapon.userData.fireBaseScale = weapon.scale.clone();
      }
      weapon.position.copy(weapon.userData.fireBasePosition);
      weapon.position.z -= recoil * 0.1;
      weapon.scale.copy(weapon.userData.fireBaseScale);
      weapon.scale.multiplyScalar(1 + recoil * 0.05);
    }

    character._syncPlasmaRifleVisibility?.(true);
  }
}
