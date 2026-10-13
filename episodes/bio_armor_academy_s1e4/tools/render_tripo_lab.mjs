import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const ep=path.resolve(import.meta.dirname,'..'),req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const puppeteer=req('puppeteer'),args=process.argv.slice(2),both=args.includes('--both');
const url=args.find(x=>x.startsWith('http'))??'http://127.0.0.1:4215';
const board=path.join(ep,'storyboard/remake_r3/tripo_lab');fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true});let encoder;
await (async()=>{
try{
  const page=await browser.newPage();await page.setViewport(args.includes('--hd')?{width:1920,height:1080}:{width:1280,height:720});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto(url+'/tripo_lab.html?capture=1'+(both?'&actors=both':'')+(args.includes('--original')?'&source=original':args.includes('--lod')?'&source=lod160k':'&source=walk'));
  await page.waitForFunction('window.ready===true||!!window.loadError',{timeout:90000});
  const error=await page.evaluate(()=>window.loadError);if(error)throw new Error(error);
  const info=await page.evaluate(()=>window.renderAt(0));fs.writeFileSync(path.join(board,'inventory_runtime.json'),JSON.stringify(info,null,2));
  if(args.includes('--quality')){
    for(const [name,options] of [['original',{}],['normal_025',{normalStrength:.25}],['normal_0',{normalStrength:0}],['flip_y',{normalY:-1}],['mikk',{tangents:true}],['flat_roughness',{normalStrength:.25,flatRoughness:true}]]){
      await page.setViewport({width:1280,height:720});
      await page.evaluate(options=>{window.labConfigure({...options,closeup:true});window.renderAt(0);},options);
      await page.screenshot({path:path.join(board,`face_${args.includes('--original')?'highpoly_':args.includes('--lod')?'lod160k_':''}${name}.png`)});
    }
    return;
  }
  for(const t of [0,.875,1.75,3.8,4.4,5.1,5.8,6.5,9.5,10.25,11]){
    await page.evaluate(t=>window.renderAt(t),t);await page.screenshot({path:path.join(board,`${both?'both':'aoi'}${args.includes('--lod')?'_lod160k':''}_${String(t).replace('.','_')}.png`)});
  }
  if(args.includes('--stills'))return;
  const out=path.join(ep,'output',`tripo_${both?'cast':'aoi'}_trial_${args.includes('--lod')?'v2':'v1'}.mp4`);fs.mkdirSync(path.dirname(out),{recursive:true});
  encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','24','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit'],windowsHide:true});
  for(let i=0;i<288;i++){await page.evaluate(t=>window.renderAt(t),i/24);const buf=await page.screenshot({type:'png'});if(!encoder.stdin.write(buf))await once(encoder.stdin,'drain');}
  encoder.stdin.end();const [code]=await once(encoder,'close');if(code!==0)throw new Error('ffmpeg failed '+code);console.log(out);
}finally{await browser.close();if(encoder&&!encoder.killed)encoder.kill();}
})();
