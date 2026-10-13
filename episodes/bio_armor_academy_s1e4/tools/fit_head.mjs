// Diagnose conservative arm/head clearance without reading images.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../node_modules/dula-engine/package.json',import.meta.url)),puppeteer=require('puppeteer');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4216/viewer.html?capture=1');await page.waitForFunction('window.ready');
  const results=await page.evaluate(async()=>{
    const THREE=await import('three'),{LeiXiaoCraft}=await import('dula-assets/characters/bioarmor/characters.js'),
      {QianTangKuiCraft}=await import('dula-assets/characters/bioarmor/QianTangKuiCraft.js'),
      {BiologyRoomScene}=await import('/scenes/BiologyRoomScene.js'),{posesAt}=await import('/performance.js'),
      {createNumericProbe}=await import('/tools/numeric_probe.js');
    const stage=new BiologyRoomScene(),scene=stage.build(),actors={lei:new LeiXiaoCraft(),aoi:new QianTangKuiCraft()};
    for(const a of Object.values(actors))scene.add(a.mesh);
    const probe=createNumericProbe(actors,stage),camera=new THREE.PerspectiveCamera(36,1280/720,.05,100);
    camera.position.set(0,1.5,5.6);camera.lookAt(0,1.15,0);camera.updateMatrixWorld(true);
    const tl=await fetch('/config/timeline.json').then(r=>r.json()),results=[];
    for(const basePitch of [.025,.05,.06])for(const roll of [-.02]){
      let gap=Infinity,depth=0;
      for(const t of [5.8,6.4,6.6,6.666667,6.733333,6.8,7,7.1,7.3,7.5,8,12.7,13.066667,13.133333,13.2,13.4,14,14.4,15,23]){
        const p=posesAt(t,stage.sample(t,tl));p.lei.headPitch=basePitch+.03*p.phase.liftL;p.lei.headRoll=roll;
        for(const key of ['lei','aoi'])actors[key].setPose(p[key]);
        actors.lei.setArmorState(0,0);actors.lei.setEtch(0);scene.updateMatrixWorld(true);
        const r=probe(p,camera);gap=Math.min(gap,r.metrics.lei.selfGaps.leftHead,r.metrics.lei.selfGaps.rightHead);
        depth=Math.max(depth,...Object.values(r.surface.pairs).map(a=>a.depth));
      }
      results.push({basePitch,roll,minGap:gap,depth});
    }return results;
  });
  fs.writeFileSync('storyboard/development/head_search.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
