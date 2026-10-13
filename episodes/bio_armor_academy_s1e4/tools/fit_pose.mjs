// Numerical design experiment only: actual sleeve/hand surfaces, no screenshots.
// Start `node render.mjs --serve --port 4216` first.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../node_modules/dula-engine/package.json',import.meta.url)),puppeteer=require('puppeteer');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4216/viewer.html?capture=1');
  await page.waitForFunction('window.ready');
  const results=await page.evaluate(async()=>{
    const {LeiXiaoCraft}=await import('dula-assets/characters/bioarmor/characters.js');
    const {createBodyAudit}=await import('dula-assets/lib/craft3d/body-audit.js');
    const {posesAt}=await import('/performance.js');
    const {twoBone}=await import('dula-assets/lib/craft3d/pose.js');
    const a=new LeiXiaoCraft(),audit=createBodyAudit({lei:a}),results=[];
    for(const y of [1.15,1.2,1.25])for(const pole of [[.7,-.5,.3],[.9,-.2,.05],[.65,-.35,.35],[.35,-.5,.7]]){
      let depth=0,wing=0;const samples=[];
      for(let i=0;i<=20;i++){
        const u=i/20,p=posesAt(0,{}).lei;
        for(const [side,sign] of [['left',-1],['right',1]]){
          const s={x:sign*.17,y:1.375,z:0},w={x:sign*(.29+.05*u),y:1.065+(y-1.065)*u,z:.035+.165*u};
          const e=twoBone(s,w,{x:sign*pole[0],y:pole[1],z:pole[2]},.19,.18);
          p[side+'Arm']=[s,e,w];wing=Math.max(wing,Math.acos((s.y-e.y)/.19)*180/Math.PI);
        }
        a.setPose(p);a.setArmorState(0,0);a.setEtch(0);a.mesh.updateMatrixWorld(true);
        const pairs=audit({lei:p}).pairs,d=Math.max(...Object.values(pairs).map(p=>p.depth));
        depth=Math.max(depth,d);samples.push({u,depth:d});
      }
      results.push({y,pole,depth,wing,samples});
    }return results;
  });
  fs.mkdirSync('storyboard/development',{recursive:true});
  fs.writeFileSync('storyboard/development/pose_search.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(({samples,...r})=>r),null,2));
}finally{await browser.close();}
