import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { CatPortraitScene } from './scenes/CatPortraitSequenceScene.js';
import { GirlBakedSpeaker, CatBakedSpeaker, BoyBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerCharacter('Cat', CatBakedSpeaker);
registerCharacter('Boy', BoyBakedSpeaker);
registerScene('CatPortraitScene', CatPortraitScene);
