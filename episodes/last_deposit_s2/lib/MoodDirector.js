/**
 * MoodDirector — Last Deposit S2 情绪导演系统
 *
 * 把「情绪状态」作为一级概念，统一驱动：
 *   - 角色表情 / 眼部发光 / 能量核心脉冲
 *   - 环境光效 / 雾效 / 霓虹闪烁
 *   - 战斗动作风格（ aggressive / cautious / stealth ）
 *   - 夸张效果强度
 *   - BGM 情绪段（通过 MusicDirector Cue）
 *
 * 使用方式：
 *   moodDirector.setMood('stealth');      // 潜行：低光、慢呼吸、无表情
 *   moodDirector.setMood('alert');        // 警觉：黄光、眉头紧锁、音乐紧张
 *   moodDirector.setMood('combat');       // 战斗：红光、能量光环、激烈动作
 *   moodDirector.setMood('triumph');      // 胜利：青光、得意、音乐高潮
 */

import * as THREE from 'three';
import { MusicCue } from 'dula-engine';

export const MOODS = {
  stealth: {
    name: 'stealth',
    ambientColor: 0x0a1a2a,
    fogDensity: 0.045,
    pulseColor: 0x2244ff,
    pulseSpeed: 0.6,
    eyeColor: 0x4488ff,
    expression: 'FaceReset',
    exaggeration: 'none',
    musicCue: 'stealth_pad',
    combatStyle: 'silent',
    lightIntensity: 0.35,
  },
  alert: {
    name: 'alert',
    ambientColor: 0x2a2010,
    fogDensity: 0.04,
    pulseColor: 0xffaa00,
    pulseSpeed: 1.2,
    eyeColor: 0xffaa00,
    expression: 'FaceDetermined',
    exaggeration: 'vein_forehead',
    exaggerationIntensity: 0.5,
    musicCue: 'tension_rise',
    combatStyle: 'cautious',
    lightIntensity: 0.55,
  },
  combat: {
    name: 'combat',
    ambientColor: 0x2a0a0a,
    fogDensity: 0.035,
    pulseColor: 0xff2222,
    pulseSpeed: 2.4,
    eyeColor: 0xff3333,
    expression: 'FaceAngry',
    exaggeration: 'shonen_anger',
    exaggerationIntensity: 0.85,
    musicCue: 'combat_drop',
    combatStyle: 'aggressive',
    lightIntensity: 0.75,
  },
  triumph: {
    name: 'triumph',
    ambientColor: 0x0a1a10,
    fogDensity: 0.03,
    pulseColor: 0x00ffaa,
    pulseSpeed: 1.0,
    eyeColor: 0x00ffcc,
    expression: 'FaceHappy',
    exaggeration: 'chibi_deform',
    exaggerationIntensity: 0.7,
    musicCue: 'hero_sting',
    combatStyle: 'aggressive',
    lightIntensity: 0.85,
  },
  despair: {
    name: 'despair',
    ambientColor: 0x050510,
    fogDensity: 0.05,
    pulseColor: 0x6633cc,
    pulseSpeed: 0.4,
    eyeColor: 0x6666aa,
    expression: 'FaceSad',
    exaggeration: 'none',
    musicCue: 'despair_drone',
    combatStyle: 'defensive',
    lightIntensity: 0.25,
  },
};

export class MoodDirector {
  constructor(storyboard) {
    this.storyboard = storyboard;
    this.currentMood = null;
    this.characters = new Map();
    this.scene = null;
    this.ambientPulse = null;
    this.baseAmbient = null;
    this.baseFogDensity = 0.02;
    this.transitionDuration = 0.6;
    this.transition = null; // { startTime, duration, targetColor, targetDensity }
  }

  bindScene(scene) {
    this.scene = scene;
    this.baseAmbient = scene.fog ? scene.fog.color.clone() : new THREE.Color(0x050510);
    this.baseFogDensity = scene.fog ? scene.fog.density : 0.02;

    // 创建环境脉冲光源（绑定到场景中心偏上）
    this.ambientPulse = new THREE.PointLight(MOODS.stealth.pulseColor, 0, 30, 2);
    this.ambientPulse.position.set(0, 6, -4);
    scene.add(this.ambientPulse);

    // 初始化 transition 快照，避免切场景后颜色跳变
    this.transition = null;
  }

  bindCharacter(name, character) {
    this.characters.set(name, character);
  }

  setMood(moodName, options = {}) {
    const mood = MOODS[moodName];
    if (!mood) {
      console.warn(`[MoodDirector] Unknown mood: ${moodName}`);
      return;
    }
    this.currentMood = mood;
    const duration = options.duration ?? this.transitionDuration;

    // 1. 场景环境光效过渡
    this._startTransition(mood, duration);

    // 2. 角色表情与眼部发光
    for (const [name, character] of this.characters) {
      this._applyToCharacter(character, mood, options.skipExpression);
    }

    // 3. 推送 MusicDirector Cue（如果存在且当前时间已知）
    this._queueMusicCue(mood);
  }

  _startTransition(mood, duration) {
    if (!this.scene) return;

    const startColor = this.scene.fog ? this.scene.fog.color.clone() : this.baseAmbient.clone();
    const startDensity = this.scene.fog ? this.scene.fog.density : this.baseFogDensity;

    this.transition = {
      startTime: this.storyboard._currentTime ?? 0,
      duration: Math.max(0.01, duration),
      startColor,
      targetColor: new THREE.Color(mood.ambientColor),
      startDensity,
      targetDensity: mood.fogDensity,
      mood,
    };

    if (this.ambientPulse) {
      this.ambientPulse.color.setHex(mood.pulseColor);
    }
  }

  _queueMusicCue(mood) {
    const md = this.storyboard && this.storyboard.musicDirector;
    if (!md || !mood.musicCue) return;

    const now = this.storyboard._currentTime ?? 0;
    // 兼容旧的 queueCue（如果引擎后续实现），否则使用标准 addCue
    if (typeof md.queueCue === 'function') {
      md.queueCue(mood.musicCue, {
        intensity: mood.lightIntensity,
        mood: mood.name,
      });
    } else if (typeof md.addCue === 'function') {
      md.addCue(new MusicCue({
        name: mood.musicCue,
        startTime: now,
        endTime: now + 60,
        fadeIn: 0.2,
        fadeOut: 1.0,
        baseVolume: mood.lightIntensity * 0.8,
        emotion: mood.name,
      }));
    }
  }

  _applyToCharacter(character, mood, skipExpression = false) {
    // 眼部发光
    if (character.eyeMeshes && character.eyeMeshes.length) {
      const eyeColor = new THREE.Color(mood.eyeColor);
      character.eyeMeshes.forEach((mesh) => {
        if (mesh.material && mesh.material.emissive) {
          mesh.material.emissive.setHex(mood.eyeColor);
          mesh.material.emissiveIntensity = 0.6 + mood.lightIntensity * 0.6;
        } else if (mesh.material && mesh.material.color) {
          mesh.material.color.lerp(eyeColor, 0.8);
        }
      });
    }

    // 能量核心脉冲速度
    if (character.chestCore) {
      character.corePulseSpeed = mood.pulseSpeed;
      if (character.chestCore.material && character.chestCore.material.emissive) {
        character.chestCore.material.emissive.setHex(mood.pulseColor);
      }
    }

    // 表情（如果角色有表情系统）
    if (!skipExpression && character.playExpression && mood.expression) {
      character.playExpression(mood.expression);
    }
  }

  update(time, delta) {
    if (!this.currentMood || !this.ambientPulse) return;
    const mood = this.currentMood;

    // 场景环境光效过渡（render-safe，不依赖 requestAnimationFrame）
    if (this.transition) {
      const { startTime, duration, startColor, targetColor, startDensity, targetDensity } = this.transition;
      const elapsed = time - startTime;
      const t = Math.min(1, Math.max(0, elapsed / duration));
      const eased = t * t * (3 - 2 * t); // smoothstep

      if (this.scene && this.scene.fog) {
        this.scene.fog.color.lerpColors(startColor, targetColor, eased);
        this.scene.fog.density = startDensity + (targetDensity - startDensity) * eased;
      }

      if (t >= 1) {
        this.transition = null;
      }
    }

    // 环境脉冲持续呼吸
    this.ambientPulse.intensity = mood.lightIntensity * (0.5 + 0.5 * Math.sin(time * mood.pulseSpeed));
  }

  getCombatStyle() {
    return this.currentMood ? this.currentMood.combatStyle : 'normal';
  }

  getExaggeration() {
    if (!this.currentMood || this.currentMood.exaggeration === 'none') return null;
    return { name: this.currentMood.exaggeration, intensity: this.currentMood.exaggerationIntensity };
  }
}
