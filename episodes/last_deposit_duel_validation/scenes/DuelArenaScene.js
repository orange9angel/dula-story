import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class DuelArenaScene extends SceneBase {
  constructor() {
    super('DuelArenaScene');
    this.time = 0;
    this.alertLevel = 0;
    this.alertLights = [];
    this.ringLights = [];
    this.scorePanels = [];
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0x05070c);
    this.scene.fog = new THREE.FogExp2(0x05070c, 0.018);

    this.lights.forEach((light) => {
      if (light.isAmbientLight) {
        light.intensity = 2.4;
        light.color.setHex(0x2c3544);
      }
      if (light.isDirectionalLight) {
        light.intensity = 2.2;
        light.color.setHex(0xaecfff);
        light.position.set(0, 9, 8);
      }
    });

    const keyLight = new THREE.DirectionalLight(0xddeeff, 3.8);
    keyLight.position.set(0, 5, 10);
    this.scene.add(keyLight);

    const rimBlue = new THREE.DirectionalLight(0x55ccff, 2.4);
    rimBlue.position.set(-6, 4, -7);
    this.scene.add(rimBlue);

    const rimRed = new THREE.DirectionalLight(0xff3355, 2.0);
    rimRed.position.set(6, 4, -7);
    this.scene.add(rimRed);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7.2, 96),
      new THREE.MeshStandardMaterial({
        color: 0x141a24,
        roughness: 0.35,
        metalness: 0.55,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(6.7, 7.05, 128),
      new THREE.MeshBasicMaterial({
        color: 0x22ccff,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.018;
    this.scene.add(outerRing);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.05, 2.15, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff3355,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.022;
    this.scene.add(innerRing);

    this._addGridLines();
    this._addArenaPosts();
    this._addScorePanels();

    const lowGlow = new THREE.PointLight(0x33bbff, 1.4, 12, 1.2);
    lowGlow.position.set(0, 0.55, 0);
    this.scene.add(lowGlow);

    return this.scene;
  }

  _addGridLines() {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x1fb7dd,
      transparent: true,
      opacity: 0.28,
    });

    for (let i = -6; i <= 6; i++) {
      const z = i;
      const half = Math.sqrt(Math.max(0, 6.4 * 6.4 - z * z));
      const points = [
        new THREE.Vector3(-half, 0.035, z),
        new THREE.Vector3(half, 0.035, z),
      ];
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
    }

    for (let i = -6; i <= 6; i++) {
      const x = i;
      const half = Math.sqrt(Math.max(0, 6.4 * 6.4 - x * x));
      const points = [
        new THREE.Vector3(x, 0.036, -half),
        new THREE.Vector3(x, 0.036, half),
      ];
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
    }
  }

  _addArenaPosts() {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x232a36,
      roughness: 0.55,
      metalness: 0.65,
    });
    const blueMat = new THREE.MeshBasicMaterial({
      color: 0x22ccff,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    });
    const redMat = new THREE.MeshBasicMaterial({
      color: 0xff3355,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(angle) * 8.4;
      const z = Math.sin(angle) * 8.4;

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.8, 0.22), postMat);
      post.position.set(x, 1.9, z);
      post.lookAt(0, 1.9, 0);
      this.scene.add(post);

      const lampMat = i % 2 === 0 ? blueMat : redMat;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.08), lampMat);
      lamp.position.set(x * 0.98, 2.8, z * 0.98);
      lamp.lookAt(0, 2.8, 0);
      this.scene.add(lamp);
      this.ringLights.push(lamp);

      const point = new THREE.PointLight(i % 2 === 0 ? 0x22ccff : 0xff3355, 0.85, 7, 1.7);
      point.position.set(x * 0.82, 2.6, z * 0.82);
      this.scene.add(point);
      this.alertLights.push(point);
    }
  }

  _addScorePanels() {
    const panelMat = new THREE.MeshBasicMaterial({
      color: 0x07111d,
      transparent: true,
      opacity: 0.82,
    });

    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      group.position.set(side * 5.6, 2.55, -6.2);
      group.rotation.y = side * -0.35;
      this.scene.add(group);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 0.05), panelMat);
      group.add(panel);

      const color = side < 0 ? 0x22ccff : 0xff3355;
      const barMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      for (let i = 0; i < 4; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.035), barMat);
        bar.position.set(-0.55 + i * 0.36, 0.12, 0.05);
        group.add(bar);
        this.scorePanels.push(bar);
      }
    }
  }

  setAlertLevel(level) {
    this.alertLevel = Math.max(0, Number(level) || 0);
  }

  update(time, delta) {
    super.update(time, delta);
    this.time = time;

    const pulse = 0.65 + 0.35 * Math.sin(time * (2.2 + this.alertLevel * 0.7));
    this.alertLights.forEach((light, i) => {
      light.intensity = (0.75 + this.alertLevel * 0.28) * (0.8 + pulse * 0.4);
      if (this.alertLevel >= 2 && i % 2 === 1) {
        light.color.setHex(0xff2233);
      }
    });

    this.ringLights.forEach((mesh, i) => {
      mesh.material.opacity = 0.38 + pulse * 0.28 + (this.alertLevel >= 2 && i % 2 === 1 ? 0.18 : 0);
    });

    this.scorePanels.forEach((mesh, i) => {
      mesh.scale.x = 0.75 + 0.25 * Math.sin(time * 3 + i);
    });
  }
}
