import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..'),req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const out=path.join(ep,'storyboard/hybrid_character/look');fs.mkdirSync(out,{recursive:true});
const browser=await req('puppeteer').launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:1280,height:720});
 for(const mode of ['original','toon','painted','graphic']){
  await page.goto('http://127.0.0.1:4215/viewer.html?capture=1'+(mode==='original'?'':'&cel='+mode));
  await page.waitForFunction('window.ready',{timeout:90000});
  const specs=[['front',[.60,1.48,1.10,.60,1.48,0,35]],['threequarter',[1.35,1.50,.90,.60,1.48,0,35]],['half',[.60,1.35,1.8,.60,1.30,0,38]],['scene',null]];
  for(const [name,c] of specs){
   const r=await page.evaluate((c)=>{window.setFreeCamera(c?{pos:c.slice(0,3),lookAt:c.slice(3,6),fov:c[6]}:null);return window.renderAt(12.8);},c);
   fs.writeFileSync(path.join(out,mode+'_'+name+'.jpg'),Buffer.from(r.image,'base64'));
  }
  console.log(mode,await page.evaluate(()=>Object.fromEntries(Object.entries(actors).map(([k,a])=>[k,a.celLook??null]))));
 }
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
