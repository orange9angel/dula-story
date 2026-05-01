import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * FutureCityScene — 3026年仙女座未来城市
 * 科幻风格：远处高耸建筑、发光管道、飞行轨迹、紫蓝色天空
 * 角色站在中央开阔地带，周围建筑环绕但不遮挡
 */
export class FutureCityScene extends SceneBase {
  constructor() {
    super('FutureCityScene');
    this.buildings = [];
    this.flyers = [];
    this.neonSigns = [];
  }

  build() {
    super.build();

    // Sci-fi sky - purple-blue gradient (brighter)
    this.scene.background = new THREE.Color(0x2a1540);
    this.scene.fog = new THREE.Fog(0x2a1540, 60, 200);

    // Override lights - much brighter
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.6;
        l.color.setHex(0x6644cc);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.8;
        l.color.setHex(0xccbbee);
        l.position.set(-10, 20, 10);
      }
    });

    // Global city glow
    const cityGlow = new THREE.HemisphereLight(0x8866cc, 0x2a1540, 0.5);
    this.scene.add(cityGlow);

    // Strong character fill light
    this.charLight = new THREE.PointLight(0xddccff, 3, 20);
    this.charLight.position.set(0, 6, 8);
    this.scene.add(this.charLight);

    // Rim light for characters
    this.rimLight = new THREE.PointLight(0x00ffff, 2, 15);
    this.rimLight.position.set(0, 4, -5);
    this.scene.add(this.rimLight);

    // ---- GROUND (reflective metal with grid) ----
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2040,
      roughness: 0.15,
      metalness: 0.7,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid lines on ground
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.12,
    });
    for (let i = -20; i <= 20; i++) {
      const lineX = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 300), gridMat);
      lineX.position.set(i * 8, 0.01, 0);
      this.scene.add(lineX);

      const lineZ = new THREE.Mesh(new THREE.BoxGeometry(300, 0.01, 0.05), gridMat);
      lineZ.position.set(0, 0.01, i * 8);
      this.scene.add(lineZ);
    }

    // ---- FUTURE BUILDINGS (farther away, not blocking view) ----
    const buildingColors = [0x3a2a5a, 0x2a3a5a, 0x3a3a4a, 0x2a2a4a, 0x4a2a4a];
    const neonColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xffdd00, 0xff4444];

    for (let i = 0; i < 30; i++) {
      const w = 2 + Math.random() * 4;
      const d = 2 + Math.random() * 4;
      const h = 15 + Math.random() * 50;
      const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.3,
          metalness: 0.6,
          emissive: color,
          emissiveIntensity: 0.1,
        })
      );

      // Place buildings farther away (radius 70-120) so they don't block characters
      const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 70 + Math.random() * 50;
      building.position.set(
        Math.cos(angle) * radius,
        h / 2,
        Math.sin(angle) * radius
      );
      building.castShadow = true;
      this.scene.add(building);
      this.buildings.push(building);

      // Neon window strips
      if (Math.random() > 0.3) {
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const stripGeo = new THREE.BoxGeometry(w + 0.1, 0.08, d + 0.1);
        const stripMat = new THREE.MeshBasicMaterial({
          color: neonColor,
          transparent: true,
          opacity: 0.5,
        });

        for (let floor = 3; floor < h - 3; floor += 4 + Math.floor(Math.random() * 4)) {
          const strip = new THREE.Mesh(stripGeo, stripMat);
          strip.position.set(building.position.x, floor, building.position.z);
          this.scene.add(strip);
        }
      }

      // Vertical neon edge
      if (Math.random() > 0.5) {
        const edgeColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const edgeGeo = new THREE.BoxGeometry(0.06, h, 0.06);
        const edgeMat = new THREE.MeshBasicMaterial({ color: edgeColor });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(
          building.position.x + w / 2,
          h / 2,
          building.position.z + d / 2
        );
        this.scene.add(edge);
      }
    }

    // ---- HIGH-TECH TOWERS (prominent sci-fi skyscrapers) ----
    for (let i = 0; i < 6; i++) {
      const towerGroup = new THREE.Group();
      const h = 40 + Math.random() * 30;
      const towerColor = neonColors[i % neonColors.length];

      // Main spire
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, h, 6),
        new THREE.MeshStandardMaterial({
          color: 0x2a2a3a,
          roughness: 0.2,
          metalness: 0.9,
          emissive: towerColor,
          emissiveIntensity: 0.15,
        })
      );
      spire.position.y = h / 2;
      towerGroup.add(spire);

      // Glowing rings
      for (let r = 0; r < 4; r++) {
        const ringGeo = new THREE.TorusGeometry(2 + r * 0.5, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: towerColor,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 10 + r * (h - 15) / 3;
        towerGroup.add(ring);
      }

      // Antenna
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.1, 8, 4),
        new THREE.MeshBasicMaterial({ color: towerColor })
      );
      antenna.position.y = h + 4;
      towerGroup.add(antenna);

      // Antenna beacon
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      beacon.position.y = h + 8;
      towerGroup.add(beacon);

      // Beacon light
      const beaconLight = new THREE.PointLight(towerColor, 5, 20);
      beaconLight.position.y = h + 8;
      towerGroup.add(beaconLight);

      // Position
      const angle = (i / 6) * Math.PI * 2;
      const radius = 50 + Math.random() * 20;
      towerGroup.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      this.scene.add(towerGroup);
      this.buildings.push(towerGroup);
    }

    // ---- ANDROMEDA COURIER STATION (centerpiece, behind characters) ----
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0, 0, -30);

    // Main tower
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4, 40, 8),
      new THREE.MeshStandardMaterial({
        color: 0x3a2a5a,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x2a1a4a,
        emissiveIntensity: 0.15,
      })
    );
    tower.position.y = 20;
    stationGroup.add(tower);

    // Tower top (glowing dome)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 })
    );
    dome.position.y = 40;
    stationGroup.add(dome);

    // Dome glow light
    const domeLight = new THREE.PointLight(0x00ffff, 10, 30);
    domeLight.position.set(0, 42, 0);
    stationGroup.add(domeLight);

    // Landing pads (floating rings around tower)
    for (let i = 0; i < 3; i++) {
      const padGeo = new THREE.TorusGeometry(6 + i * 2, 0.3, 8, 32);
      const padMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ffff : i === 1 ? 0xff00ff : 0x00ff88,
        transparent: true,
        opacity: 0.5,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = Math.PI / 2;
      pad.position.y = 15 + i * 10;
      stationGroup.add(pad);

      // Pad light
      const padLight = new THREE.PointLight(padMat.color, 4, 12);
      padLight.position.set(0, 15 + i * 10, 0);
      stationGroup.add(padLight);
    }

    // "快递站" sign (glowing bars)
    const signColors = [0xff4444, 0xffdd00, 0x00ff88];
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.15, 0.1),
        new THREE.MeshBasicMaterial({ color: signColors[i] })
      );
      bar.position.set(-1 + i * 1, 35, 3.2);
      stationGroup.add(bar);
    }

    this.scene.add(stationGroup);
    this.station = stationGroup;

    // ---- SPACE SHIPS (large, detailed) ----
    for (let i = 0; i < 5; i++) {
      const shipGroup = new THREE.Group();
      const shipColor = neonColors[i % neonColors.length];

      // Main hull
      const hull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 2, 6),
        new THREE.MeshStandardMaterial({
          color: 0x4a4a5a,
          roughness: 0.3,
          metalness: 0.8,
          emissive: shipColor,
          emissiveIntensity: 0.3,
        })
      );
      hull.rotation.x = Math.PI / 2;
      shipGroup.add(hull);

      // Wings
      const wingGeo = new THREE.BoxGeometry(2.5, 0.05, 0.8);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a4a,
        roughness: 0.3,
        metalness: 0.9,
        emissive: shipColor,
        emissiveIntensity: 0.2,
      });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      shipGroup.add(wings);

      // Engine glow
      const engineGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const engineMat = new THREE.MeshBasicMaterial({ color: shipColor });
      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.position.z = 1.2;
      shipGroup.add(engine);

      // Engine light
      const engineLight = new THREE.PointLight(shipColor, 3, 8);
      engineLight.position.z = 1.5;
      shipGroup.add(engineLight);

      // Position in sky
      const radius = 30 + Math.random() * 40;
      const y = 25 + Math.random() * 25;
      shipGroup.position.set(radius, y, 0);
      this.scene.add(shipGroup);

      this.flyers.push({
        group: shipGroup,
        radius,
        y,
        speed: 0.15 + Math.random() * 0.25,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // ---- FLYING VEHICLES (light trails) ----
    for (let i = 0; i < 8; i++) {
      const flyerGroup = new THREE.Group();
      const y = 20 + Math.random() * 30;
      const radius = 20 + Math.random() * 50;
      const speed = 0.3 + Math.random() * 0.5;

      // Vehicle body
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.5, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      body.rotation.x = Math.PI / 2;
      flyerGroup.add(body);

      // Light trail
      const trailGeo = new THREE.BoxGeometry(0.04, 0.04, 3);
      const trailColor = neonColors[Math.floor(Math.random() * neonColors.length)];
      const trail = new THREE.Mesh(
        trailGeo,
        new THREE.MeshBasicMaterial({ color: trailColor, transparent: true, opacity: 0.5 })
      );
      trail.position.z = 1.5;
      flyerGroup.add(trail);

      flyerGroup.position.set(radius, y, 0);
      this.scene.add(flyerGroup);

      this.flyers.push({
        group: flyerGroup,
        radius,
        y,
        speed,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // ---- FLOATING HOLOGRAMS ----
    for (let i = 0; i < 5; i++) {
      const holoGeo = new THREE.PlaneGeometry(2, 2);
      const holoMat = new THREE.MeshBasicMaterial({
        color: neonColors[i % neonColors.length],
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      });
      const holo = new THREE.Mesh(holoGeo, holoMat);
      holo.position.set(
        (Math.random() - 0.5) * 60,
        10 + Math.random() * 20,
        (Math.random() - 0.5) * 60
      );
      holo.rotation.y = Math.random() * Math.PI;
      this.scene.add(holo);
      this.neonSigns.push({ mesh: holo, baseY: holo.position.y, speed: 0.5 + Math.random() });
    }

    // ---- DISTANT GALAXY (in sky) ----
    const galaxyCanvas = document.createElement('canvas');
    galaxyCanvas.width = 256;
    galaxyCanvas.height = 256;
    const gCtx = galaxyCanvas.getContext('2d');
    const galaxyGradient = gCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    galaxyGradient.addColorStop(0, 'rgba(200, 150, 255, 0.8)');
    galaxyGradient.addColorStop(0.3, 'rgba(150, 100, 255, 0.4)');
    galaxyGradient.addColorStop(0.6, 'rgba(100, 50, 200, 0.2)');
    galaxyGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    gCtx.fillStyle = galaxyGradient;
    gCtx.fillRect(0, 0, 256, 256);

    const galaxyTex = new THREE.CanvasTexture(galaxyCanvas);
    const galaxyGeo = new THREE.PlaneGeometry(60, 60);
    const galaxyMat = new THREE.MeshBasicMaterial({
      map: galaxyTex,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const galaxy = new THREE.Mesh(galaxyGeo, galaxyMat);
    galaxy.position.set(-40, 60, -80);
    galaxy.rotation.y = 0.3;
    this.scene.add(galaxy);

    // ---- STARS ----
    const starGeo = new THREE.BufferGeometry();
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 200;
      starPositions[i * 3 + 1] = 40 + Math.random() * 60;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.7 });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);

    // Flying vehicles orbit
    for (const flyer of this.flyers) {
      flyer.angle += flyer.speed * delta;
      flyer.group.position.x = Math.cos(flyer.angle) * flyer.radius;
      flyer.group.position.z = Math.sin(flyer.angle) * flyer.radius;
      flyer.group.rotation.y = -flyer.angle;
    }

    // Holograms float and rotate
    for (const holo of this.neonSigns) {
      holo.mesh.position.y = holo.baseY + Math.sin(time * holo.speed) * 1;
      holo.mesh.rotation.y += delta * 0.5;
    }

    // Station dome pulse
    if (this.station) {
      const dome = this.station.children[1];
      if (dome) {
        dome.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
      }
    }

    // Stars twinkle
    if (this.stars) {
      this.stars.rotation.y += delta * 0.005;
    }
  }
}
