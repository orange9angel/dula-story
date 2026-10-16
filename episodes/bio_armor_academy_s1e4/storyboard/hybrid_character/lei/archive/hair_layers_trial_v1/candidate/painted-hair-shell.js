import * as THREE from 'three';
import {addGraphicHair} from './graphic-hair.js';
import {paintHairVolume,fadeTailPainting} from './profile-hair-paint.js';
import {applyObliqueFaceSupport} from './oblique-face-support.js';

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
  const baseColor=config.baseColor??'#29474d',boundaryColor=config.edgeColor??'#233e47';
  const root=addGraphicHair(actor,{center:config.cap.center,radii:config.cap.radii,hem:config.cap.hem,locks:[],colors:[baseColor],flat:true});
  // A generated rear painting supplies posterior detail. The fallback crop is
  // provisional and cannot reconstruct an unseen hairstyle.
  const capCanvas=document.createElement('canvas');capCanvas.width=capCanvas.height=512;
  capCanvas.getContext('2d').drawImage(source,...config.capCrop,0,0,512,512);
  const capTexture=new THREE.CanvasTexture(capCanvas);capTexture.colorSpace=THREE.SRGBColorSpace;
  let rearTexture=null,alphaTexture=null;
  if(rear){
    const painted=document.createElement('canvas');painted.width=rear.width;painted.height=rear.height;
    const p=painted.getContext('2d');if(!config.rearCutout){p.fillStyle=baseColor;p.fillRect(0,0,painted.width,painted.height);}p.drawImage(rear,0,0);
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
        const chart=config.rearMap;
        if(chart)uv.setXY(i,(chart.originX-Math.sin(a*.5)*chart.spanX*latitude)/rear.width,1-(chart.originY+(chart.anchorY-pos.getY(i))*chart.pixelsPerMetre)/rear.height);
        else uv.setXY(i,(792-Math.sin(a*.5)*270*latitude)/rear.width,1-(130+(config.cap.center[1]+config.cap.radii[1]-pos.getY(i))*2750)/rear.height);
      }
      uv.needsUpdate=true;
    }
    if(config.napeDrop){
      // Extend the existing back scalp into the nape. Preserve its original
      // chart so the longer surface cannot sample the painted neck or ears.
      const p=m.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const scalpY=p.getY(i);
        const w=(1-THREE.MathUtils.smoothstep(p.getY(i),1.40,1.50))*(1-THREE.MathUtils.smoothstep(p.getZ(i),-.015,.025));
        p.setY(i,p.getY(i)-config.napeDrop*w);
        if(config.napeWrap){
          // Lower hair follows the neck instead of hanging behind it as a fin.
          // Preserve the ear opening; bring only the posterior lower scalp in.
          const a=Math.atan2(p.getX(i)-config.cap.center[0],p.getZ(i)-config.cap.center[2]);
          const wrap=w*config.napeWrap*(1-THREE.MathUtils.smoothstep(scalpY,1.425,1.470));
          p.setX(i,THREE.MathUtils.lerp(p.getX(i),config.cap.center[0]+.050*Math.sin(a),wrap));
          p.setZ(i,THREE.MathUtils.lerp(p.getZ(i),.012+.060*Math.cos(a),wrap));
        }
      }
      p.needsUpdate=true;m.geometry.computeVertexNormals();
    }
    m.material=new THREE.MeshBasicMaterial({map:rearTexture??capTexture,side:THREE.DoubleSide,toneMapped:false,alphaTest:config.rearCutout?.35:0});
    if(sideTexture)paintHairVolume(m,sideTexture,config.sidePaint,{cap:true,frontTexture:texture,frontConfig:config});
    // A back-face ink hull becomes a broad black plate inside an open cap.
    // The painting already supplies linework; keep the interior hair coloured.
    for(const child of m.children)child.visible=false;
  }
  const {originX,originY,anchorY,pixelsPerMetre:ppm}=config;
  let headSurface=null;
  if(config.profileFit||config.surface?.headClearance!=null)actor.mesh.traverse(o=>{if(o.name==='drawn-head')headSurface=o.children[0]?.geometry?.attributes.position;});
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
  const toWorld=(px,py)=>[(config.originWorldX??0)+(px-originX)/ppm,anchorY+(originY-py)/ppm];
  const depth=(x,y)=>{
    // An explicit surface chart lets other head sizes use the painted shell
    // without inheriting the legacy character's heights, tail or temple rig.
    if(config.surface){
      const s=config.surface,[cx,cy,cz]=config.cap.center,[rx,ry,rz]=config.projectionRadii??config.cap.radii,localX=x-cx;
      const q=localX*localX/(rx*rx)+(y-cy)*(y-cy)/(ry*ry);
      const scalp=cz+rz*(Math.sqrt(Math.max(.002,1-q))-.18*Math.sqrt(Math.max(0,q-1)));
      const fringeWeight=(1-THREE.MathUtils.smoothstep(y,...s.fringeY))*(1-THREE.MathUtils.smoothstep(Math.abs(localX),...s.fringeX));
      let z=THREE.MathUtils.lerp(scalp,Math.max(scalp,s.fringeDepth-s.fringeSlope*Math.abs(localX)),fringeWeight)+s.offset;
      if(s.templeX){
        const w=THREE.MathUtils.smoothstep(Math.abs(localX),...s.templeX)*(1-THREE.MathUtils.smoothstep(y,...s.templeY));
        z=THREE.MathUtils.lerp(z,s.templeDepth,w);
      }
      if(s.headClearance!=null)z=Math.max(z,surfaceZ(x,y)+s.headClearance);
      return [z,z-(s.thickness??.0007)];
    }
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
      const templeZ=config.templeCurve?
        .024+.016*Math.exp(-(((y-1.472)/.047)**2))+.016*(1-THREE.MathUtils.smoothstep(y,1.348,1.373)):.035;
      frontZ=THREE.MathUtils.lerp(frontZ,templeZ,w);
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
    const color=new THREE.Color(boundaryColor);
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
  const clipFrontNape=mesh=>{
    // This is a fixed semantic layer boundary in head-local coordinates, not
    // a view-dependent fade. The rear cap owns the nape below this boundary.
    if(!config.surface?.frontMask)return;
    const mask=config.surface.frontMask,previous=mesh.material.onBeforeCompile,key=mesh.material.customProgramCacheKey();
    mesh.material.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      shader.vertexShader='varying vec2 frontHairRest;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfrontHairRest=position.xy;');
      shader.fragmentShader='varying vec2 frontHairRest;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
        float napeSide=smoothstep(${mask.x.map(v=>v.toFixed(6)).join(',')},abs(frontHairRest.x-(${config.cap.center[0].toFixed(6)})));
        float napeLow=1.0-smoothstep(${mask.y.map(v=>v.toFixed(6)).join(',')},frontHairRest.y);
        diffuseColor.a*=1.0-napeSide*napeLow;
        #include <alphatest_fragment>`);
    };
    mesh.material.alphaTest=.35;
    mesh.material.customProgramCacheKey=()=>key+'|front-nape-mask|'+JSON.stringify(mask);
  };
  const sampleChart=(knots,y)=>{
    if(y<=knots[0][0])return knots[0][1];
    for(let i=1;i<knots.length;i++)if(y<=knots[i][0])return THREE.MathUtils.lerp(knots[i-1][1],knots[i][1],THREE.MathUtils.smoothstep(y,knots[i-1][0],knots[i][0]));
    return knots.at(-1)[1];
  };
  const addSemanticPaintMesh=original=>{
    const chart=config.surface?.templeChart;
    if(!chart){root.add(original);return;}
    const boundaryCode=chart.boundary.slice(1).map((p,i)=>`if(y<=${p[0].toFixed(6)})return mix(${chart.boundary[i][1].toFixed(6)},${p[1].toFixed(6)},smoothstep(${chart.boundary[i][0].toFixed(6)},${p[0].toFixed(6)},y));`).join('\n');
    for(const temple of [false,true]){
      const g=original.geometry.clone(),m=original.material.clone();
      m.onBeforeCompile=original.material.onBeforeCompile;
      m.customProgramCacheKey=original.material.customProgramCacheKey;
      if(temple){
        const p=g.attributes.position;
        for(let i=0;i<p.count;i++){
          const x=p.getX(i),y=p.getY(i),frontZ=depth(x,y)[0],sideOffset=p.getZ(i)-frontZ;
          const w=THREE.MathUtils.smoothstep(Math.abs(x-config.cap.center[0])-sampleChart(chart.boundary,y),0,chart.blendWidth);
          // This chart alone follows the temporal surface. The original
          // frontal painting and the rear cap retain their independent maps.
          const target=Math.max(sampleChart(chart.depth,y),surfaceZ(x,y)+chart.clearance,frontZ-chart.maxRetreat);
          p.setZ(i,THREE.MathUtils.lerp(frontZ,target,w)+sideOffset);
        }
        p.needsUpdate=true;g.computeVertexNormals();
      }
      const previous=m.onBeforeCompile,key=m.customProgramCacheKey();
      m.onBeforeCompile=function(shader,renderer){
        previous.call(this,shader,renderer);
        shader.vertexShader='varying vec2 hairDomainRest;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhairDomainRest=position.xy;');
        shader.fragmentShader=`varying vec2 hairDomainRest;\nfloat hairDomainBoundary(float y){\n${boundaryCode}\nreturn ${chart.boundary.at(-1)[1].toFixed(6)};\n}\n`+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
          float templeDomain=abs(hairDomainRest.x-(${config.cap.center[0].toFixed(6)}))-hairDomainBoundary(hairDomainRest.y);
          if(templeDomain${temple?'<':'>'}0.0)discard;
          #include <alphatest_fragment>`);
      };
      m.customProgramCacheKey=()=>key+'|static-hair-domain|'+temple+'|'+JSON.stringify(chart);
      const mesh=new THREE.Mesh(g,m);mesh.name=temple?'painted-temple-domain':'painted-fringe-domain';root.add(mesh);
    }
  };
  for(const [side,points] of [front,back].entries()){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
    let paint=material;
    if(side===1&&rear&&config.rearOnFrontBack!==false){
      g.setAttribute('uv1',g.attributes.uv.clone());
      for(let i=0;i<points.length/3;i++){
        const chart=config.rearMap;
        if(chart)g.attributes.uv.setXY(i,(chart.originX-(points[i*3]-(config.originWorldX??0))*chart.pixelsPerMetre)/rear.width,1-(chart.originY+(chart.anchorY-points[i*3+1])*chart.pixelsPerMetre)/rear.height);
        else g.attributes.uv.setXY(i,(792-points[i*3]*3186)/rear.width,1-(500+(1.515-points[i*3+1])*3186)/rear.height);
      }
      const reversed=[];for(let i=0;i<index.length;i+=3)reversed.push(index[i],index[i+2],index[i+1]);g.setIndex(reversed);
      paint=new THREE.MeshBasicMaterial({map:rearTexture,alphaMap:alphaTexture,alphaTest:.35,side:THREE.FrontSide,toneMapped:false});
    }
    if(side===1&&config.rearOnFrontBack===false)paint=material.clone(),paint.side=THREE.BackSide;
    const mesh=new THREE.Mesh(g,paint.clone());
    clipFrontNape(mesh);
    if(config.profileFit)fadeTailPainting(mesh,{temple:!!config.templeCurve,naturalTempleLocks:!!config.naturalTempleLocks});
    addSemanticPaintMesh(mesh);
  }
  const edges=new THREE.BufferGeometry();edges.setAttribute('position',new THREE.Float32BufferAttribute(edgePos,3));edges.setAttribute('color',new THREE.Float32BufferAttribute(edgeColor,3));edges.computeVertexNormals();
  const edgeMesh=new THREE.Mesh(edges,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}));
  clipFrontNape(edgeMesh);
  if(config.profileFit)fadeTailPainting(edgeMesh,{temple:!!config.templeCurve,naturalTempleLocks:!!config.naturalTempleLocks});
  addSemanticPaintMesh(edgeMesh);
  const coreCanvas=document.createElement('canvas');coreCanvas.width=canvas.width;coreCanvas.height=canvas.height;
  const coreContext=coreCanvas.getContext('2d');coreContext.fillStyle=baseColor;coreContext.fillRect(0,0,canvas.width,canvas.height);coreContext.drawImage(rear??source,0,0,canvas.width,canvas.height);
  const coreTexture=new THREE.CanvasTexture(coreCanvas);coreTexture.colorSpace=THREE.SRGBColorSpace;coreTexture.anisotropy=8;
  const cores=config.cores??(config.profileFit?[
    {p:[[.065,1.605,-.067],[.125,1.59,-.092],[.154,1.48,-.112],[.154,1.37,-.095],[.179,1.317,-.045]],w:.021,obliqueP:[[.065,1.605,-.067],[.113,1.610,-.082],[.139,1.495,-.100],[.139,1.385,-.083],[.164,1.332,-.033]],obliqueW:.021,crop:[315,330,65,650]},
    {p:[[.066,1.606,-.068],[.119,1.54,-.126],[.135,1.44,-.140],[.137,1.35,-.120],[.160,1.325,-.078]],w:.017,obliqueP:[[.066,1.606,-.068],[.104,1.555,-.114],[.120,1.455,-.128],[.122,1.365,-.108],[.145,1.340,-.066]],obliqueW:.017,crop:[230,360,70,580]},
    {p:[[.068,1.607,-.066],[.152,1.53,-.144],[.166,1.42,-.156],[.166,1.34,-.130],[.185,1.325,-.092]],w:.014,obliqueP:[[.068,1.607,-.066],[.137,1.545,-.132],[.151,1.435,-.144],[.151,1.355,-.118],[.170,1.340,-.080]],obliqueW:.014,crop:[390,280,65,610]}
  ]:[
    {p:[[.119,1.644,-.026],[.148,1.59,-.035],[.166,1.48,-.038],[.160,1.37,-.033],[.185,1.317,-.019]],w:.024,crop:[315,330,65,650]},
    {p:[[.117,1.620,-.049],[.130,1.54,-.054],[.137,1.44,-.057],[.140,1.35,-.043],[.163,1.325,-.028]],w:.019,crop:[230,360,70,580]},
    {p:[[.150,1.615,-.043],[.173,1.53,-.048],[.185,1.42,-.046],[.184,1.34,-.031],[.204,1.325,-.014]],w:.014,crop:[390,280,65,610]}
  ]);
  if(config.templeCurve)for(const side of [-1,1]){
    cores.push({temple:true,p:[[side*.083,1.530,.030],[side*.092,1.482,.034],[side*.090,1.433,.032],[side*.084,1.402,.035],[side*.070,1.374,.043]],w:.0038,crop:[295,270,45,480]});
    if(config.naturalTempleLocks){
      // Branches emerge inside the main lock, with unequal lengths and bends.
      // Both sides need unequal tapered ends. Their oblique reveal preserves
      // the frontal painting; the near side must not remain one hooked ribbon.
      cores.push({temple:true,branchOffset:.008,p:[[side*.091,1.493,.034],[side*.092,1.452,.034],[side*.087,1.419,.037],[side*.077,1.397,.044]],w:.0013,crop:[298,340,23,395]});
      cores.push({temple:true,branchOffset:-.004,p:[[side*.088,1.477,.033],[side*.088,1.432,.032],[side*.076,1.395,.038],[side*.060,1.365,.048]],w:.0008,crop:[316,390,18,430]});
    }
    // Short temporal hairline above the ear. Its uneven lower edge belongs to
    // the scalp and tucks behind the helix, instead of floating on the cheek.
    const points=[[.088,1.518,.027],[.095,1.494,.035],[.097,1.482,.033],[.097,1.474,.029],[.097,1.478,.020],[.098,1.469,.014],[.098,1.480,.001],[.091,1.510,-.015]];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>[p[0]*side,p[1],p[2]]),3));
    g.setIndex([0,1,2,0,2,3,0,3,4,0,4,5,0,5,6,0,6,7]);g.computeVertexNormals();
    const patch=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:baseColor,side:THREE.DoubleSide,toneMapped:false}));
    patch.name='temporal-hairline';root.add(patch);
  }
  for(const lock of cores){
    const curve=new THREE.CatmullRomCurve3(lock.p.map(p=>new THREE.Vector3(...p))),pos=[],centres=[],uvs=[],tris=[],deltas=[],rows=90,sides=40;
    const farPoints=!lock.temple?config.tailFlow?.farPaths?.[cores.indexOf(lock)]:null;
    const farCurve=farPoints?new THREE.CatmullRomCurve3(farPoints.map(p=>new THREE.Vector3(...p))):null,farDeltas=[];
    const targetCurve=lock.obliqueP?new THREE.CatmullRomCurve3(lock.obliqueP.map(p=>new THREE.Vector3(...p))):null;
    for(let row=0;row<=rows;row++){
      const t=row/rows,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),across=new THREE.Vector3(0,0,1).cross(tangent).normalize(),deep=tangent.clone().cross(across).normalize();
      const radius=lock.w*(lock.temple?THREE.MathUtils.smoothstep(t,0,.06)*Math.pow(1-t,.8)*1.45:Math.pow(Math.max(.00001,Math.sin(Math.PI*t)),.65));
      const tc=targetCurve?.getPoint(t),tt=targetCurve?.getTangent(t).normalize();
      const fc=farCurve?.getPoint(t),ft=farCurve?.getTangent(t).normalize();
      const fa=ft?new THREE.Vector3(0,0,1).cross(ft).normalize():null,fd=ft?.clone().cross(fa).normalize();
      const ta=tt?new THREE.Vector3(0,0,1).cross(tt).normalize():null,td=tt?.clone().cross(ta).normalize();
      for(let col=0;col<=sides;col++){
        const a=col/sides*Math.PI*2,v=c.clone().addScaledVector(across,Math.cos(a)*radius).addScaledVector(deep,Math.sin(a)*radius*(lock.temple?1.3:(config.tailRoundness??1.15)));
        v.z+=config.profileFit?0:(config.tailOffset??0);
        pos.push(...v.toArray());centres.push(...c.toArray());
        if(fc){
          const flow=config.tailFlow,fr=radius*flow.radiusScale*(1-(1-flow.tipRadius)*THREE.MathUtils.smoothstep(t,flow.tipStart,1));
          const fv=fc.clone().addScaledVector(fa,Math.cos(a)*fr).addScaledVector(fd,Math.sin(a)*fr*flow.roundness);
          farDeltas.push(...fv.sub(v).toArray());
        }
        if(tc){const tr=radius*lock.obliqueW/lock.w;const tv=tc.clone().addScaledVector(ta,Math.cos(a)*tr).addScaledVector(td,Math.sin(a)*tr*(config.tailRoundness??1.15));deltas.push(...tv.sub(v).toArray());}
        // Circumferential UV keeps the strand painting flowing down the lock
        // when seen from the side, instead of collapsing a frontal projection.
        const [sx,sy,sw,sh]=lock.crop;uvs.push((sx+col/sides*sw)/canvas.width,1-(sy+t*sh)/canvas.height);
        if(row<rows&&col<sides){const k=row*(sides+1)+col;tris.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('hairLockCenter',new THREE.Float32BufferAttribute(centres,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(tris);g.computeVertexNormals();
    if(farCurve)g.setAttribute('hairFarDelta',new THREE.Float32BufferAttribute(farDeltas,3));
    if(targetCurve)g.setAttribute('hairSideDelta',new THREE.Float32BufferAttribute(deltas,3));
    const m=new THREE.MeshBasicMaterial({map:coreTexture,side:THREE.DoubleSide,toneMapped:false}),mesh=new THREE.Mesh(g,m);root.add(mesh);
    if(sideTexture){
      if(config.profileFit)paintHairVolume(mesh,sideTexture,lock.temple?config.sidePaint:{...config.sidePaint,right:[635,590],left:[215,182],anchorY:1.515},{cutout:!lock.temple,tipCoverage:farCurve?config.tailFlow.tipCoverage:null});
      else paintHairVolume(mesh,sideTexture,config.sidePaint);
    }
    if(config.templeCurve){
      const previous=mesh.material.onBeforeCompile,key=mesh.material.customProgramCacheKey();
      mesh.material.onBeforeCompile=function(s,renderer){
        previous.call(this,s,renderer);
        if(targetCurve)s.vertexShader='attribute vec3 hairSideDelta;\n'+s.vertexShader;
        if(farCurve)s.vertexShader='attribute vec3 hairFarDelta;\n'+s.vertexShader;
        if(lock.temple&&config.naturalTempleLocks)s.vertexShader='attribute vec3 hairLockCenter;\n'+s.vertexShader;
        s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          vec3 hairView=normalize(vec3(modelViewMatrix[0][2],modelViewMatrix[1][2],modelViewMatrix[2][2]));
          float hairYaw=atan(hairView.x,hairView.z);
          ${targetCurve?'float sideWeight=smoothstep(.349066,1.047198,abs(hairYaw));\n          transformed+=hairSideDelta*sideWeight;':''}
          float oblique=pow(sin(2.0*hairYaw),2.0)*smoothstep(0.0,.3,hairView.z);
          ${lock.temple&&config.naturalTempleLocks?`float farSign=-sign(hairYaw);
          float farLock=smoothstep(.015,.045,farSign*position.x);
          float lockTurn=smoothstep(.261799,.785398,abs(hairYaw))*(1.0-smoothstep(1.221730,1.570796,abs(hairYaw)));
          float rootBlend=1.0-smoothstep(1.478,1.522,hairLockCenter.y);
          float drop=max(0.0,1.470-hairLockCenter.y);
          float projectedCenter=.115+.020*drop-3.50*drop*drop+${(lock.branchOffset??0).toFixed(6)}*smoothstep(0.0,.070,drop);
          float centerTargetZ=(projectedCenter-farSign*hairLockCenter.x*cos(abs(hairYaw)))/max(.25,sin(abs(hairYaw)));
          float lockWeight=farLock*lockTurn*rootBlend;
          // Keep a tapered ribbon of hair, not a broad isolated paddle.
          float lockWidth=(1.0-.40*lockWeight)${lock.branchOffset!=null?'*mix(smoothstep(.261799,.698132,abs(hairYaw)),lockTurn,farLock)':''};
          transformed=hairLockCenter+(position-hairLockCenter)*lockWidth;
          transformed.z+=(centerTargetZ-hairLockCenter.z)*lockWeight;
          float rootJoin=farLock*lockTurn*smoothstep(1.478,1.522,hairLockCenter.y);
          transformed.y+=.022*rootJoin;
          transformed.z+=.016*rootJoin;
          transformed.y-=.010*lockWeight*(1.0-smoothstep(1.374,1.425,position.y));`:
          lock.temple?`float farLock=smoothstep(.015,.045,-sign(hairYaw)*position.x);
          // Keep the root embedded; swing only the hanging portion around
          // the far cheek at deeper turns. A full-lock shift floats at 45°.
          transformed.z+=.060*farLock*oblique*smoothstep(.50,1.047198,abs(hairYaw))*(1.0-smoothstep(1.478,1.522,position.y));
          transformed.y-=.022*farLock*oblique*(1.0-smoothstep(1.374,1.425,position.y));`:
          `float hanging=1.0-smoothstep(1.36,1.60,position.y);
          ${farCurve?`float farTail=smoothstep(${(config.tailFlow.start*Math.PI/180).toFixed(6)},${(config.tailFlow.end*Math.PI/180).toFixed(6)},-hairYaw);
          transformed+=farTail*(hairFarDelta-hairSideDelta*sideWeight);`:`float farTail=smoothstep(.15,.55,-hairYaw)*oblique;
          transformed.z-=.105*farTail*hanging;
          transformed.x-=.015*farTail*hanging;`}
          transformed.y-=.045*pow(sin(hairYaw),2.0)*hanging;`}
        `);
      };
      mesh.material.customProgramCacheKey=()=>key+'|hair-turn-volume-v10|'+!!lock.temple+'|'+!!targetCurve+'|'+!!config.naturalTempleLocks+'|'+lock.branchOffset+'|'+JSON.stringify(config.tailFlow);
      if(lock.temple&&config.naturalTempleLocks)mesh.userData.ownObliqueHair=true;
    }
  }
  root.userData.source=config.url;root.userData.kind='painted curved hair shell with thickness';
  root.traverse(mesh=>{if(!mesh.userData.ownObliqueHair)applyObliqueFaceSupport(mesh,config.obliqueFaceSupport?{...config.obliqueFaceSupport,broadFold:true}:null);});
  // Mesh vertices are authored in the same neutral metre frame as the cap.
  // addGraphicHair already attached root to the head bone before these children.
  return root;
}
