import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { GirlBakedSpeaker, BoyBakedSpeaker } from './characters/BakedSpeaker.js';
import { HuazhongGurenScene } from './scenes/HuazhongGurenSequenceScene.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerCharacter('Boy', BoyBakedSpeaker);
registerScene('HuazhongGurenScene', HuazhongGurenScene);
