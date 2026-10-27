// A3：捕获粒子系统的静态场景锚点（星阶/瓶阵/窗/天窗/月轮/塔）一次落盘。
// 这些对象在场景 build 后静止（P4 纪律：静态件装配时快照世界坐标），
// art_pass 重宿主按此 JSON 重建；若场景布局改动，重跑本脚本。
// 用法：先 `node render.mjs --serve --port 4217`，再 `node hybrid/tools/capture_static_anchors.mjs`
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),storyRoot=path.resolve(root,'../..');
const require2=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json'));
const puppeteer=require2('puppeteer');

const port=process.argv[2]??'4217';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage();
  page.on('pageerror',e=>{throw e;});
  await page.goto(`http://127.0.0.1:${port}/viewer.html?capture=1`,{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready===true',{timeout:60000});
  const grab=()=>page.evaluate(()=>{
    const {scenes}=window.__dbg;
    const v3=o=>{const v=new (o.position.constructor)();o.getWorldPosition(v);return [v.x,v.y,v.z];};
    return {
      steps:scenes.towertop.steps.map(({s})=>v3(s)),
      bottles:scenes.clocktower.bottles.map(({g})=>v3(g)),
      windows:scenes.snowtown.windows.map(w=>v3(w)),
      skylight:(()=>{const o=scenes.towertop.scene.getObjectByName('skylight');return o?v3(o):null;})(),
      moonSnow:v3(scenes.snowtown.moon),moonTower:v3(scenes.towertop.moon),
      tower:v3(scenes.snowtown.tower),
    };
  });
  await page.evaluate(t=>window.stepAt(t),1);
  const a=await grab();
  await page.evaluate(t=>window.stepAt(t),470);
  const b=await grab();
  const drift=JSON.stringify(a)!==JSON.stringify(b);
  const out=path.join(root,'hybrid/config/static_anchors.json');
  fs.writeFileSync(out,JSON.stringify({schema:'cel-cinema-static-anchors-v1',captured:'viewer stepAt(1) + stepAt(470) drift check',drift,...a},null,2));
  console.log(JSON.stringify({out,drift,steps:a.steps.length,bottles:a.bottles.length,windows:a.windows.length}));
}finally{await browser.close();}
