import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { WillowFishingScene } from './scenes/WillowFishingSequenceScene.js';
import { GirlBakedSpeaker, CatBakedSpeaker, BoyBakedSpeaker, OldManBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerCharacter('Cat', CatBakedSpeaker);
registerCharacter('Boy', BoyBakedSpeaker);
registerCharacter('OldMan', OldManBakedSpeaker);
registerScene('WillowFishingScene', WillowFishingScene);
