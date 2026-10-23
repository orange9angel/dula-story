// Episode-local pilot: painted head + native 2D acting curves + view-specific
// silhouette corrections. Source motion, camera, dialogue and contacts remain
// the timing/reference layers. This is not a general arbitrary-angle head rig.
import * as THREE from 'three';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const lerp=THREE.MathUtils.lerp;
const ink='#38262f',skin='#f8d2a7';

function path(g,points,fill,stroke=null,width=2){
 g.beginPath();for(const p of points){if(p[0]==='M')g.moveTo(p[1],p[2]);else if(p[0]==='L')g.lineTo(p[1],p[2]);else if(p[0]==='Q')g.quadraticCurveTo(...p.slice(1));else if(p[0]==='C')g.bezierCurveTo(...p.slice(1));else g.closePath();}
 if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
}

function eye(g,cx,cy,sx,sy,s,far=false){
 g.save();g.translate(cx,cy);g.scale(far?-sx:sx,sy);
 const open=clamp((far?s.open*.95:s.open)*(1-s.blink)),focus=s.focus,asym=(far?1:-1)*s.asym;
 const h=51*open*(1-.17*focus),brow=-(67+16*(1-focus))+asym*7;
 // An angled almond, with the inner corner supported by the brow direction.
 const shape=[['M',-84,4],['L',-61,-h*.68],['Q',-8,-h-6,39,-h*.83],['L',80,-12*open],['Q',56,29*open,5,31*open],['Q',-47,28*open,-84,4],['Z']];
 if(open>.04){
  g.save();path(g,shape,'#fff6df');g.clip();
  g.fillStyle='#c5b5aa';g.fillRect(-100,-60,200,39-h*.32);
  const ix=(far?-1:1)*(9+s.gaze*16),iy=3+s.lookDown*16;
  g.fillStyle='#614035';g.beginPath();g.ellipse(ix,iy,33,46,0,0,Math.PI*2);g.fill();
  g.fillStyle='#ad783d';g.beginPath();g.ellipse(ix,iy+11,26,32,0,0,Math.PI*2);g.fill();
  g.fillStyle='#e0b774';g.beginPath();g.ellipse(ix+4,iy+26,21,12,-.16,0,Math.PI*2);g.fill();
  g.fillStyle='#30252a';g.beginPath();g.ellipse(ix,iy-3,13*(1-.3*s.pain),35,0,0,Math.PI*2);g.fill();
  g.fillStyle='#fff9e9';g.beginPath();g.ellipse(ix-12,iy-20,9,12,-.15,0,Math.PI*2);g.fill();
  g.beginPath();g.arc(ix+14,iy+23,3.5,0,Math.PI*2);g.fill();g.restore();
 }
 g.lineJoin='round';g.lineCap='round';
 if(open>.04){
  path(g,[['M',-84,4],['L',-61,-h*.68],['Q',-8,-h-6,39,-h*.83],['L',80,-12*open]],null,ink,7.5);
  path(g,[['M',-72,15*open],['Q',-23,35*open,8,34*open],['Q',55,33*open,80,-12*open]],null,ink,2.5);
  path(g,[['M',-72,-h-19],['Q',-10,-h-31,50,-h-13]],null,'#ba8668',2.2);
 }else path(g,[['M',-84,2],['Q',-12,26-16*s.pain,80,-5]],null,ink,6);
 path(g,[['M',-91,brow-12],['Q',-15,brow-12-17*focus,79,brow+23*focus],['L',75,brow+34*focus+6],['Q',-10,brow-3-13*focus,-91,brow-8],['Z']],ink);
 if(s.pain>.05){g.globalAlpha=s.pain;path(g,[['M',-52,49],['Q',-8,57,34,48]],null,'#a16f59',2.8);g.globalAlpha=1;}
 g.restore();
}

function face(g,s){
 // Coordinates refer to the reviewed 1254 px generated production base.
 eye(g,575,690,1.0,1.0,s);
 eye(g,874,679,.73,.94,{...s,asym:-s.asym},true);
 g.save();g.translate(739,904+s.pain*5);g.rotate(-.045-.045*s.asym);g.lineCap='round';g.lineJoin='round';
 const j=clamp(s.jaw),w=45+18*j-8*s.pain,h=3+48*j;
 if(j>.045){
  path(g,[['M',-w,4],['Q',0,-10,w,4],['Q',w-8,h,2,h+5],['Q',-w+6,h-1,-w,4],['Z']],'#5e3031',ink,2.4);
  path(g,[['M',-w+4,3],['Q',0,-7,w-5,3],['L',w-10,11],['Q',0,6,-w+9,11],['Z']],'#fff0d9');
  if(j>.3)path(g,[['M',-w*.6,h-4],['Q',0,h-18,w*.57,h-5],['Q',0,h+5,-w*.6,h-4],['Z']],'#bb6c64');
 }else if(s.pain>.45){
  path(g,[['M',-42,0],['Q',-2,-12,43,1],['L',41,12],['Q',0,5,-39,12],['Z']],'#fff0da',ink,2.4);
  path(g,[['M',-36,6],['Q',0,2,36,7]],null,'#a98576',1.2);
 }else path(g,[['M',-45,4],['Q',-8,-5,20,0],['Q',35,1,46,4]],null,ink,3.3);
 path(g,[['M',-18,h+14],['Q',7,h+21,30,h+12]],null,'#bc8b73',2.5);
 g.restore();
 if(s.pain>.08){g.save();g.globalAlpha=s.pain*.7;
  path(g,[['M',477,808],['L',485,827]],null,'#bd8a70',2.4);
  path(g,[['M',487,805],['L',496,819]],null,'#bd8a70',2.1);
  path(g,[['M',936,787],['Q',930,800,929,809]],null,'#bd8a70',2.2);g.restore();}
}

function acting(t,jaw){
 if(t>=132&&t<137){const dt=t-132,decision=ease((dt-.13)/.62),b=pulse(dt,2.42,2.49,2.54,2.65);
  return {open:lerp(.66,.96,decision),blink:b,focus:lerp(.20,.91,decision),asym:.19+.19*pulse(dt,1.8,2.1,2.4,2.8),gaze:lerp(-.6,.45,decision),lookDown:lerp(.65,-.05,ease((dt-.26)/.55)),pain:.12*(1-decision),jaw,
   roll:lerp(-.040,.014,ease((dt-.28)/.7))-.012*pulse(dt,3.3,3.6,3.8,4.2),nod:.018*(1-ease((dt-.25)/.7))+.009*pulse(dt,3.25,3.55,3.72,4.1)};
 }
 const dt=t-58.18,recover=ease((dt-.13)/.56);
 return{open:lerp(.28,.9,recover),blink:0,focus:lerp(.55,.96,recover),asym:lerp(.55,.20,recover),gaze:lerp(-.2,.45,recover),lookDown:.25*(1-recover),pain:lerp(.92,.16,recover),jaw,
  roll:lerp(-.105,.012,recover),nod:.018*(1-recover)};
}

function warpUniforms(){return {apWarp:{value:new THREE.Vector4()},apCenter:{value:new THREE.Vector2()},apPin:{value:new THREE.Vector2(-10,-10)},apRoot:{value:0},apActive:{value:0}};}
function patchMaterial(mat,u,cel=false){
 const old=mat.onBeforeCompile?.bind(mat),baseKey=mat.customProgramCacheKey?.();
 mat.onBeforeCompile=(shader,...args)=>{
  old?.(shader,...args);Object.assign(shader.uniforms,u);
  shader.vertexShader='uniform vec4 apWarp;uniform vec2 apCenter;uniform vec2 apPin;uniform float apRoot;uniform float apActive;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec3 apW=(modelMatrix*vec4(transformed,1.)).xyz;
   vec2 apN=gl_Position.xy/gl_Position.w;
   float apH=smoothstep(.38,1.5,apW.y-apRoot);
   float apP=1.-exp(-dot((apN-apPin)*vec2(1.77778,1.),(apN-apPin)*vec2(1.77778,1.))*1100.);
   vec2 apD=vec2(apWarp.x*apH+apWarp.z*(apN.x-apCenter.x)*apH,apWarp.y*apH+apWarp.w*(apN.y-apCenter.y)*apH);
   gl_Position.xy+=apD*apP*apActive*gl_Position.w;`);
  if(cel){
   shader.vertexShader='varying vec3 apNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\napNormal=normalize(mat3(modelMatrix)*normal);');
   shader.fragmentShader='varying vec3 apNormal;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float apL=dot(normalize(apNormal),normalize(vec3(-.3,.65,.7)));
    float apS=apL<-.08?.50:(apL<.32?.76:1.0);
    diffuseColor.rgb*=apS;
    if(apL>.84)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.91,.67),.20);`);
  }
 };
 mat.customProgramCacheKey=()=>`art-pass-r1-${cel}-${baseKey??''}`;mat.needsUpdate=true;
}

export async function createArtPass({actors,scene,camera}){
 const im=new Image();im.src='./assets3d/art_pass_r1/aoao_head_base.png';await im.decode();
 if(im.width!==1254||im.height!==1254)throw Error('Art base dimensions changed; feature coordinates need review');
 const c=document.createElement('canvas');c.width=c.height=1254;const g=c.getContext('2d');
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sm=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.20,side:THREE.DoubleSide,depthWrite:true});
 const geo=new THREE.PlaneGeometry(.445,.445,20,24);
 // A recessed neck strip lets the collar cover the neck while the face remains
 // in front. One constant-depth plane would cut the mouth off at the collar.
 for(let i=0;i<geo.attributes.position.count;i++){
  const v=geo.attributes.uv.getY(i);geo.attributes.position.setZ(i,-.12*(1-THREE.MathUtils.smoothstep(v,.08,.24)));
 }
 const sprite=new THREE.Mesh(geo,sm);sprite.name='aoao-painted-head-r1';sprite.frustumCulled=false;scene.add(sprite);
 const restVertices=geo.attributes.position.array.slice();
 const uniforms={aoao:warpUniforms(),yekari:warpUniforms()},materialCount={aoao:0,yekari:0};
 const original=[];
 for(const [name,a] of Object.entries(actors)){
  const cache=new Map();a.mesh.traverse(m=>{if(!m.isMesh)return;
   const convert=old=>{if(cache.has(old))return cache.get(old);
    let mat=old.clone(),cel=false;
    // Material.clone() does not retain these custom shader hooks.
    mat.onBeforeCompile=old.onBeforeCompile;mat.customProgramCacheKey=old.customProgramCacheKey;
    if(new URLSearchParams(location.search).get('artPaintArmor')==='1'&&(old.isMeshStandardMaterial||old.isMeshPhongMaterial)&&!old.transparent&&old.metalness>.25){
     mat=new THREE.MeshBasicMaterial({color:old.color,map:old.map,side:old.side});cel=true;
    }
    patchMaterial(mat,uniforms[name],cel);cache.set(old,mat);materialCount[name]++;return mat;
   };
   original.push([m,m.material]);m.material=Array.isArray(m.material)?m.material.map(convert):convert(m.material);
  });
 }
 patchMaterial(sm,uniforms.aoao,false);
 const meta={version:1,headMode:'painted-canvas',materialCount,scope:[[132,137],[56.5,59]],last:null};
 function update(t,perf,line,mouthJaw){
  // Screen pins must use this frame's camera inverse, not the last render's.
  camera.updateMatrixWorld(true);
  for(const a of Object.values(actors))a.mesh.updateMatrixWorld(true);
  const portrait=(t>=132&&t<137)||(t>=58.18&&t<59),fight=t>=56.5&&t<59;
  const active=portrait||fight;
  actors.aoao.headGroup.visible=!portrait;sprite.visible=portrait;
  const h=actors.aoao.headGroup.getWorldPosition(new THREE.Vector3());
  for(const [name,u] of Object.entries(uniforms)){
   const a=actors[name],p=a.mesh.getWorldPosition(new THREE.Vector3());u.apRoot.value=p.y;u.apActive.value=active?1:0;
   const center=p.clone().add(new THREE.Vector3(0,1.1,0)).project(camera);u.apCenter.value.set(center.x,center.y);
   u.apWarp.value.set(0,0,0,0);u.apPin.value.set(-10,-10);
  }
  if(fight){
   const wind=pulse(t,56.5,57.1,57.48,57.96),snap=pulse(t,57.48,57.98,58.06,58.6),recoil=pulse(t,57.99,58.13,58.26,58.88);
   uniforms.aoao.apWarp.value.set(-.018*wind-.035*recoil,-.020*recoil,.045*recoil,-.035*recoil);
   uniforms.yekari.apWarp.value.set(-.018*wind-.027*snap,.012*wind-.009*snap,.035*snap,0);
   const pin=actors.aoao.shieldDome.localToWorld(new THREE.Vector3(0,.278,0)).project(camera);
   uniforms.aoao.apPin.value.set(pin.x,pin.y);
  }
  let s=null;
  if(portrait){
   s=acting(t,mouthJaw);g.clearRect(0,0,1254,1254);g.drawImage(im,0,0);face(g,s);tex.needsUpdate=true;
   const elapsed=t>=132?t-132-.3:t-58.02;
   const hairFollow=elapsed>0?.010*Math.exp(-5*elapsed)*Math.sin(13*elapsed):0;
   for(let i=0;i<geo.attributes.position.count;i++){
    const v=geo.attributes.uv.getY(i),x=restVertices[i*3],y=restVertices[i*3+1],z=restVertices[i*3+2];
    const hairWeight=THREE.MathUtils.smoothstep(v,.59,.94),jawWeight=Math.exp(-(((v-.19)/.085)**2));
    geo.attributes.position.setXYZ(i,x+hairFollow*hairWeight,y-.003*s.jaw*jawWeight,z);
   }
   geo.attributes.position.needsUpdate=true;
   sprite.position.copy(h).add(new THREE.Vector3(0,.098-s.nod,0));
   const toward=camera.position.clone().sub(h).normalize();sprite.position.addScaledVector(toward,.13);
   sprite.quaternion.copy(camera.quaternion);sprite.rotateZ(s.roll);
   sprite.scale.set(1,1-.025*s.pain,1);sprite.updateMatrixWorld(true);
  }
  meta.last={t,portrait,face:s,warp:Object.fromEntries(Object.entries(uniforms).map(([n,u])=>[n,u.apWarp.value.toArray()]))};
  return meta.last;
 }
 return{update,meta,sprite,canvas:c,exportCel:()=>c.toDataURL('image/png'),restore(){for(const[m,mat]of original)m.material=mat;actors.aoao.headGroup.visible=true;sprite.visible=false;}};
}
