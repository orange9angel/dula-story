import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class SanctuaryIntroScene extends SceneBase {
  constructor() {
    super('SanctuaryIntroScene');
    this.stars = [];
    this.meteors = [];
    this.titleVisible = false;
    this.meteorsActive = false;
    this.groundCracks = [];
    this.cracksActive = false;
    this.constellationLines = [];
    this.templeGlow = null;
    this.zodiacFlames = [];
    this.zodiacFlameStates = new Array(12).fill(true); // all lit initially
    this.defeatedCount = 0;
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x02040a);
    this.scene.fog = new THREE.Fog(0x02040a, 15, 60);

    for (const light of this.lights) {
      if (light.isAmbientLight) {
        // Lower ambient for harder shadows (cel look)
        light.intensity = 0.2;
        light.color.setHex(0x5a7acc);
      }
      if (light.isDirectionalLight) {
        // Stronger key light for dramatic cel shading
        light.intensity = 2.2;
        light.color.setHex(0xffe0a0);
        light.position.set(8, 12, 6);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
      }
    }

    // Strong rim light for character edge definition
    const rim = new THREE.DirectionalLight(0x66aaff, 3.0);
    rim.position.set(-6, 5, -8);
    this.scene.add(rim);
    this.rimLight = rim;

    // Secondary rim from below for dramatic under-lighting
    const underRim = new THREE.DirectionalLight(0x3a6aaa, 1.2);
    underRim.position.set(3, -1, -4);
    this.scene.add(underRim);
    this.underRimLight = underRim;

    const bounce = new THREE.DirectionalLight(0x1a3a5a, 0.35);
    bounce.position.set(0, -2, 3);
    this.scene.add(bounce);

    this.addStarDome();
    this.addSanctuary();
    this.addZodiacRing();
    this.addConstellationLines();
    this.addZodiacFlames();
    this.addMeteors();
    this.addGroundCracks();
    this.addTitlePlane();
    this.addTempleGlow();
    return this.scene;
  }

  addStarDome() {
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2048;
    skyCanvas.height = 1024;
    const ctx = skyCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#01020a');
    grad.addColorStop(0.4, '#0a1a3a');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Dense star field - 3 layers
    for (let layer = 0; layer < 3; layer++) {
      const count = layer === 0 ? 1200 : layer === 1 ? 800 : 400;
      const brightness = layer === 0 ? 0.95 : layer === 1 ? 0.7 : 0.45;
      const sizeBase = layer === 0 ? 1.4 : layer === 1 ? 0.9 : 0.5;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 1024;
        const r = Math.random() * sizeBase + 0.15;
        const alpha = (0.3 + Math.random() * 0.7) * brightness;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 240, 255, ${alpha})`;
        ctx.fill();
      }
    }

    // Add some colored stars (blue, gold, red giants)
    const coloredStars = [
      { color: '150,200,255', count: 80 },
      { color: '255,220,150', count: 60 },
      { color: '255,180,150', count: 40 },
    ];
    for (const cs of coloredStars) {
      for (let i = 0; i < cs.count; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 1024;
        const r = Math.random() * 1.8 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cs.color}, ${0.4 + Math.random() * 0.5})`;
        ctx.fill();
      }
    }

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyCanvas), side: THREE.BackSide })
    );
    this.scene.add(sky);

    // 3D twinkling stars - spherical distribution, always visible from any angle
    const starConfigs = [
      { color: 0xcff4ff, count: 100, size: [0.025, 0.055] },
      { color: 0xaaddff, count: 80, size: [0.018, 0.04] },
      { color: 0xffddaa, count: 60, size: [0.02, 0.045] },
      { color: 0xffaaaa, count: 40, size: [0.015, 0.03] },
      { color: 0xaaffff, count: 30, size: [0.022, 0.05] },
    ];
    for (const cfg of starConfigs) {
      const starMat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.7 });
      for (let i = 0; i < cfg.count; i++) {
        const sz = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
        const star = new THREE.Mesh(new THREE.SphereGeometry(sz, 6, 6), starMat.clone());
        // Spherical distribution around scene center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 60 + Math.random() * 80;
        star.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
        star.userData.phase = Math.random() * Math.PI * 2;
        star.userData.speed = 0.3 + Math.random() * 3;
        this.scene.add(star);
        this.stars.push(star);
      }
    }
  }

  addSanctuary() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xc8c2b8, roughness: 0.7, metalness: 0.08 });
    const shadowStoneMat = new THREE.MeshStandardMaterial({ color: 0x7a7580, roughness: 0.92 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4a040,
      roughness: 0.3,
      metalness: 0.45,
      emissive: 0x3a1a00,
      emissiveIntensity: 0.12,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 48), shadowStoneMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    for (let i = 0; i < 12; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(9 + i * 0.4, 0.16, 0.85), stoneMat);
      step.position.set(0, i * 0.08, 2.5 - i * 0.78);
      step.castShadow = true;
      step.receiveShadow = true;
      this.scene.add(step);
    }

    const platform = new THREE.Mesh(new THREE.BoxGeometry(12, 0.32, 7), stoneMat);
    platform.position.set(0, 1.0, -5.8);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);

    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const col = new THREE.Group();
        col.position.set(side * (4.2 + i * 1.7), 0.95, -4.2 - i * 0.65);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.6, 16), stoneMat);
        shaft.position.y = 1.8;
        col.add(shaft);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.24, 18), stoneMat);
        base.position.y = 0.12;
        col.add(base);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.24, 0.78), stoneMat);
        cap.position.y = 3.72;
        col.add(cap);
        this.scene.add(col);
      }
    }

    const templeBack = new THREE.Mesh(new THREE.BoxGeometry(11, 5.0, 0.5), stoneMat);
    templeBack.position.set(0, 3.3, -10.2);
    templeBack.castShadow = true;
    this.scene.add(templeBack);

    const pediment = new THREE.Mesh(new THREE.ConeGeometry(6.0, 1.4, 3), stoneMat);
    pediment.position.set(0, 6.55, -10.2);
    pediment.rotation.z = Math.PI / 2;
    pediment.scale.z = 0.16;
    this.scene.add(pediment);

    const statue = new THREE.Group();
    statue.position.set(0, 1.15, -8.5);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.56, 2.0, 18), stoneMat);
    body.position.y = 1.1;
    statue.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), stoneMat);
    head.position.y = 2.35;
    statue.add(head);
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 3.0, 8), goldMat);
    spear.position.set(0.62, 1.8, 0.06);
    spear.rotation.z = -0.1;
    statue.add(spear);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), goldMat);
    shield.position.set(-0.52, 1.45, 0.1);
    shield.rotation.x = Math.PI / 2;
    statue.add(shield);
    this.scene.add(statue);
  }

  addZodiacRing() {
    this.zodiacGroup = new THREE.Group();
    this.zodiacGroup.position.set(0, 2.2, -9.5);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd46f, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.02, 8, 120), ringMat);
    this.zodiacGroup.add(ring);

    const smallRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.012, 8, 100), ringMat.clone());
    smallRing.material.opacity = 0.35;
    this.zodiacGroup.add(smallRing);

    const glyphMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const marker = new THREE.Group();
      marker.position.set(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0);
      marker.rotation.z = a;

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glyphMat.clone());
      marker.add(dot);

      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.012), glyphMat.clone());
      ray.position.y = 0.26;
      marker.add(ray);

      this.zodiacGroup.add(marker);
    }

    this.scene.add(this.zodiacGroup);
  }

  addConstellationLines() {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd46f,
      transparent: true,
      opacity: 0.25,
    });

    const points = [];
    for (let i = 0; i < 12; i++) {
      const a1 = (i / 12) * Math.PI * 2;
      const a2 = ((i + 1) % 12 / 12) * Math.PI * 2;
      const r = 3.0;
      points.push(
        new THREE.Vector3(Math.cos(a1) * r, Math.sin(a1) * r, 0),
        new THREE.Vector3(Math.cos(a2) * r, Math.sin(a2) * r, 0)
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.constellationLines = new THREE.LineSegments(geometry, lineMat);
    this.constellationLines.position.copy(this.zodiacGroup.position);
    this.scene.add(this.constellationLines);
  }

  addZodiacFlames() {
    // 黄道十二宫火焰 - 每个宫位一个火焰
    this.zodiacFlames = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const flameGroup = new THREE.Group();
      const pos = new THREE.Vector3(
        Math.cos(a) * 3.0,
        Math.sin(a) * 3.0,
        0
      );
      flameGroup.position.copy(pos);
      flameGroup.position.add(this.zodiacGroup.position);

      // 主火焰 - 锥形
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.3, 6),
        flameMat
      );
      flame.position.y = 0.15;
      flameGroup.add(flame);

      // 内焰 - 更亮
      const innerFlameMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.2, 6),
        innerFlameMat
      );
      innerFlame.position.y = 0.12;
      flameGroup.add(innerFlame);

      // 光晕
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        glowMat
      );
      glow.position.y = 0.1;
      glow.scale.y = 0.6;
      flameGroup.add(glow);

      flameGroup.userData.index = i;
      flameGroup.userData.basePhase = Math.random() * Math.PI * 2;
      this.scene.add(flameGroup);
      this.zodiacFlames.push(flameGroup);
    }
  }

  extinguishZodiacFlame(index) {
    if (index >= 0 && index < 12 && this.zodiacFlameStates[index]) {
      this.zodiacFlameStates[index] = false;
      this.defeatedCount++;
    }
  }

  addMeteors() {
    // Real meteors with glowing heads and long tapered trails
    for (let i = 0; i < 48; i++) {
      const group = new THREE.Group();

      // Head - bright white core
      const headMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), headMat);
      group.add(head);

      // Inner glow - blue-white
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), glowMat);
      group.add(glow);

      // Outer halo
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), haloMat);
      group.add(halo);

      // Long tapered trail - cone geometry pointing backward
      const trailColor = i % 3 === 0 ? 0xaaddff : i % 3 === 1 ? 0xffffff : 0xffddaa;
      const trailMat = new THREE.MeshBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      // Main trail cone: wide at head, tapering to point
      const trail = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 2.5, 8, 1, true),
        trailMat
      );
      trail.rotation.x = Math.PI / 2; // point backward
      trail.position.z = 1.3;
      group.add(trail);

      // Secondary inner trail - brighter core
      const coreTrailMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coreTrail = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 1.8, 6, 1, true),
        coreTrailMat
      );
      coreTrail.rotation.x = Math.PI / 2;
      coreTrail.position.z = 0.95;
      group.add(coreTrail);

      // Particle trail - small spheres along the path
      group.userData.particles = [];
      for (let p = 0; p < 8; p++) {
        const pMat = new THREE.MeshBasicMaterial({
          color: trailColor,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const pSize = 0.015 - p * 0.0015;
        const particle = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.003, pSize), 4, 4), pMat);
        particle.position.z = 0.2 + p * 0.25;
        group.add(particle);
        group.userData.particles.push(particle);
      }

      // Random spawn position in upper sky
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnRadius = 5 + Math.random() * 12;
      const spawnHeight = 10 + Math.random() * 14;

      group.userData = {
        ...group.userData,
        delay: i * 0.015,
        spawnX: Math.cos(spawnAngle) * spawnRadius,
        spawnY: spawnHeight,
        spawnZ: Math.sin(spawnAngle) * spawnRadius - 5,
        speed: 15 + Math.random() * 10,
        angle: spawnAngle + Math.PI + (Math.random() - 0.5) * 0.3,
        declination: -0.6 - Math.random() * 0.5, // steeper downward slope
      };
      group.position.set(0, -100, 0);
      this.scene.add(group);
      this.meteors.push(group);
    }
  }

  addGroundCracks() {
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x4db8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // More dramatic cracks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const crackGroup = new THREE.Group();

      const mainCrack = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 2.0 + Math.random() * 1.5),
        crackMat.clone()
      );
      mainCrack.rotation.x = -Math.PI / 2;
      mainCrack.rotation.z = angle;
      mainCrack.position.set(Math.cos(angle) * 0.5, 0.02, Math.sin(angle) * 0.5);
      crackGroup.add(mainCrack);

      for (let j = 0; j < 3; j++) {
        const branch = new THREE.Mesh(
          new THREE.PlaneGeometry(0.025, 0.5 + Math.random() * 0.6),
          crackMat.clone()
        );
        branch.rotation.x = -Math.PI / 2;
        branch.rotation.z = angle + (Math.random() - 0.5) * 1.0;
        branch.position.set(
          Math.cos(angle) * (0.9 + j * 0.35),
          0.02,
          Math.sin(angle) * (0.9 + j * 0.35)
        );
        crackGroup.add(branch);
      }

      // Add glowing embers along cracks
      for (let k = 0; k < 4; k++) {
        const emberMat = new THREE.MeshBasicMaterial({
          color: 0x66ccff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const ember = new THREE.Mesh(
          new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 6, 6),
          emberMat
        );
        const t = Math.random();
        ember.position.set(
          Math.cos(angle) * (0.3 + t * 1.5),
          0.03,
          Math.sin(angle) * (0.3 + t * 1.5)
        );
        crackGroup.add(ember);
      }

      crackGroup.visible = false;
      this.scene.add(crackGroup);
      this.groundCracks.push(crackGroup);
    }
  }

  addTempleGlow() {
    const glowGeo = new THREE.PlaneGeometry(8, 5);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffd46f,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.templeGlow = new THREE.Mesh(glowGeo, glowMat);
    this.templeGlow.position.set(0, 3.5, -9.9);
    this.scene.add(this.templeGlow);
  }

  addTitlePlane() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 256);

    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffe38a');
    grad.addColorStop(0.7, '#ffd46f');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.font = 'bold 92px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAINT SEIYA', 512, 120);

    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = 'rgba(100, 220, 255, 0.95)';
    ctx.fillText('BURN YOUR COSMOS', 512, 172);

    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('聖闘士星矢', 512, 210);

    const tex = new THREE.CanvasTexture(canvas);
    this.titlePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 1.3),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })
    );
    this.titlePlane.position.set(0, 3.4, -5.2);
    this.scene.add(this.titlePlane);
  }

  revealTitle() { this.titleVisible = true; }
  hideTitle() { this.titleVisible = false; }
  intensifyCosmos() { this.cosmosBoostUntil = 999; }
  launchMeteors() { this.meteorsActive = true; this.meteorStartTime = null; }

  showGroundCracks() {
    this.cracksActive = true;
    this.cracksStartTime = null;
    for (const crack of this.groundCracks) {
      crack.visible = true;
      for (const child of crack.children) {
        child.material.opacity = 0;
      }
    }
  }

  showTempleGlow() {
    this.templeGlowActive = true;
    this.templeGlowStartTime = null;
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.zodiacGroup) {
      this.zodiacGroup.rotation.z += delta * 0.1;
      this.zodiacGroup.rotation.y = Math.sin(time * 0.35) * 0.06;
    }

    if (this.constellationLines) {
      this.constellationLines.rotation.z = this.zodiacGroup.rotation.z;
      this.constellationLines.rotation.y = this.zodiacGroup.rotation.y;
      this.constellationLines.material.opacity = 0.2 + Math.sin(time * 1.5) * 0.08;
    }

    // Zodiac flames animation
    for (let i = 0; i < this.zodiacFlames.length; i++) {
      const flameGroup = this.zodiacFlames[i];
      const isLit = this.zodiacFlameStates[i];

      for (const child of flameGroup.children) {
        if (isLit) {
          const flicker = 0.6 + Math.sin(time * 8 + flameGroup.userData.basePhase) * 0.2
            + Math.sin(time * 13 + i) * 0.1;
          child.material.opacity = Math.max(0, flicker * (child.geometry.type === 'SphereGeometry' ? 0.4 : 0.8));
          // Flicker scale
          const scaleFlicker = 1 + Math.sin(time * 10 + i) * 0.1;
          child.scale.set(scaleFlicker, scaleFlicker, scaleFlicker);
        } else {
          // Extinguished - fade out
          child.material.opacity *= 0.92;
          child.scale.multiplyScalar(0.97);
        }
      }

      // Rotate flame to always face camera-ish
      flameGroup.lookAt(0, 2.2, -5);
    }

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.material.opacity = 0.2 + Math.abs(Math.sin(time * star.userData.speed + star.userData.phase)) * 0.7;
    }

    if (this.titlePlane) {
      const target = this.titleVisible ? 0.95 : 0;
      this.titlePlane.material.opacity += (target - this.titlePlane.material.opacity) * 0.08;
      this.titlePlane.position.y = 3.4 + Math.sin(time * 1.2) * 0.04;
    }

    // Real meteors - spawn from sky, streak downward with long trails
    if (this.meteorsActive) {
      if (this.meteorStartTime === null) this.meteorStartTime = time;
      const elapsed = time - this.meteorStartTime;
      for (const meteor of this.meteors) {
        const local = elapsed - meteor.userData.delay;
        const duration = 1.5;
        const visible = local >= 0 && local <= duration;

        if (visible) {
          const progress = local / duration;
          const ud = meteor.userData;

          // Move from spawn point along angle
          const dist = progress * ud.speed;
          meteor.position.set(
            ud.spawnX + Math.cos(ud.angle) * Math.cos(ud.declination) * dist,
            ud.spawnY + Math.sin(ud.declination) * dist,
            ud.spawnZ + Math.sin(ud.angle) * Math.cos(ud.declination) * dist
          );

          // Point in movement direction
          meteor.lookAt(
            ud.spawnX + Math.cos(ud.angle) * Math.cos(ud.declination) * (dist + 1),
            ud.spawnY + Math.sin(ud.declination) * (dist + 1),
            ud.spawnZ + Math.sin(ud.angle) * Math.cos(ud.declination) * (dist + 1)
          );

          // Fade in then out
          const fadeIn = Math.min(1, progress * 4);
          const fadeOut = Math.max(0, 1 - (progress - 0.65) / 0.35);
          const alpha = Math.min(fadeIn, fadeOut);

          // Head (child 0): bright white core
          meteor.children[0].material.opacity = alpha * 1.0;
          // Inner glow (child 1): blue-white
          meteor.children[1].material.opacity = alpha * 0.6;
          // Outer halo (child 2): soft blue
          meteor.children[2].material.opacity = alpha * 0.25;
          // Main trail cone (child 3): tapered opacity
          meteor.children[3].material.opacity = alpha * 0.45;
          // Core trail (child 4): bright inner line
          meteor.children[4].material.opacity = alpha * 0.7;
          // Particles (children 5+): fading along path
          for (let c = 5; c < meteor.children.length; c++) {
            const pIdx = c - 5;
            const pFade = Math.pow(0.8, pIdx);
            meteor.children[c].material.opacity = alpha * pFade * 0.5;
          }
        } else {
          for (const child of meteor.children) {
            child.material.opacity = 0;
          }
          if (!visible && local > duration) {
            meteor.position.set(0, -100, 0);
          }
        }
      }
      if (elapsed > 3.5) {
        this.meteorsActive = false;
      }
    }

    if (this.cracksActive) {
      if (this.cracksStartTime === null) this.cracksStartTime = time;
      const elapsed = time - this.cracksStartTime;
      for (let i = 0; i < this.groundCracks.length; i++) {
        const crack = this.groundCracks[i];
        const local = elapsed - i * 0.02;
        for (let c = 0; c < crack.children.length; c++) {
          const child = crack.children[c];
          const isEmber = child.geometry.type === 'SphereGeometry';
          if (local >= 0 && local <= 2.5) {
            const baseGlow = Math.sin(local * Math.PI * 0.4) * (isEmber ? 0.9 : 0.7);
            child.material.opacity = Math.max(0, baseGlow);
            if (isEmber) {
              child.position.y = 0.03 + Math.sin(time * 5 + c) * 0.02;
            }
          } else {
            child.material.opacity *= 0.95;
          }
        }
      }
      if (elapsed > 4.0) {
        this.cracksActive = false;
      }
    }

    if (this.templeGlowActive && this.templeGlow) {
      if (this.templeGlowStartTime === null) this.templeGlowStartTime = time;
      const elapsed = time - this.templeGlowStartTime;
      const glow = elapsed < 3.0 ? Math.sin(elapsed * 0.8) * 0.15 : 0.12 + Math.sin(time * 0.5) * 0.03;
      this.templeGlow.material.opacity = Math.max(0, glow);
    }

    if (this.rimLight) {
      this.rimLight.intensity = 2.8 + Math.sin(time * 0.7) * 0.4;
    }
    if (this.underRimLight) {
      this.underRimLight.intensity = 1.0 + Math.sin(time * 0.5) * 0.2;
    }
  }
}
