import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene, registerAnimation, CharacterRegistry } from 'dula-engine';
import { SpiritGunFire } from '/node_modules/dula-assets/animations/yuyuhakusho/SpiritGunFire.js';
import { SpiritGunCharge } from '/node_modules/dula-assets/animations/yuyuhakusho/SpiritGunCharge.js';
import * as THREE from 'three';

import { TurboOne } from './characters/TurboOne.js';
import { GearShift } from './characters/GearShift.js';
import { SkyRazor } from './characters/SkyRazor.js';
import { Overdrive } from './characters/Overdrive.js';
import { CircuitBurn } from './characters/CircuitBurn.js';
import { Drone } from './characters/Drone.js';

import { NeonHighwayScene } from './scenes/NeonHighwayScene.js';
import { ScrapyardSectorScene } from './scenes/ScrapyardSectorScene.js';
import { PlasmaVaultScene } from './scenes/PlasmaVaultScene.js';

import { RobotTransform } from './animations/RobotTransform.js';
import { RobotRevert } from './animations/RobotRevert.js';
import { CrouchPlasmaRifle } from './animations/CrouchPlasmaRifle.js';

registerAll();

// 注册自定义角色（使用中文名，不再使用英文代号）
registerCharacter('雷恩', TurboOne);
registerCharacter('布洛克', GearShift);
registerCharacter('斯凯', SkyRazor);
registerCharacter('维克', Overdrive);
registerCharacter('达什', CircuitBurn);

// 克洛斯公司 Viper 无人战机
registerCharacter('Viper-1', Drone);
registerCharacter('Viper-2', Drone);
registerCharacter('Viper-3', Drone);

// 注册自定义场景
registerScene('NeonHighwayScene', NeonHighwayScene);
registerScene('ScrapyardSectorScene', ScrapyardSectorScene);
registerScene('PlasmaVaultScene', PlasmaVaultScene);

// 注册自定义动画
registerAnimation('RobotTransform', RobotTransform);
registerAnimation('RobotRevert', RobotRevert);
registerAnimation('CrouchPlasmaRifle', CrouchPlasmaRifle);
// 把日式灵丸动画映射为机甲风格的等离子步枪别名
registerAnimation('PlasmaRifle', SpiritGunFire);
registerAnimation('PlasmaRifleCharge', SpiritGunCharge);

// 全局增强：避免机器人头部/身体在变身或战斗后出现持续抖动。
// 不再覆盖 update 添加周期性 scale/position 脉冲；口型和发光由 CharacterBase 与材质本身处理。
['雷恩', '布洛克', '斯凯', '维克', '达什'].forEach((name) => {
  const Class = CharacterRegistry[name];
  if (!Class) return;
  // 保留原始 update，不附加额外抖动源
  if (!Class.prototype._shakeFixApplied) {
    Class.prototype._shakeFixApplied = true;
  }
});
