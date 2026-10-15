import * as THREE from 'three';

// Directional painting on fixed, bone-bound hair volumes. The scalp chart is
// static; tail detail/alpha is view weighted. This is not full 3D reconstruction.
function viewBlend(mesh,callback){
  const point=new THREE.Vector3(),inverse=new THREE.Matrix4();
  mesh.onBeforeRender=(_renderer,_scene,camera)=>{
    camera.getWorldPosition(point).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
    callback(THREE.MathUtils.smoothstep(Math.abs(point.x)/Math.hypot(point.x,point.z),.20,.98),point.x<0?-1:1);
  };
}

export function fadeTailPainting(mesh,{temple=false}={}){
  const uniforms={tailView:{value:0},tailSide:{value:1}};
  viewBlend(mesh,(w,side)=>{uniforms.tailView.value=w;uniforms.tailSide.value=side;});
  mesh.material.onBeforeCompile=s=>{
    Object.assign(s.uniforms,uniforms);
    s.vertexShader='varying vec2 tailXY;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntailXY=position.xy;');
    s.fragmentShader='varying vec2 tailXY;uniform float tailView,tailSide;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float boundary=mix(.100,.055,smoothstep(1.55,1.65,tailXY.y));
      boundary=mix(.085,boundary,smoothstep(1.38,1.48,tailXY.y));
      diffuseColor.a*=1.0-smoothstep(boundary,boundary+.006,tailXY.x)*smoothstep(.10,.65,tailView);
      ${temple?`float lowerFringe=(1.0-smoothstep(1.430,1.450,tailXY.y))*(1.0-smoothstep(.105,.120,abs(tailXY.x)));
      float nearFringe=smoothstep(.015,.035,tailXY.x*tailSide);
      diffuseColor.a*=1.0-lowerFringe*nearFringe*smoothstep(.55,.92,tailView);`:''}`);
  };
  mesh.material.alphaTest=.35;mesh.material.customProgramCacheKey=()=> 'front-tail-detail-v3|'+temple;
}

export function paintHairVolume(mesh,atlas,config,{cutout=false,cap=false,frontTexture=null,frontConfig=null}={}){
  const uniforms={profileArt:{value:atlas},profileWeight:{value:0},profileSide:{value:1}};
  if(frontTexture)uniforms.crownArt={value:frontTexture};
  viewBlend(mesh,(w,side)=>{uniforms.profileWeight.value=w;uniforms.profileSide.value=-side;});
  mesh.material.onBeforeCompile=s=>{
    Object.assign(s.uniforms,uniforms);
    s.vertexShader='varying vec3 hairRest;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhairRest=position;');
    s.fragmentShader='varying vec3 hairRest; uniform sampler2D profileArt,crownArt; uniform float profileWeight,profileSide;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec2 origin=${cap?`vec2(${config.right.join(',')})`:`profileSide>0.0?vec2(${config.right.join(',')}):vec2(${config.left.join(',')})`};
      vec2 pixel=origin+vec2(${cap?'hairRest.z':'profileSide*hairRest.z'},${config.anchorY}-hairRest.y)*${config.scale.toFixed(1)};
      vec4 paint=texture2D(profileArt,vec2(pixel.x/${atlas.image.width.toFixed(1)},1.0-pixel.y/${atlas.image.height.toFixed(1)}));
      float paintMix=${cap?'smoothstep(.012,.065,abs(hairRest.x))':'profileWeight'};
      diffuseColor.rgb=mix(diffuseColor.rgb,paint.rgb,paintMix*smoothstep(.1,.7,paint.a));
      ${frontTexture?`vec2 crownPixel=vec2(${frontConfig.originX.toFixed(1)}+hairRest.x*${frontConfig.pixelsPerMetre.toFixed(1)},${frontConfig.originY.toFixed(1)}+(${frontConfig.anchorY}-hairRest.y)*${frontConfig.pixelsPerMetre.toFixed(1)});
      vec4 crown=texture2D(crownArt,vec2(crownPixel.x/${frontTexture.image.width.toFixed(1)},1.0-crownPixel.y/${frontTexture.image.height.toFixed(1)}));
      diffuseColor.rgb=mix(diffuseColor.rgb,crown.rgb,smoothstep(1.58,1.64,hairRest.y)*smoothstep(-.09,-.03,hairRest.z)*smoothstep(.1,.7,crown.a));`:''}
      ${cutout?'diffuseColor.a*=mix(1.0,paint.a,smoothstep(.35,.92,profileWeight)*(1.0-smoothstep(1.55,1.60,hairRest.y)));':''}
    `);
  };if(cutout)mesh.material.alphaTest=.35;mesh.material.customProgramCacheKey=()=>`hair-volume-project-${cutout}-${cap}-${JSON.stringify(config)}`;
}
