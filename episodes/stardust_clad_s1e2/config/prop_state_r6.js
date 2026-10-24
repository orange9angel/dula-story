import {shieldFrames as previous} from './prop_state_r2.js';
export {shieldState} from './prop_state_r2.js';
const frames={...previous,
 hero_recoil:{center:[452,179],axisX:[54,-31],axisY:[75,128]},
 hero_lower:{center:[272,338],axisX:[54,-15],axisY:[30,130]}
};
export const shieldFrames=Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,{...v,widthRatio:.022,minWidth:.8,jagged:true}]));
