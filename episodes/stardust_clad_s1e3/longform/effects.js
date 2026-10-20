import * as THREE from 'three';
import {impactParticles} from 'dula-assets/lib/craft3d/impact-particles.js';
import {strand} from './props.js';
const V=a=>new THREE.Vector3(...a);
export function createEffects(stage,actors,performance){
 const groups=[];
 function setImpacts(samples){
  for(const e of performance.eventTimes.impacts){
   const g=new THREE.Group();g.position.fromArray(samples[e.id]);stage.scene.add(g);g.visible=false;
   const parts=impactParticles(g,{color:e.attacker==='xiaozao'?'#d6eeed':'#bcadd3',scale:e.zone==='guard'?.19:.29,normal:V([e.attacker==='xiaozao'?1:-1,.1,.2]),count:54});
   parts.shock.visible=false;groups.push({event:e,group:g,parts});
  }
 }
 const wisps=Array.from({length:22},(_,i)=>strand(stage.scene,i%3?'#90c9d1':'#d7eeec',.008+i%4*.006,35));
 const trails=Array.from({length:3},()=>strand(stage.scene,'#d1e2de',.013,18));
 const wake=Array.from({length:6},(_,i)=>strand(stage.scene,i%2?'#dceee5':'#9bc6d1',.009,24));
 const steamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{alpha:{value:0},time:{value:0},tint:{value:new THREE.Color('#b3d5d9')}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv;uniform float alpha,time;uniform vec3 tint;
  void main(){vec2 q=vUv*2.-1.;float n=sin(q.y*11.+time*1.1)+sin(q.x*9.-q.y*5.+time*.3)*.5;
  float edge=exp(-q.x*q.x*4.-q.y*q.y*2.5);float a=edge*(.5+.2*n)*alpha;gl_FragColor=vec4(tint,a);}`});
 const steam=new THREE.Mesh(new THREE.PlaneGeometry(6,5),steamMat);steam.position.set(0,1,-1.4);stage.scene.add(steam);
 function update(state,camera){
  const {t,n,story:s}=state;
  for(const e of groups){const age=t-e.event.time;e.group.visible=age>=0&&age<.78;if(e.group.visible)e.parts.update(age,camera);}
  for(const[i,o]of wisps.entries()){
   const release=s.release??0,arrival=s.enemyEntrance??0,burst=s.marketBurst??0,power=release||arrival*.5||burst*.6,a=i*2.399;
   o.update(V([0,0,0]),V([0,0,0]),camera,{alpha:power*(.10+.17*(i%3)),curve:u=>{
    if(s.cutaway==='market')return V([-4+u*10,.5+(i%5)*.36+Math.sin(u*3+i)*.07,-1.8+Math.sin(a)*.65]);
    if(arrival>0)return V([.8+Math.sin(a+u*1.6)*(.35+(i%3)*.1),.1+u*3.4,.1+Math.cos(a+u*1.6)*.42]);
    const y=-6+u*10,r=.75+u*1.35;return V([Math.sin(a+u*2.6+t*.5)*r,y,-4.25+Math.cos(a+u*2.6+t*.5)*r]);
   }});
  }
  const hit=state.impacts.find(e=>t>=e.time-.17&&t<=e.time+.03);
  for(const[i,o]of trails.entries()){
   if(!hit){o.mesh.visible=false;continue;}
   const hand=(hit.type==='kick'?actors[hit.attacker].feet[hit.side??'right']:actors[hit.attacker].hands[hit.side??'right']).getWorldPosition(new THREE.Vector3()),yaw=state.states[hit.attacker].yaw;
   o.update(hand.clone().add(V([-Math.sin(yaw)*.25,-.015*i,-Math.cos(yaw)*.25])),hand,camera,{alpha:.35*(1-i*.2),sag:.015});
  }
  const force=state.impacts.find(e=>e.attacker==='xiaozao'&&!e.zone&&t>=e.time-.14&&t<e.time+.45);
  for(const[i,o]of wake.entries()){
   if(!force){o.mesh.visible=false;continue;}
   const p=actors.xiaozao.hands[force.side??'right'].getWorldPosition(new THREE.Vector3()),age=t-force.time,fade=Math.sin(Math.PI*(age+.14)/.59);
   const yaw=state.states.xiaozao.yaw,dir=V([Math.sin(yaw),0,Math.cos(yaw)]),side=V([Math.cos(yaw),0,-Math.sin(yaw)]);
   o.update(p,p,camera,{alpha:.28*fade,curve:u=>{
    const angle=i*Math.PI/3+u*1.1,r=.07+u*(.22+Math.max(0,age)*.3);
    return p.clone().addScaledVector(dir,u*(.25+Math.max(0,age)*1.1)).addScaledVector(side,Math.cos(angle)*r).add(V([0,Math.sin(angle)*r,0]));
   }});
  }
  steam.visible=(s.heatBurst??0)>.01||(s.release??0)>.01;
  steamMat.uniforms.alpha.value=Math.max(s.heatBurst??0,s.release??0)*.18;steamMat.uniforms.time.value=t;steam.quaternion.copy(camera.quaternion);
 }
 return{setImpacts,update,groups};
}
