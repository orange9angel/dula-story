import { AnimationBase } from 'dula-engine';

/**
 * SagittariusGoldenGlow - 黄金小宇宙爆发
 * 全身金光闪耀，气势磅礴
 */
export class SagittariusGoldenGlow extends AnimationBase {
  constructor() {
    super('SagittariusGoldenGlow', 3.0);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    const burstEnd = 1.2;
    const fadeEnd = 2.5;

    // Phase 1: Golden burst (0-1.2s)
    if (t < burstEnd) {
      const p = t / burstEnd;
      const ease = 1 - Math.pow(1 - p, 3);

      // Arms spread wide
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.7 * ease;
        character.rightArm.rotation.x = -0.25 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.7 * ease;
        character.leftArm.rotation.x = -0.25 * ease;
      }

      // Head back, looking up
      if (character.headGroup) {
        character.headGroup.rotation.x = -0.2 * ease;
      }

      // Wings spread
      if (character.leftWing) {
        character.leftWing.rotation.z = 0.3 + 0.4 * ease;
      }
      if (character.rightWing) {
        character.rightWing.rotation.z = -0.3 - 0.4 * ease;
      }

      // Aura massive burst
      if (character.cosmosAura) {
        const burst = Math.sin(p * Math.PI) * 0.6;
        character.cosmosAura.material.opacity = 0.15 + burst;
        character.cosmosAura.scale.set(
          0.85 + burst * 0.8,
          1.6 + burst * 1.0,
          0.62 + burst * 0.5
        );
      }

      // Body lift
      character.mesh.position.y = (character.baseY || 0) + 0.08 * ease;
    }
    // Phase 2: Sustained glow (1.2-2.5s)
    else if (t < fadeEnd) {
      const p = (t - burstEnd) / (fadeEnd - burstEnd);

      // Arms slowly lower
      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.7 + 0.3 * p;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.7 - 0.3 * p;
      }

      // Wings settle
      if (character.leftWing) {
        character.leftWing.rotation.z = 0.7 - 0.4 * p;
      }
      if (character.rightWing) {
        character.rightWing.rotation.z = -0.7 + 0.4 * p;
      }

      // Aura pulse
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.35 + Math.sin(p * Math.PI * 5) * 0.1;
        character.cosmosAura.scale.set(
          1.3 + Math.sin(p * Math.PI * 3) * 0.1,
          2.0 + Math.sin(p * Math.PI * 2.5) * 0.15,
          0.9 + Math.sin(p * Math.PI * 3) * 0.05
        );
      }

      character.mesh.position.y = (character.baseY || 0) + 0.08 - 0.05 * p;
    }
    // Phase 3: Settle (2.5-3.0s)
    else {
      const p = (t - fadeEnd) / (this.duration - fadeEnd);
      const ease = p * p * (3 - 2 * p);

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.4 - 0.2 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.4 + 0.2 * ease;
      }

      if (character.headGroup) {
        character.headGroup.rotation.x = -0.2 + 0.1 * ease;
      }

      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.3 + Math.sin(t * Math.PI * 4) * 0.05;
      }

      character.mesh.position.y = (character.baseY || 0) + 0.03 - 0.03 * ease;
    }
  }
}
