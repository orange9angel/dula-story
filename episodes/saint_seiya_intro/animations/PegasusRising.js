import { AnimationBase } from 'dula-engine';

/**
 * PegasusRising - 星矢跃起，承接黄金意志
 * 从地面跃起，小宇宙与黄金共鸣
 */
export class PegasusRising extends AnimationBase {
  constructor() {
    super('PegasusRising', 3.0);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    const riseEnd = 1.0;
    const peakEnd = 2.0;

    // Phase 1: Crouch and leap (0-1.0s)
    if (t < riseEnd) {
      const p = t / riseEnd;
      const ease = p * p;

      // Crouch then leap
      const crouch = Math.sin(p * Math.PI);
      character.mesh.position.y = (character.baseY || 0) - 0.1 * crouch + 0.5 * ease;

      // Arms power up
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.5 * ease;
        character.rightArm.rotation.x = -0.6 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.5 * ease;
        character.leftArm.rotation.x = -0.6 * ease;
      }

      // Head back
      if (character.headGroup) {
        character.headGroup.rotation.x = -0.25 * ease;
      }

      // Aura burst
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.2 + ease * 0.3;
        character.cosmosAura.scale.set(
          0.82 + ease * 0.5,
          1.55 + ease * 0.8,
          0.58 + ease * 0.3
        );
      }
    }
    // Phase 2: Peak pose (1.0-2.0s)
    else if (t < peakEnd) {
      const p = (t - riseEnd) / (peakEnd - riseEnd);

      // Hover at peak
      character.mesh.position.y = (character.baseY || 0) + 0.5 + Math.sin(p * Math.PI) * 0.08;

      // Arms spread wide
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.5 - 0.2 * Math.sin(p * Math.PI);
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.5 + 0.2 * Math.sin(p * Math.PI);
      }

      // Head steady
      if (character.headGroup) {
        character.headGroup.rotation.x = -0.25 + Math.sin(p * Math.PI * 2) * 0.03;
      }

      // Aura pulse
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.5 + Math.sin(p * Math.PI * 6) * 0.1;
      }
    }
    // Phase 3: Land (2.0-3.0s)
    else {
      const p = (t - peakEnd) / (this.duration - peakEnd);
      const ease = p * p;

      // Descend
      character.mesh.position.y = (character.baseY || 0) + 0.5 * (1 - ease);

      // Arms lower
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.7 + 0.4 * ease;
        character.rightArm.rotation.x = -0.6 + 0.4 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.7 - 0.4 * ease;
        character.leftArm.rotation.x = -0.6 + 0.4 * ease;
      }

      // Head forward
      if (character.headGroup) {
        character.headGroup.rotation.x = -0.25 + 0.15 * ease;
      }

      // Aura settle
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.5 - 0.2 * ease;
        character.cosmosAura.scale.set(
          1.32 - 0.3 * ease,
          2.35 - 0.5 * ease,
          0.88 - 0.2 * ease
        );
      }
    }
  }
}
