// Viewer registry is the executable integration target for this episode.
// It is deliberately not presented as a CharacterBase/dula-render adapter.
import {IllustratedCafeKid} from '/assets-lib/characters/sunprint/IllustratedCafeKid.js';
import {CafeMusicalScene} from './scenes/CafeMusicalScene.js';
export const characters=new Map(),scenes=new Map();
function registerCharacter(name,factory){characters.set(name,factory);}
function registerScene(name,factory){scenes.set(name,factory);}
registerCharacter('Girl',()=>new IllustratedCafeKid('Girl',{bodyUrl:'/assets/images/girl_body_v1.png'}));
registerCharacter('Boy',()=>new IllustratedCafeKid('Boy',{bodyUrl:'/assets/images/boy_body_v1.png'}));
registerScene('CafeMusicalScene',()=>new CafeMusicalScene());
