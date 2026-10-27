// R2 地面标定审计：对 64 拍逐拍 dump 摆放实况（actor/cel/脚底屏幕位/相机是否移动/底图变换）。
// 输出 hybrid/config/ground_audit.json，供人工读数建 ground_calib.json。
// 用法：node hybrid/tools/audit_ground.mjs   （需 4217 静态服务在跑）
import http from 'node:http';   // 占位避免误删——本脚本不启服务，直接打 4217
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),storyRoot=path.resolve(root,'../..');
const require=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');

const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4217/hybrid/art_pass.html?capture=1');
  await page.waitForFunction('window.ready===true',{timeout:60000});
  const report=await page.evaluate(()=>{
    const art=window.__art,motion=window.__motion;
    const shots=art.state(0)&&true;
    const shotTable=[];
    // 从 state 拿 shot 分界：扫 0..478 找 shot.id 变化
    let cur=null;
    const out=[];
    for(let t=0;t<478;t+=0.25){
      const st=art.state(t);
      if(!cur||st.shot!==cur.id){cur={id:st.shot,kind:st.kind,scene:st.scene,start:t};out.push(cur);}
      cur.end=t;
    }
    const rows=[];
    for(const s of out){
      const mid=(s.start+s.end)/2;
      const st=art.state(mid);
      // 相机动否：拍首尾 root 投影差
      const f0=art.frameAt(s.start+0.04),f1=art.frameAt(s.end-0.04);
      let camMove=0;
      for(const a of ['Eileen','Alder','LadyMoon']){
        const p0=f0.actors[a]?.projected?.root,p1=f1.actors[a]?.projected?.root;
        if(p0&&p1)camMove=Math.max(camMove,Math.hypot(p1[0]-p0[0],p1[1]-p0[1]));
      }
      for(const b of [...st.bodies,...st.faces]){
        const row={shot:s.id,kind:s.kind,scene:s.scene,t:+mid.toFixed(2),camMove:+camMove.toFixed(1),
          actor:b.actor,key:b.key??(b.portrait?'portrait':null),culled:!!b.culled};
        if(!b.culled){
          row.x=b.x;row.y=b.y;row.h=b.h;
          row.foot=b.walk?b.footScreen:null;
          // bake root 投影（脚底真值来源）
          const fr=art.frameAt(mid),pr=fr.actors[b.actor]?.projected?.root;
          row.bakeFoot=pr??null;
          row.plateView={cx:+st.plateView.cx.toFixed(1),cy:+st.plateView.cy.toFixed(1),z:+st.plateView.z.toFixed(3)};
          row.plate=st.plate;
        }
        rows.push(row);
      }
    }
    return rows;
  });
  if(errors.length)throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(root,'hybrid/config/ground_audit.json'),JSON.stringify(report,null,1));
  console.log(`audit rows: ${report.length} -> hybrid/config/ground_audit.json`);
}finally{await browser.close();}
