// Controlled raster comparison; same scene, poses, camera, output size and times.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const root=path.join(ep,'tmp/edge_stability');fs.mkdirSync(root,{recursive:true});
const variants=[
  ['legacy','aa=legacy&ssaa=1&capture-format=jpeg'],
  ['lossless','aa=legacy&ssaa=1&capture-format=png'],
  ['coverage','aa=coverage&ssaa=1&capture-format=png'],
  ['supersample','aa=legacy&ssaa=2&capture-format=png'],
  ['stable','aa=stable&ssaa=2&capture-format=png'],
  ['coverage2x','aa=coverage&ssaa=2&capture-format=png'],
  ['reference','aa=legacy&ssaa=4&capture-format=png'],
];
const requested=process.argv[2];
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [name,query] of variants.filter(v=>!requested||v[0]===requested)){
  const out=path.join(root,name);fs.mkdirSync(out,{recursive:true});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4215/viewer.html?capture=1&'+query,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction('window.ready===true',{timeout:120000});
  const profile=await page.evaluate(()=>({profile:window.renderProfile,gl:window.renderer.getContext().getContextAttributes(),
   alphaMaterials:(()=>{const a=[];window.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.alphaTest>0)a.push({object:o.name,test:m.alphaTest,coverage:m.alphaToCoverage});});return a;})()}));
  const ext=profile.profile.imageFormat==='png'?'png':'jpg',states=[];
  for(let i=0;i<30;i++){
   const t=(624+i)/30,r=await page.evaluate(t=>window.renderAt(t),t);
   fs.writeFileSync(path.join(out,`${String(i).padStart(3,'0')}.${ext}`),Buffer.from(r.image,'base64'));states.push(r.state);
  }
  // Fixed time repeat isolates random/time-driven changes from moving edges.
  const repeats=[];for(let i=0;i<3;i++){
   const r=await page.evaluate(()=>window.renderAt(21));repeats.push(r.image);
   fs.writeFileSync(path.join(out,`repeat_${i}.${ext}`),Buffer.from(r.image,'base64'));
  }
  profile.repeatStable=repeats.every(x=>x===repeats[0]);profile.errors=errors;
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(profile,null,2));
  fs.writeFileSync(path.join(out,'states.json'),JSON.stringify(states));
  console.log(JSON.stringify({name,...profile.profile,repeatStable:profile.repeatStable,alphaMaterials:profile.alphaMaterials.length,errors}));
  await page.close();
 }
}finally{await browser.close();}
