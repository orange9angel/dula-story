import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { FireflyNightScene } from './scenes/FireflyNightSequenceScene.js';
import { GirlBakedSpeaker, CatBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerCharacter('Cat', CatBakedSpeaker);
registerScene('FireflyNightScene', FireflyNightScene);
