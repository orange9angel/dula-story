import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class FeudalForestScene extends SceneBase {
  constructor() {
    super('FeudalForestScene');
    this.fireflies = [];
    this.leaves = [];
    this.miasmaClouds = [];
    this.windScarLines = [];
    this.purifyStarted = false;
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0x122017);
    this.scene.fog = new THREE.Fog(0x122017, 9, 38);

    this.lights.forEach((light) => {
      if (light.isAmbientLight) {
        light.color.setHex(0x365238);
        light.intensity = 0.55;
      }
      if (light.isDirectionalLight) {
        light.color.setHex(0xfff0c2);
        light.intensity = 0.55;
        light.position.set(-6, 14, 8);
      }
    });

    const moonLight = new THREE.DirectionalLight(0xaec8ff, 0.35);
    moonLight.position.set(6, 12, -8);
    this.scene.add(moonLight);

    const groundGeo = new THREE.PlaneGeometry(70, 70, 18, 18);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      pos.setZ(i, z + (Math.random() - 0.5) * 0.28);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x30472f, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this._addSacredTree();
    this._addBoneEatersWell();
    this._addToriiGate();
    this._addForest();
    this._addFireflies();
    this._addMiasma();
    this._addWindScarLines();

    return this.scene;
  }

  _addSacredTree() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3824, roughness: 0.9 });
    const barkDarkMat = new THREE.MeshStandardMaterial({ color: 0x392216, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f5d31, roughness: 0.8 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8c596, roughness: 0.9 });
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xf5f0dc, side: THREE.DoubleSide });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.9, 6.8, 18), trunkMat);
    trunk.position.set(-4.5, 3.4, -4.5);
    trunk.castShadow = true;
    this.scene.add(trunk);

    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.045, 6.4, 0.06), barkDarkMat);
      groove.position.set(-4.5 + Math.cos(angle) * 0.62, 3.35, -4.5 + Math.sin(angle) * 0.62);
      groove.rotation.y = -angle;
      this.scene.add(groove);
    }

    const canopyPositions = [
      [-4.5, 7.4, -4.5, 2.2],
      [-6.0, 6.5, -4.2, 1.6],
      [-3.0, 6.6, -4.0, 1.7],
      [-4.8, 6.4, -6.0, 1.5],
      [-4.0, 8.2, -5.6, 1.5],
    ];
    for (const [x, y, z, s] of canopyPositions) {
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 16), leafMat);
      leaves.position.set(x, y, z);
      leaves.castShadow = true;
      this.scene.add(leaves);
      this.leaves.push({ mesh: leaves, baseY: y, phase: Math.random() * Math.PI * 2 });
    }

    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 64), ropeMat);
    rope.position.set(-4.5, 3.7, -4.5);
    rope.rotation.x = Math.PI / 2;
    this.scene.add(rope);

    for (let i = -2; i <= 2; i++) {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.42), paperMat);
      paper.position.set(-4.5 + i * 0.24, 3.42, -3.78);
      paper.rotation.z = i * 0.06;
      this.scene.add(paper);
    }
  }

  _addBoneEatersWell() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4b2c1d, roughness: 0.9 });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x09050a });

    const well = new THREE.Group();
    well.position.set(3.8, 0, 2.2);

    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.9, 18, 1, true), woodMat);
    wall.position.y = 0.45;
    well.add(wall);

    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.78, 18), darkMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.92;
    well.add(inner);

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.08), woodMat);
      plank.position.set(Math.cos(angle) * 0.92, 0.45, Math.sin(angle) * 0.92);
      plank.rotation.y = -angle;
      well.add(plank);
    }

    this.scene.add(well);
  }

  _addToriiGate() {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xa42018, roughness: 0.65 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.8 });
    const gate = new THREE.Group();
    gate.position.set(4.6, 0, -5.6);
    gate.rotation.y = -0.25;

    for (const x of [-0.85, 0.85]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.5, 12), redMat);
      post.position.set(x, 1.25, 0);
      gate.add(post);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), blackMat);
      foot.position.set(x, 0.06, 0);
      gate.add(foot);
    }

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 0.22), redMat);
    lintel.position.set(0, 2.45, 0);
    gate.add(lintel);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 0.26), blackMat);
    top.position.set(0, 2.68, 0);
    gate.add(top);
    const center = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), redMat);
    center.position.set(0, 2.25, 0);
    gate.add(center);

    this.scene.add(gate);
  }

  _addForest() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x44301f, roughness: 0.9 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x17451f, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x235b2a, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x2f6d35, roughness: 0.85 }),
    ];
    const positions = [
      [-11, -8], [-9, 3], [-8, 10], [-2, -13], [3, -12], [8, -8],
      [10, -1], [9, 8], [1, 12], [-13, 1], [13, 4], [-6, -14],
    ];

    for (let i = 0; i < positions.length; i++) {
      const [x, z] = positions[i];
      const scale = 0.9 + Math.random() * 0.7;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 3.2 * scale, 10), trunkMat);
      trunk.position.set(x, 1.6 * scale, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      for (let j = 0; j < 3; j++) {
        const leaves = new THREE.Mesh(new THREE.SphereGeometry((1.2 + j * 0.2) * scale, 12, 12), leafMats[(i + j) % leafMats.length]);
        leaves.position.set(x + (Math.random() - 0.5) * scale, 3.4 * scale + j * 0.55, z + (Math.random() - 0.5) * scale);
        leaves.castShadow = true;
        this.scene.add(leaves);
        this.leaves.push({ mesh: leaves, baseY: leaves.position.y, phase: Math.random() * Math.PI * 2 });
      }
    }

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x65675d, roughness: 0.95 });
    for (let i = 0; i < 14; i++) {
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.25, 10, 10), stoneMat);
      stone.position.set((Math.random() - 0.5) * 14, 0.08, (Math.random() - 0.5) * 12);
      stone.scale.y = 0.35;
      this.scene.add(stone);
    }
  }

  _addFireflies() {
    for (let i = 0; i < 42; i++) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.027, 6, 6),
        new THREE.MeshBasicMaterial({ color: i % 5 === 0 ? 0x9ee7ff : 0xfff0a0, transparent: true, opacity: 0.7 })
      );
      const base = new THREE.Vector3((Math.random() - 0.5) * 24, 0.7 + Math.random() * 3.5, (Math.random() - 0.5) * 22);
      light.position.copy(base);
      this.scene.add(light);
      this.fireflies.push({
        mesh: light,
        base,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.4,
      });
    }
  }

  _addMiasma() {
    const colors = [0x582069, 0x30113d, 0x7d315c];
    for (let i = 0; i < 26; i++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + Math.random() * 0.42, 10, 10),
        new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      cloud.position.set((Math.random() - 0.5) * 3.4, 0.6 + Math.random() * 2.2, -4.7 + (Math.random() - 0.5) * 2.2);
      this.scene.add(cloud);
      this.miasmaClouds.push({
        mesh: cloud,
        base: cloud.position.clone(),
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.shard = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf3d7ff,
        emissive: 0xc75cff,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0,
      })
    );
    this.shard.position.set(0, 1.45, -3.2);
    this.scene.add(this.shard);
  }

  _addWindScarLines() {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffe8a0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 5.5), lineMat.clone());
      line.position.set((i - 2) * 0.26, 0.75 + i * 0.08, -2.0 - i * 0.12);
      line.rotation.y = 0.05 * (i - 2);
      line.rotation.z = -0.22 + i * 0.08;
      this.scene.add(line);
      this.windScarLines.push(line);
    }
  }

  showMiasma() {
    this.miasmaVisible = true;
  }

  setWeather() {
    this.showMiasma();
  }

  purifyMiasma() {
    this.purifyStarted = true;
    this.miasmaVisible = false;
  }

  shardGlow() {
    this.shardVisible = true;
  }

  windScarTrail() {
    this.windScarStart = performance.now() / 1000;
    for (const line of this.windScarLines) {
      line.material.opacity = 0.82;
    }
  }

  update(time, delta) {
    super.update(time, delta);

    for (const firefly of this.fireflies) {
      firefly.mesh.position.x = firefly.base.x + Math.sin(time * firefly.speed + firefly.phase) * 0.8;
      firefly.mesh.position.y = firefly.base.y + Math.sin(time * firefly.speed * 1.4 + firefly.phase) * 0.25;
      firefly.mesh.position.z = firefly.base.z + Math.cos(time * firefly.speed * 0.7 + firefly.phase) * 0.8;
      firefly.mesh.material.opacity = 0.35 + Math.sin(time * 4 + firefly.phase) * 0.3;
    }

    for (const leaf of this.leaves) {
      leaf.mesh.position.y = leaf.baseY + Math.sin(time * 0.8 + leaf.phase) * 0.03;
      leaf.mesh.rotation.y += delta * 0.025;
    }

    for (const cloud of this.miasmaClouds) {
      const target = this.miasmaVisible ? 0.34 : 0.0;
      cloud.mesh.material.opacity += (target - cloud.mesh.material.opacity) * 0.08;
      cloud.mesh.position.x = cloud.base.x + Math.sin(time * 0.8 + cloud.phase) * 0.24;
      cloud.mesh.position.y = cloud.base.y + Math.sin(time * 1.2 + cloud.phase) * 0.16;
      cloud.mesh.rotation.y += delta * 0.5;
      if (this.purifyStarted) {
        cloud.mesh.scale.multiplyScalar(0.992);
      }
    }

    if (this.shard) {
      const targetOpacity = this.shardVisible ? 0.95 : 0;
      this.shard.material.opacity += (targetOpacity - this.shard.material.opacity) * 0.08;
      this.shard.material.emissiveIntensity = 0.25 + Math.sin(time * 5) * 0.2;
      this.shard.rotation.y += delta * 1.8;
      this.shard.rotation.x += delta * 0.8;
    }

    if (this.windScarLines.length) {
      for (const line of this.windScarLines) {
        line.position.z -= delta * 4.2;
        line.material.opacity *= 0.94;
        if (line.material.opacity < 0.01) {
          line.position.z = -2.0;
          line.material.opacity = 0;
        }
      }
    }
  }
}
