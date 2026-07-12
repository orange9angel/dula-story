import { AnimationBase } from 'dula-engine';

/**
 * CrouchPlasmaRifle — 蹲姿等离子步枪射击
 * 机器人蹲下、举枪、发射，最后恢复站姿。
 * Duration: 0.7s
 */
export class CrouchPlasmaRifle extends AnimationBase {
  constructor() {
    super('CrouchPlasmaRifle', 0.7);
  }

  update(t, character) {
    const rArm = character.rightArm;
    const head = character.headGroup;
    const rLeg = character.rightLeg;
    const lLeg = character.leftLeg;
    const rKnee = character.rightKnee;
    const lKnee = character.leftKnee;
    if (!rArm) return;

    const rBaseZ = character.rightArmBaseZ || 0;
    const rBaseX = character.rightArmBaseX || 0;
    const baseY = character.baseY !== undefined ? character.baseY : character.mesh.position.y;
    const crouchY = baseY - 0.32;

    const dir = character.userData?.facingDir || 1;

    // 下蹲插值：0-0.1s 蹲下，0.5-0.7s 站起
    let crouchFactor = 1;
    if (t < 0.1) {
      crouchFactor = t / 0.1;
    } else if (t > 0.5) {
      crouchFactor = 1 - (t - 0.5) / 0.2;
    }
    crouchFactor = Math.max(0, Math.min(1, crouchFactor));
    const easeCrouch = crouchFactor * (2 - crouchFactor); // ease-out

    // 身体整体下沉
    character.mesh.position.y = baseY + (crouchY - baseY) * easeCrouch;

    // 腿部弯曲：膝盖前顶
    if (rLeg) rLeg.rotation.x = -0.35 * easeCrouch;
    if (lLeg) lLeg.rotation.x = -0.35 * easeCrouch;
    if (rKnee) rKnee.rotation.x = 0.7 * easeCrouch;
    if (lKnee) lKnee.rotation.x = 0.7 * easeCrouch;

    if (t === 0) {
      rArm.rotation.z = rBaseZ - 1.2;
      rArm.rotation.x = rBaseX - 0.3;
      if (head) head.rotation.y = -0.12;
      if (character.showSpiritGunOrb) character.showSpiritGunOrb();
      if (character.setSpiritGunIntensity) character.setSpiritGunIntensity(1.0);
      if (character.hideSpiritGunBeam) character.hideSpiritGunBeam();
      if (character.setSpiritGunBeamExtend) character.setSpiritGunBeamExtend(0);
      return;
    }

    // Phase 1: 瞄准/蓄力 (0-0.15)
    if (t < 0.15) {
      const p = t / 0.15;
      const ease = p * p;
      rArm.rotation.z = (rBaseZ - 1.2) + ease * 0.3;
      rArm.rotation.x = (rBaseX - 0.3) - ease * 1.0;
      if (character.setSpiritGunIntensity) character.setSpiritGunIntensity(1.0);
    }
    // Phase 2: 发射 (0.15-0.30)
    else if (t < 0.30) {
      const p = (t - 0.15) / 0.15;
      const ease = 1 - Math.pow(1 - p, 2);
      rArm.rotation.z = rBaseZ - 0.9;
      rArm.rotation.x = rBaseX - 1.3 + p * 0.2;
      if (character.hideSpiritGunOrb) character.hideSpiritGunOrb();
      if (character.showSpiritGunBeam) character.showSpiritGunBeam();
      if (character.setSpiritGunBeamExtend) character.setSpiritGunBeamExtend(ease);
      // 后坐：身体微后仰
      character.mesh.position.x -= dir * ease * 0.03;
    }
    // Phase 3: 光束持续 (0.30-0.45)
    else if (t < 0.45) {
      const p = (t - 0.30) / 0.15;
      rArm.rotation.z = rBaseZ - 0.9 + p * 0.15;
      rArm.rotation.x = rBaseX - 1.1 + p * 0.2;
      if (character.showSpiritGunBeam) character.showSpiritGunBeam();
      if (character.setSpiritGunBeamExtend) character.setSpiritGunBeamExtend(1.0);
    }
    // Phase 4: 后坐恢复 (0.45-0.55)
    else if (t < 0.55) {
      const p = (t - 0.45) / 0.1;
      const easeRecoil = 1 - Math.pow(1 - p, 2);
      rArm.rotation.z = rBaseZ - 0.75 + easeRecoil * 0.15;
      rArm.rotation.x = rBaseX - 0.9 + easeRecoil * 0.4;
      if (character.showSpiritGunBeam) character.showSpiritGunBeam();
      if (character.setSpiritGunBeamExtend) character.setSpiritGunBeamExtend(1.0 - easeRecoil);
      character.mesh.position.x += dir * (1 - easeRecoil) * 0.03;
    }
    // Phase 5: 站起 (0.55-1.0)
    else {
      const p = (t - 0.55) / 0.45;
      const easeRecover = p * p;
      rArm.rotation.z = (rBaseZ - 0.6) - easeRecover * 0.4;
      rArm.rotation.x = (rBaseX - 0.5) - easeRecover * 0.2;
      if (character.hideSpiritGunBeam) character.hideSpiritGunBeam();
      if (character.setSpiritGunBeamExtend) character.setSpiritGunBeamExtend(0);
    }

    if (head) head.rotation.y = -0.12;
  }
}
