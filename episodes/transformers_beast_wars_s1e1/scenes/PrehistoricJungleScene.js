import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * PrehistoricJungleScene — 史前丛林
 * 绿褐色地面、蕨类植物、随机岩石、明亮日光。
 */
export class PrehistoricJungleScene extends SceneBase {
  constructor() {
    super('PrehistoricJungleScene');
    this.plants = [];
    this.rocks = [];
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x6fa8d8);
    this.scene.fog = new THREE.Fog(0x7fb8e8, 25, 90);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.6;
        l.color.setHex(0xd8f0ff);
      }
      if (l.isDirectionalLight) {
        l.intensity = 1.2;
        l.color.setHex(0xfff8e0);
        l.position.set(15, 25, 12);
      }
    });

    // 地面
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512; groundCanvas.height = 512;
    const ctx = groundCanvas.getContext('2d');
    ctx.fillStyle = '#3a5a2a'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 2.5;
      const shade = Math.random();
      ctx.fillStyle = shade > 0.5 ? '#4a6a35' : '#2a4520';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(8, 8);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x4a6a3a, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 岩石
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.9 });
    for (let i = 0; i < 18; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.8, 0),
        rockMat
      );
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 18;
      rock.position.set(Math.cos(angle) * dist, 0.3, Math.sin(angle) * dist);
      rock.scale.set(1 + Math.random(), 0.6 + Math.random() * 0.6, 1 + Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
      this.rocks.push(rock);
    }

    // 蕨类/草丛
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 40; i++) {
      const fern = new THREE.Group();
      const blades = 5 + Math.floor(Math.random() * 4);
      for (let b = 0; b < blades; b++) {
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.08, 0.6),
          fernMat
        );
        blade.geometry.translate(0, 0.3, 0);
        blade.rotation.y = (b / blades) * Math.PI * 2;
        blade.rotation.x = 0.2 + Math.random() * 0.3;
        fern.add(blade);
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 16;
      fern.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      fern.scale.setScalar(0.7 + Math.random() * 0.8);
      this.scene.add(fern);
      this.plants.push(fern);
    }

    // 远景树木（简单圆锥）
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.85 });
    for (let i = 0; i < 12; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), trunkMat);
      trunk.position.y = 0.75;
      tree.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.0, 8), leafMat);
      leaves.position.y = 2.25;
      tree.add(leaves);
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 20;
      tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      this.scene.add(tree);
    }

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    for (const plant of this.plants) {
      plant.rotation.z = Math.sin(time * 1.2 + plant.position.x) * 0.03;
    }
  }
}
