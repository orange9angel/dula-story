import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * DeepSpaceScene — 太空相遇战场
 * 星空背景、星云、远处行星，以及基于 scheduleDoorEvent 调度的飞船弹道。
 */

function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createStarfield(count = 4000, size = 0.5, radiusMin = 80, radiusMax = 260, colorSet = [0xffffff, 0xaaccff, 0xffddaa]) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = colorSet.map((c) => new THREE.Color(c));

  for (let i = 0; i < count; i++) {
    const r = radiusMin + Math.random() * (radiusMax - radiusMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const c = palette[Math.floor(Math.random() * palette.length)];
    const dim = 0.65 + Math.random() * 0.35;
    colors[i * 3] = c.r * dim;
    colors[i * 3 + 1] = c.g * dim;
    colors[i * 3 + 2] = c.b * dim;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size,
      map: createStarTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

function createNebulaCloud(color, size = 90, position = new THREE.Vector3()) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const c = new THREE.Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  const grad = ctx.createRadialGradient(256, 256, 12, 256, 256, 240);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.34)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.14)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // subtle cloud wisps
  for (let i = 0; i < 18; i++) {
    const x = 256 + (Math.random() - 0.5) * 360;
    const y = 256 + (Math.random() - 0.5) * 360;
    const rad = 20 + Math.random() * 70;
    const w = ctx.createRadialGradient(x, y, 0, x, y, rad);
    w.addColorStop(0, `rgba(${r},${g},${b},${0.08 + Math.random() * 0.1})`);
    w.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = w;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.position.copy(position);
  mesh.lookAt(0, 0, 0);
  return mesh;
}

function createPlanetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // base
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0, '#1a2744');
  baseGrad.addColorStop(0.45, '#2a3a5a');
  baseGrad.addColorStop(0.55, '#3a4a6a');
  baseGrad.addColorStop(1, '#1a2744');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // bands
  for (let i = 0; i < 12; i++) {
    const y = Math.random() * 512;
    const h = 8 + Math.random() * 28;
    const band = ctx.createLinearGradient(0, y, 1024, y);
    band.addColorStop(0, 'rgba(40,60,90,0)');
    band.addColorStop(0.5, `rgba(${60 + Math.random() * 40},${80 + Math.random() * 40},${120 + Math.random() * 40},0.35)`);
    band.addColorStop(1, 'rgba(40,60,90,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, y, 1024, h);
  }

  // craters
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const rad = 6 + Math.random() * 22;
    const shade = Math.random() > 0.5 ? '0,0,0' : '255,255,255';
    const crater = ctx.createRadialGradient(x, y, rad * 0.3, x, y, rad);
    crater.addColorStop(0, `rgba(${shade},0.25)`);
    crater.addColorStop(0.7, `rgba(${shade},0.08)`);
    crater.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = crater;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 160, 256, 256, 256);
  grad.addColorStop(0, 'rgba(160,180,220,0)');
  grad.addColorStop(0.25, 'rgba(160,180,220,0.18)');
  grad.addColorStop(0.55, 'rgba(140,160,210,0.35)');
  grad.addColorStop(0.85, 'rgba(160,180,220,0.12)');
  grad.addColorStop(1, 'rgba(160,180,220,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

function createRadialTexture(stops, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const EXPLOSION_FLASH_TEXTURE = createRadialTexture(
  [[0, 'rgba(255,255,240,1)'], [0.35, 'rgba(255,220,170,0.55)'], [1, 'rgba(255,120,40,0)']],
  128
);
const EXPLOSION_FIRE_TEXTURE = createRadialTexture(
  [[0, 'rgba(255,240,180,0.95)'], [0.2, 'rgba(255,150,50,0.75)'], [0.55, 'rgba(200,50,15,0.35)'], [1, 'rgba(60,10,5,0)']],
  256
);
const EXPLOSION_SMOKE_TEXTURE = createRadialTexture(
  [[0, 'rgba(75,75,85,0.6)'], [0.4, 'rgba(45,45,52,0.28)'], [1, 'rgba(20,20,25,0)']],
  256
);

function createMoon() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a4a52';
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const rad = 2 + Math.random() * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.05 })
  );
  moon.name = 'Moon';
  return moon;
}

function createPlanet() {
  const group = new THREE.Group();

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(12, 48, 48),
    new THREE.MeshStandardMaterial({
      map: createPlanetTexture(),
      roughness: 0.85,
      metalness: 0.12,
    })
  );
  planet.name = 'Planet';
  planet.castShadow = true;
  group.add(planet);

  // atmosphere glow
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(13.4, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0x88aadd,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
  );
  atmo.name = 'Atmosphere';
  group.add(atmo);

  // ring
  const ringTex = createRingTexture();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(16, 22, 64),
    new THREE.MeshBasicMaterial({
      map: ringTex,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = 0.22;
  ring.name = 'Ring';
  group.add(ring);

  // moon
  const moon = createMoon();
  moon.position.set(28, 1.5, 4);
  group.add(moon);

  group.userData = { planet, atmo, ring, moon };
  return group;
}

export class DeepSpaceScene extends SceneBase {
  constructor() {
    super('DeepSpaceScene');
    this.projectiles = [];
    this.explosions = [];
    this.muzzleFlashes = [];
    this.pendingEvents = [];
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = null;

    // Lights
    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.35;
        l.color.setHex(0x1a1a3a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.65;
        l.color.setHex(0xccddee);
        l.position.set(20, 10, 30);
      }
    });

    const keyLight = new THREE.DirectionalLight(0xaaccff, 0.55);
    keyLight.position.set(-20, 10, -10);
    this.scene.add(keyLight);

    // Starfields — dense distant field + brighter nearby field
    this.starfield = createStarfield(5000, 0.32, 90, 280, [0xffffff, 0xaaccff, 0xffddaa]);
    this.scene.add(this.starfield);
    this.brightStars = createStarfield(800, 0.65, 60, 180, [0xffffff, 0xbbddff, 0xfff4dd]);
    this.scene.add(this.brightStars);

    // Planet system
    this.planetSystem = createPlanet();
    this.planetSystem.position.set(50, -15, -80);
    this.scene.add(this.planetSystem);
    this.planet = this.planetSystem.userData.planet;
    this.planetRing = this.planetSystem.userData.ring;
    this.planetMoon = this.planetSystem.userData.moon;

    return this.scene;
  }

  /**
   * 通过 DoorEvent 调度火控事件。
   * action 格式：
   *   fire|attackerName|targetName|type|speed
   *   explode|targetName|size
   *   hit|targetName|duration
   */
  scheduleDoorEvent(ev) {
    const { action, startTime, duration } = ev;
    if (!action) return;
    // Support both `fire:Attacker:Target:plasma:25` (story tag) and pipe-separated forms.
    const parts = action.split(/[:|]/).map((s) => s.trim());
    const type = parts[0];

    if (type === 'fire') {
      const [, attackerName, targetName, weaponType, speedStr] = parts;
      const speed = parseFloat(speedStr) || 30;
      this.pendingEvents.push({
        type: 'fire',
        startTime,
        duration,
        attackerName,
        targetName,
        weaponType,
        speed,
      });
    } else if (type === 'explode') {
      const [, targetName, sizeStr] = parts;
      this.pendingEvents.push({
        type: 'explode',
        startTime,
        size: parseFloat(sizeStr) || 1.0,
        targetName,
      });
    } else if (type === 'hit') {
      const [, targetName, durStr] = parts;
      this.pendingEvents.push({
        type: 'hit',
        startTime,
        duration: parseFloat(durStr) || 0.3,
        targetName,
      });
    }
  }

  findCharacter(name) {
    return this.characters.find((c) => c.name === name);
  }

  spawnProjectile(attacker, target, weaponType, speed) {
    const startPos = attacker.getMuzzlePosition ? attacker.getMuzzlePosition(Math.random() > 0.5 ? 1 : -1) : attacker.mesh.position.clone();
    const endPos = target.mesh.position.clone();
    const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();

    let color;
    let coreRadius = 0.05;
    let coreLength = 0.5;
    let glowRadius = 0.2;
    let lightIntensity = 2.0;
    let lightDistance = 5.0;

    if (weaponType === 'plasma') {
      color = 0x66aaff;
      coreRadius = 0.14;
      coreLength = 1.4;
      glowRadius = 0.55;
      lightIntensity = 5.0;
      lightDistance = 12.0;
    } else if (weaponType === 'missile') {
      color = 0xff6633;
      coreRadius = 0.12;
      coreLength = 0.85;
      glowRadius = 0.3;
      lightIntensity = 3.0;
      lightDistance = 7.0;
    } else if (weaponType === 'banana') {
      color = 0xffdd33;
      coreRadius = 0.13;
      coreLength = 0.95;
      glowRadius = 0.32;
      lightIntensity = 2.5;
      lightDistance = 6.0;
    } else {
      color = 0xffffff;
    }

    // Projectile group with core + glow + light so it's visible against black space
    const group = new THREE.Group();
    group.position.copy(startPos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    const coreGeo = weaponType === 'missile' || weaponType === 'banana'
      ? new THREE.CapsuleGeometry(coreRadius, coreLength, 4, 10)
      : new THREE.CylinderGeometry(coreRadius * 0.6, coreRadius, coreLength, 12);
    const core = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
    );
    group.add(core);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(glowRadius, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(glow);

    const light = new THREE.PointLight(color, lightIntensity, lightDistance);
    group.add(light);

    // Extra engine flare for missiles
    if (weaponType === 'missile') {
      const flare = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 12),
        new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
      );
      flare.rotation.x = Math.PI / 2;
      flare.position.set(0, -coreLength * 0.6, 0);
      group.add(flare);
    }

    this.scene.add(group);

    // Muzzle flash
    this.spawnMuzzleFlash(startPos, color, weaponType === 'plasma' ? 1.3 : 1.0);

    // Long glowing trail
    const trailLength = weaponType === 'plasma' ? 4.0 : 2.4;
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius * 0.6, coreRadius * 2.2, trailLength, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
    );
    trail.quaternion.copy(group.quaternion);
    trail.position.copy(startPos).add(dir.clone().multiplyScalar(-trailLength * 0.45));
    this.scene.add(trail);

    this.projectiles.push({
      mesh: group,
      core,
      glow,
      light,
      trail,
      dir,
      speed,
      startPos: startPos.clone(),
      target,
      weaponType,
      active: true,
      life: 3.0,
    });
  }

  spawnMuzzleFlash(position, color, size = 1.0) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Bright core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 * size, 14, 14),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(core);

    // Expanding shockwave ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1 * size, 0.25 * size, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.lookAt(new THREE.Vector3(0, 0, 1)); // billboard-ish; caller can orient if needed
    group.add(ring);

    // Spark particles
    const sparkGeo = new THREE.CylinderGeometry(0.006 * size, 0.002 * size, 0.18 * size, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const sparks = [];
    for (let i = 0; i < 12; i++) {
      const spark = new THREE.Mesh(sparkGeo, sparkMat.clone());
      const angle = (i / 12) * Math.PI * 2;
      spark.rotation.z = Math.PI / 2;
      spark.rotation.y = angle;
      spark.userData.angle = angle;
      spark.userData.speed = 2 + Math.random() * 3;
      group.add(spark);
      sparks.push(spark);
    }

    const light = new THREE.PointLight(color, 6.0 * size, 9 * size);
    group.add(light);

    this.scene.add(group);
    this.muzzleFlashes.push({ group, core, ring, sparks, light, age: 0, maxAge: 0.14, size });
  }

  spawnExplosion(position, size = 1.0) {
    const group = new THREE.Group();
    group.position.copy(position);
    const maxAge = 1.0;

    // Initial white-hot flash
    const flashMat = new THREE.SpriteMaterial({
      map: EXPLOSION_FLASH_TEXTURE,
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flash = new THREE.Sprite(flashMat);
    flash.scale.setScalar(0.2 * size);
    group.add(flash);

    // Billowing fireball sprites
    const fireballs = [];
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.SpriteMaterial({
        map: EXPLOSION_FIRE_TEXTURE,
        color: new THREE.Color().setHSL(0.04 + Math.random() * 0.08, 1.0, 0.5),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.25 * size;
      sprite.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 0.15 * size, Math.sin(angle) * dist);
      const s = (0.7 + Math.random() * 0.7) * size;
      sprite.scale.set(s, s, s);
      sprite.userData = {
        angle,
        baseDist: dist,
        driftY: 0.25 + Math.random() * 0.6,
        expand: 1.6 + Math.random() * 1.8,
        spin: (Math.random() - 0.5) * 3,
      };
      group.add(sprite);
      fireballs.push(sprite);
    }

    // Dark smoke puffs
    const smoke = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.SpriteMaterial({
        map: EXPLOSION_SMOKE_TEXTURE,
        color: 0x888899,
        transparent: true,
        opacity: 0.5,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.2 * size;
      sprite.position.set(Math.cos(angle) * dist, Math.random() * 0.15 * size, Math.sin(angle) * dist);
      const s = (0.8 + Math.random() * 0.7) * size;
      sprite.scale.set(s, s, s);
      sprite.userData = { angle, driftY: 0.12 + Math.random() * 0.2, expand: 1.4 + Math.random() * 1.0 };
      group.add(sprite);
      smoke.push(sprite);
    }

    // Flying debris sparks
    const debrisCount = 32;
    const debrisGeo = new THREE.BufferGeometry();
    const dPos = new Float32Array(debrisCount * 3);
    const dVel = [];
    const dColors = new Float32Array(debrisCount * 3);
    const palette = [new THREE.Color(0xffaa33), new THREE.Color(0xff6633), new THREE.Color(0xffdd88), new THREE.Color(0xffffff)];
    for (let i = 0; i < debrisCount; i++) {
      dPos[i * 3] = 0;
      dPos[i * 3 + 1] = 0;
      dPos[i * 3 + 2] = 0;
      const speed = (5 + Math.random() * 12) * size;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dVel.push(
        new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta),
          speed * Math.cos(phi)
        )
      );
      const c = palette[Math.floor(Math.random() * palette.length)];
      dColors[i * 3] = c.r;
      dColors[i * 3 + 1] = c.g;
      dColors[i * 3 + 2] = c.b;
    }
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    debrisGeo.setAttribute('color', new THREE.BufferAttribute(dColors, 3));
    const debrisMat = new THREE.PointsMaterial({
      size: 0.12 * size,
      map: createStarTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const debris = new THREE.Points(debrisGeo, debrisMat);
    group.add(debris);

    // Expanding shockwave ring
    const ringTex = createRingTexture();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12 * size, 0.32 * size, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffaa55,
        map: ringTex,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Intense burst light
    const light = new THREE.PointLight(0xffaa33, 12.0 * size, 20 * size);
    group.add(light);

    this.scene.add(group);
    this.explosions.push({
      group,
      flash,
      fireballs,
      smoke,
      debris,
      velocities: dVel,
      ring,
      light,
      size,
      age: 0,
      maxAge,
    });
  }

  update(time, delta) {
    super.update(time, delta);

    // Activate pending fire events
    while (this.pendingEvents.length > 0 && this.pendingEvents[0].startTime <= time) {
      const ev = this.pendingEvents.shift();
      if (ev.type === 'fire') {
        const attacker = this.findCharacter(ev.attackerName);
        const target = this.findCharacter(ev.targetName);
        if (attacker && target) {
          this.spawnProjectile(attacker, target, ev.weaponType, ev.speed);
        }
      } else if (ev.type === 'explode') {
        const target = this.findCharacter(ev.targetName);
        if (target) this.spawnExplosion(target.mesh.position.clone(), ev.size);
      } else if (ev.type === 'hit') {
        const target = this.findCharacter(ev.targetName);
        if (target && target.flashHit) target.flashHit(ev.duration);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      const step = p.dir.clone().multiplyScalar(p.speed * delta);
      p.mesh.position.add(step);
      p.trail.position.add(step);

      // Banana/missile spin
      if (p.weaponType === 'banana') {
        p.mesh.rotateZ(delta * 8);
      }

      // Homing for missiles
      if (p.weaponType === 'missile' && p.target && p.target.mesh) {
        const toTarget = new THREE.Vector3().subVectors(p.target.mesh.position, p.mesh.position).normalize();
        p.dir.lerp(toTarget, delta * 2).normalize();
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.dir);
        p.trail.quaternion.copy(p.mesh.quaternion);
      }

      p.life -= delta;
      const distToTarget = p.target ? p.mesh.position.distanceTo(p.target.mesh.position) : Infinity;

      if (distToTarget < (p.weaponType === 'plasma' ? 1.0 : 0.9) || p.life <= 0) {
        // Hit / expire
        this.spawnExplosion(p.mesh.position.clone(), p.weaponType === 'missile' || p.weaponType === 'banana' ? 1.2 : 0.7);
        if (p.target && p.target.flashHit) p.target.flashHit(0.25);
        this.scene.remove(p.mesh);
        this.scene.remove(p.trail);
        p.active = false;
        this.projectiles.splice(i, 1);
      }
    }

    // Update muzzle flashes
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const flash = this.muzzleFlashes[i];
      flash.age += delta;
      const t = Math.min(1, flash.age / flash.maxAge);
      const ease = 1 - Math.pow(1 - t, 2);
      const fade = 1 - t;

      // Core blooms then fades
      flash.core.scale.setScalar(1 + ease * 2.5);
      flash.core.material.opacity = fade;

      // Shockwave ring expands outward
      if (flash.ring) {
        const ringScale = 1 + ease * 6;
        flash.ring.scale.setScalar(ringScale);
        flash.ring.material.opacity = 0.7 * fade;
      }

      // Sparks fly outward
      if (flash.sparks) {
        for (const spark of flash.sparks) {
          const dist = ease * spark.userData.speed * 0.25 * flash.size;
          spark.position.x = Math.cos(spark.userData.angle) * dist;
          spark.position.y = Math.sin(spark.userData.angle) * dist;
          spark.scale.y = 1 + ease * 0.6;
          spark.material.opacity = fade * 0.9;
        }
      }

      flash.light.intensity = 6.0 * flash.size * fade;
      if (flash.age >= flash.maxAge) {
        this.scene.remove(flash.group);
        this.muzzleFlashes.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += delta;
      const t = Math.min(1, ex.age / ex.maxAge);
      const fade = 1 - t;

      // White-hot flash blooms and fades quickly
      if (ex.flash) {
        const flashT = Math.min(1, ex.age / 0.12);
        ex.flash.scale.setScalar((0.2 + flashT * 6) * ex.size);
        ex.flash.material.opacity = 1 - flashT;
      }

      // Fireballs expand and drift upward like a real blast
      for (const fb of ex.fireballs) {
        const ud = fb.userData;
        const dist = ud.baseDist + t * ud.expand * ex.size * 0.9;
        fb.position.x = Math.cos(ud.angle + t * ud.spin) * dist;
        fb.position.z = Math.sin(ud.angle + t * ud.spin) * dist;
        fb.position.y += delta * ud.driftY * ex.size * 0.25;
        const s = (1 + t * ud.expand) * ex.size;
        fb.scale.set(s, s, s);
        fb.material.opacity = Math.max(0, 0.9 * (1 - t * 1.35));
      }

      // Smoke puffs billow out slower than fire
      for (const sm of ex.smoke) {
        const ud = sm.userData;
        const dist = t * ud.expand * ex.size * 0.7;
        sm.position.x = Math.cos(ud.angle) * dist;
        sm.position.z = Math.sin(ud.angle) * dist;
        sm.position.y += delta * ud.driftY * ex.size * 0.18;
        const s = (1 + t * ud.expand) * ex.size;
        sm.scale.set(s, s, s);
        sm.material.opacity = Math.max(0, 0.5 * fade);
      }

      // Debris sparks fly outward with drag
      if (ex.debris) {
        const positions = ex.debris.geometry.attributes.position.array;
        for (let j = 0; j < ex.velocities.length; j++) {
          const v = ex.velocities[j];
          v.multiplyScalar(Math.max(0.25, 1 - delta * 1.8));
          positions[j * 3] += v.x * delta;
          positions[j * 3 + 1] += v.y * delta;
          positions[j * 3 + 2] += v.z * delta;
        }
        ex.debris.geometry.attributes.position.needsUpdate = true;
        ex.debris.material.opacity = Math.max(0, 0.95 * fade);
      }

      // Thin shockwave ring
      if (ex.ring) {
        const rs = 1 + t * 10;
        ex.ring.scale.set(rs, rs, 1);
        ex.ring.material.opacity = 0.85 * fade;
      }

      // Light fades from white-hot to orange ember
      if (ex.light) {
        ex.light.intensity = 12.0 * ex.size * fade;
        ex.light.color.setHSL(0.08 + t * 0.06, 1.0, 0.45 + fade * 0.15);
      }

      if (ex.age >= ex.maxAge) {
        this.scene.remove(ex.group);
        this.explosions.splice(i, 1);
      }
    }

    // Slow starfield rotation for parallax
    if (this.starfield) {
      this.starfield.rotation.y += delta * 0.005;
    }
    if (this.brightStars) {
      this.brightStars.rotation.y += delta * 0.008;
      this.brightStars.rotation.x += delta * 0.0015;
    }

    // Planet and moon animation
    if (this.planet) {
      this.planet.rotation.y += delta * 0.008;
    }
    if (this.planetRing) {
      this.planetRing.rotation.z += delta * 0.003;
    }
    if (this.planetMoon) {
      const moonTime = time * 0.15;
      this.planetMoon.position.set(Math.cos(moonTime) * 28, Math.sin(moonTime * 0.7) * 3, Math.sin(moonTime) * 28);
      this.planetMoon.rotation.y += delta * 0.02;
    }
  }
}
