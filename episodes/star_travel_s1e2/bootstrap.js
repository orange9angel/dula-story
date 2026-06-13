/**
 * Star Travelers S1E2 — The Crystal Cave
 * Bootstrap: registers all assets, custom scene, and custom effects
 */
import { registerAll } from 'dula-assets';
import { registerCameraMove, registerTransition, TransitionBase, registerScene, SceneBase } from 'dula-engine';
import { CameraSmoothMove } from '/node_modules/dula-engine/camera/CameraSmoothMove.js';
import * as THREE from 'three';

// Register all official assets
registerAll();

// Register smooth camera move
registerCameraMove('Smooth', CameraSmoothMove);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Scene: CrystalCaveScene ──
// ═══════════════════════════════════════════════════════════════════════════════

class CrystalCaveScene extends SceneBase {
  constructor() {
    super('CrystalCaveScene');
    this.crystals = [];
    this.particles = [];
  }

  build() {
    super.build();

    // Dark cave atmosphere — deep blue-black
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x1a1a3a, 10, 60);

    // Override default lights — dim ambient, crystal glow
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.2;
        l.color.setHex(0x1a1a3a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.3;
        l.color.setHex(0x4466aa);
        l.position.set(10, 20, 10);
      }
    });

    // Crystal glow lights scattered around
    const glowColors = [0x44aaff, 0xff44aa, 0x44ffaa, 0xaa44ff];
    for (let i = 0; i < 6; i++) {
      const color = glowColors[i % glowColors.length];
      const light = new THREE.PointLight(color, 0.8, 20);
      const angle = (i / 6) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 8, 3 + Math.random() * 4, Math.sin(angle) * 8);
      this.scene.add(light);
    }

    // ---- Ground — dark rocky cave floor ----
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512; groundCanvas.height = 512;
    const gCtx = groundCanvas.getContext('2d');
    gCtx.fillStyle = '#1a1a2a';
    gCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 2;
      const shade = Math.random();
      gCtx.fillStyle = shade > 0.5 ? '#2a2a3a' : '#0a0a1a';
      gCtx.beginPath();
      gCtx.arc(x, y, r, 0, Math.PI * 2);
      gCtx.fill();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(10, 10);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      color: 0x1a1a2a,
      roughness: 0.95,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // ---- Giant crystal formations ----
    const crystalColors = [0x44aaff, 0xff66cc, 0x66ffcc, 0xcc66ff, 0x66ccff];
    for (let i = 0; i < 20; i++) {
      const crystalGroup = new THREE.Group();
      const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const crystalMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.7,
        emissive: color,
        emissiveIntensity: 0.3,
      });

      // Main crystal shard
      const h = 2 + Math.random() * 6;
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.3 + Math.random() * 0.8, h, 6),
        crystalMat
      );
      crystal.position.y = h / 2;
      crystal.rotation.y = Math.random() * Math.PI * 2;
      crystal.rotation.z = (Math.random() - 0.5) * 0.4;
      crystalGroup.add(crystal);

      // Smaller secondary crystals
      for (let j = 0; j < 2; j++) {
        const small = new THREE.Mesh(
          new THREE.ConeGeometry(0.1 + Math.random() * 0.3, 0.5 + Math.random() * 1.5, 5),
          crystalMat.clone()
        );
        small.position.set(
          (Math.random() - 0.5) * 1.5,
          0.3 + Math.random() * 0.5,
          (Math.random() - 0.5) * 1.5
        );
        small.rotation.y = Math.random() * Math.PI * 2;
        crystalGroup.add(small);
      }

      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 30;
      crystalGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      this.scene.add(crystalGroup);
      this.crystals.push({ group: crystalGroup, materials: [crystalMat], phase: Math.random() * Math.PI * 2 });
    }

    // ---- Ceiling stalactites ----
    for (let i = 0; i < 15; i++) {
      const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
      const stalMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.2,
        transparent: true,
        opacity: 0.6,
        emissive: color,
        emissiveIntensity: 0.2,
      });
      const h = 1 + Math.random() * 3;
      const stal = new THREE.Mesh(
        new THREE.ConeGeometry(0.2 + Math.random() * 0.4, h, 5),
        stalMat
      );
      stal.position.y = 8 + Math.random() * 4;
      stal.rotation.z = Math.PI;
      stal.rotation.y = Math.random() * Math.PI * 2;
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 25;
      stal.position.x = Math.cos(angle) * radius;
      stal.position.z = Math.sin(angle) * radius;
      this.scene.add(stal);
    }

    // ---- Floating energy particles ----
    const particleColors = [0x44aaff, 0xff66cc, 0x66ffcc];
    for (let i = 0; i < 80; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
      );
      particle.position.set(
        (Math.random() - 0.5) * 40,
        0.5 + Math.random() * 8,
        (Math.random() - 0.5) * 40
      );
      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        speedY: 0.05 + Math.random() * 0.15,
        driftX: (Math.random() - 0.5) * 0.1,
        driftZ: (Math.random() - 0.5) * 0.1,
        baseY: particle.position.y,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ---- Cave walls (distant rock formations) ----
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.95,
    });
    for (let i = 0; i < 12; i++) {
      const wall = new THREE.Mesh(
        new THREE.ConeGeometry(2 + Math.random() * 4, 10 + Math.random() * 10, 6),
        wallMat
      );
      const angle = (i / 12) * Math.PI * 2;
      wall.position.set(Math.cos(angle) * 35, 5, Math.sin(angle) * 35);
      wall.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(wall);
    }

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);

    // Crystal glow pulse
    for (const crystal of this.crystals) {
      const pulse = 0.2 + Math.sin(time * 1.5 + crystal.phase) * 0.15;
      for (const mat of crystal.materials) {
        mat.emissiveIntensity = 0.2 + pulse;
      }
    }

    // Particle drift
    for (const p of this.particles) {
      p.mesh.position.y += p.speedY * delta;
      p.mesh.position.x += p.driftX * delta;
      p.mesh.position.z += p.driftZ * delta;
      if (p.mesh.position.y > p.baseY + 2) {
        p.mesh.position.y = p.baseY;
        p.mesh.position.x += (Math.random() - 0.5) * 3;
        p.mesh.position.z += (Math.random() - 0.5) * 3;
      }
      p.mesh.material.opacity = 0.2 + Math.sin(time * 2 + p.phase) * 0.2;
    }
  }
}

registerScene('CrystalCaveScene', CrystalCaveScene);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Transitions ──
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CrystalPulse transition — energy ripple effect for crystal scenes
 */
class CrystalPulse extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 1.2;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0x66ccff) },
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
        varying vec2 vUv;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float ripple = sin(dist * 30.0 - uProgress * 15.0) * 0.5 + 0.5;
          float alpha = ripple * (1.0 - abs(uProgress - 0.5) * 2.0) * 0.6;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  update(t) {
    if (this.overlay?.material?.uniforms?.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

registerTransition('CrystalPulse', CrystalPulse);
