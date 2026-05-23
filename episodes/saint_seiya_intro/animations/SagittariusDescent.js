import { AnimationBase } from 'dula-engine';

/**
 * SagittariusDescent - 艾俄洛斯从天而降
 * 金色光芒中降临，翅膀展开，气势磅礴
 */
export class SagittariusDescent extends AnimationBase {
  constructor() {
    super('SagittariusDescent', 4.0);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    const landStart = 2.5;

    // Phase 1: Descent from sky (0-2.5s)
    if (t < landStart) {
      const p = t / landStart;
      const ease = 1 - Math.pow(1 - p, 3);

      // Start high, descend to ground
      const startY = 12;
      const endY = character.baseY || 0;
      character.mesh.position.y = startY - (startY - endY) * ease;

      // Wings spread gradually
      if (character.leftWing) {
        character.leftWing.rotation.z = 0.8 - 0.5 * ease;
      }
      if (character.rightWing) {
        character.rightWing.rotation.z = -0.8 + 0.5 * ease;
      }

      // Arms spread wide
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.8 * ease;
        character.rightArm.rotation.x = -0.3 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.8 * ease;
        character.leftArm.rotation.x = -0.3 * ease;
      }

      // Head looking down
      if (character.headGroup) {
        character.headGroup.rotation.x = 0.25 * (1 - ease);
      }

      // Aura intensifies
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.15 + ease * 0.2;
        character.cosmosAura.scale.set(
          0.85 + ease * 0.4,
          1.6 + ease * 0.5,
          0.62 + ease * 0.2
        );
      }
    }
    // Phase 2: Landing impact (2.5-4.0s)
    else {
      const p = (t - landStart) / (this.duration - landStart);
      const ease = p * p * (3 - 2 * p);

      character.mesh.position.y = (character.baseY || 0) + Math.sin(p * Math.PI) * 0.03;

      // Arms lower to sides
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.8 + 0.35 * ease;
        character.rightArm.rotation.x = -0.3 + 0.15 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.8 - 0.35 * ease;
        character.leftArm.rotation.x = -0.3 + 0.15 * ease;
      }

      // Head raises
      if (character.headGroup) {
        character.headGroup.rotation.x = -0.12 * ease;
      }

      // Wings settle
      if (character.leftWing) {
        character.leftWing.rotation.z = 0.3 + Math.sin(time * 0.8) * 0.05;
      }
      if (character.rightWing) {
        character.rightWing.rotation.z = -0.3 - Math.sin(time * 0.8) * 0.05;
      }

      // Aura stabilizes
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.35 + Math.sin(p * Math.PI * 3) * 0.05;
      }
    }

    // Body micro-tremor during descent
    if (t < landStart) {
      const tremor = Math.sin(t * Math.PI * 15) * 0.003 * (1 - t / landStart);
      character.mesh.position.x = tremor;
    } else {
      character.mesh.position.x = 0;
    }
  }
}
