// Reviewed local coordinates, component identity independent of shot distance.
export const forearmFrames={
 hero_idle:{visibility:'occluded',reason:'Shield face covers its holding wrist; chest hand is the other arm.'},
 hero_block:{visibility:'visible',center:[1005,276],axisX:[21,-5],axisY:[6,31],clip:[[988,253],[1028,234],[1029,306],[1004,311],[986,285]]},
 hero_recoil:{visibility:'visible',anatomicalSide:'right',center:[354,185],axisX:[12,-3],axisY:[2,23],clip:[[341,164],[363,146],[377,200],[355,221],[337,207]]},
 hero_lower:{visibility:'occluded',anatomicalSide:'right',reason:'Right wrist is behind the lowered shield; left hand guards the chest.'},
 hero_kneel:{visibility:'visible',center:[969,985],axisX:[36,3],axisY:[-2,21],clip:[[910,963],[991,967],[1002,1003],[922,1010],[905,990]]},
 hero_charge:{visibility:'occluded',reason:'Not selected in R5; held shield obscures the wrist.'},
 hero_release:{visibility:'occluded',reason:'Not selected in R5; kept for legacy registration.'}
};
// Root travel follows a short hesitation and an acceleration ramp. Distance drives
// cel phase, so changing speed does not keep an independent treadmill running.
export function exitTravel(t,start){
 const q=Math.max(0,t-start-.28),ramp=.65,speed=84;
 return speed*(q<ramp?q*q/(2*ramp):q-ramp/2);
}
export const exitHipX=Array(12).fill(168);
