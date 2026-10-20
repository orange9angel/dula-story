import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),mode=process.argv[2]??'scan';
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputFiles=[...fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>path.join(root,f)),path.join(root,'script.story'),path.join(root,'config/timeline.json')];
const inputsBefore=Object.fromEntries(inputFiles.map(p=>[p,digest(p)]));
const require=createRequire(path.resolve(root,'../../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4327/longform/viewer.html?capture=1',{waitUntil:'networkidle0'});
 await page.waitForFunction('window.ready===true',{timeout:120000});
 const start=Date.now();
 if(mode==='scan'){
  const result=await page.evaluate(async()=>{
   const THREE=await import('three'),d=window.__dbg,T=d.timeline;
   const times=T.lines.map(l=>l.start+Math.min(.7,(l.audio_end-l.start)*.55));
   for(const b of T.beats)for(const a of b.actions)times.push(a.start+.5,(a.start+a.end)*.5,a.end-.1);
   for(const e of d.performance.eventTimes.impacts)for(const dt of[-1,-.3,0,.1,.5,1.3,2.3])times.push(e.time+dt);
   const rescueEnd=T.beats.find(b=>b.id==='B42').actions.at(-1).start+8;
   for(let t=d.performance.eventTimes.catch-.5;t<=rescueEnd;t+=.1)times.push(t);
   const clamps=[],blocked=[],feet=[],grips=[],ray=new THREE.Raycaster(),box=new THREE.Box3(),p=new THREE.Vector3(),q=new THREE.Vector3();
   const scanMeshes=g=>{const all=[];g.traverse(o=>{if(o.isMesh&&o.visible&&(!o.material.transparent||o.material.opacity>.5))all.push(o);});return all;};
   for(const t of times.sort((a,b)=>a-b)){
    const r=window.stepAt(t),s=d.performance.sample(t);
    for(const[name,v]of Object.entries(r.actors)){
     if(v.maxClamp>.035)clamps.push({t,beat:r.beat,name,amount:v.maxClamp});
    }
    if(r.shot.kind==='portrait'||r.shot.kind==='reaction'||r.shot.kind==='medium'){
     const name=r.shot.subject,head=d.actors[name].headGroup.getWorldPosition(q);
     ray.set(d.camera.position,head.clone().sub(d.camera.position).normalize());
     const hits=ray.intersectObjects(scanMeshes(d.stage.groups[r.scene]),false),distance=d.camera.position.distanceTo(head);
     const hit=hits.find(h=>h.distance<distance-.12);
     if(hit)blocked.push({t,beat:r.beat,name,object:hit.object.name||hit.object.geometry.type,distance:hit.distance,target:distance});
    }
    if(Math.abs(t-(s.beat.actions[0]?.start+.5))<.01){
     const meshes=scanMeshes(d.stage.groups[r.scene]);
     for(const[name,v]of Object.entries(r.actors)){
      if(s.states[name].rootY<0||s.states[name].support==='air'||s.story.jumping)continue;
      for(const side of['left','right']){
       const foot=d.actors[name].feet[side];box.setFromObject(foot,true);foot.getWorldPosition(p);
       ray.set(p.clone().add(new THREE.Vector3(0,.18,0)),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0];
       feet.push({t,beat:r.beat,name,side,sole:box.min.y,surface:hit?.point.y??null,gap:hit?box.min.y-hit.point.y:null,stance:v.feet[side].stance});
      }
     }
    }
    if(r.beat==='B42'&&t>=d.performance.eventTimes.catch&&t<d.performance.eventTimes.catch+1.5){
     const a=d.actors.xiaozao.hands.right.getWorldPosition(p),b=d.actors.weihe.hands.right.getWorldPosition(q);
     grips.push({t,wristSeparation:a.distanceTo(b)});
    }
   }
   const missingSpeakers=[];
   for(const l of T.lines){const s=d.performance.sample(l.start+Math.min(.7,(l.audio_end-l.start)*.55));if(!s.states[l.speaker]?.visible)missingSpeakers.push({id:l.id,speaker:l.speaker,scene:s.beat.scene,text:l.text});}
   return{samples:times.length,clamps,blocked,feet,grips,missingSpeakers,events:d.performance.eventTimes};
  });
  const unchanged=inputFiles.every(p=>digest(p)===inputsBefore[p]);
  const report={errors,elapsed:(Date.now()-start)/1000,sourceSha256:inputsBefore,sourceUnchanged:unchanged,scope:'Sampled reach, head-ray visibility, speaker presence and first-action foot surfaces; not full mesh collision certification.',...result};
  if(!unchanged)throw new Error('Inputs changed during audit');
  fs.writeFileSync(path.join(root,'review/runtime_audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({samples:result.samples,elapsed:report.elapsed,errors,
   clamps:result.clamps.sort((a,b)=>b.amount-a.amount).slice(0,18),clampCount:result.clamps.length,
   blocked:result.blocked.slice(0,14),blockedCount:result.blocked.length,
   groundAnomalies:result.feet.filter(f=>f.stance&&(f.gap===null||f.gap<-.03||f.gap>.035)).slice(0,18),
   gripMax:Math.max(...result.grips.map(g=>g.wristSeparation)),missingSpeakers:result.missingSpeakers}));
 }else if(mode==='audio'){
  const result=await page.evaluate(()=>{
   const d=window.__dbg,T=d.timeline,L=Object.fromEntries(T.lines.map(l=>[l.id,l])),B=Object.fromEntries(T.beats.map(b=>[b.id,b]));
   const ev=[],add=(id,time,source,gain=.20,transient=true)=>ev.push({id,time,source,gain,transient});
   for(const e of d.performance.eventTimes.impacts){
    add(e.id,e.time,e.target==='thread'?'string_snap':'armor_impact',.28);
    add(e.id+'-wind',e.time-.16,'sickle_whoosh',.10,false);
   }
   for(const [i,t]of[1.8,2.3].entries())add('opening-bell-'+i,t,'bell_tap',.15);
   add('clapper-place',B.B23.start+4.15,'buckle_click',.055);
   add('basket-lift-final',B.B16.actions.at(-1).start+.6,'chain_tension',.085,false);
   add('basket-settle-final',B.B16.actions.at(-1).start+15.5,'wood_creak',.08,false);
   add('enemy-land',B.B05.start+4,'boot_step',.13);
   add('store-door',B.B07.start+.7,'wood_creak',.11,false);
   add('bridge-strain',B.B16.start+2.5,'chain_tension',.16,false);
   add('bridge-board',B.B13.actions[2].start+2,'wood_creak',.12,false);
   add('first-petal',L.B18_05.start+.3,'blade_shield',.23);
   add('hot-pipe',B.B19.start+2,'wind_release',.15,false);
   add('slip',B.B25.start+1.8,'bridge_crack',.20);
   add('trial-gate',B.B50.start+5,'gate_grind',.14,false);
   for(const[i,t]of[B.B27.start+3,B.B27.actions[1].start+1].entries())add('belt-'+i,t,'buckle_click',.10);
   add('side-gate',L.B32_04.start+.4,'gate_grind',.18,false);
   for(const [i,t]of[L.B34_02.start+.55,L.B34_02.start+1.05,L.B34_05.start+.3,L.B34_05.start+.8].entries())add('dark-tap-'+i,t,'bell_tap',.11);
   add('bracer-release',L.B35_04.start,'buckle_click',.14);
   add('stairs-land',B.B36.start+1.3,'wood_step',.19);
   add('enemy-platform-land',B.B37.start+.48,'wood_step',.17);
   add('lamp-hook',B.B31.start+7,'buckle_click',.075);
   add('market-air-release',L.B28_01.start+2.5,'wind_release',.11,false);
   add('market-canopy-fall',L.B28_01.start+3.8,'wood_creak',.14,false);
   add('stone-net-catch',B.B15.start+1,'chain_tension',.15,false);
   add('ratchet-lock',B.B31.actions.at(-1).start+4.2,'buckle_click',.12);
   add('enemy-belay',B.B42.actions[1].start+10.4,'buckle_click',.12);
   add('third-petal',L.B37_06.start,'blade_shield',.25);
   add('main-thread-cut',L.B39_03.start,'string_snap',.24);
   for(const[i,t]of d.performance.eventTimes.waves.entries()){
    add('gate-load-'+i,t-.3,'gate_grind',.18+i*.015,false);
    add('last-petal-'+i,t+.25,'blade_shield',.25+i*.015);
   }
   add('wind-release',d.performance.eventTimes.release,'wind_release',.32,false);
   add('platform-fall',B.B41.start+2,'bridge_crack',.28);
   add('platform-clip',L.B41_05.start+1.8,'buckle_click',.16);
   add('catch',d.performance.eventTimes.catch,'cloth_pull',.25);
   add('catch-armor',d.performance.eventTimes.catch+.03,'armor_impact',.18);
   add('last-bell-1',B.END.end-5,'bell_tap',.12);add('last-bell-2',B.END.end-4.5,'bell_tap',.12);
   const previous={},lastTime={};let sampled=0;
   for(let t=0;t<T.duration;t+=1/12){
    const s=d.performance.sample(t),moving=Object.entries(s.states).some(([k,p])=>p.visible&&(p.walk||p.turn));
    if(!moving){for(const k of Object.keys(previous))delete previous[k];continue;}
    let r;try{r=window.stepAt(t);}catch(e){throw new Error(`Audio contact scan t=${t}: ${e.message}`);}sampled++;
    for(const[name,a]of Object.entries(r.actors)){
     if(!s.states[name].walk&&!s.states[name].turn)continue;
     for(const side of['left','right']){
      const key=name+'-'+side,f=a.feet[side],p=previous[key];
      if(p&&f.stance&&(!p.stance||f.contact!==p.contact)&&t-(lastTime[key]??-10)>.27){
       add('step-'+key+'-'+ev.length,t,['store','bridge','windwell'].includes(r.scene)?'wood_step':'boot_step',name==='yabo'?.10:.075);
       lastTime[key]=t;
      }
      previous[key]=f;
     }
    }
   }
   return{events:ev.sort((a,b)=>a.time-b.time),sampled,sourceStorySha256:T.source_sha256,duration:T.duration};
  });
  const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  result.sources=Object.fromEntries(['performance.js','pose.js','layout.js','script.story'].map(f=>[f,hash(path.join(root,f))]));
  fs.writeFileSync(path.join(root,'config/runtime_audio_events.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({events:result.events.length,walkFrames:result.sampled,elapsed:(Date.now()-start)/1000,errors}));
 }else if(mode==='geometry'){
  const r=await page.evaluate(async t=>{
   const d=window.__dbg,THREE=await import('three');window.stepAt(t);
   const s=d.performance.sample(t),out={};
   for(const[name,a]of Object.entries(d.actors)){
    if(!s.states[name].visible)continue;
    out[name]={dimensions:a.dimensions,scale:a.mesh.scale.toArray(),state:s.states[name],
     head:a.headGroup.getWorldPosition(new THREE.Vector3()).toArray(),
     hands:Object.fromEntries(['left','right'].map(side=>[side,a.hands[side].getWorldPosition(new THREE.Vector3()).toArray()]))};
   }
   return out;
  },Number(process.argv[3]??'813'));console.log(JSON.stringify(r));
 }else if(mode==='benchmark'){
  const r=await page.evaluate(()=>{
   const start=Date.now();for(let i=0;i<120;i++)window.renderAt(i/30);
   const simple=(Date.now()-start)/120;
   const b=window.__dbg.timeline.beats.find(b=>b.id==='B40'),second=Date.now();
   for(let i=0;i<120;i++)window.renderAt(b.start+i/30);
   return{simpleMs:simple,ensembleMs:(Date.now()-second)/120};
  });
  console.log(JSON.stringify({errors,...r}));
 }
}finally{await browser.close();}
