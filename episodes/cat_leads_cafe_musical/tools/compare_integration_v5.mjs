import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
const dir='storyboard/integration_v5';fs.mkdirSync(dir,{recursive:true});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?capture=1');
 for(const kind of ['Girl','Boy']){
  const data=await page.evaluate(async kind=>{
   const c=document.createElement('canvas');c.width=1440;c.height=1030;const x=c.getContext('2d');x.fillStyle='#f5f1e7';x.fillRect(0,0,c.width,c.height);
   const image=async u=>{const i=new Image();i.src=u;await i.decode();return i;};
   const tile=async(u,box,dx,dy,w,h,label)=>{const i=await image(u),s=Math.min(w/box[2],(h-40)/box[3]);x.drawImage(i,...box,dx+(w-box[2]*s)/2,dy+40,box[2]*s,box[3]*s);x.fillStyle='#23364b';x.font='19px Microsoft YaHei';x.fillText(label,dx+10,dy+26);};
   const old='/storyboard/turns/face_v4_final/',now='/storyboard/turns/integration_v5r5/';
   await tile(`/assets/images/${kind.toLowerCase()}_portrait_v1.png`,kind==='Girl'?[335,0,650,960]:[330,0,690,1010],0,0,480,500,'原画：正面身份和比例基准');
   await tile(old+kind+'_0.jpg',[700,300,540,660],480,0,480,500,'V4：旧头部');
   await tile(now+kind+'_0.jpg',[700,300,540,660],960,0,480,500,'V5：保留前图尺寸，收后脑');
   for(const [j,a] of [90,180,270].entries()){
    await tile(old+kind+'_'+a+'.jpg',[650,290,600,650],j*480,500,240,530,`V4 ${a}°`);
    await tile(now+kind+'_'+a+'.jpg',[650,290,600,650],j*480+240,500,240,530,`V5 ${a}°`);
   }
   return c.toDataURL('image/jpeg',.94).split(',')[1];
  },kind);fs.writeFileSync(`${dir}/${kind}_comparison.jpg`,Buffer.from(data,'base64'));
 }
 const body=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=1200;c.height=720;const x=c.getContext('2d');x.fillStyle='#f5f1e7';x.fillRect(0,0,c.width,c.height);
  const items=[['/assets/images/girl_body_v1.png',[290,280,450,650],'原画：衣腰比例（姿态不同）'],['/storyboard/craft3d_full_v4/frame_0804.jpg',[650,520,540,480],'V4：26.8 秒腰缝'],['/storyboard/integration_v5/blink_26.8.jpg',[650,520,540,480],'V5：同一时刻腰部与手臂']];
  for(const [col,[u,b,label]] of items.entries()){const im=new Image();im.src=u;await im.decode();const s=Math.min(380/b[2],640/b[3]);x.drawImage(im,...b,col*400+(400-b[2]*s)/2,55,b[2]*s,b[3]*s);x.fillStyle='#26394a';x.font='18px Microsoft YaHei';x.fillText(label,col*400+10,30);}
  return c.toDataURL('image/jpeg',.94).split(',')[1];
 });fs.writeFileSync(`${dir}/waist_comparison.jpg`,Buffer.from(body,'base64'));
 console.log('Source / V4 / V5 head, waist and side/rear comparisons written.');
}finally{await browser.close();}
