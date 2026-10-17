// Preserve the user's improved dialogue/look trial while redesigning lower-face proportions.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const ep=path.resolve(import.meta.dirname,'..'),assets=path.resolve(ep,'../../../dula-assets');
const out=path.join(ep,'tmp/round_face');fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const previous=JSON.parse(fs.readFileSync(path.join(ep,'tmp/natural_look/review.json'),'utf8'));
const sourceFile=path.join(ep,'tmp/natural_look/tripo-drawn-look.js'),source=fs.readFileSync(sourceFile,'utf8');
if(sha(source)!==previous.inputOverrides['/characters/bioarmor/tripo-drawn-look.js'].sha256)throw new Error('The reviewed starting face has changed');
const headFile=path.join(assets,'lib/craft3d/drawn-head.js'),head=fs.readFileSync(headFile,'utf8');
// Keep source-art UVs attached to the same points when lower-face heights change.
// This inverse map is static, not an angle-dependent face correction.
const uvAnchor='(p[0]-centerY)/(range*2)';
if(!head.includes(uvAnchor))throw new Error('UV anchor changed');
fs.writeFileSync(path.join(out,'drawn-head.js'),head.replace(uvAnchor,'((config.paintSourceY?config.paintSourceY(p[0]):p[0])-centerY)/(range*2)'));
const write=(file,obj)=>fs.writeFileSync(path.join(out,file),typeof obj==='string'?obj:JSON.stringify(obj,null,2)+'\n');
const functionText=`
function roundFace(original,key,variant){
  const female=key==='aoi';
  const c={...original},strong=variant==='round',anchor=female?1.452:1.575,bottom=original.profiles[0][0],lift=female?.008:strong?.024:.014;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const height=y=>y+lift*smooth((anchor-y)/(anchor-bottom));
  const sourceY=y=>{if(y>=anchor)return y;let lo=y-lift,hi=y;for(let i=0;i<28;i++){const m=(lo+hi)*.5;if(height(m)<y)lo=m;else hi=m;}return (lo+hi)*.5;};
  const widths=female?[.005,.030,.055,.070,.081,.090,.096]:strong?[.006,.022,.031,.040,.061,.078,.090,.099,.103,.101]:[.006,.019,.027,.035,.053,.068,.081,.091,.100,.101];
  const recess=y=>female?.0015*Math.exp(-Math.pow((y-1.443)/.014,2)):(strong?.005:.003)*Math.exp(-Math.pow((y-1.562)/.015,2))+.0015*Math.exp(-Math.pow((y-1.532)/.016,2));
  c.profiles=original.profiles.map((p,i)=>[height(p[0]),widths[i]??p[1],p[2]-recess(p[0])*.30,p[3]]);
  c.profileContour=original.profileContour.map(([y,z])=>[height(y),z-recess(y)]);
  c.jawContour=original.jawContour.map(([y,z])=>[height(y),z]);
  if(original.profileReference)c.profileReference={...original.profileReference,
    profileContour:original.profileReference.profileContour.map(([y,z])=>[height(y),z-recess(y)]),
    jawContour:original.profileReference.jawContour.map(([y,z])=>[height(y),z])};
  c.noseY=height(original.noseY);c.mouth=[original.mouth[0],height(original.mouth[1]),original.mouth[2]];
  c.paintSourceY=sourceY;
  c.faceRoundness=female?1.25:strong?.82:.88;
  c.jawDefinition={...original.jawDefinition,rootY:height(original.jawDefinition.rootY),obliqueRootY:height(original.jawDefinition.obliqueRootY),power:female?2.8:2.4,obliquePower:female?1.8:2.1};
  if(original.jawDefinition.profileChin)c.jawDefinition.profileChin={...original.jawDefinition.profileChin,centerY:height(original.jawDefinition.profileChin.centerY)};
  if(original.obliqueFaceSupport){
    const s={...original.obliqueFaceSupport};
    s.cheekCenter=height(s.cheekCenter);
    for(const k of ['eyeFoldTop','cheekTop','eyeFoldBottom'])if(s[k])s[k]=s[k].map(height);
    s.farCheekCurve={...s.farCheekCurve,topY:height(s.farCheekCurve.topY),points:s.farCheekCurve.points.map(([y,...rest])=>[height(y),...rest])};
    s.orbitCheekEdge=s.orbitCheekEdge.map(([y,...rest])=>[height(y),...rest]);
    c.obliqueFaceSupport=s;
  }
  return c;
}
function seatHead(actor,key){
  // Half the chin lift is offset by seating the whole head lower. Hair and ears
  // follow their existing bone, and the continuous neck follows the new top.
  const amount=key==='lei'?.007:.004;
  actor.mesh.updateMatrixWorld(true);
  const parent=actor.bones.head.parent,zero=actor.bones.head.position.clone().set(0,0,0),delta=zero.clone().set(0,-amount,0);
  actor.mesh.localToWorld(zero);actor.mesh.localToWorld(delta);
  parent.worldToLocal(zero);parent.worldToLocal(delta);delta.sub(zero);
  const reset=actor.reset;
  actor.reset=function(...args){const result=reset.apply(this,args);this.bones.head.position.add(delta);this.mesh.updateMatrixWorld(true);return result;};
}
`;
for(const variant of ['balanced','round']){
  const name='tripo-'+variant+'.js';
  const needle='createDrawnHead(actor,softenLowerFace(config,key))';
  if(!source.includes(needle))throw new Error('Reviewed candidate callsite changed');
  write(name,source.replace(needle,`createDrawnHead(actor,roundFace(softenLowerFace(config,key),key,'${variant}'))`).replace('face.apply();','seatHead(actor,key);face.apply();')+functionText);
  write(variant+'.json',{
    '/characters/bioarmor/tripo-drawn-look.js':'tmp/round_face/'+name,
    '/lib/craft3d/drawn-head.js':'tmp/round_face/drawn-head.js',
    '/lib/craft3d/illustrated-import.js':'tmp/natural_look/illustrated-import.js'
  });
}
write('scene_trial.json',{
  ...JSON.parse(fs.readFileSync(path.join(ep,'tmp/natural_look/scene_trial.json'),'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(out,'balanced.json'),'utf8'))
});
// Rebuilding the trial must not redefine its already-frozen preceding version.
if(!fs.existsSync(path.join(out,'baseline.json')))write('baseline.json',{files:Object.fromEntries([sourceFile,headFile,path.join(ep,'output/naturalness_candidate.mp4'),path.join(ep,'output/current.mp4')].map(p=>[p,sha(fs.readFileSync(p))])),
  status:'User prefers previous overall improvement, rejects remaining sharp/alien-looking face; male priority',
  scope:'Lower-face proportions and nose relief. Preserve hair, eyes, clothing, scene, dialogue and audio.'});
console.log(out);
