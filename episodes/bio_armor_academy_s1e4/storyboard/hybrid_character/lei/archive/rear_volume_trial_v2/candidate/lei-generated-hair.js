import {addPaintedHairShell} from '../../lib/craft3d/painted-hair-shell.js';

// The extracted painting enlarged the hair relative to its source face.
// Register it uniformly: production x=.85*hairX+75, y=.85*hairY-4.
export function leiGeneratedHairConfig(){
  return {
    url:new URL('./textures/lei-painted-hair-v1.png',import.meta.url).href,
    backUrl:new URL('./textures/lei-painted-back-v1.png',import.meta.url).href,
    originX:626,originY:727,originWorldX:-.012,anchorY:1.597,pixelsPerMetre:3529,
    baseColor:'#4e3932',edgeColor:'#30262b',
    profileFit:false,cores:[],
    rearClumpsUrl:new URL('/storyboard/hybrid_character/lei/archive/rear_volume_trial_v2/rear-clumps.png',location.href).href,
    projectionRadii:[.145,.140,.118],
    surface:{fringeY:[1.635,1.745],fringeX:[.100,.155],fringeDepth:.116,fringeSlope:.18,
      templeX:[.065,.108],templeY:[1.630,1.720],templeDepth:.021,
      frontMask:{x:[0,.00001],y:[1.567,1.572]},
      offset:.004,headClearance:.005,thickness:.0007},
    cap:{center:[-.012,1.652,-.008],radii:[.109,.124,.117],
      hem:[[-180,1.540],[-145,1.548],[-115,1.565],[-95,1.595],[-75,1.605],[-45,1.640],[0,1.680],
        [45,1.640],[75,1.605],[95,1.595],[115,1.565],[145,1.548],[180,1.540]]},
    rearMap:{originX:616,originY:700,anchorY:1.652,pixelsPerMetre:4200,spanX:458},
    rearCutout:true,rearOnFrontBack:false,capCrop:[440,240,180,220]
  };
}

export function addLeiGeneratedHair(actor){
  return addPaintedHairShell(actor,leiGeneratedHairConfig());
}
