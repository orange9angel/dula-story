// Keep the locally accepted eye rendering; revise the jaw/neck separately.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const ep=path.resolve(import.meta.dirname,'..'),out=path.join(ep,'tmp/jaw_connection');
fs.mkdirSync(out,{recursive:true});
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sourcePath=path.join(ep,'tmp/head_proportion/balanced.js');
const prior=JSON.parse(fs.readFileSync(path.join(ep,'tmp/head_proportion/review.json'),'utf8'));
if(hash(sourcePath)!==prior.inputOverrides['/characters/bioarmor/tripo-drawn-look.js'].sha256)throw new Error('Frozen source changed');
const source=fs.readFileSync(sourcePath,'utf8');
const anchor="createDrawnHead(actor,proportionNeck(roundFace(softenLowerFace(config,key),key,'balanced'),key,'balanced'))";
if(!source.includes(anchor))throw new Error('Missing source anchor');
const helper=`
function jawConnection(config,key){
  const c={...config},female=key==='aoi';
  // The old high power kept the mandibular edge flat until it reached the ear.
  // Retain chin/root anchors and eye geometry, distribute the rise along the jaw.
  c.jawDefinition={...config.jawDefinition,power:female?2.05:1.95,obliquePower:female?1.75:1.8};
  // Remove the forward bulge of the upper neck without moving the collar base.
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  c.neckProfile=config.neckProfile.map(([y,w,f,b])=>[y,w,f-(female?.010:.008)*smooth((y-(female?1.355:1.465))/.055),b]);
  return c;
}
function installCheekContour(actor,key){
  if(key!=='lei')return;
  const root=actor.mesh.getObjectByName('drawn-head'),seen=new WeakSet();
  // Shape the skin below the lower lid, without moving eyes, ears or hair.
  for(const mesh of root.children){
    if(!mesh.isMesh||mesh.geometry.type==='SphereGeometry')continue;
    for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
      if(seen.has(material))continue;seen.add(material);
      const previous=material.onBeforeCompile,cache=material.customProgramCacheKey();
      material.onBeforeCompile=function(shader,renderer){
        previous.call(this,shader,renderer);
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
          'float cheekX=transformed.x+0.012;\\n'+
          'float cheekBand=(0.004*exp(-pow((transformed.y-1.552)/0.014,2.0))-0.002*exp(-pow((transformed.y-1.577)/0.008,2.0)))*(1.0-smoothstep(1.576,1.583,transformed.y));\\n'+
          'transformed.x+=sign(cheekX)*cheekBand*smoothstep(0.020,0.055,abs(cheekX))*smoothstep(0.015,0.065,transformed.z);\\n#include <project_vertex>');
      };
      material.customProgramCacheKey=()=>cache+'|lower-cheek-contour';material.needsUpdate=true;
    }
  }
}
`;
fs.writeFileSync(path.join(out,'candidate.js'),source.replace(anchor,"createDrawnHead(actor,jawConnection(proportionNeck(roundFace(softenLowerFace(config,key),key,'balanced'),key,'balanced'),key))").replace("installHeadProportion(actor,key,'balanced');face.apply();","installHeadProportion(actor,key,'balanced');installCheekContour(actor,key);face.apply();")+helper);
const overrides={...JSON.parse(fs.readFileSync(path.join(ep,'tmp/head_proportion/balanced.json'),'utf8')),
  '/characters/bioarmor/tripo-drawn-look.js':'tmp/jaw_connection/candidate.js'};
const save=(p,v)=>fs.writeFileSync(path.join(out,p),JSON.stringify(v,null,2)+'\n');
save('candidate.json',overrides);
save('scene_trial.json',{...JSON.parse(fs.readFileSync(path.join(ep,'tmp/head_proportion/scene_trial.json'),'utf8')),...overrides});
if(!fs.existsSync(path.join(out,'baseline.json')))save('baseline.json',{
  source:path.relative(ep,sourcePath),sourceSha256:hash(sourcePath),
  mainSha256:hash(path.join(ep,'output/current.mp4')),
  previousCandidateSha256:hash(path.join(ep,'output/naturalness_candidate.mp4')),
  acceptedScope:'User accepted male eye protrusion improvement only. Both face shapes remain rejected.',
  status:'Isolated jaw/neck experiment, not a new approved character.'});
console.log(out);
