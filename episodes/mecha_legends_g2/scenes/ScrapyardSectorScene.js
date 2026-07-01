import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * ScrapyardSectorScene — 90 年代废铁战场
 * 干净但细节丰富：压扁的载具残骸、集装箱、断裂管道、倒塌龙门架、光束与火星。
 */
export class ScrapyardSectorScene extends SceneBase {
  constructor() {
    super('ScrapyardSectorScene');
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0x15100c);
    this.scene.fog = new THREE.FogExp2(0x15100c, 0.028);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.45;
        l.color.setHex(0x4a3a2a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.9;
        l.color.setHex(0xffaa66);
        l.position.set(30, 40, 20);
      }
    });

    // 锈蚀地面，带油污纹理
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512; groundCanvas.height = 512;
    const gctx = groundCanvas.getContext('2d');
    gctx.fillStyle = '#3d2e22';
    gctx.fillRect(0, 0, 512, 512);
    // 油污
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 10 + Math.random() * 40;
      const grad = gctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(20, 15, 10, 0.6)');
      grad.addColorStop(1, 'rgba(60, 45, 35, 0)');
      gctx.fillStyle = grad;
      gctx.beginPath();
      gctx.arc(x, y, r, 0, Math.PI * 2);
      gctx.fill();
    }
    // 锈斑
    for (let i = 0; i < 3000; i++) {
      gctx.fillStyle = Math.random() > 0.5 ? '#6b4a35' : '#241c15';
      gctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(8, 8);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0.1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // 载具残骸堆
    this._createVehicleHusks();

    // 工业集装箱
    this._createContainers();

    // 断裂管道
    this._createPipes();

    // 倒塌的龙门架
    this._createCollapsedCranes();

    // 远处围墙/棚屋
    this._createWalls();

    // 火星粒子
    this._createSparks();

    // 烟雾
    this._createSmoke();

    // 光束
    this._createLightBeams();

    // 战斗氛围光
    const fireLight = new THREE.PointLight(0xff5500, 1.5, 25, 1.3);
    fireLight.position.set(-5, 3, -8);
    this.scene.add(fireLight);
    this.fireLight = fireLight;

    const blueLight = new THREE.PointLight(0x3388ff, 0.8, 20, 1.4);
    blueLight.position.set(6, 2, -5);
    this.scene.add(blueLight);

    return this.scene;
  }

  _createVehicleHusks() {
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, metalness: 0.4 });
    const darkRustMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95, metalness: 0.3 });

    for (let i = 0; i < 12; i++) {
      const group = new THREE.Group();
      // 压扁的车身
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2 + Math.random() * 0.8, 0.25 + Math.random() * 0.15, 0.6 + Math.random() * 0.5), rustMat);
      body.rotation.z = (Math.random() - 0.5) * 0.4;
      body.rotation.x = (Math.random() - 0.5) * 0.3;
      group.add(body);

      // 暴露的轮子
      for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), darkRustMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set((Math.random() - 0.5) * 1.0, 0.1, (Math.random() - 0.5) * 0.5);
        wheel.rotation.x = Math.random() * Math.PI;
        group.add(wheel);
      }

      // 断裂的保险杠/装甲板
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.3), darkRustMat);
      plate.position.set(0, 0.25, 0.3);
      plate.rotation.x = 0.5 + Math.random() * 0.5;
      group.add(plate);

      group.position.set((Math.random() - 0.5) * 50, 0, -5 - Math.random() * 30);
      group.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(group);
    }
  }

  _createContainers() {
    const containerMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.7, metalness: 0.4 });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, metalness: 0.4 });
    const darkRustMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95, metalness: 0.3 });

    for (let i = 0; i < 10; i++) {
      const group = new THREE.Group();
      const w = 2.2; const h = 2.2; const d = 5.5;
      const mat = Math.random() > 0.5 ? containerMat : rustMat;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.position.y = h / 2;
      group.add(box);

      // 集装箱加强筋
      for (let j = 0; j < 5; j++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.06, 0.08), darkRustMat);
        rib.position.set(0, h / 2, -d / 2 + j * (d / 4));
        group.add(rib);
      }

      group.position.set((Math.random() - 0.5) * 45, 0, -8 - Math.random() * 28);
      group.rotation.y = (Math.random() - 0.5) * 0.5;
      if (Math.random() > 0.7) {
        group.rotation.z = Math.PI / 2;
        group.position.y = h / 2;
      }
      this.scene.add(group);
    }
  }

  _createPipes() {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8, metalness: 0.5 });
    for (let i = 0; i < 16; i++) {
      const group = new THREE.Group();
      const length = 2 + Math.random() * 4;
      const radius = 0.12 + Math.random() * 0.15;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = Math.random() * Math.PI;
      pipe.position.y = radius;
      group.add(pipe);

      // 法兰盘
      for (const side of [-1, 1]) {
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.08, 10), pipeMat);
        flange.rotation.z = Math.PI / 2;
        flange.rotation.y = pipe.rotation.y;
        flange.position.set(Math.cos(pipe.rotation.y) * side * length / 2, radius, Math.sin(pipe.rotation.y) * side * length / 2);
        group.add(flange);
      }

      group.position.set((Math.random() - 0.5) * 48, 0, -6 - Math.random() * 32);
      this.scene.add(group);
    }
  }

  _createCollapsedCranes() {
    const craneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), craneMat);
      tower.position.y = 3;
      group.add(tower);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, 0.4), craneMat);
      arm.position.set(1.5, 5.5, 0);
      arm.rotation.z = -0.3 - Math.random() * 0.3;
      group.add(arm);

      // 倒塌姿态
      group.rotation.z = Math.random() > 0.5 ? 0.4 : 0;
      group.rotation.y = Math.random() * Math.PI;
      group.position.set((Math.random() - 0.5) * 40, 0, -15 - Math.random() * 20);
      this.scene.add(group);
    }
  }

  _createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9, metalness: 0.1 });
    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 4, 4 + Math.random() * 2, 0.5), wallMat);
      wall.position.y = wall.geometry.parameters.height / 2;
      group.add(wall);

      // 破洞
      if (Math.random() > 0.5) {
        const hole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.6), new THREE.MeshBasicMaterial({ color: 0x15100c }));
        hole.position.set((Math.random() - 0.5) * 2, 1.5 + Math.random(), 0);
        group.add(hole);
      }

      group.position.set((Math.random() - 0.5) * 60, 0, -25 - Math.random() * 20);
      group.rotation.y = Math.random() * 0.4;
      this.scene.add(group);
    }
  }

  _createSparks() {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 3 + 1,
        z: (Math.random() - 0.5) * 2,
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffaa33, size: 0.1, transparent: true, opacity: 0.9 });
    this.sparks = new THREE.Points(geo, mat);
    this.sparks.userData.velocities = velocities;
    this.scene.add(this.sparks);
  }

  _createSmoke() {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25 - 5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x555555, size: 0.9, transparent: true, opacity: 0.2, depthWrite: false });
    this.smoke = new THREE.Points(geo, mat);
    this.scene.add(this.smoke);
  }

  _createLightBeams() {
    // 几束斜射下来的光柱
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffaa66,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.beams = [];
    for (let i = 0; i < 4; i++) {
      const h = 10 + Math.random() * 6;
      const geo = new THREE.ConeGeometry(1.5 + Math.random(), h, 16, 1, true);
      const beam = new THREE.Mesh(geo, beamMat);
      beam.position.set((Math.random() - 0.5) * 30, 0, -10 - Math.random() * 25);
      beam.rotation.x = Math.PI;
      this.scene.add(beam);
      this.beams.push(beam);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.fireLight) {
      this.fireLight.intensity = 1.2 + Math.sin(time * 8) * 0.4 + Math.random() * 0.2;
    }

    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const vels = this.sparks.userData.velocities;
      for (let i = 0; i < vels.length; i++) {
        positions[i * 3] += vels[i].x * delta;
        positions[i * 3 + 1] += vels[i].y * delta;
        positions[i * 3 + 2] += vels[i].z * delta;
        vels[i].y -= 4.0 * delta;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3] = (Math.random() - 0.5) * 20;
          positions[i * 3 + 1] = Math.random() * 0.5;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
          vels[i].y = Math.random() * 3 + 1;
        }
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
    }

    if (this.smoke) {
      const positions = this.smoke.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * 0.5;
        if (positions[i * 3 + 1] > 8) {
          positions[i * 3 + 1] = 0;
        }
      }
      this.smoke.geometry.attributes.position.needsUpdate = true;
    }
  }
}
