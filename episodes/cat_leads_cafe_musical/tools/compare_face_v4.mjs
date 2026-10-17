import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
const crops={
 Girl:{reference:[[335,0,650,960],[420,325,470,205],[405,440,480,480]],model:[[710,310,500,550],[805,530,315,150],[795,615,330,255]]},
 Boy:{reference:[[330,0,690,1010],[440,360,470,180],[435,460,480,540]],model:[[700,355,540,595],[795,610,330,145],[785,690,350,260]]}
};
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?capture=1',{waitUntil:'domcontentloaded'});
 for(const kind of ['Girl','Boy']) {
  const bytes=await page.evaluate(async({kind,crops})=>{
   const c=document.createElement('canvas');c.width=1080;c.height=1080;
   const ctx=c.getContext('2d');ctx.fillStyle='#f5f1e7';ctx.fillRect(0,0,c.width,c.height);
   const labels=['原始绘画（正面）','V3：修改前','V4：面部融合修订'];
   const urls=[`/assets/images/${kind.toLowerCase()}_portrait_v1.png`,`/storyboard/turns/final_v3/${kind}_0.jpg`,`/storyboard/turns/face_v4_final/${kind}_0.jpg`];
   const titles=['完整头颈','眉眼与邻近肤色','鼻口、耳颌与领口'];
   const ys=[0,430,660],heights=[430,230,420];
   for(let col=0;col<3;col++) {
    const im=new Image();im.src=urls[col];await im.decode();
    for(let row=0;row<3;row++) {
     const box=crops[col===0?'reference':'model'][row],scale=Math.min(344/box[2],(heights[row]-56)/box[3]);
     const w=box[2]*scale,h=box[3]*scale;
     ctx.fillStyle='#26394a';ctx.font='17px Microsoft YaHei';ctx.fillText(labels[col],col*360+10,ys[row]+22);
     ctx.font='13px Microsoft YaHei';ctx.fillText(titles[row],col*360+10,ys[row]+42);
     ctx.drawImage(im,...box,col*360+(360-w)/2,ys[row]+50,w,h);
    }
   }
   return c.toDataURL('image/jpeg',.94).split(',')[1];
  },{kind,crops:crops[kind]});
  fs.writeFileSync(`storyboard/face_v4/${kind}_reference_comparison.jpg`,Buffer.from(bytes,'base64'));
 }
 fs.writeFileSync('storyboard/face_v4/comparison_crops.json',JSON.stringify({crops,method:'Independent proportional scaling and translation only; frontal illustration is identity/style reference, not a calibrated orthographic projection. V4 head geometry is final; sleeves in the cached turn still predate the final sleeve correction.'},null,2));
 console.log('Two reference / V3 / V4 head and region comparisons written.');
} finally {await browser.close();}
