import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r24';fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const p=await browser.newPage();await p.goto('http://127.0.0.1:4235/viewer.html?capture=1');await p.waitForFunction('window.ready');
 const report=await p.evaluate(async()=>{
  const T=await import('three'),{actors}=window.__dbg;window.stepAt(29);const shells=[],geometry={},wrists=[],floor=[];
  function closed(m){const g=m.geometry,p=g.attributes.position,ix=g.index.array,edges=new Map(),point=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');for(let i=0;i<ix.length;i+=3)for(let j=0;j<3;j++){const a=point(ix[i+j]),b=point(ix[i+(j+1)%3]);if(a===b)continue;const key=a<b?a+'|'+b:b+'|'+a;edges.set(key,(edges.get(key)??0)+1);}return{name:m.name,nonManifoldEdges:[...edges.values()].filter(n=>n!==2).length,finite:[...p.array].every(Number.isFinite),opaque:!m.material.transparent&&m.material.opacity===1,frontSide:m.material.side===T.FrontSide};}
  for(const [name,a] of Object.entries(actors)){
   const targets=[a.cuirass.shell,a.lowerClad.belt,a.lowerClad.buckle,...Object.values(a.lowerClad.legs).flatMap(r=>[r.shell,r.instep,r.ankle]),...Object.values(a.gauntlets).flatMap(r=>[r.bracer,r.palm])];shells.push(...targets.map(closed));
   geometry[name]=Object.fromEntries(['chest','belt','gauntlet','greave','boot'].map((key,i)=>{const m=[a.cuirass.shell,a.lowerClad.buckle,a.gauntlets.right.bracer,a.lowerClad.legs.right.shell,a.lowerClad.legs.right.instep][i];return[key,Array.from(m.geometry.attributes.position.array)];}));
  }
  for(let t=0;t<213;t+=.2){const s=window.stepAt(t);for(const [name,a] of Object.entries(actors)){
   for(const side of ['left','right']){
    const chain=s.arms[name][side],axis=new T.Vector3(...chain[2]).sub(new T.Vector3(...chain[1])).normalize(),actual=new T.Vector3(1,0,0).applyQuaternion(a.hands[side].quaternion);wrists.push(axis.angleTo(actual));
    let soleMin=Infinity,armorMin=Infinity;const v=new T.Vector3();for(const c of a.feet[side].children.filter(c=>c.isMesh&&c.material.side!==T.BackSide)){const p=c.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(c.matrixWorld);soleMin=Math.min(soleMin,v.y);}}
    a.lowerClad.legs[side].boot.traverse(c=>{if(!c.isMesh)return;const p=c.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(c.matrixWorld);armorMin=Math.min(armorMin,v.y);}});floor.push({t,name,side,clearance:armorMin-soleMin});
   }
  }}
  window.stepAt(157);const thumb=new T.Vector3(0,1,0).applyQuaternion(actors.yekari.hands.right.quaternion);
  return{shells,geometry,maxWristAxisError:Math.max(...wrists),wristSamples:wrists.length,enemyRightThumbAt157:thumb.toArray(),bootFloor:{samples:floor.length,worst:floor.reduce((a,b)=>a.clearance<b.clearance?a:b)}};
 });
 report.geometry=Object.fromEntries(Object.entries(report.geometry).map(([name,parts])=>[name,Object.fromEntries(Object.entries(parts).map(([key,v])=>[key,createHash('sha256').update(JSON.stringify(v)).digest('hex')]))]));
 const pixel=[];for(const t of [9,23.1,152.4,157]){const r=await p.evaluate(t=>window.renderAt(t).image,t);pixel.push({t,sha256:createHash('sha256').update(r).digest('hex')});}for(const check of [...pixel].reverse()){const r=await p.evaluate(t=>window.renderAt(t).image,check.t);check.seekEqual=createHash('sha256').update(r).digest('hex')===check.sha256;}
 report.pixelSeek=pixel;
 const negative=await browser.newPage();await negative.goto('http://127.0.0.1:4235/viewer.html?capture=1&footfix=0&jointfix=0&probe-stage=1');await negative.waitForFunction('window.ready');report.negativeFootFixture=await negative.evaluate(()=>window.stepAt(9).footBlock);
 report.negativeRightThumbAt157=await negative.evaluate(async()=>{const T=await import('three');window.stepAt(157);return new T.Vector3(0,1,0).applyQuaternion(window.__dbg.actors.yekari.hands.right.quaternion).toArray();});
 report.passed=report.shells.every(s=>s.finite&&s.opaque&&s.frontSide&&s.nonManifoldEdges===0)&&report.maxWristAxisError<1e-6&&report.enemyRightThumbAt157[1]>0&&report.negativeRightThumbAt157[1]<0&&report.bootFloor.worst.clearance>-.001&&pixel.every(c=>c.seekEqual)&&report.negativeFootFixture.collisions.length>0;
 report.limits='Closed equipment topology, 5Hz wrist axis and boot-vs-sole; actual 60Hz environment/lock coverage is in palace_checks. Does not prove all self-collision or artistic acceptance.';
 fs.writeFileSync(`${board}/body_clad_probe.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,shells:report.shells.length,badShells:report.shells.filter(s=>s.nonManifoldEdges),wristError:report.maxWristAxisError,thumb:report.enemyRightThumbAt157,boot:report.bootFloor,negativeCollisions:report.negativeFootFixture.collisions.length}));if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
