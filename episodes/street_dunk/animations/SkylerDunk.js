/**
 * SkylerDunk — 自定义扣篮动画（带缓动函数）
 * 助跑 -> 起跳(预备下沉) -> 空中舒展反弓 -> 暴力扣篮 -> 重力加速下落 -> 屈膝缓冲落地
 * 继承 AnimationBase，引擎调用 update(t, character)
 */
import * as THREE from 'three';
import { AnimationBase } from 'dula-engine';

export class SkylerDunk extends AnimationBase {
  constructor(name = 'SkylerDunk', duration = 7.0) {
    super(name, duration);
    this.hoopZ = -15;
    this.hoopY = 3.55;
    this.jumpHeight = 2.5;
    this.runUpZ = -5;
  }

  update(t, character) {
    const mesh = character.mesh;
    const leftArm = character.leftArm;
    const rightArm = character.rightArm;
    const leftLeg = character.leftLeg;
    const rightLeg = character.rightLeg;
    const head = character.headGroup;

    if (!mesh || !leftArm || !rightArm) return;

    // Easing functions
    const easeInQuad = tt => tt * tt;
    const easeOutQuad = tt => 1 - (1 - tt) * (1 - tt);
    const easeInOutCubic = tt => tt < 0.5 ? 4 * tt * tt * tt : 1 - Math.pow(-2 * tt + 2, 3) / 2;
    const easeOutBack = tt => { const c = 1.70158; return 1 + (c + 1) * Math.pow(tt - 1, 3) + c * Math.pow(tt - 1, 2); };

    // Phase 1: Run up (0.0 - 0.12)
    if (t < 0.12) {
      const pt = t / 0.12;
      const e = easeInQuad(pt);
      mesh.position.z = this.runUpZ + (this.hoopZ + 2 - this.runUpZ) * e;
      mesh.position.y = 0;
      const swing = Math.sin(pt * Math.PI * 4) * 0.5;
      leftArm.rotation.z = swing;
      rightArm.rotation.z = -swing;
      if (leftLeg) leftLeg.rotation.x = -swing * 0.5;
      if (rightLeg) rightLeg.rotation.x = swing * 0.5;
      // Basketball: bouncing at side (local offset from mesh origin)
      if (character.basketball) {
        character.basketball.visible = true;
        const bounceY = Math.abs(Math.sin(pt * Math.PI * 3)) * 0.3;
        character.basketball.position.set(0.4, 0.6 + bounceY, 0.3);
      }
    }
    // Phase 2: Jump (0.12 - 0.30) with anticipation dip
    else if (t < 0.30) {
      const pt = (t - 0.12) / 0.18;
      // Anticipation: dip at start, then explode up
      const anticipation = pt < 0.15 ? -0.1 * Math.sin(pt / 0.15 * Math.PI) : 0;
      const jumpT = Math.max(0, (pt - 0.15) / 0.85);
      const jumpE = Math.sin(jumpT * Math.PI); // parabolic arc
      mesh.position.z = this.hoopZ + 2 - 2 * easeInQuad(pt);
      mesh.position.y = this.jumpHeight * jumpE + anticipation;

      // Arms raise with overshoot (easeOutBack)
      const armT = Math.min(1, jumpT * 1.3);
      const armE = easeOutBack(armT);
      leftArm.rotation.z = Math.PI * 0.5 * armE;
      rightArm.rotation.z = -Math.PI * 0.5 * armE;
      leftArm.rotation.x = -Math.PI * 0.4 * armE;
      rightArm.rotation.x = -Math.PI * 0.4 * armE;

      // Legs tuck
      if (leftLeg) leftLeg.rotation.x = -0.9 * easeOutQuad(jumpT);
      if (rightLeg) rightLeg.rotation.x = -1.1 * easeOutQuad(jumpT);

      // Body arch back
      mesh.rotation.x = -0.7 * easeOutQuad(jumpT);

      // Basketball: held at chest, rising with jump
      if (character.basketball) {
        character.basketball.visible = true;
        character.basketball.position.set(0.3, 1.0 + this.jumpHeight * jumpE * 0.4, 0.25);
      }
    }
    // Phase 3: Hang/Dunk (0.30 - 0.50)
    else if (t < 0.50) {
      const pt = (t - 0.30) / 0.20;
      mesh.position.z = this.hoopZ;
      mesh.position.y = this.hoopY + 0.5 + Math.sin(pt * Math.PI) * 0.05;

      // Violent arm slam
      const slamT = easeInQuad(pt);
      leftArm.rotation.x = -Math.PI * 0.5 + slamT * (Math.PI * 0.7);
      rightArm.rotation.x = -Math.PI * 0.5 + slamT * (Math.PI * 0.7);
      // Wrist flick at end
      if (pt > 0.7) {
        const flick = (pt - 0.7) / 0.3;
        leftArm.rotation.x += 0.5 * flick;
        rightArm.rotation.x += 0.5 * flick;
      }

      // Body leans forward into dunk
      mesh.rotation.x = -0.7 * (1 - pt) + 0.5 * pt;

      if (head) head.rotation.x = 0.3 * pt;

      // Basketball: released toward hoop at slam climax
      if (character.basketball) {
        if (pt < 0.5) {
          character.basketball.visible = true;
          // Ball stays near hands, moving forward
          character.basketball.position.set(
            0.3 + pt * 0.2,
            1.3 + pt * 0.5,
            0.3 + pt * 0.4
          );
        } else {
          // Ball drops through hoop (local offset relative to mesh)
          const dropT = (pt - 0.5) / 0.5;
          character.basketball.position.set(
            0.4,
            1.6 - dropT * 1.8,
            0.5 + dropT * 0.3
          );
        }
      }
    }
    // Phase 4: Descent (0.50 - 0.70) gravity acceleration
    else if (t < 0.70) {
      const pt = (t - 0.50) / 0.20;
      mesh.position.z = this.hoopZ;
      mesh.position.y = (this.hoopY + 0.5) * (1 - easeInQuad(pt));

      // Arms follow through
      leftArm.rotation.x = 0.2 * pt;
      rightArm.rotation.x = 0.2 * pt;
      leftArm.rotation.z = Math.PI * 0.3 * (1 - pt);
      rightArm.rotation.z = -Math.PI * 0.3 * (1 - pt);

      // Legs extend for landing
      if (leftLeg) leftLeg.rotation.x = -0.9 * (1 - easeOutQuad(pt));
      if (rightLeg) rightLeg.rotation.x = -1.1 * (1 - easeOutQuad(pt));
      mesh.rotation.x = 0.5 * (1 - pt);

      // Basketball: falling through net (local offset)
      if (character.basketball) {
        const dropT = (t - 0.50) / 0.50;
        character.basketball.position.set(
          0.4 + Math.sin(dropT * Math.PI) * 0.2,
          -0.2 - dropT * 1.5,
          0.8 + dropT * 0.5
        );
      }
    }
    // Phase 5: Land + hold landing pose (0.70 - 1.0)
    else {
      const pt = (t - 0.70) / 0.30;
      // Impact absorption: deep knee bend, then hold
      const impact = pt < 0.4 ? easeOutQuad(pt / 0.4) : 1.0;
      mesh.position.y = -0.25 * Math.sin(impact * Math.PI * 0.5);

      // Knee bend (legs rotate forward)
      if (leftLeg) leftLeg.rotation.x = 0.8 * impact;
      if (rightLeg) rightLeg.rotation.x = 0.9 * impact;

      // Torso leans forward to compensate
      mesh.rotation.x = 0.3 * impact;

      // Victory pose: one arm up, one across chest (asymmetric)
      if (pt > 0.3) {
        const poseT = Math.min(1, (pt - 0.3) / 0.5);
        leftArm.rotation.z = Math.PI * 0.8 * poseT;
        leftArm.rotation.x = 0;
        rightArm.rotation.z = -Math.PI * 0.2 * poseT;
        rightArm.rotation.x = -0.5 * poseT;
      } else {
        // Transition from follow-through to pose
        const transT = pt / 0.3;
        leftArm.rotation.z = Math.PI * 0.3 * transT;
        leftArm.rotation.x = 0.2 * (1 - transT);
        rightArm.rotation.z = -Math.PI * 0.3 * transT;
        rightArm.rotation.x = 0.2 * (1 - transT);
      }

      if (head) head.rotation.x = -0.15 * impact;

      // Basketball: on ground near feet (local offset)
      if (character.basketball) {
        character.basketball.position.set(0.5 + pt * 0.2, 0.12, 0.4 + pt * 0.2);
      }
    }
  }
}
