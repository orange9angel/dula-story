// Local render probe: no asset generation and no changes to the episode viewer.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const episode = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const story = path.resolve(episode, '../..');
const require = createRequire(path.join(story, 'node_modules/dula-engine/package.json'));
const puppeteer = require('puppeteer');
const three = path.resolve(path.dirname(require.resolve('three')), '..');
const out = path.join(episode, 'storyboard/hybrid_audit_20261009');
fs.mkdirSync(out, {recursive:true});
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if(url === '/favicon.ico') {res.writeHead(204).end();return;}
  let base = episode, relative = url.slice(1);
  if (url === '/') {
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","dula-engine":"/node_modules/dula-engine/index.js"}}</script>');
    return;
  }
  if (url.startsWith('/three/')) {base=three; relative=url.slice(7);}
  if (url.startsWith('/node_modules/')) base=story;
  const target=path.resolve(base,relative), rel=path.relative(base,target);
  if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(target)) {res.writeHead(404).end();return;}
  res.setHeader('Content-Type',path.extname(target)==='.js'?'text/javascript':'image/png');
  fs.createReadStream(target).pipe(res);
});
server.listen(0,'127.0.0.1'); await once(server,'listening');
let browser, encoder;
try {
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const info=await page.evaluate(async()=>{
    const THREE=await import('three');
    const {RuinsDuskScene}=await import('/scenes/RuinsDuskScene.js');
    const {continuousBackdrop}=await import('/scenes/ContinuousBackdrop.js');
    const stage=new RuinsDuskScene();stage.build();await stage.applyHybrid('/assets3d/tex/',{continuousSky:false});
    const cylinder=stage.scene.children.find(o=>o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.radiusTop===70);
    const dome=stage.scene.children.find(o=>o.geometry?.type==='SphereGeometry'&&o.geometry.parameters.radius===95);
    if(!cylinder||!dome)throw new Error('Expected production backdrop not found');
    const texture=cylinder.material.map;
    const unified=continuousBackdrop(texture,{repeat:texture.repeat.x,offset:texture.offset.x});
    stage.scene.add(unified);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(960,540);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const camera=new THREE.PerspectiveCamera(52,960/540,.05,250);
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=576;
    const ctx=canvas.getContext('2d');
    window.skyFrame=(pitch,yaw=0,t=0)=>{
      const el=pitch*Math.PI/180,az=yaw*Math.PI/180;
      camera.position.set(4,2,7);
      camera.lookAt(4+Math.sin(az)*30*Math.cos(el),2+30*Math.sin(el),7-30*Math.cos(az)*Math.cos(el));
      stage.update(t);
      for(const [i,improved] of [false,true].entries()){
        cylinder.visible=dome.visible=!improved;unified.visible=improved;
        renderer.render(stage.scene,camera);
        ctx.drawImage(renderer.domElement,i*960,36);
      }
      ctx.fillStyle='#151920';ctx.fillRect(0,0,1920,36);
      ctx.fillStyle='white';ctx.font='20px sans-serif';
      ctx.fillText('BASELINE: separate cylinder + dome',16,25);
      ctx.fillText('STUDY: one continuous projection (no new image)',976,25);
      ctx.fillText('pitch '+pitch.toFixed(1)+' / yaw '+yaw.toFixed(1),1510,25);
      return canvas.toDataURL('image/png').split(',')[1];
    };
    const uv=stage.groundDisc.geometry.attributes.uv;
    const values=Array.from({length:uv.count},(_,i)=>uv.getY(i));
    return {baseline:'current RuinsDuskScene, same textures and lights',study:'continuousBackdrop',camera:[4,2,7],fov:52,texture:texture.image.src,
      groundDiscVRange:[Math.min(...values),Math.max(...values)],
      groundNormalColorSpace:stage.groundMesh.material.normalMap?.colorSpace};
  });
  const shots=[{name:'horizon',pitch:-8,yaw:0},{name:'top_seam',pitch:18,yaw:0},{name:'side',pitch:22,yaw:90},{name:'zenith',pitch:78,yaw:0}];
  for(const shot of shots){
    const data=await page.evaluate(s=>window.skyFrame(s.pitch,s.yaw),shot);
    fs.writeFileSync(path.join(out,shot.name+'.png'),Buffer.from(data,'base64'));
  }
  const video=path.join(episode,'output/sky_fusion_study_20261009.mp4');
  encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p',video],{stdio:['pipe','inherit','inherit'],windowsHide:true});
  const closed=once(encoder,'close');
  for(let frame=0;frame<180;frame++){
    const u=frame/179,pitch=-8+86*(.5-.5*Math.cos(Math.PI*u)),yaw=12*Math.sin(Math.PI*u);
    const data=await page.evaluate(({pitch,yaw,t})=>window.skyFrame(pitch,yaw,t),{pitch,yaw,t:frame/30});
    if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');
  }
  encoder.stdin.end();const [code]=await closed;if(code!==0)throw new Error('ffmpeg failed: '+code);
  if(errors.length)throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'sky_probe.json'),JSON.stringify({...info,shots,frames:180,fps:30,errors,video},null,2));
  console.log(JSON.stringify({shots:shots.length,frames:180,errors,video}));
} finally {
  if(encoder&&encoder.exitCode===null)encoder.kill();
  if(browser)await browser.close();server.close();
}
