import { registerAll } from 'dula-assets';
import { SceneRegistry, registerScene, registerCharacter, registerAnimation, CharacterRegistry } from 'dula-engine';

import { Gian } from './characters/Gian.js';
import { Suneo } from './characters/Suneo.js';
import { attachPropTo, detachPropFrom } from './characters/props.js';
import { VacantLotScene } from './scenes/VacantLotScene.js';
import { FXAirBlast } from './animations/FXAirBlast.js';

registerAll();

// Alias the default RoomScene as NobitaRoom for this episode.
class NobitaRoom extends SceneRegistry.RoomScene {
  constructor() {
    super();
    this.name = 'NobitaRoom';
  }
}

registerScene('NobitaRoom', NobitaRoom);
registerScene('VacantLotScene', VacantLotScene);

// 大雄增强版：支持漫画/空气炮道具挂载（子类化官方 Nobita，同名覆盖注册）
class NobitaEx extends CharacterRegistry.Nobita {
  attachProp(type) {
    // 漫画拿左手，空气炮拿右手，避免两件道具在同一只手穿插
    attachPropTo(this, type, type === 'comic' ? 'left' : 'right');
  }

  detachProp(type) {
    detachPropFrom(this, type);
  }
}

registerCharacter('Nobita', NobitaEx);

// 本集新角色：胖虎与小夫（剧集本地建模，不入官方资产库）
registerCharacter('Gian', Gian);
registerCharacter('Suneo', Suneo);

// 本集自定义特效：空气炮发射
registerAnimation('FXAirBlast', FXAirBlast);
