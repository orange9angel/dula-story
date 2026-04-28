import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * DarkMountainScene - Zhangwei Mountain (章尾山)
 * A primordial, dark landscape where Zhulong dwells.
 * Near-total darkness with jagged silhouettes and heavy fog.
 */
export class DarkMountainScene extends SceneBase {
  constructor() {
    super('DarkMountainScene');
  }

  build() {
    super.build();

    // Near-black background
    this.scene.background = new THREE.Color(0x020204);

    // Heavy fog to obscure distance and create mystery
    this.scene.fog = new THREE.FogExp2(0x080810, 0.012);

    // Ground: uneven dark terrain
    const groundGeo = new THREE.PlaneGeometry(100, 100, 30, 30);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Rugged terrain with large low-frequency waves + small noise
      const z = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 2.0
                + Math.sin(x * 0.25 + 1.3) * 0.4
                + (Math.random() - 0.5) * 0.3;
      pos.setZ(i, z);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x101018,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant mountain silhouettes (jagged cones)
    const mtnMat = new THREE.MeshToonMaterial({ color: 0x0a0a14 });
    for (let i = 0; i < 9; i++) {
      const height = 10 + Math.random() * 20;
      const width = 5 + Math.random() * 8;
      const mtnGeo = new THREE.ConeGeometry(width, height, 4);
      const mtn = new THREE.Mesh(mtnGeo, mtnMat);
      const angle = (i / 9) * Math.PI * 2;
      const dist = 30 + Math.random() * 15;
      mtn.position.set(
        Math.cos(angle) * dist,
        height / 2 - 3,
        Math.sin(angle) * dist - 10
      );
      mtn.rotation.y = Math.random() * Math.PI;
      this.scene.add(mtn);
    }

    // Foreground dark rocks
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x121220,
      roughness: 0.9,
    });
    for (let i = 0; i < 15; i++) {
      const size = 0.6 + Math.random() * 2.0;
      const rockGeo = new THREE.DodecahedronGeometry(size, 0);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * 40,
        size * 0.4,
        (Math.random() - 0.5) * 25 + 5
      );
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.castShadow = true;
      this.scene.add(rock);
    }

    // Dim down the default SceneBase lights (they're too bright for this scene)
    for (const light of this.lights) {
      light.intensity *= 0.15;
    }

    // Add a subtle cool ambient so silhouettes remain visible
    const nightAmbient = new THREE.AmbientLight(0x1e1e3a, 0.35);
    this.scene.add(nightAmbient);
    this.lights.push(nightAmbient);

    // A faint moon-like directional from high above
    const moonLight = new THREE.DirectionalLight(0x3a4a6a, 0.25);
    moonLight.position.set(20, 50, 10);
    this.scene.add(moonLight);
    this.lights.push(moonLight);

    return this.scene;
  }
}
