import * as THREE from 'three';
import {ease,mix,clamp} from './pose.js';
const V=a=>new THREE.Vector3(...a);
const WIDE={
 market:{pos:[3.4,2.7,7.0],look:[0,1.2,-.3],fov:36},
 courtyard:{pos:[3.5,2.35,6.7],look:[0,1.20,-.25],fov:36},
 store:{pos:[2.9,2.3,2.55],look:[-.4,1.10,.2],fov:54},
 greenhouse:{pos:[3.25,2.2,5.6],look:[0,1.2,-.3],fov:38},
 bridge:{pos:[1.2,2.65,10.3],look:[0,1.05,-.2],fov:43},
 windwell:{pos:[4.0,3.2,4.6],look:[.1,1.15,-.65],fov:43}
};
const INSERTS={
 B01:'bell',B02:'disc',B03:'basket',B04:'basket',B05:'enemy',B06:'rotor',B07:'door',
 B08:'enemyHand',B09:'plant',B10:'plant',B11:'disc',B12:'winch',B13:'feet',B14:'gate',
 B15:'enemyHand',B16:'basket',B17:'basket',B49:'residents',B18:'disc',B19:'plant',
 B20:'hands',B21:'memorial',B22:'hands',B23:'clapper',B24:'gate',B25:'hands',
 B26:'lever',B50:'toolbox',B27:'waist',B28:'rotor',B29:'feet',B30:'disc',B31:'lamp',
 B32:'lever',B33:'enemyHand',B34:'lamp',B35:'hands',B36:'disc',B37:'gate',B38:'enemyHand',
 B39:'hands',B40:'gate',B41:'rope',B42:'hands',B43:'wrist',B44:'enemyHand',B45:'feet',
 B46:'disc',B47:'bell',B48:'wrist',END:'bell'
};
export function createCinematography(actors,stage,props){
 const head=name=>actors[name].headGroup.getWorldPosition(new THREE.Vector3()).add(V([0,.04,0]));
 const ray=new THREE.Raycaster(),obstacles={};
 for(const[name,g]of Object.entries(stage.groups)){obstacles[name]=[];g.traverse(o=>{if(o.isMesh)obstacles[name].push(o);});}
 const visible=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
 function obstruction(pos,target,subject,state){
  const length=pos.distanceTo(target),direction=target.clone().sub(pos).normalize();
  ray.set(pos,direction);ray.far=length-.13;
  const solids=obstacles[state.beat.scene].filter(o=>visible(o)&&(!o.material.transparent||o.material.opacity>.6));
  let score=ray.intersectObjects(solids,false).length?8:0;
  for(const dy of[-.04,-.12]){
   const aim=target.clone().add(V([0,dy,0]));
   ray.set(pos,aim.clone().sub(pos).normalize());ray.far=pos.distanceTo(aim)-.13;
   if(ray.intersectObjects(solids,false).length)score+=8;
  }
  const foreground=[...Object.entries(actors).filter(([name])=>state.states[name].visible),
   ...props.residents.filter(a=>a.mesh.visible).map((a,i)=>['resident-'+i,a])];
  for(const[name,a]of foreground){
   if(name===subject)continue;
   const h=a.headGroup.getWorldPosition(new THREE.Vector3()).add(V([0,.04,0])),
    body=a.mesh.localToWorld(V([0,1.05,0])),shoulders=a.mesh.localToWorld(V([0,a.dimensions.shoulderY-.025,0]));
   for(const aim of[target,target.clone().add(V([0,-.12,0])),target.clone().add(V([0,-.26,0]))]){
    const dir=aim.clone().sub(pos).normalize(),len=pos.distanceTo(aim);
    for(const[c,r]of[[h,.23],[body,.30*a.mesh.scale.x],[shoulders,.43*a.mesh.scale.x]]){
     const v=c.clone().sub(pos),along=v.dot(dir);
     if(along>-.03&&along<len-.12&&v.addScaledVector(dir,-along).length()<r)score+=5;
    }
   }
  }
  return score;
 }
 function portrait(name,state,{close=true,reaction=false}={}){
  const a=actors[name],s=state.states[name],target=head(name),yaw=s.yaw+(s.headYaw??0)*.6;
  const dist=close?1.45:2.40,side=name==='jianwang'?-.22:.25;
  let pos,best=Infinity;
  for(const offset of[0,.38,-.38,.72,-.72,1.02,-1.02,1.30,-1.30]){
   const angle=yaw+offset,p=target.clone().add(V([Math.sin(angle)*dist+Math.cos(angle)*side,.055+(Math.abs(offset)>.7?.10:0),Math.cos(angle)*dist-Math.sin(angle)*side]));
   if(state.beat.scene==='windwell'&&p.z< -1.45){p.z=-1.42;p.x+=name==='jianwang'?-1.0:1.0;}
   if(state.beat.scene==='store'){p.x=Math.max(-3.35,Math.min(3.35,p.x));p.z=Math.min(2.55,p.z);}
   // Clipping a camera to a wall boundary must not move it inside its own subject.
   if(p.distanceTo(target)<(close?1.0:1.4))continue;
   const score=obstruction(p,target,name,state)+Math.abs(offset)*.1;
   if(score<best){pos=p;best=score;}
   if(score<1)break;
  }
  if(!pos)return{...WIDE[state.beat.scene],kind:'wide',subject:state.beat.scene};
  if(!close)target.y-=.24;
  const baseFov=close?30:34,actualDistance=pos.distanceTo(target);
  const fov=actualDistance<dist*.95?
   THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov*.5))*dist/actualDistance)):baseFov;
  return{pos:pos.toArray(),look:target.toArray(),fov,kind:reaction?'reaction':close?'portrait':'medium',subject:name};
 }
 function insert(kind,state){
  const n=state.n,scene=state.beat.scene;
  const out=(p,q,f=32)=>({pos:p,look:q,fov:f,kind:'insert',subject:kind});
  if(kind==='bell')return out([.7,1.8,.05],[0,1.64,-1.7],27);
  if(kind==='rotor')return out([2.6,2.7,4.6],[0,2.5,-3.3],35);
  if(kind==='door')return out([.8,1.6,4.9],[-.1,1.2,2.8],35);
  if(kind==='memorial')return out([1.0,2.1,-.5],[.2,2.15,-2.82],31);
  if(kind==='clapper'){const p=props.clapper.getWorldPosition(new THREE.Vector3());return out(p.clone().add(V([0,.6,-1.0])).toArray(),p.toArray(),31);}
  if(kind==='gate')return out([-2.8,1.5,.5],[-.65,1.2,-1.7],38);
  if(kind==='lever')return out([-.30,1.6,1.0],[-1.65,1.17,.1],34);
  if(kind==='winch')return out([-.7,1.4,2.4],[-2,.7,.2],34);
  if(kind==='lamp'){const p=props.lamp.getWorldPosition(new THREE.Vector3());return out(p.clone().add(V([.38,.05,.9])).toArray(),p.clone().add(V([0,-.08,0])).toArray(),28);}
  if(kind==='plant'){
   const o=scene==='greenhouse'?stage.props.greenhousePlant:stage.props.courtyardPlant,p=o.getWorldPosition(new THREE.Vector3()).add(V([0,.25,0]));
   return out(p.clone().add(V([.6,.25,1.1])).toArray(),p.toArray(),32);
  }
  if(kind==='basket'){const p=(scene==='store'?stage.props.storeBasket:stage.props.bridgeBasket).getWorldPosition(new THREE.Vector3());return out(p.clone().add(V([1.2,.9,2.3])).toArray(),p.clone().add(V([0,.28,0])).toArray(),32);}
  if(kind==='toolbox')return out([1.5,1.2,2.9],[.7,.3,.35],33);
  if(kind==='residents')return out([2.8,1.6,3.8],[1.1,.95,.25],35);
  if(kind==='rope')return out([-2.3,2.4,3.2],[-.6,.5,.3],40);
  if(kind==='enemy')return portrait('jianwang',state,{close:false});
  if(kind==='enemyHand'){const p=props.hand('jianwang','right');return out(p.clone().add(V([.4,.24,.90])).toArray(),p.toArray(),30);}
  if(kind==='disc'){const p=props.disc.getWorldPosition(new THREE.Vector3());return out(p.clone().add(V([.70,.65,1.20])).toArray(),p.toArray(),34);}
  if(kind==='feet'){
   const name=state.states.weihe.visible?'weihe':'xiaozao',p=actors[name].mesh.position.clone();p.y+=.20;
   return out(p.clone().add(V([.8,.50,1.7])).toArray(),p.toArray(),37);
  }
  if(kind==='waist'){const p=actors.weihe.mesh.localToWorld(V([0,.9,.05]));return out(p.clone().add(V([.4,.18,1.1])).toArray(),p.toArray(),32);}
  const owner=state.states.xiaozao.visible?'xiaozao':
   state.states.jianwang.visible?'jianwang':Object.keys(state.states).find(k=>state.states[k].visible);
  const p=props.hand(owner,kind==='wrist'?'left':'right');
  return out(p.clone().add(V([.65,.24,1.15])).toArray(),p.toArray(),31);
 }
 function choose(state){
  const {beat:b,n,lt,bt,t,action,active,previousLine}=state,wide={...WIDE[b.scene],kind:'wide',subject:b.scene};
  if(state.story.cutaway==='market')return{pos:[.1,2.15,2.4],look:[2.45,1.0,-1.6],fov:48,kind:'cutaway',subject:'market-canopy'};
  if(n===15&&lt<4)return{pos:[2.0,2.3,3.7],look:[-.05,1.45,.35],fov:40,kind:'net-rock-catch',subject:'falling-stone'};
  if(n===15&&lt>=4&&lt<6.5){
   const p=props.makerMark.getWorldPosition(new THREE.Vector3()),normal=V([0,0,1]).applyQuaternion(props.makerMark.getWorldQuaternion(new THREE.Quaternion()));
   return{pos:p.clone().addScaledVector(normal,.52).add(V([0,.045,.04])).toArray(),look:p.toArray(),fov:29,kind:'insert',subject:'maker-mark'};
  }
  if(n===23&&lt>=3.2&&lt<8.5)return{pos:[2.45,1.65,.75],look:[1.30,1.05,-.8],fov:40,kind:'plant-rescue',subject:'jianwang'};
  if(n===24&&lt<6)return{pos:[-2.8,1.8,.9],look:[-.55,1.15,-1.5],fov:44,kind:'gate-opening',subject:'two-person-pull'};
  if(n===25&&lt<7)return{pos:[-1.3,1.3,1.6],look:[-.08,1.0,.20],fov:40,kind:'band-catch',subject:'two-person-grip'};
  if(n===10&&state.story.plantHeld&&active?.speaker==='mideng'){
   const p=head('mideng'),angle=state.states.mideng.yaw+1.15;
   return{pos:p.clone().add(V([Math.sin(angle)*1.85,.10,Math.cos(angle)*1.85])).toArray(),
    look:p.clone().add(V([0,-.13,0])).toArray(),fov:38,kind:'plant-presentation',subject:'mideng'};
  }
  if(n===42&&t>=(b.actions[1].start+8)&&t<(b.actions[1].start+11.5)){
   const p=props.rescueRing.getWorldPosition(new THREE.Vector3()),yaw=state.states.jianwang.yaw;
   return{pos:p.clone().add(V([Math.sin(yaw)*1.05+Math.cos(yaw)*.25,.23,Math.cos(yaw)*1.05-Math.sin(yaw)*.25])).toArray(),
    look:p.clone().add(V([0,.075,0])).toArray(),fov:39,kind:'belay-transfer',subject:'rescue-harness-ring'};
  }
  if(n===42&&t>=state.eventTimes.jump-1.3&&t<(b.actions.at(-1).start+4.0))
   return t<state.eventTimes.catch?
    {pos:[3.2,2.2,.2],look:[-.02,1.65,1.25],fov:42,kind:'rescue-contact',subject:'three-person-catch'}:
    {pos:[.5,2.2,-.85],look:[-.02,1.65,1.25],fov:43,kind:'rescue-contact',subject:'three-person-catch'};
  const hit=state.impacts.find(e=>t>e.time-1.35&&t<e.time+1.0);
  if(hit){
   if(!hit.zone&&actors[hit.target]&&t>hit.time+.18&&t<hit.time+.75)return portrait(hit.target,state,{reaction:true});
   if(hit.attacker==='xiaozao'&&actors[hit.target]&&!hit.zone&&hit.type!=='kick'){
    const a=state.states.xiaozao,b=state.states[hit.target],x=(a.rootX+b.rootX)/2,z=(a.rootZ+b.rootZ)/2;
    return{pos:[x+.8,1.90,z-1.4],look:[x,1.25,z],fov:64,kind:'contact',subject:hit.id};
   }
   return{pos:hit.type==='kick'?[2.2,1.65,4.0]:hit.zone?[1.3,1.85,4.1]:[1.3,1.70,3.2],look:hit.type==='kick'?[0,1.1,.1]:[0,1.18,.10],fov:hit.zone?39:hit.type==='kick'?37:36,kind:'contact',subject:hit.id};
  }
  if(n===5&&lt<5)return{pos:[2.2,2.35,6.2],look:[.65,1.2+state.states.jianwang.rootY*.65,.1],fov:39,kind:'entrance',subject:'jianwang'};
  if(n===7&&lt<8)return{pos:[2.1,1.85,4.8],look:[-.1,1.1,2.6],fov:42,kind:'door-entry',subject:'weihe'};
  if(n===13&&action)return{pos:[.3,2.05,7.4],look:[state.states.weihe.rootX*.35,1.0,0],fov:43,kind:'rescue-traverse',subject:'bridge'};
  if(n===16&&action===b.actions.at(-1)){
   const x=state.states.weihe.rootX,dt=t-action.start;
   if(dt<4)return{pos:[x-1.2,1.35,2.0],look:[x+.27,.75,-.65],fov:43,kind:'basket-unbrace',subject:'weihe'};
   return{pos:[x-1.5,2.0,3.2],look:[x+.30,.95,-.60],fov:43,kind:'basket-recovery',subject:'weihe'};
  }
  if(n===16&&action)return lt<2?
   {pos:[1.8,2.1,8.6],look:[state.story.cargoX*.4,1.0,-.4],fov:42,kind:'cargo-rescue',subject:'basket'}:
   {pos:[1.3,1.85,2.8],look:[2.8,1.0,-.6],fov:40,kind:'cargo-rescue-detail',subject:'basket'};
  if(n===17&&action)return{pos:[2.8,2.25,3.0],look:[-.6,1.0,1.1],fov:55,kind:'cargo-rescue',subject:'basket'};
  if(n===40&&state.story.release>.2)return{pos:[4.8,3.1,5.5],look:[0,.4,-2.0],fov:46,kind:'release',subject:'windwell'};
  if(lt<Math.min(3.8,(b.actions[0]?.end??b.start+4)-b.start))return wide;
  if(action){
   const elapsed=t-action.start,D=action.end-action.start,slots=Math.max(1,Math.ceil(D/5.2)),slot=Math.min(slots-1,Math.floor(elapsed/(D/slots)));
   const onscreen=Object.entries(state.states).filter(([k,s])=>s.visible).map(([k])=>k),subject=onscreen[(slot+Math.floor(n))%onscreen.length]??'xiaozao';
   if(slot===0&&action.afterLine===0&&lt>3.8)return insert(INSERTS[b.id],state);
   if(slot%3===1)return insert(INSERTS[b.id],state);
   if(slot%3===2)return portrait(subject,state,{close:slot%2===0,reaction:true});
   return{...wide,pos:wide.pos.map((v,i)=>i===0?v-.4:v),kind:'action-wide'};
  }
  const l=active??previousLine;
  if(['B41_04','B41_06','B42_02'].includes(l?.id)){
   const p=head('xiaozao'),angle=state.states.xiaozao.yaw-.65;
   return{pos:p.clone().add(V([Math.sin(angle)*1.65,.17,Math.cos(angle)*1.65])).toArray(),
    look:p.clone().add(V([0,-.10,0])).toArray(),fov:36,kind:'rescue-dialogue',subject:'xiaozao'};
  }
  if(n===13&&l?.speaker==='yabo'){
   const p=head('yabo'),angle=state.states.yabo.yaw-1.0;
   return{pos:p.clone().add(V([Math.sin(angle)*1.55,.15,Math.cos(angle)*1.55])).toArray(),
    look:p.clone().add(V([0,-.08,0])).toArray(),fov:38,kind:'bridge-guidance',subject:'yabo'};
  }
  if(n===24&&['weihe','xiaozao'].includes(l?.speaker)){
   const p=head(l.speaker),side=l.speaker==='weihe'?-1:1;
   return{pos:[p.x+side*1.75,p.y+.10,-1.58],look:p.clone().add(V([0,-.10,0])).toArray(),
    fov:35,kind:'gate-profile',subject:l.speaker};
  }
  if(n===16&&l?.speaker==='weihe'){
   const p=head('weihe'),angle=state.states.weihe.yaw-.8;
   return{pos:p.clone().add(V([Math.sin(angle)*1.7,.14,Math.cos(angle)*1.7])).toArray(),
    look:p.clone().add(V([0,-.10,0])).toArray(),fov:35,kind:'cargo-dialogue',subject:'weihe'};
  }
  if(l&&state.states[l.speaker]?.visible){
   const i=Number(l.id.split('_')[1]),since=t-l.start,listener=state.states[l.speaker].target;
   if(listener&&state.states[listener]?.visible&&since<.55&&i%4===0)return portrait(listener,state,{reaction:true});
   return portrait(l.speaker,state,{close:i%5!==0});
  }
  if(l){const listener=Object.keys(state.states).find(k=>state.states[k].visible);return portrait(listener,state,{reaction:true});}
  return wide;
 }
 function update(camera,state,free=null){
  const shot=free?{...free,kind:'diagnostic',look:free.lookAt}:choose(state);
  camera.position.fromArray(shot.pos);const target=V(shot.look);
  if(!free&&['portrait','medium','reaction'].includes(shot.kind)){
   const age=state.active?state.t-state.active.start:state.lt;camera.position.lerp(target,Math.min(.04,age*.006));
  }
  const hit=state.impacts.find(e=>state.t>=e.time&&state.t<e.time+.13);
  if(hit){const u=state.t-hit.time;camera.position.x+=Math.sin(u*95)*.018*(1-u/.13);camera.position.y+=Math.sin(u*71)*.009*(1-u/.13);}
  camera.fov=shot.fov??36;camera.lookAt(target);camera.updateProjectionMatrix();
  return{...shot,pos:camera.position.toArray(),look:target.toArray()};
 }
 return{update,choose};
}
