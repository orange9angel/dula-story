/**
 * RobotStateMachine — 机器人角色状态机
 *
 * 状态：normal / cautious / damaged / overdrive
 * 联动表现：
 *   - cautious: 移动变慢，眼部黄光，核心脉冲变慢
 *   - damaged: 眼部红光闪烁，核心脉冲不规则，部分动作替换为蹒跚/格挡
 *   - overdrive: 眼部青白强光，核心脉冲极快，攻击动作带残影
 *
 * 与 MoodDirector 配合：
 *   - 当 Mood=combat 时，受伤角色更容易进入 overdrive（绝地反击）
 *   - 当 Mood=stealth 时，所有角色强制 cautious
 */

export const ROBOT_STATES = {
  normal: {
    eyeColor: null, // 使用角色默认
    coreSpeed: 1.0,
    moveScale: 1.0,
    animSuffix: '',
    aura: null,
  },
  cautious: {
    eyeColor: 0xffaa00,
    coreSpeed: 0.6,
    moveScale: 0.75,
    animSuffix: '',
    aura: null,
  },
  damaged: {
    eyeColor: 0xff2200,
    coreSpeed: 0.4,
    moveScale: 0.65,
    animSuffix: '_damaged',
    aura: 'FXChargeGlow',
  },
  overdrive: {
    eyeColor: 0x00ffff,
    coreSpeed: 2.5,
    moveScale: 1.25,
    animSuffix: '',
    aura: 'FXEnergyAura',
  },
};

export class RobotStateMachine {
  constructor(character) {
    this.character = character;
    this.state = 'normal';
    this.health = 100;
    this.energy = 100;
    this.damageFlashTimer = 0;
  }

  setState(stateName) {
    if (!ROBOT_STATES[stateName] || this.state === stateName) return;
    this.state = stateName;
    this._applyVisuals();
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.damageFlashTimer = 0.3;
    if (this.health < 35) {
      this.setState('damaged');
    } else if (this.health < 70) {
      this.setState('cautious');
    }
  }

  boostEnergy(amount) {
    this.energy = Math.min(100, this.energy + amount);
    if (this.energy > 80 && this.state !== 'overdrive') {
      this.setState('overdrive');
    }
  }

  syncWithMood(moodName) {
    if (moodName === 'stealth' && this.state !== 'damaged') {
      this.setState('cautious');
    }
    if (moodName === 'combat' && this.state === 'damaged' && this.energy > 50) {
      this.setState('overdrive');
    }
  }

  _applyVisuals() {
    const cfg = ROBOT_STATES[this.state];
    const char = this.character;

    if (cfg.eyeColor && char.eyeMeshes) {
      char.eyeMeshes.forEach((mesh) => {
        if (mesh.material && mesh.material.emissive) {
          mesh.material.emissive.setHex(cfg.eyeColor);
        }
      });
    }

    if (char.chestCore) {
      char.corePulseSpeed = cfg.coreSpeed;
    }

    if (cfg.aura && char.showAura) {
      char.showAura(cfg.aura);
    } else if (!cfg.aura && char.hideAura) {
      char.hideAura();
    }
  }

  update(time, delta) {
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      const flash = Math.sin(time * 30) > 0;
      if (this.character.chestCore && this.character.chestCore.material) {
        this.character.chestCore.material.emissiveIntensity = flash ? 1.2 : 0.4;
      }
    }
  }
}

export function attachStateMachine(character) {
  character.stateMachine = new RobotStateMachine(character);
  return character.stateMachine;
}
