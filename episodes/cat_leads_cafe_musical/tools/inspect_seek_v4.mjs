import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?full=1&capture=1');await page.waitForFunction('window.ready',{timeout:60000});
 const result=await page.evaluate(async()=>{
  const t=1273/30;window.renderAt(t-1/30);const seq=window.renderAt(t);window.renderAt(100);const seek=window.renderAt(t);
  async function pixels(url){const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,c.width,c.height).data;}
  function diff(a,b){let count=0,max=0,abs=0,x0=1920,y0=1080,x1=0,y1=0;for(let i=0;i<a.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(a[i+k]-b[i+k]));if(d){count++;max=Math.max(max,d);abs+=d;const x=i/4%1920,y=Math.floor(i/4/1920);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}return{pixelsChanged:count,maxChannelDifference:max,meanMaxDifferenceOverImage:abs/(1920*1080),bounds:count?[x0,y0,x1,y1]:null};}
  const a=await pixels('data:image/jpeg;base64,'+seq.image),b=await pixels('data:image/jpeg;base64,'+seek.image),original=await pixels('/storyboard/craft3d_full_v4/frame_1273.jpg');
  return{time:t,sequentialVersusSeek:diff(a,b),originalVersusCurrent:diff(original,b),limbsIdentical:JSON.stringify(seq.limbs)===JSON.stringify(seek.limbs),stateIdentical:JSON.stringify(seq.state)===JSON.stringify(seek.state),seekImage:seek.image};
 });fs.writeFileSync('storyboard/face_v4/seek_42_433.jpg',Buffer.from(result.seekImage,'base64'));delete result.seekImage;fs.writeFileSync('config/seek_exception_v4.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
