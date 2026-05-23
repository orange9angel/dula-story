import { AnimationBase } from 'dula-engine';

/**
 * PegasusCosmosIgnite - 小宇宙燃烧（热血版）
 * 更强烈的能量爆发感，地面冲击波，光环脉动
 */
export class PegasusCosmosIgnite extends AnimationBase {
  constructor() {
    super('PegasusCosmosIgnite', 2.5);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    // 三阶段：蓄力(0-0.6) → 爆发(0.6-1.4) → 稳定燃烧(1.4-2.5)
    const chargeEnd = 0.6;
    const burstEnd = 1.4;

    // 蓄力阶段：身体微蹲，双臂内收，能量聚集
    if (t < chargeEnd) {
      const p = t / chargeEnd;
      const ease = p * p; // ease-in

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.3 * ease;
        character.rightArm.rotation.x = -0.15 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.3 * ease;
        character.leftArm.rotation.x = -0.15 * ease;
      }

      // 身体微蹲
      character.mesh.position.y = character.baseY - 0.06 * ease;

      // 头部低垂蓄力
      if (character.headGroup) {
        character.headGroup.rotation.x = 0.15 * ease;
      }

      // 光环预燃
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.06 + ease * 0.1;
        character.cosmosAura.scale.set(
          0.82 + ease * 0.1,
          1.55 + ease * 0.15,
          0.58 + ease * 0.05
        );
      }
    }
    // 爆发阶段：双臂猛然张开，身体挺直，光环爆发
    else if (t < burstEnd) {
      const p = (t - chargeEnd) / (burstEnd - chargeEnd);
      const ease = 1 - Math.pow(1 - p, 3); // explosive ease-out

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.3 - 0.6 * ease;
        character.rightArm.rotation.x = -0.15 - 0.25 * ease;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.3 + 0.6 * ease;
        character.leftArm.rotation.x = -0.15 - 0.25 * ease;
      }

      // 身体挺直
      character.mesh.position.y = character.baseY - 0.06 * (1 - ease);

      // 头部猛然抬起
      if (character.headGroup) {
        character.headGroup.rotation.x = 0.15 - 0.3 * ease;
      }

      // 光环爆发
      if (character.cosmosAura) {
        const burst = Math.sin(p * Math.PI) * 0.5;
        character.cosmosAura.material.opacity = 0.16 + burst;
        character.cosmosAura.scale.set(
          0.92 + burst * 0.5,
          1.7 + burst * 0.6,
          0.63 + burst * 0.3
        );
      }

      // 身体微震
      const tremor = Math.sin(p * Math.PI * 20) * 0.005 * (1 - p);
      character.mesh.position.x = tremor;
    }
    // 稳定燃烧阶段
    else {
      const p = (t - burstEnd) / (this.duration - burstEnd);
      const hold = Math.min(1, p * 2);

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        const pulse = Math.sin(t * Math.PI * 6) * 0.03;
        character.rightArm.rotation.z = base - 0.9 + pulse;
        character.rightArm.rotation.x = -0.4 + Math.sin(t * Math.PI * 4) * 0.02;
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        const pulse = Math.sin(t * Math.PI * 6 + Math.PI) * 0.03;
        character.leftArm.rotation.z = base + 0.9 + pulse;
        character.leftArm.rotation.x = -0.4 + Math.sin(t * Math.PI * 4 + Math.PI) * 0.02;
      }

      character.mesh.position.y = character.baseY + Math.sin(t * Math.PI * 3) * 0.005;

      if (character.headGroup) {
        character.headGroup.rotation.x = -0.15 + Math.sin(t * Math.PI * 5) * 0.015;
      }

      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.2 + Math.sin(t * Math.PI * 5) * 0.06;
        character.cosmosAura.scale.set(
          1.15 + Math.sin(t * Math.PI * 4) * 0.05,
          1.95 + Math.sin(t * Math.PI * 3.5) * 0.08,
          0.78 + Math.sin(t * Math.PI * 4.5) * 0.03
        );
      }
    }

    // 胸甲震动
    if (character.chestArmor) {
      const intensity = t < chargeEnd ? 0.005 : t < burstEnd ? 0.012 : 0.008;
      character.chestArmor.position.y = Math.sin(t * Math.PI * 10) * intensity;
    }
  }
}
