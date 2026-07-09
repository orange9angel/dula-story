/**
 * Last Deposit S2 — 增强战斗动作组件
 *
 * 在 S1 基础上新增适合地下管道的招式：
 *   - pipeAmbush: 从管道高处突袭
 *   - stealthTakedown: 潜行近身静音击倒
 *   - overloadCharge: 过载冲撞（残影 + 冲击波）
 *   - droneSwarm: 无人机群包围射击
 *
 * 同时复用 S1 的全部基础动作。
 */

import { registerCombatAction } from 'dula-engine';
import { registerLastDepositCombatActions } from './combatActions_s1.js';

export function registerS2CombatActions() {
  // 先注册 S1 全部动作
  registerLastDepositCombatActions();

  // ═════════════════════════════════════════════════════════════════════════════
  // S2 新增：地下管道特化招式
  // ═════════════════════════════════════════════════════════════════════════════

  registerCombatAction('pipeAmbush', {
    moves: [
      {
        anim: 'JumpAttack',
        hitFrame: 0.35,
        sfx: { name: 'dash_whoosh', trigger: 'start', volume: 0.9 },
        fx: [
          { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' },
          { type: 'FXDustKick', trigger: 'hitFrame', attach: 'defender' },
        ],
        reaction: 'HitStagger',
        hitstop: 0.03,
        shake: 0.02,
        camera: 'FightDramatic',
      },
      {
        anim: 'CrouchPlasmaRifle',
        hitFrame: 0.25,
        sfx: { name: 'plasma_rifle', trigger: 'hitFrame', volume: 0.9 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'Knockdown',
        hitstop: 0.04,
        shake: 0.025,
        camera: 'FightImpact',
      },
    ],
  });

  registerCombatAction('stealthTakedown', {
    moves: [
      {
        anim: 'DashForward',
        hitFrame: null,
        sfx: { name: 'stealth_step', trigger: 'start', volume: 0.4 },
        fx: { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' },
        camera: 'FightFollow',
      },
      {
        anim: 'LeftPunch',
        hitFrame: 0.15,
        sfx: { name: 'mech_crunch', trigger: 'hitFrame', volume: 0.7 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'Knockdown',
        hitstop: 0.05,
        shake: 0.015,
        camera: 'CloseUp',
      },
    ],
  });

  registerCombatAction('overloadCharge', {
    moves: [
      {
        anim: 'PlasmaRifleCharge',
        hitFrame: null,
        sfx: { name: 'overload_build', trigger: 'start', volume: 0.8 },
        fx: [
          { type: 'FXChargeGlow', trigger: 'start', attach: 'attacker' },
          { type: 'FXEnergyAura', trigger: 'start', attach: 'attacker' },
        ],
        camera: 'FightDramatic',
      },
      {
        anim: 'DashForward',
        hitFrame: null,
        sfx: { name: 'dash_whoosh', trigger: 'start', volume: 0.9 },
        fx: { type: 'FXAfterImage', trigger: 'start', attach: 'attacker' },
        camera: 'FightFollow',
      },
      {
        anim: 'PlasmaRifle',
        hitFrame: 0.18,
        sfx: { name: 'explosion', trigger: 'hitFrame', volume: 1.0 },
        fx: [
          { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
          { type: 'FXShockwave', trigger: 'hitFrame', attach: 'defender' },
        ],
        reaction: 'Knockdown',
        hitstop: 0.06,
        shake: 0.04,
        camera: 'FightImpact',
      },
    ],
  });

  registerCombatAction('droneSwarm', {
    moves: [
      {
        anim: 'PlasmaRifleCharge',
        hitFrame: null,
        sfx: { name: 'drone_sync', trigger: 'start', volume: 0.6 },
        fx: { type: 'FXChargeGlow', trigger: 'start', attach: 'attacker' },
        camera: 'FightWide',
      },
      {
        anim: 'PlasmaRifle',
        hitFrame: 0.15,
        sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.85 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'HitStagger',
        hitstop: 0.02,
        shake: 0.015,
        camera: 'FightImpact',
      },
      {
        anim: 'PlasmaRifle',
        hitFrame: 0.15,
        sfx: { name: 'laser_blast', trigger: 'hitFrame', volume: 0.85 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'HitStagger',
        hitstop: 0.02,
        shake: 0.015,
        camera: 'FightImpact',
      },
    ],
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // S2 重写剧情用：让 script.story 里直接引用这些连段名
  // ═════════════════════════════════════════════════════════════════════════════

  registerCombatAction('spirit_gun', {
    moves: [
      {
        anim: 'PlasmaRifleCharge',
        hitFrame: null,
        sfx: { name: 'energy_blast', trigger: 'start', volume: 0.7 },
        fx: { type: 'FXChargeGlow', trigger: 'start', attach: 'attacker' },
        camera: 'FightDramatic',
      },
      {
        anim: 'PlasmaRifle',
        hitFrame: 0.18,
        sfx: { name: 'energy_blast', trigger: 'hitFrame', volume: 0.9 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'HitStagger',
        hitstop: 0.04,
        shake: 0.025,
        camera: 'FightImpact',
      },
    ],
  });

  registerCombatAction('pressure_combo', {
    moves: [
      {
        anim: 'ComboPunch',
        hitFrame: 0.25,
        sfx: { name: 'punch_hit', trigger: 'hitFrame', volume: 0.85 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'HitStagger',
        hitstop: 0.04,
        shake: 0.02,
        camera: 'FightImpact',
      },
      {
        anim: 'Uppercut',
        hitFrame: 0.35,
        sfx: { name: 'punch_hit', trigger: 'hitFrame', volume: 0.9 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'Knockdown',
        hitstop: 0.06,
        shake: 0.035,
        camera: 'FightDramatic',
      },
    ],
  });

  registerCombatAction('heavy_combo', {
    moves: [
      {
        anim: 'Punch',
        hitFrame: 0.25,
        sfx: { name: 'punch_hit', trigger: 'hitFrame', volume: 0.85 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'HitStagger',
        hitstop: 0.05,
        shake: 0.025,
        camera: 'FightImpact',
      },
      {
        anim: 'Uppercut',
        hitFrame: 0.35,
        sfx: { name: 'punch_hit', trigger: 'hitFrame', volume: 0.9 },
        fx: { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
        reaction: 'HitStagger',
        hitstop: 0.05,
        shake: 0.03,
        camera: 'FightDramatic',
      },
      {
        anim: 'JumpAttack',
        hitFrame: 0.5,
        sfx: { name: 'impact_thud', trigger: 'hitFrame', volume: 1.0 },
        fx: [
          { type: 'FXHitSpark', trigger: 'hitFrame', attach: 'defender' },
          { type: 'FXDustKick', trigger: 'hitFrame', attach: 'defender' },
        ],
        reaction: 'Knockdown',
        hitstop: 0.07,
        shake: 0.04,
        camera: 'FightImpact',
      },
    ],
  });
}
