import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {once} from 'node:events';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r24';fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];for(const q of ['&cuirass=0&pelvis=0&identities=0&jointfix=0&footfix=0','']){const p=await browser.newPage();p.on('pageerror',e=>console.error(e));await p.goto('http://127.0.0.1:4235/viewer.html?capture=1'+q);await p.waitForFunction('window.ready');pages.push(p);}
 const comp=await browser.newPage();await comp.setContent('<canvas width="1440" height="720"></canvas>');
 const capture=(p,cfg)=>p.evaluate(async({enemy=false,t,angle=0,view='whole',cape=true})=>{
  const T=await import('three'),{actors,scene,renderer}=window.__dbg;window.stepAt(t??(enemy?29:9));const a=actors[enemy?'yekari':'aoao'];a.mesh.updateMatrixWorld(true);
  const stage=new T.Scene();stage.background=new T.Color('#253544');for(const l of scene.scene.children.filter(o=>o.isLight))stage.add(l.clone());
  const hip=a.body.localToWorld(new T.Vector3(0,a.dimsRef.hipIdle,0)),head=new T.Box3().setFromObject(a.headGroup).max.y;
  const target=view==='hips'?hip.clone().add(new T.Vector3(0,-.10,0)):view==='chest'?a.body.localToWorld(new T.Vector3(0,a.dimsRef.chestY+.02,0)):new T.Vector3(hip.x,(head+.03)*.5,hip.z);
  const dist=view==='whole'?(head+.12)/(2*Math.tan(17*Math.PI/180))*1.18:view==='hips'?1.48:1.46,yaw=a.mesh.rotation.y+angle,cam=new T.PerspectiveCamera(34,1280/720,.01,30);
  cam.position.copy(target).add(new T.Vector3(Math.sin(yaw)*dist,.055,Math.cos(yaw)*dist));cam.lookAt(target);
  const parent=a.mesh.parent,capeGroup=a.cape?.group,was=capeGroup?.visible;if(capeGroup&&!cape)capeGroup.visible=false;stage.add(a.mesh);renderer.render(stage,cam);const image=renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];parent.add(a.mesh);if(capeGroup)capeGroup.visible=was;return image;
 },cfg);
 const composite=async(imgs,label)=>comp.evaluate(async({imgs,label})=>{const c=document.querySelector('canvas'),ctx=c.getContext('2d');for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();ctx.drawImage(im,280,0,720,720,i*720,0,720,720);}ctx.fillStyle='#0a111e';ctx.fillRect(0,0,1440,52);ctx.font='bold 23px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#eee';ctx.fillText('R23 · 修改前',360,35);ctx.fillStyle='#ffda9a';ctx.fillText('R24 · '+label,1080,35);return c.toDataURL('image/jpeg',.95).split(',')[1];},{imgs,label});
 const shots=[['hero_whole',{},'阿鏊 · 厚实圆弧与炉心'],['enemy_whole',{enemy:true},'夜刈 · 斜向刃脊与尖靴'],['hero_chest',{view:'chest',angle:.2},'连肩胸背甲'],['enemy_chest',{enemy:true,view:'chest',angle:-.3},'斜脊胸甲'],['chest_back',{view:'chest',angle:Math.PI,cape:false},'胸背与肩根连接 · 检查机位去披风'],['hero_hips',{view:'hips',angle:1.1,cape:false},'腰臀与粗细过渡'],['hero_hips_back',{view:'hips',angle:Math.PI,cape:false},'臀部后侧 · 检查机位去披风'],['enemy_hips',{enemy:true,view:'hips',angle:Math.PI*.8,cape:false},'夜刈骨盆与大腿'],['hero_squat',{t:152.4,view:'hips',angle:1.2,cape:false},'臀部后坐与屈膝'],['enemy_guard',{enemy:true,t:157,view:'chest'},'第9秒对应正片157秒 · 腕掌朝向'],['enemy_walk',{enemy:true,t:23.1,angle:.8},'迈步']];
 for(const [name,cfg,label] of shots){const imgs=await Promise.all(pages.map(p=>capture(p,cfg)));fs.writeFileSync(`${board}/${name}.jpg`,Buffer.from(await composite(imgs,label),'base64'));}
 if(process.argv.includes('--video')){
  const encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','output/body_armor_comparison_r24.mp4'],{stdio:['pipe','inherit','inherit'],windowsHide:true}),done=once(encoder,'exit');
  for(let f=0;f<600;f++){
   const seg=Math.floor(f/150),u=f%150/149,cfg=seg===0?{angle:u*Math.PI*2}:seg===1?{enemy:true,angle:u*Math.PI*2}:seg===2?{view:'hips',cape:false,angle:u*Math.PI*2}:{enemy:true,t:153+u*6,view:'chest'};
   const imgs=await Promise.all(pages.map(p=>capture(p,cfg))),im=await composite(imgs,['阿鏊 · 整体造型','夜刈 · 整体造型','骨盆与大腿 · 检查机位去披风','腕掌与护手 · 连续动作'][seg]);if(!encoder.stdin.write(Buffer.from(im,'base64')))await once(encoder.stdin,'drain');if(f%150===0)console.log('comparison '+f+'/600');
  }encoder.stdin.end();const [code]=await done;if(code)throw Error('encode '+code);
 }
 console.log('R24 body/armor review captured');
}finally{await browser.close();}
