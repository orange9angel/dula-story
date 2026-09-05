import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { BioArmorCityScene } from './scenes/BioArmorCityScene.js';
import { LeiXiaoBakedSpeaker, BaiLanBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('LeiXiao', LeiXiaoBakedSpeaker);
registerCharacter('BaiLan', BaiLanBakedSpeaker);
registerScene('BioArmorCityScene', BioArmorCityScene);
