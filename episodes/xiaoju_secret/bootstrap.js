import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { XiaojuSecretScene } from './scenes/XiaojuSecretSequenceScene.js';
import { GirlBakedSpeaker, BoyBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Girl', GirlBakedSpeaker);
registerCharacter('Boy', BoyBakedSpeaker);
registerScene('XiaojuSecretScene', XiaojuSecretScene);
