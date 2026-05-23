import * as THREE from 'three';

/**
 * RetroTVPostProcess - 80年代TV动画复古画风后处理
 * Film grain + Scanlines + Chromatic aberration + Vignette + Color grading
 */

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D sceneTexture;
  uniform vec2 resolution;
  uniform float time;
  uniform float grainIntensity;
  uniform float scanlineIntensity;
  uniform float scanlineDensity;
  uniform float chromaticIntensity;
  uniform float vignetteIntensity;
  uniform float contrast;
  uniform float saturation;
  uniform float warmTint;
  uniform float crtCurve;
  uniform float posterizeLevels;
  uniform float outlineStrength;

  varying vec2 vUv;

  // Pseudo-random noise
  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // 2D noise for smoother grain
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // CRT barrel distortion
  vec2 crtDistort(vec2 uv, float strength) {
    vec2 centered = uv - 0.5;
    float dist = dot(centered, centered) * strength;
    return uv + centered * (1.0 + dist) * dist;
  }

  // Scanlines
  float scanlines(vec2 uv) {
    float instability = sin(time * 3.7 + uv.y * 50.0) * 0.02;
    float sl = sin((uv.y + instability) * resolution.y * scanlineDensity) * 0.5 + 0.5;
    return mix(1.0, 0.75 + sl * 0.25, scanlineIntensity);
  }

  // NTSC color bleed (very subtle horizontal blur on chroma)
  vec3 ntscBleed(vec2 uv) {
    float offset = 1.0 / resolution.x;
    vec3 c0 = texture2D(sceneTexture, uv + vec2(-offset * 2.0, 0.0)).rgb;
    vec3 c1 = texture2D(sceneTexture, uv + vec2(-offset, 0.0)).rgb;
    vec3 c2 = texture2D(sceneTexture, uv).rgb;
    vec3 c3 = texture2D(sceneTexture, uv + vec2(offset, 0.0)).rgb;
    vec3 c4 = texture2D(sceneTexture, uv + vec2(offset * 2.0, 0.0)).rgb;
    float luma = dot(c2, vec3(0.299, 0.587, 0.114));
    vec3 chroma = (c0 + c1 * 2.0 + c2 * 4.0 + c3 * 2.0 + c4) / 10.0;
    float chromaLuma = dot(chroma, vec3(0.299, 0.587, 0.114));
    return chroma + vec3(luma - chromaLuma);
  }

  // Edge detection for cel-shading outline
  float edgeDetect(vec2 uv) {
    vec2 texel = 1.0 / resolution;
    float center = dot(texture2D(sceneTexture, uv).rgb, vec3(0.299, 0.587, 0.114));
    float left = dot(texture2D(sceneTexture, uv + vec2(-texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float right = dot(texture2D(sceneTexture, uv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float up = dot(texture2D(sceneTexture, uv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
    float down = dot(texture2D(sceneTexture, uv + vec2(0.0, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
    float dx = abs(left - center) + abs(right - center);
    float dy = abs(up - center) + abs(down - center);
    return smoothstep(0.02, 0.12, dx + dy);
  }

  // Posterization (color banding for cel look)
  vec3 posterize(vec3 color, float levels) {
    return floor(color * levels + 0.5) / levels;
  }

  void main() {
    vec2 uv = vUv;

    // CRT barrel distortion (subtle)
    uv = crtDistort(uv, crtCurve);

    // Discard if outside valid UV range after distortion
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Chromatic aberration (RGB channel separation)
    float aberration = length(uv - 0.5) * chromaticIntensity;
    vec2 rOffset = vec2(aberration * 0.8, 0.0);
    vec2 bOffset = vec2(-aberration * 0.8, 0.0);

    float r = texture2D(sceneTexture, uv + rOffset).r;
    float g = texture2D(sceneTexture, uv).g;
    float b = texture2D(sceneTexture, uv + bOffset).b;
    vec3 color = vec3(r, g, b);

    // NTSC color bleed
    color = mix(color, ntscBleed(uv), 0.15);

    // Edge detection for outline
    float edge = edgeDetect(uv);

    // Posterization for cel-shading look
    color = posterize(color, posterizeLevels);

    // Film grain (animated)
    float grain = noise(uv * resolution * 0.5 + time * 60.0) * grainIntensity;
    color += grain - grainIntensity * 0.5;

    // Scanlines
    color *= scanlines(uv);

    // Vignette (rounded corners like old TV)
    vec2 vigUv = uv * 2.0 - 1.0;
    float vig = 1.0 - dot(vigUv, vigUv) * vignetteIntensity;
    vig = smoothstep(0.0, 1.0, vig);
    color *= vig;

    // Color grading
    // Contrast
    color = (color - 0.5) * contrast + 0.5;

    // Saturation (subtle for 80s cel film)
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, saturation);

    // Apply outline (darken edges)
    color = mix(color, vec3(0.02, 0.02, 0.04), edge * outlineStrength);

    // Warm tint (80s cel film look)
    color.r *= 1.0 + warmTint * 0.06;
    color.g *= 1.0 + warmTint * 0.02;
    color.b *= 1.0 - warmTint * 0.05;

    // Slight green push in shadows (analog film characteristic)
    vec3 shadowTint = vec3(0.015, 0.03, 0.008);
    color += shadowTint * (1.0 - luma) * warmTint;

    // Subtle flicker (power instability)
    float flicker = 1.0 + sin(time * 47.0) * 0.005 + sin(time * 23.0) * 0.003;
    color *= flicker;

    // Clamp
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class RetroTVPostProcess {
  constructor(renderer, width = 1920, height = 1080) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.time = 0;

    // Render target for scene capture
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Full-screen quad
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        sceneTexture: { value: this.renderTarget.texture },
        resolution: { value: new THREE.Vector2(width, height) },
        time: { value: 0 },
        grainIntensity: { value: 0.1 },
        scanlineIntensity: { value: 0.35 },
        scanlineDensity: { value: 2.5 },
        chromaticIntensity: { value: 0.003 },
        vignetteIntensity: { value: 0.35 },
        contrast: { value: 1.15 },
        saturation: { value: 1.2 },
        warmTint: { value: 0.6 },
        crtCurve: { value: 0.02 },
        posterizeLevels: { value: 6.0 },
        outlineStrength: { value: 0.35 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(this.quadGeometry, this.quadMaterial);
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quadMesh);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /**
   * Render scene with retro TV post-processing.
   * Matches the outlineEffect interface expected by Storyboard.render()
   */
  render(scene, camera) {
    // Step 1: Render scene to offscreen target
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.autoClear = autoClear;

    // Step 2: Apply post-processing shader to screen
    this.renderer.autoClear = false;
    this.renderer.render(this.quadScene, this.quadCamera);
    this.renderer.autoClear = autoClear;
  }

  update(deltaTime) {
    this.time += deltaTime;
    this.quadMaterial.uniforms.time.value = this.time;
  }

  // Parameter setters for fine-tuning
  setGrainIntensity(v) { this.quadMaterial.uniforms.grainIntensity.value = v; }
  setScanlineIntensity(v) { this.quadMaterial.uniforms.scanlineIntensity.value = v; }
  setScanlineDensity(v) { this.quadMaterial.uniforms.scanlineDensity.value = v; }
  setChromaticIntensity(v) { this.quadMaterial.uniforms.chromaticIntensity.value = v; }
  setVignetteIntensity(v) { this.quadMaterial.uniforms.vignetteIntensity.value = v; }
  setContrast(v) { this.quadMaterial.uniforms.contrast.value = v; }
  setSaturation(v) { this.quadMaterial.uniforms.saturation.value = v; }
  setWarmTint(v) { this.quadMaterial.uniforms.warmTint.value = v; }
  setCrtCurve(v) { this.quadMaterial.uniforms.crtCurve.value = v; }
  setPosterizeLevels(v) { this.quadMaterial.uniforms.posterizeLevels.value = v; }
  setOutlineStrength(v) { this.quadMaterial.uniforms.outlineStrength.value = v; }

  dispose() {
    this.renderTarget.dispose();
    this.quadGeometry.dispose();
    this.quadMaterial.dispose();
  }
}
