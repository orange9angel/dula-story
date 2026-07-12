/**
 * BeatPreset — Last Deposit S2 戏剧节拍模板
 *
 * 把高频联动的「动作 + 光效 + 音效 + 表情 + 语气 + 运镜」封装成可复用模板。
 * 一个模板返回一段可直接插入 .story 的剧本标签字符串。
 *
 * 使用示例：
 *   import { BeatPreset } from './lib/BeatPreset.js';
 *   BeatPreset.ambushReveal({ target: '雷恩', enemy: 'Viper-4', x: -2, z: -6 })
 */

export const BeatPreset = {
  /**
   * 伏击揭露：安静的潜行被突然打破
   * 场景：环境光变红、警报、角色表情变愤怒、敌方登场
   */
  ambushReveal({ target = '雷恩', enemy = 'Viper-4', x = 0, z = -6, moodDuration = 1.0 } = {}) {
    return `
{Mood:Transition|to=combat|duration=${moodDuration}}
{SFX:Play|name=alarm_blast|offset=0.000}
{Event:Animate|character=${target}|action=FaceAngry|duration=0.2}
{Event:Animate|character=${enemy}|action=Idle|duration=0.1}
{Position:${enemy}|x=${x}|y=3.5|z=${z}|face=${target}}
{FXEnergyAura|character=${target}}
{Camera:FightDramaticReveal|distance=6|height=1.5}
{Exaggeration:shonen_anger|intensity=0.85}
    `.trim();
  },

  /**
   * 潜行 breach：角色压低身形，环境音变大，镜头缓慢推近
   */
  stealthBreach({ target = '雷恩', duration = 6.0 } = {}) {
    return `
{Mood:Transition|to=alert|duration=1.2}
{Event:Animate|character=${target}|action=Crouch|duration=${duration}}
{Event:Animate|character=${target}|action=FaceDetermined|duration=0.3}
{Camera:TrackingCloseUp|characterName=${target}|distance=3.5|heightOffset=-0.3}
{Exaggeration:vein_forehead|intensity=0.5}
    `.trim();
  },

  /**
   * 反击号令：队长一声令下，全队进入战斗，音乐 drop
   */
  counterStrike({ leader = '雷恩', members = ['布洛克', '斯凯'] } = {}) {
    const memberTags = members
      .map((m) => `\n{Event:Animate|character=${m}|action=DashForward|duration=0.5}`)
      .join('');
    return `
{Mood:Transition|to=combat|duration=0.5}
{Music:Play|name=combat_drop|fadeIn=0.1|baseVolume=0.7|endTime=60}
{SFX:Play|name=transform_mechanical|offset=0.000}
{SFX:Play|name=team_shout|offset=0.200}
{Event:Animate|character=${leader}|action=DashForward|duration=0.5}
{Event:Animate|character=${leader}|action=FaceAngry|duration=0.2}${memberTags}
{FXEnergyAura|character=${leader}}
{Camera:FightWide|distance=10|height=3}
{Exaggeration:impact_lines|intensity=0.7}
    `.trim();
  },

  /**
   * 敌方压制：无人机火力覆盖，角色被迫躲闪
   */
  enemySuppress({ enemies = ['Viper-4', 'Viper-5'], targets = ['雷恩', '布洛克', '斯凯'] } = {}) {
    const enemyTags = enemies
      .map((e) => `\n{Event:Animate|character=${e}|action=PlasmaRifle|duration=2.0}`)
      .join('');
    const dodgeTags = targets
      .map((t) => `\n{Event:Animate|character=${t}|action=Dodge|duration=0.6}`)
      .join('');
    return `
{Mood:Transition|to=alert|duration=0.3}
{SFX:Play|name=laser_ricochet|offset=0.2}
{Exaggeration:screen_shake|intensity=0.6}${enemyTags}${dodgeTags}
{Camera:FightSide|distance=8|height=2}
    `.trim();
  },

  /**
   * 终结一击：敌方被击落，慢镜 + 爆炸 + 音乐高潮
   */
  finishingBlow({ attacker = '雷恩', defender = 'Viper-4', sfx = 'explosion' } = {}) {
    return `
{Mood:Transition|to=triumph|duration=0.4}
{SFX:Play|name=${sfx}|offset=0.000}
{Event:Animate|character=${attacker}|action=JumpAttack|duration=0.8}
{Combat:Action|name=dropBlow|attacker=${attacker}|defender=${defender}|offset=0.3|sfx=${sfx}|hitstop=0.05|shake=0.03|noAutoCamera=true}
{FXHitSpark}
{FXShockwave}
{Camera:FightImpact|distance=4|height=1.2}
{Exaggeration:chibi_deform|intensity=0.8}
    `.trim();
  },

  /**
   * 战术沟通：低语/快速交流，镜头在角色间切换
   */
  tacticalTalk({ speaker, listener, mood = 'alert' } = {}) {
    return `
{Mood:Transition|to=${mood}|duration=0.8}
{Event:Animate|character=${speaker}|action=FaceDetermined|duration=0.2}
{Event:Animate|character=${listener}|action=FaceConfused|duration=0.2}
{Camera:OverShoulder|speaker=${speaker}|listener=${listener}|distance=3.5|height=1.4}
    `.trim();
  },

  /**
   * 胜利确认：敌机全灭后的小队互动
   */
  victoryCheck({ speaker = '斯凯', leader = '雷恩' } = {}) {
    return `
{Mood:Transition|to=triumph|duration=1.0}
{SFX:Play|name=mech_relief|offset=0.5}
{Event:Animate|character=${speaker}|action=FaceHappy|duration=0.3}
{Event:Animate|character=${leader}|action=Nod|duration=0.5}
{Camera:TwoShot|left=${leader}|right=${speaker}|distance=5|height=1.6}
{Exaggeration:none}
    `.trim();
  },
};
