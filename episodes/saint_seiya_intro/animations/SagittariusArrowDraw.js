import { AnimationBase } from 'dula-engine';

/**
 * SagittariusArrowDraw - 艾俄洛斯拉弓瞄准
 * 缓慢而有力的拉弓动作，能量聚集
 */
export class SagittariusArrowDraw extends AnimationBase {
  constructor() {
    super('SagittariusArrowDraw', 3.5);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();
    if (character.showBow) character.showBow();

    const drawEnd = 2.0;
    const holdEnd = 3.0;

    // Phase 1: Draw bow (0-2.0s)
    if (t < drawEnd) {
      const p = t / drawEnd;
      const ease = p * p * (3 - 2 * p);

      // Left arm extends forward holding bow
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.3 * ease;
        character.leftArm.rotation.x = -0.6 * ease;
      }

      // Right arm draws back
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.5 * ease;
        character.rightArm.rotation.x = -0.5 * ease;
      }

      // Head turns slightly, eyes focused
      if (character.headGroup) {
        character.headGroup.rotation.y = -0.15 * ease;
        character.headGroup.rotation.x = -0.08 * ease;
      }

      // Bow position
      if (character.bowGroup) {
        character.bowGroup.visible = true;
        character.bowGroup.position.set(0.35 + 0.1 * ease, 1.15, 0.35 + 0.1 * ease);
        character.bowGroup.rotation.z = -0.4 + 0.2 * ease;
        character.bowGroup.rotation.y = 0.3 + 0.2 * ease;
      }

      // Aura intensifies with draw
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.2 + ease * 0.25;
        character.cosmosAura.scale.set(
          0.85 + ease * 0.3,
          1.6 + ease * 0.4,
          0.62 + ease * 0.15
        );
      }
    }
    // Phase 2: Hold aim (2.0-3.0s)
    else if (t < holdEnd) {
      const p = (t - drawEnd) / (holdEnd - drawEnd);

      // Steady hold with micro tremor
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.5 + Math.sin(p * Math.PI * 4) * 0.008;
      }

      // Head steady
      if (character.headGroup) {
        character.headGroup.rotation.y = -0.15;
        character.headGroup.rotation.x = -0.08;
      }

      // Maximum aura
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.45 + Math.sin(p * Math.PI * 6) * 0.05;
      }
    }
    // Phase 3: Release (3.0-3.5s)
    else {
      const p = (t - holdEnd) / (this.duration - holdEnd);
      const ease = 1 - Math.pow(1 - p, 2);

      // Arms snap forward
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.5 + 0.6 * ease;
        character.rightArm.rotation.x = -0.5 + 0.4 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.3 - 0.2 * ease;
        character.leftArm.rotation.x = -0.6 + 0.3 * ease;
      }

      // Head snaps forward
      if (character.headGroup) {
        character.headGroup.rotation.y = -0.15 + 0.1 * ease;
        character.headGroup.rotation.x = -0.08 + 0.05 * ease;
      }

      // Bow lowers
      if (character.bowGroup) {
        character.bowGroup.position.set(0.45 - 0.15 * ease, 1.15, 0.45 - 0.2 * ease);
      }

      // Aura burst then fade
      if (character.cosmosAura) {
        const burst = Math.sin(p * Math.PI) * 0.3;
        character.cosmosAura.material.opacity = 0.45 - 0.15 * ease + burst;
      }
    }
  }
}
