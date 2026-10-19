import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r27';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const p=await browser.newPage();await p.goto('http://127.0.0.1:4237/viewer.html?capture=1');await p.waitForFunction('window.ready');
 await p.evaluate(()=>window.setFreeCamera({pos:[3,3.9,-3.4],lookAt:[0,3.4,-11.8],fov:43}));
 const frames=[];
 for(const t of [9,9.5,10]){
  const r=await p.evaluate(t=>{window.renderAt(9);const {hall,renderer,scene,camera}=window.__dbg;hall.update(t,camera);renderer.render(scene.scene,camera);return renderer.domElement.toDataURL('image/png').split(',')[1];},t);
  fs.writeFileSync(`${board}/hall_only_${t}.png`,Buffer.from(r,'base64'));frames.push(r);
 }
 const check=await p.evaluate(async frames=>{
  const arrays=[];for(const data of frames){const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');g.drawImage(im,0,0);arrays.push(g.getImageData(0,0,1280,720).data);}
  // Back wall below the torch height; excludes flame sprites and subtitles.
  const roi=[535,400,250,75],values=arrays.map(a=>{let sum=0;for(let y=roi[1];y<roi[1]+roi[3];y++)for(let x=roi[0];x<roi[0]+roi[2];x++){const i=(y*1280+x)*4;sum+=(a[i]+a[i+1]+a[i+2])/3;}return sum/(roi[2]*roi[3]);});
  return {roi,meanRgb:values,range:Math.max(...values)-Math.min(...values),method:'Fixed scene, pose and camera at 9s; only torch system time changes. Back-wall pixels exclude flames.'};
 },frames);
 check.passed=check.range>.05;fs.writeFileSync(`${board}/hall_pixel_checks.json`,JSON.stringify(check,null,2));console.log(JSON.stringify(check));if(!check.passed)process.exitCode=1;
}finally{await browser.close();}
