// This episode's visible story mechanisms. State comes from script cues.
export const slotPoint=[520,625];
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const propOutline=[[694,0],[1180,0],[1158,170],[1103,320],[1110,319],[1175,337],[1190,363],[1204,350],[1260,343],[1310,317],[1375,258],[1410,209],[1477,169],[1508,143],[1595,88],[1596,63],[1616,45],[1634,34],[1632,0],[1672,0],[1672,410],[1635,414],[1610,432],[1493,466],[1310,499],[1296,507],[1230,532],[1200,520],[1100,548],[1060,550],[980,557],[850,625],[802,649],[797,602],[738,586],[666,589],[621,565],[603,515],[588,447],[586,364],[592,285],[611,200],[650,90]];
const path=(g,pts,fill)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();if(fill){g.fillStyle=fill;g.fill();}};
export function routeFires(effects,g,t,view,points,power,id){
 const defs=[];for(let i=0;i<35;i++){const r=(Math.sin(i*31.17+1)*317.53)%1,q=Math.max(0,Math.min(1,(i+.5+r*.8)/35))*(points.length-1),j=Math.min(points.length-2,Math.floor(q)),u=q-j;defs.push({id:id+i,base:[points[j][0]*(1-u)+points[j+1][0]*u,points[j][1]*(1-u)+points[j+1][1]*u],scale:.16+Math.abs(r)*.22,widthScale:2.5+Math.abs(r)*2,power:Math.max(.08,power)*(.3+Math.abs(r)*.2),seed:71+i*3});}effects.drawFire(g,t,view,defs);
}
export function makeInsertProp(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const q=c.getContext('2d');q.scale(c.width/1672,c.height/941);path(q,propOutline);q.clip();q.drawImage(image,0,0,1672,941);return c;}
export function drawFloorChannel(g,{t,state,view,effects,transform,front=false}){
 if(front){if(['wedged','lifting'].includes(state.shieldMode)){g.save();transform();path(g,[[499,627],[539,619],[542,626],[503,635]],'#59432e');g.restore();}return;}
 g.save();transform();
 path(g,[[113,705],[1044,530],[1031,518],[102,679]],'#6b4b30');
 path(g,[[116,697],[1036,528],[1030,522],[109,685]],'#151420');
 g.strokeStyle='#a16b38';g.lineWidth=2;g.beginPath();g.moveTo(113,700);g.lineTo(1040,529);g.stroke();
 g.restore();
 const points=[[1030,526],[750,575],slotPoint,[300,665],[115,692]];
 effects.drawStream(g,t,view,{points,power:state.firePower*.7,start:0,color:'#ffac3c',seed:57,flow:true});
 routeFires(effects,g,t,view,points,state.firePower,'hall-channel-');
}
export function drawInsertMechanism(g,{t,state,T,gate,prop,effects,bgView,rect,damaged=false}){
 const point=p=>[rect[0]+p[0]/1672*rect[2],rect[1]+p[1]/941*rect[3]];
 const start=state.shieldMode==='test_lifting'?T.TEST_FREE:T.SHIELD_LIFT;
 const lifting=state.shieldMode.includes('lifting')||damaged&&t>=T.SHIELD_FREE;
 const lift=lifting?smooth((t-start)/.75):0;
 const lowering=damaged&&t<T.TRAP?1-smooth((t-(T.TRAP-.3))/.3):!damaged&&t<T.LATCH?1-smooth((t-14)/(T.LATCH-14)):0;
 const channel=[[1110,449],[850,555],[500,700],[0,875]].map(point);
 effects.drawStream(g,t,bgView,{points:channel,power:state.firePower,progress:1,start:0,color:'#ff9c2e',seed:63,flow:true});
 routeFires(effects,g,t,bgView,channel,state.firePower,'insert-channel-');
 const xform=()=>{g.translate(640,360);g.rotate(bgView.roll);g.scale(bgView.z,bgView.z);g.translate(-bgView.cx,-bgView.cy);g.translate(rect[0],rect[1]);g.scale(rect[2]/1672,rect[3]/941);};
 if(damaged&&state.chainMode!=='stowed'){
  g.save();xform();const ps=[[0,875],[680,610],[1140,265]],broken=state.chainMode==='broken';g.lineWidth=4;g.strokeStyle='#b5a5b3';
  for(let seg=0;seg<2;seg++){const a=ps[seg],b=ps[seg+1];for(let i=0;i<22;i++){if(broken&&(seg===0&&i>18||seg===1&&i<3))continue;const u=i/22,fall=broken?18*lift*Math.sin(u*Math.PI):0;g.save();g.translate(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u+fall);g.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));g.beginPath();g.ellipse(0,0,20,seg%2?8:7,0,0,Math.PI*2);g.stroke();g.restore();}}g.restore();
 }
 g.save();xform();g.translate(lift*80,-lift*220-lowering*140);g.drawImage(prop,0,0,1672,941);g.restore();
 return{lift,lowering,shieldBottom:point([802+lift*80,649-lift*220-lowering*140]),slot:point([802,649]),mode:state.shieldMode};
}
