import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..'),req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const browser=await req('puppeteer').launch({headless:true});
try{for(const id of ['aoi','lei']){
 const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});await page.setViewport({width:900,height:900});
 await page.goto('http://127.0.0.1:4215/face_lab.html?actor='+id);await page.waitForFunction('window.ready',{timeout:90000});
 const out=path.join(ep,'storyboard/remake_r3/tripo_face');fs.mkdirSync(out,{recursive:true});
 const info=await page.evaluate(()=>window.renderAt());fs.writeFileSync(path.join(out,id+'_rig.json'),JSON.stringify(info,null,2));
 const points=await page.evaluate(()=>actor.skins.flatMap(o=>{const p=o.geometry.attributes.performerRest;return Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]).filter(p=>Math.abs(p[0])<.12&&p[1]>actor.height-.4&&p[2]>.03);}));
 fs.writeFileSync(path.join(out,id+'_face_points.json'),JSON.stringify(points));
 for(const [name,state] of [['neutral',{}],['blink',{blink:1}],['talk',{jaw:.8,width:1.1,smile:.5}],['gaze',{gaze:[1,.15],fear:.5}],['turn',{turn:.4,jaw:.65,blink:.3}]]){
 await page.evaluate(s=>window.renderAt(s),state);await page.screenshot({path:path.join(out,id+'_'+name+'.png')});}await page.close();
} }finally{await browser.close();}
