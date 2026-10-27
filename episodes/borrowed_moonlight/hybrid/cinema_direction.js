// Shot-specific set dressing and atmosphere. Reusable primitives live in runtime.
import {radialLight,cloudTransmission,drawPaintedClouds,drawWeatherParticles} from './assets/draw_over_runtime/painted-weather.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export function backgroundAtmosphere(g,{t,shot,plate,camera,clouds}){
  const town=shot.scene==='snowtown',roof=shot.scene==='towertop'||shot.warm;
  if(town||roof)drawPaintedClouds(g,clouds,camera,t,{tower:roof,warm:t>=422});
  const moon=roof?[1690,100]:[1144,326];
  const p=camera.point(moon),transmission=cloudTransmission(t);
  if((town&&t<422)||roof){
    radialLight(g,p[0],p[1],(roof?150:210)*camera.scale,'#bdd4ff',.10*transmission);
  }
  if(town){
    const lamps=[[357,714],[506,750],[731,743],[1247,747],[1490,749]];
    lamps.forEach((w,i)=>{
      const xy=camera.point(w),k=.8+.12*Math.sin(t*1.7+i)+.06*Math.sin(t*4.1+i*2);
      radialLight(g,xy[0],xy[1],48*camera.scale,'#ffbd66',.18*k);
      const ground=camera.point([w[0],806]);
      radialLight(g,ground[0],ground[1],75*camera.scale,'#ffbb75',.045*k);
    });
  }
  if(shot.scene==='clocktower'){
    const p=camera.point([1017,713]);
    radialLight(g,p[0],p[1],120*camera.scale,'#ffc771',.18*(.85+.1*Math.sin(t*2.2)+.05*Math.sin(t*5.3)));
  }
  if(shot.warm){g.save();g.globalCompositeOperation='soft-light';g.fillStyle='rgba(255,197,123,.35)';g.fillRect(0,0,1280,720);g.restore();}
  return {transmission};
}
export function particles(g,t,shot,front){
  if(shot.scene==='snowtown'){
    const m=clamp((t-400)/8),outro=1-clamp((t-456)/7);
    drawWeatherParticles(g,t,{kind:'snow',foreground:front,strength:(1-m)*outro,wind:1+.8*clamp((t-51)/2)*clamp((57-t)/2)});
    if(m)drawWeatherParticles(g,t,{kind:'petal',foreground:front,strength:m*outro});
  }else if(!front)drawWeatherParticles(g,t,{kind:'dust',strength:shot.scene==='clocktower'?.4:.25,wind:.4});
}
export function drawDoor(g,plate,camera,t){
  if(t<84||t>=91)return;
  const k=clamp((t-85)/1.8),p=camera.point([941,704]),s=camera.scale;
  g.save();g.translate(p[0],p[1]);g.scale(s,s);
  g.beginPath();g.roundRect(0,0,51,75,[24,24,0,0]);g.clip();
  const q=g.createLinearGradient(0,0,51,0);q.addColorStop(0,'#30271f');q.addColorStop(.65,'#b17b43');q.addColorStop(1,'#ecd39a');g.fillStyle=q;g.fillRect(0,0,51,75);
  g.drawImage(plate,941,704,51,75,0,0,Math.max(1,51*(1-k)),75);g.restore();
  const p2=camera.point([967,782]);radialLight(g,p2[0],p2[1],80*s,'#ffbd6c',k*.17);
}
export function tableOcclusion(g,plate,camera,erase=false){
  // Actual tabletop/front, excluding the wall behind the actor.
  const polygon=[[795,784],[822,754],[1128,750],[1145,792],[1140,850],[1103,854],[1105,909],[1090,913],[1083,854],[844,853],[834,910],[815,910],[816,850],[799,845]];
  g.save();g.translate(camera.x,camera.y);g.scale(camera.scale,camera.scale);g.beginPath();polygon.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();if(erase)g.clearRect(0,0,1920,1080);else g.drawImage(plate,0,0);g.restore();
}
