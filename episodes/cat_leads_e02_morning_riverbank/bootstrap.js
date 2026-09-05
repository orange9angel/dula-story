import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { RiverbankMorningScene } from './scenes/RiverbankMorningSequenceScene.js';
import { GirlBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerScene('RiverbankMorningScene', RiverbankMorningScene);
