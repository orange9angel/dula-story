import * as THREE from 'three';

// Authored view correctives on bone-bound curved hair surfaces. Key images are
// production textures; interpolation moves corresponding regions together.
// This limited-view construction does not recover unseen physical strands.
const front={angle:0,origin:[615,654],scale:3186,texture:0,
  outer:[[300,1000],[50,780],[80,420],[280,150],[610,35],[810,130],[950,410],[970,770],[830,1000]],
  inner:[[430,860],[330,700],[430,650],[560,680],[670,630],[710,370],[840,560],[860,740],[820,870]],tail:[775,0,1331,1181]};
const right45={angle:Math.PI/4,origin:[195,600],scale:1180,texture:1,
  outer:[[140,750],[35,645],[45,490],[110,425],[200,395],[290,425],[345,500],[340,665],[300,750]],
  inner:[[170,710],[135,650],[170,610],[190,590],[230,540],[280,520],[300,570],[310,640],[290,700]],tail:[300,402,440,790]};
const right90={angle:Math.PI/2,origin:[690,590],scale:1030,texture:1,
  outer:[[635,700],[560,630],[545,520],[575,435],[700,402],[780,420],[825,480],[835,585],[700,745]],
  inner:[[660,675],[640,630],[650,580],[685,560],[750,480],[790,510],[805,580],[715,590],[675,710]],tail:[440,400,615,792]};
const left45={angle:-Math.PI/4,origin:[673,180],scale:1180,texture:1,
  outer:[[530,350],[465,255],[460,120],[500,40],[620,0],[720,30],[760,110],[755,265],[710,350]],
  inner:[[550,305],[515,245],[520,190],[555,165],[595,110],[650,110],[705,170],[705,240],[690,310]],tail:[715,0,872,398]};
const left90={angle:-Math.PI/2,origin:[201,182],scale:1030,texture:1,
  outer:[[175,350],[60,225],[45,120],[85,35],[180,0],[290,20],[325,110],[300,245],[255,310]],
  inner:[[185,320],[110,235],[105,190],[120,155],[145,100],[195,150],[235,175],[240,225],[240,285]],tail:[280,0,440,398]};

function surface(key,px,py,tail){
  const horizontal=(px-key.origin[0])/key.scale,y=1.473+(key.origin[1]-py)/key.scale;
  const depth=tail?(-.080*Math.cos(key.angle)-.150*Math.sin(key.angle)):(.025+.125*Math.sqrt(Math.max(.01,1-(horizontal/.185)**2-((y-1.52)/.180)**2)));
  return [horizontal*Math.cos(key.angle)-depth*Math.sin(key.angle),y,horizontal*Math.sin(key.angle)+depth*Math.cos(key.angle)];
}

export async function addMorphPaintedHair(actor,{frontUrl,atlasUrl}){
  const load=new THREE.TextureLoader(),textures=await Promise.all([load.loadAsync(frontUrl),load.loadAsync(atlasUrl)]);
  for(const t of textures){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;}
  const root=new THREE.Group();root.name='morph-painted-hair';root.userData.kind='painted curved hair shell with thickness';actor.mesh.add(root);
  const keys=[left90,left45,front,right45,right90];
  for(const tail of [false,true]){
    const cols=tail?70:160,rows=tail?100:35,count=(cols+1)*(rows+1),indices=[];
    const data=keys.map(key=>{
      const position=new Float32Array(count*3),uv=new Float32Array(count*2);
      const outer=new THREE.CatmullRomCurve3(key.outer.map(p=>new THREE.Vector3(...p,0))),inner=new THREE.CatmullRomCurve3(key.inner.map(p=>new THREE.Vector3(...p,0)));
      for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
        const i=row*(cols+1)+col,u=col/cols,v=row/rows;
        let px,py;if(tail){const [l,t,r,b]=key.tail;px=THREE.MathUtils.lerp(l,r,u);py=THREE.MathUtils.lerp(t,b,v);}else{const a=outer.getPoint(u),b=inner.getPoint(u);px=THREE.MathUtils.lerp(a.x,b.x,v);py=THREE.MathUtils.lerp(a.y,b.y,v);}
        position.set(surface(key,px,py,tail),i*3);const texture=textures[key.texture];uv.set([px/texture.image.width,1-py/texture.image.height],i*2);
      }return {position,uv};
    });
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const i=row*(cols+1)+col;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}
    const g=new THREE.BufferGeometry();g.setIndex(indices);g.setAttribute('position',new THREE.BufferAttribute(data[2].position.slice(),3));g.setAttribute('uv',new THREE.BufferAttribute(data[2].uv.slice(),2));g.setAttribute('uvNext',new THREE.BufferAttribute(data[2].uv.slice(),2));g.computeVertexNormals();
    for(let k=0;k<5;k++){g.setAttribute('paintPosition'+k,new THREE.BufferAttribute(data[k].position,3));g.setAttribute('paintUv'+k,new THREE.BufferAttribute(data[k].uv,2));}
    const uniforms={firstArt:{value:textures[0]},secondArt:{value:textures[0]},paintBlend:{value:0},paintKey:{value:2}};
    const m=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,alphaTest:.45,toneMapped:false});
    m.onBeforeCompile=s=>{
      Object.assign(s.uniforms,uniforms);
      s.vertexShader=Array.from({length:5},(_,k)=>`attribute vec3 paintPosition${k};attribute vec2 paintUv${k};`).join('\n')+'\nuniform float paintKey,paintBlend; varying vec2 paintUv,paintUvNext;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 a=paintPosition0,b=paintPosition1;paintUv=paintUv0;paintUvNext=paintUv1;
        if(paintKey>.5){a=paintPosition1;b=paintPosition2;paintUv=paintUv1;paintUvNext=paintUv2;}
        if(paintKey>1.5){a=paintPosition2;b=paintPosition3;paintUv=paintUv2;paintUvNext=paintUv3;}
        if(paintKey>2.5){a=paintPosition3;b=paintPosition4;paintUv=paintUv3;paintUvNext=paintUv4;}
        transformed=mix(a,b,paintBlend);`);
      s.fragmentShader='varying vec2 paintUv,paintUvNext; uniform sampler2D firstArt,secondArt; uniform float paintBlend;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 a=texture2D(firstArt,paintUv),b=texture2D(secondArt,paintUvNext);
        float alpha=mix(a.a,b.a,paintBlend);vec3 color=mix(a.rgb*a.a,b.rgb*b.a,paintBlend)/max(.001,alpha);diffuseColor=vec4(color,alpha);`);
    };m.customProgramCacheKey=()=>`morph-painted-hair-v1`;
    const mesh=new THREE.Mesh(g,m);mesh.name=tail?'morph-ponytail':'morph-main-hair';mesh.frustumCulled=false;root.add(mesh);
    const point=new THREE.Vector3(),inverse=new THREE.Matrix4();
    mesh.onBeforeRender=(_r,_s,camera)=>{
      camera.getWorldPosition(point).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
      const angle=THREE.MathUtils.clamp(Math.atan2(-point.x,point.z),-Math.PI/2,Math.PI/2);
      let k=Math.max(0,Math.min(keys.length-2,keys.findIndex(p=>p.angle>angle)-1));if(angle>=Math.PI/2)k=3;
      const t=THREE.MathUtils.smoothstep(angle,keys[k].angle,keys[k+1].angle);uniforms.paintKey.value=k;
      uniforms.firstArt.value=textures[keys[k].texture];uniforms.secondArt.value=textures[keys[k+1].texture];uniforms.paintBlend.value=t;
    };
  }
  root.updateMatrixWorld(true);actor.bones.head.attach(root);return root;
}
