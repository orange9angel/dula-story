import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r26';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];for(const q of ['&shaded=0&unified=0&combustion=0&volcano=0&orbs=1&connectedHip=0&hearthParticles=0','']){const p=await browser.newPage();p.on('pageerror',e=>{throw e;});await p.goto('http://127.0.0.1:4236/viewer.html?capture=1'+q);await p.waitForFunction('window.ready');pages.push(p);}
 const probe=async p=>p.evaluate(()=>{
  const {actors,scene,fx}=window.__dbg;const at=[];let nonfinite=0,glowVisible=0,crownVisible=0,oldShoulders=0,geometrySamples=0;
  const hash=ctx=>{const arr=ctx.getImageData(0,700,1024,324).data;let h=2166136261;for(const v of arr)h=Math.imul(h^v,16777619);return(h>>>0).toString(16);};
  for(let f=0;f<1065;f++){
   const t=f/5,s=window.stepAt(t);
   for(const a of Object.values(actors)){
    for(const m of a.reflectiveClad?.hidden??[])glowVisible+=m.visible?1:0;
    for(const m of a.shadedPortrait?.crown??[])crownVisible+=m.visible?1:0;
    if(a.cuirass?.integratedShoulders)oldShoulders+=a.pauldronGroups.filter(p=>p.g.visible).length;
    if(f%50===0)for(const m of [a.face.skull,a.anatomy.pelvis,a.cuirass.shell,...(a.shadedPortrait?.hair.children??[])]){
     if(!m.geometry)continue;geometrySamples++;for(const v of m.geometry.attributes.position.array)if(!Number.isFinite(v))nonfinite++;
    }
   }
   if(f%15===0)at.push({t,arms:s.arms,legs:s.legs,mouth:Object.fromEntries(Object.entries(actors).map(([n,a])=>[n,hash(a.face.skull.material.map.image.getContext('2d'))]))});
  }
  let torusEffects=0;for(const g of [fx.aura?.group,fx.arcGroup,fx.beamGroup,...fx.impacts.map(i=>i.group)])g?.traverse(o=>{if(o.geometry?.type==='TorusGeometry')torusEffects++;});
  const topology={};for(const [name,a]of Object.entries(actors))if(a.anatomy.connected){const g=a.anatomy.pelvis.geometry,edges=new Map();for(let i=0;i<g.index.count;i+=3){const t=[0,1,2].map(j=>g.index.getX(i+j));for(let j=0;j<3;j++){const x=t[j],y=t[(j+1)%3],k=x<y?x+':'+y:y+':'+x;edges.set(k,(edges.get(k)??0)+1);}}topology[name]={vertices:g.attributes.position.count,triangles:g.index.count/3,unpairedEdges:[...edges.values()].filter(n=>n!==2).length};}
  return {at,nonfinite,glowVisible,crownVisible,oldShoulders,geometrySamples,torusEffects,topology,sceneDiamondVisible:scene.heart.visible||scene.embers.some(m=>m.visible)};
 });
 const [old,current]=await Promise.all(pages.map(probe));let mouthMismatch=0,maxJointError=0;
 for(let i=0;i<old.at.length;i++)for(const who of ['aoao','yekari']){
  if(old.at[i].mouth[who]!==current.at[i].mouth[who])mouthMismatch++;
  for(const limb of ['arms','legs'])for(const side of ['left','right'])for(let j=0;j<3;j++)for(let c=0;c<3;c++)maxJointError=Math.max(maxJointError,Math.abs(old.at[i][limb][who][side][j][c]-current.at[i][limb][who][side][j][c]));
 }
 const seek=[];for(const t of [9,58.1,60.3,152.4,165.8,171.1]){await pages[1].evaluate(t=>window.stepAt(t-.1),t);const a=await pages[1].evaluate(t=>window.renderAt(t).image,t);await pages[1].evaluate(()=>window.stepAt(198));const b=await pages[1].evaluate(t=>window.renderAt(t).image,t);
  const pixels=await pages[1].evaluate(async([a,b])=>{const arrays=[];for(const src of [a,b]){const image=new Image();image.src='data:image/jpeg;base64,'+src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);arrays.push(ctx.getImageData(0,0,c.width,c.height).data);}let sum=0,large=0,max=0;for(let i=0;i<arrays[0].length;i++){if(i%4===3)continue;const d=Math.abs(arrays[0][i]-arrays[1][i]);sum+=d;max=Math.max(max,d);if(d>8)large++;}return{meanError:sum/(arrays[0].length*.75),maxError:max,largeFraction:large/(arrays[0].length*.75)};},[a,b]);
  seek.push({t,equal:a===b,...pixels,passed:pixels.meanError<.01&&pixels.largeFraction<.00001,sha256:createHash('sha256').update(a).digest('hex')});}
 delete current.at;
 const report={passed:!current.nonfinite&&!current.glowVisible&&!current.crownVisible&&!current.oldShoulders&&!current.torusEffects&&!current.sceneDiamondVisible&&Object.values(current.topology).every(t=>t.unpairedEdges===0)&&mouthMismatch===0&&maxJointError<1e-6&&seek.every(s=>s.passed),...current,mouthSamples:old.at.length*2,mouthMismatch,maxJointError,seek,limits:'5 Hz state/geometry checks; sampled lip pixels and seek. Existing baseline has sub-pixel JPEG variation at 60.3/152.4s; seek uses decoded error <0.01 and RGB changes >8 below 0.001%. Whole-film stage clearance is separate. Not aesthetic approval or whole-body self-collision.'};
 fs.writeFileSync(`${board}/revision_checks.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
