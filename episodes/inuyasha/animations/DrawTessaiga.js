import { AnimationBase } from 'dula-engine';

export class DrawTessaiga extends AnimationBase {
  constructor() {
    super('DrawTessaiga', 1.5);
  }

  update(t, character) {
    if (character.attachSword) character.attachSword();
    const arm = character.rightArm;
    if (!arm) return;

    const baseZ = character.rightArmBaseZ || arm.rotation.z;
    if (t < 0.35) {
      const p = t / 0.35;
      arm.rotation.z = baseZ - p * 0.9;
      arm.rotation.x = -p * 0.55;
    } else if (t < 0.72) {
      const p = (t - 0.35) / 0.37;
      arm.rotation.z = baseZ - 0.9 - p * 0.45;
      arm.rotation.x = -0.55 - p * 1.35;
    } else {
      const p = (t - 0.72) / 0.28;
      arm.rotation.z = baseZ - 1.35 + Math.sin(p * Math.PI * 2) * 0.04;
      arm.rotation.x = -1.9 + Math.sin(p * Math.PI * 3) * 0.03;
      if (character.showSwordAura) character.showSwordAura();
    }
  }
}
