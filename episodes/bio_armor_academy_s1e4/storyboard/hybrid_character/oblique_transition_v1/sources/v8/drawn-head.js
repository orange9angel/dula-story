import * as THREE from 'three';
import {paintDrawnFace} from './drawn-face.js';
import {drawEarMap} from './drawn-ear.js';
import {applyObliqueFaceSupport} from './oblique-face-support.js';

// Shape-preserving Hermite interpolation in actual height coordinates. A small
// lip or nose-root bend must not overshoot into a pointed ridge between rows.
function contourDepth(points,y){
  if(y<=points[0][0])return points[0][1];
  if(y>=points.at(-1)[0])return points.at(-1)[1];
  const slopes=points.slice(1).map((p,i)=>(p[1]-points[i][1])/(p[0]-points[i][0]));
  const tangent=i=>{
    if(i===0)return slopes[0];if(i===points.length-1)return slopes.at(-1);
    const a=slopes[i-1],b=slopes[i];
    if(a*b<=0)return 0;
    const h0=points[i][0]-points[i-1][0],h1=points[i+1][0]-points[i][0];
    return 3*(h0+h1)/((2*h1+h0)/a+(h1+2*h0)/b);
  };
  const i=points.findIndex(p=>p[0]>y)-1,h=points[i+1][0]-points[i][0],t=(y-points[i][0])/h;
  return (2*t**3-3*t*t+1)*points[i][1]+(t**3-2*t*t+t)*h*tangent(i)+(-2*t**3+3*t*t)*points[i+1][1]+(t**3-t*t)*h*tangent(i+1);
}

/** Authored curved head and live drawing, mounted in the imported actor's metre
 * frame. The face follows the head bone; eyes are clipped, never billboards.
 * profiles: [y, halfWidth, frontZ, backZ], in ascending height order. */
export function createDrawnHead(actor,config){
  const {profiles,centerX=0,centerY,range=.17,eyes,brows,mouth,skin='#efcbae',ink='#383237',iris='#956534'}=config;
  const root=new THREE.Group();root.name='drawn-head';actor.mesh.add(root);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=config.textureSize??1024;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const underCanvas=config.obliqueFaceSupport?.eyeClip?document.createElement('canvas'):null;
  if(underCanvas)underCanvas.width=underCanvas.height=canvas.width;
  const underTexture=underCanvas?new THREE.CanvasTexture(underCanvas):null;
  if(underTexture){underTexture.colorSpace=THREE.SRGBColorSpace;underTexture.anisotropy=8;}
  const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  const buildGeometry=config=>{
  const pos=[],uv=[],indices=[],N=96,steps=config.profileContour?18:6,R=(profiles.length-1)*steps;
  // Separate the two UV charts. No triangle crosses from the drawn face to
  // the constant-colour rear chart, which would smear eyes over the temples.
  for(let half=0;half<2;half++)for(let row=0;row<=R;row++){
    const f=row/steps,k=Math.min(profiles.length-2,Math.floor(f)),t=f-k;
    const p=profiles[k].map((v,j)=>{
      if(j===0)return THREE.MathUtils.lerp(v,profiles[k+1][j],t);
      const a=profiles[Math.max(0,k-1)][j],b=v,c=profiles[k+1][j],d=profiles[Math.min(profiles.length-1,k+2)][j];
      return Math.max(j===1?.001:-Infinity,.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t));
    });
    // Complete the skull independently of the painted fringe. The original
    // upper rings tapered into a wedge; eye support then read as a brow lump.
    // Remap only scalp rows, preserving all facial landmarks below startY.
    const skull=config.cranium;
    let skullWeight=0;
    if(skull&&p[0]>skull.startY){
      p[0]=THREE.MathUtils.lerp(skull.startY,skull.topY,(p[0]-skull.startY)/(profiles.at(-1)[0]-skull.startY));
      const latitude=Math.sqrt(Math.max(0,1-((p[0]-skull.centerY)/(skull.topY-skull.centerY))**2));
      skullWeight=THREE.MathUtils.smoothstep(p[0],skull.startY,skull.fullY);
      const middle=(skull.front+skull.back)*.5,depth=(skull.front-skull.back)*.5*latitude;
      p[1]=THREE.MathUtils.lerp(p[1],Math.max(.0001,skull.width*latitude),skullWeight);
      p[2]=THREE.MathUtils.lerp(p[2],middle+depth,skullWeight);
      p[3]=THREE.MathUtils.lerp(p[3],middle-depth,skullWeight);
    }
    const contourFront=config.profileContour?THREE.MathUtils.lerp(contourDepth(config.profileContour,p[0]),p[2],skullWeight):p[2];
    // At the tiny chin/crown end rings, update the whole section before adding
    // local relief so its lateral rim cannot protrude beyond the new profile.
    if(config.profileContour)p[2]=THREE.MathUtils.lerp(p[2],contourFront,1-THREE.MathUtils.smoothstep(p[1],.014,.035));
    if(config.jawContour)p[3]=THREE.MathUtils.lerp(contourDepth(config.jawContour,p[0]),p[3],skullWeight);
    if(skull?.backStartY!=null){
      const latitude=Math.sqrt(Math.max(0,1-((p[0]-skull.centerY)/(skull.topY-skull.centerY))**2));
      const back=(skull.front+skull.back)*.5-(skull.front-skull.back)*.5*latitude;
      p[3]=THREE.MathUtils.lerp(p[3],back,THREE.MathUtils.smoothstep(p[0],skull.backStartY,skull.backFullY));
    }
    if(skull?.widthStartY!=null){
      const latitude=Math.sqrt(Math.max(0,1-((p[0]-skull.centerY)/(skull.topY-skull.centerY))**2));
      p[1]=THREE.MathUtils.lerp(p[1],Math.max(.0001,skull.width*latitude),THREE.MathUtils.smoothstep(p[0],skull.widthStartY,skull.widthFullY));
    }
    for(let col=0;col<=N;col++){
      const a=-Math.PI/2+half*Math.PI+col/N*Math.PI,c=Math.cos(a),x=p[1]*Math.sin(a);
      // Keep the central forehead full but round its temples into the scalp;
      // the flatter cheek section must not protrude through the hair cap.
      const frontPower=THREE.MathUtils.lerp(THREE.MathUtils.lerp(config.faceRoundness??.68,skull?.templePower??1.18,THREE.MathUtils.smoothstep(p[0],skull?.templeStartY??eyes[0][1]+.025,skull?.templeFullY??eyes[0][1]+.065)),1,skullWeight);
      let z=(p[2]+p[3])/2+(p[2]-p[3])/2*(c>0?Math.pow(c,frontPower):c);
      if(c>0){
        // Contour relief belongs to the median nose/lip/chin region; extending
        // its height across the entire ring creates a broad muzzle in 3/4.
        z+=(contourFront-p[2])*Math.exp(-((x/(config.contourWidth??.026))**2))*c;
        const dy=p[0]-config.noseY;
        // A longer bridge and a shorter underside give the profile a nose tip;
        // a symmetric tiny bump disappears into the cheek when turning.
        z+=(config.noseDepth??.006)*Math.exp(-((x/.012)**2+(dy/(dy>0?.022:.008))**2));
        z+=.001*Math.exp(-((x/.022)**2+((p[0]-mouth[1])/.004)**2));
        if(config.eyeSurface){
          const e=config.eyeSurface,ex=Math.abs(eyes[0][0]-centerX),dx=Math.abs(x)-ex,dy=p[0]-eyes[0][1];
          const weight=1-THREE.MathUtils.smoothstep((dx/e.width)**2+(dy/e.height)**2,.55,1.55);
          if(weight>0){
            // A flatter iris-bearing surface narrows the iris in profile while
            // the surrounding lid keeps the broader cheek curvature.
            const ec=Math.sqrt(Math.max(0,1-(ex/p[1])**2));
            const ez=(p[2]+p[3])/2+(p[2]-p[3])/2*Math.pow(ec,frontPower)+(contourFront-p[2])*Math.exp(-((ex/(config.contourWidth??.026))**2))*ec;
            z=THREE.MathUtils.lerp(z,ez-e.recess-e.slope*dx,weight);
          }
        }
      }
      pos.push(centerX+x,p[0],z);
      // Broaden lower-cheek geometry and its paint together, keeping eye spacing.
      const cheekScale=1+(config.cheekFullness??0)*Math.exp(-(((p[0]-(mouth[1]-.014))/.033)**2));
      uv.push(half===0?.5+x/(range*2*cheekScale):.015,half===0?.5+(p[0]-centerY)/(range*2):.985);
      if(row<R&&col<N){const i=half*(R+1)*(N+1)+row*(N+1)+col;indices.push(i,i+1,i+N+1,i+1,i+N+2,i+N+1);}
    }
  }
  return {pos,uv,indices};
  };
  const {pos,uv,indices}=buildGeometry(config);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  if(config.profileReference){
    const target=buildGeometry({...config,...config.profileReference}).pos;
    g.setAttribute('profileReferenceDelta',new THREE.Float32BufferAttribute(target.map((v,i)=>v-pos[i]),3));
  }
  const head=new THREE.Mesh(g,material);root.add(head);head.castShadow=true;
  const outlineMaterial=new THREE.MeshBasicMaterial({color:config.contour??'#765147',side:THREE.BackSide,toneMapped:false});
  outlineMaterial.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normal*.00045;');};
  const outline=new THREE.Mesh(g,outlineMaterial);root.add(outline);
  for(const mesh of root.children)applyObliqueFaceSupport(mesh,config.obliqueFaceSupport,mesh===head?underTexture:null);
  if(config.jawDefinition)for(const jawMaterial of [material,outlineMaterial]){
    // A surface-bound lower-face edge: chin to the attached ear root. It is
    // occluded by real hair/ears, and follows the same view sculpt as the face.
    const jaw=config.jawDefinition,previous=jawMaterial.onBeforeCompile,key=jawMaterial.customProgramCacheKey();
    jawMaterial.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      shader.uniforms.jawInk={value:new THREE.Color(jaw.ink)};
      shader.uniforms.jawShade={value:new THREE.Color(jaw.shadow)};
      const varying='varying vec3 vJawPosition; varying float vJawChinZ,vJawPower,vJawRootY;\n';
      shader.vertexShader=varying+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
        vec3 jawView=normalize(vec3(modelViewMatrix[0][2],modelViewMatrix[1][2],modelViewMatrix[2][2]));
        // The oblique mandibular edge is longer and less hooked than the
        // profile chin underside. Keep front/profile anchors unchanged.
        float jawAngle=abs(atan(jawView.x,jawView.z));
        float jawOblique=smoothstep(.436332,.959931,jawAngle)*(1.0-smoothstep(1.221730,1.570796,jawAngle));
        vJawPower=mix(${jaw.power.toFixed(6)},${(jaw.obliquePower??jaw.power).toFixed(6)},jawOblique);
        vJawRootY=mix(${jaw.rootY.toFixed(6)},${(jaw.obliqueRootY??jaw.rootY).toFixed(6)},jawOblique);
        vJawChinZ=mix(${config.profileContour[0][1].toFixed(6)},${(config.profileReference?.profileContour[0][1]??config.profileContour[0][1]).toFixed(6)},smoothstep(${((config.obliqueFaceSupport?.profileStart??65)*Math.PI/180).toFixed(6)},1.570796,abs(atan(jawView.x,jawView.z))));
        float jawT=clamp((vJawChinZ-transformed.z)/(vJawChinZ-${jaw.rootZ.toFixed(6)}),0.0,1.0);
        float jawY=mix(${profiles[0][0].toFixed(6)},vJawRootY,pow(jawT,vJawPower));
        // Fold the underside up into the mandibular plane. A line on the old
        // bulb alone leaves a second, lower jaw silhouette behind it.
        // The jaw does not cut a horizontal shelf across the occiput. Keep
        // posterior skull rings intact; blend the mandibular lift at the ear.
        float jawAnterior=max(smoothstep(-.030,.012,transformed.z),smoothstep(.025,.055,abs(transformed.x)));
        if(transformed.y<jawY)transformed.y=mix(transformed.y,jawY+(transformed.y-jawY)*.12,jawAnterior);
        float jawRear=(1.0-smoothstep(.004,.025,transformed.z))*(1.0-smoothstep(1.440,1.465,transformed.y));
        transformed.x=${centerX.toFixed(6)}+(transformed.x-${centerX.toFixed(6)})*(1.0-.075*jawRear);
        vJawPosition=transformed;
        #include <project_vertex>`);
      shader.fragmentShader=varying+'uniform vec3 jawInk,jawShade;\n'+shader.fragmentShader;
      if(jawMaterial===material)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float jawT=clamp((vJawChinZ-vJawPosition.z)/(vJawChinZ-${jaw.rootZ.toFixed(6)}),0.0,1.0);
        float jawY=mix(${profiles[0][0].toFixed(6)},vJawRootY,pow(jawT,vJawPower));
        float jawDistance=vJawPosition.y-jawY;
        float jawEnd=smoothstep(${(jaw.rootZ-.008).toFixed(6)},${(jaw.rootZ+.007).toFixed(6)},vJawPosition.z);
        float jawSide=smoothstep(0.008,0.035,abs(vJawPosition.x-${centerX.toFixed(6)}));
        float jawShadow=(1.0-smoothstep(-.001,.001,jawDistance))*jawEnd*jawSide;
        diffuseColor.rgb=mix(diffuseColor.rgb,jawShade,jawShadow*.72);
        // The silhouette supplies the free chin edge. Continue it only across
        // the attached neck/ear region, never draw a second full chin contour.
        float rootLine=(1.0-smoothstep(.0002,.00065,abs(jawDistance)))*jawEnd*jawSide*smoothstep(.55,.72,jawT);
        diffuseColor.rgb=mix(diffuseColor.rgb,jawInk,rootLine*.55);
      `);
    };
    jawMaterial.customProgramCacheKey=()=>key+'|jaw-definition-v7|'+JSON.stringify(jaw);
  }
  let interiorOutline=null;
  if(config.externalContour){
    // The inverse hull also exposes an internal nose/cheek crease. Separate
    // external pixels from pixels already covered by this face. Retain the
    // established shallow-view ink, easing only the deep-view interior stroke.
    material.stencilWrite=true;material.stencilRef=1;
    material.stencilFunc=THREE.AlwaysStencilFunc;material.stencilZPass=THREE.ReplaceStencilOp;
    head.renderOrder=-2;outline.renderOrder=-1;
    outlineMaterial.stencilWrite=true;outlineMaterial.stencilRef=1;
    outlineMaterial.stencilFunc=THREE.NotEqualStencilFunc;outlineMaterial.stencilWriteMask=0;
    const inner=outlineMaterial.clone();inner.stencilFunc=THREE.EqualStencilFunc;
    inner.transparent=true;inner.depthWrite=false;
    inner.onBeforeCompile=outlineMaterial.onBeforeCompile;
    inner.customProgramCacheKey=outlineMaterial.customProgramCacheKey;
    interiorOutline=new THREE.Mesh(g,inner);interiorOutline.renderOrder=-1;
    interiorOutline.name='drawn-head-interior-outline';
    const view=new THREE.Matrix4();
    head.onBeforeRender=(renderer,scene,camera)=>{
      const stencil=!!renderer.getContext().getContextAttributes().stencil;
      material.stencilWrite=stencil;outlineMaterial.stencilWrite=stencil;inner.stencilWrite=stencil;
      view.multiplyMatrices(camera.matrixWorldInverse,root.matrixWorld);
      const angle=Math.abs(Math.atan2(view.elements[2],view.elements[10]))*180/Math.PI;
      // Keep it in the render list; changing visible here is one frame late
      // on reverse seeks because list construction precedes onBeforeRender.
      inner.opacity=stencil?1-THREE.MathUtils.smoothstep(angle,config.externalContour[0],config.externalContour[1]):0;
    };
  }
  // Ears are behind the face and have a restrained drawn inner shape.
  const ears=[];
  for(const side of [-1,1]){
    const ear=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:skin,toneMapped:false}));
    ear.position.set(centerX+side*config.earX,config.earY,config.earZ??.006);ear.scale.set(.015,.026,.014);root.add(ear);
    if(config.drawnEar){
      ear.scale.set(...(config.earScale??[.011,.025,.019]));
      const p=ear.geometry.attributes.position;
      if(config.earShape==='attached')ear.geometry.setAttribute('earChartPosition',p.clone());
      for(let i=0;i<p.count;i++){
        const y=p.getY(i),z=p.getZ(i);
        // Broad upper helix, a slimmer attached lobe, and an inset anterior
        // edge beside the tragus. The outline is not a concentric oval.
        const lower=1-THREE.MathUtils.smoothstep(y,-.85,-.10);
        const attached=config.earShape==='attached';
        p.setZ(i,z*(.84+.17*y)*(attached?1-.16*lower:1)-.20*y-.14*Math.max(0,z)*Math.exp(-((y/.40)**2))+(config.earRootDefinition ? (attached?.055:.20) : 0)*Math.exp(-(((y+.55)/.36)**2)));
        if(attached)p.setY(i,y+.20*lower);
      }p.needsUpdate=true;ear.geometry.computeVertexNormals();
    }
    const inner=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshBasicMaterial({color:'#d9a38e',toneMapped:false}));
    inner.position.copy(ear.position).add(new THREE.Vector3(side*.003,0,.011));inner.scale.set(.007,.016,.003);root.add(inner);
    ears.push({ear,inner,side});
  }
  root.updateMatrixWorld(true);actor.bones.head.attach(root);
  // Continuous neck: bottom follows the original neck base, top follows head.
  // Baking a rigid neck into the new head exposes a seam on relative head turns.
  const neckBone=actor.bones.neck,headInverse=actor.bones.head.matrixWorld.clone().invert(),neckInverse=neckBone.matrixWorld.clone().invert();
  const neckPos=new Float32Array(17*49*3),neckIndex=[];
  for(let row=0;row<16;row++)for(let col=0;col<48;col++){const i=row*49+col;neckIndex.push(i,i+1,i+49,i+1,i+50,i+49);}
  const neckGeo=new THREE.BufferGeometry();neckGeo.setAttribute('position',new THREE.BufferAttribute(neckPos,3));neckGeo.setIndex(neckIndex);
  const neckRest=new Float32Array(neckPos.length);
  if(config.neckInk)neckGeo.setAttribute('neckRest',new THREE.BufferAttribute(neckRest,3));
  const neck=new THREE.Mesh(neckGeo,new THREE.MeshBasicMaterial({color:skin,toneMapped:false}));neck.name='drawn-continuous-neck';neck.frustumCulled=false;actor.mesh.add(neck);
  if(config.neckInk){
    const ink=new THREE.MeshBasicMaterial({color:config.contour??'#765147',side:THREE.BackSide,toneMapped:false});
    ink.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normal*.00045;');};
    const outline=new THREE.Mesh(neckGeo,ink);outline.name='drawn-neck-outline';outline.frustumCulled=false;actor.mesh.add(outline);
  }
  if(config.neckInk){
    const turnUniform={value:0},view=new THREE.Matrix4();
    neck.onBeforeRender=(renderer,scene,camera)=>{
      view.multiplyMatrices(camera.matrixWorldInverse,root.matrixWorld);
      turnUniform.value=Math.abs(Math.atan2(view.elements[2],view.elements[10]));
    };
    neck.material.onBeforeCompile=s=>{
      s.uniforms.neckShade={value:new THREE.Color('#e8b08f')};
      s.uniforms.neckTurn=turnUniform;
      s.vertexShader='attribute vec3 neckRest; varying vec3 vNeckRest;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNeckRest=neckRest;');
      s.fragmentShader='varying vec3 vNeckRest; uniform vec3 neckShade; uniform float neckTurn;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float side=smoothstep(.30,1.20,neckTurn)*(1.0-smoothstep(1.70,2.50,neckTurn));
        float frontShade=smoothstep(1.367+.12*abs(vNeckRest.x),1.369+.12*abs(vNeckRest.x),vNeckRest.y);
        float edge=1.350+.40*(.025-vNeckRest.z);
        float sideShade=smoothstep(edge-.0007,edge+.0007,vNeckRest.y)*smoothstep(.002,.004,vNeckRest.z+(vNeckRest.y-1.39)*.45);
        float shade=mix(frontShade,sideShade,side);
        diffuseColor.rgb=mix(diffuseColor.rgb,neckShade,shade);
      `);
    };neck.material.customProgramCacheKey=()=> 'drawn-neck-graphic-shadow-v3';
  }
  if(config.neckProfile&&!config.neckInk){
    const colors=new Float32Array(neckPos.length),base=new THREE.Color(skin),shade=new THREE.Color('#f2bf9e');
    const rings=config.neckProfile;
    for(let row=0;row<=16;row++)for(let col=0;col<=48;col++){
      const y=THREE.MathUtils.lerp(rings[0][0],rings.at(-1)[0],row/16),a=col/48*Math.PI*2;
      const x=contourDepth(rings.map(r=>[r[0],r[1]]),y)*Math.sin(a);
      const shadow=THREE.MathUtils.smoothstep(y,1.360+x*.30,1.369+x*.30);
      base.clone().lerp(shade,shadow).toArray(colors,(row*49+col)*3);
    }
    neckGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));neck.material.color.set('#ffffff');neck.material.vertexColors=true;
  }
  function updateGeometry(){
    actor.mesh.updateMatrixWorld(true);
    const topMatrix=actor.bones.head.matrixWorld.clone().multiply(headInverse),bottomMatrix=neckBone.matrixWorld.clone().multiply(neckInverse),toLocal=actor.mesh.matrixWorld.clone().invert();
    const bottomQ=new THREE.Quaternion(),topQ=new THREE.Quaternion(),unused=new THREE.Vector3(),scale=new THREE.Vector3();
    bottomMatrix.decompose(unused,bottomQ,scale);topMatrix.decompose(unused,topQ,scale);
    for(let row=0;row<=16;row++)for(let col=0;col<=48;col++){
      const t=row/16,a=col/48*Math.PI*2,radius=THREE.MathUtils.lerp(config.neckRadius??.041,(config.neckRadius??.041)*.88,t);
      const neckZ=THREE.MathUtils.lerp(config.neckZ??-.012,config.neckTopZ??config.neckZ??-.012,t);
      const p=new THREE.Vector3(centerX+radius*Math.sin(a),THREE.MathUtils.lerp(config.headCut-.09,config.headCut+.035,t),neckZ+radius*.81*Math.cos(a));
      if(config.neckProfile){
        const rings=config.neckProfile,y=THREE.MathUtils.lerp(rings[0][0],rings.at(-1)[0],t);
        const values=[1,2,3].map(k=>contourDepth(rings.map(r=>[r[0],r[k]]),y));
        p.set(centerX+values[0]*Math.sin(a),y,(values[1]+values[2])*.5+(values[1]-values[2])*.5*Math.cos(a));
      }
      if(config.neckInk)p.toArray(neckRest,(row*49+col)*3);
      const bottom=p.clone().applyMatrix4(bottomMatrix),top=p.clone().applyMatrix4(topMatrix);
      if(config.neckProfile){
        const z=(contourDepth(config.neckProfile.map(r=>[r[0],r[2]]),p.y)+contourDepth(config.neckProfile.map(r=>[r[0],r[3]]),p.y))*.5;
        const centre=new THREE.Vector3(centerX,p.y,z),blend=t*t*(3-2*t),offset=p.clone().sub(centre);
        offset.applyQuaternion(bottomQ.clone().slerp(topQ,blend));
        centre.applyMatrix4(bottomMatrix).lerp(new THREE.Vector3(centerX,p.y,z).applyMatrix4(topMatrix),blend).add(offset).applyMatrix4(toLocal).toArray(neckPos,(row*49+col)*3);
        continue;
      }
      bottom.lerp(top,t*t*(3-2*t)).applyMatrix4(toLocal).toArray(neckPos,(row*49+col)*3);
    }neckGeo.attributes.position.needsUpdate=true;if(config.neckInk)neckGeo.attributes.neckRest.needsUpdate=true;neckGeo.computeVertexNormals();
  }
  const state={blink:0,jaw:0,width:1,smile:0,fear:0,focus:0,gaze:[0,0]};let last='';
  // Append after ears: diagnostic consumers retain the established ear slots.
  if(interiorOutline)root.add(interiorOutline);
  let irisArt=null;
  const ready=config.irisArt?new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{
      irisArt=image;
      if(config.drawnEar)for(const {ear,inner,side} of ears){
        const map=drawEarMap(skin,{rootDefinition:!!config.earRootDefinition,attachedLobe:config.earShape==='attached'});ear.material.color.set('#ffffff');ear.material.map=map;ear.material.needsUpdate=true;
        const p=ear.geometry.attributes.earChartPosition??ear.geometry.attributes.position,u=ear.geometry.attributes.uv;
        for(let i=0;i<p.count;i++)u.setXY(i,(1+p.getZ(i))*.5,(1+p.getY(i))*.5);
        u.needsUpdate=true;inner.visible=false;
      }
      else if(config.earPaint)for(const [i,{ear,inner,side}] of ears.entries()){
        // An ear has its own chart. Projecting its source art through the whole
        // frontal face stretches the helix over the cheek on a profile turn.
        const c=document.createElement('canvas');c.width=128;c.height=192;
        const ec=c.getContext('2d');ec.fillStyle=skin;ec.fillRect(0,0,c.width,c.height);
        // A skin-coloured margin keeps the texture's cut edge from becoming a
        // straight dark bar on the front-facing rim of the ear.
        ec.drawImage(image,...config.earPaint[i],10,8,c.width-20,c.height-16);
        const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
        const pos=ear.geometry.attributes.position,uv=ear.geometry.attributes.uv;
        for(let j=0;j<pos.count;j++)uv.setXY(j,(1-side*pos.getZ(j))*.5,(1+pos.getY(j))*.5);
        uv.needsUpdate=true;ear.material.color.set('#ffffff');ear.material.map=map;ear.material.needsUpdate=true;inner.visible=false;
      }
      if(underCanvas){paintInto(underCanvas.getContext('2d'),{...state,noEyes:true});underTexture.needsUpdate=true;}
      last='';paint();resolve();
    };
    image.onerror=()=>reject(new Error('Unable to load painted iris: '+config.irisArt));image.src=config.irisArt;
  }):Promise.resolve();
  function paintInto(ctx,drawState){
    const size=canvas.width;
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=skin;ctx.fillRect(0,0,size,size);
    ctx.translate(size/2,size/2);ctx.scale(size/(2*range),-size/(2*range));ctx.translate(-centerX,-centerY);ctx.lineCap='round';ctx.lineJoin='round';
    (config.paintFace??paintDrawnFace)(ctx,config,drawState,irisArt);
  }
  function paint(){
    paintInto(ctx,state);
    texture.needsUpdate=true;
  }
  return {head:actor.bones.head,root,state,texture,ready,updateGeometry,apply(next={}){
    const defaults={blink:0,jaw:0,width:1,smile:0,fear:0,focus:0,gaze:[0,0]};
    for(const k of Object.keys(defaults))state[k]=next[k]??defaults[k];
    for(const k of ['blink','jaw','smile','fear','focus'])state[k]=THREE.MathUtils.clamp(state[k],0,1);
    state.gaze=state.gaze.map(v=>THREE.MathUtils.clamp(v,-1,1));
    if(material.userData.obliqueEyeGaze)material.userData.obliqueEyeGaze.value=state.gaze;
    const key=JSON.stringify(state);if(key!==last){paint();last=key;}
  },dispose(){texture.dispose();underTexture?.dispose();g.dispose();material.dispose();outlineMaterial.dispose();interiorOutline?.material.dispose();}};
}
