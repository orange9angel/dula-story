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

    // 天空渐变背景
    this.scene.background = new THREE.Color(0x120622);
    this.scene.fog = new THREE.FogExp2(0x120622, 0.018);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.5;
        l.color.setHex(0x553366);
      }
      if (l.isDirectionalLight) {
        l.intensity = 1.0;
        l.color.setHex(0xff99cc);
        l.position.set(-20, 30, 20);
      }
    });

    // 巨大落日/电子太阳
    const sunGeo = new THREE.CircleGeometry(14, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff3388 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 12, -90);
    this.scene.add(sun);

    const sunStripeMat = new THREE.MeshBasicMaterial({ color: 0xff99cc, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 5; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(26, 0.25 + i * 0.12, 0.1), sunStripeMat);
      stripe.position.set(0, 12 - i * 1.1, -89.5);
      this.scene.add(stripe);
    }

    // 天空穹顶
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512; skyCanvas.height = 512;
    const sctx = skyCanvas.getContext('2d');
    const skyGrad = sctx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#0a0314');
    skyGrad.addColorStop(0.4, '#240f42');
    skyGrad.addColorStop(0.7, '#5a1a5a');
    skyGrad.addColorStop(1, '#ff6b9d');
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

    // 环境填充光
    const fillLight = new THREE.PointLight(0xff00ff, 1.0, 45, 1.5);
    fillLight.position.set(-10, 8, 10);
    this.scene.add(fillLight);
    const fillLight2 = new THREE.PointLight(0x00ffff, 0.9, 45, 1.5);
    fillLight2.position.set(10, 8, 10);
    this.scene.add(fillLight2);

    return this.scene;
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
  }
}
