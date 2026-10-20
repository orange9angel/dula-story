import * as THREE from 'three';
import {neutral,clamp,ease,mix,pulse} from './pose.js';
import {wellStairGround} from './layout.js';
export const CAST_NAMES={xiaozao:'小凿',jianwang:'缄网',weihe:'苇禾',yabo:'崖伯',mideng:'弥灯'};
const V=(x,y,z)=>({x,y,z}),TAU=Math.PI*2;
export const ordinal=id=>id==='B49'?17.5:id==='B50'?26.5:id==='END'?49:Number(id.slice(1));
const CAST={
 B01:['weihe','yabo'],B02:['xiaozao','mideng'],B03:['xiaozao','weihe'],B04:['xiaozao','weihe'],
 B05:['xiaozao','jianwang','weihe'],B06:['xiaozao','jianwang','weihe','mideng'],B07:['weihe','yabo'],
 B08:['xiaozao','jianwang'],B09:['weihe','yabo','mideng'],B10:['xiaozao','jianwang','mideng'],
 B11:['xiaozao','jianwang','mideng'],B12:['xiaozao','weihe','yabo','mideng'],B13:['weihe','yabo','mideng'],
 B14:['xiaozao','jianwang','mideng'],B15:['xiaozao','jianwang'],B16:['weihe','yabo','mideng'],B17:['weihe','yabo','mideng'],
 B49:['weihe','yabo'],B18:['xiaozao','jianwang','mideng'],B19:['xiaozao','weihe','yabo','mideng'],
 B20:['xiaozao','weihe','mideng'],B21:['xiaozao','weihe','yabo','mideng'],B22:['xiaozao','weihe','yabo','mideng'],
 B23:['jianwang','yabo'],B24:['xiaozao','jianwang','weihe','yabo','mideng'],B25:['xiaozao','weihe','jianwang'],
 B26:['xiaozao','jianwang','weihe','yabo','mideng'],B50:['xiaozao','jianwang','weihe','yabo','mideng'],
 B27:['xiaozao','jianwang','weihe','yabo','mideng'],B28:['xiaozao','jianwang','weihe'],
 B29:['xiaozao','jianwang','weihe','mideng'],B30:['xiaozao','jianwang'],
 B31:['weihe','yabo','mideng'],B32:['weihe','yabo','mideng'],B33:['xiaozao','jianwang'],
 B34:['weihe','mideng'],B35:['xiaozao','jianwang'],B36:['xiaozao','jianwang','weihe','yabo','mideng'],
 B37:['xiaozao','jianwang','weihe','yabo','mideng'],B38:['xiaozao','jianwang','weihe','yabo','mideng'],
 B39:['xiaozao','jianwang','weihe','yabo','mideng'],B40:['xiaozao','jianwang','weihe','yabo','mideng'],
 B41:['xiaozao','jianwang','weihe','yabo','mideng'],B42:['xiaozao','jianwang','weihe','yabo','mideng'],
 B43:['xiaozao','jianwang','weihe','yabo','mideng'],B44:['xiaozao','jianwang','weihe','yabo','mideng'],
 B45:['xiaozao','weihe','yabo','mideng'],B46:['xiaozao','weihe','yabo','mideng'],
 B47:['xiaozao','weihe','yabo','mideng'],B48:['xiaozao','weihe'],END:['xiaozao','weihe','yabo','mideng']
};
const HOME={
 market:{xiaozao:[-.52,.45,.28],jianwang:[.95,-.35,-.4],weihe:[.55,.25,-.32],yabo:[-1.3,-.3,.5],mideng:[1.4,-.65,-.45]},
 courtyard:{xiaozao:[-.62,.35,.58],jianwang:[.72,.10,-.58],weihe:[-1.6,.40,.45],yabo:[-1.7,-.65,.4],mideng:[1.7,-.35,-.4]},
 store:{xiaozao:[-.65,.65,.4],jianwang:[1.6,.65,-.55],weihe:[.7,.65,-.4],yabo:[-1.8,.55,.35],mideng:[1.65,1.15,-.4]},
 greenhouse:{xiaozao:[-.62,.6,.42],jianwang:[1.2,.7,-.5],weihe:[.58,.6,-.42],yabo:[-1.6,-.2,.55],mideng:[1.3,-.75,-.35]},
 bridge:{xiaozao:[-.65,0,1.12],jianwang:[1.2,0,-1.1],weihe:[.55,0,-1.12],yabo:[-4.65,.4,1.1],mideng:[-4.65,-.5,1.1]},
 windwell:{xiaozao:[-.38,.40,-.12],jianwang:[.60,.45,.05],weihe:[-1.65,.35,Math.PI],yabo:[1.30,-.65,-.4],mideng:[2.35,-.5,-.5]}
};
function at(o,x,z,yaw=null){o.rootX=x;o.rootZ=z;if(yaw!==null)o.yaw=yaw;return o;}
function walk(o,from,to,t,start,end,{facing=null,drop=.03,crouched=false}={}){
 const u=clamp((t-start)/(end-start)),p=ease(u),dx=to[0]-from[0],dz=to[1]-from[1];
 if(Math.hypot(dx,dz)<.001)return;
 o.rootX=mix(from[0],to[0],p);o.rootZ=mix(from[1],to[1],p);
 o.yaw=facing??Math.atan2(dx,dz);o.walk=u>0&&u<1?{from,to,facingYaw:o.yaw,settle:ease((u-.94)/.06)}:null;o.feetZ=[0,0];o.drop=(crouched?drop:drop*.35)+.006*Math.sin(Math.PI*u);
 o.lean=.045*Math.sin(Math.PI*u);o.headPitch=-.02*Math.sin(Math.PI*u);
}
function gesture(o,kind,u=1,strength=1){
 const d=strength*u,y=o.shoulderY;
 if(kind==='explain'){o.right=V(mix(o.right.x,.19,d),mix(o.right.y,y-.10,d),mix(o.right.z,.23,d));o.open=mix(o.open,.42,d);o.headRoll=-.018*d;}
 if(kind==='point'){o.right=V(mix(o.right.x,.18,d),mix(o.right.y,y-.04,d),mix(o.right.z,.31,d));o.point=d;o.headYaw=-.06*d;}
 if(kind==='hold'){o.left=V(-.14,y-.12,.24);o.right=V(.14,y-.12,.24);o.fist=.36;o.open=.13;}
 if(kind==='guard'){o.left=V(-.14,y-.03,.22);o.right=V(.14,y+.02,.20);o.fist=.9;o.open=0;o.drop+=.045*d;o.lean=-.035*d;}
 if(kind==='pull'){o.left=V(-.12,y-.04,.25);o.right=V(.12,y-.04,.25);o.drop+=.09*d;o.lean=-.13*d;o.fist=.85;o.open=0;o.focus=.85;}
 if(kind==='inspect'){o.left=V(-.08,y-.17,.25);o.right=V(.09,y-.13,.23);o.headPitch=.14*d;o.focus=.45;o.fist=.2;}
 if(kind==='pain'){o.left=V(-.15,y-.20,.19);o.right=V(.02,y-.18,.26);o.headPitch=.08*d;o.lean=.055*d;o.focus=.65;o.fear=.16;}
 if(kind==='crouch'){o.drop+=.26*d;o.lean=.17*d;o.left.y-=.055*d;o.right.y-=.055*d;o.headPitch=.13*d;}
 if(kind==='stop'){o.right=V(.16,y-.02,.27);o.open=.68;o.fist=.05;o.focus=.75;}
 if(kind==='thread'){o.right=V(.21,y-.01,.23);o.left=V(-.19,y-.08,.17);o.point=.48;o.fist=.2;o.open=.40;o.headPitch=-.025;}
 if(kind==='listen'){o.headPitch=-.04*d;o.headRoll=.055*d;o.focus=.43;o.right.z+=.04*d;}
 if(kind==='kneel'){o.drop+=.32*d;o.lean=.12*d;o.left=V(-.15,y-.28,.25);o.right=V(.16,y-.28,.23);o.headPitch=.08*d;}
}
function weight(o,t,amount=.025){o.drop+=amount*(.6+.4*Math.sin(t*1.05));o.headPitch+=.012*Math.sin(t*.8);o.lean+=.012*Math.sin(t*.95);}
function localToWorld(actor,s,p){
 const v=new THREE.Vector3(p.x,p.y,p.z).multiply(actor.mesh.scale).applyAxisAngle(new THREE.Vector3(0,1,0),s.yaw);
 return V(v.x+s.rootX,v.y+(s.rootY??0),v.z+s.rootZ);
}
export function createPerformance(actors,timeline,envelopes){
 const beats=timeline.beats,byId=Object.fromEntries(beats.map(b=>[b.id,b])),lines=Object.fromEntries(timeline.lines.map(l=>[l.id,l])),env=Object.fromEntries(envelopes.lines.map(l=>[l.id,l]));
 const cue=(id,after=0)=>{const l=lines[id];return l?l.start+after:0;};
 const end=id=>lines[id]?.audio_end??0;
 const impacts=[
  ['cut','B04_03',.24,'xiaozao','thread'],['guard','B11_07',.20,'jianwang','xiaozao'],
  ['chest','B15_06',.20,'xiaozao','jianwang'],['strike','B29_06',.22,'xiaozao','jianwang'],
  ['counter','B30_06',null,'xiaozao','jianwang']
 ].filter(x=>lines[x[1]]).map(([id,line,offset,attacker,target])=>({id,line,beat:lines[line].beat,time:offset===null?end(line)-.14:cue(line,offset),attacker,target}));
 impacts.push({id:'low-kick',line:'B29_04',beat:'B29',time:end('B29_04')+2,attacker:'xiaozao',target:'jianwang',type:'kick',side:'right'});
 const b33=byId.B33;
 for(const[i,offset]of[1.7,3.1,4.7].entries())impacts.push({id:'three-'+i,beat:'B33',time:b33.start+offset,attacker:'jianwang',target:'xiaozao',variant:i,side:i===1?'left':'right'});
 const exchanges=[
  ['B11',8,4.0,'jianwang','left','guard'],
  ['B15',4,3.0,'xiaozao','right','guard'],
  ['B15',8,2.7,'xiaozao','left','guard'],
  ['B15',8,7.4,'jianwang','right','guard'],
  ['B29',0,3.0,'jianwang','left','guard'],
  ['B29',8,3.0,'xiaozao','left','guard'],
  ['B29',8,7.0,'jianwang','right','guard'],
  ['B30',0,3.0,'jianwang','left','guard'],
  ['B30',8,3.0,'xiaozao','right','guard'],
  ['B30',8,7.8,'jianwang','left','guard'],
  ['B33',4,3.0,'jianwang','right','guard']
 ];
 for(const [beat,after,offset,attacker,side,zone]of exchanges){
  const a=byId[beat].actions.find(a=>a.afterLine===after);
  impacts.push({id:`exchange-${beat}-${after}-${offset}`,beat,time:a.start+offset,attacker,target:attacker==='xiaozao'?'jianwang':'xiaozao',side,zone});
 }
 const jump=cue('B42_07',.10),catchTime=jump+1.05;
 const waves=[cue('B40_02',.15),end('B40_06')+.5,end('B40_09')+.65];
 const eventTimes={impacts,jump,catch:catchTime,release:end('B40_09')+.65,waves};
 function sample(t){
  t=Math.max(0,Math.min(timeline.duration-.0001,t));
  const b=beats.find(b=>t>=b.start&&t<b.end)??beats.at(-1),n=ordinal(b.id),lt=t-b.start,bt=b.end-b.start;
  const active=timeline.lines.find(l=>t>=l.start&&t<l.end),spoken=active&&t<active.audio_end?active:null;
  const action=b.actions.find(a=>t>=a.start&&t<a.end),aU=action?clamp((t-action.start)/(action.end-action.start)):0;
  const before=timeline.lines.filter(l=>l.beat===b.id&&l.start<=t).at(-1);
  const states={},onscreen=CAST[b.id]??[],isFight=[4,11,15,29,30,33].includes(n);
  const visible=new Set(onscreen);
  for(const name of Object.keys(actors)){
   const a=actors[name],p=HOME[b.scene]?.[name]??[0,0,0],s=neutral(a,...p);
   s.visible=visible.has(name);s.wind=n>=36&&n<=42?1.2:n>=3&&n<43?.6:.35;
   if(b.scene==='windwell'&&name==='yabo')s.rootY=.60;
   if(b.scene==='windwell'&&name==='mideng')s.rootY=.50;
   s.focus=n>=3&&n<=42?.38:.20;
   s.blink=pulse((t+name.length*.39)%5.17,4.55,4.63,4.66,4.76);
   s.headPitch=.008*Math.sin(t*1.4+name.length);
   // Breath changes the torso by millimetres, not the whole planted character.
   s.lean+=.004*Math.sin(t*2.1+name.length);
   s.lagYaw=-s.headYaw*.22;s.lagPitch=-s.headPitch*.2;
   if(name==='xiaozao'&&n>=18){s.left=V(-.17,1.06,.19);s.focus=.42;}
   if(name==='jianwang'&&n>=39){s.left=V(-.17,1.27,.18);s.focus=.45;}
   states[name]=s;
  }
  const h=states.xiaozao,j=states.jianwang,w=states.weihe,y=states.yabo,m=states.mideng;
  const story={wind:n>=36&&n<=42?1.5:.65,locked:n>=5&&n<43,silenced:n>=3&&n<43,cold:n>=9&&n<43,pressure:n<18?.3:n<40?.7:.2,gate:0,discBroken:n<18?0:n<30?1:n<37?2:n<40?3:n<43?6:6,
   discSide:n<35?'left':'right',discPlaced:n>=36&&n<=42,injured:n>=18,bracerLost:n>=35,threadMode:n>=3&&n<39?'web':'none',
   lampHeld:true,lampOn:!(n>=34&&n<43),residents:[],toolbox:false,door:1,heatBurst:0,platformDrop:0,platformTilt:0,
   glassBroken:n>19||n===19&&lt>=2,glassBreakTime:byId.B19.start+2,
   marketDamage:ease((t-cue('B28_01',2.8))/1.3)};
  const near=(s,anchor,side='right',offset=[0,0,0])=>{s.worldHands??={};s.worldHands[side]=V(anchor[0]+offset[0],anchor[1]+offset[1],anchor[2]+offset[2]);};
  const key=(num,offset=0)=>cue(`${b.id}_${String(num).padStart(2,'0')}`,offset);
  const prog=(a,c)=>ease((t-a)/(c-a));
  // Per-line direction: one purposeful gesture, then settle; listeners keep attention on the speaker.
  if(active&&states[active.speaker]){
   const s=states[active.speaker],u=t-active.start,D=active.audio_end-active.start,gest=pulse(u,.12,.45,Math.max(.5,D-.5),D+.22);
   const text=active.text;
   if(/喝|哈——|给我——开|压——/.test(text)){gesture(s,'guard',1);s.focus=.88;s.fear=.12;s.headPitch=-.06;s.lean+=.07*gest;}
   else if(/别动|停！|等等|等一下|不许/.test(text))gesture(s,'stop',gest,.8);
   else if(/看|那根|那边|这里|左边|右边/.test(text))gesture(s,'point',gest,.65);
   else if(/手|伤|疼|碰/.test(text)&&n>=18)gesture(s,'pain',gest,.6);
   else if(/为什么|不可能|以为|猜|保证|不会/.test(text)){gesture(s,'explain',gest,.70);s.focus=.55;s.browAsym=.27;}
   else if(/好。|认得|借可以|利息|骂|生意|嘴|吃饭|账/.test(text)){s.smile=.28*gest;s.headRoll=-.025*gest;gesture(s,'explain',gest,.40);}
   else{gesture(s,'explain',gest,.32);s.headPitch+=.018*gest;}
   s.headYaw+=.025*gest;s.blink*=1-gest*.8;
  }
  if(spoken){
   const e=env[spoken.id],u=(t-spoken.start)/e.dt,i=Math.floor(u),a=u-i;
   states[spoken.speaker].jaw=mix(e.jaw[i]??0,e.jaw[i+1]??0,a);
  }
  if(n===1){
   at(w,.35,.45,-.28);at(y,-.65,.3,.35);
   if(lt<5)at(w,.20,-1.36,Math.PI);
   else if(lt<10)walk(w,[.20,-1.36],[.35,.45],t,b.start+5,b.start+10,{facing:.10});
   const knock=prog(b.start+.8,b.start+2),release=1-prog(b.start+3.4,b.start+4.2);
   w.right=V(.16,mix(1.02,1.58,knock*release),mix(.09,.26,knock*release));w.headPitch=-.12*knock*release;
   if(lt>1.2&&lt<3.4){
    const taps=pulse(lt,1.65,1.8,1.82,1.98)+pulse(lt,2.15,2.3,2.32,2.48);
    w.worldHands={right:V(.02,1.48,-1.57-.04*taps)};
   }
   story.bellTap=lt<4.5;story.redTie=prog(key(5),key(6)+2);
   if(t>key(5)&&t<key(7)){gesture(w,'crouch',1,.7);gesture(w,'inspect');}
   story.residents=[{id:0,x:5.4,z:-.2},{id:1,x:5.9,z:.15},{id:2,x:6.3,z:-.4}];
  }
  if(n===2){
   at(h,-.50,.3,.2);walk(m,[2.4,.4],[.68,.3],t,b.start,b.start+5,{facing:-.25});
   if(lt<6||!active)gesture(h,'inspect');gesture(m,'hold');
   story.lampHeld=true;story.discInspect=true;
  }
  if([3,4].includes(n)){
   at(h,-.57,-.48,Math.PI/2);at(w,.57,-.48,-Math.PI/2);
   gesture(h,'hold');gesture(w,'pull');weight(w,t,.012);
   h.worldHands={left:V(-.35,1.07,-.38),right:V(-.35,1.07,-.58)};
   w.worldHands={left:V(.35,1.13,-.58),right:V(.35,1.13,-.38)};
   story.cargoX=0;story.basketHeld=true;
   story.residents=[{id:0,x:4.9,z:-.4},{id:1,x:5.35,z:.15},{id:2,x:5.9,z:-.2}];
  }
  if(n===5){
   const land=b.start+4;
   at(j,.8,.1,-.58);j.rootY=lt<4?mix(2.5,0,ease(lt/4)):0;j.drop+=.12*pulse(t,land-.1,land+.15,land+.35,land+.9);if(lt<4)j.support='air';
   gesture(j,'thread');story.enemyEntrance=1-ease(lt/7);
  }
  if(n===6){gesture(j,'thread');at(m,2.2,-1.1,-.4);gesture(m,'hold');}
  if(n===7){
   story.door=ease((lt-.6)/3);at(y,-.65,2.52,.1);
   walk(w,[0,3.5],[.65,.75],t,b.start+2,b.start+8,{facing:Math.PI});
   if(lt<5){gesture(y,'pull');near(y,[-.5,1.2,2.9]);}
   if(t>key(6)){gesture(w,'crouch',1,.75);w.headPitch=.15;}
  }
  if(n===8){gesture(j,'thread');h.headYaw=.10;story.pebble=prog(b.start+1,b.start+2);}
  if(n===9){gesture(m,'hold');at(y,-1.9,-.6,.6);if(lt<6){gesture(y,'crouch',1,.6);y.headPitch=.18;}story.lampHeld=true;}
  if(n===10){
   walk(m,[2.4,.35],[.6,.55],t,b.start,b.start+4,{facing:-.45});gesture(m,'hold');
   story.lampHeld=false;story.lampRest='courtyard-table';
   story.plantHeld=lt<bt*.55;story.plantCarrier='mideng';
   if(t>key(4)){at(m,1.48,-.25,1.05);gesture(m,'hold');}
   if(story.plantHeld){m.left.y-=.08;m.right.y-=.08;}
   if(active?.speaker==='xiaozao')h.headPitch=.11;
  }
  if(n===11){at(m,-1.45,.15,.4);gesture(j,'thread');gesture(h,'guard');story.silverDust=prog(b.start,b.start+5);}
  if(n===12){at(h,-.6,.6,.45);at(w,.55,.65,-.4);at(y,-1.6,.4,.4);gesture(m,'hold');if(t>key(6)){gesture(h,'point',1,.7);gesture(y,'inspect');}}
  if(n===13){
   at(y,-4.6,.2,1.2);gesture(m,'hold');
   const a=b.actions,seg0=a[0],seg1=a[1],seg2=a[2],seg3=a[3],p0=prog(seg0.start+2,seg0.end-2);
   walk(w,[-4.0,0],[2.4,0],t,seg0.start,seg0.end,{facing:Math.PI/2,drop:.05});
   story.residents=[{id:0,x:4.4,z:-.2},{id:1,x:4.9,z:.2},{id:2,x:5.6,z:0}];
   if(t>=seg0.end){
    const st=seg1?.start??key(3),en=seg1?.end??key(4);
    walk(w,[2.4,0],[-3.8,0],t,st,en,{facing:-Math.PI/2,drop:.04});
    story.residents[0]={id:0,x:mix(3.4,-4.5,prog(st,en)),z:.05,walk:{from:[3.4,.05],to:[-4.5,.05],start:st,end:en}};
    if(t>=en)walk(w,[-3.8,0],[2.3,.03],t,en,seg2?.start??en+8,{facing:Math.PI/2,drop:.05});
   }
   if(seg2&&t>=seg2.start){
    const a0=seg2.start,a1=seg2.end;
    story.lidBridge=true;story.bridgeGap=true;
    walk(w,[2.3,.03],[-3.6,.03],t,a0+5,a1,{facing:-Math.PI/2,drop:.08});
    story.residents[0]={id:0,x:-4.5,z:-.4};
    story.residents[1]={id:1,x:mix(3.1,-4.1,prog(a0+5,a1)),z:.25,walk:{from:[3.1,.25],to:[-4.1,.25],start:a0+5,end:a1},limp:true};
    if(t<a0+5){gesture(w,'crouch');story.lidPlacing=prog(a0,a0+5);}
   }
   if(seg2&&seg3&&t>=seg2.end&&t<seg3.start)walk(w,[-3.6,.03],[1.8,0],t,seg2.end,seg3.start,{facing:Math.PI/2,drop:.05});
   if(seg3&&t>=seg3.start){at(w,1.8,0,Math.PI/2);gesture(w,'stop');story.residents[1].x=-4.1;story.residents[1].walk=null;}
  }
  if(n===14){gesture(h,'listen');gesture(j,'thread');gesture(m,'hold');h.headPitch=-.06;story.gate=.02;}
  if(n===15){
   gesture(h,'guard');gesture(j,'guard');story.threadMode='duel';story.netRock=true;
   if(lt<6){j.right=V(.18,j.shoulderY+.12,.19);j.headPitch=-.10;h.headPitch=-.12;h.right.y+=.12;}
  }
  if(n===16){
   at(w,2.54,-.52,Math.PI/2);gesture(w,'pull');w.drop=.18;w.lean=.14;at(y,-4.5,.2,1.2);gesture(y,'pull');gesture(m,'hold');
   const sag=.10*pulse(lt,2,3.1,4.5,6.0);
   story.bridgeGap=true;story.cargoX=3.0;story.cargoZ=-.72;story.cargoY=.28-sag;story.rescueThird=true;
   w.worldHands={left:V(2.71,.98-sag,-.63),right:V(2.71,.98-sag,-.81)};
   if(lt>3)w.feet={right:V(.16,.42-sag,.19)};
   story.residents=[{id:0,x:-5.5,z:-.3},{id:1,x:-5.1,z:.45},{id:2,x:3.0,z:-.72,lower:story.cargoY+.04,sit:true}];
  }
  if(n===17){
   at(y,-1.65,.45,-Math.PI/2);gesture(y,'pull');y.drop=.10;y.lean=.07;story.winch=lt*.30;
   y.worldHands={left:V(-1.92,1.02,.32),right:V(-1.92,1.02,.52)};
   at(m,-2.37,.45,Math.PI/2);gesture(m,'pull');m.rootY=0;m.drop=.20;m.lean=.12;
   m.worldHands={left:V(-2.08,1.06,.52),right:V(-2.08,1.06,.32)};
   const p=prog(b.start+2,key(5)-.5);story.cargoX=0;story.cargoZ=mix(3.55,1.28,p);story.cargoY=.14;
   walk(w,[.65,3.7],[.65,1.45],t,b.start+2,key(5)-.5,{facing:Math.PI});gesture(w,'pull');
   story.lampHeld=false;story.rescueThird=true;
   story.residents=[{id:0,x:1.4,z:1.4},{id:1,x:1.7,z:.7,sit:true},{id:2,x:0,z:story.cargoZ,lower:.17,sit:true}];
   if(t>key(5)){gesture(w,'inspect');story.redTie=true;}
  }
  if(n===17.5){
   at(w,.25,.7,-.15);at(y,-1.2,.2,.45);
   story.residents=[{id:0,x:1.5,z:-.15},{id:1,x:.6,z:.2,sit:true},{id:2,x:1.9,z:.7,kneel:true}];story.residentBench=true;
   if(lt<12||t>key(14)&&t<key(20))gesture(w,'crouch',1,.85);
   if(t>key(7)&&t<key(12)){gesture(y,'hold');story.bowlHeld=true;}
   if(t>key(20)){gesture(y,'crouch',1,.8);story.brokenBud=true;}
   if(t>key(25)){gesture(y,'inspect');gesture(w,'pain');}
  }
  if(n===18){
   at(h,-.35,-.80,Math.PI);gesture(h,'pull');gesture(j,'thread');
   gesture(m,'hold');
   story.gate=.08*pulse(t,key(5),key(5)+1,key(7),key(7)+1);story.discBroken=t<key(5)?0:1;
  }
  if(n===19){story.heatBurst=pulse(lt,1,2,7,10);gesture(m,'stop');gesture(w,'crouch',1,.6);gesture(y,'point',1,.6);gesture(h,'guard');h.headPitch=-.09;}
  if(n===20){
   at(h,-.4,.4,.3);at(w,.10,.48,-.3);at(m,1.6,-.8,-.4);
   gesture(h,'pain');at(w,-.04,.55,-.3);w.worldHands={left:V(-.40,1.08,.57)};w.focus=.38;gesture(m,'hold');
   story.lampHeld=true;story.plantCarrier='mideng';
  }
  if(n===21){gesture(y,'explain',1,.5);at(h,-.5,.4,.1);h.headYaw=-.12;w.headPitch=.05;gesture(m,'hold');story.memorial=true;}
  if(n===22){gesture(h,'pain');gesture(m,'hold');w.headRoll=-.04;if(active?.speaker==='weihe')w.focus=.45;}
  if(n===23){
   walk(j,[.72,.1],[1.10,-.85],t,b.start,b.start+3.2,{facing:Math.PI/2,drop:.06});
   if(lt>=3.2){
    at(j,1.10,-.85,Math.PI/2);
    if(lt<8.5){
     const p=ease((lt-3.2)/5.3),z=mix(-.7,-.95,p);j.drop=.45;j.lean=.12;j.headPitch=.17;j.fist=.22;j.open=.28;
     j.worldHands={left:V(1.45,.92+Math.sin(p*Math.PI)*.14,z+.10),right:V(1.45,.92+Math.sin(p*Math.PI)*.14,z-.10)};
     story.plantHeld=true;story.plantCarrier='jianwang';
    }else{gesture(j,'inspect');j.headPitch=.12;}
   }
   story.plantAside=lt>=8.5;story.clapper=true;story.clapperPlaced=lt>=3.6;
   walk(y,[-1.7,-.65],[.65,.10],t,b.start,b.start+2.8,{facing:.0,drop:.04});
   if(lt>=2.8&&lt<4.8){y.yaw=Math.PI;y.drop=.16;y.lean=.12;y.worldHands={right:V(.65,.82,-.15)};}
   else if(lt>=4.8){at(y,.65,.1,.7);gesture(y,'explain',1,.35);}
  }
  if(n===24){
   at(h,-.25,-1.42,Math.PI);at(w,-1.0,-1.42,Math.PI);gesture(h,'pull');gesture(w,'pull');
   h.worldHands={right:V(-.36,1.18,-1.67)};w.worldHands={right:V(-1.10,1.14,-1.67)};
   at(j,-.9,1.65,Math.PI);j.rootY=.64;gesture(j,'point',1,.7);gesture(m,'hold');gesture(y,'point',1,.5);
   story.inspection=true;story.gate=.12*ease((lt-.5)/3);
  }
  if(n===25){
   at(h,-.35,.15,.3);at(w,.15,.3,-.3);gesture(h,'pull');gesture(w,'pull');
   h.drop+=.12*pulse(lt,1,2,4,7);story.redTie=true;gesture(j,'thread');
   at(j,.9,-.35,-.8);
   h.worldHands={right:V(-.15,.97,.20)};w.worldHands={right:V(.07,1.15,.27)};
  }
  if(n===26||n===26.5){
   at(h,-.3,-.9,Math.PI);gesture(h,'pull');gesture(w,'pull');gesture(y,'crouch',1,.4);gesture(m,'hold');
   const tr=n===26?b.start+3:b.start+5;
   story.gate=n===26.5?.055*pulse(t,tr,tr+1,tr+4,tr+5):0;story.platformDrop=n===26.5?.10*pulse(t,tr,tr+1.4,tr+4,tr+5):0;
   story.toolbox=n===26.5;story.toolboxSlide=.38*pulse(t,tr,tr+1.4,tr+4,tr+5);story.woodWedge=true;
  }
  if(n===27){for(const s of[h,j,w,y,m])gesture(s,'inspect');story.safety=true;story.ropeTying=true;}
  if(n===28){
   gesture(j,'thread');story.marketBurst=pulse(t,key(1,2.4),key(1,2.8),key(2),key(2,1.0));gesture(h,'pain');
   if(t>=key(1,2.5)&&t<key(2,1.0))story.cutaway='market';
  }
  if(n===29){
   gesture(h,'guard');gesture(j,'thread');story.threadMode='duel';
   if(t>=key(5)){
    walk(w,[-1.6,.4],[-3.6,-1.5],t,key(5),key(5)+5,{facing:-2.3});
    walk(m,[1.7,-.35],[3.0,-2.0],t,key(5)+.45,key(5)+5.45,{facing:2.5});
    if(t>key(5)+5.5){w.visible=false;m.visible=false;}
   }
  }
  if(n===30){gesture(h,'guard');gesture(j,'pull');story.threadMode='duel';story.discBroken=t<end('B30_06')?1:2;}
  if(n===31||n===32||n===34){
   at(w,-1.65,.35,Math.PI);gesture(w,'pull');
   near(w,[-1.50,1.18,.1],'left');near(w,[-1.80,1.18,.1],'right');
   at(m,2.30,-.55,-.5);m.rootY=.50;gesture(m,'hold');story.lampHeld=false;
   at(y,1.30,-.65,-1.8);y.rootY=.60;gesture(y,'inspect');
   if(n===31&&lt<7){
    walk(m,[2.35,.85],[2.3,-.55],t,b.start,b.start+5.2,{facing:Math.PI});m.rootY=.50*ease(lt/5.2);m.groundAt=wellStairGround;story.lampHeld=true;
    if(lt>=5.2){
     const p=ease((lt-5.2)/1.8);m.worldHands={};
     for(const[side,x]of[['left',2.25],['right',2.35]]){
      const from=localToWorld(actors.mideng,m,m[side]);m.worldHands[side]=V(mix(from.x,x,p),mix(from.y,2.10,p),mix(from.z,-.58,p));
     }
    }
   }
   if(n===31&&action?.afterLine===8){
    const u=t-action.start,turn=ease((u-1.0)/3.3);
    story.ratchetTurn=turn;
    if(u<5.5){y.worldHands={right:V(1.02,1.73-.06*turn,-.75)};y.fist=.65;y.headPitch=.18;y.lean=.06;}
    const test=pulse(u,5.5,6.1,7.8,9.0);
    w.drop+=.08*test;w.lean-=.06*test;story.gate=.015*test;
    m.headYaw=-.20*ease((u-9)/2);m.headPitch=-.10*ease((u-10)/2);
    if(u>12.5)gesture(m,'stop',pulse(u,12.5,13.1,14.8,16.2),.55);
   }
   if(n===32)story.gate=.075*pulse(t,key(4),key(5)+1,key(6)+1,key(7)+1);
   if(n===34){
    w.drop+=.10;w.rootY=-.08;story.platformDrop=.08;story.bellTap=t>key(2)&&t<key(3)||t>key(5)&&t<key(6);
    const k=pulse(t,key(2)+.45,key(2)+.55,key(2)+.57,key(2)+.7)+pulse(t,key(2)+.95,key(2)+1.05,key(2)+1.07,key(2)+1.2);
    w.worldHands.right.z=.1-.025*(1-k);
    const r=pulse(t,key(5)+.2,key(5)+.3,key(5)+.32,key(5)+.45)+pulse(t,key(5)+.7,key(5)+.8,key(5)+.82,key(5)+.95);
    if(t>key(5)-.2&&t<key(6)){m.worldHands={right:V(2.45,1.83,-.25+.03*(1-r))};}
   }
  }
  if(n===33){gesture(h,'guard');gesture(j,'thread');story.threadMode='duel';}
  if(n===35){
   gesture(h,'inspect');gesture(j,'pull');story.discSide=t<key(4)?'left':'right';story.bracerLost=t>=key(4);
   if(t>=end('B35_08')){walk(h,[-.62,.35],[-2.8,-2.0],t,end('B35_08'),end('B35_08')+4,{facing:-2.4});h.headYaw=-.15;if(t>end('B35_08')+4.5)h.visible=false;}
  }
  if(n>=36&&n<=40){
   at(h,-.35,-1.38,Math.PI);gesture(h,'pull');at(j,.58,-.8,Math.PI);gesture(j,'pull');
   near(h,[-.48,1.16,-1.68],'right');
   at(w,-1.65,.35,Math.PI);gesture(w,'pull');
   near(w,[-1.50,1.18,.1],'left');near(w,[-1.80,1.18,.1],'right');
   at(m,2.30,-.55,-.5);m.rootY=.5;gesture(m,'hold');story.lampHeld=false;
   at(y,1.30,-.65,-1.6);y.rootY=.60;gesture(y,'inspect');
   story.gate=.08;story.safety=true;
   if(n===36){
    const land=b.start+1.3;h.rootY=lt<1.3?.60*(1-ease(lt/1.3)):0;h.drop+=.12*pulse(t,land-.1,land+.1,land+.5,land+1);
    if(t<land){h.worldHands=null;h.left=V(-.16,1.14,.20);h.right=V(.16,1.24,.20);h.support='air';story.jumping=true;}
    story.discPlaced=t>key(2);story.discBroken=2;
   }
   if(n===37){
    story.discBroken=t<key(6)?2:3;story.gate=.10;j.rootY=lt<.48?.55*(1-(lt/.48)**2):0;
    j.drop+=.16*pulse(lt,.40,.55,.68,1.15);if(lt<.48)j.support='air';
   }
   if(n===38){gesture(j,'pain');j.focus=.85;j.fear=.15;story.threadMode='trapped';}
   if(n===39){story.threadMode=t<key(3)?'trapped':'released';j.headPitch=.10;h.headYaw=-.12;}
   if(n===40){
    story.gate=.10;story.discBroken=3;
    for(const[i,c]of waves.entries()){
     const load=pulse(t,c-1.1,c-.2,c+.7,c+2.2),advance=ease((t-c)/1.2);
     h.drop+=.10*load;h.lean+=.10*load;j.drop+=.08*load;j.lean-=.08*load;w.drop+=.085*load;
     h.focus=Math.max(h.focus,.85*load);j.focus=Math.max(j.focus,.75*load);w.focus=Math.max(w.focus,.8*load);
     story.gate+=advance*[.16,.22,.47][i];story.discBroken+=t>=c+.25?1:0;
    }
    story.pressure=1-ease((t-waves[2])/8);story.release=ease((t-waves[2])/.5)*(1-ease((t-waves[2]-5)/8));
   }
  }
  if(n===41||n===42){
   story.gate=.95;story.discPlaced=true;story.safety=true;story.lampHeld=false;
   at(m,2.3,-.55,-.4);m.rootY=.5;gesture(m,'stop',1,.6);
   at(y,1.65,1.5,-.65);y.rootY=.65;gesture(y,'pull');
   at(h,-.35,.15,.5);at(j,.45,.1,-.3);at(w,-1.0,.25,.5);
   const fall=n===41?ease((lt-1)/3):1;
   story.platformDrop=.42*fall;story.platformTilt=(n===41?.07:.17)*fall;
   for(const s of[h,j,w]){s.rootY=-.42*fall;gesture(s,'crouch',1,.45);}
   if(n===41){
    if(t>key(5)){gesture(h,'inspect');story.blackClip=ease((t-key(5))/2);}
    if(t>key(8)){const p=prog(key(8),b.end-1);w.rootY=mix(-.42,.65,p);at(w,-1.0,mix(.25,1.45,p),Math.PI);gesture(w,'pull');}
   }
   if(n===42){
    at(w,.40,1.55,Math.PI);w.rootY=.65;gesture(w,'pull');w.drop=.32;
    const raiseStart=b.actions[1]?.start??b.start+15,raiseEnd=raiseStart+8;
    j.rootY=mix(-.42,.65,prog(raiseStart,raiseEnd));j.rootX=mix(.45,-.40,prog(raiseStart,raiseEnd));j.rootZ=mix(.1,1.55,prog(raiseStart,raiseEnd));
    gesture(j,'pain');story.enemyLift=prog(raiseStart,raiseEnd);
    story.enemyBelay=t>=raiseEnd+2.4;
    if(t>=raiseEnd&&t<raiseEnd+3.5){
     const u=ease((t-raiseEnd)/2.4);j.right=V(.15,mix(1.30,1.14,u),mix(.20,.12,u));j.headPitch=.20;j.fist=.35;
     y.drop+=.08*pulse(t,raiseEnd+2.3,raiseEnd+2.6,raiseEnd+2.9,raiseEnd+3.5);
    }
    if(t<raiseEnd){gesture(h,'pull');h.right.y+=.18;h.lean=-.08;}
    const f=clamp((t-jump)/1.05),flight=t>=jump&&t<catchTime;
    const anticip=pulse(t,jump-.65,jump-.25,jump-.10,jump);
    h.drop+=.19*anticip;h.lean=.15*anticip;
    if(t>=jump){
     h.rootX=mix(-.35,-.10,f);h.rootZ=mix(.15,.98,f);h.rootY=mix(-.42,.20,f)+.42*Math.sin(Math.PI*f);h.yaw=0;
     h.air=.03;h.drop=.10;h.left=V(-.17,1.35,.20);h.right=V(.16,1.46,.22);h.lean=-.05;h.focus=.90;h.fear=.15;
     story.jumping=flight;
    }
    if(t>=catchTime){
     const pullStart=end('B42_09')-.55,pull=prog(pullStart,pullStart+4.5);
     h.rootX=mix(-.10,0,pull);h.rootZ=mix(.98,1.64,pull);h.rootY=mix(.20,.64,pull);h.drop=mix(.10,.30,pull);
     gesture(h,'kneel',1,.30);w.drop=.32;j.drop=.60;y.drop+=.09*(1-pull);
     if(t>pullStart+4.1){
      walk(w,[.40,1.55],[.75,1.70],t,pullStart+4.1,pullStart+7.1,{facing:Math.PI,drop:.25,crouched:true});
      walk(j,[-.40,1.55],[-.80,1.7],t,pullStart+4.1,pullStart+7.1,{facing:Math.PI,drop:.30,crouched:true});
     }
     if(t>pullStart+8){
      const rest=prog(pullStart+8,pullStart+12);
      h.drop=mix(.39,.15,rest);h.headPitch=mix(.18,.02,rest);h.focus=.18;h.fear=0;
      w.drop=mix(.25,.07,rest);w.headPitch=.13;w.focus=.25;
      j.drop=mix(.30,.10,rest);j.headPitch=.15;j.focus=.25;
      y.drop=.04;y.lean=-.025;y.headPitch=.10;
     }
    }
    if(t>=jump-.4&&t<end('B42_09')+3.55){
     // Shared grip targets are solved in world space, both actors reach the same wrist/elbow zone.
     const a=ease((t-(end('B42_09')-.55))/4.5),target=V(.08,1.62+a*.10,1.26+a*.25);
     if(t>=catchTime){
      h.worldHands={right:target};w.worldHands={right:V(target.x,target.y,target.z+.04)};
      j.yaw=Math.PI;j.drop=.48;j.worldHands={left:V(-.12,1.52+a*.10,1.30+a*.25)};
     }else{
      w.worldHands={right:target};j.yaw=Math.PI;j.drop=.48;j.worldHands={left:V(-.12,1.52,1.30)};
     }
    }
   }
  }
  if(n===43){
   gesture(h,'kneel',1,.62);gesture(j,'crouch',1,.55);gesture(w,'crouch',1,.55);gesture(y,'crouch',1,.4);gesture(m,'inspect');
   at(w,-.05,.6,-.15);at(h,-.55,.45,.25);
   if(t>key(4)){w.worldHands={left:V(-.49,1.0,.62)};h.focus=.25;}
  }
  if(n===44){
   gesture(h,'pain');gesture(j,'pain');at(j,.8,.1,-.5);
   if(t>key(8)){walk(j,[.8,.1],[3.2,-2.3],t,key(8),b.end,{facing:2.4});}
  }
  if(n===45){
   at(y,-1.5,.1,.7);gesture(y,'kneel',1,.75);at(w,-.4,.1,.4);gesture(w,'crouch',1,.65);
   at(h,-2.5,.1,1.1);gesture(h,'pain');at(m,1.5,.0,-1.2);gesture(m,'hold');
   story.bridgeRepaired=true;story.lidBridge=true;story.bridgeGap=false;story.repair=true;
  }
  if(n===46){at(h,-.5,.45,.3);at(w,.35,.5,-.35);gesture(w,'inspect');gesture(h,'pain');gesture(y,'crouch',1,.65);gesture(m,'inspect');story.repair=true;}
  if(n===47){
   at(y,-.55,.2,.2);at(w,.35,.3,-.3);at(m,1.3,-.4,-.3);at(h,-1.3,.45,.25);
   y.right.y=1.35;y.right.z=.23;y.headPitch=-.16;story.bellTap=true;h.smile=.2;w.smile=.3;
  }
  if(n===48){
   at(h,-.32,.35,.3);at(w,.26,.45,-.3);gesture(w,'inspect');gesture(h,'pain');
   story.wristBand=true;h.smile=t>key(4)?.27:.10;w.smile=.20;
   if(t>key(6)){walk(h,[-.32,.35],[-1.4,-.7],t,key(6),b.end,{facing:-2.2});walk(w,[.26,.45],[-.7,-.8],t,key(6)+.2,b.end,{facing:-2.3});}
  }
  if(n===49){
   for(const s of[h,w,y,m])s.smile=.18;
   gesture(y,'inspect');gesture(m,'hold');gesture(h,'pain');story.repair=true;story.wristBand=true;story.bellTap=lt>bt-6;
  }
  // Detailed exchanges share time with the actual effects and Foley.
  const activeHits=impacts.filter(e=>e.beat===b.id&&t-e.time>=-2&&t-e.time<=3).sort((a,c)=>Math.abs(t-a.time)-Math.abs(t-c.time)).slice(0,1);
  for(const hit of activeHits){
   const d=t-hit.time,A=states[hit.attacker],B=states[hit.target];
   if(!A||d< -2||d>3)continue;
   A.worldHands=null;
   const prep=pulse(d,-1.25,-.6,-.22,0),drive=ease((d+.22)/.22)*(1-ease((d-.12)/.5));
   const recoil=ease(d/.12)*(1-ease((d-.25)/.9));
   const xa=hit.type==='kick'?-.38:hit.attacker==='xiaozao'?-.28:.28,xb=hit.type==='kick'?.22:-xa;
   const aFrom=[A.rootX,A.rootZ],bFrom=B?[B.rootX,B.rootZ]:null;
   const approach=ease((d+2)/.75),returning=ease((d-2.2)/.8);
   A.rootX=mix(mix(aFrom[0],xa,approach),aFrom[0],returning);A.rootZ=mix(mix(aFrom[1],.1,approach),aFrom[1],returning);A.yaw=hit.attacker==='xiaozao'?Math.PI/2:-Math.PI/2;
   if(d< -1.25)walk(A,aFrom,[xa,.1],t,hit.time-2,hit.time-1.25,{facing:A.yaw,drop:.05});
   if(d>2.2)walk(A,[xa,.1],aFrom,t,hit.time+2.2,hit.time+3,{facing:A.yaw,drop:.05});
   if(B){B.worldHands=null;B.rootX=mix(mix(bFrom[0],xb,approach),bFrom[0],returning);B.rootZ=mix(mix(bFrom[1],.1,approach),bFrom[1],returning);B.yaw=-A.yaw;gesture(B,'guard');B.lean=-.13*recoil;B.headPitch=-.10*recoil;B.headRoll=.06*recoil;B.drop=.035+.11*recoil;B.feetZ=[-.08,.10];B.stance=.16;B.focus=.80;B.fear=.15*recoil;}
   gesture(A,'guard');const side=hit.side??'right',sign=side==='left'?-1:1;
   A[side]=V(sign*.10,mix(A[side].y,A.shoulderY+.07,drive),mix(.16,.345,drive));
   if(hit.attacker==='jianwang')A[side].y-=.20*drive;
   A[side].z-=.10*prep;A.twist=sign*(-.35*prep+.30*drive);A.lean=-.08*prep+.18*drive;A.drop=.030+.090*prep-.018*drive;A.focus=.9;
   A.bodyAdvance=-.020*prep+.055*drive;A.headYaw-=A.twist*.35;
   if(B){B.bodyAdvance=-.055*recoil;B.blink=Math.max(B.blink,.70*pulse(d,0,.045,.10,.19));B.jaw=Math.max(B.jaw??0,.12*recoil);}
   // Feet remain world-planted while hip and shoulder rotate into the strike.
   A.feetZ=[.12,-.13];A.stance=.13;
   if(hit.zone==='guard'&&B){
    const receiving=side==='left'?'right':'left',rs=receiving==='left'?-1:1;
    B[receiving]=V(rs*.12,B.shoulderY-.06,.27);
    B.twist=rs*.12*recoil;B.lean=-.075*recoil;B.headPitch=-.05*recoil;
   }
   if(hit.type==='kick'){
    const lift=ease((d+.45)/.45)*(1-ease((d-.10)/.65));
    A.drop=.055;A.lean=-.12*lift;A.twist=-.16*lift;gesture(A,'guard');A.drop=.055;
    if(d>-.45&&d<.75)A.feet={right:V(.10,mix(actors[hit.attacker].dimensions.footY,.28,lift),mix(-.08,.56,lift))};
    A.right=V(.14,A.shoulderY-.10,.20);A.left=V(-.15,A.shoulderY-.03,.19);
    if(B){B.lean=.10*recoil;B.headPitch=.12*recoil;B.drop=.035+.09*recoil;}
   }
   if(d>1&&d<2.2&&B){
    const from=[xb,.1],to=[xb+(xb>0?.32:-.32),.1];
    walk(B,from,to,t,hit.time+1,hit.time+2.2,{facing:B.yaw,drop:.06});
   }
   if(B&&d< -1.25)walk(B,bFrom,[xb,.1],t,hit.time-2,hit.time-1.25,{facing:B.yaw,drop:.04});
   if(B&&d>=2.2)walk(B,[xb+(xb>0?.32:-.32),.1],bFrom,t,hit.time+2.2,hit.time+3,{facing:B.yaw,drop:.04});
  }
  if(isFight){h.focus=Math.max(h.focus,.65);j.focus=Math.max(j.focus,.7);}
  // Facial intention follows the scene's emotional turn. Everyday banter,
  // admitting pain, remembered loss and the final release are different holds.
  if(n===1){w.focus=.10;w.smile=.30;y.focus=.12;y.smile=.22;w.browAsym=.22;}
  if(n===9){m.focus=.18;m.fear=.22;w.focus=.25;y.focus=.30;}
  if(n===16){
   const effort=.5+.5*Math.sin(lt*2.25);
   w.focus=.74+.10*effort;w.fear=.13;w.browAsym=.34;
   w.headPitch=-.035+.025*effort;w.lean+=.012*effort;w.drop+=.006*effort;
  }
  if(n===17.5){w.focus=.18;w.fear=lt<35?.24:.10;y.focus=.16;y.smile=t>key(20)?.08:.18;}
  if(n===20){h.focus=.15;h.fear=.14;h.browAsym=.32;w.focus=.12;w.smile=.10;m.focus=.18;}
  if(n===21&&active?.speaker==='yabo'){y.headYaw=-.11;y.headPitch=.08;y.browAsym=.28;y.focus=.18;}
  if(n===22){h.headPitch=.13;h.focus=.15;w.browAsym=.34;w.focus=.40;}
  if(n===23){j.focus=.22;j.browAsym=.25;y.focus=.10;y.smile=.06;}
  if(n===38){j.browAsym=.36;j.focus=.82;j.fear=.25;}
  if(n===42&&t>=jump-.6&&t<catchTime+1.5){w.focus=.88;w.fear=.18;j.focus=.90;h.fear=.32;h.focus=.70;}
  if(n===43){h.focus=.12;w.focus=.15;m.focus=.10;m.smile=.15;j.focus=.24;y.focus=.15;}
  if(n===47){h.focus=.08;w.focus=.08;y.focus=.10;m.focus=.12;w.smile=.42;h.smile=.34;y.smile=.28;m.smile=.24;}
  if(n===48){h.focus=.10;w.focus=.10;w.smile=.32;w.browAsym=.20;}
  // Attention is explicit. Remote speech never materializes a person on the wrong set.
  for(const[name,s]of Object.entries(states)){
   let targetName=active?.speaker!==name&&states[active?.speaker]?.visible?active.speaker:
    name==='jianwang'?'xiaozao':name==='xiaozao'?(j.visible?'jianwang':w.visible?'weihe':'mideng'):h.visible?'xiaozao':w.visible&&name!=='weihe'?'weihe':'yabo';
   if(!states[targetName]?.visible)targetName=onscreen.find(k=>k!==name);
   s.target=targetName;
   if(s.visible&&active&&active.speaker!==name){
    s.headRoll+=.012*pulse(t-active.start,.3,.8,1.3,1.8);s.focus+=.05;
    if(!isFight&&n!==42&&states[targetName]?.visible){
     const target=states[targetName],angle=Math.atan2(target.rootX-s.rootX,target.rootZ-s.rootZ)-s.yaw;
     const turn=Math.max(-.24,Math.min(.24,Math.atan2(Math.sin(angle),Math.cos(angle))*.32));
     s.headYaw+=turn*ease((t-active.start)/.45);
    }
   }
   s.lagYaw=-.2*s.headYaw;s.lagPitch=-.20*s.headPitch;
   s.pupil=1-.09*s.focus+.07*s.fear;
  }
  return{t,beat:b,n,lt,bt,states,story,active,spoken,action,actionProgress:aU,previousLine:before,impacts:impacts.filter(e=>e.beat===b.id),eventTimes,windWaves:waves};
 }
 return{sample,eventTimes,cue,lines,beats,byId};
}
