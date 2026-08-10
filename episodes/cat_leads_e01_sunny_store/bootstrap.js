import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { SunlitStoreScene } from './scenes/SunlitStoreSequenceScene.js';
import { GirlBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerScene('SunlitStoreScene', SunlitStoreScene);
