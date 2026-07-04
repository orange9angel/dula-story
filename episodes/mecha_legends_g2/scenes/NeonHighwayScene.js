import * as THREE from 'three';
import { SceneBase } from 'dula-engine';
import { createViperDrone, updateViperDrone } from '../characters/BoneWaspFighter.js';

/**
 * NeonHighwayScene — 90 年代 CGI 风格霓虹高速公路
 * 干净但细节丰富：层叠式霓虹塔楼、天桥剪影、护栏信号灯、流动光带。
 */
export class NeonHighwayScene extends SceneBase {
  constructor() {
    super('NeonHighwayScene');
    this.roadOffset = 0;
    this.droneExplosions = [];
  }

  build() {
    super.build();

    // 深夜城市场景：移除巨大落日，改为冷色月光与远处城市辉光
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 1.6;
        l.color.setHex(0x3a3a55);
      }
      if (l.isDirectionalLight) {
        // 侧后方冷白月光，模拟城市深夜高架照明
        l.intensity = 2.0;
        l.color.setHex(0xaaccff);
        l.position.set(-35, 25, -40);
      }
    });

    // 正面补光：让机器人脸部和正面装甲可见
    const keyFill = new THREE.DirectionalLight(0xddeeff, 2.0);
    keyFill.position.set(0, 8, 18);
    this.scene.add(keyFill);

    // 远处城市天际线辉光（极弱，避免像太阳）
    const horizonGlowCanvas = document.createElement('canvas');
    horizonGlowCanvas.width = 256; horizonGlowCanvas.height = 64;
    const hgCtx = horizonGlowCanvas.getContext('2d');
    const hgGrad = hgCtx.createLinearGradient(0, 32, 0, 64);
    hgGrad.addColorStop(0, 'rgba(0,0,0,0)');
    hgGrad.addColorStop(0.5, 'rgba(80,60,120,0.25)');
    hgGrad.addColorStop(1, 'rgba(160,80,160,0.45)');
    hgCtx.fillStyle = hgGrad;
    hgCtx.fillRect(0, 0, 256, 64);
    const horizonTex = new THREE.CanvasTexture(horizonGlowCanvas);
    const horizonMat = new THREE.MeshBasicMaterial({
      map: horizonTex, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide
    });
    const horizonGlow = new THREE.Mesh(new THREE.PlaneGeometry(120, 20), horizonMat);
    horizonGlow.position.set(0, 4, -110);
    this.scene.add(horizonGlow);

    // 天空穹顶 — 深夜城市色调，去除暖粉日落
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512; skyCanvas.height = 512;
    const sctx = skyCanvas.getContext('2d');
    const skyGrad = sctx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#020208');
    skyGrad.addColorStop(0.35, '#0a0a1e');
    skyGrad.addColorStop(0.65, '#14102c');
    skyGrad.addColorStop(1, '#1a1238');
    sctx.fillStyle = skyGrad;
    sctx.fillRect(0, 0, 512, 512);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 32), skyMat);
    this.scene.add(skyDome);

    // 城市地面：带噪点的深色沥青/混凝土，弱化网格感
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512; groundCanvas.height = 512;
    const gctx = groundCanvas.getContext('2d');
    gctx.fillStyle = '#0a0818';
    gctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      gctx.fillStyle = Math.random() > 0.5 ? '#120d24' : '#070612';
      gctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    gctx.strokeStyle = '#1a1830';
    gctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 64) {
      gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 512); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(512, i); gctx.stroke();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(24, 24);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.12 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.06;
    this.scene.add(floor);
    this.floor = floor;

    // 发光高速公路：带车道标线和路肩反光钉
    const roadGeo = new THREE.PlaneGeometry(12, 200);
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 256; roadCanvas.height = 1024;
    const rctx = roadCanvas.getContext('2d');
    rctx.fillStyle = '#1a0a2e';
    rctx.fillRect(0, 0, 256, 1024);
    // 边线
    rctx.fillStyle = '#ff00ff';
    rctx.fillRect(0, 0, 8, 1024);
    rctx.fillRect(248, 0, 8, 1024);
    // 中央虚线
    for (let i = 0; i < 1024; i += 64) {
      rctx.fillStyle = '#00ffff';
      rctx.fillRect(124, i, 8, 32);
    }
    // 车道分割线
    for (let i = 0; i < 1024; i += 64) {
      rctx.fillStyle = '#ffffff';
      rctx.fillRect(60, i + 16, 3, 20);
      rctx.fillRect(192, i + 16, 3, 20);
    }
    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 4);
    const roadMat = new THREE.MeshBasicMaterial({ map: roadTex });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    this.scene.add(road);
    this.road = road;

    // 路肩碎石带
    const shoulderCanvas = document.createElement('canvas');
    shoulderCanvas.width = 128; shoulderCanvas.height = 128;
    const shctx = shoulderCanvas.getContext('2d');
    shctx.fillStyle = '#0d0a1a';
    shctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) {
      shctx.fillStyle = Math.random() > 0.5 ? '#1a1830' : '#0f0d1c';
      shctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const shoulderTex = new THREE.CanvasTexture(shoulderCanvas);
    shoulderTex.wrapS = THREE.RepeatWrapping;
    shoulderTex.wrapT = THREE.RepeatWrapping;
    shoulderTex.repeat.set(1, 16);
    const shoulderMat = new THREE.MeshStandardMaterial({ map: shoulderTex, roughness: 0.95, metalness: 0.05 });
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 200), shoulderMat);
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.set(side * 7.25, 0.005, 0);
      this.scene.add(shoulder);
    }

    // 道路护栏 + 隔音墙
    for (const side of [-1, 1]) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.7 });
      const railTopMat = new THREE.MeshBasicMaterial({ color: side === -1 ? 0xff00ff : 0x00ffff });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 20; i++) {
        const z = -10 - i * 10;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), railMat);
        post.position.set(side * 6.3, 0.6, z);
        this.scene.add(post);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 10.4), railTopMat);
        top.position.set(side * 6.3, 1.2, z + 5);
        this.scene.add(top);
        // 隔音墙板
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 10.2), wallMat);
        wall.position.set(side * 6.3, 0.55, z + 5);
        this.scene.add(wall);
      }
    }

    // 街灯
    this.streetLights = [];
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 10; i++) {
        const z = -10 - i * 20;
        const group = new THREE.Group();
        group.position.set(side * 9, 0, z);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.5, 8), poleMat);
        pole.position.y = 2.75;
        group.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), poleMat);
        arm.position.set(0, 5.2, 0);
        group.add(arm);

        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.2), lampMat);
        lamp.position.set(side * -1.1, 5.15, 0);
        group.add(lamp);

        const lampLight = new THREE.PointLight(0xffffaa, 0.9, 18, 1.6);
        lampLight.position.set(side * -1.1, 4.8, 0);
        group.add(lampLight);

        this.scene.add(group);
        this.streetLights.push({ mesh: group, speed: 10 });
      }
    }

    // 层叠式霓虹塔楼（减少数量，提高单栋细节）
    this.buildings = [];
    const buildingColors = [0xff00cc, 0x00ffff, 0xaa00ff, 0xff3388];
    for (let side of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const building = this._createTieredTower(buildingColors[Math.floor(Math.random() * buildingColors.length)]);
        const z = -25 - i * 22;
        building.position.set(side * (16 + Math.random() * 10), 0, z);
        this.scene.add(building);
        this.buildings.push({ mesh: building, speed: 8 + Math.random() * 4 });
      }
    }

    // 远景高架桥剪影
    for (let i = 0; i < 3; i++) {
      const overpass = this._createOverpass();
      overpass.position.set(0, 6 + i * 4, -60 - i * 80);
      this.scene.add(overpass);
      this.buildings.push({ mesh: overpass, speed: 12 + i * 2 });
    }

    // 近景交通信号灯柱
    this.signalPosts = [];
    for (let side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const post = this._createSignalPost(side);
        post.position.set(side * 9, 0, -15 - i * 35);
        this.scene.add(post);
        this.signalPosts.push({ mesh: post, speed: 10 });
      }
    }

    // 敌方无人机小队 —— 三架 Viper（与台词“三架无人机”对应）
    // 开场隐藏，15s 后由斯凯台词触发出现；36s 左右随脚本 combat tag 同步开火
    this.enemyDrones = [];
    this.droneEncounterTime = 15.0;
    this.droneEntryEndTime = 25.0;
    const droneFormations = [
      { x: -2.2, y: 2.4, z: -6.5, entryX: -14, entryY: 0.6, entryZ: -12 },
      { x: 0.0, y: 2.4, z: -6.5, entryX: 14, entryY: 0.9, entryZ: -15 },
      { x: 2.2, y: 2.4, z: -6.5, entryX: -14, entryY: 1.2, entryZ: -18 },
    ];
    for (let i = 0; i < droneFormations.length; i++) {
      const f = droneFormations[i];
      const drone = this._createEnemyDrone();
      // 初始放在侧面低位，15s 后爬升进入战斗位置
      drone.position.set(f.entryX, f.entryY, f.entryZ);
      // 机头朝向英雄所在方向（+z），与英雄面对面
      drone.rotation.x = 0.12;
      drone.rotation.y = 0;
      drone.visible = false;
      this.scene.add(drone);
      // 敌机不加入 buildings 滚动队列：15s 前完全隐藏，之后从侧方爬升进场
      this.enemyDrones.push({
        mesh: drone,
        speed: 9,
        baseY: f.y,
        basePos: new THREE.Vector3(f.x, f.y, f.z),
        entryPos: new THREE.Vector3(f.entryX, f.entryY, f.entryZ),
        destroyed: false,
        destroyTime: -1,
      });
    }

    // 敌方无人机枪口红橙脉冲（与 script.story 的 SFX/combat tag 同步）
    this.muzzleFlashes = [];
    const pulseTimes = [36.2, 37.0, 37.8, 38.8, 39.8, 40.8, 63.2, 64.6];
    for (let i = 0; i < pulseTimes.length; i++) {
      const group = new THREE.Group();
      // 敌军统一使用红橙脉冲，和灰狐安保的蓝白火力建立清晰阵营区分。
      const flash = new THREE.PointLight(0xff3218, 0, 24, 2.2);
      group.add(flash);

      const flashCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      group.add(flashCore);

      const flashCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.10, 0.58, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff5a28, transparent: true, opacity: 0.62, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      flashCone.rotation.x = -Math.PI / 2;
      flashCone.position.z = 0.36;
      group.add(flashCone);

      // 枪口焰 billboard 光晕
      const muzzleGlowCanvas = document.createElement('canvas');
      muzzleGlowCanvas.width = 64; muzzleGlowCanvas.height = 64;
      const mgCtx = muzzleGlowCanvas.getContext('2d');
      const mgGrad = mgCtx.createRadialGradient(32, 32, 3, 32, 32, 30);
      mgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      mgGrad.addColorStop(0.28, 'rgba(255, 130, 70, 0.68)');
      mgGrad.addColorStop(0.68, 'rgba(255, 45, 12, 0.24)');
      mgGrad.addColorStop(1, 'rgba(120, 0, 0, 0)');
      mgCtx.fillStyle = mgGrad;
      mgCtx.fillRect(0, 0, 64, 64);
      const muzzleGlowTex = new THREE.CanvasTexture(muzzleGlowCanvas);
      const muzzleGlowMat = new THREE.SpriteMaterial({
        map: muzzleGlowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const muzzleGlow = new THREE.Sprite(muzzleGlowMat);
      muzzleGlow.scale.set(1.0, 1.0, 1);
      group.add(muzzleGlow);

      // 三层束：细白热核心、红橙能量层、低透明外辉光。
      const beamGroup = new THREE.Group();
      const beamColor = 0xff7145;
      const beamGlowColor = 0xff2412;
      const beamCoreMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const beamCoreGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 12, 1, true);
      const laserBeam = new THREE.Mesh(beamCoreGeo, beamCoreMat);
      laserBeam.rotation.x = Math.PI / 2;
      beamGroup.add(laserBeam);

      const beamGlowMat = new THREE.MeshBasicMaterial({
        color: beamGlowColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const beamGlowGeo = new THREE.CylinderGeometry(0.18, 0.18, 1, 16, 1, true);
      const laserGlow = new THREE.Mesh(beamGlowGeo, beamGlowMat);
      laserGlow.rotation.x = Math.PI / 2;
      beamGroup.add(laserGlow);

      // 激光束内部白热核心
      const beamHotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const beamHotGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 8, 1, true);
      const laserHot = new THREE.Mesh(beamHotGeo, beamHotMat);
      laserHot.rotation.x = Math.PI / 2;
      beamGroup.add(laserHot);

      this.scene.add(beamGroup);

      // 激光束拉伸光带（billboard，任何角度都清晰可见）
      const beamStripeCanvas = document.createElement('canvas');
      beamStripeCanvas.width = 256; beamStripeCanvas.height = 64;
      const bsc = beamStripeCanvas.getContext('2d');
      const bsg = bsc.createLinearGradient(0, 32, 256, 32);
      bsg.addColorStop(0, 'rgba(255, 40, 10, 0)');
      bsg.addColorStop(0.18, 'rgba(255, 75, 25, 0.20)');
      bsg.addColorStop(0.46, 'rgba(255, 190, 140, 0.62)');
      bsg.addColorStop(0.54, 'rgba(255, 245, 230, 0.72)');
      bsg.addColorStop(0.82, 'rgba(255, 75, 25, 0.20)');
      bsg.addColorStop(1, 'rgba(255, 40, 10, 0)');
      bsc.fillStyle = bsg;
      bsc.fillRect(0, 0, 256, 64);
      const beamStripeTex = new THREE.CanvasTexture(beamStripeCanvas);
      const beamStripeMat = new THREE.SpriteMaterial({
        map: beamStripeTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const beamStripe = new THREE.Sprite(beamStripeMat);
      beamStripe.scale.set(1, 0.34, 1);
      beamStripe.center.set(0.5, 0.5);
      this.scene.add(beamStripe);

      // 命中只在落点爆发，不再用整屏泛光代替冲击。
      const hitSpark = new THREE.PointLight(0xff421c, 0, 16, 2.2);
      const hitCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
      );
      const hitGlowCanvas = document.createElement('canvas');
      hitGlowCanvas.width = 64; hitGlowCanvas.height = 64;
      const hgCtx = hitGlowCanvas.getContext('2d');
      const hgGrad = hgCtx.createRadialGradient(32, 32, 3, 32, 32, 30);
      hgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      hgGrad.addColorStop(0.35, 'rgba(255, 115, 55, 0.58)');
      hgGrad.addColorStop(0.75, 'rgba(255, 35, 8, 0.20)');
      hgGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
      hgCtx.fillStyle = hgGrad;
      hgCtx.fillRect(0, 0, 64, 64);
      const hitGlowTex = new THREE.CanvasTexture(hitGlowCanvas);
      const hitGlowMat = new THREE.SpriteMaterial({
        map: hitGlowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const hitGlow = new THREE.Sprite(hitGlowMat);
      hitGlow.scale.set(1.8, 1.8, 1);
      const hitGroup = new THREE.Group();
      hitGroup.add(hitSpark);
      hitGroup.add(hitCore);
      hitGroup.add(hitGlow);
      this.scene.add(hitGroup);

      this.scene.add(group);
      this.muzzleFlashes.push({ group, light: flash, core: flashCore, cone: flashCone, muzzleGlow, beamGroup, laserBeam, laserGlow, laserHot, beamStripe, hitGroup, hitSpark, hitCore, hitGlow, fireTime: pulseTimes[i], fired: false, sourceDroneIndex: i % this.enemyDrones.length });
    }

    // 灰狐安保英雄蓝白灵丸射击（与 combat tags 同步）
    this.heroMuzzleFlashes = [];
    const heroCues = [
      { time: 36.7, attacker: '雷恩', defender: 'Viper-1', destroy: false },
      { time: 37.5, attacker: '布洛克', defender: 'Viper-2', destroy: false },
      { time: 38.3, attacker: '斯凯', defender: 'Viper-3', destroy: false },
      { time: 39.3, attacker: '雷恩', defender: 'Viper-1', destroy: false },
      { time: 40.3, attacker: '布洛克', defender: 'Viper-2', destroy: false },
      { time: 41.3, attacker: '斯凯', defender: 'Viper-3', destroy: false },
      { time: 62.2, attacker: '雷恩', defender: 'Viper-1', destroy: false },
      { time: 62.6, attacker: '布洛克', defender: 'Viper-2', destroy: false },
      { time: 63.0, attacker: '斯凯', defender: 'Viper-3', destroy: false },
      { time: 63.6, attacker: '雷恩', defender: 'Viper-1', destroy: false },
      { time: 64.0, attacker: '布洛克', defender: 'Viper-2', destroy: false },
      { time: 64.4, attacker: '斯凯', defender: 'Viper-3', destroy: false },
      { time: 65.0, attacker: '雷恩', defender: 'Viper-1', destroy: true },
      { time: 65.4, attacker: '布洛克', defender: 'Viper-2', destroy: true },
      { time: 65.8, attacker: '斯凯', defender: 'Viper-3', destroy: true },
    ];
    for (const cue of heroCues) {
      const group = new THREE.Group();
      const flash = new THREE.PointLight(0x55ccff, 0, 18, 2.0);
      group.add(flash);

      const flashCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
      );
      group.add(flashCore);

      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64; glowCanvas.height = 64;
      const gCtx = glowCanvas.getContext('2d');
      const gGrad = gCtx.createRadialGradient(32, 32, 3, 32, 32, 30);
      gGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gGrad.addColorStop(0.3, 'rgba(100, 210, 255, 0.60)');
      gGrad.addColorStop(0.7, 'rgba(30, 140, 255, 0.18)');
      gGrad.addColorStop(1, 'rgba(0, 40, 120, 0)');
      gCtx.fillStyle = gGrad;
      gCtx.fillRect(0, 0, 64, 64);
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      glow.scale.set(0.7, 0.7, 1);
      group.add(glow);

      this.scene.add(group);

      const beamGroup = new THREE.Group();
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x55ccff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10, 1, true), beamMat);
      beam.rotation.x = Math.PI / 2;
      beamGroup.add(beam);

      const beamGlowMat = new THREE.MeshBasicMaterial({
        color: 0x88ddff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const beamGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1, 12, 1, true), beamGlowMat);
      beamGlow.rotation.x = Math.PI / 2;
      beamGroup.add(beamGlow);

      this.scene.add(beamGroup);

      const hitSpark = new THREE.PointLight(0x55ccff, 0, 12, 2.0);
      const hitCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
      );
      const hitGroup = new THREE.Group();
      hitGroup.add(hitSpark);
      hitGroup.add(hitCore);
      this.scene.add(hitGroup);

      this.heroMuzzleFlashes.push({ group, light: flash, core: flashCore, glow, beamGroup, beam, beamGlow, hitGroup, hitSpark, hitCore, cue, fired: false });
    }

    // 命中爆炸火花（与 impact 音效同步）
    this.hitSparks = [];
    const hitTimes = [41.70, 42.20, 42.80, 43.50, 45.00, 46.20, 47.00];
    hitTimes.forEach((t) => {
      const group = new THREE.Group();
      group.position.set((Math.random() - 0.5) * 10, 0.5 + Math.random(), -8 - Math.random() * 18);

      const sparkLight = new THREE.PointLight(0xff5a28, 0, 10, 2.0);
      group.add(sparkLight);

      const sparkCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
      );
      group.add(sparkCore);

      const shockwave = new THREE.Mesh(
        new THREE.RingGeometry(0.14, 0.20, 20),
        new THREE.MeshBasicMaterial({ color: 0xff6a32, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      shockwave.rotation.x = -Math.PI / 2;
      group.add(shockwave);

      this.scene.add(group);
      this.hitSparks.push({ group, light: sparkLight, core: sparkCore, shockwave, time: t, triggered: false });
    });

    // 环境填充光
    const fillLight = new THREE.PointLight(0xff00ff, 0.8, 40, 1.6);
    fillLight.position.set(-10, 8, 10);
    this.scene.add(fillLight);
    const fillLight2 = new THREE.PointLight(0x00ffff, 0.7, 40, 1.6);
    fillLight2.position.set(10, 8, 10);
    this.scene.add(fillLight2);

    return this.scene;
  }

  _createEnemyDrone() {
    const fighter = createViperDrone({ searchBeam: true });
    fighter.scale.setScalar(1.35);
    return fighter;

    /* Legacy construction retained below for reference; unreachable by design. */
    const group = new THREE.Group();

    // 克洛斯公司无人战机 —— 设计成有机翼、座舱、引擎的实体飞船，不再是方块
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.4, metalness: 0.75 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a36, roughness: 0.6, metalness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x8a2828, roughness: 0.45, metalness: 0.55 });
    const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.2, metalness: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });

    // 主机身（尖头梭形）
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 12), hullMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, 0, 0.2);
    group.add(fuselage);

    // 座舱罩
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), cockpitMat);
    cockpit.position.set(0, 0.18, 0.45);
    group.add(cockpit);

    // 主机翼（后掠翼）
    for (const side of [-1, 1]) {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(1.6, -0.3);
      wingShape.lineTo(1.4, -0.7);
      wingShape.lineTo(0.2, -0.4);
      wingShape.lineTo(0, 0);
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });
      const wing = new THREE.Mesh(wingGeo, hullMat);
      wing.rotation.x = Math.PI / 2;
      wing.rotation.z = side * Math.PI / 2;
      wing.position.set(side * 0.25, 0, -0.1);
      group.add(wing);

      // 翼尖红光灯
      const tipLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), glowMat);
      tipLight.position.set(side * 1.75, 0, -0.35);
      group.add(tipLight);
      const tipPL = new THREE.PointLight(0xff3311, 1.2, 4.0, 1.2);
      tipPL.position.copy(tipLight.position);
      group.add(tipPL);

      // 引擎舱
      const enginePod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.55, 10), darkMat);
      enginePod.rotation.x = Math.PI / 2;
      enginePod.position.set(side * 0.55, -0.05, -0.45);
      group.add(enginePod);

      // 引擎喷口（亮橙发光）
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.12, 10), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 0.55, -0.05, -0.72);
      group.add(nozzle);

      const engineLight = new THREE.PointLight(0xff5500, 1.5, 5.0, 1.4);
      engineLight.position.set(side * 0.55, -0.05, -0.85);
      group.add(engineLight);
    }

    // 垂直尾翼
    const vStab = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.5), accentMat);
    vStab.position.set(0, 0.55, -0.45);
    vStab.rotation.x = -0.25;
    group.add(vStab);

    // 下方双联机炮
    for (const side of [-1, 1]) {
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8), darkMat);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(side * 0.22, -0.18, 0.35);
      group.add(gun);
    }

    // 红色扫描独眼（飞船头部）
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), glowMat);
    eye.position.set(0, -0.05, 1.05);
    group.add(eye);
    const eyeLight = new THREE.PointLight(0xff2200, 2.0, 5.0, 1.5);
    eyeLight.position.copy(eye.position);
    group.add(eyeLight);

    // 放大到足够醒目（ highway 场景尺度）
    group.scale.setScalar(4.5);

    // 蓝色搜索光束（让敌机在深色背景中轮廓分明）
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.9, 6.0, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const searchBeam = new THREE.Mesh(beamGeo, beamMat);
    searchBeam.rotation.x = Math.PI / 2;
    searchBeam.position.set(0, -0.1, 0.6);
    group.add(searchBeam);
    group.userData.searchBeam = searchBeam;

    // 机身外缘蓝色辉光 billboard，确保任何角度都醒目
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128; glowCanvas.height = 128;
    const gCtx = glowCanvas.getContext('2d');
    const gGrad = gCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    gGrad.addColorStop(0, 'rgba(100, 180, 255, 0.9)');
    gGrad.addColorStop(0.5, 'rgba(60, 120, 255, 0.55)');
    gGrad.addColorStop(1, 'rgba(30, 60, 255, 0)');
    gCtx.fillStyle = gGrad;
    gCtx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowSpriteMat = new THREE.SpriteMaterial({
      map: glowTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowSpriteMat);
    glowSprite.scale.set(8.5, 8.5, 1);
    glowSprite.position.set(0, 0, 0);
    group.add(glowSprite);
    group.userData.glowSprite = glowSprite;

    // 引擎尾迹光带
    const trailCanvas = document.createElement('canvas');
    trailCanvas.width = 128; trailCanvas.height = 32;
    const tCtx = trailCanvas.getContext('2d');
    const tGrad = tCtx.createLinearGradient(0, 16, 128, 16);
    tGrad.addColorStop(0, 'rgba(255, 120, 40, 0.85)');
    tGrad.addColorStop(0.4, 'rgba(255, 60, 20, 0.4)');
    tGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
    tCtx.fillStyle = tGrad;
    tCtx.fillRect(0, 0, 128, 32);
    const trailTex = new THREE.CanvasTexture(trailCanvas);
    const trailMat = new THREE.SpriteMaterial({
      map: trailTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const trailL = new THREE.Sprite(trailMat);
    trailL.scale.set(5.0, 0.8, 1);
    trailL.position.set(-0.55, -0.05, -0.9);
    trailL.center.set(1, 0.5);
    group.add(trailL);
    const trailR = new THREE.Sprite(trailMat);
    trailR.scale.set(5.0, 0.8, 1);
    trailR.position.set(0.55, -0.05, -0.9);
    trailR.center.set(1, 0.5);
    group.add(trailR);
    group.userData.trails = [trailL, trailR];

    return group;
  }

  _destroyDrone(idx, time) {
    const drone = this.enemyDrones?.[idx];
    if (!drone || drone.destroyed) return;
    drone.destroyed = true;
    drone.destroyTime = time;

    const exp = new THREE.Group();
    exp.position.copy(drone.mesh.position);

    const light = new THREE.PointLight(0xff5500, 12, 22, 2.2);
    exp.add(light);

    // 爆炸辉光 sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.2, 'rgba(255,120,40,0.72)');
    grad.addColorStop(0.5, 'rgba(255,60,20,0.35)');
    grad.addColorStop(1, 'rgba(80,10,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(canvas);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow.scale.set(3.5, 3.5, 1);
    exp.add(glow);

    // 飞溅碎片粒子
    const particleCount = 20;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2.5 + Math.random() * 4.5;
      velocities.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.cos(phi) * speed * 0.6 + 1.5,
        z: Math.sin(phi) * Math.sin(theta) * speed,
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xff6622, size: 0.28, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    exp.add(particles);

    this.scene.add(exp);
    this.droneExplosions.push({ group: exp, light, glow, particles, velocities, birth: time });
  }

  _getDroneCombatPosition(idx, time) {
    const shotTimes = [
      [36.2, 38.8, 63.2],   // Viper-1
      [37.0, 39.8, 64.6],   // Viper-2
      [37.8, 40.8],         // Viper-3
    ][idx] || [];

    const base = this.enemyDrones[idx].basePos.clone();

    for (const t of shotTimes) {
      const start = t - 0.5;
      const end = t + 1.5;
      if (time < start || time > end) continue;

      const u = (time - start) / (end - start);
      // 0..0.5 接近目标，0.5..1.0 撤离
      let forward = 0;
      if (u < 0.5) {
        forward = u / 0.5;
      } else {
        forward = 1 - (u - 0.5) / 0.5;
      }
      forward = forward * forward * (3 - 2 * forward);

      // 左右外侧机动，避免三架叠在一起
      const sideDir = idx === 0 ? -1 : (idx === 2 ? 1 : 0);
      const sideOffset = sideDir * 0.55 * forward;

      return new THREE.Vector3(
        base.x + sideOffset + Math.sin(time * 1.4 + idx * 0.9) * 0.06,
        base.y + Math.sin(time * 2.2 + idx) * 0.08,
        base.z + 2.7 * forward
      );
    }

    // 非掠袭时段：在基地位置小幅悬停
    return new THREE.Vector3(
      base.x + Math.sin(time * 1.4 + idx * 0.9) * 0.12,
      base.y + Math.sin(time * 2.2 + idx) * 0.08,
      base.z
    );
  }

  _getDroneAttackRun(idx, time) {
    const shotTimes = [
      [36.2, 38.8, 63.2],
      [37.0, 39.8, 64.6],
      [37.8, 40.8],
    ][idx] || [];

    for (const t of shotTimes) {
      const start = t - 0.5;
      const end = t + 1.5;
      if (time < start || time > end) continue;
      const u = (time - start) / (end - start);
      // 0..0.5 俯冲接近（机头下压），0.5..1.0 拉起撤离
      let pitch = 0;
      if (u < 0.5) {
        pitch = 0.18 * (u / 0.5);
      } else {
        pitch = 0.18 * (1 - (u - 0.5) / 0.5);
      }
      const sideDir = idx === 0 ? -1 : (idx === 2 ? 1 : 0);
      const roll = sideDir * 0.12 * Math.sin(u * Math.PI);
      return { pitch, roll };
    }
    return null;
  }

  _createTieredTower(color) {
    const group = new THREE.Group();
    const mainMat = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.42, transparent: true, opacity: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.8 });
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.35 });

    const tiers = 3 + Math.floor(Math.random() * 3);
    let y = 0;
    let baseW = 4 + Math.random() * 3;
    let baseD = 3 + Math.random() * 2;
    let lastW = baseW;
    let lastD = baseD;
    for (let i = 0; i < tiers; i++) {
      const h = 4 + Math.random() * 6;
      const w = baseW * (1 - i * 0.15);
      const d = baseD * (1 - i * 0.15);
      lastW = w;
      lastD = d;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      tier.position.y = y + h / 2;
      group.add(tier);

      // 每层缩进平台
      const setback = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.2, d * 1.05), darkMat);
      setback.position.y = y + h;
      group.add(setback);

      // 发光窗线
      for (let row = 0; row < 4; row++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.08, d * 1.02), glowMat);
        win.position.y = y + h * (0.2 + row * 0.2);
        group.add(win);
      }

      // 垂直窗带
      for (let col = 0; col < 3; col++) {
        const vWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.75, d * 1.02), glowMat);
        vWin.position.set((col - 1) * w * 0.25, y + h / 2, 0);
        group.add(vWin);
      }

      // 边角霓虹
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.95, 0.08), edgeMat);
          edge.position.set(sx * w / 2, y + h / 2, sz * d / 2);
          group.add(edge);
        }
      }

      // 招牌框架
      if (Math.random() > 0.4) {
        const signColor = Math.random() > 0.5 ? 0x00ffff : 0xff00ff;
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.7, 0.12), new THREE.MeshBasicMaterial({ color: signColor, transparent: true, opacity: 0.75 }));
        sign.position.set(0, y + h * 0.72, d / 2 + 0.1);
        group.add(sign);
        const signFrame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.8, 0.06), darkMat);
        signFrame.position.set(0, y + h * 0.72, d / 2 + 0.05);
        group.add(signFrame);
      }

      y += h;
    }

    // 屋顶天线/通讯塔
    if (Math.random() > 0.3) {
      const antennaH = 2 + Math.random() * 4;
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, antennaH, 6), darkMat);
      antenna.position.y = y + antennaH / 2;
      group.add(antenna);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 }));
      tip.position.y = y + antennaH + 0.08;
      group.add(tip);
      // 天线横杆
      for (let i = 0; i < 3; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8 + i * 0.4, 0.04, 0.04), darkMat);
        bar.position.y = y + antennaH * (0.3 + i * 0.25);
        group.add(bar);
      }
    }

    // 顶部霓虹环
    const topRing = new THREE.Mesh(new THREE.BoxGeometry(lastW * 1.1, 0.15, lastD * 1.1), edgeMat);
    topRing.position.y = y + 0.08;
    group.add(topRing);

    return group;
  }

  _createOverpass() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a0a2e, transparent: true, opacity: 0.85 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 6), mat);
    deck.position.y = 0;
    group.add(deck);

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), mat);
      pillar.position.set(side * 15, -4, 0);
      group.add(pillar);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 0.05), glowMat);
      glow.position.set(side * 15, -4, 0.3);
      group.add(glow);
    }

    for (let i = 0; i < 10; i++) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 6.2), glowMat);
      light.position.set(-18 + i * 4, -0.2, 0);
      group.add(light);
    }

    return group;
  }

  _createSignalPost(side) {
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 });
    const glowMat = new THREE.MeshBasicMaterial({ color: side === -1 ? 0xff00ff : 0x00ffff });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 8), poleMat);
    pole.position.y = 2.5;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), poleMat);
    arm.position.set(side * 1.25, 4.8, 0);
    group.add(arm);

    for (let i = 0; i < 3; i++) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.12), glowMat);
      light.position.set(side * (0.5 + i * 0.5), 4.4 - i * 0.4, 0);
      group.add(light);
    }

    // 控制箱和线缆
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.25), poleMat);
    box.position.set(0, 1.2, 0.15);
    group.add(box);

    for (let i = 0; i < 4; i++) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      cable.rotation.x = Math.PI / 2;
      cable.position.set(side * (0.6 + i * 0.18), 1.0, 0.8);
      group.add(cable);
    }

    return group;
  }

  update(time, delta) {
    super.update(time, delta);

    // 高速公路开场：英雄默认以载具形态行驶，遇到敌机后再变回机器人
    if (!this._highwayInitDone) {
      this._highwayInitDone = true;
      for (const name of ['雷恩', '布洛克', '斯凯']) {
        const c = this._findCharacter(name);
        if (c && typeof c.transform === 'function') {
          c.transform(1);
          c.setMode('vehicle');
        }
      }
    }

    if (this.road) {
      this.roadOffset += delta * 2.5;
      this.road.material.map.offset.y = -this.roadOffset;
    }

    [...this.buildings, ...this.signalPosts, ...this.streetLights].forEach((obj) => {
      obj.mesh.position.z += obj.speed * delta;
      if (obj.mesh.position.z > 20) {
        obj.mesh.position.z = -190 - Math.random() * 30;
      }
    });

    // 敌方无人机悬停上下摆动（15s 前完全隐藏，15s 从侧面爬升进场；36s 后随 combat tag 开火）
    // 同步隐藏同名角色无人机，避免场景无人机和角色无人机同时出现造成“六架”错觉
    if (this.enemyDrones) {
      const dronesActive = time >= this.droneEncounterTime;
      const entryProgress = Math.min(1, Math.max(0, (time - this.droneEncounterTime) / (this.droneEntryEndTime - this.droneEncounterTime)));
      // 爬升用 ease-out，先快后慢
      const entryEase = 1 - Math.pow(1 - entryProgress, 3);
      for (const name of ['Viper-1', 'Viper-2', 'Viper-3']) {
        const char = this._findCharacter(name);
        if (char?.mesh) char.mesh.visible = false;
      }
      this.enemyDrones.forEach((drone, idx) => {
        if (drone.destroyed) {
          drone.mesh.visible = false;
          if (drone.mesh.userData.muzzle) drone.mesh.userData.muzzle.visible = false;
          return;
        }
        if (!dronesActive) {
          drone.mesh.visible = false;
          // 未出现时锁定在侧面进场起始位置
          if (drone.entryPos) drone.mesh.position.copy(drone.entryPos);
          return;
        }
        if (!drone.mesh.visible) {
          drone.mesh.visible = true;
        }
        // 15-25s：从高架侧面爬升进场；36-67s 战斗阶段做掠袭机动；其余时间悬停
        if (time < this.droneEntryEndTime) {
          drone.mesh.position.lerpVectors(drone.entryPos, drone.basePos, entryEase);
        } else if (time >= 36.0 && time <= 67.0) {
          drone.mesh.position.copy(this._getDroneCombatPosition(idx, time));
        } else {
          drone.mesh.position.y = drone.baseY + Math.sin(time * 2.2 + idx) * 0.08;
          drone.mesh.position.x = drone.basePos.x + Math.sin(time * 1.4 + idx * 0.9) * 0.18;
        }
        // 保持机头朝向英雄（+z 方向），掠袭时加入俯冲/爬升姿态
        const attackRun = this._getDroneAttackRun(idx, time);
        drone.mesh.rotation.x = attackRun ? attackRun.pitch : 0.12;
        drone.mesh.rotation.z = (attackRun ? attackRun.roll : 0) + Math.sin(time * 1.8 + idx * 0.7) * 0.04;
        drone.mesh.rotation.y = Math.sin(time * 1.2 + idx) * 0.04;
        updateViperDrone(drone.mesh, time, idx + 1);
        const beam = drone.mesh.userData.searchBeam;
        if (beam) {
          beam.material.opacity = 0.55 + Math.sin(time * 2.5 + idx) * 0.15;
          beam.rotation.z = Math.sin(time * 0.6 + idx) * 0.06;
        }
        const glow = drone.mesh.userData.glowSprite;
        if (glow) {
          const pulse = 0.85 + Math.sin(time * 4 + idx) * 0.15;
          glow.material.opacity = 0.9 * pulse;
          glow.scale.setScalar(6.0 * pulse);
        }
        const trails = drone.mesh.userData.trails;
        if (trails) {
          const flicker = 0.7 + Math.sin(time * 12 + idx) * 0.3;
          trails.forEach((t) => { t.material.opacity = 0.75 * flicker; });
        }
      });
    }

    // 敌方无人机持续炮击（36s 起与 combat tag 同步，含最后的 64.6s 脉冲）
    if (this.muzzleFlashes) {
      const activeWindow = time >= 36.0 && time <= 67.0;
      this.muzzleFlashes.forEach((flash) => {
        if (activeWindow && !flash.fired && time >= flash.fireTime) {
          flash.fired = true;
          flash.light.intensity = 7.5;
          const drone = this.enemyDrones?.[flash.sourceDroneIndex];
          if (drone?.destroyed) return;
          const source = drone?.mesh;
          if (source) {
            const muzzle = source.userData.muzzle;
            if (muzzle) {
              muzzle.visible = true;
              muzzle.updateWorldMatrix(true, false);
              muzzle.getWorldPosition(flash.group.position);
            } else {
              flash.group.position.copy(source.position);
            }
          } else {
            flash.group.position.set((Math.random() - 0.5) * 10, 1.6, -10 - Math.random() * 20);
          }
          // 枪口焰指向被攻击的英雄
          const heroNames = ['雷恩', '布洛克', '斯凯'];
          const targetHero = this._findCharacter(heroNames[flash.sourceDroneIndex]);
          const end = targetHero?.mesh
            ? targetHero.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0))
            : new THREE.Vector3(start.x, 1.1, start.z + 5);
          flash.group.lookAt(end);
          flash.core.scale.setScalar(1);
          flash.core.material.opacity = 0.78;
          flash.cone.scale.setScalar(1);
          flash.cone.material.opacity = 0.58;
          if (flash.muzzleGlow) {
            flash.muzzleGlow.material.opacity = 0.55;
            flash.muzzleGlow.scale.setScalar(0.8);
          }

          // 生成一道从无人机射向英雄的橙红等离子激光束
          const beam = flash.laserBeam;
          const glow = flash.laserGlow;
          const hot = flash.laserHot;
          const stripe = flash.beamStripe;
          if (beam) {
            const start = flash.group.position.clone();
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const dist = start.distanceTo(end);
            beam.position.copy(mid);
            beam.lookAt(end);
            beam.rotateX(Math.PI / 2);
            beam.scale.set(1, dist, 1);
            beam.material.opacity = 0.72;
            if (glow) {
              glow.position.copy(mid);
              glow.lookAt(end);
              glow.rotateX(Math.PI / 2);
              glow.scale.set(1, dist, 1);
              glow.material.opacity = 0.20;
            }
            if (hot) {
              hot.position.copy(mid);
              hot.lookAt(end);
              hot.rotateX(Math.PI / 2);
              hot.scale.set(1, dist, 1);
              hot.material.opacity = 0.82;
            }
            if (stripe) {
              stripe.position.copy(mid);
              stripe.scale.set(dist, 0.34, 1);
              stripe.material.opacity = 0.62;
              stripe.material.rotation = 0;
            }
            flash.laserEnd = end.clone();

            // 地面命中爆点
            if (flash.hitGroup && flash.hitSpark && flash.hitCore) {
              flash.hitGroup.position.copy(end);
              flash.hitSpark.intensity = 6.5;
              flash.hitCore.scale.setScalar(0.8);
              flash.hitCore.material.opacity = 0.7;
              if (flash.hitGlow) {
                flash.hitGlow.material.opacity = 0.85;
                flash.hitGlow.scale.setScalar(1.65);
              }
            }

          }
        } else if (flash.fired) {
          flash.light.intensity *= Math.max(0, 1 - delta * 12);
          flash.core.scale.multiplyScalar(Math.max(0.5, 1 - delta * 8));
          flash.core.material.opacity *= Math.max(0, 1 - delta * 9);
          flash.cone.scale.multiplyScalar(Math.max(0.5, 1 - delta * 8));
          flash.cone.material.opacity *= Math.max(0, 1 - delta * 9);
          if (flash.muzzleGlow) {
            flash.muzzleGlow.material.opacity *= Math.max(0, 1 - delta * 9);
            flash.muzzleGlow.scale.multiplyScalar(Math.max(0.7, 1 - delta * 6));
          }
          if (flash.laserBeam) {
            flash.laserBeam.material.opacity *= Math.max(0, 1 - delta * 5);
          }
          if (flash.laserGlow) {
            flash.laserGlow.material.opacity *= Math.max(0, 1 - delta * 4);
          }
          if (flash.laserHot) {
            flash.laserHot.material.opacity *= Math.max(0, 1 - delta * 6);
          }
          if (flash.beamStripe) {
            flash.beamStripe.material.opacity *= Math.max(0, 1 - delta * 5);
          }
          if (flash.hitSpark) {
            flash.hitSpark.intensity *= Math.max(0, 1 - delta * 10);
          }
          if (flash.hitCore) {
            flash.hitCore.scale.multiplyScalar(Math.max(0.5, 1 - delta * 8));
            flash.hitCore.material.opacity *= Math.max(0, 1 - delta * 8);
          }
          if (flash.hitGlow) {
            flash.hitGlow.material.opacity *= Math.max(0, 1 - delta * 9);
            flash.hitGlow.scale.multiplyScalar(Math.max(0.7, 1 - delta * 6));
          }
        }

        if (!activeWindow && !flash.fired) {
          flash.light.intensity = 0;
          flash.core.material.opacity = 0;
          flash.cone.material.opacity = 0;
          if (flash.muzzleGlow) flash.muzzleGlow.material.opacity = 0;
          if (flash.laserBeam) flash.laserBeam.material.opacity = 0;
          if (flash.laserGlow) flash.laserGlow.material.opacity = 0;
          if (flash.laserHot) flash.laserHot.material.opacity = 0;
          if (flash.beamStripe) flash.beamStripe.material.opacity = 0;
          if (flash.hitSpark) flash.hitSpark.intensity = 0;
          if (flash.hitCore) flash.hitCore.material.opacity = 0;
          if (flash.hitGlow) flash.hitGlow.material.opacity = 0;
        }
      });

      // 同步隐藏/显示无人机内置枪口焰
      this.enemyDrones.forEach((drone, idx) => {
        if (drone.destroyed) {
          if (drone.mesh.userData.muzzle) drone.mesh.userData.muzzle.visible = false;
          return;
        }
        const active = this.muzzleFlashes.some((f) => f.sourceDroneIndex === idx && f.fired && f.light.intensity > 0.05);
        if (drone.mesh.userData.muzzle) {
          drone.mesh.userData.muzzle.visible = active;
        }
      });
    }

    // 英雄灵丸/激光射击（与 script.story combat tags 同步）
    if (this.heroMuzzleFlashes) {
      this.heroMuzzleFlashes.forEach((flash) => {
        if (!flash.fired && time >= flash.cue.time) {
          flash.fired = true;
          flash.light.intensity = 6.0;
          const attacker = this._findCharacter(flash.cue.attacker);
          const defender = this._findCharacter(flash.cue.defender);
          const start = attacker?.getPlasmaRifleMuzzleWorldPosition
            ? attacker.getPlasmaRifleMuzzleWorldPosition()
            : this._approximateHeroMuzzle(flash.cue.attacker);
          const end = defender?.mesh
            ? defender.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0))
            : this._approximateDefenderPosition(flash.cue.defender);
          flash.group.position.copy(start);
          flash.core.scale.setScalar(1);
          flash.core.material.opacity = 0.85;
          if (flash.glow) {
            flash.glow.material.opacity = 0.6;
            flash.glow.scale.setScalar(0.8);
          }

          const dist = start.distanceTo(end);
          const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          if (flash.beam) {
            flash.beam.position.copy(mid);
            flash.beam.lookAt(end);
            flash.beam.rotateX(Math.PI / 2);
            flash.beam.scale.set(1, dist, 1);
            flash.beam.material.opacity = 0.75;
          }
          if (flash.beamGlow) {
            flash.beamGlow.position.copy(mid);
            flash.beamGlow.lookAt(end);
            flash.beamGlow.rotateX(Math.PI / 2);
            flash.beamGlow.scale.set(1, dist, 1);
            flash.beamGlow.material.opacity = 0.22;
          }
          if (flash.hitGroup) {
            flash.hitGroup.position.copy(end);
            flash.hitSpark.intensity = 5.0;
            flash.hitCore.scale.setScalar(0.7);
            flash.hitCore.material.opacity = 0.7;
          }

          // 最终命中：敌机爆炸并消失（仅 destroy=true 的 cue 触发）
          if (flash.cue.destroy) {
            const droneIndex = { 'Viper-1': 0, 'Viper-2': 1, 'Viper-3': 2 }[flash.cue.defender];
            if (droneIndex !== undefined) this._destroyDrone(droneIndex, time);
          }
        } else if (flash.fired) {
          flash.light.intensity *= Math.max(0, 1 - delta * 12);
          flash.core.scale.multiplyScalar(Math.max(0.5, 1 - delta * 8));
          flash.core.material.opacity *= Math.max(0, 1 - delta * 9);
          if (flash.glow) {
            flash.glow.material.opacity *= Math.max(0, 1 - delta * 9);
            flash.glow.scale.multiplyScalar(Math.max(0.7, 1 - delta * 6));
          }
          if (flash.beam) {
            flash.beam.material.opacity *= Math.max(0, 1 - delta * 5);
          }
          if (flash.beamGlow) {
            flash.beamGlow.material.opacity *= Math.max(0, 1 - delta * 4);
          }
          if (flash.hitSpark) {
            flash.hitSpark.intensity *= Math.max(0, 1 - delta * 10);
          }
          if (flash.hitCore) {
            flash.hitCore.scale.multiplyScalar(Math.max(0.5, 1 - delta * 8));
            flash.hitCore.material.opacity *= Math.max(0, 1 - delta * 8);
          }
        }
      });
    }

    // 命中火花：在指定时间点爆闪并渐隐
    if (this.hitSparks) {
      this.hitSparks.forEach((spark) => {
        if (!spark.triggered && time >= spark.time) {
          spark.triggered = true;
          spark.light.intensity = 7;
          spark.core.scale.setScalar(1.35);
          spark.core.material.color.setHex(0xffffff);
          spark.core.material.opacity = 0.82;
          spark.shockwave.scale.setScalar(1);
          spark.shockwave.material.opacity = 0.6;
        }
        if (spark.triggered) {
          spark.light.intensity *= Math.max(0, 1 - delta * 10);
          spark.core.scale.multiplyScalar(Math.max(0.5, 1 - delta * 7));
          spark.core.material.opacity *= Math.max(0, 1 - delta * 10);
          // 冲击波扩散
          spark.shockwave.scale.multiplyScalar(1 + delta * 5);
          spark.shockwave.material.opacity *= Math.max(0, 1 - delta * 6);
        }
      });
    }

    // 敌机爆炸粒子更新
    if (this.droneExplosions) {
      this.droneExplosions.forEach((exp) => {
        const age = time - exp.birth;
        const life = 0.9;
        if (age < 0) return;
        const fade = Math.max(0, 1 - age / life);
        exp.light.intensity = 12 * fade;
        exp.glow.material.opacity = 0.85 * fade;
        exp.glow.scale.setScalar(3.5 + age * 4.0);
        exp.particles.material.opacity = 0.9 * fade;
        const positions = exp.particles.geometry.attributes.position.array;
        for (let i = 0; i < exp.velocities.length; i++) {
          positions[i * 3] += exp.velocities[i].x * delta;
          positions[i * 3 + 1] += exp.velocities[i].y * delta;
          positions[i * 3 + 2] += exp.velocities[i].z * delta;
        }
        exp.particles.geometry.attributes.position.needsUpdate = true;
        if (age >= life) {
          exp.group.visible = false;
          exp.light.intensity = 0;
        }
      });
    }

    // 覆盖默认镜头：根据剧情节奏给出能看清双方开火的角度
    this._updateHighwayCamera(time);
  }

  _updateHighwayCamera(time) {
    const cam = (typeof window !== 'undefined' && window.__dulaCamera) || this.camera;
    if (!cam) return;

    const shots = [
      // 0-18s：跟车尾部低角度，看三辆汽车前行
      { t0: 0, t1: 18, pos: new THREE.Vector3(0, 2.6, 15.5), look: new THREE.Vector3(0, 0.6, -6) },
      // 18-26s：侧上方，看敌机从远空接近
      { t0: 18, t1: 26, pos: new THREE.Vector3(7, 4.5, 6), look: new THREE.Vector3(0, 2.5, -10) },
      // 26-36s：侧翼中景，机器人变形完成，敌机在前
      { t0: 26, t1: 36, pos: new THREE.Vector3(6, 2.8, 0), look: new THREE.Vector3(0, 1.8, -5) },
      // 36-55s：战斗主镜头，侧向中近景，能清楚看到双方面对面举枪对射
      { t0: 36, t1: 55, pos: new THREE.Vector3(5, 2.6, 1), look: new THREE.Vector3(0, 2.2, -4) },
      // 55-68s：略换另一侧，保持对射可读性
      { t0: 55, t1: 68, pos: new THREE.Vector3(-5, 2.6, 1), look: new THREE.Vector3(0, 2.2, -4) },
      // 68-75s：回到后方，看胜利/变形
      { t0: 68, t1: 75, pos: new THREE.Vector3(0, 3.0, 12), look: new THREE.Vector3(0, 1.5, -5) },
    ];

    let a = shots[0];
    let b = shots[shots.length - 1];
    let blend = 0;
    for (let i = 0; i < shots.length - 1; i++) {
      const s = shots[i];
      const next = shots[i + 1];
      if (time >= s.t0 && time < next.t0) {
        a = s;
        b = next;
        blend = Math.max(0, Math.min(1, (time - s.t0) / (next.t0 - s.t0)));
        break;
      }
    }
    if (time >= shots[shots.length - 1].t0) {
      a = shots[shots.length - 1];
      b = a;
      blend = 0;
    }

    const ease = blend * blend * (3 - 2 * blend);
    const pos = new THREE.Vector3().lerpVectors(a.pos, b.pos, ease);
    const look = new THREE.Vector3().lerpVectors(a.look, b.look, ease);

    cam.position.copy(pos);
    cam.lookAt(look);
  }

  _findCharacter(name) {
    return this.characters.find((c) => c.name === name);
  }

  _approximateHeroMuzzle(name) {
    const positions = {
      '雷恩': new THREE.Vector3(-2.2, 0, -1.5),
      '布洛克': new THREE.Vector3(0, 0, -1.5),
      '斯凯': new THREE.Vector3(2.2, 0, -1.5),
    };
    const base = positions[name]?.clone() || new THREE.Vector3(0, 0, 0);
    return base.add(new THREE.Vector3(0.2, 1.2, 0.2));
  }

  _approximateDefenderPosition(name) {
    const positions = {
      'Viper-1': new THREE.Vector3(-2.2, 2.4, -6.5),
      'Viper-2': new THREE.Vector3(0, 2.4, -6.5),
      'Viper-3': new THREE.Vector3(2.2, 2.4, -6.5),
    };
    return positions[name]?.clone() || new THREE.Vector3(0, 2, -6);
  }
}
