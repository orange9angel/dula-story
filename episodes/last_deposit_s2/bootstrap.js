/**
 * Last Deposit S2 — Underground Pipeline
 *
 * 架构升级点：
 *   1. MoodDirector: 用「情绪状态」统一驱动场景光效、角色眼部发光、核心脉冲、BGM Cue
 *   2. BeatPreset: 把高频联动的动作/光效/音效/运镜封装成可复用模板
 *   3. VoiceExpressionBinder: 把 {Voice:xxx} 语气标签同步到 MoodDirector
 *   4. RobotStateMachine: 角色受伤/警觉/过载状态影响视觉和动作
 *   5. UndergroundPipeScene: 自带环境节奏（滴水、霓虹闪烁、通风扇、可切换警报灯）
 */

import { registerAll } from 'dula-assets';
import { AnimationBase, registerCharacter, registerScene, registerAnimation, CharacterRegistry, Storyboard } from 'dula-engine';
import { SpiritGunFire } from '/node_modules/dula-assets/animations/yuyuhakusho/SpiritGunFire.js';
import { SpiritGunCharge } from '/node_modules/dula-assets/animations/yuyuhakusho/SpiritGunCharge.js';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// 复用 Last Deposit S1 资产（已复制到本目录）
// ═══════════════════════════════════════════════════════════════════════════════
import { TurboOne } from './characters/TurboOne.js';
import { GearShift } from './characters/GearShift.js';
import { SkyRazor } from './characters/SkyRazor.js';
import { Overdrive } from './characters/Overdrive.js';
import { CircuitBurn } from './characters/CircuitBurn.js';
import { Turret } from './characters/Turret.js';

import { ScrapyardSectorScene } from './scenes/ScrapyardSectorScene.js';
import { PlasmaVaultScene } from './scenes/PlasmaVaultScene.js';
import { SubwayHubScene } from './scenes/SubwayHubScene.js';

import { RobotTransform } from './animations/RobotTransform.js';
import { RobotRevert } from './animations/RobotRevert.js';
import { CrouchPlasmaRifle } from './animations/CrouchPlasmaRifle.js';
import { VehicleDrive } from './animations/VehicleDrive.js';

import { registerS2CombatActions } from './combatActions.js';

// ═══════════════════════════════════════════════════════════════════════════════
// S2 新资产
// ═══════════════════════════════════════════════════════════════════════════════
import { UndergroundPipeScene } from './scenes/UndergroundPipeScene.js';
// NeonHighwayScene 与 Viper 无人机小队已在本集剧情中移除，避免与 S1 重复。
import { MoodDirector } from './lib/MoodDirector.js';
import { bindVoiceToMood } from './lib/VoiceExpressionBinder.js';
import { attachStateMachine } from './lib/RobotStateMachine.js';

class Idle extends AnimationBase {
  constructor() {
    super('Idle', 1.0);
  }
}

registerAll();
registerS2CombatActions();

// 注册角色（中文名）
registerCharacter('雷恩', TurboOne);
registerCharacter('布洛克', GearShift);
registerCharacter('斯凯', SkyRazor);
registerCharacter('维克', Overdrive);
registerCharacter('达什', CircuitBurn);
registerCharacter('炮塔-左', Turret);
registerCharacter('炮塔-右', Turret);

// 注册场景
registerScene('SubwayHubScene', SubwayHubScene);
registerScene('ScrapyardSectorScene', ScrapyardSectorScene);
registerScene('PlasmaVaultScene', PlasmaVaultScene);
registerScene('UndergroundPipeScene', UndergroundPipeScene);

// 注册动画
registerAnimation('RobotTransform', RobotTransform);
registerAnimation('RobotRevert', RobotRevert);
registerAnimation('CrouchPlasmaRifle', CrouchPlasmaRifle);
registerAnimation('VehicleDrive', VehicleDrive);
registerAnimation('Idle', Idle);
// 把日式灵丸动画映射为机甲风格的等离子步枪别名
registerAnimation('PlasmaRifle', SpiritGunFire);
registerAnimation('PlasmaRifleCharge', SpiritGunCharge);

// ═══════════════════════════════════════════════════════════════════════════════
// 安装 MoodDirector + StateMachine + Storyboard 扩展事件
// 通过 patch Storyboard 构造函数，确保所有实例自动启用情绪系统
// ═══════════════════════════════════════════════════════════════════════════════

// MoodDirector 实例按 Storyboard 缓存
const _moodDirectorByStoryboard = new WeakMap();

function getMoodDirector(storyboard) {
  if (!_moodDirectorByStoryboard.has(storyboard)) {
    const md = new MoodDirector(storyboard);
    _moodDirectorByStoryboard.set(storyboard, md);
  }
  return _moodDirectorByStoryboard.get(storyboard);
}

function installMoodSystem() {
  // 1. patch switchScene：切换场景后绑定 MoodDirector
  const originalSwitchScene = Storyboard.prototype.switchScene;
  Storyboard.prototype.switchScene = function (...args) {
    const result = originalSwitchScene.apply(this, args);
    const md = getMoodDirector(this);
    const scene = this.currentScene && (this.currentScene.scene || this.currentScene);
    if (scene && md) {
      md.bindScene(scene);
    }
    return result;
  };

  // 2. patch _spawnCharacter 或 buildCharacters：给每个角色附加状态机并绑定 MoodDirector
  //    Storyboard 在 load 时会调用 _spawnCharactersForScene / spawnCharacters。
  //    这里通过拦截 characters Map 的 set 方法来实现通用绑定。
  const originalSet = Map.prototype.set;
  Map.prototype.set = function (key, value) {
    // 只处理 Storyboard 的 characters Map（value 是 CharacterBase 实例）
    if (this instanceof Map && value && typeof value === 'object' && value.constructor && value.constructor.name && value.constructor.name !== 'Object') {
      // 通过检查调用栈或特征来判断是否来自 Storyboard
      // 这里用一个简单启发式：如果 value 有 mesh 且是 THREE.Group
      if (value.mesh && value.mesh.isGroup && !value._moodSystemBound) {
        value._moodSystemBound = true;
        attachStateMachine(value);
        // 尝试找到所属的 storyboard（通过 window 上暴露的 storyboard 实例）
        const sb = window.__dulaStoryboard;
        if (sb) {
          const md = getMoodDirector(sb);
          md.bindCharacter(key, value);
        }
      }
    }
    return originalSet.call(this, key, value);
  };

  // 3. patch load：扫描 storyEvents 并初始化 mood 事件列表
  const originalLoad = Storyboard.prototype.load;
  Storyboard.prototype.load = async function (...args) {
    const result = await originalLoad.apply(this, args);
    const md = getMoodDirector(this);

    this._moodEvents = [];
    this._alertEvents = [];
    this._stateEvents = [];
    for (const ev of this.storyEvents || []) {
      if (ev.name === 'MoodTransition') {
        this._moodEvents.push({ startTime: ev.startTime, to: ev.options.to, duration: parseFloat(ev.options.duration) || 0.6 });
      }
      if (ev.name === 'SetAlert') {
        this._alertEvents.push({ startTime: ev.startTime, level: parseInt(ev.options.level, 10) || 0 });
      }
      if (ev.name === 'Damage') {
        this._stateEvents.push({ startTime: ev.startTime, type: 'damage', character: ev.options.character, amount: parseFloat(ev.options.amount) || 20 });
      }
      if (ev.name === 'Overdrive') {
        this._stateEvents.push({ startTime: ev.startTime, type: 'overdrive', character: ev.options.character });
      }
    }

    // 绑定 Voice 到 Mood
    bindVoiceToMood(this, md);

    // 暴露 storyboard 实例给 Map.set 补丁使用
    window.__dulaStoryboard = this;

    // 补绑 load 期间已创建的角色（Map.set 补丁在 load 完成前拿不到 storyboard）
    for (const [name, char] of this.characters) {
      if (!char._moodSystemBound) {
        char._moodSystemBound = true;
        attachStateMachine(char);
      }
      md.bindCharacter(name, char);
    }

    return result;
  };

  // 4. patch update：驱动 MoodDirector、自定义事件、状态机
  const originalUpdate = Storyboard.prototype.update;
  Storyboard.prototype.update = function (time, delta) {
    // 让 MoodDirector 知道当前渲染时间，用于无 rAF 的过渡与音乐 cue
    this._currentTime = time;

    const md = getMoodDirector(this);

    if (md) md.update(time, delta);

    // 触发 MoodTransition 事件
    for (const me of this._moodEvents || []) {
      if (time >= me.startTime && me._triggered !== true) {
        me._triggered = true;
        md.setMood(me.to, { duration: me.duration });
      }
    }

    // 触发 SetAlert 事件
    for (const ae of this._alertEvents || []) {
      if (time >= ae.startTime && ae._triggered !== true) {
        ae._triggered = true;
        if (this.currentScene && this.currentScene.setAlertLevel) {
          this.currentScene.setAlertLevel(ae.level);
        }
      }
    }

    // 触发 Damage / Overdrive 状态事件
    for (const se of this._stateEvents || []) {
      if (time >= se.startTime && se._triggered !== true) {
        se._triggered = true;
        const char = this.characters.get(se.character);
        if (char && char.stateMachine) {
          if (se.type === 'damage') char.stateMachine.takeDamage(se.amount);
          if (se.type === 'overdrive') char.stateMachine.boostEnergy(100);
        }
      }
    }

    // 状态机更新
    for (const char of this.characters.values()) {
      if (char.stateMachine) char.stateMachine.update(time, delta);
    }

    // 将 MoodDirector 当前情绪同步到 RobotStateMachine，让 stealth/combat 等情绪真正影响角色状态
    const moodName = md && md.currentMood && md.currentMood.name;
    if (moodName) {
      for (const char of this.characters.values()) {
        if (char.stateMachine && typeof char.stateMachine.syncWithMood === 'function') {
          char.stateMachine.syncWithMood(moodName);
        }
      }
    }

    return originalUpdate.call(this, time, delta);
  };
}

installMoodSystem();

// ═══════════════════════════════════════════════════════════════════════════════
// 全局增强：修复机器人在昏暗管道中的面部可见性
// ═══════════════════════════════════════════════════════════════════════════════
for (const name of ['雷恩', '布洛克', '斯凯', '维克', '达什']) {
  const Class = CharacterRegistry[name];
  if (!Class) continue;
  const originalBuild = Class.prototype.build;
  Class.prototype.build = function () {
    originalBuild.call(this);
    // 增加一盏跟随面部的补光，确保在昏暗管道中脸部表情清晰
    if (this.headGroup && !this._faceFillLight) {
      this._faceFillLight = new THREE.PointLight(0xccddff, 0.5, 4, 2);
      this._faceFillLight.position.set(0, 0.1, 0.6);
      this.headGroup.add(this._faceFillLight);
    }
  };
}
