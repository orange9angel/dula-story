import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene, registerAnimation, CharacterRegistry } from 'dula-engine';
import * as THREE from 'three';

import { V1Red } from './characters/V1Red.js';
import { T2Blue } from './characters/T2Blue.js';
import { A3White } from './characters/A3White.js';
import { X0Black } from './characters/X0Black.js';
import { R4Orange } from './characters/R4Orange.js';

import { NeonHighwayScene } from './scenes/NeonHighwayScene.js';
import { ScrapyardSectorScene } from './scenes/ScrapyardSectorScene.js';
import { PlasmaVaultScene } from './scenes/PlasmaVaultScene.js';

import { RobotTransform } from './animations/RobotTransform.js';
import { RobotRevert } from './animations/RobotRevert.js';

registerAll();

// 注册自定义角色
registerCharacter('V1_RED', V1Red);
registerCharacter('T2_BLUE', T2Blue);
registerCharacter('A3_WHITE', A3White);
registerCharacter('X0_BLACK', X0Black);
registerCharacter('R4_ORANGE', R4Orange);

// 注册自定义场景
registerScene('NeonHighwayScene', NeonHighwayScene);
registerScene('ScrapyardSectorScene', ScrapyardSectorScene);
registerScene('PlasmaVaultScene', PlasmaVaultScene);

// 注册自定义动画
registerAnimation('RobotTransform', RobotTransform);
registerAnimation('RobotRevert', RobotRevert);

// 全局增强：让机器人在说话时口型/面罩更有电子生命感
['V1_RED', 'T2_BLUE', 'A3_WHITE', 'X0_BLACK', 'R4_ORANGE'].forEach((name) => {
  const Class = CharacterRegistry[name];
  if (!Class) return;
  const originalUpdate = Class.prototype.update;
  Class.prototype.update = function (time, delta) {
    originalUpdate.call(this, time, delta);
    if (this.currentMode === 'robot' && this.headGroup) {
      const pulse = 1 + Math.sin(time * 4 + name.length) * 0.02;
      this.headGroup.scale.setScalar(pulse);
    }
  };
});
