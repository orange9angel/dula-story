import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { AnimeBasketballSequenceScene } from './scenes/AnimeBasketballSequenceScene.js';
import { BoyBakedSpeaker, HigurashiBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Higurashi', HigurashiBakedSpeaker);
registerCharacter('Boy', BoyBakedSpeaker);
registerScene('AnimeBasketballSequenceScene', AnimeBasketballSequenceScene);
