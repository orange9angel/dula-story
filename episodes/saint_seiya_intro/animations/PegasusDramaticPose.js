import { AnimationBase } from 'dula-engine';

/**
 * PegasusDramaticPose - 终极英雄pose
 * 单膝跪地→猛然站起→右拳指天
 * 慢动作感，气势十足
 */
export class PegasusDramaticPose extends AnimationBase {
  constructor() {
    super('PegasusDramaticPose', 4.5);
  }

  update(t, character) {
    if (character.showCosmos) character.showCosmos();

    // Phase 1: 0-1.5s 单膝跪地（慢动作）
    // Phase 2: 1.5-2.5s 猛然站起（爆发）
    // Phase 3: 2.5-4.5s 右拳指天，定格

    const kneelEnd = 1.5;
    const riseEnd = 2.5;

    // 身体高度（跪地→站起）
    if (t < kneelEnd) {
      const p = t / kneelEnd;
      const ease = p * p; // ease-in
      character.mesh.position.y = character.baseY - 0.45 * ease;
    } else if (t < riseEnd) {
      const p = (t - kneelEnd) / (riseEnd - kneelEnd);
      const ease = 1 - Math.pow(1 - p, 4); // explosive ease-out
      character.mesh.position.y = character.baseY - 0.45 * (1 - ease);
    } else {
      // 站立后轻微呼吸起伏
      const breathe = Math.sin((t - riseEnd) * 2.0) * 0.01;
      character.mesh.position.y = character.baseY + breathe;
    }

    // 右腿跪地动画
    if (character.rightLeg) {
      if (t < kneelEnd) {
        const p = t / kneelEnd;
        character.rightLeg.rotation.x = -1.2 * p; // 膝盖弯曲
      } else if (t < riseEnd) {
        const p = (t - kneelEnd) / (riseEnd - kneelEnd);
        const ease = 1 - Math.pow(1 - p, 3);
        character.rightLeg.rotation.x = -1.2 * (1 - ease);
      } else {
        character.rightLeg.rotation.x = 0;
      }
    }

    // 左腿支撑
    if (character.leftLeg) {
      if (t < kneelEnd) {
        const p = t / kneelEnd;
        character.leftLeg.rotation.x = 0.3 * p; // 微微前伸支撑
      } else if (t < riseEnd) {
        const p = (t - kneelEnd) / (riseEnd - kneelEnd);
        const ease = 1 - Math.pow(1 - p, 3);
        character.leftLeg.rotation.x = 0.3 * (1 - ease);
      } else {
        character.leftLeg.rotation.x = 0;
      }
    }

    // 右臂：从下垂→猛然举起指天
    if (character.rightArm) {
      const base = character.rightArmBaseZ || 0;
      if (t < kneelEnd) {
        const p = t / kneelEnd;
        character.rightArm.rotation.z = base - 0.1 * p;
        character.rightArm.rotation.x = -0.05 * p;
      } else if (t < riseEnd) {
        const p = (t - kneelEnd) / (riseEnd - kneelEnd);
        const ease = 1 - Math.pow(1 - p, 2);
        // 爆发式举臂
        character.rightArm.rotation.z = base - 0.1 - 1.4 * ease;
        character.rightArm.rotation.x = -0.05 - 2.8 * ease;
      } else {
        // 高举稳定，微微颤抖（力量感）
        const tremor = Math.sin((t - riseEnd) * 12) * 0.008;
        character.rightArm.rotation.z = base - 1.5 + tremor;
        character.rightArm.rotation.x = -2.85 + tremor * 0.5;
      }
    }

    // 左臂：配合动作，从撑地→自然下垂→张开
    if (character.leftArm) {
      const base = character.leftArmBaseZ || 0;
      if (t < kneelEnd) {
        const p = t / kneelEnd;
        character.leftArm.rotation.z = base + 0.2 * p;
        character.leftArm.rotation.x = -0.3 * p;
      } else if (t < riseEnd) {
        const p = (t - kneelEnd) / (riseEnd - kneelEnd);
        const ease = 1 - Math.pow(1 - p, 3);
        character.leftArm.rotation.z = base + 0.2 + 0.3 * ease;
        character.leftArm.rotation.x = -0.3 + 0.2 * ease;
      } else {
        const holdP = Math.min(1, (t - riseEnd) / 1.5);
        character.leftArm.rotation.z = base + 0.5 + 0.2 * holdP;
        character.leftArm.rotation.x = -0.1;
      }
    }

    // 头部：低头→猛然抬头→仰望天空
    if (character.headGroup) {
      if (t < kneelEnd) {
        const p = t / kneelEnd;
        character.headGroup.rotation.x = 0.25 * p; // 低头
      } else if (t < riseEnd) {
        const p = (t - kneelEnd) / (riseEnd - kneelEnd);
        const ease = 1 - Math.pow(1 - p, 2);
        character.headGroup.rotation.x = 0.25 - 0.5 * ease; // 抬头
      } else {
        const holdP = Math.min(1, (t - riseEnd) / 1.5);
        character.headGroup.rotation.x = -0.25 - 0.1 * holdP; // 仰望
      }
    }

    // 小宇宙：站起时爆发
    if (character.cosmosAura) {
      if (t < kneelEnd) {
        character.cosmosAura.material.opacity = 0.1 + t * 0.05;
      } else if (t < riseEnd) {
        const p = (t - kneelEnd) / (riseEnd - kneelEnd);
        const burst = Math.sin(p * Math.PI) * 0.4;
        character.cosmosAura.material.opacity = 0.18 + burst;
        character.cosmosAura.scale.set(
          0.82 + burst * 0.6,
          1.55 + burst * 0.8,
          0.58 + burst * 0.4
        );
      } else {
        const holdP = Math.min(1, (t - riseEnd) / 2.0);
        character.cosmosAura.material.opacity = 0.35 + holdP * 0.1;
        character.cosmosAura.scale.set(
          1.3 + Math.sin(t * 2.2) * 0.06,
          2.1 + Math.sin(t * 1.8) * 0.08,
          0.9 + Math.sin(t * 2.5) * 0.04
        );
      }
    }

    // 身体整体旋转：面向镜头→微微侧转展示
    if (t > riseEnd) {
      const holdP = Math.min(1, (t - riseEnd) / 2.0);
      character.mesh.rotation.y = Math.sin(holdP * Math.PI * 0.3) * 0.15;
    }
  }
}
