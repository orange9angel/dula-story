// Unified sky backdrop, used by RuinsDuskScene.applyHybrid (continuousSky).
// Preserve the cylindrical projection at low elevations, then continuously
// soften the source image's upper edge into a zenith on the SAME surface.
import * as THREE from 'three';

export function continuousBackdrop(texture, {
  center = [0, 6, -8], cylinderRadius = 70, cylinderHeight = 36,
  radius = 140, repeat = 4, offset = 0, zenith = '#665a85',
} = {}) {
  // Average an actual image band in two dimensions. Stretching even a few raw
  // edge samples vertically turns image grain into long visible sky streaks.
  const source=document.createElement('canvas');source.width=64;source.height=32;
  const ctx=source.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(texture.image,0,0,texture.image.width,texture.image.height*.10,0,0,64,32);
  const pixels=ctx.getImageData(0,0,64,32).data;
  const means=Array.from({length:64},(_,x)=>[0,1,2].map(k=>{
    let sum=0;for(let y=0;y<32;y++)sum+=pixels[(y*64+x)*4+k];return sum/32;
  }));
  const band=document.createElement('canvas');band.width=64;band.height=1;
  const bc=band.getContext('2d'),data=bc.createImageData(64,1);
  for(let x=0;x<64;x++){
    for(let k=0;k<3;k++){
      let sum=0;for(let j=-4;j<=4;j++)sum+=means[Math.max(0,Math.min(63,x+j))][k];
      data.data[x*4+k]=Math.round(sum/9);
    }
    data.data[x*4+3]=255;
  }
  bc.putImageData(data,0,0);
  const upperTexture=new THREE.CanvasTexture(band);upperTexture.colorSpace=THREE.SRGBColorSpace;
  upperTexture.wrapS=THREE.MirroredRepeatWrapping;
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      sourceMap: {value: texture}, center: {value: new THREE.Vector3(...center)},
      upperMap: {value: upperTexture},
      cylinderRadius: {value: cylinderRadius}, cylinderHeight: {value: cylinderHeight},
      repeatX: {value: repeat}, offsetX: {value: offset},
      zenithColor: {value: new THREE.Color(zenith)},
    },
    vertexShader: `
      varying vec3 worldPoint;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        worldPoint = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `
      uniform sampler2D sourceMap, upperMap;
      uniform vec3 center, zenithColor;
      uniform float cylinderRadius, cylinderHeight, repeatX, offsetX;
      varying vec3 worldPoint;
      void main() {
        vec3 origin = cameraPosition - center;
        vec3 direction = normalize(worldPoint - cameraPosition);
        float a = max(dot(direction.xz, direction.xz), 0.000001);
        float b = dot(origin.xz, direction.xz);
        float c = dot(origin.xz, origin.xz) - cylinderRadius*cylinderRadius;
        float distanceToWall = (-b + sqrt(max(b*b-a*c, 0.0))) / a;
        vec3 hit = origin + direction*distanceToWall;
        float u = fract(atan(hit.x, hit.z)/6.28318530718)*repeatX + offsetX;
        float v = hit.y/cylinderHeight + 0.5;
        // fract() wraps u by exactly repeatX once per revolution. The screen-space
        // derivative spike at that azimuth forces the blurriest mip and paints a
        // vertical seam; unwrap the gradients and sample with explicit derivatives.
        vec2 dx = vec2(dFdx(u), dFdx(v));
        vec2 dy = vec2(dFdy(u), dFdy(v));
        dx.x -= repeatX*round(dx.x/repeatX);
        dy.x -= repeatX*round(dy.x/repeatX);
        vec3 imageColor = textureGrad(sourceMap, vec2(u, clamp(v, 0.0, 1.0)), dx, dy).rgb;
        vec3 band = textureGrad(upperMap, vec2(u, 0.5), vec2(dx.x, 0.0), vec2(dy.x, 0.0)).rgb;
        vec3 color = mix(imageColor, band, smoothstep(0.78, 1.06, v));
        color = mix(color, zenithColor, smoothstep(1.06, 3.4, v));
        // A vertical ray never meets a cylindrical wall; use its limiting colour.
        if (direction.y > 0.99999) color = zenithColor;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), material);
  mesh.name = 'continuous_backdrop_study';
  mesh.position.set(...center);
  mesh.renderOrder = -100;
  return mesh;
}
