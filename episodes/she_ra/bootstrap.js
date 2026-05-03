/**
 * She-Ra — Story Bootstrap
 * Registers official assets from dula-assets (includes She-Ra characters, scenes, animations)
 * Enhances scene lighting for better character visibility.
 */
import { registerAll } from 'dula-assets';
import { SceneRegistry, CharacterRegistry, TransitionBase, registerTransition } from 'dula-engine';
import * as THREE from 'three';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Transitions ──
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wipe transition — a vertical/horizontal bar sweeps across the screen.
 * Options: { direction: 'left'|'right'|'up'|'down', duration: number, color: hex }
 */
class Wipe extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.direction = options.direction || 'right';
    this.duration = options.duration ?? 0.6;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(this.color || 0x000000) },
        uDirection: { value: this._dirValue() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        uniform vec2 uDirection;
        varying vec2 vUv;
        void main() {
          float edge = dot(vUv - vec2(0.5), uDirection) + 0.5;
          float alpha = smoothstep(edge - 0.05, edge + 0.05, uProgress);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  _dirValue() {
    switch (this.direction) {
      case 'left':  return new THREE.Vector2(-1, 0);
      case 'right': return new THREE.Vector2(1, 0);
      case 'up':    return new THREE.Vector2(0, 1);
      case 'down':  return new THREE.Vector2(0, -1);
      default:      return new THREE.Vector2(1, 0);
    }
  }

  update(t, renderer, camera, context) {
    if (this.overlay && this.overlay.material.uniforms.uProgress) {
      // Wipe goes 0→1 (cover) then 1→2 (reveal), but for scene change we just use cover
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

/**
 * Iris transition — circular opening/closing like a camera iris.
 * Options: { duration: number, color: hex, invert: boolean }
 */
class Iris extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 0.8;
    this.invert = options.invert || false;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(this.color || 0x000000) },
        uAspect: { value: 1920 / 1080 },
        uInvert: { value: this.invert ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        uniform float uAspect;
        uniform float uInvert;
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - vec2(0.5);
          center.x *= uAspect;
          float dist = length(center);
          float radius = uInvert > 0.5 ? uProgress * 1.5 : (1.0 - uProgress) * 1.5;
          float edge = 0.02;
          float alpha = smoothstep(radius - edge, radius + edge, dist);
          if (uInvert > 0.5) alpha = 1.0 - alpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  update(t, renderer, camera, context) {
    if (this.overlay && this.overlay.material.uniforms.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

/**
 * Pixelate transition — screen dissolves into large blocks.
 * Options: { duration: number, maxBlockSize: number }
 */
class Pixelate extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 0.7;
    this.maxBlockSize = options.maxBlockSize || 64.0;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(this.color || 0x000000) },
        uMaxBlock: { value: this.maxBlockSize },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        uniform float uMaxBlock;
        varying vec2 vUv;
        void main() {
          float blockSize = mix(1.0, uMaxBlock, uProgress);
          vec2 grid = floor(vUv * blockSize) / blockSize;
          float noise = fract(sin(dot(grid, vec2(12.9898, 78.233))) * 43758.5453);
          float threshold = uProgress;
          float alpha = smoothstep(threshold - 0.1, threshold + 0.1, noise);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  update(t, renderer, camera, context) {
    if (this.overlay && this.overlay.material.uniforms.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

/**
 * Flash transition — bright flash then reveal (like lightning or magic).
 * Options: { duration: number, flashColor: hex }
 */
class Flash extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 0.5;
    this.flashColor = options.flashColor || 0xffffff;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uFlashColor: { value: new THREE.Color(this.flashColor) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uFlashColor;
        varying vec2 vUv;
        void main() {
          // Flash peaks at t=0.3, fades by t=1.0
          float flash = exp(-pow((uProgress - 0.3) * 6.0, 2.0));
          gl_FragColor = vec4(uFlashColor, flash);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  update(t, renderer, camera, context) {
    if (this.overlay && this.overlay.material.uniforms.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

/**
 * Slide transition — current scene slides out while new scene slides in.
 * Options: { direction: 'left'|'right'|'up'|'down', duration: number }
 */
class Slide extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.direction = options.direction || 'left';
    this.duration = options.duration ?? 0.6;
  }

  createOverlayMaterial() {
    // Slide uses a diagonal wipe with softer edge
    const dirMap = { left: -1, right: 1, up: 1, down: -1 };
    const isHorizontal = this.direction === 'left' || this.direction === 'right';
    this._isHorizontal = isHorizontal;
    this._dirSign = dirMap[this.direction] || 1;

    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(this.color || 0x000000) },
        uIsHorizontal: { value: isHorizontal ? 1.0 : 0.0 },
        uDirSign: { value: this._dirSign },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        uniform float uIsHorizontal;
        uniform float uDirSign;
        varying vec2 vUv;
        void main() {
          float coord = mix(vUv.y, vUv.x, uIsHorizontal);
          float edge = coord * 2.0 - 1.0;
          edge *= uDirSign;
          float p = uProgress * 3.0 - 1.5;
          float alpha = smoothstep(p - 0.3, p + 0.3, edge);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  update(t, renderer, camera, context) {
    if (this.overlay && this.overlay.material.uniforms.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

// Register all custom transitions
registerTransition('Wipe', Wipe);
registerTransition('Iris', Iris);
registerTransition('Pixelate', Pixelate);
registerTransition('Flash', Flash);
registerTransition('Slide', Slide);

// ── Scene Lighting Enhancement ──
// FrightZoneScene and WhisperingWoodsScene are intentionally dark for atmosphere,
// but characters need more light to be visible. We patch the build() method
// to add bright fill lights after the original scene setup.

function enhanceSceneLighting(SceneClass, fillIntensity, fillColor, ambientBoost) {
  const originalBuild = SceneClass.prototype.build;
  SceneClass.prototype.build = function () {
    const scene = originalBuild.call(this);
    // Strong fill light from front-top
    const fillLight = new THREE.DirectionalLight(fillColor, fillIntensity);
    fillLight.position.set(0, 10, 20);
    scene.add(fillLight);
    // Ambient boost for base visibility
    const ambient = new THREE.AmbientLight(0xffffff, ambientBoost);
    scene.add(ambient);
    return scene;
  };
}

// ── FrightZoneScene Storm Effects ──
// Add lightning flashes and rain particles to make the villain scene more menacing
function addStormEffects(SceneClass) {
  const originalBuild = SceneClass.prototype.build;
  SceneClass.prototype.build = function () {
    const scene = originalBuild.call(this);

    // Lightning flash light - positioned to illuminate characters from above-front
    this.lightningLight = new THREE.PointLight(0xccddff, 0, 200);
    this.lightningLight.position.set(5, 25, 15);
    scene.add(this.lightningLight);

    // Secondary rim light for dramatic silhouette
    this.rimLight = new THREE.PointLight(0x4466aa, 0, 150);
    this.rimLight.position.set(-10, 15, -5);
    scene.add(this.rimLight);

    // Rain particles - larger and more visible
    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 50;     // x
      rainPositions[i * 3 + 1] = Math.random() * 35 + 5;      // y
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;  // z
      rainVelocities[i] = 0.4 + Math.random() * 0.5;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0xaabbcc,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.rainSystem = new THREE.Points(rainGeo, rainMat);
    this.rainSystem.userData.velocities = rainVelocities;
    scene.add(this.rainSystem);

    // Dark storm clouds (low opacity spheres in background)
    const cloudGeo = new THREE.SphereGeometry(1, 8, 8);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e, transparent: true, opacity: 0.3, depthWrite: false
    });
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 60,
        20 + Math.random() * 10,
        -20 - Math.random() * 20
      );
      cloud.scale.set(
        5 + Math.random() * 8,
        2 + Math.random() * 3,
        4 + Math.random() * 6
      );
      scene.add(cloud);
      this.clouds.push(cloud);
    }

    // Store for update loop
    scene.userData.stormEffects = this;
    this.stormState = { flashEndTime: 0 };

    return scene;
  };

  // Add update method for lightning and rain animation
  const originalUpdate = SceneClass.prototype.update || function () {};
  SceneClass.prototype.update = function (time, delta) {
    originalUpdate.call(this, time, delta);
    const storm = this.lightningLight ? this : null;
    if (!storm) return;

    // Lightning flash - using time-based logic instead of setTimeout for reliability
    // Trigger new flash randomly (3% per frame ≈ once per second)
    if (Math.random() < 0.03 && time > storm.stormState.flashEndTime) {
      storm.stormState.flashEndTime = time + 0.08 + Math.random() * 0.12;
      storm.lightningLight.intensity = 15 + Math.random() * 20;
      storm.rimLight.intensity = 5 + Math.random() * 10;
    }

    // Decay flash intensity
    if (time < storm.stormState.flashEndTime) {
      const progress = (storm.stormState.flashEndTime - time) / 0.15;
      storm.lightningLight.intensity = Math.max(0, storm.lightningLight.intensity * 0.7);
      storm.rimLight.intensity = Math.max(0, storm.rimLight.intensity * 0.7);
    } else {
      storm.lightningLight.intensity = 0;
      storm.rimLight.intensity = 0;
    }

    // Rain animation
    if (storm.rainSystem) {
      const positions = storm.rainSystem.geometry.attributes.position.array;
      const velocities = storm.rainSystem.userData.velocities;
      for (let i = 0; i < velocities.length; i++) {
        positions[i * 3 + 1] -= velocities[i];
        // Reset to top when below ground
        if (positions[i * 3 + 1] < -2) {
          positions[i * 3 + 1] = 30 + Math.random() * 10;
          positions[i * 3] = (Math.random() - 0.5) * 50;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
      }
      storm.rainSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Animate clouds slowly
    if (storm.clouds) {
      for (const cloud of storm.clouds) {
        cloud.position.x += Math.sin(time * 0.1 + cloud.id) * 0.01;
      }
    }
  };
}

// Enhance dark scenes with character visibility fill lights
if (SceneRegistry.FrightZoneScene) {
  // Very strong fill for the extremely dark industrial scene
  enhanceSceneLighting(SceneRegistry.FrightZoneScene, 2.0, 0xffeedd, 0.5);
  addStormEffects(SceneRegistry.FrightZoneScene);
}
if (SceneRegistry.WhisperingWoodsScene) {
  enhanceSceneLighting(SceneRegistry.WhisperingWoodsScene, 1.2, 0xddffdd, 0.3);
}

// ── She-Ra Sword Hand Attachment ──
// The sword is positioned statically on the mesh. When DrawSword animation rotates
// the arm, the sword stays in place. We patch to attach sword to the rightArm group.
if (CharacterRegistry.SheRa) {
  const OriginalSheRa = CharacterRegistry.SheRa;
  const originalSheRaBuild = OriginalSheRa.prototype.build;
  OriginalSheRa.prototype.build = function () {
    originalSheRaBuild.call(this);
    // Reparent sword from mesh to rightArm so it follows hand movement
    if (this.swordGroup && this.rightArm) {
      // Remove from mesh
      this.mesh.remove(this.swordGroup);
      // Add to rightArm group (hand is at local y = -rightArmLength)
      this.swordGroup.position.set(0, -this.rightArmLength, 0);
      this.swordGroup.rotation.set(0, 0, 0);
      this.rightArm.add(this.swordGroup);
    }
    // Reparent shield to leftArm
    if (this.shieldGroup && this.leftArm) {
      this.mesh.remove(this.shieldGroup);
      this.shieldGroup.position.set(0, -this.leftArmLength, 0);
      this.shieldGroup.rotation.set(0, 0, 0);
      this.leftArm.add(this.shieldGroup);
    }
  };
}

// ── Hordak Detail Enhancement ──
// Hordak's model lacks facial details and has flat materials.
// We patch his build() to add a nose, better eye definition, and material roughness.
if (CharacterRegistry.Hordak) {
  const OriginalHordak = CharacterRegistry.Hordak;
  const originalBuild = OriginalHordak.prototype.build;
  OriginalHordak.prototype.build = function () {
    originalBuild.call(this);
    const toonGradient = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 4; canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 4, 0);
      g.addColorStop(0, '#aaa'); g.addColorStop(0.4, '#ccc'); g.addColorStop(0.7, '#eee'); g.addColorStop(1, '#fff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 1);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    })();

    // Add nose (sharp, angular - bat-like)
    const noseGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
    const noseMat = new THREE.MeshToonMaterial({ color: 0xd0d0d0, gradientMap: toonGradient });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.95, 0.28);
    nose.rotation.x = -Math.PI / 2;
    this.mesh.add(nose);

    // Add nostrils
    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const nostrilMat = new THREE.MeshToonMaterial({ color: 0x880000, gradientMap: toonGradient });
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(side * 0.02, 1.92, 0.3);
      this.mesh.add(nostril);
    }

    // Add cheekbones (sharp angles)
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
      const cheekMat = new THREE.MeshToonMaterial({ color: 0xc0c0c0, gradientMap: toonGradient });
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(side * 0.18, 1.92, 0.22);
      cheek.rotation.y = side * 0.3;
      this.mesh.add(cheek);
    }

    // Add armor plates on chest (layered detail)
    const plateMat = new THREE.MeshToonMaterial({ color: 0x555555, gradientMap: toonGradient });
    for (let row = 0; row < 3; row++) {
      for (const side of [-1, 1]) {
        const plateGeo = new THREE.BoxGeometry(0.1, 0.06, 0.02);
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(side * 0.15, 1.45 - row * 0.1, 0.3);
        this.mesh.add(plate);
      }
    }

    // Add belt with buckle
    const beltGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
    const beltMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 1.15;
    this.mesh.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.1, 0.06, 0.04);
    const buckleMat = new THREE.MeshToonMaterial({ color: 0xc62828, gradientMap: toonGradient });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 1.15, 0.3);
    this.mesh.add(buckle);

    // Add knee pads
    for (const side of [-1, 1]) {
      const kneeGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const kneeMat = new THREE.MeshToonMaterial({ color: 0x333333, gradientMap: toonGradient });
      const knee = new THREE.Mesh(kneeGeo, kneeMat);
      knee.position.set(side * 0.15, 0.5, 0.1);
      knee.scale.set(1, 0.8, 0.6);
      this.mesh.add(knee);
    }

    // Enhance eye glow - add inner bright core
    if (this.headGroup) {
      for (const side of [-1, 1]) {
        const coreGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(side * 0.1, 2.05, 0.3);
        this.mesh.add(core);
      }
    }

    // Subtle brightness tweak for dark scene visibility
    // Keep Hordak dark and menacing, just ensure he's visible
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        const c = child.material.color;
        // Only brighten extremely dark materials (near-black)
        if (c.r < 0.1 && c.g < 0.1 && c.b < 0.1) {
          child.material.color.setRGB(
            Math.min(1, c.r * 2 + 0.1),
            Math.min(1, c.g * 2 + 0.1),
            Math.min(1, c.b * 2 + 0.1)
          );
        }
      }
    });
  };
}
