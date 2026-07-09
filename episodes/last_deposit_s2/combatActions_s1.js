import { registerCombatAction } from 'dula-engine';

/**
 * Last Deposit 专用战斗动作组件。
 *
 * 每个组件是一段预编排的机器人/无人机格斗招式序列，
 * 可在 script.story 中通过 {Combat:Action|name=...|attacker=...|defender=...} 调用。
 *
 * move.sfx 支持三种写法：
 *   - 字符串：'laser_blast'（默认命中帧触发）
 *   - 对象：{ name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }
 *   - 数组：同一 move 可触发多个音效
 * trigger 可选 'start' / 'hitFrame' / 'end' / 数字（相对 move 起点的秒数）。
 *
 * move.fx 为可选光效数组，支持：
 *   { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }
 *   { type: 'FXChargeGlow', trigger: 'start', attach: 'attacker' }
 * trigger 同 sfx；attach 可选 'attacker'（默认） / 'defender'。
 */
export function registerLastDepositCombatActions() {
  // 突进射击：前冲 → 站立射击 → 蹲姿射击，适合开场快速接敌
  registerCombatAction('dashShot', {
    moves: [
      { anim: 'DashForward', hitFrame: null, sfx: { name: 'dash_whoosh', trigger: 'start', volume: 0.8 }, fx: { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' }, camera: 'FightFollow' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
      { anim: 'CrouchPlasmaRifle', hitFrame: 0.30, sfx: { name: 'plasma_rifle', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
    ],
  });

  // 侧闪反击：闪避 → 连射两发，适合被无人机压制后反打
  registerCombatAction('strafeFire', {
    moves: [
      { anim: 'Dodge', hitFrame: null, sfx: { name: 'dash_whoosh', trigger: 'start', volume: 0.6 }, fx: { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' }, camera: 'FightFollow' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
    ],
  });

  // 跳跃重火力：跳击接近 → 蹲姿一发重射，适合第二波冲锋
  registerCombatAction('jumpShot', {
    moves: [
      { anim: 'JumpAttack', hitFrame: 0.40, sfx: { name: 'dash_whoosh', trigger: 'start', volume: 0.8 }, fx: { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' }, reaction: 'HitStagger', hitstop: 0.03, shake: 0.02, camera: 'FightDramatic' },
      { anim: 'CrouchPlasmaRifle', hitFrame: 0.30, sfx: { name: 'plasma_rifle', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.03, shake: 0.02, camera: 'FightImpact' },
    ],
  });

  // 无人机反击连射：蓄力 → 连射两发
  registerCombatAction('droneBurst', {
    moves: [
      { anim: 'PlasmaRifleCharge', hitFrame: null, fx: { type: 'FXChargeGlow', trigger: 'start', attach: 'attacker' }, camera: 'FightDramatic' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
    ],
  });

  // 压制射击（无音效版本示例）：连续两发蹲姿射击，动作可配 SFX 也可不配
  registerCombatAction('coverFire', {
    moves: [
      { anim: 'CrouchPlasmaRifle', hitFrame: 0.30, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
    ],
  });

  // 无人机快速点射：一发等离子步枪，节奏快、不蓄力，用于 45–55s 填充敌机反击
  registerCombatAction('droneShot', {
    moves: [
      { anim: 'PlasmaRifle', hitFrame: 0.18, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, reaction: 'HitStagger', hitstop: 0.02, shake: 0.015, camera: 'FightImpact' },
    ],
  });

  // 终结一击：突进 → 重射，默认把敌人打翻（Knockdown）
  registerCombatAction('dropBlow', {
    moves: [
      { anim: 'DashForward', hitFrame: null, sfx: { name: 'dash_whoosh', trigger: 'start', volume: 0.8 }, fx: { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' }, camera: 'FightFollow' },
      { anim: 'PlasmaRifle', hitFrame: 0.20, sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.9 }, fx: [{ type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' }, { type: 'FXShockwave', trigger: 'hitFrame', attach: 'defender' }], reaction: 'Knockdown', hitstop: 0.03, shake: 0.02, camera: 'FightImpact' },
    ],
  });
}
