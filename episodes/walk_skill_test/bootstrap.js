import { registerAll } from 'dula-assets';
import { registerScene } from 'dula-engine';
import { SunlitStoreScene } from './scenes/SunlitStoreSequenceScene.js';

registerAll();
registerScene('SunlitStoreScene', SunlitStoreScene);
