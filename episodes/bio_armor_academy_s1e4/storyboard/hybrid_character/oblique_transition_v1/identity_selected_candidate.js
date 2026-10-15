import {paintGeneratedFace} from '../../lib/craft3d/generated-face-paint.js';
import {addPaintedHairShell} from '../../lib/craft3d/painted-hair-shell.js';
// Authored oblique correction in Aoi's metre frame, shared with overlying hair.
const AOI_OBLIQUE_FACE_SUPPORT={"width":0.01,"depth":0.018,"outerEyeFold":0.016,"lowerCheek":0.01,"deepCheek":0.006,"cheekSupport":0.55,"eyeClip":true,"farEyeRelax":0.28,"profileStart":45,"cheekCenter":1.41,"cheekSpread":0.032,"cheekUpperIndent":0,"eyeFoldTop":[1.485,1.55],"cheekTop":[1.44,1.46],"eyeFoldBottom":[1.45,1.475],"farCheekCurve":{"topY":1.46,"top":0.1062,"slope":0,"quadratic":0,"cubic":8,"points":[[1.376,0.0776,0.5],[1.39,0.085,0.62],[1.41,0.098,0.55],[1.43,0.105,0.13],[1.46,0.1062,0.02]]},"noseGraphicRecess":0.01,"shallowCheekCurve":{"top":0.1042,"slope":0.1,"quadratic":1,"cubic":25},"earlyEyeClip":true,"hairTempleRoundness":0.012,"orbitCheekEdge":[[1.41,0.098,0.55],[1.43,0.1044,0.05],[1.45,0.1049,0.015],[1.46,0.105,0.04],[1.47,0.106,0.16],[1.48,0.108,0.23],[1.49,0.1106,0.24],[1.5,0.1123,0.1]],"farEyeWhite":{"centerX":0.0365,"centerY":1.47375,"radiusX":0.01288,"radiusY":0.01682,"margin":0.0018},"profileEyeShape":{"shear":-0.18,"irisSlope":0.06,"temporalDepth":0.5},"lateCheekSupport":0.0035,"noseProfileRetain":0.5};

export function aoiGeneratedFace(base){
  return {...base,textureSize:2048,skin:'#ffddbf',paintFace:paintGeneratedFace,
    irisArt:new URL('./textures/aoi-painted-face-v1.png',import.meta.url).href,
    paint:{originX:642,originY:658,anchorY:1.473,pixelsPerMetre:3300,
      eyeInset:22,browInset:30,temporalLashScale:.90,nasalLashLength:1.85,nasalLashStyle:'tapered',
      eyes:[[500,656,458,600,85,111],[785,655,743,599,85,111]],mouth:[641,852]},
    cheekFullness:.045,neckZ:.012,neckTopZ:.008,neckRadius:.034,earZ:.006,earY:1.460,
    earScale:[.011,.032,.022],
    jawDefinition:{rootY:1.445,rootZ:.008,power:3.0,obliqueRootY:1.435,obliquePower:1.8,ink:'#876052',shadow:'#edb394'},
    neckInk:true,
    neckProfile:[[1.300,.043,.060,-.035],[1.322,.039,.056,-.038],[1.335,.034,.048,-.040],[1.375,.032,.040,-.047],[1.397,.033,.055,-.052],[1.415,.036,.053,-.057],[1.452,.044,.031,-.067]],
    drawnEar:true,earRootDefinition:true,earShape:'attached',obliqueFaceSupport:AOI_OBLIQUE_FACE_SUPPORT,
    faceRoundness:1.45,noseDepth:0,
    cranium:{"startY":1.495,"fullY":1.55,"backStartY":1.418,"backFullY":1.495,"centerY":1.505,"topY":1.62,"width":0.1,"front":0.115,"back":-0.11,"templeStartY":1.46,"templeFullY":1.53,"templePower":0.65,"widthStartY":1.44,"widthFullY":1.49},
    // Original side drawing, blended beyond 45 degrees into the full profile.
    profileReference:{"profileContour":[[1.376,0.096864],[1.38,0.099769],[1.386,0.101469],[1.391,0.102288],[1.397,0.10467],[1.403,0.108259],[1.408,0.110816],[1.413,0.111587],[1.419,0.115716],[1.423,0.117272],[1.426,0.117141],[1.429,0.117223],[1.431,0.118343],[1.435,0.120234],[1.436,0.120735],[1.441,0.123225],[1.446,0.124737],[1.448,0.124537],[1.451,0.12124],[1.453,0.11823],[1.456,0.113355],[1.462,0.106998],[1.466,0.105414],[1.469,0.104301],[1.473,0.103929],[1.483,0.103],[1.51,0.104],[1.537,0.1],[1.574,0.065],[1.605,0.012],[1.612,-0.028]],"jawContour":[[1.376,0.093864],[1.38,0.071006],[1.389,0.019575],[1.406,-0.033],[1.418,-0.052],[1.438,-0.073],[1.464,-0.088],[1.505,-0.105],[1.537,-0.11],[1.574,-0.099],[1.605,-0.06],[1.612,-0.029]]},
    // Keep the profile iris compression without pushing the eye region into
    // the face: the old 14 mm recess hid the far eye on oblique views.
    externalContour:[60,70],
    eyeSurface:{slope:.36,recess:0,width:.030,height:.027},
    earPaint:[[290,620,115,182],[872,620,114,182]],
    profileContour:[[1.376,.079],[1.380,.086],[1.391,.091],[1.403,.094],[1.413,.098],[1.419,.100],[1.426,.099],[1.431,.103],[1.436,.111],[1.441,.117],[1.446,.116],[1.453,.108],[1.462,.099],[1.473,.097],[1.483,.100],[1.510,.104],[1.537,.100],[1.574,.065],[1.605,.012],[1.612,-.028]],
    jawContour:[[1.376,.076],[1.380,.056],[1.389,.011],[1.406,-.033],[1.418,-.052],[1.438,-.073],[1.464,-.088],[1.505,-.105],[1.537,-.110],[1.574,-.099],[1.605,-.060],[1.612,-.029]],
    profiles:[[1.376,.001,.087,.080],[1.382,.019,.092,.062],[1.394,.042,.096,.016],[1.406,.056,.098,-.016],[1.418,.067,.100,-.042],[1.438,.079,.099,-.067],[1.464,.091,.099,-.088],[1.505,.093,.103,-.105],[1.537,.087,.099,-.110],[1.574,.065,.065,-.099],[1.605,.018,.012,-.060],[1.612,.001,-.028,-.029]]};
}
export function addAoiGeneratedHair(actor,{profileFit=true}={}){
  return addPaintedHairShell(actor,{
    obliqueFaceSupport:AOI_OBLIQUE_FACE_SUPPORT,
    url:new URL('./textures/aoi-painted-hair-v1.png',import.meta.url).href,
    backUrl:new URL('./textures/aoi-painted-back-v1.png',import.meta.url).href,
    originX:615,originY:654,anchorY:1.473,pixelsPerMetre:3186,
    projectionRadii:[.166,.163,.142],templeWrap:.065,profileFit,
    ...(profileFit?{
      tailDepth:-.060,napeDrop:.043,napeWrap:.90,templeCurve:true,naturalTempleLocks:true,
      sidePaint:{url:new URL('./textures/aoi-profile-hair-atlas-v1.png',import.meta.url).href,
        scale:1030,right:[690,590],left:[201,182],anchorY:1.473},
      cap:{center:[0,1.523,-.016],radii:[.106,.128,.113],
        hem:[[-180,1.411],[-145,1.415],[-110,1.438],[-80,1.476],[-45,1.550],[0,1.575],[45,1.550],[80,1.476],[110,1.438],[145,1.415],[180,1.411]]}
    }:{cap:{center:[0,1.514,-.027],radii:[.112,.140,.121],
      hem:[[-180,1.400],[-145,1.407],[-110,1.430],[-80,1.470],[-45,1.550],[0,1.575],[45,1.550],[80,1.470],[110,1.430],[145,1.407],[180,1.400]]}}),
    capCrop:[295,140,240,330]
  });
}
