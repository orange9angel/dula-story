import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { RainyRooftopScene } from './scenes/RainyRooftopSequenceScene.js';
import { GirlBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerScene('RainyRooftopScene', RainyRooftopScene);
