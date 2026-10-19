import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {once} from 'node:events';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r27';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];for(const q of ['&softPortrait=0&signature=0&hall=0&naturalWalk=0','']){const p=await browser.newPage();p.on('pageerror',e=>{throw e;});await p.goto('http://127.0.0.1:4237/viewer.html?capture=1'+q);await p.waitForFunction('window.ready');pages.push(p);}
 const samples=[];
 for(let k=0;k<2;k++)samples.push(await pages[k].evaluate(()=>{
  const rows=[];
  for(const [a,b] of [[19.9,27.2],[98.9,104],[131.9,138.2],[191,197.7]])for(let f=Math.ceil(a*60);f<=Math.floor(b*60);f++){
   const t=f/60,s=window.stepAt(t);rows.push({t,cast:s.cast,roots:s.roots,legs:s.legs,locomotion:s.locomotion});
  }return rows;
 }));
 fs.writeFileSync(`${board}/walk_samples.json`,JSON.stringify({fps:60,before:samples[0],after:samples[1]}));
 const configs=[['hall_front',{pos:[0,3.5,-3.1],lookAt:[0,3.45,-12.0],fov:42}],['hall_oblique',{pos:[3,3.9,-3.4],lookAt:[0,3.4,-11.8],fov:43}]];
 for(const [name,camera]of configs){await pages[1].evaluate(c=>window.setFreeCamera(c),camera);for(const t of [9,9.5,10]){const r=await pages[1].evaluate(t=>window.renderAt(t),t);fs.writeFileSync(`${board}/${name}_${t}.jpg`,Buffer.from(r.image,'base64'));}}
 const hall=await pages[1].evaluate(async()=>{
  const T=await import('three'),{scene,hall,camera,renderer}=window.__dbg;window.renderAt(9);
  const before=hall.torches.map(o=>o.lamp.intensity);hall.update(10,camera);const after=hall.torches.map(o=>o.lamp.intensity);
  const gaps=[];for(const sign of [-1,1]){
   const ray=new T.Raycaster(new T.Vector3(sign*2.85,3.5,-5),new T.Vector3(0,0,-1));
   const meshes=[scene.scene.getObjectByName(`portal_jamb_${sign*2.7}`),scene.scene.getObjectByName(`palace_facade_${sign*7}`)];
   scene.scene.updateMatrixWorld(true);const hits=meshes.map(m=>ray.intersectObject(m,false)[0]?.distance);gaps.push(Math.abs(hits[0]-hits[1]));
  }
  return{torches:hall.torches.length,before,after,jambDepthSeparation:gaps,backOpaque:!scene.scene.getObjectByName('palace_inside_back').material.transparent};
 });fs.writeFileSync(`${board}/hall_checks.json`,JSON.stringify(hall,null,2));
 if(process.argv.includes('--video')){
  const comp=await browser.newPage();await comp.setContent('<canvas width="1440" height="720"></canvas>');
  const encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','output/palace_walk_comparison_r27.mp4'],{stdio:['pipe','inherit','inherit'],windowsHide:true}),done=once(encoder,'exit');
  for(let f=0;f<480;f++){
   const t=f<240?19.8+f/30:190.8+(f-240)/30;
   const imgs=await Promise.all(pages.map(p=>p.evaluate(async t=>{const T=await import('three');window.stepAt(t);const a=window.__dbg.actors.yekari,root=a.mesh.position.clone(),target=root.clone().setY(1.07);window.setFreeCamera({pos:target.clone().add(new T.Vector3(3.5,.35,3.5)).toArray(),lookAt:target.toArray(),fov:34});return window.renderAt(t).image;},t)));
   const im=await comp.evaluate(async({imgs,t})=>{const c=document.querySelector('canvas'),g=c.getContext('2d');for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();g.drawImage(im,280,0,720,720,i*720,0,720,720);}g.fillStyle='#0a111e';g.fillRect(0,0,1440,46);g.font='22px Microsoft YaHei';g.fillStyle='#eee';g.fillText('R26',30,32);g.fillText('R27  '+t.toFixed(2)+'s',750,32);return c.toDataURL('image/jpeg',.95).split(',')[1];},{imgs,t});
   if(!encoder.stdin.write(Buffer.from(im,'base64')))await once(encoder.stdin,'drain');if(f%120===0)console.log('walk '+f+'/480');
  }encoder.stdin.end();const [code]=await done;if(code)throw Error('encode '+code);
 }
 console.log('motion and hall review ready');
}finally{await browser.close();}
