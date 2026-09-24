import * as THREE from 'three';
import {HybridRiver} from '/craft/environment3d.js';
import {mesh,ellipsoid} from '/craft/character3d.js';
import {RiverKid,LoafCat} from './characters.js';
import {V,sampleKid,worldPoint,bookLocal,penLocal,loosePageAt,SKETCH,SKETCH_BREAKS,sketchAt} from './performance.js';
import {smooth,mix,clamp} from './timeline.js';
import {twoBone} from '/craft/pose3d.js';
import {gripAnchor,paperHandQuaternion} from './paper-grip.js';

function line(parent,points,color='#7c8178',width=1){
  const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,linewidth:width}));parent.add(m);return m;
}
function pageTexture(progress=1,symbol=false){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=544;
  paintPage(canvas,progress,symbol);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function paintPage(canvas,progress,symbol){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.fillStyle='#fff8e5';c.fillRect(0,0,w,h);
  c.strokeStyle='#868a7b';c.lineWidth=2.3;c.lineCap='round';const count=progress*(SKETCH.length-1);
  // Independent pencil strokes, with the same sampled tip used by the hand.
  for(let i=0;i<Math.min(Math.ceil(count),SKETCH.length-1);i++){
    if(SKETCH_BREAKS.has(i+1))continue;const u=clamp(count-i),a=SKETCH[i],b=SKETCH[i+1];
    c.beginPath();c.moveTo(w*(.5+a[0]),h*(.5+a[1]));c.lineTo(w*(.5+mix(a[0],b[0],u)),h*(.5+mix(a[1],b[1],u)));c.stroke();
  }
  if(symbol){
    const x=w*.79,y=h*.81,r=27;c.lineWidth=1.2;c.strokeStyle='#7d8290';
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;c.beginPath();c.moveTo(x+Math.cos(a)*r*.27,y+Math.sin(a)*r*.27);c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);c.stroke();
      c.beginPath();c.moveTo(x+Math.cos(a-.18)*r*.74,y+Math.sin(a-.18)*r*.74);c.lineTo(x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55);c.lineTo(x+Math.cos(a+.18)*r*.74,y+Math.sin(a+.18)*r*.74);c.stroke();
    }c.beginPath();c.arc(x,y,r*.30,0,Math.PI*2);c.stroke();c.beginPath();c.arc(x,y,r*.08,0,Math.PI*2);c.stroke();
  }
}
function paper(map,width=.40,height=.29){return new THREE.Mesh(new THREE.PlaneGeometry(width,height,10,8),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));}
function worldQuat(p,q=new THREE.Quaternion()){return new THREE.Quaternion().setFromAxisAngle(V(0,1,0),p.yaw).multiply(q);}
function setHandTarget(p,side,grip,quaternion,weight=1){
  const sign=side==='left'?-1:1,inv=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),-p.yaw),q=inv.clone().multiply(quaternion);
  const target=grip.clone().sub(V(p.rootX,0,p.rootZ)).applyQuaternion(inv).sub(gripAnchor(sign).applyQuaternion(q));
  target.lerp(V(p[side+'Arm'][2].x,p[side+'Arm'][2].y,p[side+'Arm'][2].z),1-weight);
  const start=p[side+'Arm'][0],d=target.clone().sub(start),lengths=p.armLengths,max=lengths[0]+lengths[1]-.002;
  if(d.length()>max)target.copy(start).add(d.setLength(max));
  p[side+'Arm']=[start,twoBone(start,target,V(side==='left'?-.25:.25,-.7,-.7),...lengths),target];
  p[side+'GripQuaternion']=q;p[side+'GripWeight']=weight;
  return weight>.999?worldPoint(p,target.clone().add(gripAnchor(sign).applyQuaternion(q))).distanceTo(grip):0;
}

export class EpisodeScene {
  constructor(plan){
    this.plan=plan;this.river=new HybridRiver(plan.environment,plan.duration);this.scene=this.river.scene;this.river.shadow.visible=false;
    // Crown volumes hold their shape under reverse angles and overhead shots.
    this.crowns=[];
    for(const c of this.river.crowns){
      c.mesh.visible=false;const m=ellipsoid(this.scene,c.base.toArray(),[.61,.42,.49],c.mesh.material.map.image?['#79a870','#87b479','#679961'][this.crowns.length%3]:'#79a870',false);
      this.crowns.push({mesh:m,base:c.base.clone(),phase:c.phase});
    }
    this.girl=new RiverKid('Girl');this.boy=new RiverKid('Boy');this.scene.add(this.girl.mesh,this.boy.mesh);this.cat=new LoafCat(this.scene);
    this.shadows=[];
    for(const [x,z,sx,sz] of [[-.68,.46,.31,.14],[.52,.18,.30,.25],[1.45,.52,.33,.19]]){
      const m=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:'#638462',transparent:true,opacity:.26,depthWrite:false}));
      m.rotation.x=-Math.PI/2;m.position.set(x,.006,z);m.scale.set(sx,sz,1);this.scene.add(m);this.shadows.push(m);
    }
    const stool=new THREE.Group();stool.position.set(.52,0,.18);stool.rotation.y=-.58;this.scene.add(stool);
    const seat=mesh(stool,new THREE.CylinderGeometry(.22,.23,.06,24),'#b49a73');seat.position.y=.3975;
    for(const x of [-.14,.14])for(const z of [-.12,.12]){const leg=mesh(stool,new THREE.CylinderGeometry(.025,.035,.3775,10),'#8f7a5e');leg.position.set(x,.18875,z);}
    for(let i=0;i<32;i++)ellipsoid(this.scene,[-10+i*.64,-.02,-.91],[.34,.12,.21],['#b6b99c','#a9b391','#c2c4a4'][i%3],false);
    // Back-side scenery is real volume as well, so dialogue reverse shots have a set.
    for(const [x,z] of [[-5,3.5],[8.2,3.1],[7,1.7],[-8,-9],[3,-9.4]]){
      const trunk=mesh(this.scene,new THREE.CylinderGeometry(.07,.12,1.45,9),'#948366',false);trunk.position.set(x,.72,z);
      for(let i=0;i<4;i++)ellipsoid(this.scene,[x+Math.sin(i*2)*.38,1.72+i*.15,z+Math.cos(i*2)*.26],[.62,.66,.58],i%2?'#86ab76':'#779f6c',false);
    }
    this.book=new THREE.Group();this.scene.add(this.book);
    const cover=mesh(this.book,new THREE.BoxGeometry(.435,.321,.022),'#b4966e');cover.position.z=-.006;
    this.bookMap=pageTexture(1);this.bookPage=paper(this.bookMap);this.bookPage.position.z=.009;this.book.add(this.bookPage);
    for(let i=0;i<9;i++){
      const ring=mesh(this.book,new THREE.TorusGeometry(.012,.0025,5,12),'#817f75',false);ring.position.set(-.216,-.123+i*.030,.017);ring.rotation.y=Math.PI/2;
    }
    this.plainMap=pageTexture(1);this.loose=paper(this.plainMap);this.scene.add(this.loose);this.restLoose=this.loose.geometry.attributes.position.array.slice();
    this.gift=paper(this.plainMap,.44,.30);this.scene.add(this.gift);
    this.pencil=new THREE.Group();this.scene.add(this.pencil);
    const pencil=mesh(this.pencil,new THREE.CylinderGeometry(.006,.006,.16,6),'#d2a65a',false);pencil.position.y=.10;
    const tip=mesh(this.pencil,new THREE.ConeGeometry(.006,.04,6),'#65685f',false);tip.position.y=.02;tip.rotation.z=Math.PI;
    this.ripple=new THREE.Group();this.scene.add(this.ripple);
    for(let i=0;i<3;i++){const pts=[];for(let j=0;j<=80;j++){const a=j/80*Math.PI*2;pts.push(V(Math.cos(a)*(.27+i*.07),0,Math.sin(a)*(.19+i*.04)));}line(this.ripple,pts,'#d7e6d2');}
    this.lastBook='';
  }
  update(t,camera){
    const plan=this.plan,B=plan.beats,env=this.river.update(t,camera,-.1,{moving:true});this.river.shadow.visible=false;
    for(const c of this.crowns){const w=this.river.motion.response(t,c.base.x,c.base.z,.35);c.mesh.position.copy(c.base).add(V(.10*w+.012*Math.sin(t*1.5+c.phase)*w,0,0));}
    const girl=sampleKid('Girl',t,plan,env.windWorld),boy=sampleKid('Boy',t,plan,env.windWorld);
    const book=bookLocal(boy);this.book.position.copy(worldPoint(boy,book.position));this.book.quaternion.copy(worldQuat(boy,book.quaternion));
    const pen=penLocal(boy,t,plan),tip=worldPoint(boy,pen.tip),grip=worldPoint(boy,pen.grip);
    const drawing=t<B.lift||t>=B.draw&&t<B.offer;
    const penContactError=drawing?worldPoint(boy,V(boy.rightArm[2].x,boy.rightArm[2].y,boy.rightArm[2].z).addScaledVector(pen.direction,.065)).distanceTo(grip):0;
    this.pencil.position.copy(tip);this.pencil.quaternion.setFromUnitVectors(V(0,1,0),grip.clone().sub(tip).normalize());
    this.pencil.visible=t<B.lift||t>=B.draw&&t<B.offer;
    // Keep the pencil beside the notebook after drawing, instead of erasing it.
    if(!this.pencil.visible){this.pencil.visible=true;this.pencil.position.copy(V(-.184,-.10,.019).applyQuaternion(this.book.quaternion).add(this.book.position));this.pencil.quaternion.copy(this.book.quaternion);}
    const progress=t<B.lift?1:t<B.draw?0:sketchAt(t,plan).progress,symbol=t>=B.symbol;
    const key=`${Math.floor(progress*120)}/${symbol}`;
    if(key!==this.lastBook){paintPage(this.bookMap.image,progress,symbol);this.bookMap.needsUpdate=true;this.lastBook=key;}
    const loose=loosePageAt(t,plan,boy);this.loose.visible=t>=B.lift;
    this.loose.position.copy(loose.position);this.loose.quaternion.copy(loose.quaternion);
    const lp=this.loose.geometry.attributes.position;
    for(let i=0;i<lp.count;i++){const x=this.restLoose[i*3],y=this.restLoose[i*3+1];lp.setXYZ(i,x,y,loose.air*.021*Math.sin(t*7+x*15+y*7));}lp.needsUpdate=true;
    this.ripple.visible=t>=B.drift;this.ripple.position.copy(loose.position);this.ripple.position.y=.015;this.ripple.scale.setScalar(1+.06*Math.sin(t*2));
    this.gift.visible=t>=B.offer;
    let handError=0;
    const bookSupport=1-smooth((t-(B.stop-.25))/.65)*(1-smooth((t-(B.calm+1))/(B.drift-.1-(B.calm+1))));
    const supportWeight=Math.max(bookSupport*(1-smooth((t-(B.offer-.25))/.6)),smooth((t-(B.accept-.25))/.65));
    if(supportWeight>0){const q=paperHandQuaternion(this.book.quaternion,1,-1),grip=V(-.21,-.035,.004).applyQuaternion(this.book.quaternion).add(this.book.position);setHandTarget(boy,'left',grip,q,supportWeight);}
    if(!drawing){const q=paperHandQuaternion(this.book.quaternion,-1,1),grip=V(.21,-.035,.004).applyQuaternion(this.book.quaternion).add(this.book.position);setHandTarget(boy,'right',grip,q);}
    if(this.gift.visible){
      const u=smooth((t-(B.offer+.55))/1.15),receive=smooth((t-(B.accept-.35))/.85);
      const held=worldPoint(girl,V(0,1.00,.28)),target=V(-.24,1.00,.51),initial=this.book.position.clone().add(V(0,.018,0));
      this.gift.position.copy(initial.lerp(target,u).lerp(held,receive));
      const q0=this.book.quaternion.clone(),q1=new THREE.Quaternion(),q2=worldQuat(girl);
      this.gift.quaternion.copy(q0.slerp(q1,u).slerp(q2,receive));
      const hold=(p,side,edge,y,weight)=>{
        if(weight<=0)return;
        const grip=V(edge*.21,y,0).applyQuaternion(this.gift.quaternion).add(this.gift.position),q=paperHandQuaternion(this.gift.quaternion,-edge,side==='left'?-1:1);
        handError=Math.max(handError,setHandTarget(p,side,grip,q,weight));
      };
      hold(boy,'left',1,.018,smooth((t-B.offer)/.50)*(1-smooth((t-(B.accept-.65))/.28)));
      hold(girl,'left',-1,-.018,smooth((t-(B.offer+1.08))/.62));
      hold(girl,'right',1,-.018,smooth((t-(B.accept-.05))/.65));
    }
    this.girl.setPose(girl);this.boy.setPose(boy);this.cat.update(t);
    this.shadows[0].position.x=girl.rootX;
    return {girl,boy,environment:env,page:loose.position.toArray(),handError,penContactError,symbol,bookPosition:this.book.position.toArray(),giftPosition:this.gift.position.toArray()};
  }
}

export function cameraAt(t,shot,episode,camera){
  const u=smooth((t-shot.start)/(shot.end-shot.start)),B=episode.plan.beats;
  let a,b,target,fov=36;
  const shotCameras={
    establish:[[5.8,3.0,7.4],[4.6,2.7,6.7],[0,.9,-.55],39],
    arrival:[[2.4,1.75,5.1],[1.8,1.6,4.6],[-.15,.87,.15],36],
    girl:[[-.10,1.5,2.35],[-.18,1.48,2.25],[-.68,1.30,.46],33],
    boy:[[-.2,1.39,2.22],[-.13,1.37,2.12],[.52,1.14,.18],32],
    sketchWide:[[-2.2,1.9,4.2],[-1.7,1.8,4.0],[-.10,.86,.05],38],
    gust:[[-1.4,2.45,5.4],[-.8,2.22,4.9],[-.65,1.18,-.4],42],
    girlAlarm:[[.05,1.60,2.85],[-.03,1.54,2.60],[-.60,1.19,.45],36],
    stop:[[-.6,1.37,2.55],[-.48,1.36,2.30],[.39,1.10,.21],36],
    boyRiver:[[-.5,1.38,2.30],[-.2,1.38,2.30],[.50,1.15,.18],34],
    overGirl:[[-2.1,1.60,2.15],[-2.04,1.58,2.10],[.48,1.12,.18],38],
    offer:[[.7,1.6,3.6],[.3,1.45,3.3],[-.1,.95,.36],37],
    accept:[[-.03,1.49,2.6],[-.16,1.47,2.45],[-.61,1.23,.45],35],
    farewell:[[2.8,2.35,5.2],[5.5,3.6,8.1],[.0,1.0,-.4],39]
  };
  if(shot.camera==='pageLift'){
    const boy=sampleKid('Boy',t,episode.plan,{x:0,z:0}),page=loosePageAt(t,episode.plan,boy).position;
    a=V(-.45,1.68,1.85);b=V(.1,1.95,1.5);target=V(.47,.89,.23).lerp(page,.70*u);fov=42;
  }else if(shot.camera==='water'){
    const boy=sampleKid('Boy',t,episode.plan,{x:0,z:0}),page=loosePageAt(t,episode.plan,boy).position;
    a=page.clone().add(V(.80,.43,1.24));b=page.clone().add(V(.70,.36,1.17));target=page.clone().add(V(0,.08,-.12));fov=37;
  }else if(shot.camera==='drawing'||shot.camera==='symbol'){
    const boy=sampleKid('Boy',t,episode.plan,{x:0,z:0}),book=worldPoint(boy,bookLocal(boy).position);
    const symbol=shot.camera==='symbol';a=book.clone().add(symbol?V(.0,.58,.96):V(.34,.65,1.04));
    b=symbol?a.clone():book.clone().add(V(.29,.62,.98));target=book;fov=symbol?28:32;
  }else{const c=shotCameras[shot.camera];if(!c)throw new Error(`Unknown camera ${shot.camera}`);a=V(...c[0]);b=V(...c[1]);target=V(...c[2]);fov=c[3];}
  camera.position.copy(a.lerp(b,u));camera.fov=fov;camera.up.set(0,1,0);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  return {position:camera.position.toArray(),target:target.toArray(),fov};
}
