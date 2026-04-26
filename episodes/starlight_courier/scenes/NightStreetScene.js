import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class NightStreetScene extends SceneBase {
  constructor() {
    super('NightStreetScene');
    this.raindrops = [];
    this.streetLights = [];
  }

  build() {
    super.build();

    // Dark night sky background
    this.scene.background = new THREE.Color(0x0a0a18);
    this.scene.fog = new THREE.Fog(0x0a0a18, 15, 50);

    // Override default lights for night atmosphere
    this.lights.forEach(l => {
      if (l.isAmbientLight) l.intensity = 0.15;
      if (l.isDirectionalLight) {
        l.intensity = 0.1;
        l.color.setHex(0x4455aa);
        l.position.set(5, 15, -5);
      }
    });

    // ---- Street surface (wet asphalt with slight reflection) ----
    const streetGeo = new THREE.PlaneGeometry(40, 80);
    const streetMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.3,
      metalness: 0.2,
    });
    const street = new THREE.Mesh(streetGeo, streetMat);
    street.rotation.x = -Math.PI / 2;
    street.receiveShadow = true;
    this.scene.add(street);

    // ---- Sidewalks (both sides) ----
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.85 });
    for (const side of [-1, 1]) {
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 80), sidewalkMat);
      sidewalk.position.set(side * 9, 0.075, 0);
      sidewalk.receiveShadow = true;
      this.scene.add(sidewalk);

      // Curb
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.25, 80),
        new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.9 })
      );
      curb.position.set(side * 7.15, 0.125, 0);
      this.scene.add(curb);
    }

    // ---- Buildings (both sides, silhouettes) ----
    const buildingColors = [0x151520, 0x1a1a28, 0x12121c, 0x181825];
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -35 + Math.floor(i / 2) * 12;
      const w = 3 + Math.random() * 3;
      const h = 8 + Math.random() * 12;
      const d = 4 + Math.random() * 3;
      const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
      );
      building.position.set(side * (11 + w / 2), h / 2, z);
      building.castShadow = true;
      this.scene.add(building);

      // Windows with warm glow (some lit, some dark)
      const windowMatLit = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
      const windowMatDark = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.9 });
      const cols = Math.floor(w / 1.5);
      const rows = Math.floor(h / 2.5);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.6) {
            const win = new THREE.Mesh(
              new THREE.PlaneGeometry(0.6, 0.9),
              Math.random() > 0.3 ? windowMatLit : windowMatDark
            );
            win.position.set(
              building.position.x + (side === -1 ? d / 2 + 0.05 : -d / 2 - 0.05),
              2 + r * 2.2,
              z + (c - (cols - 1) / 2) * 1.4
            );
            win.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
            this.scene.add(win);
          }
        }
      }
    }

    // ---- Street lamps (warm glow) ----
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.5 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
    const lampPositions = [-20, -8, 4, 16, 28];
    for (const lz of lampPositions) {
      const side = Math.random() > 0.5 ? -1 : 1;
      // Post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 8), lampPostMat);
      post.position.set(side * 6.5, 2.5, lz);
      post.castShadow = true;
      this.scene.add(post);

      // Arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), lampPostMat);
      arm.rotation.z = side === -1 ? -Math.PI / 3 : Math.PI / 3;
      arm.position.set(side * 5.8, 4.8, lz);
      this.scene.add(arm);

      // Lamp head (glowing sphere)
      const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), lampGlowMat);
      lampHead.position.set(side * 5.0, 5.1, lz);
      this.scene.add(lampHead);

      // Point light for actual illumination
      const lampLight = new THREE.PointLight(0xffaa44, 8, 12);
      lampLight.position.set(side * 5.0, 4.8, lz);
      lampLight.castShadow = true;
      lampLight.shadow.bias = -0.001;
      this.scene.add(lampLight);
      this.streetLights.push(lampLight);

      // Light cone (volumetric fake)
      const coneGeo = new THREE.ConeGeometry(1.5, 4, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(side * 5.0, 2.8, lz);
      this.scene.add(cone);
    }

    // ---- Puddles (reflective planes on street) ----
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x223355,
      roughness: 0.05,
      metalness: 0.6,
      transparent: true,
      opacity: 0.7,
    });
    for (let i = 0; i < 8; i++) {
      const px = (Math.random() - 0.5) * 10;
      const pz = -30 + Math.random() * 60;
      const pr = 0.3 + Math.random() * 0.8;
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(pr, 16), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(px, 0.01, pz);
      this.scene.add(puddle);
    }

    // ---- Distant city glow (hemisphere light) ----
    const cityGlow = new THREE.HemisphereLight(0x1a1a3a, 0x0a0a15, 0.3);
    this.scene.add(cityGlow);

    // ---- Rain particles ----
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 800;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 30;
      rainPositions[i * 3 + 1] = Math.random() * 20;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x8899bb,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
    });
    this.rainSystem = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainSystem);

    // ---- Wet ground reflection hint (large subtle plane) ----
    const reflectionMat = new THREE.MeshBasicMaterial({
      color: 0x223344,
      transparent: true,
      opacity: 0.08,
    });
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), reflectionMat);
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.y = 0.005;
    this.scene.add(reflection);

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);

    // Animate rain
    if (this.rainSystem) {
      const positions = this.rainSystem.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] -= 8 * delta; // fall speed
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 15 + Math.random() * 5;
          positions[i * 3] = (Math.random() - 0.5) * 30;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      this.rainSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Subtle street light flicker
    for (let i = 0; i < this.streetLights.length; i++) {
      const light = this.streetLights[i];
      const flicker = Math.sin(time * 10 + i * 3) * 0.05 + Math.sin(time * 23 + i) * 0.03;
      light.intensity = 8 + flicker;
    }
  }
}
