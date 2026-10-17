// Isolated whole-head proportion study, starting from the delivered round-face trial.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const ep=path.resolve(import.meta.dirname,'..'),out=path.join(ep,'tmp/head_proportion');
fs.mkdirSync(out,{recursive:true});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const prior=JSON.parse(fs.readFileSync(path.join(ep,'tmp/round_face/review.json'),'utf8'));
const sourceFile=path.join(ep,'tmp/round_face/tripo-balanced.js'),source=fs.readFileSync(sourceFile,'utf8');
if(sha(sourceFile)!==prior.inputOverrides['/characters/bioarmor/tripo-drawn-look.js'].sha256)throw new Error('Previous trial changed');
const write=(name,data)=>fs.writeFileSync(path.join(out,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
const functions=`
function proportionSettings(key,variant){
  const male=key==='lei';
  return {depth:male?.76:.82,upper:variant!=='depth'?(male?.90:.96):1,anchor:male?1.620:1.495};
}
function proportionNeck(config,key,variant){
  const c={...config},settings=proportionSettings(key,variant),rings=config.neckProfile;
  c.neckProfile=rings.map(([y,w,f,b],i)=>{const t=i/(rings.length-1),s=1-(1-settings.depth)*t*t*(3-2*t);return [y,w,f*s,b*s];});
  if(variant==='orbit')c.eyeSurface={...config.eyeSurface,recess:key==='lei'?.006:.003};
  return c;
}
function installHeadProportion(actor,key,variant){
  const settings=proportionSettings(key,variant),seen=new WeakSet(),materials=new WeakSet();
  const reset=actor.reset;
  actor.reset=function(...args){
    const value=reset.apply(this,args);
    // Hair finishes loading after the face. Discover each new group once.
    const roots=[];
    this.mesh.traverse(o=>{if(o.name==='drawn-head'||o.userData.kind==='painted curved hair shell with thickness')roots.push(o);});
    for(const root of roots)root.traverse(mesh=>{
      if(!mesh.isMesh||seen.has(mesh))return;seen.add(mesh);
      // Ear spheres are object-local; all other authored face/hair vertices are
      // in the original metre frame. Keep the ear chart and attachment together.
      if(mesh.geometry.type==='SphereGeometry'){
        mesh.position.z*=settings.depth;mesh.scale.z*=settings.depth;return;
      }
      for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])){
        if(materials.has(material))continue;materials.add(material);
        const previous=material.onBeforeCompile,cache=material.customProgramCacheKey();
        material.onBeforeCompile=function(shader,renderer){
          previous.call(this,shader,renderer);
          // One static shape transform after existing authored jaw/hair sculpts.
          // Camera angle does not select a new face and the UVs remain attached.
          shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
            'transformed.z*='+settings.depth.toFixed(6)+';\\n'+
            'transformed.y-=max(0.0,transformed.y-'+settings.anchor.toFixed(6)+')*'+(1-settings.upper).toFixed(6)+';\\n#include <project_vertex>');
        };
        material.customProgramCacheKey=()=>cache+'|head-proportion|'+JSON.stringify(settings);material.needsUpdate=true;
      }
    });
    return value;
  };
}
`;
for(const variant of ['depth','balanced','orbit']){
  const needle="createDrawnHead(actor,roundFace(softenLowerFace(config,key),key,'balanced'))";
  if(!source.includes(needle))throw new Error('Previous callsite changed');
  const candidate=source.replace(needle,`createDrawnHead(actor,proportionNeck(roundFace(softenLowerFace(config,key),key,'balanced'),key,'${variant}'))`)
    .replace('seatHead(actor,key);face.apply();',`seatHead(actor,key);installHeadProportion(actor,key,'${variant}');face.apply();`)+functions;
  write(variant+'.js',candidate);
  const overrides={...JSON.parse(fs.readFileSync(path.join(ep,'tmp/round_face/balanced.json'),'utf8')),
    '/characters/bioarmor/tripo-drawn-look.js':'tmp/head_proportion/'+variant+'.js'};
  write(variant+'.json',overrides);
  write('scene_'+variant+'.json',{...JSON.parse(fs.readFileSync(path.join(ep,'tmp/round_face/scene_trial.json'),'utf8')),...overrides});
  if(variant==='balanced')write('scene_trial.json',{...JSON.parse(fs.readFileSync(path.join(ep,'tmp/round_face/scene_trial.json'),'utf8')),...overrides});
}
if(!fs.existsSync(path.join(out,'baseline.json')))write('baseline.json',{
  files:Object.fromEntries([sourceFile,path.join(ep,'output/naturalness_candidate.mp4'),path.join(ep,'output/current.mp4')].map(p=>[p,sha(p)])),
  status:'Prior round-face trial rejected at oblique angles; male and female head depth/face height relationship under review.'});
console.log(out);
