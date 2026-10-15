/** Opt-in view-dependent sculpt authored in Aoi's 1.65 m neutral frame.
 * Shared by face/outline/hair; not a universal head or a CPU mesh deformation.
 * Endpoint front/profile geometry stays unchanged; UVs are not shifted. */
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
      shader.uniforms.obliqueOuterEyeFold={value:config.outerEyeFold??0};
      shader.uniforms.obliqueLowerCheek={value:config.lowerCheek??0};
      shader.vertexShader='uniform vec2 obliqueFaceShift;\nuniform float obliqueOuterEyeFold;\nuniform float obliqueLowerCheek;\n'+shader.vertexShader;
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
        // The temporal eye corner turns away behind the orbital rim. Merely
        // translating the eye plane exposes its complete outer lash in 3/4.
        float outerEye = smoothstep(0.052, 0.085, faceFarSide * position.x);
        float eyeBand = ${config.broadFold?'faceHeightWeight':'smoothstep(1.437, 1.458, position.y) * (1.0 - smoothstep(1.491, 1.515, position.y))'};
        transformed.z -= obliqueOuterEyeFold * faceTurnWeight * outerEye * eyeBand * faceFrontWeight;
        // The fullness belongs to the lower cheek, not a lump immediately
        // below the far eye. Keep this separate from the eye-corner fold.
        float cheekSide = smoothstep(0.012, 0.058, faceFarSide * position.x);
        float cheekLower = exp(-pow((position.y - 1.421) / 0.020, 2.0));
        float cheekUpper = exp(-pow((position.y - 1.451) / 0.015, 2.0));
        float cheekShift = obliqueLowerCheek * (cheekLower - 0.32 * cheekUpper) * faceTurnWeight * cheekSide * faceFrontWeight;
        transformed.x += faceFarSide * cheekShift;
        transformed.z += cheekShift * 0.8;
      `);
    };
    material.customProgramCacheKey=()=>key+'|oblique-face-support-v8|'+!!config.broadFold;
    material.needsUpdate=true;
  }
}
