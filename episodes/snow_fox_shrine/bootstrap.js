import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';
import { SnowFoxShrineScene } from './scenes/SnowFoxShrineScene.js';
import { TsumugiBakedSpeaker, FoxBakedSpeaker } from './characters/BakedSpeaker.js';

registerAll();
registerCharacter('Tsumugi', TsumugiBakedSpeaker);
registerCharacter('Fox', FoxBakedSpeaker);
registerScene('SnowFoxShrineScene', SnowFoxShrineScene);
