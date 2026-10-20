import {registerCharacter,registerScene} from 'dula-engine';
import {registerAll} from 'dula-assets';
import {XiaozaoPalaceCraft,JianwangPalaceCraft} from 'dula-assets/characters/stardust/wind-palace-craft.js';
import {WindGalleryScene} from 'dula-assets/scenes/stardust/WindGalleryScene.js';
registerAll();
registerCharacter('Xiaozao',XiaozaoPalaceCraft);
registerCharacter('Jianwang',JianwangPalaceCraft);
registerScene('WindGalleryScene',WindGalleryScene);
