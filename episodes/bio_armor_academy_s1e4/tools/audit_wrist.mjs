import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..');
const req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const args=process.argv.slice(2),tag=args[0]??'baseline',query=args[1]??'';
const out=path.join(ep,'storyboard/hybrid_character',tag);fs.mkdirSync(out,{recursive:true});
const browser=await req('puppeteer').launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1280,height:720});
 await page.goto('http://127.0.0.1:4215/viewer.html?capture=1'+query);
 await page.waitForFunction('window.ready',{timeout:90000});
 const report=await page.evaluate(async()=>{
  const T=await import('three'),v=()=>new T.Vector3(),q=()=>new T.Quaternion(),deg=180/Math.PI;
  const summary={},frames=[],neutral={};
  for(const [id,a] of Object.entries(window.actors)){
   neutral[id]=Object.fromEntries(Object.entries(a.neutral).filter(([n])=>/forearm|hand/.test(n)).map(([n,p])=>[n,p.toArray()]));
   for(const side of ['left','right'])summary[id+'_'+side]={maxBend:0,maxLocalRotation:0,maxStep:0,maxWorldStep:0,worst:[],previous:null,previousWorld:null};
  }
  for(let frame=0;frame<window.duration*30;frame++){
   const t=frame/30,state=window.stepAt(t),row={t,entry:state.entry,hands:{}};
   for(const [id,a] of Object.entries(window.actors))for(const side of ['left','right']){
    const key=id+'_'+side,b=a.bones,hand=b[side+'hand'];
    const fore=hand.getWorldPosition(v()).sub(b[side+'forearm'].getWorldPosition(v())).normalize();
    const palm=b[side+'handmiddle1'].getWorldPosition(v()).sub(hand.getWorldPosition(v())).normalize();
    const bend=fore.angleTo(palm)*deg,rest=a.rest.find(([bone])=>bone===hand)[2];
    const local=hand.quaternion.clone(),angle=local.angleTo(rest)*deg,record=summary[key];
    const step=record.previous?local.angleTo(new T.Quaternion(...record.previous))*deg:0;record.previous=local.toArray();
    const world=hand.getWorldQuaternion(q()),worldStep=record.previousWorld?world.angleTo(new T.Quaternion(...record.previousWorld))*deg:0;record.previousWorld=world.toArray();
    record.maxWorldStep=Math.max(record.maxWorldStep,worldStep);
    record.maxBend=Math.max(record.maxBend,bend);record.maxLocalRotation=Math.max(record.maxLocalRotation,angle);record.maxStep=Math.max(record.maxStep,step);
    row.hands[key]={bend,angle,step,worldStep,fore:fore.toArray(),intent:a.handIntents?.[side]};
    record.worst.push({t,entry:state.entry,bend,angle,step});
   }frames.push(row);
  }
  for(const r of Object.values(summary)){r.worst.sort((a,b)=>b.bend-a.bend);r.worst=r.worst.slice(0,5);delete r.previous;delete r.previousWorld;}
  return {fps:30,frames,summary,neutral};
 });
 fs.writeFileSync(path.join(out,'wrist_audit.json'),JSON.stringify(report));
 for(const t of [17,22,26,33,37,59.2,65.067,67.2,71.5]){
  const result=await page.evaluate(t=>window.renderAt(t),t);
  fs.writeFileSync(path.join(out,`t${t}.jpg`),Buffer.from(result.image,'base64'));
 }
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify(report.summary,null,2));
}finally{await browser.close();}
