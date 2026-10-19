import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r26';
const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const p=await b.newPage();p.on('pageerror',e=>{throw e;});await p.goto('http://127.0.0.1:4236/viewer.html?capture=1');await p.waitForFunction('window.ready');
 const report=await p.evaluate(()=>{
  window.setFreeCamera({pos:[-6,2.2,5.8],lookAt:[-17,2,-15],fov:48});window.renderAt(3);
  const {scene,camera,renderer,livingCaldera}=window.__dbg,c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d'),samples=[];
  for(const t of [3,15]){livingCaldera.update(t);renderer.render(scene.scene,camera);g.drawImage(renderer.domElement,0,0);samples.push({t,image:c.toDataURL('image/png').split(',')[1],pixels:g.getImageData(0,0,1280,720).data});}
  let changed=0,sum=0,max=0;for(let i=0;i<samples[0].pixels.length;i++){if(i%4===3)continue;const d=Math.abs(samples[0].pixels[i]-samples[1].pixels[i]);if(d>2)changed++;sum+=d;max=Math.max(max,d);}
  return {meanChange:sum/(1280*720*3),channelsChanged:changed,maxChange:max,frames:samples.map(({t,image})=>({t,image}))};
 });
 for(const f of report.frames){fs.writeFileSync(`${board}/caldera_${f.t}.png`,Buffer.from(f.image,'base64'));delete f.image;}
 report.passed=report.channelsChanged>100;report.scope='Same scene, camera, actor and fire time. Only backdrop clock changes. Pixel change proves motion, not aesthetic quality.';
 fs.writeFileSync(`${board}/atmosphere_checks.json`,JSON.stringify(report,null,2));
 await p.evaluate(()=>window.setFreeCamera({pos:[-2.7,1.28,1.4],lookAt:[-2.7,1.35,-1.0],fov:38}));
 for(const t of [9,9.2,9.4,9.6]){const r=await p.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(`${board}/hearth_${t}.jpg`,Buffer.from(r.image,'base64'));}
 console.log(JSON.stringify(report));
}finally{await b.close();}
