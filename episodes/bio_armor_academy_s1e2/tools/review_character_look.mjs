// Render actual episode heads from matched cameras; hooks are injected only by this server.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const episode=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const story=path.resolve(episode,'../..');
const require=createRequire(path.join(story,'node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const label=process.argv[2]??'after';
if(!/^[a-z0-9_-]+$/.test(label))throw new Error('Invalid label');
const option=(name)=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const output=path.join(episode,option('--board')??'storyboard/character_look_r16',label);
const sourceOverride=option('--source')?path.resolve(episode,option('--source')):null;
const sourceFiles=['character_look.js','character_details.js','characters.js'];
fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  if(url==='/favicon.ico'){res.writeHead(204).end();return;}
  let mount=episode,relative=url.slice(1)||'viewer.html';
  if(url.startsWith('/node_modules/'))mount=story;
  if(url.startsWith('/node_modules/three/')){mount=path.resolve(path.dirname(require.resolve('three')),'..');relative=url.slice('/node_modules/three/'.length);}
  if(url.startsWith('/craft/')){mount=path.join(story,'episodes/yuki_morning_battle/craft_trial');relative=url.slice(7);}
  if(url.startsWith('/fish/')){mount=path.join(story,'episodes/yuki_fish_musical/craft3d');relative=url.slice(6);}
  let target=path.resolve(mount,relative);const rel=path.relative(mount,target);
  if(rel.startsWith('..')||path.isAbsolute(rel)||!fs.existsSync(target)){res.writeHead(404).end();return;}
  if(sourceOverride&&sourceFiles.includes(relative))target=path.join(sourceOverride,relative);
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.png':'image/png','.json':'application/json'})[path.extname(target)]??'application/octet-stream');
  if(relative==='viewer.js')res.end(fs.readFileSync(target,'utf8')+'\nwindow.reviewActors={lei,hong};window.reviewThree=THREE;window.reviewRaw=()=>{renderer.render(stage.scene,camera);return renderer.domElement.toDataURL("image/jpeg",.94).split(",")[1];};');
  else fs.createReadStream(target).pipe(res);
});
server.listen(0,'127.0.0.1');await once(server,'listening');let browser,encoder;
try{
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${server.address().port}/viewer.html?capture=1&fight-final=1`,{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready&&window.reviewActors');
  const shots=[];
  const baselineFile=path.join(episode,option('--baseline')??'storyboard/character_look_r16/before/review.json');
  const baseline=label==='before'||!fs.existsSync(baselineFile)?[]:JSON.parse(fs.readFileSync(baselineFile,'utf8')).shots;
  for(const [actor,t] of [['lei',24.5],['hong',19.5]]){
    for(const [view,angle] of [['front',0],['threequarter',42],['profile',80],['rear_quarter',135],['back',180]]){
      const fixed=baseline.find(s=>s.actor===actor&&s.view===view)?.camera;
      const result=await page.evaluate(({actor,t,angle,fixed})=>{
        window.renderAt(t);const THREE=window.reviewThree,a=window.reviewActors[actor];a.mesh.updateMatrixWorld(true);
        const target=a.headGroup.localToWorld(new THREE.Vector3(0,.065,0));
        const rotation=a.headGroup.getWorldQuaternion(new THREE.Quaternion());
        const r=angle*Math.PI/180,offset=new THREE.Vector3(Math.sin(r)*.93,.018,Math.cos(r)*.93).applyQuaternion(rotation);
        const pos=target.clone().add(offset);
        window.setFreeCamera({pos:fixed?.pos??pos.toArray(),lookAt:fixed?.look??target.toArray(),fov:28});
        const frame=window.renderAt(t);
        let nonfinite=0;a.mesh.traverse(o=>{if(o.matrixWorld.elements.some(v=>!Number.isFinite(v)))nonfinite++;});
        return {...frame,camera:{pos:fixed?.pos??pos.toArray(),look:fixed?.look??target.toArray()},nonfinite};
      },{actor,t,angle,fixed});
      const filename=`${actor}_${view}.jpg`;fs.writeFileSync(path.join(output,filename),Buffer.from(result.image,'base64'));
      shots.push({actor,t,view,filename,camera:result.camera,nonfinite:result.nonfinite});
    }
  }
  for(const t of [19.5,24.5,33.5,50.0,53.4,62.0]){
    const result=await page.evaluate(t=>{window.setFreeCamera(null);return window.renderAt(t);},t);
    const filename='shot_'+t.toFixed(1)+'.jpg';fs.writeFileSync(path.join(output,filename),Buffer.from(result.image,'base64'));
    shots.push({t,filename,state:result.state});
  }
  if(label!=='before')for(const [actor,t] of [['lei',24.5],['hong',19.5]]){
    for(const [pose,turn,pitch,blink] of [['turn_left',-.65,0,0],['turn_right',.65,0,0],['look_down',0,.25,0],['look_up',0,-.22,0],['half_blink',0,0,.5],['closed',0,0,1]]){
      const fixed=baseline.find(s=>s.actor===actor&&s.view==='front').camera;
      const image=await page.evaluate(({actor,t,turn,pitch,blink,fixed})=>{
        window.setFreeCamera({pos:fixed.pos,lookAt:fixed.look,fov:28});window.renderAt(t);
        const a=window.reviewActors[actor];a.headGroup.rotation.y+=turn;a.headGroup.rotation.x+=pitch;
        a.face.setActing?.(null);a.setEmotion('neutral',blink);a.mouth.apply({jaw:0,width:1});
        return window.reviewRaw();
      },{actor,t,turn,pitch,blink,fixed});
      const filename=`${actor}_${pose}.jpg`;fs.writeFileSync(path.join(output,filename),Buffer.from(image,'base64'));
      shots.push({actor,t,pose,turn,pitch,blink,filename,inspection:'Head rotation relative to unchanged body; not authored story motion'});
    }
  }
  if(label!=='before')for(const [actor,t] of [['lei',24.5],['hong',19.5]]){
    for(const [pose,pitch] of [['nape_down',.25],['nape_up',-.22]]){
      const fixed=(baseline.length?baseline:shots).find(s=>s.actor===actor&&s.view==='rear_quarter')?.camera;
      if(!fixed)continue;
      const frame=await page.evaluate(({actor,t,pitch,fixed})=>{
        window.setFreeCamera({pos:fixed.pos,lookAt:fixed.look,fov:28});window.renderAt(t);
        window.reviewActors[actor].headGroup.rotation.x+=pitch;return window.reviewRaw();
      },{actor,t,pitch,fixed});
      const filename=`${actor}_${pose}.jpg`;fs.writeFileSync(path.join(output,filename),Buffer.from(frame,'base64'));
      shots.push({actor,t,pose,pitch,filename,inspection:'Rear-quarter head pitch relative to unchanged body'});
    }
  }
  let video=null;
  if(option('--video')||option('--orbit-video')){
    const orbit=Boolean(option('--orbit-video'));
    video=path.resolve(episode,option('--orbit-video')??option('--video'));fs.mkdirSync(path.dirname(video),{recursive:true});
    const audio=path.join(episode,'output/craft3d_full_r11_2026_10_9.mp4');
    const sound=orbit?['-an']:[
      '-i',audio,'-filter_complex',
      '[1:a]atrim=start=19:end=23,asetpts=PTS-STARTPTS[a0];[1:a]atrim=start=23.5:end=27.5,asetpts=PTS-STARTPTS[a1];[a0][a1]concat=n=2:v=0:a=1[a]',
      '-map','0:v:0','-map','[a]','-c:a','aac','-b:a','192k'];
    encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0',
      ...sound,'-c:v','libx264','-crf','18','-pix_fmt','yuv420p',
      '-t','8','-movflags','+faststart',video],{stdio:['pipe','inherit','inherit'],windowsHide:true});
    for(const [actor,start,view] of [['hong',19,'front'],['lei',23.5,'threequarter']]){
      const fixed=(baseline.length?baseline:shots).find(s=>s.actor===actor&&s.view===view).camera;
      await page.evaluate(f=>window.setFreeCamera({pos:f.pos,lookAt:f.look,fov:28}),fixed);
      for(let frame=0;frame<120;frame++){
        const r=orbit?await page.evaluate(({actor,u})=>{
          const t=actor==='hong'?19.5:24.5;window.renderAt(t);
          const a=window.reviewActors[actor],T=window.reviewThree;
          a.headGroup.updateWorldMatrix(true,false);
          const target=a.headGroup.localToWorld(new T.Vector3(0,.065,0));
          const rotation=a.headGroup.getWorldQuaternion(new T.Quaternion()),angle=u*Math.PI*2;
          const offset=new T.Vector3(Math.sin(angle)*1.02,.018,Math.cos(angle)*1.02).applyQuaternion(rotation);
          window.setFreeCamera({pos:target.clone().add(offset).toArray(),lookAt:target.toArray(),fov:28});
          window.renderAt(t);return {image:window.reviewRaw()};
        },{actor,u:frame/119}):await page.evaluate(t=>window.renderAt(t),start+frame/30);
        if(!encoder.stdin.write(Buffer.from(r.image,'base64')))await once(encoder.stdin,'drain');
      }
    }
    encoder.stdin.end();const [code]=await once(encoder,'close');
    if(code!==0)throw new Error(`Portrait ffmpeg failed: ${code}`);encoder=null;
  }
  if(errors.length||shots.some(s=>s.nonfinite>0))throw new Error(JSON.stringify({errors,shots}));
  const sourceSha256=Object.fromEntries(sourceFiles.map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join(sourceOverride??episode,name))).digest('hex')]));
  fs.writeFileSync(path.join(output,'review.json'),JSON.stringify({label,sourceOverride,sourceSha256,video,
    videoMode:option('--orbit-video')?'360 degree camera orbit around fixed story pose':video?'story dialogue closeups':null,errors,shots},null,2));
  console.log(`${label}: ${shots.length} frames, finite matrices, no page errors`);
}finally{if(encoder)encoder.kill();if(browser)await browser.close();server.close();}
