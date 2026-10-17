import {RiggedCafeKid} from '/assets-lib/characters/sunprint/RiggedCafeKid.js';
import {CafeTable3D} from '../scenes/CafeTable3D.js';
export const characters=new Map(),scenes=new Map();
function registerCharacter(name,factory){characters.set(name,factory);}
function registerScene(name,Constructor){scenes.set(name,()=>new Constructor());}
registerCharacter('Girl',()=>new RiggedCafeKid('Girl',{bodyUrl:'/assets/models/girl_body_base.glb',clothingUrl:'/assets/images/girl_body_v1.png',portraitUrl:'/assets/images/girl_portrait_v1.png',hairUrl:'/assets/images/girl_hair_v1.png',rearHairUrl:'/assets/images/girl_rear_hair_v2.png',sideHairUrl:'/assets/images/girl_side_hair_v2.png'}));
registerCharacter('Boy',()=>new RiggedCafeKid('Boy',{bodyUrl:'/assets/models/boy_body_base.glb',clothingUrl:'/assets/images/boy_body_v1.png',portraitUrl:'/assets/images/boy_portrait_v1.png',hairUrl:'/assets/images/boy_hair_v1.png',rearHairUrl:'/assets/images/boy_rear_hair_v2.png'}));
registerScene('CafeMusicalScene',CafeTable3D);
