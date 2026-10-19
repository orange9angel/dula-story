import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {once} from 'node:events';
const require=createRequire(path.resolve('../../node_modules/dula-engine/package.json')),puppeteer=require('puppeteer'),board='storyboard/palace_r27';fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];for(const q of ['&softPortrait=0&signature=0&hall=0&naturalWalk=0','']){const p=await browser.newPage();p.on('pageerror',e=>{throw e;});p.on('console',m=>{if(m.type()==='error')console.error(m.text());});await p.goto('http://127.0.0.1:4237/viewer.html?capture=1'+q);await p.waitForFunction('window.ready');pages.push(p);}
 const comp=await browser.newPage();await comp.setContent('<canvas width="1440" height="720"></canvas>');
 const capture=(p,cfg)=>p.evaluate(async({enemy=false,t,angle=0,view='head',pitch=0,blink=null})=>{
  const T=await import('three'),{actors,scene,renderer}=window.__dbg;window.stepAt(t??(enemy?29:9));const a=actors[enemy?'yekari':'aoao'];
  if(!a.mesh.visible)throw new Error('Review pose precedes actor arrival: '+t);
  if(pitch)a.headGroup.rotation.x+=pitch;
  if(blink!==null){a.face.setActing({blink,focus:.3});a.mouth.apply({jaw:0});}
  a.mesh.updateMatrixWorld(true);
  const stage=new T.Scene();stage.background=new T.Color('#253544');for(const l of scene.scene.children.filter(o=>o.isLight))stage.add(l.clone());
  const target=view==='head'?a.headGroup.localToWorld(new T.Vector3(0,.09,0)):view==='hips'?a.body.localToWorld(new T.Vector3(0,a.dimsRef.hipIdle-.10,0)):view==='legs'?a.body.localToWorld(new T.Vector3(0,.45,0)):view==='whole'?new T.Vector3(a.mesh.position.x,.98,a.mesh.position.z):a.body.localToWorld(new T.Vector3(0,a.dimsRef.chestY-.015,0));
  const dist=view==='head'?1.36:view==='whole'?4.55:view==='legs'?1.95:view==='hips'?1.45:1.68,yaw=a.mesh.rotation.y+angle,cam=new T.PerspectiveCamera(34,1280/720,.01,30);
  cam.position.copy(target).add(new T.Vector3(Math.sin(yaw)*dist,.045,Math.cos(yaw)*dist));cam.lookAt(target);
  const parent=a.mesh.parent;stage.add(a.mesh);renderer.render(stage,cam);const image=renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];parent.add(a.mesh);return image;
 },cfg);
 const composite=async(imgs,label)=>comp.evaluate(async({imgs,label})=>{const c=document.querySelector('canvas'),ctx=c.getContext('2d');for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();ctx.drawImage(im,280,0,720,720,i*720,0,720,720);}ctx.fillStyle='#0a111e';ctx.fillRect(0,0,1440,48);ctx.font='bold 22px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#eee';ctx.fillText('R26 · 修改前',360,33);ctx.fillStyle='#ffda9a';ctx.fillText('R27 · '+label,1080,33);return c.toDataURL('image/jpeg',.95).split(',')[1];},{imgs,label});
 const shots=[];
 for(const enemy of [false,true])for(const [key,angle] of [['front',0],['quarter',.65],['side',1.55],['rear_quarter',2.35],['back',Math.PI],['left',-.85]])shots.push([(enemy?'enemy':'hero')+'_'+key,{enemy,angle},'眉眼与蓬松发束']);
 shots.push(['hero_whole',{view:'whole'},'全身关系'],['enemy_whole',{enemy:true,view:'whole'},'全身关系'],['hero_arms',{view:'chest',angle:.35},'肩窝与上臂'],['enemy_guard',{enemy:true,t:157,view:'chest'},'抬臂连接与金属刻纹'],['hero_metal',{view:'chest',angle:-.3},'浓金与弧形刻纹'],['enemy_metal',{enemy:true,view:'chest',angle:.45},'紫黑金属与斜向刻纹'],['hero_legs',{view:'legs',t:9,angle:.15},'膝盖随脚尖方向'],['hero_squat',{view:'legs',t:152.4,angle:.7},'屈膝与墩座净空'],['hero_down',{pitch:.35,angle:.65},'低头时的发根与领口'],['enemy_up',{enemy:true,pitch:-.3,angle:-.65},'抬头时的耳发连接'],['hero_halfblink',{blink:.5},'眼睑遮挡虹膜'],['enemy_blink',{enemy:true,blink:1},'完全闭眼']);
 const audit={};
 for(const enemy of [false,true])for(const [key,angle,t] of [['front',0,9],['quarter',.6,9],['back',Math.PI,9],['squat',.65,152.4],['walk',.3,10.7]])shots.push([(enemy?'enemy':'hero')+'_hips_'+key,{enemy,view:'hips',angle,t:enemy?(key==='walk'?22.7:t===9?29:t):t},enemy&&key==='squat'?'锁链期对手站姿':'胯臀连接与大腿连续曲线']);
 shots.push(['hero_speaking',{t:7.6},'对白口型与视线'],['hero_pain',{t:60.2},'受击表情'],['hero_worry',{t:106.58},'担忧与说话'],['enemy_surprise',{enemy:true,t:155.38},'惊讶与说话'],['hero_call',{t:163.32},'蓄力喊招']);
 if(process.argv.includes('--walk-only')){shots.length=0;for(const t of [21.2,21.4,21.6,24.8,25.2,25.6,25.9,26.2,191.7,192.3,193.1])shots.push(['walk_clear_'+t,{enemy:true,t,view:'whole',angle:-1.1},'无遮蔽走停姿态 '+t+'s']);}
 for(const [name,cfg,label] of shots.filter(([name])=>!process.argv.includes('--quick')||['hero_front','hero_quarter','hero_back','hero_side','enemy_front','enemy_quarter','enemy_back','enemy_side','hero_whole','enemy_whole'].includes(name))){const imgs=await Promise.all(pages.map(p=>capture(p,cfg)));fs.writeFileSync(`${board}/${name}.jpg`,Buffer.from(await composite(imgs,label),'base64'));audit[name]=cfg;}
 fs.writeFileSync(`${board}/${process.argv.includes('--walk-only')?'walk_clear_shots':'portrait_shots'}.json`,JSON.stringify(audit,null,2));
 if(process.argv.includes('--video')){
  const encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','output/character_metal_comparison_r27.mp4'],{stdio:['pipe','inherit','inherit'],windowsHide:true}),done=once(encoder,'exit');
  for(let f=0;f<720;f++){
   const seg=Math.floor(f/120),u=f%120/119,cfg=seg<2?{enemy:seg===1,angle:u*Math.PI*2}:seg===2?{view:'chest',angle:-.7+u*1.4}:seg===3?{enemy:true,view:'chest',t:153+u*6}:seg===4?{view:'whole',t:7+u*7,angle:.25}:{view:'legs',t:149+u*4,angle:.75};
   const imgs=await Promise.all(pages.map(p=>capture(p,cfg))),im=await composite(imgs,['阿鏊 · 全周头像','夜刈 · 全周头像','单层肩甲与浓金刻纹','夜刈 · 抬臂与紫黑金属','全身关系','膝盖方向与屈膝'][seg]);if(!encoder.stdin.write(Buffer.from(im,'base64')))await once(encoder.stdin,'drain');if(f%120===0)console.log('comparison '+f+'/720');
  }encoder.stdin.end();const [code]=await done;if(code)throw Error('encode '+code);
 }
 console.log('R27 review captured');
}finally{await browser.close();}
