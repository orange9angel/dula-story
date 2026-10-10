import {registerAll} from 'dula-assets';
import {registerScene,registerCharacter} from 'dula-engine';
import {RooftopNoonScene} from './scenes/RooftopNoonScene.js';
import {LeiXiaoCraft,HongGangCraft} from 'dula-assets/characters/bioarmor/characters.js';
registerAll();
registerScene('RooftopNoonScene',RooftopNoonScene);
registerCharacter('LeiXiao',LeiXiaoCraft);
registerCharacter('HongGang',HongGangCraft);
