import * as THREE from 'three';

/** Character-calibrated palette pass. Keeps the imported skinned clothing and
 * hands. Color thresholds are evidence for these inputs, not semantic parsing. */
export function illustrateImportedBody(actor,{kind,headCut,keepHair=false,skin='#efcbae',refineNeck=false}){
  const counts={removedTriangles:0,keptTriangles:0};
  for(const mesh of actor.skins){
    const g=mesh.geometry,rest=g.attributes.performerRest,region=g.attributes.craftRegion,j=g.attributes.skinIndex,w=g.attributes.skinWeight;
    const headIndices=new Set(mesh.skeleton.bones.map((b,i)=>/head/i.test(b.name)?i:-1).filter(i=>i>=0));
    const selected=new Uint8Array(rest.count),cloth=new Float32Array(rest.count*4);
    const canvas=document.createElement('canvas'),map=mesh.material.map;canvas.width=map.image.width;canvas.height=map.image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(map.image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,uv=g.attributes.uv,texel=new THREE.Vector2();
    for(let i=0;i<rest.count;i++){
      const hw=[0,1,2,3].reduce((s,k)=>s+(headIndices.has(j.array[i*4+k])?w.array[i*4+k]:0),0);
      const x=Math.abs(rest.getX(i)),y=rest.getY(i),z=rest.getZ(i);
      selected[i]=((y>headCut-(kind==='aoi'?.01:.065)&&hw>.25)||(hw>.65&&y>1.08&&(x>.075||z<-.06)))&&(!keepHair||region.getX(i)<.5)?1:0;
      // Lei's old occiput includes weakly head-weighted triangles assigned to
      // neutral_bone. Above the collar, the replacement head covers this zone.
      if(kind==='lei'&&refineNeck&&!keepHair&&y>1.55&&x<.16&&z>-.18&&z<.18)selected[i]=1;
      texel.fromBufferAttribute(uv,i);map.transformUv(texel);const k=(Math.min(canvas.height-1,Math.max(0,Math.floor(texel.y*canvas.height)))*canvas.width+Math.min(canvas.width-1,Math.max(0,Math.floor(texel.x*canvas.width))))*4;
      const r=pixels[k]/255,green=pixels[k+1]/255,b=pixels[k+2]/255;
      if(kind==='aoi'&&y>headCut-.08&&x<.073&&hw>.2&&r>green*1.12&&green>b*1.10)selected[i]=1;
      if(kind==='aoi'&&y>headCut-.05&&x<.08&&z<.045&&hw>.25)selected[i]=1;
      // Isolated old-head fragments above the collar otherwise float beside
      // the replacement neck; keep the lower, shoulder-connected collar.
      if(kind==='aoi'&&y>headCut-.04&&x>.052&&x<.08&&hw>.20)selected[i]=1;
      const neck=y>headCut-.085&&x<.068;
      const exposed=x>.13;
      const handWeight=[0,1,2,3].reduce((s,k)=>s+(/hand|thumb|index|middle|ring|pinky/i.test(mesh.skeleton.bones[j.array[i*4+k]].name)?w.array[i*4+k]:0),0);
      cloth[i*4]=handWeight>.35||(neck&&r>green*1.20&&green>b*1.09)||(exposed&&r>green*1.22&&green>b*1.12)?1:0;
      const vestHem=.955+.04*THREE.MathUtils.smoothstep(x,.02,.13);
      const vestInterior=y>vestHem&&y<1.28&&x<.13&&green>r*.92&&r<.62;
      cloth[i*4+1]=kind==='aoi'&&(vestInterior||(y>vestHem&&y<1.32&&x<.18&&green>r*1.015&&r<.60))?1:0;
      cloth[i*4+2]=kind==='aoi'&&y>1.10&&y<1.32&&x<.08&&r>green*1.23&&b>green*.79?1:0;
      cloth[i*4+3]=(kind==='lei'?(y<.85||(y<1.075&&(.299*r+.587*green+.114*b)<.48)):y<.95)?1:0;
      if(kind==='aoi'){
        // Warm shadows in the cream shirt are not exposed skin. The imported
        // short sleeve has a stable cut along the rest upper-arm axis.
        const side=rest.getX(i)>0?'left':'right',a=actor.neutral[side+'arm'],e=actor.neutral[side+'forearm'];
        const axis=e.clone().sub(a),along=new THREE.Vector3(rest.getX(i),y,z).sub(a).dot(axis)/axis.lengthSq();
        const armWeight=[0,1,2,3].reduce((s,k)=>s+(/arm|hand|thumb|index|middle|ring|pinky/i.test(mesh.skeleton.bones[j.array[i*4+k]].name)?w.array[i*4+k]:0),0);
        const arm=armWeight>.36&&x>.115;
        const bareNeck=x<.046&&y>1.315+x*1.05;
        cloth[i*4]=handWeight>.35||(arm&&along>.63)||bareNeck?1:0;
        const vestZone=!arm&&x<.16&&y>vestHem&&y<1.325;
        cloth[i*4+1]=vestZone&&green>r*1.055&&green>b*1.035?1:0;
        if(arm){cloth[i*4+1]=0;cloth[i*4+2]=0;}
        // Restrict the bow to its actual front chest zone; neck shadows were
        // previously read as berry-red specks above the knot.
        cloth[i*4+2]=z>.055&&y>1.13&&y<1.285&&x<.071&&r>green*1.30&&b>green*.82?1:0;
      }
    }
    // Smooth the semantic weights over topology before thresholding; tiny baked
    // shadows must not become confetti in a flat shirt or vest.
    const adj=Array.from({length:rest.count},()=>[]),sourceIndex=g.index;
    for(let i=0;i<sourceIndex.count;i+=3){const a=sourceIndex.getX(i),b=sourceIndex.getX(i+1),c=sourceIndex.getX(i+2);adj[a].push(b,c);adj[b].push(a,c);adj[c].push(a,b);}
    let current=cloth;
    for(let pass=0;pass<18;pass++){const next=new Float32Array(current.length);for(let i=0;i<rest.count;i++)for(let k=0;k<4;k++){let sum=current[i*4+k]*2;for(const n of adj[i])sum+=current[n*4+k];next[i*4+k]=sum/(adj[i].length+2);}current=next;}
    g.setAttribute('drawnCloth',new THREE.BufferAttribute(current,4));
    // Average only surface normals: retains seams and silhouette geometry while
    // preventing tiny generated wrinkles from fragmenting the cel shadow.
    let normals=new Float32Array(g.attributes.normal.array);
    for(let pass=0;pass<16;pass++){const next=new Float32Array(normals.length);for(let i=0;i<rest.count;i++){const v=new THREE.Vector3(normals[i*3]*2,normals[i*3+1]*2,normals[i*3+2]*2);for(const n of adj[i])v.add(new THREE.Vector3(normals[n*3],normals[n*3+1],normals[n*3+2]));v.normalize().toArray(next,i*3);}normals=next;}
    g.setAttribute('normal',new THREE.BufferAttribute(normals,3));
    const index=g.index,keep=[];
    for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
      if(selected[a]+selected[b]+selected[c]>0)counts.removedTriangles++;
      else{keep.push(a,b,c);counts.keptTriangles++;}
    }g.setIndex(keep);
    const old=mesh.material,m=new THREE.MeshToonMaterial({map:old.map,toneMapped:false});
    const palette={skin,shirt:'#fff5e6',shirtShade:'#b4bdc9',vest:'#285442',vestShade:'#17372e',tie:'#b7455d',tieShade:'#752b46',trousers:kind==='aoi'?'#304b3c':'#343e53',trousersShade:kind==='aoi'?'#1c302c':'#1d2536',stockings:'#30303e',stockingsShade:'#1e202e',shoes:'#684333',shoesShade:'#3b2c2b',hair:'#382f2d'};
    const colors=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,new THREE.Color(v)]));
    m.onBeforeCompile=s=>{
      for(const [key,color] of Object.entries(colors))s.uniforms['drawn_'+key]={value:color};
      s.vertexShader='attribute vec3 performerRest; attribute vec3 craftRegion; attribute vec4 drawnCloth; varying vec3 vPerformerRest,vDrawnRegion; varying vec4 vDrawnCloth;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPerformerRest=performerRest;vDrawnRegion=craftRegion;vDrawnCloth=drawnCloth;');
      s.fragmentShader='varying vec3 vPerformerRest,vDrawnRegion; varying vec4 vDrawnCloth;\n'+Object.keys(colors).map(k=>`uniform vec3 drawn_${k};`).join('\n')+'\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 raw=pow(max(diffuseColor.rgb,vec3(0.0)),vec3(1.0/2.2));
        float y=vPerformerRest.y,x=abs(vPerformerRest.x);
        bool skinPixel=vDrawnCloth.x>.45&&y>.60;
        ${kind==='aoi'?`vec2 upperDelta=vec2(x-.119,y-1.2897),foreDelta=vec2(x-.222,y-1.058);
        float armAlong=dot(upperDelta,vec2(.103,-.2316))/.06424;
        float foreAlong=dot(foreDelta,vec2(.125,-.183))/.049114;
        float upperDistance=length(upperDelta-clamp(armAlong,0.0,1.0)*vec2(.103,-.2316));
        float foreDistance=length(foreDelta-clamp(foreAlong,0.0,1.85)*vec2(.125,-.183));
        bool armZone=x>.115&&y>.60&&(upperDistance<.075||foreDistance<.065);
        bool neckZone=${refineNeck?'(x<.032&&y>1.315+x*.50)||(x<.052&&y>1.33&&vDrawnCloth.x>.50)':'x<.065&&y>1.30+x*.85'};
        skinPixel=(armZone&&vDrawnCloth.x>.15&&armAlong>.63)||neckZone;
        ${refineNeck?'if(neckZone&&y>1.326)discard;':''}`:''}
        bool hair=vDrawnRegion.x>.5&&y>${headCut};
        vec3 base=vDrawnCloth.w>.5?drawn_trousers:drawn_shirt;
        vec3 shade=vDrawnCloth.w>.5?drawn_trousersShade:drawn_shirtShade;
        ${kind==='aoi'?'if(y<1.02){base=drawn_trousers;shade=drawn_trousersShade;}':''}
        ${kind==='aoi'?'if(y<.60){base=drawn_stockings;shade=drawn_stockingsShade;}':''}
        if(y<.125){base=drawn_shoes;shade=drawn_shoesShade;}
        ${kind==='aoi'?`bool vest=vDrawnCloth.y>.32;
        if(vest){base=drawn_vest;shade=drawn_vestShade;}
        bool ribbon=vDrawnCloth.z>.40;
        if(ribbon){base=drawn_tie;shade=drawn_tieShade;}`:''}
        if(skinPixel){base=drawn_skin;shade=base*vec3(.70,.73,.81);}
        if(hair)base=drawn_hair;
        ${kind==='aoi'?`if(vest&&!ribbon&&vPerformerRest.z>.045){
          float button=0.0;
          for(int i=0;i<3;i++)button=max(button,1.0-smoothstep(.0022,.0031,length(vPerformerRest.xy-vec2(0.0,1.14-float(i)*.047))));
          base=mix(base,base*.46,button);
        }`:''}
        vec3 worldN=inverseTransformDirection(normal,viewMatrix);
        float lit=smoothstep(.34,.40,dot(worldN,normalize(vec3(-.55,.65,.55))));
        // Authored light/shadow swatches preserve chroma. Multiplying a pale
        // base by .7 in linear space produced only a weak display contrast.
        float skinLit=smoothstep(.12,.20,dot(worldN,normalize(vec3(-.35,.65,.7))));
        outgoingLight=mix(shade,base,skinPixel?mix(.84,1.0,skinLit):lit);
        if(skinPixel&&raw.g>raw.r*1.8&&raw.g>raw.b*1.2)outgoingLight=diffuseColor.rgb;
        #include <opaque_fragment>`);
    };m.customProgramCacheKey=()=>`illustrated-body-${kind}-${headCut}-${refineNeck}`;mesh.material=m;
    // The outline shares the skeleton, bind frame, indices and morph weights.
    const ink=new THREE.MeshBasicMaterial({color:'#33353d',side:THREE.BackSide,toneMapped:false});
    ink.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed+=objectNormal*${(.00085/actor.scale).toFixed(7)};`);};
    const outlineGeometry=g.clone(),outlineIndex=[];
    for(let i=0;i<keep.length;i+=3){const tri=keep.slice(i,i+3);if(tri.some(v=>rest.getY(v)>headCut-.12&&Math.abs(rest.getX(v))<.09))continue;outlineIndex.push(...tri);}outlineGeometry.setIndex(outlineIndex);
    const outline=new THREE.SkinnedMesh(outlineGeometry,ink);outline.name='illustrated-body-outline';outline.position.copy(mesh.position);outline.quaternion.copy(mesh.quaternion);outline.scale.copy(mesh.scale);
    outline.bindMode=mesh.bindMode;outline.bind(mesh.skeleton,mesh.bindMatrix);outline.morphTargetInfluences=mesh.morphTargetInfluences;outline.frustumCulled=false;mesh.parent.add(outline);
  }
  return counts;
}
