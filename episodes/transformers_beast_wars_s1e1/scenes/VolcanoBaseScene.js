import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * VolcanoBaseScene — Predacon 火山基地
 * 暗红地面、岩浆光、烟雾、坠落的飞船残骸。
 */
export class VolcanoBaseScene extends SceneBase {
  constructor() {
    super('VolcanoBaseScene');
    this.smokeParticles = null;
    this.lavaGlow = null;
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x1a0a0a);
    this.scene.fog = new THREE.Fog(0x2a1010, 15, 70);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.35;
        l.color.setHex(0x5a2a2a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.5;
        l.color.setHex(0xffaa88);
        l.position.set(-10, 15, -8);
      }
    });

    // 地面：火山灰硬化地表
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512; groundCanvas.height = 512;
    const ctx = groundCanvas.getContext('2d');
    ctx.fillStyle = '#2a1510'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 2;
      const v = Math.random();
      ctx.fillStyle = v > 0.6 ? '#3a2018' : '#1a0d08';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(8, 8);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x3a1a15, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 岩浆池
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(0, 0.02, -10);
    this.scene.add(lava);

    // 岩浆泛光
    this.lavaGlow = new THREE.PointLight(0xff4400, 2.5, 25, 1.5);
    this.lavaGlow.position.set(0, 1.5, -10);
    this.scene.add(this.lavaGlow);

    // 火山口边缘
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x2a1510, roughness: 0.95 });
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.8, 0),
        rimMat
      );
      rock.position.set(Math.cos(angle) * 9, 0.4, -10 + Math.sin(angle) * 9);
      rock.scale.set(1, 0.8 + Math.random(), 1);
      this.scene.add(rock);
    }

    // 坠机残骸
    const wreckage = new THREE.Group();
    const wreckMat = new THREE.MeshStandardMaterial({ color: 0x3a2030, roughness: 0.6, metalness: 0.4 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 1.5), wreckMat);
    wing.rotation.z = 0.3;
    wing.rotation.y = 0.2;
    wreckage.add(wing);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 1.2), wreckMat);
    hull.position.set(0.5, 0.5, 0.3);
    hull.rotation.z = 0.15;
    wreckage.add(hull);
    wreckage.position.set(4, 0, -6);
    wreckage.rotation.y = -0.4;
    this.scene.add(wreckage);

    // 烟雾粒子
    const smokeGeo = new THREE.BufferGeometry();
    const smokeCount = 80;
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3] = (Math.random() - 0.5) * 10;
      smokePos[i * 3 + 1] = Math.random() * 4;
      smokePos[i * 3 + 2] = -10 + (Math.random() - 0.5) * 6;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({ color: 0x555555, size: 0.6, transparent: true, opacity: 0.35 });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.smokeParticles.userData.speeds = Array.from({ length: smokeCount }, () => 0.3 + Math.random() * 0.5);
    this.scene.add(this.smokeParticles);

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.lavaGlow) {
      this.lavaGlow.intensity = 2.2 + Math.sin(time * 2.5) * 0.4;
    }
    if (this.smokeParticles) {
      const positions = this.smokeParticles.geometry.attributes.position.array;
      const speeds = this.smokeParticles.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        positions[i * 3 + 1] += speeds[i] * delta;
        if (positions[i * 3 + 1] > 6) {
          positions[i * 3 + 1] = 0;
        }
      }
      this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
