export const WELL_STEPS=[
 {x:2.35,z:.60,width:.70,depth:.30,height:.15},
 {x:2.35,z:.34,width:.70,depth:.30,height:.30},
 {x:2.35,z:.08,width:.70,depth:.30,height:.45}
];
export function wellStairGround(x,z){
 if(x>=1.425&&x<=2.775&&z<=-.025&&z>=-1.175)return .5;
 for(const s of WELL_STEPS)if(Math.abs(x-s.x)<=s.width/2&&Math.abs(z-s.z)<=s.depth/2)return s.height;
 return 0;
}
