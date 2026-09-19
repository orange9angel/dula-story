import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const music=JSON.parse(fs.readFileSync(path.join(root,'config/music_analysis_v18.json'),'utf-8'));
const story=fs.readFileSync(path.join(root,'script_v18.story'),'utf-8');
const charOf=ch=>music.lyric_chars.find(c=>c.ch===ch);
const bu=charOf('步'),xue=charOf('雪'),zi=charOf('自');
// Mochi sample times: midpoint of the first cat_bounce / cat_sway / cat_loaf_spin entries.
const mochiTime=move=>{
  const m=story.match(new RegExp(`(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3}) --> (\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})\\r?\\n(?:\\{Position:[^\\n]*\\n)?\\{Event:Animate\\|character=Mochi\\|[^\\n]*move=${move}[|}]`));
  if(!m)return null;
  const s=+m[2]*60+(+m[3])+(+m[4])/1000,e=+m[6]*60+(+m[7])+(+m[8])/1000;
  return (s+e)/2;
};
const server=spawn(process.execPath,[path.join(root,'tools/render.mjs'),'--v18','--serve'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Probe server exited ${code}`)));
  });
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:720,height:1280});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:4188/viewer_v18.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true',{timeout:60000});
  const folder=path.join(root,'tmp/mouth_probe_v18');fs.mkdirSync(folder,{recursive:true});
  const report=[];

  // 1. 步 bù window: seal during b, purse≈1 small round mouth on the u vowel.
  const buWin=await page.evaluate((s,e)=>{
    const out=[];
    for(let t=s-.03;t<=e+.04;t+=.02){const st=window.stepAt(Math.max(t,0));
      out.push({t:Math.round(t*100)/100,jaw:st.lip.jaw,seal:st.lip.seal,purse:st.lip.purse,teeth:st.lip.teeth,
        aperture:st.mouthRender.actualAperture,cavity:st.mouthRender.cavityVisible});}
    return out;
  },bu.start,bu.end);
  report.push({name:'bu_window',span:[bu.start,bu.end],samples:buWin});

  // 2. Frame grabs: seal / purse / teeth frames.
  const frames=[['bu_seal',bu.start+.02],['bu_purse',(bu.start+bu.end)/2+.06],
    ['xue_teeth',xue.start+.04],['zi_teeth',zi.start+.04]];
  for(const [name,t] of frames){
    const r=await page.evaluate(t=>window.renderAt(t),t);
    fs.writeFileSync(path.join(folder,`${name}.jpg`),Buffer.from(r.image,'base64'));
    report.push({name,t:Math.round(t*1000)/1000,lip:{jaw:r.state.lip.jaw,seal:r.state.lip.seal,purse:r.state.lip.purse,teeth:r.state.lip.teeth},
      mouth:r.state.mouthRender});
  }

  // 3. Silence closes the mouth: sample the largest lyric gap.
  const gaps=[];
  for(let i=0;i+1<music.lyric_lines.length;i++)gaps.push([music.lyric_lines[i+1].start-music.lyric_lines[i].end,(music.lyric_lines[i+1].start+music.lyric_lines[i].end)/2]);
  gaps.sort((a,b)=>b[0]-a[0]);
  const silent=await page.evaluate(t=>{const s=window.stepAt(t);return {jaw:s.lip.jaw,cavity:s.mouthRender.cavityVisible,aperture:s.mouthRender.actualAperture};},gaps[0][1]);
  report.push({name:'silence_mid_gap',t:Math.round(gaps[0][1]*100)/100,gapSec:Math.round(gaps[0][0]*1000)/1000,...silent});

  // 4. Determinism: renderAt twice at the same t, with another time in between.
  const detT=mochiTime('cat_bounce')??17;
  const det=await page.evaluate(t=>{
    const a=window.renderAt(t).image;window.renderAt(t/3);
    const b=window.renderAt(t).image;const c=window.renderAt(t).image;
    return {t,sameAfterOtherFrame:a===b,sameBackToBack:b===c};
  },detT);
  report.push({name:'determinism',...det});

  // 5. Mochi on stage: one frame per move lane.
  for(const move of ['cat_bounce','cat_sway','cat_loaf_spin']){
    const t=mochiTime(move);if(t==null)continue;
    const r=await page.evaluate(t=>{const s=window.renderAt(t);return {image:s.image,mochi:s.state.mochi,scene:s.state.scene};},t);
    fs.writeFileSync(path.join(folder,`mochi_${move}.jpg`),Buffer.from(r.image,'base64'));
    report.push({name:`mochi_${move}`,t:Math.round(t*100)/100,mochi:r.mochi,scene:r.scene});
  }

  fs.writeFileSync(path.join(folder,'metadata.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.map(r=>({...r,samples:r.samples?`(${r.samples.length} samples)`:undefined})),null,1));
}finally{if(browser)await browser.close();server.kill();}
