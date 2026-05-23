import { AnimationBase } from 'dula-engine';

/**
 * PegasusClothShine - 天马座圣衣逐部位发光动画
 * 胸甲→肩甲→臂甲→腿甲依次亮起，伴随金属反光
 */
export class PegasusClothShine extends AnimationBase {
  constructor() {
    super('PegasusClothShine', 4.0);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    // 分阶段点亮各部位
    // 0-1s: 胸甲
    // 1-2s: 肩甲
    // 2-3s: 臂甲+腿甲
    // 3-4s: 全身共鸣

    const phases = [
      { start: 0.0, end: 1.0, part: 'chest' },
      { start: 1.0, end: 2.0, part: 'shoulders' },
      { start: 2.0, end: 3.0, part: 'limbs' },
      { start: 3.0, end: 4.0, part: 'full' },
    ];

    let activePhase = phases[0];
    for (const p of phases) {
      if (t >= p.start && t < p.end) {
        activePhase = p;
        break;
      }
    }

    const phaseProgress = (t - activePhase.start) / (activePhase.end - activePhase.start);
    const ease = phaseProgress < 0.5
      ? 4 * phaseProgress * phaseProgress * phaseProgress
      : 1 - Math.pow(-2 * phaseProgress + 2, 3) / 2; // ease-in-out cubic

    // 胸甲发光脉冲
    if (character.chestArmor) {
      const chestGlow = activePhase.part === 'chest' ? ease
        : activePhase.part === 'shoulders' ? 1.0 - (t - 1.0) * 0.3
        : activePhase.part === 'limbs' ? 0.7 + Math.sin(t * 5) * 0.1
        : 0.8 + Math.sin(t * 6) * 0.15;
      character.chestArmor.position.y = Math.sin(t * Math.PI * 6) * 0.008 * chestGlow;
    }

    // 肩甲展开
    if (character.leftShoulderArmor && character.rightShoulderArmor) {
      const shoulderGlow = activePhase.part === 'shoulders' ? ease
        : activePhase.part === 'limbs' ? 1.0
        : 0.9 + Math.sin(t * 4) * 0.1;
      character.leftShoulderArmor.rotation.y = shoulderGlow * 0.15;
      character.rightShoulderArmor.rotation.y = -shoulderGlow * 0.15;
    }

    // 双臂前伸展示
    if (character.rightArm) {
      const base = character.rightArmBaseZ || 0;
      const limbGlow = activePhase.part === 'limbs' ? ease
        : activePhase.part === 'full' ? 1.0
        : 0;
      character.rightArm.rotation.z = base - 0.25 * limbGlow;
      character.rightArm.rotation.x = -0.1 * limbGlow;
    }
    if (character.leftArm) {
      const base = character.leftArmBaseZ || 0;
      const limbGlow = activePhase.part === 'limbs' ? ease
        : activePhase.part === 'full' ? 1.0
        : 0;
      character.leftArm.rotation.z = base + 0.25 * limbGlow;
      character.leftArm.rotation.x = -0.1 * limbGlow;
    }

    // 小宇宙光环随阶段增强
    if (character.cosmosAura) {
      const auraBoost = activePhase.part === 'full'
        ? 0.25 + ease * 0.15
        : activePhase.part === 'limbs'
        ? 0.18 + ease * 0.1
        : 0.12 + ease * 0.08;
      character.cosmosAura.material.opacity = auraBoost;
      const scaleBoost = 1.0 + (activePhase.part === 'full' ? ease * 0.3 : 0);
      character.cosmosAura.scale.set(
        0.82 * scaleBoost + Math.sin(t * 3) * 0.03,
        1.55 * scaleBoost + Math.sin(t * 2.5) * 0.05,
        0.58 * scaleBoost
      );
    }

    // 头部微微后仰（展示圣衣的骄傲姿态）
    if (character.headGroup) {
      const headTilt = activePhase.part === 'full' ? ease * 0.1 : 0;
      character.headGroup.rotation.x = -headTilt;
    }

    // 身体轻微旋转展示
    if (activePhase.part === 'full') {
      character.mesh.rotation.y = Math.sin(ease * Math.PI) * 0.3;
    }
  }
}
