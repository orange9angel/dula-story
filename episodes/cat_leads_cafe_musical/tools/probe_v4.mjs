import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),puppeteer=require('puppeteer');
const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});try{const p=await b.newPage();await p.goto('http://127.0.0.1:4235/craft3d/viewer.html?full=1&capture=1');await p.waitForFunction('window.ready');
 console.log(JSON.stringify(await p.evaluate(async()=>{const THREE=await import('three');window.renderAt(.7);return Object.fromEntries(Object.entries(window.actors).map(([k,a])=>[k,Object.fromEntries(['hips','leftupleg','leftleg','leftfoot','lefthand','righthand'].map(n=>[n,a.body.bones[n].getWorldPosition(new THREE.Vector3()).toArray()]))]));})));
 const d='storyboard/face_v4';fs.mkdirSync(d,{recursive:true});
 for(const [tag,t] of [['open',.7],['girl',4.0],['boy',8],['tap',12.65],['rise',18.7],['turn',40.066667],['dance',42.5],['coda',100]]){const r=await p.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(path.join(d,tag+'.jpg'),Buffer.from(r.image,'base64'));}
}finally{await b.close();}
