import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { DuskHomecomingScene } from './scenes/DuskHomecomingSequenceScene.js';
import { GirlBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerScene('DuskHomecomingScene', DuskHomecomingScene);
