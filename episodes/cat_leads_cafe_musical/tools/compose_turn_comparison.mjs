import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),puppeteer=require('puppeteer'),browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{const p=await browser.newPage();await p.goto('http://127.0.0.1:4235/craft3d/viewer.html?capture=1',{waitUntil:'domcontentloaded'});
 const base64=await p.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=1440;c.height=1080;const x=c.getContext('2d');x.fillStyle='#f5f1e7';x.fillRect(0,0,c.width,c.height);
  const specs=[];for(const [i,kind] of ['Girl','Boy'].entries()){
   specs.push({row:i*2,col:0,url:`/assets/images/${kind.toLowerCase()}_portrait_v1.png`,label:'原画：正面身份',crop:null});
   specs.push({row:i*2,col:1,url:`/storyboard/turns/accepted_v2/${kind}_0.jpg`,label:'已认可：正面',crop:[720,190,500,650]});
   specs.push({row:i*2,col:2,url:`/storyboard/turns/final_v3/${kind}_0.jpg`,label:'细化后：正面',crop:[720,190,500,650]});
   specs.push({row:i*2,col:3,url:`/storyboard/turns/final_v3/${kind}_90.jpg`,label:'细化后：侧面',crop:[720,190,500,650]});
   specs.push({row:i*2+1,col:0,url:`/assets/images/${kind.toLowerCase()}_rear_hair_v2.png`,label:'新生产绘画：后发',crop:null});
   specs.push({row:i*2+1,col:1,url:`/storyboard/turns/accepted_v2/${kind}_180.jpg`,label:'原背面：缺发/拉伸',crop:[720,190,500,650]});
   specs.push({row:i*2+1,col:2,url:`/storyboard/turns/final_v3/${kind}_180.jpg`,label:'细化后：后脑和后发',crop:[720,190,500,650]});
   specs.push({row:i*2+1,col:3,url:`/storyboard/turns/final_v3/${kind}_270.jpg`,label:'细化后：另一侧',crop:[720,190,500,650]});
  }
  for(const s of specs){const im=new Image();im.src=s.url;await im.decode();const box=s.crop??[0,0,im.width,im.height],scale=Math.min(350/box[2],230/box[3]),w=box[2]*scale,h=box[3]*scale,xx=s.col*360,yy=s.row*270;x.drawImage(im,...box,xx+(360-w)/2,yy+28,w,h);x.fillStyle='#26394a';x.font='17px Microsoft YaHei';x.fillText(s.label,xx+12,yy+22);}
  return c.toDataURL('image/jpeg',.94).split(',')[1];
 });fs.writeFileSync('storyboard/turns/reference_baseline_current.jpg',Buffer.from(base64,'base64'));
}finally{await browser.close();}
