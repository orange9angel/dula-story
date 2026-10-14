import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {auditInputs} from './audit_inputs.mjs';

const ep=path.resolve(import.meta.dirname,'..');
const req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const option=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const out=path.resolve(ep,option('--out')??'storyboard/hybrid_character/profile_polish_v3/final');
fs.mkdirSync(out,{recursive:true});
const selected=option('--views')?.split(',');
const query=option('--query')??'';
const extraAngles=(option('--angles')??'').split(',').filter(Boolean).map(Number);
if(extraAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Invalid review angle');
const specs=[['front',0],['turn_45',45],['turn_65',65],['turn_80',80],['turn_90',90],['turn_minus65',-65],['turn_minus90',-90],['orbit_90',90,'orbit'],['orbit_minus90',-90,'orbit'],['structure_90',90,'bare'],['structure_minus90',-90,'bare'],['side_listen',65,null,{gaze:[-.8,.1],smile:.25}],['side_talk',65,null,{jaw:.65,gaze:[-.6,0]}],['side_blink',90,null,{blink:.5}],...extraAngles.map(a=>['angle_'+a,a])].filter(s=>!selected||selected.includes(s[0]));
if(!specs.length)throw new Error('No matching profile views');
const report={build:auditInputs(ep),query,specs,errors:[],frames:{}};
const browser=await req('puppeteer').launch({headless:true});
try{
  const page=await browser.newPage();await page.setViewport({width:900,height:900});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:4215/face_lab.html?actor=aoi&cel=direct'+query,{timeout:120000});await page.waitForFunction('window.ready',{timeout:90000});
  report.geometry=await page.evaluate(()=>{
    const p=face.root.children[0].geometry.attributes.position;
    const rows=new Set(Array.from({length:p.count},(_,i)=>p.getY(i))).size,half=p.count/2,columns=half/rows;
    let seamGap=0;
    for(let row=0;row<rows;row++)for(const [a,b] of [[row*columns,half+row*columns+columns-1],[row*columns+columns-1,half+row*columns]]){
      seamGap=Math.max(seamGap,Math.hypot(p.getX(a)-p.getX(b),p.getY(a)-p.getY(b),p.getZ(a)-p.getZ(b)));
    }
    return {rows,columns,chartSeamMaxGap:seamGap,finite:Array.from(p.array).every(Number.isFinite)};
  });
  async function capture(spec){
    const encoded=await page.evaluate(([,degrees,mode,expression={}])=>{
      const a=degrees*Math.PI/180;
      camera.position.set(mode==='orbit'?-Math.sin(a)*2:0,1.46,mode==='orbit'?Math.cos(a)*2:2);camera.lookAt(0,1.46,0);camera.updateProjectionMatrix();
      actor.mesh.traverse(o=>{if(o.userData.kind==='painted curved hair shell with thickness')o.visible=mode!=='bare';});
      renderAt({...expression,turn:mode==='orbit'?0:a});
      return renderer.domElement.toDataURL('image/png').split(',')[1];
    },spec);
    return Buffer.from(encoded,'base64');
  }
  for(const spec of specs){const bytes=await capture(spec);fs.writeFileSync(path.join(out,spec[0]+'.png'),bytes);report.frames[spec[0]]={sha256:createHash('sha256').update(bytes).digest('hex')};}
  for(const spec of specs.toReversed()){const bytes=await capture(spec);report.frames[spec[0]].seekEqual=report.frames[spec[0]].sha256===createHash('sha256').update(bytes).digest('hex');}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(report.errors.length||Object.values(report.frames).some(f=>!f.seekEqual)||!report.geometry.finite||report.geometry.chartSeamMaxGap>1e-6)throw new Error('Profile review failed: '+JSON.stringify({errors:report.errors,geometry:report.geometry}));
  console.log(`${specs.length} profile/structure views, reverse seek identical; no browser errors.`);
}finally{await browser.close();}
