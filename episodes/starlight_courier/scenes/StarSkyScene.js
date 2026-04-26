import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class StarSkyScene extends SceneBase {
  constructor() {
    super('StarSkyScene');
    this.clouds = [];
    this.stars = [];
    this.windLines = [];
    this.cloudMode = 'clear'; // 'clear', 'cloudy', 'stormy'
  }

  build() {
    super.build();

    // Deep night sky background
    this.scene.background = new THREE.Color(0x050510);

    // Override default lights
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.2;
        l.color.setHex(0x1a1a3a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.2;
        l.color.setHex(0x8899bb);
        l.position.set(-5, 10, -5);
      }
    });

    // ---- Star field (dome of stars) ----
    const starDomeGeo = new THREE.SphereGeometry(180, 32, 32);
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 1024;
    starCanvas.height = 512;
    const sCtx = starCanvas.getContext('2d');
    sCtx.fillStyle = '#050510';
    sCtx.fillRect(0, 0, 1024, 512);

    // Draw many stars with varying brightness
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 1.5 + 0.3;
      const brightness = Math.random();
      const alpha = 0.3 + brightness * 0.7;
      sCtx.beginPath();
      sCtx.arc(x, y, r, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
      sCtx.fill();

      // Some stars have cross glow
      if (brightness > 0.7) {
        sCtx.strokeStyle = `rgba(255, 255, 220, ${alpha * 0.3})`;
        sCtx.lineWidth = 0.5;
        sCtx.beginPath();
        sCtx.moveTo(x - r * 3, y);
        sCtx.lineTo(x + r * 3, y);
        sCtx.moveTo(x, y - r * 3);
        sCtx.lineTo(x, y + r * 3);
        sCtx.stroke();
      }
    }

    const starTex = new THREE.CanvasTexture(starCanvas);
    const starDomeMat = new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide });
    const starDome = new THREE.Mesh(starDomeGeo, starDomeMat);
    this.scene.add(starDome);

    // ---- Moon (soft glow) ----
    const moonGeo = new THREE.SphereGeometry(3, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfffee0 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-30, 50, -80);
    this.scene.add(moon);

    // Moon glow
    const moonGlowGeo = new THREE.SphereGeometry(8, 16, 16);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfffee0,
      transparent: true,
      opacity: 0.08,
    });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGlow.position.copy(moon.position);
    this.scene.add(moonGlow);

    // Moon light
    const moonLight = new THREE.DirectionalLight(0xccddee, 0.4);
    moonLight.position.copy(moon.position);
    this.scene.add(moonLight);

    // ---- Distant city skyline (night version with lit windows) ----
    const cityGroup = new THREE.Group();
    const buildingColors = [0x1a1a2a, 0x151525, 0x1e1e30, 0x121220];
    for (let i = 0; i < 50; i++) {
      const w = 2 + Math.random() * 5;
      const d = 2 + Math.random() * 5;
      const h = 8 + Math.random() * 35;
      const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
      );
      const angle = (i / 50) * Math.PI * 2;
      const radius = 70 + Math.random() * 30;
      building.position.set(
        Math.cos(angle) * radius,
        h / 2 - 5,
        Math.sin(angle) * radius
      );
      cityGroup.add(building);

      // Windows (warm yellow glow, more lit at night)
      if (Math.random() > 0.2) {
        const windowMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        for (let wy = 2; wy < h - 2; wy += 3) {
          for (let wx = -w / 2 + 0.8; wx < w / 2; wx += 1.2) {
            if (Math.random() > 0.3) {
              const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), windowMat);
              win.position.set(
                wx + building.position.x,
                wy + building.position.y - h / 2,
                building.position.z + d / 2 + 0.05
              );
              win.rotation.y = angle;
              cityGroup.add(win);
            }
          }
        }
      }
    }
    this.scene.add(cityGroup);
    this.cityGroup = cityGroup;

    // ---- Clouds (layered, can be animated for storm/clear transitions) ----
    this.cloudGroups = [];
    const cloudConfigs = [
      { y: 12, count: 6, radius: 50, scale: 1.2, speed: 0.2, opacity: 0.25, color: 0x555566 },
      { y: 20, count: 5, radius: 60, scale: 1.8, speed: 0.15, opacity: 0.2, color: 0x444455 },
      { y: 30, count: 4, radius: 70, scale: 2.5, speed: 0.1, opacity: 0.15, color: 0x333344 },
    ];

    for (const layer of cloudConfigs) {
      for (let i = 0; i < layer.count; i++) {
        const cloudGroup = new THREE.Group();
        const angle = (i / layer.count) * Math.PI * 2 + Math.random() * 0.5;
        cloudGroup.position.set(
          Math.cos(angle) * layer.radius,
          layer.y + Math.random() * 5,
          Math.sin(angle) * layer.radius
        );
        const puffs = 4 + Math.floor(Math.random() * 4);
        for (let p = 0; p < puffs; p++) {
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry((1.5 + Math.random() * 1.5) * layer.scale, 12, 12),
            new THREE.MeshStandardMaterial({
              color: layer.color,
              transparent: true,
              opacity: layer.opacity,
              roughness: 1.0,
            })
          );
          puff.position.set(
            (Math.random() - 0.5) * 4 * layer.scale,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 2.5
          );
          cloudGroup.add(puff);
        }
        this.scene.add(cloudGroup);
        this.clouds.push({
          group: cloudGroup,
          speed: layer.speed,
          radius: layer.radius,
          angle,
          baseY: layer.y,
        });
      }
    }

    // ---- Dark storm clouds (for stormy scenes, initially hidden) ----
    this.stormClouds = [];
    for (let i = 0; i < 8; i++) {
      const stormGroup = new THREE.Group();
      const angle = (i / 8) * Math.PI * 2;
      stormGroup.position.set(
        Math.cos(angle) * 40,
        15 + Math.random() * 10,
        Math.sin(angle) * 40
      );
      const puffs = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(2 + Math.random() * 3, 12, 12),
          new THREE.MeshStandardMaterial({
            color: 0x222233,
            transparent: true,
            opacity: 0.35,
            roughness: 1.0,
          })
        );
        puff.position.set(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 4
        );
        stormGroup.add(puff);
      }
      stormGroup.visible = false;
      this.scene.add(stormGroup);
      this.stormClouds.push({
        group: stormGroup,
        speed: 0.3 + Math.random() * 0.2,
        angle,
        radius: 40 + Math.random() * 10,
      });
    }

    // ---- Wind lines (speed lines for flying effect) ----
    const windMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
    for (let i = 0; i < 25; i++) {
      const lineGeo = new THREE.BoxGeometry(0.02, 0.02, 3 + Math.random() * 8);
      const line = new THREE.Mesh(lineGeo, windMat);
      line.position.set(
        -30 + Math.random() * 60,
        -5 + Math.random() * 30,
        -20 + Math.random() * 40
      );
      this.scene.add(line);
      this.windLines.push({ mesh: line, speed: 8 + Math.random() * 12 });
    }

    // ---- Ground (visible below, dark) ----
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // ---- Distant trees (silhouettes) ----
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.95 });
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 50 + Math.random() * 40;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8), treeMat);
      trunk.position.set(tx, -1.25, tz);
      this.scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), treeMat);
      leaves.position.set(tx, 0.2, tz);
      this.scene.add(leaves);
    }

    // ---- Shooting star (occasional) ----
    this.shootingStar = null;

    return this.scene;
  }

  setCloudMode(mode) {
    this.cloudMode = mode;
    // Show/hide storm clouds based on mode
    for (const sc of this.stormClouds) {
      sc.group.visible = mode === 'stormy';
    }
    // Adjust ambient light
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        if (mode === 'stormy') {
          l.intensity = 0.1;
          l.color.setHex(0x111122);
        } else if (mode === 'cloudy') {
          l.intensity = 0.15;
          l.color.setHex(0x1a1a2a);
        } else {
          l.intensity = 0.2;
          l.color.setHex(0x1a1a3a);
        }
      }
    });
  }

  update(time, delta) {
    super.update(time, delta);

    // Rotate clouds slowly
    for (const cloud of this.clouds) {
      cloud.angle += cloud.speed * delta * 0.015;
      cloud.group.position.x = Math.cos(cloud.angle) * cloud.radius;
      cloud.group.position.z = Math.sin(cloud.angle) * cloud.radius;
    }

    // Storm clouds drift faster
    for (const sc of this.stormClouds) {
      if (sc.group.visible) {
        sc.angle += sc.speed * delta * 0.02;
        sc.group.position.x = Math.cos(sc.angle) * sc.radius;
        sc.group.position.z = Math.sin(sc.angle) * sc.radius;
      }
    }

    // Wind lines streak past
    for (const line of this.windLines) {
      line.mesh.position.z += line.speed * delta;
      if (line.mesh.position.z > 30) {
        line.mesh.position.z = -30;
        line.mesh.position.x = -30 + Math.random() * 60;
        line.mesh.position.y = -5 + Math.random() * 30;
      }
    }

    // Occasional shooting star
    if (!this.shootingStar && Math.random() < 0.002) {
      this._createShootingStar();
    }
    if (this.shootingStar) {
      this.shootingStar.update(delta);
      if (this.shootingStar.done) {
        this.scene.remove(this.shootingStar.mesh);
        this.shootingStar = null;
      }
    }
  }

  _createShootingStar() {
    const startX = -40 + Math.random() * 30;
    const startY = 30 + Math.random() * 20;
    const startZ = -40 + Math.random() * 20;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 0, -2, -1, 1]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Line(geo, mat);
    mesh.position.set(startX, startY, startZ);
    this.scene.add(mesh);

    this.shootingStar = {
      mesh,
      velocity: new THREE.Vector3(15 + Math.random() * 10, -8 - Math.random() * 5, 5 + Math.random() * 5),
      life: 1.0,
      done: false,
      update(delta) {
        this.mesh.position.addScaledVector(this.velocity, delta);
        this.life -= delta * 0.8;
        this.mesh.material.opacity = Math.max(0, this.life);
        if (this.life <= 0) {
          this.done = true;
        }
      },
    };
  }
}
