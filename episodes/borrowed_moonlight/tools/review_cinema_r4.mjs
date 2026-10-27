import fs from 'node:fs';
import path from 'node:path';
import {puppeteerFor} from '../../../../dula-skills/draw-over-animation/scripts/pipeline.mjs';
const revision=process.argv[2]??'r4';if(!/^r\d+$/.test(revision))throw Error('Invalid revision');
const root=path.resolve(import.meta.dirname,'..'),board=path.join(root,`storyboard/cinema_${revision}/acting`);fs.mkdirSync(board,{recursive:true});
const browser=await puppeteerFor(root).launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:4217/hybrid/art_pass_${revision}.html?capture=1`);await page.waitForFunction('window.ready',{timeout:30000});
 const report=await page.evaluate(()=>{
  const api=window.__r4,rows=[];
  for(const line of api.envs.lines){
   if(line.speaker==='narrator')continue;
   const states=[];
   for(let t=line.t0;t<line.t0+line.dur;t+=.08){
    const st=window.__art.state(t),b=[...st.bodies,...st.faces].find(x=>x.actor===line.character);
    if(!b){states.push({t,mode:'offscreen'});continue;}
    const m=b.mouth??b.facial?.mouthCel;
    states.push({t,mode:m?'animated':b.walk?'back_walk':'static_visible',mouth:m,jaw:api.jawFor(line.character,t),key:b.key});
   }
   rows.push({id:line.id,character:line.character,states,animated:states.some(x=>x.mode==='animated'),staticVisible:states.filter(x=>x.mode==='static_visible').length,
    mouthStates:[...new Set(states.filter(x=>x.mouth).map(x=>x.mouth))]});
  }
  return{rows,blinkTimes:api.blinkTimes};
 });
 const times=[109.6,109.8,110,110.2,111,112,113,118.0,118.2,118.4,118.6,119,119.2,134,151,156,156.2,156.4,163,172,178.5,179.3,181,183,35.6,35.8,36,36.2,37,38,63.6,63.8,64,70.6,70.8,71,352.1,354,356,358,360,362,214,214.2,215,332,332.2,333,346,346.2,347,465,465.2];
 for(const actor of ['Eileen','Alder','LadyMoon']){
  const at=report.blinkTimes[actor].find(t=>actor==='Eileen'?t>109&&t<117:actor==='Alder'?t>117&&t<126:t>300&&t<307);
  if(at)times.push(at-.08,at+.1,at+.26);
 }
 for(const t of [...new Set(times)].sort((a,b)=>a-b)){
  const out=await page.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(path.join(board,`t${t.toFixed(3)}.png`),Buffer.from(out.image,'base64'));
 }
 // Same-image patch boundary check: real output pixels, not just rect metadata.
 report.patchChecks=await page.evaluate(()=>{
  const checks=[];const api=window.__r4;
  for(const [key,face] of [...Object.entries(api.faces),...Object.entries(api.celMeta).filter(([k,m])=>m.face).map(([k,m])=>[k,m.face])]){
   const q=face.canvas.getContext('2d',{willReadFrequently:true});face.paint();const base=q.getImageData(0,0,face.canvas.width,face.canvas.height).data;
   for(const mode of [{jaw:.5},{blink:1},...Object.keys(face.spec.emotions??{}).map(emotion=>({emotion,jaw:.5,blink:1}))]){
    face.paint(mode);const d=q.getImageData(0,0,face.canvas.width,face.canvas.height).data;let changed=0,outside=0;
    for(let i=0;i<d.length;i+=4){let diff=0;for(let k=0;k<4;k++)diff=Math.max(diff,Math.abs(d[i+k]-base[i+k]));if(diff<=2)continue;changed++;
     const p=i/4,x=p%face.canvas.width,y=Math.floor(p/face.canvas.width);
     const inPatch=Object.values(face.patches).some(r=>x>r.x&&x<r.x+r.canvas.width-1&&y>r.y&&y<r.y+r.canvas.height-1);
     if(!inPatch)outside++;
    }checks.push({key,mode,changed,outside,passed:changed>0&&outside===0});
   }
  }return checks;
 });
 report.errors=errors;report.passed=!errors.length&&report.rows.every(r=>r.staticVisible===0&&(!r.animated||r.mouthStates.length>=2))&&report.patchChecks.every(r=>r.passed);
 const proofs=await page.evaluate(()=>{
  const result=[];
  for(const [key,m] of Object.entries(window.__r4.celMeta))if(m.face){
   const ps=Object.values(m.face.patches),x=Math.min(...ps.map(p=>p.x))-10,y=Math.min(...ps.map(p=>p.y))-12;
   const w=Math.max(...ps.map(p=>p.x+p.canvas.width))-x+10,h=Math.max(...ps.map(p=>p.y+p.canvas.height))-y+12;
   const c=document.createElement('canvas');c.width=w*3;c.height=h;const q=c.getContext('2d');
   for(const [i,state] of [{},{jaw:.5},{blink:1}].entries()){m.face.paint(state);q.drawImage(m.face.canvas,x,y,w,h,i*w,0,w,h);}
   result.push({key,image:c.toDataURL('image/png').split(',')[1]});
  }return result;
 });
 for(const p of proofs)fs.writeFileSync(path.join(board,'proof_'+p.key.replace(':','_')+'.png'),Buffer.from(p.image,'base64'));
 fs.writeFileSync(path.join(board,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,static:report.rows.filter(r=>r.staticVisible),patchFailures:report.patchChecks.filter(r=>!r.passed),frames:times.length,errors}));
}finally{await browser.close();}
