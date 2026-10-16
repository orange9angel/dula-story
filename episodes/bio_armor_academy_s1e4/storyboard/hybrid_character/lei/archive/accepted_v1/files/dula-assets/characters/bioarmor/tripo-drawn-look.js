import {createDrawnHead} from '../../lib/craft3d/drawn-head.js';
import {illustrateImportedBody} from '../../lib/craft3d/illustrated-import.js';
import {leiGeneratedFace} from './lei-generated-paint.js';
import {aoiGeneratedFace} from './aoi-generated-paint.js';

const CONFIG={
  aoi:{centerY:1.49,range:.17,headCut:1.385,noseY:1.438,noseDepth:.013,earX:.098,earY:1.460,neckRadius:.039,skin:'#ffdfbc',iris:'#ac782e',browColor:'#39413b',irisCrop:[367,409,43,72],
    eyes:[[-.043,1.473,.0315,.035],[.043,1.473,.0315,.035]],brows:[[-.043,1.518,.023],[.043,1.518,.023]],mouth:[0,1.418,.0125],
    profiles:[[1.370,.002,.091,.087],[1.375,.020,.099,.065],[1.389,.043,.100,.024],[1.403,.061,.099,-.010],[1.418,.074,.101,-.042],[1.438,.087,.098,-.067],[1.464,.099,.098,-.088],[1.505,.104,.103,-.105],[1.537,.102,.099,-.110],[1.574,.082,.065,-.099],[1.612,.043,.012,-.073],[1.627,.001,-.028,-.029]]},
  lei:{centerX:-.012,centerY:1.615,range:.18,headCut:1.493,noseY:1.557,noseDepth:.016,earX:.101,earY:1.586,neckRadius:.043,skin:'#ffdcba',iris:'#887249',lashes:false,browWidth:.0027,browColor:'#4b352e',irisCrop:[1199,391,31,57],
    eyes:[[-.055,1.597,.032,.026],[.031,1.597,.032,.026]],brows:[[-.055,1.635,.024],[.031,1.635,.024]],mouth:[-.012,1.538,.014],
    profiles:[[1.493,.002,.097,.091],[1.499,.022,.106,.062],[1.516,.049,.106,.010],[1.528,.066,.104,-.022],[1.538,.076,.106,-.043],[1.557,.091,.103,-.074],[1.589,.102,.101,-.094],[1.632,.106,.107,-.113],[1.665,.102,.103,-.118],[1.702,.082,.067,-.105],[1.740,.041,.005,-.075],[1.753,.001,-.033,-.034]]}
};
export function applyTripoDrawnLook(actor,key,{directPaint=false}={}){
  const base={...CONFIG[key],irisArt:new URL('./textures/drawn-face-reference.png',import.meta.url).href};
  const config=directPaint?(key==='aoi'?aoiGeneratedFace(base):key==='lei'?leiGeneratedFace(base):base):base;
  const body=illustrateImportedBody(actor,{kind:key,headCut:config.headCut,keepHair:false,skin:config.skin,refineNeck:!!config.neckProfile});
  const face=createDrawnHead(actor,config);face.apply();
  return {face,body};
}
