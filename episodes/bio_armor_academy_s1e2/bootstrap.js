import {registerAll} from 'dula-assets';
import {registerScene,registerCharacter} from 'dula-engine';
import {RuinsDuskScene} from './scenes/RuinsDuskScene.js';
import {LeiXiaoCraft,HongGangCraft,ObserverCraft} from './characters.js';
registerAll();
registerScene('RuinsDuskScene',RuinsDuskScene);
registerCharacter('LeiXiao',LeiXiaoCraft);
registerCharacter('HongGang',HongGangCraft);
registerCharacter('Observer',ObserverCraft);
