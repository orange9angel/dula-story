import * as THREE from 'three';
import {T} from './config/event_times.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

export function createStoryFX(actors,scenes){
  const y=actors.yekari;
  const scratches=[];
  for(let i=0;i<2;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.85,.012),new THREE.MeshBasicMaterial({color:'#b9bdd0',transparent:true,opacity:.75,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.rotation.z=i?.32:-.35;m.position.set(-1.12+i*.07,.012,2.96+i*.24);
    scenes.shrine.scene.add(m);scratches.push(m);
  }
  const oldScar=new THREE.Mesh(new THREE.TorusGeometry(.044,.003,6,22,Math.PI*1.7),new THREE.MeshBasicMaterial({color:'#51434b'}));
  oldScar.position.set(-.09,.04,.247);actors.aoao.shieldDome.add(oldScar);
  const strap=new THREE.Group();scenes.shrine.scene.add(strap);
  const straps=Array.from({length:6},()=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(.022,.005,1),new THREE.MeshToonMaterial({color:'#6f5041'}));
    strap.add(m);return m;
  });
  const buckle=new THREE.Mesh(new THREE.TorusGeometry(.015,.003,5,4),new THREE.MeshBasicMaterial({color:'#c7b792'}));
  strap.add(buckle);
  const disc=actors.xiaozao.bracerDiscL,ports=[];
  for(const [i,[x,y]] of [[0,0],[.03,0],[-.03,0],[0,.03],[0,-.03],[.021,.021],[-.021,-.021],[.021,-.021],[-.021,.021]].entries()){
    const port=new THREE.Mesh(new THREE.CircleGeometry(.0055,8),new THREE.MeshBasicMaterial({color:'#c1f5ff',side:THREE.DoubleSide}));
    port.position.set(x,y,.005);disc.add(port);ports.push(port);
  }
  const damage=new THREE.Group();disc.add(damage);
  for(const [x,y] of [[-.03,0],[-.021,-.021]]){
    const mark=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x-.008,y+.006,.006),V(x+.003,y-.003,.006),V(x+.009,y-.013,.006)]),new THREE.LineBasicMaterial({color:'#343d4b'}));damage.add(mark);
  }
  const bolts=[],trails=new THREE.Group();scenes.shrine.scene.add(trails);
  const chargeFX=new THREE.Group(),chargeBits=[],fistRings=[];scenes.shrine.scene.add(chargeFX);
  for(let i=0;i<20;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.012,5,4),new THREE.MeshBasicMaterial({color:i%3?'#ffc879':'#fff1d1',transparent:true,opacity:.7}));
    chargeFX.add(m);chargeBits.push(m);
  }
  for(let i=0;i<2;i++){
    const m=new THREE.Mesh(new THREE.TorusGeometry(.07,.003,4,24),new THREE.MeshBasicMaterial({color:'#ffd38b',transparent:true,opacity:.6}));
    chargeFX.add(m);fistRings.push(m);
  }
  for(let i=0;i<26;i++){
    const b=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),new THREE.MeshBasicMaterial({color:i%3?'#a6e8ff':'#ffffff',transparent:true,opacity:.9}));
    b.scale.set(.32,.32,2.4);
    const tail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),new THREE.LineBasicMaterial({color:'#90d7ff',transparent:true,opacity:.6}));
    trails.add(b,tail);bolts.push({b,tail});
  }
  const blockLines=new THREE.Group();scenes.shrine.scene.add(blockLines);
  for(let i=0;i<6;i++){
    const z=4.1+i*.23;
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-1.65,.1,z),V(-1.65,1.8,z)]),new THREE.LineBasicMaterial({color:'#86c9ff',transparent:true,opacity:.2}));
    blockLines.add(line);
  }
  const rainGeo=new THREE.BufferGeometry(),rainData=new Float32Array(240*6);
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rainData,3));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#c4e2ff',transparent:true,opacity:.50,depthWrite:false}));
  scenes.gate.scene.add(rain);
  const border=new THREE.Mesh(new THREE.PlaneGeometry(10,.10),new THREE.MeshBasicMaterial({color:'#8bbcd9',transparent:true,opacity:.24,depthWrite:false}));
  border.rotation.x=-Math.PI/2;border.position.set(0,.02,-1.56);scenes.gate.scene.add(border);
  const curtain=new THREE.Mesh(new THREE.PlaneGeometry(9,6),new THREE.MeshBasicMaterial({color:'#9cbacb',transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide}));
  curtain.position.set(0,3.2,-2);scenes.gate.scene.add(curtain);
  // Quiet domestic lights establish why keeping the fire matters.
  for(const scene of [scenes.colonnade,scenes.shrine])for(let i=0;i<5;i++){
    const house=new THREE.Mesh(new THREE.BoxGeometry(1.1,.7,.7),new THREE.MeshBasicMaterial({color:'#151e2b'}));
    house.position.set(-12+i*5.5,.35,-16-(i%2)*2);scene.scene.add(house);
    const window=new THREE.Mesh(new THREE.PlaneGeometry(.15,.22),new THREE.MeshBasicMaterial({color:'#f2ba66'}));
    window.position.set(house.position.x,.45,house.position.z+.36);scene.scene.add(window);
  }
  function chain(t,states){
    const socket=y.chainSocket.getWorldPosition(new THREE.Vector3());let endpoint=null,slack=.07;
    const throwAt=(start,hit,finish,target,low)=>{
      if(t<start||t>finish)return;
      const before=t<=hit,u=before?clamp((t-start)/(hit-start)):1-clamp((t-hit)/(finish-hit));
      endpoint=socket.clone().lerp(target,ease(u));
      endpoint.y-=Math.sin(Math.PI*u)*(low?.7:-.48);slack=.03;
    };
    const wrist=actors.aoao.hands.left.getWorldPosition(new THREE.Vector3());
    throwAt(T.C1+.30,T.SECOND_CUT,T.SECOND_CUT+.75,wrist,true);
    if(t>=T.C1+.30&&t<=T.SECOND_CUT){
      const knots=[[T.C1+.30,socket],[T.C1+.55,V(-1.12,.035,2.96)],
        [T.C1+.76,V(-1.32,.40,2.90)],[T.C1+.98,V(-1.05,.035,3.20)],
        [T.SECOND_CUT,wrist]];
      const i=Math.min(knots.length-2,Math.max(0,knots.findIndex((p,j)=>j<knots.length-1&&t<=knots[j+1][0])));
      endpoint=knots[i][1].clone().lerp(knots[i+1][1],ease((t-knots[i][0])/(knots[i+1][0]-knots[i][0])));
    }
    if(t>=197&&t<200.5){
      endpoint=socket.clone().add(V(Math.sin((t-197)*4)*.24,.55,0));slack=.025;
    }
    throwAt(204.8,T.DISC_DROP,T.DISC_DROP+.7,actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3()),false);
    throwAt(T.C3-.8,T.C3+.2,T.C3+1.2,actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3()),true);
    y.setChainEndWorld(endpoint,slack);
  }
  function update(t,states){
    chain(t,states);
    damage.visible=t>=T.DISC_DROP;
    ports.forEach((m,i)=>{m.visible=t>=T.EYE3+i*.11&&t<T.C4-.8&&i!==2&&i!==6;});
    chargeFX.visible=t>=T.FIN_CHARGE&&t<T.C4;
    if(chargeFX.visible){
      const fists=['left','right'].map(side=>actors.dafu.hands[side].getWorldPosition(new THREE.Vector3()));
      const strength=ease((t-T.FIN_CHARGE)/2);
      chargeBits.forEach((m,i)=>{
        const u=((t-T.FIN_CHARGE)*1.3+i*.13)%1,a=i*2.4+t*2,rad=.07+.12*(1-u);
        m.position.copy(fists[i%2]).add(V(Math.cos(a)*rad,-.55*(1-u),Math.sin(a)*rad));
        m.scale.set(.7,2.4,.7);m.material.opacity=strength*Math.sin(u*Math.PI)*.75;
      });
      fistRings.forEach((m,i)=>{m.position.copy(fists[i]);m.rotation.set(t*1.5,i*Math.PI/2,t);m.material.opacity=.5*strength;});
    }
    strap.visible=t>=T.SECOND_CUT&&t<T.DEPART;
    if(strap.visible){
      const start=actors.aoao.hands.left.getWorldPosition(new THREE.Vector3()).add(V(-.015,-.025,.018));
      const free=start.clone().add(V(-.05,-.17,.025));
      const grasp=actors.dafu.hands.right.getWorldPosition(new THREE.Vector3()).add(V(0,0,.035));
      const hold=ease((t-327.4)/1.1)*(1-ease((t-337)/1.4));
      const end=free.lerp(grasp,hold),point=u=>start.clone().lerp(end,u).add(V(0,-.025*Math.sin(Math.PI*u),0));
      for(let i=0;i<straps.length;i++){
        const a=point(i/6),b=point((i+1)/6),m=straps[i];
        m.position.copy(a).lerp(b,.5);m.lookAt(b);m.scale.z=a.distanceTo(b);
      }
      buckle.position.copy(start).lerp(end,.17);buckle.rotation.set(Math.PI/2,0,0);
    }
    scratches.forEach((m,i)=>m.visible=t>=T.C1+.55+i*.43);
    // A short test burst, then a directed sustained firing lane with one exit left for Dafu.
    const test=t>=T.TEST_SHOT&&t<T.TEST_SHOT+1.0;
    const rainOn=t>=T.RAIN_RELEASE&&t<T.C4-.8;
    trails.visible=test||rainOn;blockLines.visible=t>=T.C3&&t<T.C4;
    if(trails.visible){
      const source=actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3());
      const localTime=t-(test?T.TEST_SHOT:T.RAIN_RELEASE);
      for(let i=0;i<bolts.length;i++){
        const {b,tail}=bolts[i];b.visible=tail.visible=(!test||i<4)&&localTime>=i*.065;
        const u=((localTime-i*.065)%.55+.55)%.55/.55;
        const target=test?y.chainSocket.getWorldPosition(new THREE.Vector3()).add(V(0,.5,0)):
          i%3===0?V(-.85,1.45+(i%4)*.08,4.22):V(-1.65,.15+(i%5)*.33,4.05+(i%7)*.16);
        b.position.copy(source).lerp(target,u);
        b.lookAt(target);
        const back=source.clone().lerp(target,Math.max(0,u-.18));
        const data=tail.geometry.attributes.position;
        data.setXYZ(0,back.x,back.y,back.z);data.setXYZ(1,b.position.x,b.position.y,b.position.z);data.needsUpdate=true;
        b.material.opacity=.5+.4*Math.sin(Math.PI*u);tail.material.opacity=.35;
      }
    }
    rain.visible=border.visible=curtain.visible=t>=T.GATE;
    if(rain.visible){
      for(let i=0;i<240;i++){
        const x=((i*37)%101)/101*10-5,z=-1.65-((i*53)%103)/103*6;
        const ground=clamp((-z-1.5)/6)*2.3;
        const h=ground+(((i*.173-t*7)%6)+6)%6,k=i*6;
        rainData.set([x,h,z,x+.025,Math.max(ground,h-.30),z+.015],k);
      }
      rainGeo.attributes.position.needsUpdate=true;
    }
  }
  return{update};
}
