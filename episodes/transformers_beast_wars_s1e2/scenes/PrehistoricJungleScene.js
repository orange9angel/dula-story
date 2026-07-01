import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

function cloneAsset(name) {
  const source = window.__transformerAssets?.[name];
  if (!source) {
    console.warn(`[PrehistoricJungleScene] Asset not preloaded: ${name}`);
    return new THREE.Group();
  }
  return source.clone();
}

/**
 * PrehistoricJungleScene — 史前丛林
 * 更高分辨率的地面贴图、环境轮廓线、飘浮花粉与明亮日光。
 */
export class PrehistoricJungleScene extends SceneBase {
  constructor() {
    super('PrehistoricJungleScene');
    this.plants = [];
    this.rocks = [];
    this.trees = [];
    this.pollen = null;
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x6fa8d8);
    this.scene.fog = new THREE.Fog(0x7fb8e8, 30, 95);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 1.0;
        l.color.setHex(0xe8f8ff);
      }
      if (l.isDirectionalLight) {
        l.intensity = 2.0;
        l.color.setHex(0xfff8d0);
        l.position.set(12, 30, 14);
        l.castShadow = true;
      }
    });

    // 半球光 + 额外暖色填充光，减少角色面部阴影
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2a5a2a, 0.7);
    this.scene.add(hemi);
    const fillLight = new THREE.PointLight(0xffeebb, 1.2, 30, 1.5);
    fillLight.position.set(0, 4, 8);
    this.scene.add(fillLight);

    // 地面 + 法线感凹凸
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 1024; groundCanvas.height = 1024;
    const ctx = groundCanvas.getContext('2d');
    ctx.fillStyle = '#3a5a2a'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 24000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = Math.random() * 3 + 0.5;
      const shade = Math.random();
      ctx.fillStyle = shade > 0.5 ? '#4f7038' : '#25421b';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(10, 10);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    // 地形起伏：用噪声感的高度场
    const groundGeom = new THREE.PlaneGeometry(160, 160, 48, 48);
    const posAttr = groundGeom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // 简单低频起伏
      const h = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 1.2
        + Math.sin(x * 0.3 + y * 0.2) * 0.35
        + Math.sin(x * 0.6 - y * 0.5) * 0.12
        + (Math.random() - 0.5) * 0.08;
      posAttr.setZ(i, z + h);
    }
    groundGeom.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeom,
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x6a9a5a, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 岩石（Kenney GLB）带轮廓线
    const rockTypes = ['rock_largeA', 'rock_largeB', 'rock_smallA'];
    for (let i = 0; i < 20; i++) {
      const type = rockTypes[Math.floor(Math.random() * rockTypes.length)];
      const rock = cloneAsset(type);
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 22;
      rock.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      rock.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.9 + Math.random() * 1.3;
      rock.scale.set(s, s, s);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this._addOutlines(rock, 0x1a2a15, 0.5);
      this.scene.add(rock);
      this.rocks.push(rock);
    }

    // 蕨类/草丛
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x3a9a3a, roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 80; i++) {
      const fern = new THREE.Group();
      const blades = 5 + Math.floor(Math.random() * 4);
      for (let b = 0; b < blades; b++) {
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.1, 0.7),
          fernMat
        );
        blade.geometry.translate(0, 0.35, 0);
        blade.rotation.y = (b / blades) * Math.PI * 2;
        blade.rotation.x = 0.2 + Math.random() * 0.3;
        fern.add(blade);
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 20;
      fern.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      fern.scale.setScalar(0.7 + Math.random() * 1.2);
      this.scene.add(fern);
      this.plants.push(fern);
    }

    // 远景树木（Kenney GLB）带轮廓线
    const treeTypes = ['tree_default', 'tree_cone', 'tree_blocks'];
    for (let i = 0; i < 32; i++) {
      const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      const tree = cloneAsset(type);
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 38;
      tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const s = 1.3 + Math.random() * 1.2;
      tree.scale.set(s, s, s);
      tree.castShadow = true;
      tree.receiveShadow = true;
      this._addOutlines(tree, 0x1a3015, 0.4);
      this.scene.add(tree);
      this.trees.push(tree);
    }

    // 中景灌木丛（低多面体球）
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e7a2e, roughness: 0.9 });
    for (let i = 0; i < 24; i++) {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), bushMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 16;
      bush.position.set(Math.cos(angle) * dist, 0.4, Math.sin(angle) * dist);
      bush.scale.set(0.4 + Math.random() * 0.6, 0.3 + Math.random() * 0.5, 0.4 + Math.random() * 0.6);
      bush.castShadow = true;
      bush.receiveShadow = true;
      this.scene.add(bush);
    }

    // 空中孢子 / 花粉粒子增多
    const pollenGeo = new THREE.BufferGeometry();
    const pollenCount = 220;
    const pp = new Float32Array(pollenCount * 3);
    for (let i = 0; i < pollenCount; i++) {
      pp[i * 3] = (Math.random() - 0.5) * 50;
      pp[i * 3 + 1] = Math.random() * 10;
      pp[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }

    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pollenMat = new THREE.PointsMaterial({ color: 0xfffaa0, size: 0.12, transparent: true, opacity: 0.5 });
    this.pollen = new THREE.Points(pollenGeo, pollenMat);
    this.pollen.userData.speeds = Array.from({ length: pollenCount }, () => 0.05 + Math.random() * 0.1);
    this.scene.add(this.pollen);

    return this.scene;
  }

  _addOutlines(root, color = 0x111111, opacity = 0.4) {
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    root.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.geometry.type === 'PlaneGeometry' || child.geometry.type === 'BufferGeometry') return;
      try {
        const edges = new THREE.EdgesGeometry(child.geometry, 30);
        const line = new THREE.LineSegments(edges, lineMat);
        line.scale.setScalar(1.01);
        line.renderOrder = 1;
        child.add(line);
      } catch (e) { /* ignore */ }
    });
  }

  update(time, delta) {
    super.update(time, delta);
    for (const plant of this.plants) {
      plant.rotation.z = Math.sin(time * 1.2 + plant.position.x) * 0.03;
    }
    if (this.pollen) {
      const positions = this.pollen.geometry.attributes.position.array;
      const speeds = this.pollen.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        positions[i * 3 + 1] -= speeds[i] * delta;
        positions[i * 3] += Math.sin(time + i) * 0.005;
        if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 8;
      }
      this.pollen.geometry.attributes.position.needsUpdate = true;
    }
  }
}
