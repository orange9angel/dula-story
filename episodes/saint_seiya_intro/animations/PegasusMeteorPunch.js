import { AnimationBase } from 'dula-engine';

/**
 * PegasusMeteorPunch - 天马流星拳（热血重制版）
 * 减少卡通化摇摆，增加真实格斗的预备→爆发→收势
 * 参考真实拳击动画的打击感
 */
export class PegasusMeteorPunch extends AnimationBase {
  constructor() {
    super('PegasusMeteorPunch', 4.0);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    // Phase 1: 0-1.0s 预备姿态（右拳后拉，左臂前伸格挡）
    // Phase 2: 1.0-2.5s 流星连击（左右交替快速出拳）
    // Phase 3: 2.5-4.0s 收势（双拳回防，喘息）

    const prepEnd = 1.0;
    const comboEnd = 2.5;

    if (t < prepEnd) {
      // 预备：右拳后拉蓄力，左臂前伸
      const p = t / prepEnd;
      const ease = p * p * (3 - 2 * p); // smoothstep

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.2 * ease;
        character.rightArm.rotation.x = -0.3 * ease; // 后拉
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.5 * ease;
        character.leftArm.rotation.x = -0.4 * ease; // 前伸格挡
      }

      // 身体侧转
      character.mesh.rotation.y = -0.25 * ease;

      // 后腿蹬地
      if (character.rightLeg) {
        character.rightLeg.rotation.x = 0.15 * ease;
      }

      // 头部紧盯目标
      if (character.headGroup) {
        character.headGroup.rotation.y = 0.1 * ease;
        character.headGroup.rotation.x = -0.05 * ease;
      }

      // 小宇宙聚集
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.15 + ease * 0.1;
        character.cosmosAura.scale.set(
          0.9 + ease * 0.15,
          1.7 + ease * 0.2,
          0.65 + ease * 0.1
        );
      }
    }
    else if (t < comboEnd) {
      // 流星连击：13次快速出拳，但更有节奏感
      const comboT = (t - prepEnd) / (comboEnd - prepEnd);
      const punches = 10;
      const punchPhase = comboT * punches;
      const punchIndex = Math.floor(punchPhase);
      const punchProgress = punchPhase - punchIndex;

      // 奇数右拳，偶数左拳
      const isRightPunch = punchIndex % 2 === 0;
      const punchPower = Math.sin(punchProgress * Math.PI); // 0→1→0 单次出拳曲线

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        if (isRightPunch) {
          // 右拳出击
          character.rightArm.rotation.z = base - 0.2 - 0.8 * punchPower;
          character.rightArm.rotation.x = -0.3 - 1.2 * punchPower;
        } else {
          // 右拳回防
          character.rightArm.rotation.z = base - 0.2 - 0.1 * punchPower;
          character.rightArm.rotation.x = -0.3 + 0.1 * punchPower;
        }
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        if (!isRightPunch) {
          // 左拳出击
          character.leftArm.rotation.z = base + 0.5 + 0.7 * punchPower;
          character.leftArm.rotation.x = -0.4 - 1.0 * punchPower;
        } else {
          // 左拳回防
          character.leftArm.rotation.z = base + 0.5 + 0.1 * punchPower;
          character.leftArm.rotation.x = -0.4 + 0.1 * punchPower;
        }
      }

      // 身体随出拳旋转
      const rotDir = isRightPunch ? 1 : -1;
      character.mesh.rotation.y = -0.25 + rotDir * punchPower * 0.15;

      // 腿部配合
      if (character.rightLeg) {
        character.rightLeg.rotation.x = 0.15 + (isRightPunch ? punchPower * 0.1 : 0);
      }
      if (character.leftLeg) {
        character.leftLeg.rotation.x = (isRightPunch ? 0 : punchPower * 0.1);
      }

      // 出拳时身体微震
      const impact = punchPower > 0.8 ? (punchPower - 0.8) * 5 * 0.01 : 0;
      character.mesh.position.y = character.baseY + impact;

      // 头部稳定
      if (character.headGroup) {
        character.headGroup.rotation.y = 0.1 + rotDir * punchPower * 0.05;
      }

      // 小宇宙随出拳脉动
      if (character.cosmosAura) {
        const auraPulse = 0.2 + punchPower * 0.15;
        character.cosmosAura.material.opacity = auraPulse;
        character.cosmosAura.scale.set(
          1.0 + punchPower * 0.2,
          1.85 + punchPower * 0.25,
          0.72 + punchPower * 0.1
        );
      }
    }
    else {
      // 收势：双拳回防，喘息
      const p = (t - comboEnd) / (this.duration - comboEnd);
      const ease = 1 - Math.pow(1 - p, 2); // ease-out

      if (character.rightArm) {
        const base = character.rightArmBaseZ || 0;
        character.rightArm.rotation.z = base - 0.9 * (1 - ease * 0.5);
        character.rightArm.rotation.x = -0.4 * (1 - ease * 0.3);
      }
      if (character.leftArm) {
        const base = character.leftArmBaseZ || 0;
        character.leftArm.rotation.z = base + 0.9 * (1 - ease * 0.5);
        character.leftArm.rotation.x = -0.4 * (1 - ease * 0.3);
      }

      // 身体回正
      character.mesh.rotation.y = -0.25 * (1 - ease);

      // 喘息起伏
      const breathe = Math.sin(p * Math.PI * 4) * 0.012 * (1 - p * 0.5);
      character.mesh.position.y = character.baseY + breathe;

      // 腿部放松
      if (character.rightLeg) character.rightLeg.rotation.x = 0.15 * (1 - ease);
      if (character.leftLeg) character.leftLeg.rotation.x = 0;

      // 头部
      if (character.headGroup) {
        character.headGroup.rotation.y = 0.1 * (1 - ease);
        character.headGroup.rotation.x = -0.05 + Math.sin(p * Math.PI * 3) * 0.02;
      }

      // 小宇宙减弱但不消失
      if (character.cosmosAura) {
        character.cosmosAura.material.opacity = 0.25 - ease * 0.08;
        character.cosmosAura.scale.set(
          1.1 + Math.sin(p * Math.PI * 3) * 0.04,
          1.8 + Math.sin(p * Math.PI * 2.5) * 0.06,
          0.7 + Math.sin(p * Math.PI * 3.5) * 0.03
        );
      }
    }
  }
}
