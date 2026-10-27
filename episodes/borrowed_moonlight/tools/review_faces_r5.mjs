import fs from 'node:fs';import path from 'node:path';
import {puppeteerFor} from '../../../../dula-skills/draw-over-animation/scripts/pipeline.mjs';
const root=path.resolve(import.meta.dirname,'..'),board=path.join(root,'storyboard/cinema_r5/preview');fs.mkdirSync(board,{recursive:true});
const browser=await puppeteerFor(root).launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4217/hybrid/art_pass_r5.html?capture=1');await page.waitForFunction('window.ready',{timeout:60000});
 const config=JSON.parse(fs.readFileSync(path.join(root,'config/cinema_r5_baseline_review.json'),'utf8'));const times=[...new Set(Object.values(config.groups).flatMap(g=>g.times).concat([163,163.2,164,315.8,320,325.5,328,329]))];
 for(const t of times){const out=await page.evaluate(t=>{window.stepAt(t);return window.renderAt(t);},t);fs.writeFileSync(path.join(board,`t${t.toFixed(3)}.png`),Buffer.from(out.image,'base64'));}
 const proofs=await page.evaluate(()=>{
  const api=window.__r4,proofs=[];
  const cases=[['Alder-room',api.celMeta['Alder:room_attend'].face,[200,65,90,90],null],['Alder-respond',api.celMeta['Alder:room_respond'].face,[165,55,85,90],null],['Alder-shocked',api.faces.Alder,[430,270,410,190],'surprised'],['Alder-relieved',api.faces.Alder,[430,270,410,190],'relieved'],['Eileen-smile',api.faces.Eileen,[580,580,250,150],'happy'],['Eileen-determined',api.faces.Eileen,[580,580,250,150],'determined']];
  for(const [key,face,rect,emotion] of cases){const [x,y,w,h]=rect,states=[{},{jaw:.2},{jaw:.5},{blink:.5},{blink:1},{jaw:.2,blink:.5}],c=document.createElement('canvas');c.width=w*3;c.height=h*2;const q=c.getContext('2d');
   for(const [i,state] of states.entries()){face.paint({emotion,...state});q.drawImage(face.canvas,x,y,w,h,i%3*w,Math.floor(i/3)*h,w,h);}
   proofs.push({key,image:c.toDataURL('image/png').split(',')[1]});
  }return proofs;
 });for(const p of proofs)fs.writeFileSync(path.join(board,'proof_'+p.key+'.png'),Buffer.from(p.image,'base64'));
 const guards=await page.evaluate(()=>{
  const f=window.__r4.faces,rows=[];
  // These are actual old smile-tail pixels, not the middle of the new mouth.
  for(const key of ['mouth_half','mouth_open']){
   const p=f.Eileen.patches[key],q=p.canvas.getContext('2d');
   for(const [x,y] of [[751,608],[746,610],[625,643]]){
    const alpha=q.getImageData(x-p.x,y-p.y,1,1).data[3];rows.push({case:key,x,y,alpha,passed:alpha===255});
   }
  }
  // Read the complete painted canvas at bridge and lower rim landmarks.
  for(const emotion of ['surprised','relieved']){
   const face=f.Alder,q=face.canvas.getContext('2d');face.paint({emotion});const points=[[639,358],[652,357],[535,449],[761,424]];
   const old=points.map(([x,y])=>[...q.getImageData(x,y,1,1).data]);
   for(const blink of [.5,1]){face.paint({emotion,blink});const changed=points.filter(([x,y],i)=>[...q.getImageData(x,y,1,1).data].some((v,k)=>v!==old[i][k]));rows.push({case:'spectacle_landmarks',emotion,blink,changed,passed:changed.length===0});}
  }return rows;
 });
 const passed=!errors.length&&guards.every(x=>x.passed);
 fs.writeFileSync(path.join(board,'report.json'),JSON.stringify({passed,guards,errors,times,proofs:proofs.map(p=>p.key)},null,2));console.log(JSON.stringify({passed,errors,frames:times.length,proofs:proofs.length,guards}));if(!passed)process.exitCode=1;
}finally{await browser.close();}
