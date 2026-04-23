/**
 * SkylerCelebrate — 街头风格庆祝动画
 * 继承 AnimationBase，引擎调用 update(t, character)
 * Phase 1: 从落地姿态站起 (0-25%)
 * Phase 2: 非对称Pose形成 — 一手拍胸、一指天空 (25-60%)
 * Phase 3: 保持 + 微呼吸 (60-100%)
 */
import { AnimationBase } from 'dula-engine';

export class SkylerCelebrate extends AnimationBase {
  constructor(name = 'SkylerCelebrate', duration = 3.0) {
    super(name, duration);
  }

  update(t, character) {
    const mesh = character.mesh;
    const leftArm = character.leftArm;
    const rightArm = character.rightArm;
    const leftLeg = character.leftLeg;
    const rightLeg = character.rightLeg;
    const head = character.headGroup;

    if (!mesh || !leftArm || !rightArm) return;

    const easeOutBack = tt => {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(tt - 1, 3) + c * Math.pow(tt - 1, 2);
    };
    const easeOutQuad = tt => 1 - (1 - tt) * (1 - tt);

    // Phase 1: Stand up from landing crouch (0-25%)
    if (t < 0.25) {
      const pt = t / 0.25;
      const e = easeOutQuad(pt);
      // Smoothly release crouch
      mesh.position.y = -0.25 * (1 - e);
      if (leftLeg) leftLeg.rotation.x = 0.8 * (1 - e);
      if (rightLeg) rightLeg.rotation.x = 0.9 * (1 - e);
      mesh.rotation.x = 0.3 * (1 - e);

      // Arms begin to rise
      leftArm.rotation.z = Math.PI * 0.8 * e * 0.3;
      leftArm.rotation.x = -0.5 * (1 - e * 0.5);
      rightArm.rotation.z = -Math.PI * 0.2 * e * 0.3;
      rightArm.rotation.x = -0.5 * (1 - e * 0.5);

      if (head) head.rotation.x = -0.15 * (1 - e);
    }
    // Phase 2: Pose formation (25-60%) — asymmetric victory pose
    else if (t < 0.60) {
      const pt = (t - 0.25) / 0.35;
      const poseT = easeOutBack(pt);

      // Fully upright
      mesh.position.y = 0;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      mesh.rotation.x = 0;

      // Left arm: chest pound
      leftArm.rotation.z = Math.PI * 0.8 * 0.3 + (Math.PI * 0.5 - Math.PI * 0.8 * 0.3) * poseT;
      leftArm.rotation.x = -0.25 * poseT;

      // Right arm: point to sky
      const targetRightZ = -(Math.PI * 0.8);
      const startRightZ = -Math.PI * 0.2 * 0.3;
      rightArm.rotation.z = startRightZ + (targetRightZ - startRightZ) * poseT;
      rightArm.rotation.x = -0.2 * poseT;

      // Head: proud chin up
      if (head) head.rotation.x = -0.25 * poseT;
    }
    // Phase 3: Hold + breathe (60-100%)
    else {
      const pt = (t - 0.60) / 0.40;
      mesh.position.y = 0;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      mesh.rotation.x = 0;

      // Subtle breathing
      const breath = Math.sin(pt * Math.PI * 3) * 0.02;
      if (character.torso) character.torso.scale.z = 1 + breath;

      // Arms hold with tiny sway
      leftArm.rotation.z = Math.PI * 0.5 + Math.sin(pt * Math.PI * 2) * 0.03;
      leftArm.rotation.x = -0.25;
      rightArm.rotation.z = -(Math.PI * 0.8 + Math.cos(pt * Math.PI * 2) * 0.03);
      rightArm.rotation.x = -0.2;

      if (head) head.rotation.x = -0.25 + Math.sin(pt * Math.PI * 4) * 0.02;
    }

    // Basketball: stays on ground near feet (local offset)
    if (character.basketball) {
      character.basketball.position.set(0.5, 0.12, 0.3);
    }
  }
}
