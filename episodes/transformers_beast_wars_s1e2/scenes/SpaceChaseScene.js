import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

function cloneAsset(name) {
  const source = window.__transformerAssets?.[name];
  if (!source) {
    console.warn(`[SpaceChaseScene] Asset not preloaded: ${name}`);
    return new THREE.Group();
  }
  return source.clone();
}

/**
 * SpaceChaseScene — 太空追逐
 * 使用带完整 PBR 贴图的 Quaternius 飞船，配合环境光、轮廓线、星尘与背景星云。
 */
export class SpaceChaseScene extends SceneBase {
  constructor() {
    super('SpaceChaseScene');
    this.stars = null;
    this.dust = null;
    this.maximalShip = null;
    this.predaconShip = null;
    this.asteroids = [];
    this.nebula = null;
  }

  addCharacter(character) {
    // 太空追逐场景不需要渲染角色，只保留引用用于对话逻辑
    if (!this.characters.includes(character)) {
      this.characters.push(character);
    }
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x050818);
    this.scene.fog = new THREE.FogExp2(0x050818, 0.006);

    // 更强的环境光 + 主方向光（模拟远处星云反射）
    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 1.2;
        l.color.setHex(0x3a4a8a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 3.0;
        l.color.setHex(0xf0f8ff);
        l.position.set(-20, 30, 20);
      }
    });

    // 全局填充光，让模型正面纹理可见
    const fillLight = new THREE.PointLight(0xccddff, 2.8, 80, 1.1);
    fillLight.position.set(0, 10, 12);
    this.scene.add(fillLight);

    // 前景轮廓光
    const frontRim = new THREE.PointLight(0xfff0d0, 1.6, 40, 1.4);
    frontRim.position.set(0, 6, 18);
    this.scene.add(frontRim);

    // 多层星空
    this._createStars();

    // 背景星云
    this._createNebula();

    // Maximal 飞船 — Quaternius Zenith，保留原始贴图（稍微放大让追逐更清楚）
    this.maximalShip = cloneAsset('maximal_ship');
    this.maximalShip.position.set(-2.2, 0.25, -8);
    this.maximalShip.rotation.set(0, -0.4, 0);
    this.maximalShip.scale.set(0.32, 0.32, 0.32);
    this.maximalShip.userData.baseX = -2.2;
    this.maximalShip.userData.baseZ = -8;
    this._prepareShipMaterials(this.maximalShip, 0x33aaff);
    this._addEngineGlow(this.maximalShip, 0x33aaff, -1.7);
    // 团队色侧光
    const maxRim = new THREE.PointLight(0x66ccff, 1.4, 16, 1.5);
    maxRim.position.set(-1.0, 1.2, -4.5);
    this.scene.add(maxRim);
    this.scene.add(this.maximalShip);

    // Predacon 飞船 — Quaternius Executioner（稍微放大让追逐更清楚）
    this.predaconShip = cloneAsset('predacon_ship');
    this.predaconShip.position.set(2.4, -0.2, -15);
    this.predaconShip.rotation.set(0, 0.4, 0);
    this.predaconShip.scale.set(0.35, 0.35, 0.35);
    this.predaconShip.userData.baseX = 2.4;
    this.predaconShip.userData.baseZ = -15;
    this._prepareShipMaterials(this.predaconShip, 0xff3355);
    this._addEngineGlow(this.predaconShip, 0xff3355, -1.7);
    const predRim = new THREE.PointLight(0xff5566, 1.4, 16, 1.5);
    predRim.position.set(1.0, 1.2, -5.2);
    this.scene.add(predRim);
    this.scene.add(this.predaconShip);

    // 小行星带
    this._createAsteroids();

    // 远处行星（带程序地表、云层、大气辉光和卫星）—— 推远、放小、偏右下
    this.planetPos = new THREE.Vector3(35, -48, -185);
    const planetPos = this.planetPos;
    const planetTextures = this._createPlanetTextures();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(26, 96, 96),
      new THREE.MeshStandardMaterial({
        map: planetTextures.map,
        bumpMap: planetTextures.bump,
        bumpScale: 0.6,
        roughnessMap: planetTextures.roughness,
        roughness: 0.9,
        metalness: 0.02,
      })
    );
    planet.position.copy(planetPos);
    this.scene.add(planet);

    // 云层
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(27.2, 80, 80),
      new THREE.MeshStandardMaterial({
        map: planetTextures.cloud,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    clouds.position.copy(planetPos);
    this.scene.add(clouds);
    this.clouds = clouds;

    // 行星大气辉光（双层）
    const atmoInner = new THREE.Mesh(
      new THREE.SphereGeometry(28, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    atmoInner.position.copy(planetPos);
    this.scene.add(atmoInner);
    const atmoOuter = new THREE.Mesh(
      new THREE.SphereGeometry(31, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    atmoOuter.position.copy(planetPos);
    this.scene.add(atmoOuter);

    // 卫星
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x9a9a9a,
        roughness: 0.98,
        metalness: 0.0,
      })
    );
    moon.position.set(planetPos.x + 22, planetPos.y + 8, planetPos.z + 35);
    this.scene.add(moon);
    this.moon = moon;

    // 行星环
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 512;
    ringCanvas.height = 512;
    const rctx = ringCanvas.getContext('2d');
    const rg = rctx.createRadialGradient(256, 256, 70, 256, 256, 250);
    rg.addColorStop(0, 'rgba(180, 200, 220, 0)');
    rg.addColorStop(0.25, 'rgba(180, 200, 220, 0.08)');
    rg.addColorStop(0.45, 'rgba(160, 180, 210, 0.18)');
    rg.addColorStop(0.55, 'rgba(160, 180, 210, 0.18)');
    rg.addColorStop(0.75, 'rgba(180, 200, 220, 0.08)');
    rg.addColorStop(1, 'rgba(180, 200, 220, 0)');
    rctx.fillStyle = rg;
    rctx.fillRect(0, 0, 512, 512);
    const ringTex = new THREE.CanvasTexture(ringCanvas);
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), ringMat);
    ring.position.copy(planetPos);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = 0.25;
    this.scene.add(ring);

    // 远处星舰残骸 / 废弃空间站（低模块组合）
    this._createDerelict();

    // 远景缓慢飘过的星尘带，增强纵深
    this._createDustCloud();

    // 高速飞行速度线
    this._createSpeedLines();

    return this.scene;
  }

  _createDerelict() {
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x4a5060,
      roughness: 0.7,
      metalness: 0.6,
    });
    const group = new THREE.Group();
    // 主体骨架
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 6), debrisMat);
    group.add(hull);
    // 折断的翼
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 1.5), debrisMat);
    wingL.position.set(-2, 0.1, -0.5);
    wingL.rotation.z = 0.3;
    wingL.rotation.y = 0.2;
    group.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.5), debrisMat);
    wingR.position.set(1.8, -0.1, 0.8);
    wingR.rotation.z = -0.25;
    group.add(wingR);
    // 断裂的引擎舱
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.8, 12), debrisMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(0.6, 0.2, -3.2);
    engine.rotation.z = 0.4;
    group.add(engine);

    group.position.set(-35, 12, -95);
    group.rotation.set(0.4, 0.8, -0.2);
    group.scale.setScalar(1.2);
    this.scene.add(group);
  }

  _createSoftGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createDustCloud() {
    const geo = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = -20 - Math.random() * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8899aa,
      size: 0.35,
      map: this._createSoftGlowTexture(),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.dustCloud = new THREE.Points(geo, mat);
    this.scene.add(this.dustCloud);
  }

  _createSpeedLines() {
    // 细长速度线，沿 Z 轴朝相机飞，强化高速追逐感
    const count = 120;
    const positions = new Float32Array(count * 6); // 2 points per line
    const offsets = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 35;
      const z = -30 - Math.random() * 80;
      const len = 2 + Math.random() * 6;
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + len;
      offsets[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.speedLines = new THREE.LineSegments(geo, mat);
    this.speedLines.userData.offsets = offsets;
    this.scene.add(this.speedLines);
  }

  _createStars() {
    const glowTex = this._createSoftGlowTexture();

    // 远景小星
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2200;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 240;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 240;
      sizes[i] = 0.12 + Math.random() * 0.35;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      map: glowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // 近景亮星
    const brightGeo = new THREE.BufferGeometry();
    const brightCount = 160;
    const bp = new Float32Array(brightCount * 3);
    const bs = new Float32Array(brightCount);
    for (let i = 0; i < brightCount; i++) {
      bp[i * 3] = (Math.random() - 0.5) * 140;
      bp[i * 3 + 1] = (Math.random() - 0.5) * 90;
      bp[i * 3 + 2] = (Math.random() - 0.5) * 140;
      bs[i] = 0.45 + Math.random() * 0.8;
    }
    brightGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    brightGeo.setAttribute('size', new THREE.BufferAttribute(bs, 1));
    const brightMat = new THREE.PointsMaterial({
      color: 0xcceeff,
      size: 0.7,
      map: glowTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(brightGeo, brightMat);
    this.scene.add(this.dust);
  }

  _createPlanetTextures() {
    const size = 1024;
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = size; mapCanvas.height = size;
    const mctx = mapCanvas.getContext('2d');

    // 海洋底色
    const oceanGrad = mctx.createLinearGradient(0, 0, 0, size);
    oceanGrad.addColorStop(0, '#1a3048');
    oceanGrad.addColorStop(0.5, '#142a40');
    oceanGrad.addColorStop(1, '#1a3048');
    mctx.fillStyle = oceanGrad;
    mctx.fillRect(0, 0, size, size);

    // 大陆斑块（用多个不规则圆叠加）
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 60 + Math.random() * 140;
      const landGrad = mctx.createRadialGradient(x, y, 0, x, y, r);
      const greenHue = 90 + Math.random() * 50;
      landGrad.addColorStop(0, `hsla(${greenHue}, 35%, 28%, 0.95)`);
      landGrad.addColorStop(0.6, `hsla(${greenHue}, 30%, 22%, 0.75)`);
      landGrad.addColorStop(1, 'hsla(100, 25%, 18%, 0)');
      mctx.fillStyle = landGrad;
      mctx.beginPath();
      mctx.arc(x, y, r, 0, Math.PI * 2);
      mctx.fill();
    }

    // 极地冰盖
    const iceGrad = mctx.createLinearGradient(0, 0, 0, size);
    iceGrad.addColorStop(0, 'rgba(220, 240, 255, 0.55)');
    iceGrad.addColorStop(0.12, 'rgba(220, 240, 255, 0.0)');
    iceGrad.addColorStop(0.88, 'rgba(220, 240, 255, 0.0)');
    iceGrad.addColorStop(1, 'rgba(220, 240, 255, 0.55)');
    mctx.fillStyle = iceGrad;
    mctx.fillRect(0, 0, size, size);

    // 陨石坑/暗斑
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 10 + Math.random() * 35;
      const cg = mctx.createRadialGradient(x, y, 0, x, y, r);
      cg.addColorStop(0, 'rgba(10, 15, 25, 0.5)');
      cg.addColorStop(0.7, 'rgba(20, 30, 45, 0.25)');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = cg;
      mctx.beginPath();
      mctx.arc(x, y, r, 0, Math.PI * 2);
      mctx.fill();
    }

    const mapTex = new THREE.CanvasTexture(mapCanvas);
    mapTex.colorSpace = THREE.SRGBColorSpace;

    // bump/roughness：用灰度版
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size; bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d');
    bctx.drawImage(mapCanvas, 0, 0);
    bctx.globalCompositeOperation = 'saturation';
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, size, size);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size; roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d');
    rctx.fillStyle = '#cccccc';
    rctx.fillRect(0, 0, size, size);
    // 陆地更粗糙
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rad = 60 + Math.random() * 140;
      const g = rctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(160,160,160,0.6)');
      g.addColorStop(1, 'rgba(200,200,200,0)');
      rctx.fillStyle = g;
      rctx.beginPath();
      rctx.arc(x, y, rad, 0, Math.PI * 2);
      rctx.fill();
    }
    const roughTex = new THREE.CanvasTexture(roughCanvas);

    // 云层纹理
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = size; cloudCanvas.height = size;
    const cctx = cloudCanvas.getContext('2d');
    cctx.fillStyle = 'rgba(0,0,0,0)';
    cctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 40 + Math.random() * 120;
      const g = cctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);

    return { map: mapTex, bump: bumpTex, roughness: roughTex, cloud: cloudTex };
  }

  _createNebula() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    // 深空底色（用径向渐变避免带状）
    const bg = ctx.createRadialGradient(
      canvas.width * 0.5, canvas.height * 0.45, 0,
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
    );
    bg.addColorStop(0, '#080d22');
    bg.addColorStop(0.5, '#050818');
    bg.addColorStop(1, '#02040c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 随机撒大量细小星点，打破网格感
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const s = 0.5 + Math.random() * 1.5;
      ctx.fillStyle = `rgba(200,220,255,${0.05 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    // 星云斑块（更碎、更淡、更多层次）
    for (let i = 0; i < 160; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 40 + Math.random() * 220;
      const hue = Math.random() > 0.5 ? 210 + Math.random() * 50 : 250 + Math.random() * 60;
      const alpha = 0.03 + Math.random() * 0.05;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${hue}, 65%, 55%, ${alpha})`);
      g.addColorStop(0.55, `hsla(${hue}, 55%, 40%, ${alpha * 0.4})`);
      g.addColorStop(1, `hsla(${hue}, 45%, 30%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 叠加一层极淡的噪声点，进一步消除平滑渐变带
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.03})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this.nebula = new THREE.Mesh(new THREE.SphereGeometry(95, 40, 40), mat);
    this.scene.add(this.nebula);
  }

  _createAsteroids() {
    const rockCanvas = document.createElement('canvas');
    rockCanvas.width = 256;
    rockCanvas.height = 256;
    const ctx = rockCanvas.getContext('2d');
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#626262' : '#303030';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const rockTex = new THREE.CanvasTexture(rockCanvas);
    const rockMat = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.95, metalness: 0.1 });
    const geom = new THREE.IcosahedronGeometry(1, 0);
    // 小行星带分两层：近处小碎石，远处大岩石
    for (let i = 0; i < 28; i++) {
      const mesh = new THREE.Mesh(geom, rockMat);
      const angle = Math.random() * Math.PI * 2;
      const layer = Math.random();
      const dist = layer < 0.6 ? 3 + Math.random() * 10 : 12 + Math.random() * 28;
      const y = (Math.random() - 0.5) * (layer < 0.6 ? 5 : 14);
      mesh.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist - 8);
      const s = layer < 0.6 ? 0.08 + Math.random() * 0.22 : 0.25 + Math.random() * 0.6;
      mesh.scale.set(s, s * (0.7 + Math.random() * 0.6), s);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      // 小行星不参与阴影计算，显著降低开销
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.scene.add(mesh);
      this.asteroids.push({ mesh, rotSpeed: (Math.random() - 0.5) * 0.3 });
    }
  }

  _prepareShipMaterials(root, accentColor) {
    root.traverse((child) => {
      if (child.isMesh && child.material) {
        const old = child.material;
        const mat = old.clone();
        // 保留原始贴图，只加一点点色调；主要用灯光区分阵营
        if (mat.color) {
          mat.color.setHex(0xffffff);
        }
        if (mat.map) {
          // 让贴图颜色空间正确
          mat.map.colorSpace = THREE.SRGBColorSpace;
        }
        // 金属科幻质感
        mat.roughness = Math.max(mat.roughness ?? 0.4, 0.35);
        mat.metalness = Math.max(mat.metalness ?? 0.0, 0.55);
        // 关闭自发光，避免贴图被冲淡；引擎发光单独处理
        if (mat.emissive) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
        child.material = mat;
      }
    });
    // 卡通轮廓线（飞船用较高阈值，避免细面过多导致渲染慢）
    this._addOutlines(root, accentColor, 55);
  }

  _addOutlines(root, color = 0x111111, threshold = 40) {
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    root.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geomType = child.geometry.type;
      if (geomType === 'PlaneGeometry' || geomType === 'BufferGeometry') return;
      try {
        const edges = new THREE.EdgesGeometry(child.geometry, threshold);
        const line = new THREE.LineSegments(edges, lineMat);
        line.scale.setScalar(1.01);
        line.renderOrder = 1;
        child.add(line);
      } catch (e) {
        // ignore unsupported geometry
      }
    });
  }

  _addEngineGlow(ship, glowColor, zOffset = 0) {
    // 引擎点光源
    const glow = new THREE.PointLight(glowColor, 2.2, 14, 1.3);
    glow.position.set(0, 0, zOffset);
    ship.add(glow);

    // 发光核心
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 12),
      new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.9 })
    );
    core.position.set(0, 0, zOffset);
    ship.add(core);

    // 尾焰粒子（更粗、更长、带辉光、加法混合）
    const glowTex = this._createSoftGlowTexture();
    const trailGeo = new THREE.BufferGeometry();
    const trailCount = 90;
    const trailPos = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailCount; i++) {
      trailPos[i * 3] = (Math.random() - 0.5) * 0.16;
      trailPos[i * 3 + 1] = (Math.random() - 0.5) * 0.16;
      trailPos[i * 3 + 2] = zOffset - Math.random() * 2.8;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trailMat = new THREE.PointsMaterial({
      color: glowColor,
      size: 0.18,
      map: glowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    trail.userData.offsets = Array.from({ length: trailCount }, () => Math.random());
    ship.add(trail);

    // 第二层更宽更淡的尾焰光晕
    const haloGeo = new THREE.BufferGeometry();
    const haloCount = 40;
    const haloPos = new Float32Array(haloCount * 3);
    for (let i = 0; i < haloCount; i++) {
      haloPos[i * 3] = (Math.random() - 0.5) * 0.35;
      haloPos[i * 3 + 1] = (Math.random() - 0.5) * 0.35;
      haloPos[i * 3 + 2] = zOffset - 0.4 - Math.random() * 2.2;
    }
    haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    const haloMat = new THREE.PointsMaterial({
      color: glowColor,
      size: 0.45,
      map: glowTex,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const halo = new THREE.Points(haloGeo, haloMat);
    halo.userData.offsets = Array.from({ length: haloCount }, () => Math.random());
    halo.userData.isHalo = true;
    ship.add(halo);
  }

  update(time, delta) {
    super.update(time, delta);

    // 星空快速流动，增强高速追逐感（多层不同速度）
    if (this.stars) {
      this.stars.rotation.y = time * 0.045;
      this.stars.rotation.x = Math.sin(time * 0.02) * 0.02;
    }
    if (this.dust) this.dust.rotation.y = time * 0.025;
    if (this.nebula) this.nebula.rotation.y = time * 0.004;
    if (this.dustCloud) this.dustCloud.rotation.y = time * 0.003;
    if (this.clouds) this.clouds.rotation.y = time * 0.0035;

    // 速度线朝相机飞
    if (this.speedLines) {
      const positions = this.speedLines.geometry.attributes.position.array;
      const offsets = this.speedLines.userData.offsets;
      for (let i = 0; i < offsets.length; i++) {
        const speed = 18 + offsets[i] * 12;
        positions[i * 6 + 2] += speed * delta;
        positions[i * 6 + 5] += speed * delta;
        if (positions[i * 6 + 2] > 15) {
          const z = -80 - Math.random() * 60;
          const len = 2 + Math.random() * 6;
          const x = (Math.random() - 0.5) * 60;
          const y = (Math.random() - 0.5) * 35;
          positions[i * 6] = x;
          positions[i * 6 + 1] = y;
          positions[i * 6 + 2] = z;
          positions[i * 6 + 3] = x;
          positions[i * 6 + 4] = y;
          positions[i * 6 + 5] = z + len;
        }
      }
      this.speedLines.geometry.attributes.position.needsUpdate = true;
    }
    if (this.moon && this.planetPos) {
      const orbitRadius = 26;
      const orbitSpeed = 0.05;
      this.moon.position.x = this.planetPos.x + orbitRadius * Math.cos(time * orbitSpeed);
      this.moon.position.z = this.planetPos.z + 35 + orbitRadius * Math.sin(time * orbitSpeed);
    }

    // 太空追逐：Predacon 在前逃，Maximal 在后追
    // 两者都沿 -Z 向前飞行，Maximal 更快且机动幅度较小，逐渐缩短距离
    const chaseDuration = 31; // 与场景切换时间匹配，避免循环跳变
    const t = time % chaseDuration;

    if (this.maximalShip) {
      const speed = 1.6;
      const baseX = this.maximalShip.userData.baseX ?? -2.2;
      const baseZ = this.maximalShip.userData.baseZ ?? -8;
      const x = baseX + Math.sin(t * 1.6) * 0.7;
      const y = 0.25 + Math.sin(time * 1.5) * 0.25;
      const z = baseZ - speed * t;
      this.maximalShip.position.set(x, y, z);
      this.maximalShip.rotation.z = Math.sin(time * 1.0) * 0.06;
      this.maximalShip.rotation.y = -0.5 + Math.sin(t * 0.6) * 0.08;
      this._animateTrail(this.maximalShip, time, delta);
    }
    if (this.predaconShip) {
      const speed = 1.2;
      const baseX = this.predaconShip.userData.baseX ?? 2.4;
      const baseZ = this.predaconShip.userData.baseZ ?? -15;
      const x = baseX + Math.sin(t * 1.8 + 1) * 1.4;
      const y = -0.2 + Math.sin(time * 1.8 + 1) * 0.3;
      const z = baseZ - speed * t;
      this.predaconShip.position.set(x, y, z);
      this.predaconShip.rotation.z = Math.sin(time * 1.2 + 2) * 0.07;
      this.predaconShip.rotation.y = 0.5 + Math.sin(t * 0.7 + 1) * 0.1;
      this._animateTrail(this.predaconShip, time, delta);
    }

    for (const a of this.asteroids) {
      a.mesh.rotation.x += a.rotSpeed * delta;
      a.mesh.rotation.y += a.rotSpeed * delta * 0.7;
    }
  }

  _animateTrail(ship, time, delta) {
    const trails = ship.children.filter((c) => c.isPoints && c.userData.offsets);
    const baseZ = ship.children.find((c) => c.isMesh && c.material && c.material.transparent)?.position.z ?? -1.7;
    for (const trail of trails) {
      const positions = trail.geometry.attributes.position.array;
      const offsets = trail.userData.offsets;
      const isHalo = trail.userData.isHalo;
      const speed = isHalo ? 0.6 + Math.random() * 0.4 : 1.0 + Math.random() * 0.6;
      const recycleZ = isHalo ? baseZ - 0.4 : baseZ;
      const tailLen = isHalo ? 2.2 : 2.8;
      for (let i = 0; i < offsets.length; i++) {
        positions[i * 3 + 2] += (speed + offsets[i] * speed) * delta;
        if (positions[i * 3 + 2] > recycleZ + 0.1) {
          positions[i * 3 + 2] = recycleZ - tailLen - Math.random() * 0.5;
          const spread = isHalo ? 0.35 : 0.16;
          positions[i * 3] = (Math.random() - 0.5) * spread;
          positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
        }
      }
      trail.geometry.attributes.position.needsUpdate = true;
    }
  }
}
