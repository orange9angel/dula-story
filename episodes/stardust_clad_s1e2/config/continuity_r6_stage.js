// Episode registration: one right-arm drawing for the contact insert and wrist
// close-up. Damage is evaluated in the same local coordinates in both shots.
import {drawPropCracks,drawArmorDamage} from '../assets3d/art_pass_runtime/prop-damage.js';
export {slotPoint,drawFloorChannel,routeFires} from './continuity_r4_stage.js';
import {routeFires} from './continuity_r4_stage.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function makeRightShield(image,scar){
 const cache=new Map();
 return level=>{
  if(cache.has(level))return cache.get(level);
  const c=document.createElement('canvas');c.width=1536;c.height=1024;const g=c.getContext('2d');
  // Trace the actual outer silhouette. Do not reuse a damaged silhouette for an intact prop.
  g.beginPath();g.moveTo(0,130);g.bezierCurveTo(170,77,297,104,391,265);
  g.lineTo(365,281);g.bezierCurveTo(444,260,535,280,572,328);g.lineTo(600,348);
  g.lineTo(790,390);g.lineTo(817,370);g.lineTo(846,292);g.lineTo(875,263);g.lineTo(907,262);g.lineTo(947,275);
  g.bezierCurveTo(976,109,1039,8,1134,9);g.bezierCurveTo(1334,-5,1493,380,1487,773);
  g.bezierCurveTo(1486,938,1437,1014,1336,1008);g.bezierCurveTo(1166,993,1040,819,981,591);
  g.lineTo(954,573);g.lineTo(929,550);g.lineTo(874,531);g.lineTo(847,524);g.lineTo(802,536);g.lineTo(782,524);
  g.lineTo(601,570);g.lineTo(552,555);g.lineTo(500,546);g.lineTo(459,566);g.lineTo(356,525);
  g.lineTo(295,497);g.lineTo(246,509);g.lineTo(191,509);g.lineTo(128,477);g.lineTo(67,429);g.lineTo(0,337);g.closePath();g.clip();
  g.drawImage(image,0,0,1536,1024);
  drawPropCracks(g,{center:[1212,508],axisX:[196,-50],axisY:[124,474],widthRatio:.022,minWidth:.8,jagged:true},level);
  drawArmorDamage(g,{center:[658,466],axisX:[28,0],axisY:[0,61],clip:[[572,365],[775,401],[773,515],[601,560],[558,525],[539,467]],texture:scar},level);
  cache.set(level,c);return c;
 };
}
export function drawInsertMechanism(g,{t,state,T,gate,prop,effects,bgView,rect,damaged=false}){
 const point=p=>[rect[0]+p[0]/1672*rect[2],rect[1]+p[1]/941*rect[3]];
 const start=state.shieldMode==='test_lifting'?T.TEST_FREE:T.SHIELD_LIFT;
 const lifting=state.shieldMode.includes('lifting')||damaged&&t>=T.SHIELD_FREE;
 const lift=lifting?smooth((t-start)/.75):0;
 const lowering=damaged&&t<T.TRAP?1-smooth((t-(T.TRAP-.3))/.3):!damaged&&t<T.LATCH?1-smooth((t-14)/(T.LATCH-14)):0;
 const channel=[[1110,449],[850,555],[500,700],[0,875]].map(point);
 effects.drawStream(g,t,bgView,{points:channel,power:state.firePower,start:0,color:'#ff9c2e',seed:63,flow:true});
 routeFires(effects,g,t,bgView,channel,state.firePower,'insert-channel-');
 const xform=()=>{g.translate(640,360);g.rotate(bgView.roll);g.scale(bgView.z,bgView.z);g.translate(-bgView.cx,-bgView.cy);g.translate(rect[0],rect[1]);g.scale(rect[2]/1672,rect[3]/941);};
 if(damaged&&state.chainMode!=='stowed'){
  g.save();xform();const ps=[[0,875],[802,617],[1140,265]],broken=state.chainMode==='broken';g.lineWidth=4;g.strokeStyle='#b5a5b3';
  for(let seg=0;seg<2;seg++){const a=ps[seg],b=ps[seg+1];for(let i=0;i<22;i++){if(broken&&(seg===0&&i>18||seg===1&&i<3))continue;const u=i/22;g.save();g.translate(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u+(broken?18*lift*Math.sin(u*Math.PI):0));g.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));g.beginPath();g.ellipse(0,0,20,7,0,0,Math.PI*2);g.stroke();g.restore();}}g.restore();
 }
 g.save();xform();g.translate(-lift*35,-lift*220-lowering*140);
 g.drawImage(prop,802-1337*.9,628-1008*.9,1536*.9,1024*.9);g.restore();
 // Reuse the actual painted near lip as foreground occlusion, not a flat strip.
 g.save();xform();g.beginPath();g.moveTo(675,670);g.lineTo(970,548);g.lineTo(992,581);g.lineTo(696,702);g.closePath();g.clip();g.drawImage(gate,0,0,1672,941);g.restore();
 return{lift,lowering,shieldBottom:point([802-lift*35,628-lift*220-lowering*140]),slot:point([802,628]),mode:state.shieldMode,anatomicalArm:'right',outerRim:'complete',asset:'right_shield_raw'};
}
