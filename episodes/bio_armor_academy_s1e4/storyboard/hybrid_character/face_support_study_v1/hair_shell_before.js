import * as THREE from 'three';
import {addGraphicHair} from './graphic-hair.js';
import {paintHairVolume,fadeTailPainting} from './profile-hair-paint.js';

/** Map the production hair painting to a curved, closed shell. Its alpha mask
 * provides the silhouette; front/back surfaces and boundary walls have depth.
 * Source pixels are retained as colour, never redrawn as procedural strands. */
export async function addPaintedHairShell(actor,config){
  const load=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Hair paint failed: '+url));i.src=url;});
  const [source,rear,sideSource]=await Promise.all([load(config.url),config.backUrl?load(config.backUrl):Promise.resolve(null),config.sidePaint?load(config.sidePaint.url):Promise.resolve(null)]);
  const sideTexture=sideSource?new THREE.Texture(sideSource):null;
  if(sideTexture){sideTexture.colorSpace=THREE.SRGBColorSpace;sideTexture.anisotropy=8;sideTexture.needsUpdate=true;}
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const sample=(x,y)=>{const k=(Math.min(canvas.height-1,Math.max(0,Math.round(y)))*canvas.width+Math.min(canvas.width-1,Math.max(0,Math.round(x))))*4;return [pixels[k],pixels[k+1],pixels[k+2],pixels[k+3]];};
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const root=addGraphicHair(actor,{center:config.cap.center,radii:config.cap.radii,hem:config.cap.hem,locks:[],colors:['#29474d'],flat:true});
  // A generated rear painting supplies posterior detail. The fallback crop is
  // provisional and cannot reconstruct an unseen hairstyle.
  const capCanvas=document.createElement('canvas');capCanvas.width=capCanvas.height=512;
  capCanvas.getContext('2d').drawImage(source,...config.capCrop,0,0,512,512);
  const capTexture=new THREE.CanvasTexture(capCanvas);capTexture.colorSpace=THREE.SRGBColorSpace;
  let rearTexture=null,alphaTexture=null;
  if(rear){
    const painted=document.createElement('canvas');painted.width=rear.width;painted.height=rear.height;
    const p=painted.getContext('2d');p.fillStyle='#29474d';p.fillRect(0,0,painted.width,painted.height);p.drawImage(rear,0,0);
    rearTexture=new THREE.CanvasTexture(painted);rearTexture.colorSpace=THREE.SRGBColorSpace;rearTexture.anisotropy=8;
    const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;
    const m=mask.getContext('2d'),data=m.createImageData(mask.width,mask.height);
    for(let k=0;k<pixels.length;k+=4){data.data[k]=data.data[k+1]=data.data[k+2]=pixels[k+3];data.data[k+3]=255;}
    m.putImageData(data,0,0);alphaTexture=new THREE.CanvasTexture(mask);alphaTexture.channel=1;
  }
  for(const m of root.children.filter(o=>o.isMesh)){
    if(config.profileFit){
      const p=m.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const w=(1-THREE.MathUtils.smoothstep(p.getY(i),1.41,1.47))*(1-THREE.MathUtils.smoothstep(p.getZ(i),-.045,-.015));
        p.setZ(i,THREE.MathUtils.lerp(p.getZ(i),Math.min(p.getZ(i),-.065),w));
      }p.needsUpdate=true;m.geometry.computeVertexNormals();
    }
    if(rear){
      const pos=m.geometry.attributes.position,uv=m.geometry.attributes.uv;
      for(let i=0;i<pos.count;i++){
        // Use azimuth across the sides: a frontal x projection has zero UV
        // slope at the ear and turns painted strands into horizontal streaks.
        const a=Math.atan2(pos.getX(i)-config.cap.center[0],-(pos.getZ(i)-config.cap.center[2]));
        const latitude=Math.sqrt(Math.max(0,1-((pos.getY(i)-config.cap.center[1])/config.cap.radii[1])**2));
        uv.setXY(i,(792-Math.sin(a*.5)*270*latitude)/rear.width,1-(130+(config.cap.center[1]+config.cap.radii[1]-pos.getY(i))*2750)/rear.height);
      }
      uv.needsUpdate=true;
    }
    m.material=new THREE.MeshBasicMaterial({map:rearTexture??capTexture,side:THREE.DoubleSide,toneMapped:false});
    if(sideTexture)paintHairVolume(m,sideTexture,config.sidePaint,{cap:true,frontTexture:texture,frontConfig:config});
    // A back-face ink hull becomes a broad black plate inside an open cap.
    // The painting already supplies linework; keep the interior hair coloured.
    for(const child of m.children)child.visible=false;
  }
  const {originX,originY,anchorY,pixelsPerMetre:ppm}=config;
  let headSurface=null;
  if(config.profileFit)actor.mesh.traverse(o=>{if(o.name==='drawn-head')headSurface=o.children[0]?.geometry?.attributes.position;});
  const headRows=[];
  if(headSurface){
    const rows=new Set(Array.from({length:headSurface.count/2},(_,i)=>headSurface.getY(i))).size;
    const columns=headSurface.count/2/rows;
    for(let i=0;i<headSurface.count/2;i+=columns){
      headRows.push({y:headSurface.getY(i),points:Array.from({length:columns},(_,j)=>[headSurface.getX(i+j),headSurface.getZ(i+j)])});
    }
  }
  const surfaceZ=(x,y)=>{
    if(!headRows.length||y<headRows[0].y||y>headRows.at(-1).y)return -Infinity;
    const k=Math.max(0,headRows.findIndex(r=>r.y>=y)-1),a=headRows[k],b=headRows[Math.min(headRows.length-1,k+1)];
    const zAt=r=>{const p=r.points;if(x<p[0][0]||x>p.at(-1)[0])return -Infinity;const i=Math.max(0,p.findIndex(v=>v[0]>=x)-1),v=p[i],w=p[Math.min(p.length-1,i+1)];return THREE.MathUtils.lerp(v[1],w[1],(x-v[0])/Math.max(1e-8,w[0]-v[0]));};
    const za=zAt(a),zb=zAt(b);return Number.isFinite(za)&&Number.isFinite(zb)?THREE.MathUtils.lerp(za,zb,(y-a.y)/Math.max(1e-8,b.y-a.y)):Math.max(za,zb);
  };
  const nx=Math.ceil(canvas.width/3),ny=Math.ceil(canvas.height/3),dx=canvas.width/nx,dy=canvas.height/ny;
  const front=[],back=[],uv=[],index=[],edgePos=[],edgeColor=[];
  const toWorld=(px,py)=>[(px-originX)/ppm,anchorY+(originY-py)/ppm];
  const depth=(x,y)=>{
    const [cx,cy,cz]=config.cap.center,[rx,ry,rz]=config.projectionRadii??config.cap.radii;
    const q=(x-cx)**2/rx**2+(y-cy)**2/ry**2;
    // Smooth continuation beyond the ellipsoid avoids a constant-depth fin.
    let scalp=cz+rz*(Math.sqrt(Math.max(.002,1-q))-.18*Math.sqrt(Math.max(0,q-1)));
    const fringe=.112-.26*Math.abs(x);
    const fringeWeight=(1-THREE.MathUtils.smoothstep(y,1.495,1.575))*(1-THREE.MathUtils.smoothstep(Math.abs(x),.10,.155));
    // Side locks sit around the temples. Leaving every painted lock forward
    // turns the whole fringe into a curtain over the profile eye.
    const temple=(config.templeWrap??0)*THREE.MathUtils.smoothstep(Math.abs(x),.030,.095)*(1-THREE.MathUtils.smoothstep(y,1.49,1.57))*(1-THREE.MathUtils.smoothstep(x,.10,.13));
    let frontZ=THREE.MathUtils.lerp(scalp,Math.max(scalp,fringe),fringeWeight)+.004-temple;
    if(config.profileFit){
      const w=THREE.MathUtils.smoothstep(Math.abs(x),.040,.075)*(1-THREE.MathUtils.smoothstep(y,1.50,1.59))*(1-THREE.MathUtils.smoothstep(x,.105,.13));
      frontZ=THREE.MathUtils.lerp(frontZ,.035,w);
      const [crx,cry,crz]=config.cap.radii,cq=(x-cx)**2/crx**2+(y-cy)**2/cry**2;
      const crownZ=cz+crz*Math.sqrt(Math.max(.001,1-cq))+.004;
      frontZ=THREE.MathUtils.lerp(frontZ,crownZ,.35*THREE.MathUtils.smoothstep(y,1.57,1.64));
      frontZ=Math.max(frontZ,surfaceZ(x,y)+.005);
    }
    const tailWeight=THREE.MathUtils.smoothstep(x,.105,.175);
    const along=THREE.MathUtils.clamp((1.66-y)/.36,0,1);
    const tailZ=(config.tailDepth??.015)+.008*Math.sin(along*4);
    // Keep the painted detail skin thin. Real closed locks below provide the
    // volume: extruding every alpha hole produced fins even with a smooth mask.
    const z=THREE.MathUtils.lerp(frontZ,tailZ,tailWeight);
    return [z,z-.0007];
  };
  for(let row=0;row<=ny;row++)for(let col=0;col<=nx;col++){
    const px=col*dx,py=row*dy,[x,y]=toWorld(px,py),[z,bz]=depth(x,y);
    front.push(x,y,z);back.push(x,y,bz);uv.push(px/canvas.width,1-py/canvas.height);
  }
  for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
    // Full grid coverage preserves sub-cell wisps; alpha testing trims pixels.
    const k=row*(nx+1)+col;index.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2);
  }
  // March the actual alpha contour instead of extruding square cell edges.
  const boundary=(a,b)=>{
    const [ax,ay]=toWorld(...a),[bx,by]=toWorld(...b),[az,abz]=depth(ax,ay),[bz,bbz]=depth(bx,by);
    const color=new THREE.Color('#233e47');
    for(const p of [[ax,ay,az],[ax,ay,abz],[bx,by,bz],[bx,by,bz],[ax,ay,abz],[bx,by,bbz]]){
      edgePos.push(...p);edgeColor.push(color.r,color.g,color.b);
    }
  };
  for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
    const corners=[[col*dx,row*dy],[(col+1)*dx,row*dy],[(col+1)*dx,(row+1)*dy],[col*dx,(row+1)*dy]];
    const alpha=corners.map(p=>sample(...p)[3]),crossings=[];
    for(let k=0;k<4;k++){
      const j=(k+1)%4;if((alpha[k]>=128)===(alpha[j]>=128))continue;
      const t=(128-alpha[k])/(alpha[j]-alpha[k]);
      crossings.push([THREE.MathUtils.lerp(corners[k][0],corners[j][0],t),THREE.MathUtils.lerp(corners[k][1],corners[j][1],t)]);
    }
    for(let k=1;k<crossings.length;k+=2)boundary(crossings[k-1],crossings[k]);
  }
  const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.35,side:THREE.FrontSide,toneMapped:false});
  for(const [side,points] of [front,back].entries()){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
    let paint=material;
    if(side===1&&rear){
      g.setAttribute('uv1',g.attributes.uv.clone());
      for(let i=0;i<points.length/3;i++)g.attributes.uv.setXY(i,(792-points[i*3]*3186)/rear.width,1-(500+(1.515-points[i*3+1])*3186)/rear.height);
      const reversed=[];for(let i=0;i<index.length;i+=3)reversed.push(index[i],index[i+2],index[i+1]);g.setIndex(reversed);
      paint=new THREE.MeshBasicMaterial({map:rearTexture,alphaMap:alphaTexture,alphaTest:.35,side:THREE.FrontSide,toneMapped:false});
    }
    const mesh=new THREE.Mesh(g,paint.clone());root.add(mesh);
    if(config.profileFit)fadeTailPainting(mesh);
  }
  const edges=new THREE.BufferGeometry();edges.setAttribute('position',new THREE.Float32BufferAttribute(edgePos,3));edges.setAttribute('color',new THREE.Float32BufferAttribute(edgeColor,3));edges.computeVertexNormals();
  const edgeMesh=new THREE.Mesh(edges,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}));root.add(edgeMesh);
  if(config.profileFit)fadeTailPainting(edgeMesh);
  const coreCanvas=document.createElement('canvas');coreCanvas.width=canvas.width;coreCanvas.height=canvas.height;
  const coreContext=coreCanvas.getContext('2d');coreContext.fillStyle='#29474d';coreContext.fillRect(0,0,canvas.width,canvas.height);coreContext.drawImage(rear??source,0,0,canvas.width,canvas.height);
  const coreTexture=new THREE.CanvasTexture(coreCanvas);coreTexture.colorSpace=THREE.SRGBColorSpace;coreTexture.anisotropy=8;
  const cores=config.profileFit?[
    {p:[[.065,1.605,-.067],[.125,1.59,-.092],[.154,1.48,-.112],[.154,1.37,-.095],[.179,1.317,-.045]],w:.021,crop:[315,330,65,650]},
    {p:[[.066,1.606,-.068],[.119,1.54,-.126],[.135,1.44,-.140],[.137,1.35,-.120],[.160,1.325,-.078]],w:.017,crop:[230,360,70,580]},
    {p:[[.068,1.607,-.066],[.152,1.53,-.144],[.166,1.42,-.156],[.166,1.34,-.130],[.185,1.325,-.092]],w:.014,crop:[390,280,65,610]}
  ]:[
    {p:[[.119,1.644,-.026],[.148,1.59,-.035],[.166,1.48,-.038],[.160,1.37,-.033],[.185,1.317,-.019]],w:.024,crop:[315,330,65,650]},
    {p:[[.117,1.620,-.049],[.130,1.54,-.054],[.137,1.44,-.057],[.140,1.35,-.043],[.163,1.325,-.028]],w:.019,crop:[230,360,70,580]},
    {p:[[.150,1.615,-.043],[.173,1.53,-.048],[.185,1.42,-.046],[.184,1.34,-.031],[.204,1.325,-.014]],w:.014,crop:[390,280,65,610]}
  ];
  for(const lock of cores){
    const curve=new THREE.CatmullRomCurve3(lock.p.map(p=>new THREE.Vector3(...p))),pos=[],uvs=[],tris=[],rows=90,sides=40;
    for(let row=0;row<=rows;row++){
      const t=row/rows,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),across=new THREE.Vector3(0,0,1).cross(tangent).normalize(),deep=tangent.clone().cross(across).normalize();
      const radius=lock.w*Math.pow(Math.max(.00001,Math.sin(Math.PI*t)),.65);
      for(let col=0;col<=sides;col++){
        const a=col/sides*Math.PI*2,v=c.clone().addScaledVector(across,Math.cos(a)*radius).addScaledVector(deep,Math.sin(a)*radius*(config.tailRoundness??1.15));
        v.z+=config.profileFit?0:(config.tailOffset??0);
        pos.push(...v.toArray());
        // Circumferential UV keeps the strand painting flowing down the lock
        // when seen from the side, instead of collapsing a frontal projection.
        const [sx,sy,sw,sh]=lock.crop;uvs.push((sx+col/sides*sw)/canvas.width,1-(sy+t*sh)/canvas.height);
        if(row<rows&&col<sides){const k=row*(sides+1)+col;tris.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(tris);g.computeVertexNormals();
    const m=new THREE.MeshBasicMaterial({map:coreTexture,side:THREE.DoubleSide,toneMapped:false}),mesh=new THREE.Mesh(g,m);root.add(mesh);
    if(sideTexture){
      if(config.profileFit)paintHairVolume(mesh,sideTexture,{...config.sidePaint,right:[635,590],left:[215,182],anchorY:1.515},{cutout:true});
      else paintHairVolume(mesh,sideTexture,config.sidePaint);
    }
  }
  root.userData.source=config.url;root.userData.kind='painted curved hair shell with thickness';
  // Mesh vertices are authored in the same neutral metre frame as the cap.
  // addGraphicHair already attached root to the head bone before these children.
  return root;
}
