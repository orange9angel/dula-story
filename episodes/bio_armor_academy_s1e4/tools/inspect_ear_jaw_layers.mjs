// Read-only visibility diagnosis of the delivered candidate; no asset edits.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const ep=path.resolve(import.meta.dirname,'..'),out=path.join(ep,'tmp/jaw_connection/diagnosis');
fs.mkdirSync(out,{recursive:true});
const req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const verified=JSON.parse(fs.readFileSync(path.join(ep,'storyboard/naturalness_trial/verification.json'),'utf8'));
const overrides=Object.entries(verified.inputOverrides).filter(([s])=>s.endsWith('.js')).map(([suffix,v])=>{
  const body=fs.readFileSync(path.join(ep,v.file),'utf8');if(sha(body)!==v.sha256)throw new Error('Delivered source changed');
  return {suffix,...v,body};
});
const report={scope:'Layer visibility only; not a revised character',overrides:overrides.map(({body,...v})=>v),frames:{},errors:[]};
const browser=await req('puppeteer').launch({headless:true});
try{
  const page=await browser.newPage();await page.setViewport({width:900,height:900});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>{
    const o=overrides.find(v=>new URL(r.url()).pathname.endsWith(v.suffix));
    if(o)r.respond({status:200,contentType:'text/javascript',body:o.body});else r.continue();
  });
  for(const actorId of ['lei','aoi']){
    await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actorId}&cel=direct`);
    await page.waitForFunction('window.ready===true');
    for(const layer of ['full','no_hair','no_neck','ears_only']){
      const result=await page.evaluate(({layer,actorId})=>{
        if(!window.visibilityBaseline){window.visibilityBaseline=new Map();scene.traverse(o=>window.visibilityBaseline.set(o,o.visible));}
        for(const [o,v] of window.visibilityBaseline)o.visible=v;
        const ears=new Set([face.root.children[2],face.root.children[4]]);
        scene.traverse(o=>{
          if(layer==='no_hair'&&(o.userData.kind==='painted curved hair shell with thickness'||o.userData.tail))o.visible=false;
          if(layer==='no_neck'&&['drawn-continuous-neck','drawn-neck-outline'].includes(o.name))o.visible=false;
          if(layer==='ears_only'&&o.isMesh)o.visible=ears.has(o);
        });
        renderAt({turn:(actorId==='lei'?1:-1)*Math.PI/2});
        return {image:renderer.domElement.toDataURL('image/png').split(',')[1],ears:[...ears].map(e=>({position:e.position.toArray(),scale:e.scale.toArray(),vertices:e.geometry.attributes.position.count}))};
      },{layer,actorId});
      const bytes=Buffer.from(result.image,'base64'),name=`${actorId}_${layer}.png`;
      fs.writeFileSync(path.join(out,name),bytes);report.frames[name]={sha256:sha(bytes),ears:result.ears};
    }
  }
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'layers.json'),JSON.stringify(report,null,2)+'\n');
if(report.errors.length)throw new Error(report.errors.join('\n'));
console.log('Captured full / no-hair / no-neck / ears-only views for both characters.');
