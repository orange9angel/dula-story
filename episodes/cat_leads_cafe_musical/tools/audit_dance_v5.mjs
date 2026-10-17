import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?full=1&capture=1');
 const result=await page.evaluate(async()=>{
  const old=await import('/craft3d/dance-v3.js'),now=await import('/craft3d/dance-v5.js'),grid=await(await fetch('/config/dance_beats_v3.json')).json();
  const stats={v3:{},v5:{}};let footComparisons=0;
  for(const rev of ['v3','v5'])for(const kind of ['Girl','Boy'])stats[rev][kind]={frames:0,bothAbove1_22:0,oneBelow1_12:0};
  for(let t=0;t<grid.beats.at(-1);t+=1/30){
   const a=old.performanceAt(t,t+grid.songStart,.58,{},grid),b=now.performanceAt(t,t+grid.songStart,.58,{},grid);
   for(const kind of ['Girl','Boy']){
    for(const key of ['x','yaw','bob','roll','leftFoot','rightFoot','leftFootYaw','rightFootYaw','stance'])if(JSON.stringify(a[kind][key])!==JSON.stringify(b[kind][key]))throw Error('Foot/root regression '+kind+' '+t+' '+key);
    footComparisons++;
    for(const [rev,p] of [['v3',a[kind]],['v5',b[kind]]]){const s=kind==='Girl'?1:1.07,y=[p.leftWrist.y,p.rightWrist.y].map(v=>(v-p.bob)/s),r=stats[rev][kind];r.frames++;if(Math.min(...y)>1.22)r.bothAbove1_22++;if(Math.min(...y)<1.12)r.oneBelow1_12++;}
   }
  }
  return{scope:'Authored target statistics and exact foot/root curve regression; does not grade dancing or prove collision freedom',footComparisons,footRootUnchanged:true,stats};
 });fs.writeFileSync('config/dance_revision_audit_v5.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
