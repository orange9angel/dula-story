// P2 角色定妆帧生成：正面/四分之三/侧面同机位 + 最难姿势 + 表情最小集。
// 用法：node tools/check_characters.mjs [--board storyboard/p2]
// 输出 <board>/<shot>.jpg（每张都是双渲染沉淀帧），供逐张目检。
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {once} from 'node:events';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),storyRoot=path.resolve(root,'../..');
const require=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');
const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:null;};
const board=path.join(root,opt('--board')??'storyboard/p2');
fs.mkdirSync(board,{recursive:true});

const SHOTS=[
  // 艾琳：三视角定妆 + 最难姿势（递灯）+ 走/抬头/抱瓶 + 五表情
  {name:'eileen_front',who:'Eileen',pose:'stand',view:'front'},
  {name:'eileen_threeq',who:'Eileen',pose:'stand',view:'threeq'},
  {name:'eileen_side',who:'Eileen',pose:'stand',view:'side'},
  {name:'eileen_offer_lamp',who:'Eileen',pose:'offer_lamp',view:'front',dist:2.0},
  {name:'eileen_offer_lamp_side',who:'Eileen',pose:'offer_lamp',view:'side',dist:2.0},
  {name:'eileen_walk',who:'Eileen',pose:'walk',view:'threeq'},
  {name:'eileen_look_up',who:'Eileen',pose:'look_up',view:'threeq'},
  {name:'eileen_hold_bottle',who:'Eileen',pose:'hold_bottle',view:'front',dist:2.0},
  {name:'eileen_face_curious',who:'Eileen',pose:'stand',view:'face',emotion:'curious'},
  {name:'eileen_face_lonely',who:'Eileen',pose:'stand',view:'face',emotion:'lonely'},
  {name:'eileen_face_tearful',who:'Eileen',pose:'stand',view:'face',emotion:'tearful'},
  {name:'eileen_face_smile',who:'Eileen',pose:'stand',view:'face',emotion:'smile'},
  {name:'eileen_face_determined',who:'Eileen',pose:'stand',view:'face',emotion:'determined'},
  // 奥尔德：三视角 + 摸怀表 + 三表情
  {name:'alder_front',who:'Alder',pose:'stand',view:'front'},
  {name:'alder_threeq',who:'Alder',pose:'stand',view:'threeq'},
  {name:'alder_side',who:'Alder',pose:'stand',view:'side'},
  {name:'alder_touch_watch',who:'Alder',pose:'touch_watch',view:'threeq',dist:2.2},
  {name:'alder_face_dazed',who:'Alder',pose:'stand',view:'face',emotion:'dazed'},
  {name:'alder_face_shocked',who:'Alder',pose:'stand',view:'face',emotion:'shocked'},
  {name:'alder_face_relieved',who:'Alder',pose:'stand',view:'face',emotion:'relieved'},
  // 月亮夫人：三视角 + 坐姿 + 缓慢抬手 + 两表情
  {name:'ladymoon_front',who:'LadyMoon',pose:'stand',view:'front'},
  {name:'ladymoon_threeq',who:'LadyMoon',pose:'stand',view:'threeq'},
  {name:'ladymoon_side',who:'LadyMoon',pose:'stand',view:'side'},
  {name:'ladymoon_sit',who:'LadyMoon',pose:'sit',view:'threeq',dist:2.8},
  {name:'ladymoon_slow_raise',who:'LadyMoon',pose:'slow_raise',view:'front',dist:2.8},
  {name:'ladymoon_face_weary',who:'LadyMoon',pose:'stand',view:'face',emotion:'weary'},
  {name:'ladymoon_face_revived',who:'LadyMoon',pose:'stand',view:'face',emotion:'revived'},
  // A4：m46 背面递灯 cel 的 3D 姿势参考（背面三四分，仅锁姿势）
  {name:'a4_eileen_offer_lamp_back',who:'Eileen',pose:'offer_lamp',view:'backq',dist:2.0},
  {name:'a4_eileen_offer_lamp_back_hi',who:'Eileen',pose:'offer_lamp',view:'backq_hi',dist:2.2},
];
const only=opt('--only')?.split(',');
const shots=only?SHOTS.filter(s=>only.includes(s.name)):SHOTS;

const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);let mount=root,relative=url.replace(/^\//,'');
  if(url==='/favicon.ico'){res.writeHead(204).end();return;}
  if(url.startsWith('/node_modules/'))mount=storyRoot;
  const target=path.resolve(mount,relative),rel=path.relative(mount,target);
  if(rel.startsWith('..')||path.isAbsolute(rel)){res.writeHead(403).end();return;}
  if(!fs.existsSync(target)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(target).pipe(res);
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}/tools/check_characters.html`;
let browser;
try{
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message);});
  page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
  page.on('response',r=>{if(r.status()>=400)console.error(`HTTP ${r.status()} ${r.url()}`);});
  await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto(url,{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready===true',{timeout:60000});
  for(const s of shots){
    const b64=await page.evaluate(spec=>window.shot(spec),s);
    fs.writeFileSync(path.join(board,`${s.name}.jpg`),Buffer.from(b64,'base64'));
    console.log('shot',s.name);
  }
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(`check_characters complete: ${shots.length} frames -> ${board}`);
}finally{if(browser)await browser.close();server.close();}
