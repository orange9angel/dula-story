import {registerAll} from 'dula-assets';
import {registerCharacter,registerScene} from 'dula-engine';
import {XiaozaoWindCraft,JianwangCraft,WeiheCraft} from 'dula-assets/characters/stardust/wind-characters.js';
import {WindSievePalaceScene} from 'dula-assets/scenes/stardust/WindSievePalaceScene.js';
registerAll();
registerCharacter('Xiaozao',XiaozaoWindCraft);
registerCharacter('Jianwang',JianwangCraft);
registerCharacter('Weihe',WeiheCraft);
registerScene('WindSievePalaceScene',WindSievePalaceScene);
