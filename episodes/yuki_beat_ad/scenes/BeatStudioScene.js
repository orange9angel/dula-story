import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class BeatStudioScene extends SceneBase {
  constructor() { super('BeatStudioScene'); }
  build() {
    this.scene.background = new THREE.Color(0xf6e9dd);
    this.scene.add(new THREE.HemisphereLight(0xfffaf2, 0xb4a7d2, 1.2));
    const key = new THREE.DirectionalLight(0xfffaf5, 2.4);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -2;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc6c4ff, 1.5);
    rim.position.set(3, 3, -2);
    this.scene.add(rim);

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ color: 0xf6e9dd }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:0.15}));
    shadow.rotation.x = -Math.PI/2; shadow.position.y = 0.001; shadow.receiveShadow = true;
    this.scene.add(shadow);

    this.halo = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.13, 20, 80),
      new THREE.MeshStandardMaterial({ color: 0xff694f, roughness: 0.35 }));
    this.halo.position.set(0, 1.14, -1.2);
    this.scene.add(this.halo);
    this.registerCameraObstacle({type:'box', center:new THREE.Vector3(0,1.14,-1.2), size:new THREE.Vector3(2.3,2.3,0.3)});
    this.orbit = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const shape = i % 2 === 0 ? new THREE.OctahedronGeometry(0.11) : new THREE.SphereGeometry(0.08, 16, 16);
      const mesh = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({
        color: [0xff6b50, 0x9280db, 0xf5c94e, 0x4aac99][i % 4], roughness: 0.3, metalness: 0.08,
      }));
      mesh.position.set(Math.cos(i * 0.9) * 0.95, 1.3 + Math.sin(i * 0.9) * 0.84, -0.55);
      this.orbit.add(mesh);
    }
    this.scene.add(this.orbit);
    this.footRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.55, 72),
      new THREE.MeshBasicMaterial({ color: 0xff694f, side: THREE.DoubleSide }));
    this.footRing.rotation.x = -Math.PI / 2;
    this.footRing.position.y = 0.003;
    this.scene.add(this.footRing);
    return this.scene;
  }
  update(time, delta) {
    super.update(time, delta);
    const actor = this.characters[0];
    const pose = actor?.mesh.userData.adPose ?? 'hello';
    const palettes = {
      hello: [0xf6e9dd, 0xff694f], step: [0xd5eade, 0x338779],
      swing: [0xe4def7, 0x8b65d5], turn: [0xffe5b5, 0xf79338],
      pop: [0xdfecc6, 0x3b8068], wink: [0xf6dce2, 0xec6683], finale: [0xf6e9dd, 0xff694f],
    };
    const [bg, accent] = palettes[pose];
    this.scene.background.setHex(bg);
    this.floor.material.color.setHex(bg);
    this.halo.material.color.setHex(accent);
    this.footRing.material.color.setHex(accent);
    const pulse = Math.exp(-((time * 2.5) % 1) * 7);
    this.halo.scale.setScalar(1 + pulse * 0.035);
    this.halo.rotation.z = time * 0.08;
    this.footRing.scale.setScalar(1 + pulse * 0.15);
    this.orbit.children.forEach((m, i) => {
      m.rotation.set(time * 0.6 + i, time * 0.9, i * 0.5);
      m.position.y = 1.3 + Math.sin(i * 0.9) * 0.84 + Math.sin(time * 1.8 + i) * 0.055;
    });
  }
}
