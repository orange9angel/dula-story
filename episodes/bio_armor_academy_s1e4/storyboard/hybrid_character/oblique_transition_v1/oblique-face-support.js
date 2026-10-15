/** Opt-in view-dependent sculpt authored in Aoi's 1.65 m neutral frame.
 * Shared by face/outline/hair; not a universal head or a CPU mesh deformation.
 * Oblique terms vanish at front/profile; an optional fitted profile target is
 * blended separately. UVs are not shifted. */
export function applyObliqueFaceSupport(mesh, config, underpaint=null){
  if(!config||!mesh.isMesh)return;
  const profileReference=!!mesh.geometry.getAttribute('profileReferenceDelta');
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
      shader.uniforms.obliqueCheekSupport={value:config.cheekSupport??1};
      shader.uniforms.obliqueFarEyeRelax={value:config.broadFold?0:(config.farEyeRelax??0)};
      shader.vertexShader='uniform vec2 obliqueFaceShift;\nuniform float obliqueOuterEyeFold;\nuniform float obliqueLowerCheek;\nuniform float obliqueCheekSupport;\nuniform float obliqueFarEyeRelax;\n'+shader.vertexShader;
      if(profileReference)shader.vertexShader='attribute vec3 profileReferenceDelta;\n'+shader.vertexShader;
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
        float faceHeightWeight = smoothstep(1.38, 1.44, position.y) * (1.0 - smoothstep(1.485, 1.535, position.y));
        float faceFrontWeight = smoothstep(0.005, 0.055, position.z);
        // The restored orbital/forehead support must not become a cheek ball.
        // Ease the lower face into it over a broad band, keeping the eye rim.
        float cheekSupport = mix(obliqueCheekSupport, 1.0, smoothstep(1.405, 1.466, position.y));
        float faceSupportWeight = faceTurnWeight * faceSideWeight * faceHeightWeight * faceFrontWeight * cheekSupport;
        transformed.x += faceFarSide * obliqueFaceShift.x * faceSupportWeight;
        transformed.z += obliqueFaceShift.y * faceSupportWeight;
        // At deeper oblique turns the far iris remains a partial shape, rather
        // than collapsing to a line. The temporal drawing is clipped separately.
        transformed.z += obliqueFarEyeRelax * (faceFarSide*position.x-0.0412) * eyePatch * faceTurnWeight * faceFrontWeight * smoothstep(0.785398,1.047198,abs(faceYaw));
        // The temporal eye corner turns away behind the orbital rim. Merely
        // translating the eye plane exposes its complete outer lash in 3/4.
        float outerEye = smoothstep(0.052, 0.085, faceFarSide * position.x);
        float eyeBand = ${config.broadFold?'faceHeightWeight':`smoothstep(${(config.eyeFoldBottom?.[0]??1.437).toFixed(6)}, ${(config.eyeFoldBottom?.[1]??1.458).toFixed(6)}, position.y) * (1.0 - smoothstep(${(config.eyeFoldTop?.[0]??1.491).toFixed(6)}, ${(config.eyeFoldTop?.[1]??1.515).toFixed(6)}, position.y))`};
        transformed.z -= obliqueOuterEyeFold * faceTurnWeight * outerEye * eyeBand * faceFrontWeight;
        // The fullness belongs to the lower cheek, not a lump immediately
        // below the far eye. Keep this separate from the eye-corner fold.
        float cheekSide = smoothstep(0.012, 0.058, faceFarSide * position.x);
        float cheekLower = exp(-pow((position.y - ${(config.cheekCenter??1.421).toFixed(6)}) / ${(config.cheekSpread??.020).toFixed(6)}, 2.0));
        float cheekUpper = exp(-pow((position.y - 1.451) / 0.015, 2.0));
        float deepCheek = ${(config.deepCheek??0).toFixed(6)} * smoothstep(.872665,1.047198,abs(faceYaw));
        float cheekTop = ${config.cheekTop?`1.0-smoothstep(${config.cheekTop[0].toFixed(6)},${config.cheekTop[1].toFixed(6)},position.y)`:'1.0'};
        float cheekShift = (obliqueLowerCheek+deepCheek) * (cheekLower - ${(config.cheekUpperIndent??.32).toFixed(6)} * cheekUpper) * faceTurnWeight * cheekSide * faceFrontWeight * cheekTop;
        transformed.x += faceFarSide * cheekShift;
        transformed.z += cheekShift * 0.8;
        // The low cheek correction is bounded to oblique views.
        float deepTurn = smoothstep(0.610865,1.047198,abs(faceYaw)) * (1.0-smoothstep(1.221730,1.570796,abs(faceYaw)));
        ${profileReference?`transformed += profileReferenceDelta * smoothstep(${((config.profileStart??65)*Math.PI/180).toFixed(6)}, 1.570796, abs(faceYaw));`:''}
        ${config.farCheekCurve&&!config.broadFold?`// An authored continuous oblique cheek edge replaces overlapping
        // local bulges. Blend only the far lateral skin, below the orbit;
        // preserve the eye patch, median nose, front and pure profile.
        float cheekDY = max(0.0,${config.farCheekCurve.topY.toFixed(6)}-position.y);
        float cheekEdge = ${config.farCheekCurve.top.toFixed(6)} - ${config.farCheekCurve.slope.toFixed(6)}*cheekDY - ${config.farCheekCurve.quadratic.toFixed(6)}*cheekDY*cheekDY - ${config.farCheekCurve.cubic.toFixed(6)}*cheekDY*cheekDY*cheekDY;
        float cheekStrip = smoothstep(.024,.042,faceFarSide*position.x)*(1.0-smoothstep(.068,.088,faceFarSide*position.x));
        float cheekCurveBand = smoothstep(1.405,1.425,position.y)*(1.0-smoothstep(1.446,1.457,position.y));
        float cheekTargetZ = (cheekEdge-faceFarSide*transformed.x*cos(abs(faceYaw)))/max(.25,sin(abs(faceYaw)));
        transformed.z = mix(transformed.z,cheekTargetZ,deepTurn*cheekStrip*cheekCurveBand*faceFrontWeight);`:''}
        ${underpaint?'vFacePaintPosition = position; vFacePaintYaw = faceYaw;':''}
      `);
      if(underpaint){
        // The far temporal drawing disappears around the face before a whole
        // lash fan can sit on the silhouette. This bounded art mask supplements
        // real surface depth; it does not paint an eye outside the head.
        const varying='varying vec3 vFacePaintPosition;\nvarying float vFacePaintYaw;\n';
        shader.vertexShader=varying+shader.vertexShader;
        shader.fragmentShader=varying+'uniform sampler2D faceUnderpaint;\n'+shader.fragmentShader;
        shader.uniforms.faceUnderpaint={value:underpaint};
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          float turn = abs(vFacePaintYaw);
          float farX = -sign(vFacePaintYaw) * vFacePaintPosition.x;
          float outerLimit = mix(0.052, 0.041, smoothstep(1.047198, 1.396263, turn));
          outerLimit += 0.008 * smoothstep(1.473, 1.505, vFacePaintPosition.y);
          float eyeBand = smoothstep(1.433, 1.442, vFacePaintPosition.y) * (1.0-smoothstep(1.502, 1.512, vFacePaintPosition.y));
          float hideOuter = smoothstep(0.436332, 0.785398, turn) * smoothstep(outerLimit, outerLimit+0.0015, farX) * eyeBand;
          diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(faceUnderpaint, vMapUv).rgb, hideOuter);
        `);
      }
    };
    material.customProgramCacheKey=()=>key+'|oblique-face-support-v17|'+!!underpaint+'|'+profileReference+'|'+JSON.stringify(config);
    material.needsUpdate=true;
  }
}
