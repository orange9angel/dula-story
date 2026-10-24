import {createAtlasPlayer} from './assets3d/art_pass_runtime/atlas-player.js';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),kind=new URLSearchParams(location.search).get('kind')??'walk';
const im=new Image();im.src='./assets3d/atlas_trials_r1/'+(kind==='walk'?'walk16':'expression6')+'.png';await im.decode();
const period=5.7*2/11,player=createAtlasPlayer(im,kind==='walk'?{columns:4,rows:4,count:16,period}:{columns:3,rows:2,exposures:[{frame:0,duration:1},{frame:1,duration:2/30},{frame:2,duration:3/30},{frame:3,duration:2/30},{frame:4,duration:2/30},{frame:5,duration:.7}]});
function label(text,x,y,size=22,color='#e4e6ef'){ctx.fillStyle=color;ctx.font=`${size}px Microsoft YaHei`;ctx.textAlign='center';ctx.fillText(text,x,y);}
window.renderAt=t=>{
 ctx.fillStyle='#1c2636';ctx.fillRect(0,0,1280,720);
 let frames;
 if(kind==='walk'){
  const frame=player.frameAt(t),eight=Math.floor(frame/2)*2;
  // Same generated atlas, same duration and crop: isolate the effect of frame count.
  ctx.fillStyle='#253143';ctx.fillRect(0,626,1280,94);ctx.fillStyle='#6a7480';ctx.fillRect(0,625,1280,1);
  for(const [i,index] of [eight,frame].entries()){
   const x=i*640;ctx.save();ctx.beginPath();ctx.rect(x,70,640,570);ctx.clip();
   player.draw(ctx,t,[x+130,122,380,506.6667],index);ctx.restore();
   label(i?'16 格完整循环':'同一组画，每隔一格：8 格',x+320,49);
   label(`第 ${index+1} 格`,x+320,672,18,'#aeb8ca');
  }
  ctx.fillStyle='#6a7480';ctx.fillRect(639,0,2,720);frames=[eight,frame];
 }else{
  const frame=player.draw(ctx,t,[350,65,580,580]);frames=[frame];
  label('六格眨眼与凝神 · 表情原画小样',640,40,22);label('固定机位，按曝光表换整格',640,690,18,'#aeb8ca');
 }
 return{image:canvas.toDataURL('image/png').split(',')[1],state:{kind,t,frames,period:player.period,mode:'whole-cell playback; no limb slicing or warping'}};
};
window.ready=true;
