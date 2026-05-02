import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * TimeTunnelScene — 时光隧道
 * 五彩斑斓的高速线条穿梭，三人坐在时光机平台上
 */
export class TimeTunnelScene extends SceneBase {
  constructor() {
    super('TimeTunnelScene');
    this.speedLines = [];
    this.sparkles = [];
    this.time = 0;
  }

  build() {
    super.build();

    // Dark tunnel background
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.Fog(0x050510, 20, 80);

    // Override lights
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.15;
        l.color.setHex(0x1a1a3a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.1;
        l.color.setHex(0x4444aa);
        l.position.set(0, 5, 10);
      }
    });

    // ---- COLORFUL SPEED LINES (the main tunnel effect) ----
    const colors = [0xff0044, 0x00ff88, 0x0088ff, 0xffdd00, 0xff00ff, 0x00ffff, 0xff8800];

    // Long streaking lines
    for (let i = 0; i < 80; i++) {
      const len = 10 + Math.random() * 30;
      const lineGeo = new THREE.BoxGeometry(0.03, 0.03, len);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const lineMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.5,
      });
      const line = new THREE.Mesh(lineGeo, lineMat);

      // Random position in a tunnel shape
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 15;
      line.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.6 + (Math.random() - 0.5) * 8,
        -50 + Math.random() * 100
      );

      // Random rotation for variety
      line.rotation.x = (Math.random() - 0.5) * 0.3;
      line.rotation.y = (Math.random() - 0.5) * 0.3;

      this.scene.add(line);
      this.speedLines.push({
        mesh: line,
        speed: 30 + Math.random() * 50,
        baseZ: line.position.z,
      });
    }

    // Thicker colored streaks (fewer, more prominent)
    for (let i = 0; i < 20; i++) {
      const len = 20 + Math.random() * 40;
      const lineGeo = new THREE.BoxGeometry(0.08, 0.08, len);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const lineMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.25,
      });
      const line = new THREE.Mesh(lineGeo, lineMat);

      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 12;
      line.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.5 + (Math.random() - 0.5) * 6,
        -60 + Math.random() * 120
      );

      this.scene.add(line);
      this.speedLines.push({
        mesh: line,
        speed: 40 + Math.random() * 60,
        baseZ: line.position.z,
      });
    }

    // ---- SPARKLE PARTICLES ----
    const sparkleGeo = new THREE.BufferGeometry();
    const sparkleCount = 200;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleColors = new Float32Array(sparkleCount * 3);

    for (let i = 0; i < sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 20;
      sparklePositions[i * 3] = Math.cos(angle) * radius;
      sparklePositions[i * 3 + 1] = Math.sin(angle) * radius * 0.5 + (Math.random() - 0.5) * 10;
      sparklePositions[i * 3 + 2] = -50 + Math.random() * 100;

      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      sparkleColors[i * 3] = color.r;
      sparkleColors[i * 3 + 1] = color.g;
      sparkleColors[i * 3 + 2] = color.b;
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    sparkleGeo.setAttribute('color', new THREE.BufferAttribute(sparkleColors, 3));

    const sparkleMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    this.scene.add(this.sparkles);

    // ---- TIME MACHINE PLATFORM (characters sit on this) ----
    const platformGroup = new THREE.Group();
    platformGroup.position.set(0, 0, 0);

    // Main platform disc
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x444466,
      metalness: 0.9,
      roughness: 0.1,
    });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.6, 0.08, 32), discMat);
    platformGroup.add(disc);

    // Glowing ring around platform
    const ringGeo = new THREE.TorusGeometry(3.55, 0.03, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.platformRing = new THREE.Mesh(ringGeo, ringMat);
    this.platformRing.rotation.x = Math.PI / 2;
    this.platformRing.position.y = 0.06;
    platformGroup.add(this.platformRing);

    // Inner ring
    const innerRingGeo = new THREE.TorusGeometry(2.0, 0.02, 8, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    this.innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.innerRing.rotation.x = Math.PI / 2;
    this.innerRing.position.y = 0.07;
    platformGroup.add(this.innerRing);

    // Control console (small pedestal in center)
    const consoleGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16);
    const consoleMat = new THREE.MeshStandardMaterial({
      color: 0x333355,
      metalness: 0.8,
      roughness: 0.2,
    });
    const console = new THREE.Mesh(consoleGeo, consoleMat);
    console.position.y = 0.19;
    platformGroup.add(console);

    // Console glow
    const consoleGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 })
    );
    consoleGlow.position.y = 0.35;
    platformGroup.add(consoleGlow);

    this.scene.add(platformGroup);
    this.platform = platformGroup;

    // Platform light
    this.platformLight = new THREE.PointLight(0x00ffff, 3, 8);
    this.platformLight.position.set(0, 2, 0);
    this.scene.add(this.platformLight);

    // ---- TUNNEL WALLS (subtle rings) ----
    this.tunnelRings = [];
    for (let i = 0; i < 8; i++) {
      const ringGeo = new THREE.TorusGeometry(18, 0.05, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.1,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = -40 + i * 12;
      this.scene.add(ring);
      this.tunnelRings.push(ring);
    }

    return this.scene;
  }

  addCharacter(character) {
    super.addCharacter(character);
    // Scale down tall characters so they look proportional on the small platform
    const scales = {
      Nobita: 0.75,
      Xingzai: 0.8,
      Xiaoyue: 0.85,
      Doraemon: 0.9,
    };
    const name = character.constructor.name;
    if (scales[name]) {
      character.mesh.scale.setScalar(scales[name]);
    }
  }

  update(time, delta) {
    super.update(time, delta);
    this.time += delta;

    // Speed lines fly past
    for (const line of this.speedLines) {
      line.mesh.position.z += line.speed * delta;
      if (line.mesh.position.z > 30) {
        line.mesh.position.z = -60 - Math.random() * 40;
        // Randomize position again
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 15;
        line.mesh.position.x = Math.cos(angle) * radius;
        line.mesh.position.y = Math.sin(angle) * radius * 0.6 + (Math.random() - 0.5) * 8;
      }
    }

    // Sparkles fly past
    if (this.sparkles) {
      const positions = this.sparkles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 2] += 40 * delta;
        if (positions[i * 3 + 2] > 30) {
          positions[i * 3 + 2] = -60;
          const angle = Math.random() * Math.PI * 2;
          const radius = 1 + Math.random() * 20;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = Math.sin(angle) * radius * 0.5 + (Math.random() - 0.5) * 10;
        }
      }
      this.sparkles.geometry.attributes.position.needsUpdate = true;
    }

    // Platform rings rotation
    if (this.platformRing) {
      this.platformRing.rotation.z += delta * 3;
    }
    if (this.innerRing) {
      this.innerRing.rotation.z -= delta * 5;
    }

    // Platform gentle bob
    if (this.platform) {
      this.platform.position.y = Math.sin(time * 2) * 0.05;
    }

    // Platform light pulse
    if (this.platformLight) {
      this.platformLight.intensity = 2 + Math.sin(time * 4) * 1;
    }

    // Tunnel rings move toward camera
    for (const ring of this.tunnelRings) {
      ring.position.z += 15 * delta;
      if (ring.position.z > 20) {
        ring.position.z = -50;
      }
    }
  }
}
