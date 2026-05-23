import { AnimationBase } from 'dula-engine';

/**
 * PegasusStanceEnter - 星矢登场动画
 * 从背对镜头转身，披风甩动，进入战斗姿态
 * 热血、有气势，参考TV OP经典登场
 */
export class PegasusStanceEnter extends AnimationBase {
  constructor() {
    super('PegasusStanceEnter', 3.5);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    // Phase 1: 0-0.8s 静止背对，小宇宙开始燃烧
    // Phase 2: 0.8-2.0s 缓慢转身，披风甩动
    // Phase 3: 2.0-3.5s 进入战斗姿态，眼神锐利

    const turnStart = 0.8;
    const stanceStart = 2.0;

    // 身体旋转：从背对(PI)到正面(0)
    if (t < turnStart) {
      character.mesh.rotation.y = Math.PI;
    } else if (t < stanceStart) {
      const p = (t - turnStart) / (stanceStart - turnStart);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      character.mesh.rotation.y = Math.PI * (1 - ease);
    } else {
      character.mesh.rotation.y = 0;
    }

    // 头部微动（转身时眼神扫视）
    if (character.headGroup) {
      if (t < turnStart) {
        character.headGroup.rotation.y = 0;
      } else if (t < stanceStart) {
        const p = (t - turnStart) / (stanceStart - turnStart);
        character.headGroup.rotation.y = Math.sin(p * Math.PI) * 0.3;
      } else {
        // 进入姿态后，头部微微抬起，眼神锐利
        const holdP = Math.min(1, (t - stanceStart) / 1.0);
        character.headGroup.rotation.y = 0;
        character.headGroup.rotation.x = -0.12 * holdP;
      }
    }

    // 右臂：从自然下垂到战斗姿态
    if (character.rightArm) {
      const base = character.rightArmBaseZ || 0;
      if (t < turnStart) {
        character.rightArm.rotation.z = base;
        character.rightArm.rotation.x = 0;
      } else if (t < stanceStart) {
        const p = (t - turnStart) / (stanceStart - turnStart);
        const ease = p * p * (3 - 2 * p); // smoothstep
        character.rightArm.rotation.z = base - 0.35 * ease;
        character.rightArm.rotation.x = -0.15 * ease;
      } else {
        const holdP = Math.min(1, (t - stanceStart) / 1.0);
        character.rightArm.rotation.z = base - 0.35 - 0.25 * holdP;
        character.rightArm.rotation.x = -0.15 - 0.2 * holdP;
      }
    }

    // 左臂：配合转身，然后前伸格挡姿态
    if (character.leftArm) {
      const base = character.leftArmBaseZ || 0;
      if (t < turnStart) {
        character.leftArm.rotation.z = base;
        character.leftArm.rotation.x = 0;
      } else if (t < stanceStart) {
        const p = (t - turnStart) / (stanceStart - turnStart);
        const ease = p * p * (3 - 2 * p);
        character.leftArm.rotation.z = base + 0.45 * ease;
        character.leftArm.rotation.x = -0.2 * ease;
      } else {
        const holdP = Math.min(1, (t - stanceStart) / 1.0);
        character.leftArm.rotation.z = base + 0.45 + 0.15 * holdP;
        character.leftArm.rotation.x = -0.2 - 0.15 * holdP;
      }
    }

    // 小宇宙光环：转身时爆发增强
    if (character.cosmosAura) {
      if (t < turnStart) {
        character.cosmosAura.material.opacity = 0.08 + t * 0.05;
        character.cosmosAura.scale.set(0.82, 1.55, 0.58);
      } else if (t < stanceStart) {
        const p = (t - turnStart) / (stanceStart - turnStart);
        const burst = Math.sin(p * Math.PI) * 0.3;
        character.cosmosAura.material.opacity = 0.12 + burst;
        character.cosmosAura.scale.set(
          0.82 + burst * 0.4,
          1.55 + burst * 0.5,
          0.58 + burst * 0.2
        );
      } else {
        const holdP = Math.min(1, (t - stanceStart) / 1.0);
        character.cosmosAura.material.opacity = 0.22 + holdP * 0.1;
        character.cosmosAura.scale.set(
          1.1 + Math.sin(t * 2.5) * 0.04,
          1.9 + Math.sin(t * 2.0) * 0.06,
          0.72 + Math.sin(t * 2.8) * 0.03
        );
      }
    }

    // 身体轻微起伏（呼吸感）
    if (t > stanceStart) {
      const breathe = Math.sin((t - stanceStart) * 2.5) * 0.008;
      character.mesh.position.y = character.baseY + breathe;
    }

    // 肩甲微动
    if (character.leftShoulderArmor && character.rightShoulderArmor) {
      const armorShake = t > stanceStart ? Math.sin((t - stanceStart) * 8) * 0.015 : 0;
      character.leftShoulderArmor.rotation.z = armorShake;
      character.rightShoulderArmor.rotation.z = -armorShake;
    }
  }
}
