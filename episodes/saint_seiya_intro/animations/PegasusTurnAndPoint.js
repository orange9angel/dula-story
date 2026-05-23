import { AnimationBase } from 'dula-engine';

/**
 * PegasusTurnAndPoint - 转身指向天空的经典动作
 * 流畅转身+指天，配合眼神和披风飘动
 */
export class PegasusTurnAndPoint extends AnimationBase {
  constructor() {
    super('PegasusTurnAndPoint', 2.8);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    // 0-1.2s: 流畅转身
    // 1.2-2.8s: 指天定格

    const turnEnd = 1.2;

    // 身体旋转
    if (t < turnEnd) {
      const p = t / turnEnd;
      const ease = p * p * (3 - 2 * p); // smoothstep
      character.mesh.rotation.y = Math.PI * 0.7 * ease;
    } else {
      character.mesh.rotation.y = Math.PI * 0.7;
    }

    // 右臂：转身时自然摆动→猛然指天
    if (character.rightArm) {
      const base = character.rightArmBaseZ || 0;
      if (t < turnEnd) {
        const p = t / turnEnd;
        const ease = p * p * (3 - 2 * p);
        // 转身时手臂自然后摆
        character.rightArm.rotation.z = base - 0.2 * ease;
        character.rightArm.rotation.x = -0.1 * ease;
      } else {
        const p = Math.min(1, (t - turnEnd) / 0.6);
        const ease = 1 - Math.pow(1 - p, 3);
        // 猛然指天
        character.rightArm.rotation.z = base - 0.2 - 0.3 * ease;
        character.rightArm.rotation.x = -0.1 - 2.5 * ease;
      }
    }

    // 左臂：平衡姿态
    if (character.leftArm) {
      const base = character.leftArmBaseZ || 0;
      if (t < turnEnd) {
        const p = t / turnEnd;
        character.leftArm.rotation.z = base + 0.15 * p;
      } else {
        const p = Math.min(1, (t - turnEnd) / 0.6);
        character.leftArm.rotation.z = base + 0.15 + 0.2 * p;
        character.leftArm.rotation.x = -0.05;
      }
    }

    // 头部：转身时看向目标方向→抬头望天
    if (character.headGroup) {
      if (t < turnEnd) {
        const p = t / turnEnd;
        character.headGroup.rotation.y = 0.3 * p;
        character.headGroup.rotation.x = -0.05 * p;
      } else {
        const p = Math.min(1, (t - turnEnd) / 0.8);
        const ease = 1 - Math.pow(1 - p, 2);
        character.headGroup.rotation.y = 0.3;
        character.headGroup.rotation.x = -0.05 - 0.25 * ease; // 抬头
      }
    }

    // 小宇宙：指天时脉冲
    if (character.cosmosAura) {
      if (t < turnEnd) {
        character.cosmosAura.material.opacity = 0.15 + t * 0.05;
      } else {
        const pulse = 0.25 + Math.sin((t - turnEnd) * 4) * 0.08;
        character.cosmosAura.material.opacity = pulse;
        character.cosmosAura.scale.set(
          1.0 + Math.sin(t * 2.5) * 0.05,
          1.8 + Math.sin(t * 2.0) * 0.08,
          0.7 + Math.sin(t * 2.8) * 0.03
        );
      }
    }

    // 身体轻微后仰（力量感）
    if (t > turnEnd) {
      const p = Math.min(1, (t - turnEnd) / 1.0);
      character.mesh.position.y = character.baseY + Math.sin(p * Math.PI) * 0.02;
    }
  }
}
