import {registerAll} from 'dula-assets';
import {registerScene,registerCharacter} from 'dula-engine';
import {BiologyRoomScene} from './scenes/BiologyRoomRemakeScene.js';
import {LeiXiaoCraft} from 'dula-assets/characters/bioarmor/characters.js';
import {QianTangKuiCraft} from 'dula-assets/characters/bioarmor/QianTangKuiCraft.js';
registerAll();
registerScene('BiologyRoomScene',BiologyRoomScene);
registerCharacter('LeiXiao',LeiXiaoCraft);
class QianTangKuiEpisode extends QianTangKuiCraft {constructor(){super({heroine:true});}}
registerCharacter('QianTangKui',QianTangKuiEpisode);
