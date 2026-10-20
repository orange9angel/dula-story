import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');
const args=process.argv.slice(2),mode=args[0]??'coverage',out=path.join(root,'review',args[1]??'runtime_r1');
const timeline=JSON.parse(fs.readFileSync(path.join(root,'config/timeline.json'))),byId=Object.fromEntries(timeline.beats.map(b=>[b.id,b]));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720});
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.stack);});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());if(errors.length<8)console.log('CONSOLE',m.text());}});
 await page.goto('http://127.0.0.1:4327/longform/viewer.html?capture=1',{waitUntil:'networkidle0'});
 await page.waitForFunction('window.ready===true',{timeout:120000});fs.mkdirSync(out,{recursive:true});
 let shots=[];
 if(mode==='coverage'){
  for(const id of ['B01','B02','B03','B05','B07','B09','B13','B49','B14','B20','B21','B27','B31','B40','B42','B43','B48']){
   const b=byId[id],line=timeline.lines.find(l=>l.beat===id);
   shots.push({name:id+'_wide',t:b.start+1.5},{name:id+'_face',t:line.start+1});
  }
 }else if(mode==='contacts'){
  const ev=await page.evaluate(()=>window.__dbg.performance.eventTimes);
  for(const e of ev.impacts)for(const d of[-.25,0,.15,.65])shots.push({name:e.id+'_'+String(d).replace('.','p'),t:e.time+d});
  for(const d of[-.5,0,.3,.7,1.05,1.4,2.5])shots.push({name:'catch_'+String(d).replace('.','p'),t:ev.jump+d});
 }else if(mode==='catch-camera'){
  const e=await page.evaluate(()=>window.__dbg.performance.eventTimes);
  for(const[i,pos]of[[3.2,2.2,.2],[2.9,2.3,3.5],[-3.0,2.1,.3],[0,2.4,-.1]].entries())shots.push({name:'catch_angle_'+i,t:e.catch+.18,free:{pos,lookAt:[-.02,1.65,1.25],fov:42}});
 }else if(mode==='hair-debug'){
  const l=timeline.lines.find(l=>l.speaker==='mideng');shots=[{name:'mint_debug',t:l.start+1}];
  console.log(await page.evaluate(t=>{
   window.__dbg.draw(t,false);const a=window.__dbg.actors.mideng,head=a.headGroup;
   const data={head:head.position.toArray(),parts:[]};
   for(const name of ['mint-fringe-root-bridge','mint-temple-closure','mint-diagonal-fringe']){
    const o=head.getObjectByName(name);o.geometry.computeBoundingBox();data.parts.push({name,visible:o.visible,position:o.position.toArray(),box:[o.geometry.boundingBox.min.toArray(),o.geometry.boundingBox.max.toArray()]});o.material.color.set('#ff00ff');
   }
   const p=a.face.skull.geometry.attributes.position,v=window.__dbg.camera.position.clone(),hits=[];
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);a.face.skull.localToWorld(v);head.worldToLocal(v);if(Math.abs(v.x-.05)<.025&&Math.abs(v.y-.23)<.04)hits.push(v.toArray());}
   data.skin=hits;return data;
  },l.start+1));
 }else if(mode==='hair'){
  for(const name of['xiaozao','jianwang','weihe','yabo','mideng']){
   const line=timeline.lines.find(l=>l.speaker===name),t=line.start+.8;
   for(const yaw of[-1.2,0,1.2]){
    shots.push({name:`${name}_${yaw}`,t,headCamera:{name,yaw}});
   }
  }
 }else if(mode==='beat'){for(const id of args.slice(2)){const b=byId[id];for(const dt of[1,4,8,(b.end-b.start)*.55,b.end-b.start-2])shots.push({name:`${id}_${dt.toFixed(1)}`,t:b.start+dt});}}
 else if(mode==='times'){for(const spec of args.slice(2)){const [name,time]=spec.split(':');shots.push({name,t:Number(time)});}}
 const traces=[];
 for(const s of shots){
  await page.evaluate(()=>window.setFreeCamera(null));
  if(s.free)await page.evaluate(c=>window.setFreeCamera(c),s.free);
  if(s.headCamera)await page.evaluate(({t,c})=>{
   const d=window.__dbg;d.draw(t,false);
   const p=d.actors[c.name].headGroup.getWorldPosition(d.camera.position.clone());
   window.setFreeCamera({pos:[p.x+Math.sin(c.yaw)*1.25,p.y+.04,p.z+Math.cos(c.yaw)*1.25],lookAt:[p.x,p.y+.035,p.z],fov:29});
  },{t:s.t,c:s.headCamera});
  const r=await page.evaluate(t=>window.renderAt(t),s.t);fs.writeFileSync(path.join(out,s.name+'.jpg'),Buffer.from(r.image,'base64'));
  traces.push({name:s.name,...r.state});
 }
 const extra=await page.evaluate(()=>({duration:window.duration,renderInfo:window.__dbg.renderer.info.render,events:window.__dbg.performance.eventTimes}));
 fs.writeFileSync(path.join(out,'trace.json'),JSON.stringify({errors,shots:traces,...extra},null,2));
 console.log(JSON.stringify({frames:shots.length,out,errors,...extra}));
}finally{await browser.close();}
