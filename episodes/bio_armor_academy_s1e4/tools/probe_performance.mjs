// Fast numeric-only development sample; not a substitute for the full-frame gate.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../node_modules/dula-engine/package.json',import.meta.url));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:4216/viewer.html?capture=1&probe-surface=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready===true');
  if(process.argv.includes('--self-test')){
    const result=await page.evaluate(async()=>{
      const {diagonalGap}=await import('./tools/numeric_probe.js'),T=await import('three');
      const u=new T.Vector3(1,-1,0).normalize(),v=new T.Vector3(1,1,0).normalize();
      const box=[];for(const x of [-.3,.3])for(const y of [-.02,.02])for(const z of [-.02,.02])
        box.push(u.clone().multiplyScalar(x).addScaledVector(v,y).add(new T.Vector3(0,0,z)));
      const shifted=box.map(p=>p.clone().addScaledVector(v,.12)),overlap=box.map(p=>p.clone().addScaledVector(u,.1));
      if(!new T.Box3().setFromPoints(box).intersectsBox(new T.Box3().setFromPoints(shifted)))throw Error('test setup lacks AABB false positive');
      const gap=diagonalGap(box,shifted);
      if(Math.abs(gap-.08)>1e-8||diagonalGap(box,overlap)!==0||diagonalGap(box,box.map(p=>p.clone().multiplyScalar(.5)))!==0)throw Error('separation regression');
      let failed=false;try{diagonalGap([],box);}catch{failed=true;}if(!failed)throw Error('empty cloud accepted');
      return {passed:true,cases:['AABB false positive','overlapping hulls','containment','missing cloud'],gap};
    });console.log(JSON.stringify(result));
  }else{
  const frames=[];
  for(let i=0;i<405;i++)frames.push({t:i*.2,...await page.evaluate(t=>window.stepAt(t),i*.2)});
  fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/performance_probe.json',JSON.stringify(frames));
  const stats={},add=(key,v,t)=>{const s=stats[key]??={min:v,max:v,minAt:t,maxAt:t};if(v<s.min){s.min=v;s.minAt=t;}if(v>s.max){s.max=v;s.maxAt=t;}};
  for(const f of frames){
    for(const [key,s] of Object.entries(f.surface.pairs))add(key,s.maxDepth??s.max_depth??s.depth,f.t);
    for(const key of ['lei','aoi']){
      const m=f.metrics[key];for(const name of ['boneError','maxArmAngle','headTurn','minEnvironmentGap'])add(key+':'+name,m[name],f.t);
      for(const [pair,gap] of Object.entries(m.selfGaps))add(key+':'+pair,gap,f.t);
    }
    add('actorGap',f.metrics.actorGap,f.t);
  }
  console.log(JSON.stringify(stats,null,2));console.log('surface schema',JSON.stringify(frames[0].surface.pairs['aoi:left:torso']));
  }
}finally{await browser.close();}
