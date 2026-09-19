/**
 * golden_frames.mjs — 黄金帧视觉回归 harness（永久设施）。
 *
 * 用法（在 episodes/yuki_fish_musical/ 下）：
 *   node tools/golden_frames.mjs                     # 渲染 current/ 并与 baseline/ 逐帧像素对比
 *   node tools/golden_frames.mjs --render-only       # 只渲染 storyboard/golden/current/
 *   node tools/golden_frames.mjs --save-baseline     # current/ 拷为 baseline/（入库用）
 *   node tools/golden_frames.mjs --root <path>       # 用另一个 checkout（如 git worktree 的
 *                                                    # 旧版本）渲染；配合 --render-to <dir>
 *   node tools/golden_frames.mjs --render-to <dir>   # 渲染输出到指定目录（默认 current/）
 *   node tools/golden_frames.mjs --threshold 0.02    # 平均绝对差阈值（默认 2%）
 *
 * 关键帧清单：storyboard/golden/timestamps.json（["0.30", ...] 秒）。
 * 渲染走 render.mjs --serve 同款 puppeteer 通道，直接抓合成后 canvas 的 PNG
 * （无损，同一版本两次渲染 diff 必须 ≈0——确定性护栏）。
 * diff 在页面里用 canvas ImageData 计算：meanAbsDiff（0..1）+ 最大差异连通区的
 * 粗略中心；超阈值打印 ⚠️ 并写 storyboard/golden/diff_<t>.jpg 并排图（左 baseline
 * 右 current 中间差异热区描红框）。全过打印 ✅。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);
const argOf=(k,d)=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:d;};
const renderRoot=path.resolve(root,argOf('--root','.'));
const goldDir=path.join(root,'storyboard/golden');
const outDir=path.join(goldDir,argOf('--render-to','current'));
const baselineDir=path.join(goldDir,'baseline');
const threshold=parseFloat(argOf('--threshold','0.02'));
const saveBaseline=argv.includes('--save-baseline');
const renderOnly=argv.includes('--render-only')||saveBaseline||argv.includes('--root');
const timestamps=JSON.parse(fs.readFileSync(path.join(goldDir,'timestamps.json'),'utf-8')).map(Number);

const require=createRequire(path.join(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const server=spawn(process.execPath,[path.join(renderRoot,'tools/render.mjs'),'--serve'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);server.once('error',reject);
    server.once('exit',code=>reject(new Error(`render --serve exited ${code}`)));
  });
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:720,height:1280});
  page.on('pageerror',e=>console.error('pageerror:',e.message));
  await page.goto('http://127.0.0.1:4189/viewer.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true',{timeout:60000});
  fs.mkdirSync(outDir,{recursive:true});

  const name=t=>`${t.toFixed(2).replace('.','_')}.png`;
  for(const t of timestamps){
    const data=await page.evaluate(t=>{window.stepAt(t);
      return document.querySelector('canvas').toDataURL('image/png').split(',')[1];},t);
    fs.writeFileSync(path.join(outDir,name(t)),Buffer.from(data,'base64'));
  }
  console.log(`rendered ${timestamps.length} frames -> ${path.relative(root,outDir)}`);

  if(saveBaseline){
    fs.rmSync(baselineDir,{recursive:true,force:true});
    fs.cpSync(outDir,baselineDir,{recursive:true});
    console.log('baseline saved');
  }

  if(!renderOnly){
    // In-page pixel diff: draw both PNGs, compare ImageData.
    const rows=[];
    for(const t of timestamps){
      const f=name(t);
      const basePath=path.join(baselineDir,f);
      if(!fs.existsSync(basePath)){rows.push({t,error:'no baseline'});continue;}
      const curB64=fs.readFileSync(path.join(outDir,f)).toString('base64');
      const baseB64=fs.readFileSync(basePath).toString('base64');
      const r=await page.evaluate(async(curB64,baseB64)=>{
        const load=b=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;
          i.src='data:image/png;base64,'+b;});
        const cur=await load(curB64),base=await load(baseB64);
        const W=720,H=1280;
        const c=document.createElement('canvas');c.width=W;c.height=H;
        const x=c.getContext('2d',{willReadFrequently:true});
        x.drawImage(cur,0,0);const cd=x.getImageData(0,0,W,H).data;
        x.clearRect(0,0,W,H);x.drawImage(base,0,0);const bd=x.getImageData(0,0,W,H).data;
        let sum=0,n=W*H,maxD=0,maxX=0,maxY=0;
        // coarse grid for the max-difference region (32px cells)
        const cell=32,gw=Math.ceil(W/cell),gh=Math.ceil(H/cell),cells=new Float64Array(gw*gh);
        for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){
          const i=(y*W+xx)*4;
          const d=(Math.abs(cd[i]-bd[i])+Math.abs(cd[i+1]-bd[i+1])+Math.abs(cd[i+2]-bd[i+2]))/765;
          sum+=d;cells[Math.floor(y/cell)*gw+Math.floor(xx/cell)]+=d;
        }
        let mi=0;for(let i=1;i<cells.length;i++)if(cells[i]>cells[mi])mi=i;
        return{mean:sum/n,hotX:(mi%gw)*cell+cell/2,hotY:Math.floor(mi/gw)*cell+cell/2,
          hotScore:cells[mi]/(cell*cell)};
      },curB64,baseB64);
      rows.push({t,...r,warn:r.mean>threshold});
      if(r.mean>threshold){
        // side-by-side with a red box on the hottest cell
        const shot=await page.evaluate(async(curB64,baseB64,hx,hy)=>{
          const load=b=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;
            i.src='data:image/png;base64,'+b;});
          const cur=await load(curB64),base=await load(baseB64);
          const W=720,H=1280,c=document.createElement('canvas');c.width=W*2+8;c.height=H;
          const x=c.getContext('2d');
          x.drawImage(base,0,0);x.drawImage(cur,W+8,0);
          for(const ox of [0,W+8]){x.strokeStyle='#ff2244';x.lineWidth=6;x.strokeRect(ox+hx-32,hy-32,64,64);}
          return c.toDataURL('image/jpeg',.9).split(',')[1];
        },curB64,baseB64,r.hotX,r.hotY);
        fs.writeFileSync(path.join(goldDir,`diff_${t.toFixed(2).replace('.','_')}.jpg`),Buffer.from(shot,'base64'));
      }
    }
    for(const r of rows){
      if(r.error){console.log(`t=${r.t.toFixed(2).padStart(6)}  ${r.error}`);continue;}
      console.log(`t=${r.t.toFixed(2).padStart(6)}  mean=${(r.mean*100).toFixed(3)}%  hot=(${r.hotX},${r.hotY}) ${r.warn?'⚠️':'ok'}`);
    }
    const warns=rows.filter(r=>r.warn).length;
    console.log(warns?`⚠️ ${warns}/${rows.length} frames over threshold ${threshold}`:`✅ all ${rows.length} frames within ${threshold}`);
    fs.writeFileSync(path.join(goldDir,'last_diff.json'),JSON.stringify({threshold,rows},null,2));
  }
}finally{if(browser)await browser.close();server.kill();}
