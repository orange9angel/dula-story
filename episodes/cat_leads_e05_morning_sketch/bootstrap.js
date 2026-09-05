import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { MorningSketchScene } from './scenes/MorningSketchSequenceScene.js';
import { GirlBakedSpeaker, CatBakedSpeaker, BoyBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerCharacter('Cat', CatBakedSpeaker);
registerCharacter('Boy', BoyBakedSpeaker);
registerScene('MorningSketchScene', MorningSketchScene);
