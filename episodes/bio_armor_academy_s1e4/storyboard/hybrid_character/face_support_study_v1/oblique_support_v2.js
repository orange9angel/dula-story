/** Small anime view-dependent correction shared by face and overlying hair.
 * It acts on actual 3D vertices, preserving front/profile endpoints. */
export function applyObliqueFaceSupport(mesh, config){
  if(!config||!mesh.isMesh)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const material of materials){
    if(material.userData.obliqueFaceSupport)return;
    material.userData.obliqueFaceSupport=true;
    const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
    const key=previousKey();
    material.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      shader.uniforms.obliqueFaceShift={value:[config.width,config.depth]};
      shader.vertexShader='uniform vec2 obliqueFaceShift;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 faceView = normalize(vec3(modelViewMatrix[0][2], modelViewMatrix[1][2], modelViewMatrix[2][2]));
        float faceYaw = atan(faceView.x, faceView.z);
        float faceTurnWeight = pow(sin(2.0 * faceYaw), 2.0) * smoothstep(0.0, 0.3, faceView.z);
        float faceFarSide = -sign(faceView.x);
        float faceSideWeight = smoothstep(0.012, 0.080, faceFarSide * position.x);
        // Translate the iris-bearing patch without stretching it into a round,
        // front-facing far eye. Surrounding skin receives the broader support.
        vec2 eyeDelta = vec2((faceFarSide * position.x - 0.043) / 0.028, (position.y - 1.473) / 0.029);
        float eyePatch = 1.0 - smoothstep(0.60, 1.30, dot(eyeDelta, eyeDelta));
        faceSideWeight = mix(faceSideWeight, smoothstep(0.012, 0.080, 0.043), eyePatch);
        float faceHeightWeight = smoothstep(1.38, 1.44, position.y) * (1.0 - smoothstep(1.52, 1.57, position.y));
        float faceFrontWeight = smoothstep(0.005, 0.055, position.z);
        float faceSupportWeight = faceTurnWeight * faceSideWeight * faceHeightWeight * faceFrontWeight;
        transformed.x += faceFarSide * obliqueFaceShift.x * faceSupportWeight;
        transformed.z += obliqueFaceShift.y * faceSupportWeight;
      `);
    };
    material.customProgramCacheKey=()=>key+'|oblique-face-support-v2';
    material.needsUpdate=true;
  }
}
