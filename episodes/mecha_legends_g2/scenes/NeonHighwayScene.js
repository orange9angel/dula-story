import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * NeonHighwayScene — 90 年代 CGI 风格霓虹高速公路
 * 干净但细节丰富：层叠式霓虹塔楼、天桥剪影、护栏信号灯、流动光带。
 */
export class NeonHighwayScene extends SceneBase {
  constructor() {
    super('NeonHighwayScene');
    this.roadOffset = 0;
  }

  build() {
    super.build();

    // 深夜城市场景：移除巨大落日，改为冷色月光与远处城市辉光
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.35;
        l.color.setHex(0x2a2a40);
      }
      if (l.isDirectionalLight) {
        // 侧后方冷白月光，模拟城市深夜高架照明
        l.intensity = 0.6;
        l.color.setHex(0xaaccff);
        l.position.set(-35, 25, -40);
      }
    });

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

    // 网格地面
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512; gridCanvas.height = 512;
    const gctx = gridCanvas.getContext('2d');
    gctx.fillStyle = '#0f081c';
    gctx.fillRect(0, 0, 512, 512);
    gctx.strokeStyle = '#00ffff';
    gctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 32) {
      gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 512); gctx.stroke();
      gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(512, i); gctx.stroke();
    }
    const gridTex = new THREE.CanvasTexture(gridCanvas);
    gridTex.wrapS = THREE.RepeatWrapping;
    gridTex.wrapT = THREE.RepeatWrapping;
    gridTex.repeat.set(20, 20);
    const gridMat = new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: 0.5 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gridMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    this.scene.add(floor);
    this.floor = floor;

    // 发光高速公路
    const roadGeo = new THREE.PlaneGeometry(12, 200);
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 256; roadCanvas.height = 1024;
    const rctx = roadCanvas.getContext('2d');
    rctx.fillStyle = '#1a0a2e';
    rctx.fillRect(0, 0, 256, 1024);
    rctx.fillStyle = '#ff00ff';
    rctx.fillRect(0, 0, 8, 1024);
    rctx.fillRect(248, 0, 8, 1024);
    for (let i = 0; i < 1024; i += 64) {
      rctx.fillStyle = '#00ffff';
      rctx.fillRect(124, i, 8, 32);
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

    // 道路护栏
    for (const side of [-1, 1]) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.7 });
      const railTopMat = new THREE.MeshBasicMaterial({ color: side === -1 ? 0xff00ff : 0x00ffff });
      for (let i = 0; i < 20; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), railMat);
        post.position.set(side * 6.2, 0.35, -10 - i * 10);
        this.scene.add(post);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 10.2), railTopMat);
        top.position.set(side * 6.2, 0.7, -5 - i * 10);
        this.scene.add(top);
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

    // 战斗区域道路破坏（弹坑、碎片、余火）— 加入滚动对象，随车速后退
    this.roadDamage = this._createRoadDamage();
    this.roadDamage.position.set(0, 0, -35);
    this.scene.add(this.roadDamage);
    this.buildings.push({ mesh: this.roadDamage, speed: 9 });

    // 敌方无人机小队（ highway 枪战视觉对象）
    this.enemyDrones = [];
    const droneStartZ = -30;
    for (let i = 0; i < 5; i++) {
      const drone = this._createEnemyDrone();
      const side = i % 2 === 0 ? -1 : 1;
      drone.position.set(
        side * (4 + Math.random() * 5),
        2 + Math.random() * 2,
        droneStartZ - i * 6 - Math.random() * 4
      );
      this.scene.add(drone);
      this.enemyDrones.push({ mesh: drone, speed: 9, baseY: drone.position.y });
      this.buildings.push({ mesh: drone, speed: 9 });
    }

    // 枪战枪口闪光/爆炸光效（在 36-40s 左右触发）
    this.muzzleFlashes = [];
    for (let i = 0; i < 6; i++) {
      const flash = new THREE.PointLight(0xffaa00, 0, 12, 2);
      flash.position.set(0, 0, 0);
      this.scene.add(flash);
      this.muzzleFlashes.push({ light: flash, nextFlash: 36 + i * 0.6 + Math.random() * 0.3 });
    }

    // 命中爆炸火花（与 impact_metal 音效同步）
    this.hitSparks = [];
    const hitTimes = [36.35, 37.35, 38.35, 39.35];
    hitTimes.forEach((t) => {
      const sparkLight = new THREE.PointLight(0xff5500, 0, 10, 1.8);
      sparkLight.position.set((Math.random() - 0.5) * 8, 0.5 + Math.random(), -10 - Math.random() * 15);
      this.scene.add(sparkLight);

      const sparkCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      );
      sparkCore.position.copy(sparkLight.position);
      this.scene.add(sparkCore);

      this.hitSparks.push({ light: sparkLight, core: sparkCore, time: t, triggered: false });
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

  _createRoadDamage() {
    const group = new THREE.Group();

    // 弹坑：深色凹陷圆盘 + 边缘碎裂
    const craterMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a0a, roughness: 0.9, metalness: 0.1
    });
    const craterRimMat = new THREE.MeshStandardMaterial({
      color: 0x332222, roughness: 0.8, metalness: 0.2
    });

    for (let i = 0; i < 5; i++) {
      const radius = 0.6 + Math.random() * 1.2;
      const crater = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), craterMat);
      crater.rotation.x = -Math.PI / 2;
      crater.position.set((Math.random() - 0.5) * 10, 0.02, (Math.random() - 0.5) * 25);
      group.add(crater);

      // 破碎边缘
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2 + Math.random() * 0.4;
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(0.15 + Math.random() * 0.25, 0.05 + Math.random() * 0.1, 0.15 + Math.random() * 0.25),
          craterRimMat
        );
        rim.position.set(
          crater.position.x + Math.cos(angle) * (radius + 0.1),
          0.04,
          crater.position.z + Math.sin(angle) * (radius + 0.1)
        );
        rim.rotation.y = Math.random() * Math.PI;
        group.add(rim);
      }
    }

    // 路面裂缝
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 12; i++) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2 + Math.random() * 4), crackMat);
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = Math.random() * Math.PI;
      crack.position.set((Math.random() - 0.5) * 11, 0.025, (Math.random() - 0.5) * 28);
      group.add(crack);
    }

    // 金属/混凝土碎片
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x555566, roughness: 0.6, metalness: 0.5
    });
    for (let i = 0; i < 40; i++) {
      const size = 0.08 + Math.random() * 0.25;
      const debris = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.6, size), debrisMat);
      debris.position.set(
        (Math.random() - 0.5) * 11,
        size * 0.3,
        (Math.random() - 0.5) * 28
      );
      debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(debris);
    }

    // 余火与爆炸光点
    const fireColors = [0xff4400, 0xff8800, 0xff2200];
    for (let i = 0; i < 6; i++) {
      const fireLight = new THREE.PointLight(fireColors[i % 3], 1.2 + Math.random() * 1.5, 8 + Math.random() * 6, 2);
      fireLight.position.set((Math.random() - 0.5) * 8, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 20);
      group.add(fireLight);

      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: fireColors[i % 3] })
      );
      ember.position.copy(fireLight.position);
      group.add(ember);
    }

    // 一截炸毁的护栏
    const brokenRailMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.7 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.5 + Math.random()), brokenRailMat);
        rail.position.set(side * 6.2, 0.2 + Math.random() * 0.4, -10 + i * 4 + Math.random());
        rail.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
        group.add(rail);
      }
    }

    return group;
  }

  _createEnemyDrone() {
    const group = new THREE.Group();

    // 机身 — 锈铁军团暗红/铁灰涂装
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a2a2a, roughness: 0.5, metalness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.4, metalness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.4 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.35), bodyMat);
    group.add(body);

    // 红色监视器/独眼
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
    eye.position.set(0, 0.02, 0.2);
    group.add(eye);

    const eyeLight = new THREE.PointLight(0xff2200, 1.0, 3.5, 1.5);
    eyeLight.position.copy(eye.position);
    group.add(eyeLight);

    // 机翼
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.18), accentMat);
      wing.position.set(side * 0.5, 0, -0.05);
      wing.rotation.z = side * 0.15;
      group.add(wing);

      const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.22), darkMat);
      wingTip.position.set(side * 0.9, 0, -0.05);
      group.add(wingTip);

      // 推进器光
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(side * 0.35, 0, -0.25);
      group.add(thruster);

      const thrusterLight = new THREE.PointLight(0xff6600, 0.8, 2.0, 1.2);
      thrusterLight.position.set(side * 0.35, 0, -0.32);
      group.add(thrusterLight);
    }

    // 下方机炮管
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), gunMat);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, -0.06, 0.18);
    group.add(gun);

    return group;
  }

  _createTieredTower(color) {
    const group = new THREE.Group();
    const mainMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.8 });
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });

    const tiers = 3 + Math.floor(Math.random() * 3);
    let y = 0;
    let baseW = 4 + Math.random() * 3;
    let baseD = 3 + Math.random() * 2;
    for (let i = 0; i < tiers; i++) {
      const h = 4 + Math.random() * 6;
      const w = baseW * (1 - i * 0.15);
      const d = baseD * (1 - i * 0.15);
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      tier.position.y = y + h / 2;
      group.add(tier);

      // 发光窗线
      for (let row = 0; row < 4; row++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.08, d * 1.01), glowMat);
        win.position.y = y + h * (0.2 + row * 0.2);
        group.add(win);
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
      if (Math.random() > 0.5) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.8, 0.15), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 }));
        sign.position.set(0, y + h * 0.7, d / 2 + 0.1);
        group.add(sign);
      }

      y += h;
    }
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

    return group;
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.road) {
      this.roadOffset += delta * 2.5;
      this.road.material.map.offset.y = -this.roadOffset;
    }

    [...this.buildings, ...this.signalPosts].forEach((obj) => {
      obj.mesh.position.z += obj.speed * delta;
      if (obj.mesh.position.z > 20) {
        obj.mesh.position.z = -190 - Math.random() * 30;
      }
    });

    // 敌方无人机悬停上下摆动
    if (this.enemyDrones) {
      this.enemyDrones.forEach((drone, idx) => {
        drone.mesh.position.y = drone.baseY + Math.sin(time * 3 + idx) * 0.15;
        drone.mesh.rotation.z = Math.sin(time * 2 + idx * 0.7) * 0.05;
      });
    }

    // 枪战时间段（约 36-40s）触发随机枪口闪光
    if (this.muzzleFlashes && time >= 35.5 && time <= 41) {
      this.muzzleFlashes.forEach((flash) => {
        if (time >= flash.nextFlash) {
          flash.light.intensity = 2.5 + Math.random() * 2.5;
          flash.nextFlash = time + 0.08 + Math.random() * 0.18;
          // 绑定到随机无人机/道路位置
          const source = this.enemyDrones?.[Math.floor(Math.random() * this.enemyDrones.length)]?.mesh;
          if (source && source.position.z > -30 && source.position.z < 30) {
            flash.light.position.copy(source.position);
            flash.light.position.y -= 0.8;
            flash.light.position.z += 0.5;
          } else {
            flash.light.position.set((Math.random() - 0.5) * 10, 1.2, -10 - Math.random() * 20);
          }
        } else {
          flash.light.intensity *= Math.max(0, 1 - delta * 15);
        }
      });
    } else if (this.muzzleFlashes) {
      this.muzzleFlashes.forEach((flash) => { flash.light.intensity = 0; });
    }

    // 命中火花：在指定时间点爆闪并渐隐
    if (this.hitSparks) {
      this.hitSparks.forEach((spark) => {
        if (!spark.triggered && time >= spark.time) {
          spark.triggered = true;
          spark.light.intensity = 4 + Math.random() * 3;
          spark.core.scale.setScalar(1.5 + Math.random());
          spark.core.material.color.setHex(0xffaa00);
        }
        if (spark.triggered) {
          spark.light.intensity *= Math.max(0, 1 - delta * 8);
          spark.core.scale.multiplyScalar(Math.max(0.5, 1 - delta * 6));
          const gray = Math.max(0.2, spark.light.intensity / 7);
          spark.core.material.color.setRGB(1, gray * 0.6, 0);
        }
      });
    }
  }
}
