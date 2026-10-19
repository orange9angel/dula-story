import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r25';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];for(const q of ['&arms=0&portrait=0&singleShoulder=0&ornament=0&kneefix=0&cinema=0','']){const p=await browser.newPage();await p.goto('http://127.0.0.1:4235/viewer.html?capture=1'+q);await p.waitForFunction('window.ready');pages.push(p);}
 const evaluate=async p=>p.evaluate(async()=>{
  const T=await import('three'),{actors}=window.__dbg;let maxKneeToeAngle=0,minKneeForward=1,nonfinite=0,shoulderErrors=0,samples=0;
  const at=[];
  for(let f=0;f<1065;f++){
   const t=f/5,trace=window.stepAt(t),a=actors.aoao;
   for(const side of ['left','right']){
    const [h,k,e]=trace.legs.aoao[side].map(p=>new T.Vector3(...p)),axis=e.clone().sub(h).normalize(),bend=k.clone().sub(h);bend.addScaledVector(axis,-bend.dot(axis)).normalize();
    const q=a.feet[side].quaternion,forward=new T.Vector3(0,0,1).applyQuaternion(q);forward.addScaledVector(axis,-forward.dot(axis)).normalize();
    const dot=T.MathUtils.clamp(bend.dot(forward),-1,1);minKneeForward=Math.min(dot,minKneeForward);maxKneeToeAngle=Math.max(maxKneeToeAngle,Math.acos(dot)*180/Math.PI);samples++;
   }
   for(const a of Object.values(actors))for(const side of ['left','right'])if(a.pauldronGroups.filter(pd=>pd.side===side&&pd.g.visible).length!==1)shoulderErrors++;
   if(f%50===0){for(const a of Object.values(actors)){
    const objects=[a.face.skull,...(a.palacePortrait?.hair.children??[]),a.limbs.leftArm.mesh,a.limbs.rightArm.mesh];
    for(const m of objects){if(!m.geometry)continue;for(const v of m.geometry.attributes.position.array)if(!Number.isFinite(v))nonfinite++;for(const v of m.matrixWorld.elements)if(!Number.isFinite(v))nonfinite++;}
   }}
  }
  const hash=ctx=>{const arr=ctx.getImageData(0,600,1024,424).data;let h=2166136261;for(const v of arr)h=Math.imul(h^v,16777619);return (h>>>0).toString(16);};
  const times=[8.5,9.2,34.5,60.2,65.6,70.5,92,107,114,134,156,157,164.5,165.8,166.2,179,185,201];
  for(const t of times){const trace=window.stepAt(t);at.push({t,mouth:Object.fromEntries(Object.entries(actors).map(([name,a])=>[name,hash(a.face.skull.material.map.image.getContext('2d'))])),arms:trace.arms});}
  const materials=Object.fromEntries(Object.entries(actors).map(([n,a])=>[n,a.ornamentMetal?.records.length??0]));
  return {samples,maxKneeToeAngle,minKneeForward,nonfinite,shoulderErrors,at,materials};
 });
 const results=await Promise.all(pages.map(evaluate)),[old,current]=results;let mouthMismatch=0,maxArmVectorError=0;
 for(let i=0;i<old.at.length;i++)for(const name of ['aoao','yekari']){
  if(old.at[i].mouth[name]!==current.at[i].mouth[name])mouthMismatch++;
  for(const side of ['left','right'])for(let j=0;j<2;j++)for(let c=0;c<3;c++)maxArmVectorError=Math.max(maxArmVectorError,Math.abs((old.at[i].arms[name][side][j+1][c]-old.at[i].arms[name][side][j][c])-(current.at[i].arms[name][side][j+1][c]-current.at[i].arms[name][side][j][c])));
 }
 const seek=[];for(const t of [9,60.2,107,157,165.8]){await pages[1].evaluate(t=>window.stepAt(t-.1),t);const a=await pages[1].evaluate(t=>window.renderAt(t).image,t);await pages[1].evaluate(()=>window.stepAt(198));const b=await pages[1].evaluate(t=>window.renderAt(t).image,t);seek.push({t,equal:a===b,sha256:createHash('sha256').update(a).digest('hex')});}
 const report={passed:current.nonfinite===0&&current.shoulderErrors===0&&mouthMismatch===0&&maxArmVectorError<1e-6&&current.maxKneeToeAngle<40&&current.minKneeForward>0&&seek.every(s=>s.equal),knee:{samples:current.samples,priorMaxDegrees:old.maxKneeToeAngle,currentMaxDegrees:current.maxKneeToeAngle,minForwardDot:current.minKneeForward},face:{samples:old.at.length*2,lowerFaceTextureMismatches:mouthMismatch},nonfinite:current.nonfinite,singleShoulderErrors:current.shoulderErrors,maxArmVectorError,materials:current.materials,seek,limits:'5 Hz knee/toe orientation, 18 lower-face samples, selected finite geometry and JPEG seek checks. Does not establish aesthetic approval or whole-body self-collision.'};
 fs.writeFileSync(`${board}/portrait_checks.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
