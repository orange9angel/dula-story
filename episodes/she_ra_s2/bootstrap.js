/**
 * She-Ra Season 2 — Story Bootstrap
 * Registers official assets from dula-assets (includes She-Ra characters, scenes, animations)
 * Enhances scene lighting for better character visibility.
 * Reuses and extends Season 1 enhancements.
 */
import { registerAll } from 'dula-assets';
import { SceneRegistry, CharacterRegistry, TransitionBase, registerTransition } from 'dula-engine';
import * as THREE from 'three';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Transitions (reused from S1) ──
// ═══════════════════════════════════════════════════════════════════════════════

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
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

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

registerTransition('Wipe', Wipe);
registerTransition('Iris', Iris);
registerTransition('Flash', Flash);

// ── Scene Lighting Enhancement ──

function enhanceSceneLighting(SceneClass, fillIntensity, fillColor, ambientBoost) {
  const originalBuild = SceneClass.prototype.build;
  SceneClass.prototype.build = function () {
    const scene = originalBuild.call(this);
    const fillLight = new THREE.DirectionalLight(fillColor, fillIntensity);
    fillLight.position.set(0, 10, 20);
    scene.add(fillLight);
    const ambient = new THREE.AmbientLight(0xffffff, ambientBoost);
    scene.add(ambient);
    return scene;
  };
}

// ── FrightZoneScene Storm Effects ──
function addStormEffects(SceneClass) {
  const originalBuild = SceneClass.prototype.build;
  SceneClass.prototype.build = function () {
    const scene = originalBuild.call(this);

    this.lightningLight = new THREE.PointLight(0xccddff, 0, 200);
    this.lightningLight.position.set(5, 25, 15);
    scene.add(this.lightningLight);

    this.rimLight = new THREE.PointLight(0x4466aa, 0, 150);
    this.rimLight.position.set(-10, 15, -5);
    scene.add(this.rimLight);

    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 50;
      rainPositions[i * 3 + 1] = Math.random() * 35 + 5;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
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

    scene.userData.stormEffects = this;
    this.stormState = { flashEndTime: 0 };

    return scene;
  };

  const originalUpdate = SceneClass.prototype.update || function () {};
  SceneClass.prototype.update = function (time, delta) {
    originalUpdate.call(this, time, delta);
    const storm = this.lightningLight ? this : null;
    if (!storm) return;

    if (Math.random() < 0.03 && time > storm.stormState.flashEndTime) {
      storm.stormState.flashEndTime = time + 0.08 + Math.random() * 0.12;
      storm.lightningLight.intensity = 15 + Math.random() * 20;
      storm.rimLight.intensity = 5 + Math.random() * 10;
    }

    if (time < storm.stormState.flashEndTime) {
      storm.lightningLight.intensity = Math.max(0, storm.lightningLight.intensity * 0.7);
      storm.rimLight.intensity = Math.max(0, storm.rimLight.intensity * 0.7);
    } else {
      storm.lightningLight.intensity = 0;
      storm.rimLight.intensity = 0;
    }

    if (storm.rainSystem) {
      const positions = storm.rainSystem.geometry.attributes.position.array;
      const velocities = storm.rainSystem.userData.velocities;
      for (let i = 0; i < velocities.length; i++) {
        positions[i * 3 + 1] -= velocities[i];
        if (positions[i * 3 + 1] < -2) {
          positions[i * 3 + 1] = 30 + Math.random() * 10;
          positions[i * 3] = (Math.random() - 0.5) * 50;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
      }
      storm.rainSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (storm.clouds) {
      for (const cloud of storm.clouds) {
        cloud.position.x += Math.sin(time * 0.1 + cloud.id) * 0.01;
      }
    }
  };
}

if (SceneRegistry.FrightZoneScene) {
  enhanceSceneLighting(SceneRegistry.FrightZoneScene, 2.0, 0xffeedd, 0.5);
  addStormEffects(SceneRegistry.FrightZoneScene);
}
if (SceneRegistry.WhisperingWoodsScene) {
  enhanceSceneLighting(SceneRegistry.WhisperingWoodsScene, 1.2, 0xddffdd, 0.3);
}

// ── BrightMoonScene Enhancement ──
function enhanceBrightMoonScene(SceneClass) {
  const originalBuild = SceneClass.prototype.build;
  SceneClass.prototype.build = function () {
    const scene = originalBuild.call(this);

    const carpetGeo = new THREE.PlaneGeometry(4, 12);
    const carpetTex = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, 244, 500);
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 216, 472);
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(128, 100); ctx.lineTo(180, 256); ctx.lineTo(128, 412); ctx.lineTo(76, 256);
      ctx.closePath();
      ctx.fill();
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    })();
    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.9,
      metalness: 0.0,
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.02, -2);
    carpet.receiveShadow = true;
    scene.add(carpet);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.7 });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 8), goldMat);
    chain.position.set(0, 10, -5);
    scene.add(chain);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.04, 8, 32), goldMat);
    ring.position.set(0, 8, -5);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 24), goldMat);
    innerRing.position.set(0, 8.2, -5);
    innerRing.rotation.x = Math.PI / 2;
    scene.add(innerRing);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 1.2;
      const z = Math.sin(angle) * 1.2 - 5;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), goldMat);
      arm.position.set(x, 8.2, z);
      scene.add(arm);
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFF8DC, roughness: 0.8 })
      );
      candle.position.set(x, 8.5, z);
      scene.add(candle);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00 });
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), flameMat);
      flame.position.set(x, 8.7, z);
      scene.add(flame);
    }
    const centerCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({
        color: 0x88CCFF,
        transparent: true,
        opacity: 0.8,
        emissive: 0x4488FF,
        emissiveIntensity: 0.5,
      })
    );
    centerCrystal.position.set(0, 8.5, -5);
    scene.add(centerCrystal);
    if (!this.chandelierCrystals) this.chandelierCrystals = [];
    this.chandelierCrystals.push(centerCrystal);

    for (const side of [-1, 1]) {
      const sx = side * 3.5;
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2), goldMat);
      bracket.position.set(sx, 5, -11.2);
      scene.add(bracket);
      const torch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
      );
      torch.position.set(sx, 5.2, -11.2);
      scene.add(torch);
      const sconceFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xFF6600 })
      );
      sconceFlame.position.set(sx, 5.5, -11.2);
      scene.add(sconceFlame);
      const sconceLight = new THREE.PointLight(0xFFAA44, 0.8, 8);
      sconceLight.position.set(sx, 5.5, -10.5);
      scene.add(sconceLight);
    }

    const particleColors = [0x88CCFF, 0xFFD700, 0xFF69B4, 0xAAFFAA];
    if (!this.magicParticles) this.magicParticles = [];
    for (let i = 0; i < 50; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const size = 0.02 + Math.random() * 0.04;
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(size, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 + Math.random() * 0.4 })
      );
      const px = (Math.random() - 0.5) * 16;
      const py = 0.5 + Math.random() * 6;
      const pz = (Math.random() - 0.5) * 16 - 5;
      particle.position.set(px, py, pz);
      scene.add(particle);
      this.magicParticles.push({
        mesh: particle,
        basePos: { x: px, y: py, z: pz },
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 1.5,
        drift: { x: (Math.random() - 0.5) * 0.3, z: (Math.random() - 0.5) * 0.3 },
      });
    }

    for (const side of [-1, 1]) {
      for (let z = -8; z <= 2; z += 3) {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.2, 0.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
        );
        pot.position.set(side * 2.5, 0.2, z);
        scene.add(pot);
        const plant = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 })
        );
        plant.position.set(side * 2.5, 0.7, z);
        scene.add(plant);
      }
    }

    return scene;
  };

  const originalUpdate = SceneClass.prototype.update || function () {};
  SceneClass.prototype.update = function (time, delta) {
    originalUpdate.call(this, time, delta);
    if (this.chandelierCrystals) {
      for (const crystal of this.chandelierCrystals) {
        crystal.rotation.y = time * 0.5;
        crystal.material.emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.2;
      }
    }
    if (this.magicParticles) {
      for (const p of this.magicParticles) {
        p.mesh.position.y = p.basePos.y + Math.sin(time * p.speed + p.phase) * 0.5;
        p.mesh.position.x = p.basePos.x + Math.cos(time * p.speed * 0.5 + p.phase) * p.drift.x;
        p.mesh.position.z = p.basePos.z + Math.sin(time * p.speed * 0.3 + p.phase) * p.drift.z;
        p.mesh.material.opacity = 0.3 + Math.sin(time * 4 + p.phase) * 0.3;
      }
    }
  };
}

if (SceneRegistry.BrightMoonScene) {
  enhanceBrightMoonScene(SceneRegistry.BrightMoonScene);
}

// ── She-Ra & Adora Sword Hand Attachment ──
function attachSwordToHand(CharacterClass) {
  if (!CharacterClass) return;
  const originalBuild = CharacterClass.prototype.build;
  CharacterClass.prototype.build = function () {
    originalBuild.call(this);
    if (this.swordGroup && this.rightArm) {
      this.mesh.remove(this.swordGroup);
      this.swordGroup.position.set(0.02, -this.rightArmLength + 0.08, 0.04);
      this.swordGroup.rotation.set(Math.PI, 0, 0);
      this.rightArm.add(this.swordGroup);
    }
    if (this.shieldGroup && this.leftArm) {
      this.mesh.remove(this.shieldGroup);
      this.shieldGroup.position.set(-0.02, -this.leftArmLength + 0.03, 0.04);
      this.shieldGroup.rotation.set(Math.PI, 0, 0);
      this.leftArm.add(this.shieldGroup);
    }
  };
}

attachSwordToHand(CharacterRegistry.SheRa);
attachSwordToHand(CharacterRegistry.Adora);

// ── Transform & DrawSword Animation Patch ──
function patchSwordHoldAnimation(AnimationClass) {
  if (!AnimationClass) return;
  const originalUpdate = AnimationClass.prototype.update;
  AnimationClass.prototype.update = function (t, character) {
    originalUpdate.call(this, t, character);
    if (t >= 0.99 && character.rightArm) {
      const rBaseZ = character.rightArmBaseZ || character.rightArm.rotation.z;
      character.rightArm.rotation.x = -2.3;
      character.rightArm.rotation.z = rBaseZ - 1.5;
      if (character.headGroup) character.headGroup.rotation.x = -0.5;
    }
  };
}

import { AnimationRegistry } from 'dula-engine';
patchSwordHoldAnimation(AnimationRegistry.Transform);
patchSwordHoldAnimation(AnimationRegistry.DrawSword);

// ── Hordak Detail Enhancement ──
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

    const noseGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
    const noseMat = new THREE.MeshToonMaterial({ color: 0xd0d0d0, gradientMap: toonGradient });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.95, 0.28);
    nose.rotation.x = -Math.PI / 2;
    this.mesh.add(nose);

    for (const side of [-1, 1]) {
      const nostrilGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const nostrilMat = new THREE.MeshToonMaterial({ color: 0x880000, gradientMap: toonGradient });
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(side * 0.02, 1.92, 0.3);
      this.mesh.add(nostril);
    }

    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
      const cheekMat = new THREE.MeshToonMaterial({ color: 0xc0c0c0, gradientMap: toonGradient });
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(side * 0.18, 1.92, 0.22);
      cheek.rotation.y = side * 0.3;
      this.mesh.add(cheek);
    }

    const plateMat = new THREE.MeshToonMaterial({ color: 0x555555, gradientMap: toonGradient });
    for (let row = 0; row < 3; row++) {
      for (const side of [-1, 1]) {
        const plateGeo = new THREE.BoxGeometry(0.1, 0.06, 0.02);
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(side * 0.15, 1.45 - row * 0.1, 0.3);
        this.mesh.add(plate);
      }
    }

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

    for (const side of [-1, 1]) {
      const kneeGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const kneeMat = new THREE.MeshToonMaterial({ color: 0x333333, gradientMap: toonGradient });
      const knee = new THREE.Mesh(kneeGeo, kneeMat);
      knee.position.set(side * 0.15, 0.5, 0.1);
      knee.scale.set(1, 0.8, 0.6);
      this.mesh.add(knee);
    }

    if (this.headGroup) {
      for (const side of [-1, 1]) {
        const coreGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(side * 0.1, 2.05, 0.3);
        this.mesh.add(core);
      }
    }

    this.mesh.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        const c = child.material.color;
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
