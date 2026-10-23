import {T} from './event_times.js';
export function shieldState(t){return t<T.SCAR?{id:'intact',level:0}:t<T.C5?{id:'cracked',level:1}:{id:'deep-cracks',level:2};}
// Surface axes in the source illustration (center / horizontal / downward).
export const shieldFrames={
 hero_idle:{center:[181,380],axisX:[58,15],axisY:[-37,148]},
 hero_block:{center:[1113,317],axisX:[81,-15],axisY:[24,169]},
 hero_recoil:{center:[453,845],axisX:[45,-37],axisY:[88,122]},
 hero_kneel:{center:[1125,1081],axisX:[56,-18],axisY:[44,139]},
 hero_charge:{center:[184,1029],axisX:[112,23],axisY:[-79,357]},
 hero_release:{center:[851,617],axisX:[116,-51],axisY:[140,269]},
 hero_breakdown:{center:[777,675],axisX:[146,-70],axisY:[135,237]}
};
