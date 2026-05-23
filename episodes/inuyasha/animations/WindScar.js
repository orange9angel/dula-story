import { AnimationBase } from 'dula-engine';

export class WindScar extends AnimationBase {
  constructor() {
    super('WindScar', 1.6);
  }

  update(t, character) {
    if (character.attachSword) character.attachSword();
    if (character.showSwordAura) character.showSwordAura();

    const rArm = character.rightArm;
    const lArm = character.leftArm;
    if (!rArm) return;

    const rBaseZ = character.rightArmBaseZ || rArm.rotation.z;
    const lBaseZ = character.leftArmBaseZ || lArm?.rotation.z || 0;

    if (t < 0.3) {
      const p = t / 0.3;
      rArm.rotation.z = rBaseZ - 0.25 - p * 1.2;
      rArm.rotation.x = -0.2 - p * 1.0;
      if (lArm) lArm.rotation.z = lBaseZ + p * 0.45;
    } else if (t < 0.62) {
      const p = (t - 0.3) / 0.32;
      rArm.rotation.z = rBaseZ - 1.45 + p * 2.45;
      rArm.rotation.x = -1.2 + p * 0.65;
      character.mesh.rotation.y = -0.35 + p * 0.8;
    } else {
      const p = (t - 0.62) / 0.38;
      rArm.rotation.z = rBaseZ + 1.0 - p * 0.8;
      rArm.rotation.x = -0.55 - p * 0.1;
      character.mesh.rotation.y = 0.45 - p * 0.45;
    }
  }
}
