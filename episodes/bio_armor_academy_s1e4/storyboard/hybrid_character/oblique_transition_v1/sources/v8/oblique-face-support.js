/** Opt-in view-dependent sculpt authored in Aoi's 1.65 m neutral frame.
 * Shared by face/outline/hair; not a universal head or a CPU mesh deformation.
 * Most oblique terms vanish at front/profile; optional nose retention softens
 * the fitted profile transition. UVs are not shifted. */
function cheekCurveGLSL(points,name='continuousCheekEdge'){
  if(!points)return '';
  const n=v=>v.toFixed(7);
  return `float ${name}(float y){\n`+points.slice(0,-1).map((a,i)=>{
    const b=points[i+1],h=b[0]-a[0];
    return `if(y<${n(b[0])}){float t=clamp((y-${n(a[0])})/${n(h)},0.0,1.0);return (2.0*t*t*t-3.0*t*t+1.0)*${n(a[1])}+(t*t*t-2.0*t*t+t)*${n(h*a[2])}+(-2.0*t*t*t+3.0*t*t)*${n(b[1])}+(t*t*t-t*t)*${n(h*b[2])};}`;
  }).join('\n')+`return ${n(points.at(-1)[1])};}\n`;
}
export function applyObliqueFaceSupport(mesh, config, underpaint=null){
  if(!config||!mesh.isMesh)return;
  const profileReference=!!mesh.geometry.getAttribute('profileReferenceDelta');
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const material of materials){
    if(material.userData.obliqueFaceSupport)return;
    material.userData.obliqueFaceSupport=true;
    if(underpaint&&config.farEyeWhite)material.userData.obliqueEyeGaze={value:[0,0]};
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
      if(config.farCheekCurve?.points&&!config.broadFold)shader.vertexShader=cheekCurveGLSL(config.farCheekCurve.points)+shader.vertexShader;
      if(config.orbitCheekEdge&&!config.broadFold)shader.vertexShader=cheekCurveGLSL(config.orbitCheekEdge,'continuousOrbitEdge')+shader.vertexShader;
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
        ${config.broadFold&&config.hairTempleRoundness?`// The painted fringe has its own depth curve. Restoring the bare
        // skull alone does not repair its inward bend below the leaf clip.
        float hairTemple=smoothstep(.040,.080,faceFarSide*position.x)*(1.0-smoothstep(.115,.150,faceFarSide*position.x));
        float hairTempleHeight=exp(-pow((position.y-1.535)/.028,2.0));
        transformed.z+=${config.hairTempleRoundness.toFixed(6)}*hairTemple*hairTempleHeight*faceTurnWeight*faceFrontWeight;`:''}
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
        float deepTurn = smoothstep(${config.farCheekCurve?.points?'0.523599,0.785398':'0.610865,1.047198'},abs(faceYaw)) * (1.0-smoothstep(1.221730,1.570796,abs(faceYaw)));
        // Keep a broad, low cheek through the late oblique turn. The same
        // offset belongs to the cheek target and its limiting envelope; adding
        // it to one alone either clips it away or creates an under-eye lump.
        float lateCheekEdge=${(config.lateCheekSupport??0).toFixed(6)}*smoothstep(1.047198,1.221730,abs(faceYaw))*smoothstep(1.376,1.405,position.y)*(1.0-smoothstep(1.430,1.460,position.y));
        ${profileReference?`transformed += profileReferenceDelta * smoothstep(${((config.profileStart??65)*Math.PI/180).toFixed(6)}, 1.570796, abs(faceYaw));`:''}
        ${config.noseGraphicRecess&&!config.broadFold?`// At oblique views the small nose drawing stays inside the cheek
        // boundary. Retain a bounded amount at profile when the independently
        // fitted endpoint otherwise makes the nose grow during the last turn.
        float noseTurn = smoothstep(.610865,1.047198,abs(faceYaw))*(1.0-${(1-(config.noseProfileRetain??0)).toFixed(6)}*smoothstep(1.221730,1.570796,abs(faceYaw)));
        float noseRegion = exp(-pow(position.x/.024,2.0)-pow((position.y-1.445)/.023,2.0))*faceFrontWeight;
        transformed.z -= ${config.noseGraphicRecess.toFixed(6)}*noseTurn*noseRegion;`:''}
        ${config.farCheekCurve&&!config.broadFold?`// An authored continuous oblique cheek edge replaces overlapping
        // local bulges. Blend only the far lateral skin, below the orbit;
        // preserve the eye patch, median nose, front and pure profile.
        float cheekDY = max(0.0,${config.farCheekCurve.topY.toFixed(6)}-position.y);
        float cheekEdge = ${config.farCheekCurve.points?'continuousCheekEdge(position.y)':`${config.farCheekCurve.top.toFixed(6)} - ${config.farCheekCurve.slope.toFixed(6)}*cheekDY - ${config.farCheekCurve.quadratic.toFixed(6)}*cheekDY*cheekDY - ${config.farCheekCurve.cubic.toFixed(6)}*cheekDY*cheekDY*cheekDY`};
        cheekEdge+=lateCheekEdge;
        float cheekLowerBlend = 1.0-smoothstep(1.395,1.430,position.y);
        float cheekStrip = smoothstep(mix(.024,-.002,cheekLowerBlend),mix(.042,.006,cheekLowerBlend),faceFarSide*position.x)*(1.0-smoothstep(.068,.088,faceFarSide*position.x));
        float cheekCurveBand = smoothstep(${config.farCheekCurve.points?'1.376,1.388':'1.405,1.425'},position.y)*(1.0-smoothstep(1.446,1.457,position.y));
        float cheekTargetZ = (cheekEdge-faceFarSide*transformed.x*cos(abs(faceYaw)))/max(.25,sin(abs(faceYaw)));
        transformed.z = mix(transformed.z,cheekTargetZ,deepTurn*cheekStrip*cheekCurveBand*faceFrontWeight);`:''}
        ${config.shallowCheekCurve&&!config.broadFold?`// Continue the under-eye edge through the shallow three-quarter
        // view, where the deep-turn correction has not yet become active.
        float shallowTurn = smoothstep(.261799,.523599,abs(faceYaw))*(1.0-smoothstep(.610865,.785398,abs(faceYaw)));
        float shallowDY = 1.460-position.y;
        float shallowEdge = ${config.shallowCheekCurve.top.toFixed(6)}-${config.shallowCheekCurve.slope.toFixed(6)}*shallowDY-${config.shallowCheekCurve.quadratic.toFixed(6)}*shallowDY*shallowDY-${config.shallowCheekCurve.cubic.toFixed(6)}*shallowDY*shallowDY*shallowDY;
        float shallowStrip = smoothstep(.035,.055,faceFarSide*position.x)*(1.0-smoothstep(.085,.102,faceFarSide*position.x));
        float shallowBand = smoothstep(1.405,1.425,position.y)*(1.0-smoothstep(1.460,1.478,position.y));
        float irisGuard = (1.0-smoothstep(.055,.062,faceFarSide*position.x))*smoothstep(1.443,1.450,position.y);
        float shallowTargetZ = (shallowEdge-faceFarSide*transformed.x*cos(abs(faceYaw)))/max(.25,sin(abs(faceYaw)));
        transformed.z = mix(transformed.z,shallowTargetZ,shallowTurn*shallowStrip*shallowBand*faceFrontWeight*(1.0-irisGuard));`:''}
        ${config.orbitCheekEdge&&!config.broadFold?`// One continuous visible edge joins the temporal eye rim to the
        // low cheek. Bound the combined sculpt, not each additive term: an
        // orbital fold followed by cheek support otherwise makes two bumps.
        float edgeTurn=smoothstep(.349066,.698132,abs(faceYaw))*(1.0-smoothstep(1.221730,1.570796,abs(faceYaw)));
        float edgeBand=smoothstep(1.405,1.415,position.y)*(1.0-smoothstep(1.500,1.515,position.y));
        float edgeSide=smoothstep(.010,.035,faceFarSide*position.x);
        float projectedEdge=faceFarSide*transformed.x*cos(abs(faceYaw))+transformed.z*sin(abs(faceYaw));
        float edgeExcess=max(0.0,projectedEdge-continuousOrbitEdge(position.y)-lateCheekEdge);
        transformed.z-=edgeExcess/max(.25,sin(abs(faceYaw)))*edgeTurn*edgeBand*edgeSide*faceFrontWeight;`:''}
        ${config.profileEyeShape&&!config.broadFold?`// The visible near eye needs a narrow, nearly upright profile
        // iris and a wider temporal white wedge. Keep the oblique silhouette
        // and the far-eye correction independent of this deeper-turn chart.
        float nearX=-faceFarSide*position.x;
        float nearEyeBand=smoothstep(1.442,1.455,position.y)*(1.0-smoothstep(1.491,1.510,position.y));
        float nearEyeSide=smoothstep(.012,.026,nearX)*(1.0-smoothstep(.075,.092,nearX));
        float nearProfile=smoothstep(.872665,1.483530,abs(faceYaw));
        float nearEyeShift=${config.profileEyeShape.shear.toFixed(6)}*(position.y-1.47375)+${config.profileEyeShape.irisSlope.toFixed(6)}*(nearX-.0365)-${config.profileEyeShape.temporalDepth.toFixed(6)}*max(0.0,nearX-.0495);
        transformed.z+=nearEyeShift*nearEyeBand*nearEyeSide*nearProfile*faceFrontWeight;`:''}
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
        if(config.farEyeWhite){
          shader.fragmentShader='uniform vec2 obliqueEyeGaze;\n'+shader.fragmentShader;
          shader.uniforms.obliqueEyeGaze=material.userData.obliqueEyeGaze;
        }
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          float turn = abs(vFacePaintYaw);
          float farX = -sign(vFacePaintYaw) * vFacePaintPosition.x;
          float outerLimit = mix(${config.earlyEyeClip?'0.0505':'0.052'}, 0.041, smoothstep(1.047198, 1.396263, turn));
          ${config.farEyeWhite?`// The far lower opening hugs the iris; a constant temporal x
          // cutoff leaves a triangular white shelf below its rounded rim.
          float irisX=${config.farEyeWhite.centerX.toFixed(6)}-sign(vFacePaintYaw)*obliqueEyeGaze.x*.006061;
          float irisY=${config.farEyeWhite.centerY.toFixed(6)}+obliqueEyeGaze.y*.003636;
          float lowerIris=clamp((irisY-vFacePaintPosition.y)/${config.farEyeWhite.radiusY.toFixed(6)},0.0,1.0);
          float irisEdge=irisX+${config.farEyeWhite.radiusX.toFixed(6)}*sqrt(max(0.0,1.0-lowerIris*lowerIris))+${config.farEyeWhite.margin.toFixed(6)};
          outerLimit=min(outerLimit,irisEdge);`:''}
          ${config.earlyEyeClip?`// Move the occluding boundary across the drawing. Fading the
          // complete corner leaves a translucent white triangle and lash fan.
          outerLimit=mix(.090,outerLimit,smoothstep(.087266,.436332,turn));`:''}
          outerLimit += 0.008 * smoothstep(1.473, 1.505, vFacePaintPosition.y);
          float eyeBand = smoothstep(1.433, 1.442, vFacePaintPosition.y) * (1.0-smoothstep(1.502, 1.512, vFacePaintPosition.y));
          float hideOuter = ${config.earlyEyeClip?'1.0':'smoothstep(0.436332, 0.785398, turn)'} * smoothstep(outerLimit, outerLimit+0.0015, farX) * eyeBand;
          diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(faceUnderpaint, vMapUv).rgb, hideOuter);
        `);
      }
    };
    material.customProgramCacheKey=()=>key+'|oblique-face-support-v20|'+!!underpaint+'|'+profileReference+'|'+JSON.stringify(config);
    material.needsUpdate=true;
  }
}
