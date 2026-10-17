import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bridge} from './bridge.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lyrics=fs.readFileSync(path.join(root,'config/song_lyrics.txt'),'utf8').trim();
const style=fs.readFileSync(path.join(root,'config/song_style.txt'),'utf8').trim();
if(style.length>1000)throw new Error('Style exceeds UI limit');
if(fs.existsSync(path.join(root,'config/suno_receipt.json')))throw new Error('Receipt exists; refusing duplicate generation');
bridge('network',{cmd:'start'});
bridge('cdp',{method:'Emulation.setFocusEmulationEnabled',params:{enabled:true}});
try{
  bridge('evaluate',{code:`(()=>{const e=document.querySelector('[role="textbox"][contenteditable="true"]');if(!e)throw new Error('Lyrics editor missing');e.focus();return e.getAttribute('aria-label');})()`});
  for(const params of [{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2},{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2},{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8},{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8}])bridge('cdp',{method:'Input.dispatchKeyEvent',params});
  const cleared=bridge('evaluate',{code:`document.querySelector('[role="textbox"][contenteditable="true"]').innerText.trim()`});
  if(cleared.value)throw new Error('Lyrics did not clear');
  bridge('cdp',{method:'Input.insertText',params:{text:lyrics}});
}finally{bridge('cdp',{method:'Emulation.setFocusEmulationEnabled',params:{enabled:false}});}
const verify=bridge('evaluate',{code:`document.querySelector('[role="textbox"][contenteditable="true"]').innerText.trim()`});
if(verify.value!==lyrics)throw new Error('Actual lyrics mismatch');
bridge('fill',{selector:'@e2001288',value:style});
bridge('fill',{selector:'@e2001313',value:'半拍晴天｜小蓝与阿澈'});
console.log(JSON.stringify({stage:'form_verified',characters:lyrics.length,lines:lyrics.split('\n').length,styleCharacters:style.length}));
bridge('click',{selector:'@e2001316'});
for(let i=0;i<8;i++){
  await new Promise(r=>setTimeout(r,4000));
  const list=bridge('network',{cmd:'list',filter:'generate'});
  const reqs=list.requests??[];
  for(const req of reqs.filter(r=>r.completed&&r.method==='POST')){
    const detail=bridge('network',{cmd:'detail',requestId:req.requestId});
    let body=detail.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{}
    const clips=body?.clips??body?.data?.clips??(Array.isArray(body)?body:null);
    if(clips?.some(c=>c.id)){
      const receipt={date:new Date().toISOString(),provider:'Suno',model:'v6 selected in UI',title:'半拍晴天',requestStatus:req.status,clips:clips.map(c=>({id:c.id,status:c.status,title:c.title,metadata:c.metadata?{prompt:c.metadata.prompt,tags:c.metadata.tags,duration:c.metadata.duration}:undefined}))};
      fs.writeFileSync(path.join(root,'config/suno_receipt.json'),JSON.stringify(receipt,null,2));
      console.log(JSON.stringify({stage:'submitted',ids:receipt.clips.map(c=>c.id)}));process.exit(0);
    }
    if(req.status>=400)throw new Error('Generation response HTTP '+req.status);
  }
}
console.log(JSON.stringify({stage:'generation_unconfirmed',note:'Do not repeat Create; inspect UI and captured network'}));process.exitCode=2;
