import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const ep=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.resolve(ep,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer'),base=process.argv.slice(2).find(a=>a.startsWith('http'))??'http://127.0.0.1:4235';
const board=path.join(ep,'storyboard/palace_r22');fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];
 for(const q of ['&gauntlets=0','']){
  const p=await browser.newPage();p.on('pageerror',e=>{throw e;});await p.goto(base+'/viewer.html?capture=1'+q);await p.waitForFunction('window.ready===true');pages.push(p);
 }
 const compositor=await browser.newPage();await compositor.setContent('<canvas width="1440" height="720"></canvas>');
 const composite=async(imgs,label)=>compositor.evaluate(async({imgs,label})=>{
  const c=document.querySelector('canvas'),ctx=c.getContext('2d');
  for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();ctx.drawImage(im,280,0,720,720,i*720,0,720,720);}
  ctx.fillStyle='rgba(7,11,18,.85)';ctx.fillRect(0,0,1440,52);ctx.font='bold 24px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#eee';ctx.fillText('R21 · 圆环与块件',360,35);ctx.fillStyle='#ffdc99';ctx.fillText('R22 · '+label,1080,35);return c.toDataURL('image/jpeg',.95).split(',')[1];
 },{imgs,label});
 const capture=(page,cfg)=>page.evaluate(async({enemy=false,side='right',fist=0,open=0,point=0,angle=0,whole=false})=>{
  const THREE=await import('three'),{actors,scene,renderer}=window.__dbg;window.stepAt(enemy?29:9);
  const a=actors[enemy?'yekari':'aoao'],hand=a.hands[side];hand.setGesture({fist,open,point});a.mesh.updateMatrixWorld(true);hand.skeleton.update();
  if(!window.__gauntletReviewScene){const stage=window.__gauntletReviewScene=new THREE.Scene();stage.background=new THREE.Color('#233342');for(const light of scene.scene.children.filter(o=>o.isLight))stage.add(light.clone());}
  const stage=window.__gauntletReviewScene,cam=new THREE.PerspectiveCamera(34,1280/720,.01,30),nodes=whole?[a.mesh]:[hand,a.rigs[side].rig];
  if(whole){const p=a.headGroup.getWorldPosition(new THREE.Vector3()),yaw=(enemy?-.85:.85)+angle;cam.position.set(p.x+Math.sin(yaw)*2.2,p.y,p.z+Math.cos(yaw)*2.2);cam.lookAt(p.x,p.y-.24,p.z);}
  else{
   const look=hand.localToWorld(new THREE.Vector3(-.058/hand.scale.x,0,0));
   const dir=new THREE.Vector3(.11,.62*Math.sin(angle),-hand.sign*.62*Math.cos(angle)).transformDirection(hand.matrixWorld);
   cam.position.copy(look).addScaledVector(dir,.68);cam.up.set(1,0,0).transformDirection(hand.matrixWorld);cam.lookAt(look);
  }
  const records=nodes.map(o=>({o,parent:o.parent,auto:o.matrixAutoUpdate,matrix:o.matrix.clone(),world:o.matrixWorld.clone()}));
  for(const r of records){stage.add(r.o);r.o.matrixAutoUpdate=false;r.o.matrix.copy(r.world);}
  renderer.render(stage,cam);const result=renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];
  for(const r of records){r.parent.add(r.o);r.o.matrixAutoUpdate=r.auto;r.o.matrix.copy(r.matrix);}return result;
 },cfg);
 const shots=[['hero_whole',{whole:true},'阿鏊 · 整体轮廓'],['enemy_whole',{whole:true,enemy:true},'夜刈 · 整体轮廓'],['hero_open',{open:1},'张手：护臂到手背'],['hero_fist',{fist:1},'握拳：分节金属指甲'],['hero_palm',{open:1,angle:Math.PI},'掌面与关节活动缝'],['hero_side',{fist:.45,angle:Math.PI/2},'侧面与手腕衔接'],['enemy_fist',{enemy:true,fist:1},'冷钢手套'],['enemy_open',{enemy:true,open:1},'张手与武器挂点']];
 for(const [name,cfg,label] of shots){const imgs=await Promise.all(pages.map(p=>capture(p,cfg)));fs.writeFileSync(path.join(board,name+'.jpg'),Buffer.from(await composite(imgs,label),'base64'));}
 const report=[];
 for(const page of pages)report.push(await page.evaluate(async()=>{
  const THREE=await import('three'),{actors}=window.__dbg,poses=[],hands=[];
  for(const t of [9,58,103,149,152,168.4,171]){window.stepAt(t);poses.push({t,shield:actors.aoao.shieldDome.localToWorld(new THREE.Vector3(0,.278,0)).toArray(),shoulders:Object.values(actors).flatMap(a=>a.pauldronGroups.map(p=>p.g.matrixWorld.toArray())),hands:Object.values(actors).flatMap(a=>Object.values(a.hands).map(h=>h.position.toArray()))});}
  for(const [name,a] of Object.entries(actors))for(const side of ['left','right']){
   const h=a.hands[side];for(const gesture of [{open:1},{fist:1},{point:1},{fist:.5}]){
    h.setGesture(gesture);const stats=h.validateDeformation();
    const plates=a.gauntlets?.[side].fingers??[],wrongParents=plates.filter(p=>!p.parent.isBone).length;
    hands.push({actor:name,side,gesture,vertices:stats.vertices,maxRadius:stats.maxRadius,plates:plates.length,wrongParents});
   }
  }
  return {poses,hands};
 }));
 const passed=JSON.stringify(report[0].poses)===JSON.stringify(report[1].poses)&&report[1].hands.every(h=>h.plates===14&&h.wrongParents===0);
 fs.writeFileSync(path.join(board,'gauntlet_probe.json'),JSON.stringify({passed,before:report[0],after:report[1],limits:'Bone parenting, hand deformation bounds and retained contact/shoulder transforms. Not mesh self-collision proof.'},null,2));
 if(!passed)throw new Error('Gauntlet or retained transform regression failed');
 if(process.argv.includes('--video')){
  const out=path.join(ep,'output/gauntlet_comparison_r22.mp4'),encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit'],windowsHide:true}),done=once(encoder,'exit');
  for(let f=0;f<360;f++){
   const enemy=f>=180,u=f%180/179,close=(1-Math.cos(u*Math.PI*4))/2;
   const cfg={enemy,fist:close,open:1-close,angle:Math.sin(u*Math.PI*2)*1.30};
   const imgs=await Promise.all(pages.map(p=>capture(p,cfg))),data=await composite(imgs,(enemy?'夜刈':'阿鏊')+' · 握拳／张手／转面');
   if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');if(f%90===0)console.log('gauntlet comparison '+f+'/360');
  }
  encoder.stdin.end();const [code]=await done;if(code)throw new Error('ffmpeg failed '+code);console.log(out);
 }
 console.log(JSON.stringify({passed,gestures:report[1].hands.length}));
}finally{await browser.close();}
