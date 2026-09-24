import * as THREE from 'three';
import {EnvironmentMotion,seed} from './environment-motion.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function texture(w,h,paint){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  paint(canvas.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function card(map,w,h){return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,alphaTest:.45,side:THREE.DoubleSide}));}
function plane(scene,w,h,color,y,z=0){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color}));
  m.rotation.x=-Math.PI/2;m.position.set(0,y,z);scene.add(m);return m;
}
function branch(scene,a,b,r,color){
  const delta=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r*.68,r,delta.length(),7),new THREE.MeshBasicMaterial({color}));
  m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());scene.add(m);return m;
}
function leafGeometry(){
  const s=new THREE.Shape();s.moveTo(-.5,0);s.quadraticCurveTo(0,.36,.5,0);s.quadraticCurveTo(0,-.36,-.5,0);return new THREE.ShapeGeometry(s,5);
}

export class HybridRiver {
  constructor(cues,duration){
    this.motion=new EnvironmentMotion(cues,duration);this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b9e4e5');
    this.scene.add(new THREE.AmbientLight(0xffffff,.7));
    const key=new THREE.DirectionalLight(0xffffff,1.5);key.position.set(-3,7,5);this.scene.add(key);
    plane(this.scene,100,100,'#91b878',-.009);
    plane(this.scene,100,7,'#83c4ce',-.004,-4.5);
    plane(this.scene,100,.22,'#bdd08c',-.002,-.95);
    const far=texture(4096,1024,(c,w,h)=>{
      c.fillStyle='#b9e4e5';c.fillRect(0,0,w,h);
      for(let layer=0;layer<3;layer++){
        c.fillStyle=['#9bc9c3','#7fb1a9','#70a092'][layer];c.beginPath();c.moveTo(0,h);
        for(let x=0;x<=w;x+=16)c.lineTo(x,850+layer*38-22*Math.sin(x*.008+layer)-15*Math.sin(x*.019+layer*2));
        c.lineTo(w,h);c.fill();
      }
    });
    const horizon=new THREE.Mesh(new THREE.CylinderGeometry(18,18,7,128,1,true),new THREE.MeshBasicMaterial({map:far,side:THREE.BackSide}));
    horizon.position.y=2.5;this.scene.add(horizon);
    const path=texture(2048,512,(c,w,h)=>{
      c.fillStyle='#d8d1a5';c.beginPath();c.moveTo(0,h*.30);c.bezierCurveTo(w*.3,h*.68,w*.6,h*.05,w,h*.34);
      c.lineTo(w,h*.65);c.bezierCurveTo(w*.6,h*.44,w*.3,h*.96,0,h*.66);c.closePath();c.fill();
      for(let i=0;i<80;i++)ellipse(c,seed(i)*w,(.4+seed(i+500)*.22)*h,4+seed(i+90)*12,2,'#c3be97');
    });
    const trail=card(path,24,5);trail.rotation.x=-Math.PI/2;trail.position.set(0,.001,.45);this.scene.add(trail);
    const cloudMap=texture(512,192,(c)=>{
      ellipse(c,260,129,230,37,'#f5f8e9');ellipse(c,133,99,71,54,'#f5f8e9');ellipse(c,240,83,90,69,'#fffbea');ellipse(c,341,109,74,43,'#fffbea');
    });
    this.clouds=[];
    for(let i=0;i<9;i++){
      const m=card(cloudMap,2.3+seed(i+20)*1.5,.8);this.scene.add(m);
      this.clouds.push({mesh:m,x:-15+i*3.8,y:3.45+seed(i+31)*.65,z:-10-seed(i+17)*5});
    }
    this.ripples=[];
    for(let i=0;i<100;i++){
      const g=new THREE.BufferGeometry().setFromPoints([V(-.5,0,0),V(.5,0,0)]);
      const m=new THREE.Line(g,new THREE.LineBasicMaterial({color:i%3?'#bce1d9':'#e2eee0',transparent:true,opacity:.55,depthWrite:false}));
      const r={mesh:m,x:-14+seed(i+61)*28,z:-1.3-seed(i+36)*6.3,width:.14+seed(i+80)*.55,phase:seed(i+47)*6};
      this.scene.add(m);this.ripples.push(r);
    }
    this.crowns=[];this.strands=[];this.grasses=[];this.looseLeaves=[];
    const canopyMaps=['#699c64','#77a86b','#88b777','#5d925f'].map((color,id)=>texture(256,192,c=>{
      for(let j=0;j<16;j++)ellipse(c,58+seed(j+id*81)*140,55+seed(j+30+id*7)*80,35+seed(j+28)*27,25+seed(j+66)*24,color);
    }));
    const leaves=leafGeometry();this.leafMaterial=new THREE.MeshBasicMaterial({color:'#608d51',side:THREE.DoubleSide});
    for(const [tree,x,z,height] of [[0,-3.6,-.58,3.0],[1,2.6,-.62,3.55]]){
      const base=V(x,0,z),fork=V(x+.15,height*.58,z-.03);
      branch(this.scene,base,fork,.14,'#8e8160');
      for(let arm=0;arm<5;arm++){
        const a=arm/5*Math.PI*2,tip=V(x+Math.cos(a)*.8,height-.18+seed(arm)*.4,z+Math.sin(a)*.5);
        branch(this.scene,fork,tip,.058,'#95835e');
      }
      for(let i=0;i<23;i++){
        const a=i*2.399,rad=Math.sqrt((i+.5)/23),m=card(canopyMaps[(i+tree)%4],1.35,.96);
        const p=V(x+Math.cos(a)*rad*1.15,height+.23+Math.sin(i*4)*.23,z+Math.sin(a)*rad*.69);
        m.position.copy(p);this.scene.add(m);this.crowns.push({mesh:m,base:p,phase:i*1.1});
      }
      for(let i=0;i<18;i++){
        const a=i/18*Math.PI*2,root=V(x+Math.cos(a)*1.12,height+.07,z+Math.sin(a)*.62),length=.85+seed(i+tree*31)*.65;
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(33),3));
        const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#79a160'}));this.scene.add(line);
        const foliage=new THREE.InstancedMesh(leaves,this.leafMaterial,18);foliage.instanceMatrix.setUsage(THREE.DynamicDrawUsage);foliage.frustumCulled=false;this.scene.add(foliage);
        this.strands.push({root,length,line,foliage,phase:i*.9});
      }
    }
    for(let i=0;i<68;i++){
      const x=-7+seed(i+301)*14,z=-.75+seed(i+306)*4.3;
      if(Math.abs(x+1)<.72&&z<.8)continue;
      const pos=[],idx=[];
      for(let blade=0;blade<5;blade++)for(let row=0;row<=7;row++){
        const u=row/7,h=.15+seed(i*11+blade)*.24,lean=(seed(i+blade*71)-.5)*.18;
        const cx=(blade-2)*.022+lean*u*u,cy=h*u,w=.013*(1-u),az=seed(i*7+blade+77)*Math.PI*2;
        pos.push(cx-w*Math.cos(az),cy,blade*.008-w*Math.sin(az),cx+w*Math.cos(az),cy,blade*.008+w*Math.sin(az));
        if(row<7){const k=blade*16+row*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:['#648f57','#729d59','#83ad68'][i%3],side:THREE.DoubleSide}));
      m.position.set(x,.005,z);m.frustumCulled=false;this.scene.add(m);this.grasses.push({mesh:m,rest:pos,x,z,phase:i*.73});
    }
    for(const [cueIndex,cue] of cues.filter(c=>c.kind==='wind').entries())for(let i=0;i<22;i++){
      const m=new THREE.Mesh(leaves,new THREE.MeshBasicMaterial({color:['#7c9f51','#b7bb60','#d3b66b'][i%3],side:THREE.DoubleSide}));
      const birth=cue.start+i*.095,size=.065+seed(i+2)*.065;m.scale.set(size,size,1);this.scene.add(m);
      this.looseLeaves.push({mesh:m,birth,x:-5.1+seed(i+cueIndex*9)*1.1,y:.45+seed(i+100)*2.0,z:i%6===0?.65:-.7-seed(i+170)*1.8,phase:i*2.4});
    }
    this.birdMaps=Array.from({length:9},(_,i)=>texture(128,96,c=>{
      const flap=(i-4)/4,tip=47-flap*30;
      c.strokeStyle='#526979';c.lineWidth=5;c.lineCap='round';c.beginPath();
      c.moveTo(14,tip);c.quadraticCurveTo(36,31,64,49);c.quadraticCurveTo(89,31,114,tip+2);c.stroke();
      ellipse(c,65,48,9,5,'#526979');ellipse(c,74,45,4,4,'#526979');
    }));
    this.birds=[];
    for(const cue of cues.filter(c=>c.kind==='birds'))for(let i=0;i<cue.count;i++){
      const m=card(this.birdMaps[4],.38,.285);this.scene.add(m);this.birds.push({cue,index:i,mesh:m});
    }
    this.shadow=plane(this.scene,.6,.25,'#64866b',.004);
    this.shadow.geometry.dispose();this.shadow.geometry=new THREE.CircleGeometry(1,40);this.shadow.scale.set(.34,.12,1);
    this.shadow.material.transparent=true;this.shadow.material.opacity=.30;this.shadow.material.depthWrite=false;
  }
  update(t,camera,rootX,{moving=true}={}){
    const q=moving?t:0,motion=this.motion,wind=moving?motion.response(t,rootX,0,.26):0,dummy=new THREE.Object3D();
    this.shadow.position.x=rootX;this.shadow.position.z=.03;
    for(const c of this.clouds){c.mesh.position.set(c.x+.035*q,c.y,c.z);c.mesh.quaternion.copy(camera.quaternion);}
    for(const r of this.ripples){
      r.mesh.position.set(r.x+.085*motion.distance(q),.002,r.z);r.mesh.scale.x=r.width*(1+.23*motion.wind(q,r.x,r.z));
      r.mesh.material.opacity=.25+.27*(.5+.5*Math.sin(q*.85+r.phase));
    }
    for(const c of this.crowns){
      const w=moving?motion.response(q,c.base.x,c.base.z,.35):0;
      c.mesh.position.copy(c.base);c.mesh.position.x+=.11*w+.015*Math.sin(q*1.5+c.phase)*w;
      c.mesh.quaternion.copy(camera.quaternion);
    }
    for(const s of this.strands){
      const w=moving?motion.response(q,s.root.x,s.root.z,.19):0;
      const point=u=>s.root.clone().add(V(.10*w+(.34*w+.045*Math.sin(q*2.3+s.phase-u*2)*w)*u*u,-s.length*u,.05*Math.sin(q*1.3+s.phase+u)*u*w));
      const p=s.line.geometry.attributes.position;
      for(let j=0;j<=10;j++){const v=point(j/10);p.setXYZ(j,v.x,v.y,v.z);}p.needsUpdate=true;s.line.geometry.computeBoundingSphere();
      for(let j=0;j<18;j++){
        const u=(j+1)/19,v=point(u);v.x+=(j%2?1:-1)*.025;
        dummy.position.copy(v);dummy.quaternion.copy(camera.quaternion);dummy.rotateZ((j%2?1:-1)*.95-.6*w*u);
        dummy.scale.set(.10,.10,1);dummy.updateMatrix();s.foliage.setMatrixAt(j,dummy.matrix);
      }s.foliage.instanceMatrix.needsUpdate=true;
    }
    for(const g of this.grasses){
      const w=moving?motion.response(q,g.x,g.z,.05):0,p=g.mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const x=g.rest[i*3],y=g.rest[i*3+1],z=g.rest[i*3+2],bend=y*y*2.5;
        p.setXYZ(i,x+(w+.07*Math.sin(q*4+g.phase))*bend,y,z+.045*w*bend);}
      p.needsUpdate=true;
    }
    for(const leaf of this.looseLeaves){
      const age=q-leaf.birth;leaf.mesh.visible=moving&&age>=0;
      if(!leaf.mesh.visible)continue;
      const dx=motion.distance(q)-motion.distance(leaf.birth),dy=.17*Math.sin(age*2.2+leaf.phase)-age*.075;
      leaf.mesh.position.set(leaf.x+dx*1.8,Math.max(.035,leaf.y+dy),leaf.z+.16*Math.sin(age*1.6+leaf.phase));
      leaf.mesh.rotation.set(age*2.3+leaf.phase,age*2.0,age*3.1+leaf.phase);
    }
    for(const bird of this.birds){
      const b=motion.bird(bird.cue,bird.index,q);bird.mesh.visible=moving&&b.visible;
      bird.mesh.scale.x=b.direction;
      bird.mesh.position.set(b.x,b.y,b.z);bird.mesh.quaternion.copy(camera.quaternion);bird.mesh.rotateZ(b.direction*.08*Math.sin(q*1.8+bird.index));
      bird.mesh.material.map=this.birdMaps[Math.round((b.wing+1)*4)];
    }
    return {wind,windWorld:{x:wind,z:.12*wind},birds:this.birds.filter(b=>b.mesh.visible).length,
      leaves:this.looseLeaves.filter(l=>l.mesh.visible).length,travel:motion.distance(q)};
  }
}
