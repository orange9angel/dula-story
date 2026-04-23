import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * StreetCourtScene — 黄昏街头篮球场
 * 水泥地面、涂鸦墙、金属篮筐、夕阳侧光、远处城市剪影
 */
export class StreetCourtScene extends SceneBase {
  constructor() {
    super('StreetCourtScene');
    this.dustParticles = [];
  }

  build() {
    super.build();

    // ---- Sky: sunset gradient using CanvasTexture ----
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512; skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#2a1a4a');      // deep purple top
    skyGrad.addColorStop(0.35, '#ff5522');   // intense orange-red
    skyGrad.addColorStop(0.65, '#ff8844');   // warm orange
    skyGrad.addColorStop(1, '#ffd89b');      // soft yellow horizon
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 512, 512);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    this.scene.background = skyTexture;

    // Fog: warm, closer for intimacy
    this.scene.fog = new THREE.Fog(0xffaa66, 15, 60);

    // ---- Ground: cracked concrete court ----
    const courtGeo = new THREE.PlaneGeometry(30, 40, 1, 1);
    const courtMat = new THREE.MeshStandardMaterial({
      color: 0x8a8a8a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    this.scene.add(court);

    // Court lines (faded white paint)
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
    const keyArea = new THREE.Mesh(new THREE.PlaneGeometry(6, 5.8), lineMat);
    keyArea.rotation.x = -Math.PI / 2;
    keyArea.position.set(0, 0.01, -12);
    keyArea.receiveShadow = true;
    this.scene.add(keyArea);

    const threePointCurve = new THREE.EllipseCurve(0, -12, 8, 8, 0, Math.PI, false, 0);
    const threePointPoints = threePointCurve.getPoints(64);
    const threePointGeo = new THREE.BufferGeometry().setFromPoints(
      threePointPoints.map(p => new THREE.Vector3(p.x, 0.015, p.y))
    );
    const threePointLine = new THREE.Line(threePointGeo, new THREE.LineBasicMaterial({ color: 0xcccccc }));
    this.scene.add(threePointLine);

    // Free throw line
    const ftLine = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.08), lineMat);
    ftLine.rotation.x = -Math.PI / 2;
    ftLine.position.set(0, 0.012, -9.5);
    this.scene.add(ftLine);

    // ---- Hoop: metal pole + backboard + rim + net ----
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 });
    const backboardMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.4,
      thickness: 0.02,
      transparent: true,
      opacity: 0.7,
    });
    const rimMat = new THREE.MeshStandardMaterial({ color:0xff4500, roughness: 0.3, metalness: 0.5 });
    const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.5, 12), poleMat);
    pole.position.set(0, 2.25, -16);
    pole.castShadow = true;
    this.scene.add(pole);

    // Backboard
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.04), backboardMat);
    backboard.position.set(0, 3.85, -15.4);
    backboard.castShadow = true;
    this.scene.add(backboard);

    // Inner square on backboard
    const innerSquare = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.4 }));
    innerSquare.position.set(0, 3.75, -15.37);
    this.scene.add(innerSquare);

    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 8, 24), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 3.55, -15.05);
    this.scene.add(rim);

    // Net
    const netGroup = new THREE.Group();
    netGroup.position.set(0, 3.55, -15.05);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * 0.23, 0, Math.sin(angle) * 0.23),
        new THREE.Vector3(Math.cos(angle) * 0.12, -0.35, Math.sin(angle) * 0.12),
      ]);
      netGroup.add(new THREE.Line(lineGeo, netMat));
    }
    for (let r = 0; r < 3; r++) {
      const radius = 0.20 - r * 0.03;
      const y = -0.10 - r * 0.10;
      const ringCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const ringPoints = ringCurve.getPoints(24);
      const ringGeo = new THREE.BufferGeometry().setFromPoints(
        ringPoints.map(p => new THREE.Vector3(p.x, y, p.y))
      );
      netGroup.add(new THREE.Line(ringGeo, netMat));
    }
    this.scene.add(netGroup);
    this.netGroup = netGroup;

    // ---- Graffiti Wall ----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(25, 4, 0.4), wallMat);
    wall.position.set(0, 2, -20);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Graffiti patches
    const graffitiColors = [0xff0066, 0x00ffcc, 0xffcc00, 0x6600ff];
    for (let i = 0; i < 6; i++) {
      const gW = 1.5 + Math.random() * 2;
      const gH = 0.8 + Math.random() * 1.2;
      const graffiti = new THREE.Mesh(
        new THREE.PlaneGeometry(gW, gH),
        new THREE.MeshStandardMaterial({ color: graffitiColors[i % 4], roughness: 0.8 })
      );
      graffiti.position.set(
        (Math.random() - 0.5) * 20,
        0.5 + Math.random() * 2.5,
        -19.78
      );
      graffiti.rotation.y = Math.PI;
      this.scene.add(graffiti);
    }

    // ---- Chain-link fence ----
    const fenceMat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4 });
    for (let x = -12; x <= 12; x += 1.5) {
      const vLine = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -18),
        new THREE.Vector3(x, 3.5, -18),
      ]);
      this.scene.add(new THREE.Line(vLine, fenceMat));
    }
    for (let y = 0; y <= 3.5; y += 0.5) {
      const hLine = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-12, y, -18),
        new THREE.Vector3(12, y, -18),
      ]);
      this.scene.add(new THREE.Line(hLine, fenceMat));
    }

    // ---- Street lamp ----
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.5 });
    const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8800, emissiveIntensity: 2.0 });
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8), lampPoleMat);
    lampPole.position.set(6, 2.5, -10);
    this.scene.add(lampPole);
    const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), lampGlowMat);
    lampHead.position.set(6, 5.1, -10);
    this.scene.add(lampHead);
    // Glow sprite
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64; glowCanvas.height = 64;
    const glowCtx = glowCanvas.getContext('2d');
    const glowGrad = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glowGrad.addColorStop(0, 'rgba(255, 180, 60, 0.8)');
    glowGrad.addColorStop(0.5, 'rgba(255, 140, 30, 0.3)');
    glowGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    glowCtx.fillStyle = glowGrad;
    glowCtx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending }));
    glowSprite.position.set(6, 5.1, -10);
    glowSprite.scale.set(2, 2, 2);
    this.scene.add(glowSprite);

    const streetLight = new THREE.PointLight(0xff9922, 8, 25, 2);
    streetLight.position.set(6, 4.8, -10);
    this.scene.add(streetLight);

    // ---- City skyline silhouette ----
    const skylineMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 1.0 });
    for (let i = 0; i < 15; i++) {
      const bw = 1.5 + Math.random() * 3;
      const bh = 3 + Math.random() * 8;
      const building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 2), skylineMat);
      building.position.set(
        -30 + i * 4 + (Math.random() - 0.5) * 2,
        bh / 2,
        -35 - Math.random() * 10
      );
      this.scene.add(building);
      if (Math.random() > 0.5) {
        for (let w = 0; w < 3; w++) {
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffeebb })
          );
          win.position.set(
            building.position.x + (Math.random() - 0.5) * bw * 0.6,
            1 + Math.random() * bh * 0.7,
            building.position.z + 1.01
          );
          this.scene.add(win);
        }
      }
    }

    // ---- Lighting ----
    // Hemisphere light for sky/ground bounce
    const hemiLight = new THREE.HemisphereLight(0x4466aa, 0xff6622, 0.8);
    this.scene.add(hemiLight);

    // Sunset key light (lower, stronger, more red)
    const sunLight = new THREE.DirectionalLight(0xff4418, 4.5);
    sunLight.position.set(-12, 3, -8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // Fill light (cool blue from sky)
    const fillLight = new THREE.DirectionalLight(0x5577bb, 0.9);
    fillLight.position.set(8, 12, 10);
    this.scene.add(fillLight);

    // Rim light (cool white for edge separation)
    const rimLight = new THREE.SpotLight(0x88aaff, 3.5, 40, Math.PI / 5, 0.5, 1);
    rimLight.position.set(-8, 4, 6);
    rimLight.target.position.set(0, 1.5, -12);
    this.scene.add(rimLight);
    this.scene.add(rimLight.target);
    this.rimLight = rimLight;

    // ---- Dust particles in light beams ----
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      // Cone-shaped distribution around the light beam
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 4 * Math.random(); // bias toward center
      const y = Math.random() * 5;
      positions[i * 3] = Math.cos(angle) * radius - 8 + Math.random() * 4; // near sun path
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 5 + Math.random() * 4;
      sizes[i] = 0.02 + Math.random() * 0.04;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffddaa,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.dustSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.dustSystem);

    return this.scene;
  }

  getCourtGeometry() {
    return {
      width: 15,
      length: 28,
      hoopZ: -15,
      baselineZ: 14,
      keyWidth: 4.9,
      keyLength: 5.8,
      threePointRadius: 8,
      groundY: 0.01,
    };
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.dustSystem) {
      const positions = this.dustSystem.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        // Brownian drift
        positions[i] += (Math.sin(time * 0.3 + i * 0.1) * 0.001 + (Math.random() - 0.5) * 0.0005);
        positions[i + 1] += (Math.cos(time * 0.2 + i * 0.2) * 0.0008 + 0.0002); // slight upward drift
        positions[i + 2] += (Math.sin(time * 0.25 + i * 0.15) * 0.001 + (Math.random() - 0.5) * 0.0005);
        // Wrap
        if (positions[i + 1] > 6) positions[i + 1] = 0.1;
      }
      this.dustSystem.geometry.attributes.position.needsUpdate = true;
    }
    if (this.netGroup) {
      this.netGroup.rotation.z = Math.sin(time * 2) * 0.02;
    }
  }
}
