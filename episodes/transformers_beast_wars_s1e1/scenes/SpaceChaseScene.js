import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * SpaceChaseScene — 太空追逐
 * 深蓝星空、两艘简模飞船、引擎尾焰与坠落火花。
 */
export class SpaceChaseScene extends SceneBase {
  constructor() {
    super('SpaceChaseScene');
    this.stars = null;
    this.maximalShip = null;
    this.predaconShip = null;
  }

  addCharacter(character) {
    // 太空追逐场景不需要渲染角色，只保留引用用于对话逻辑
    if (!this.characters.includes(character)) {
      this.characters.push(character);
    }
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x050818);
    this.scene.fog = new THREE.Fog(0x050818, 30, 120);

    // 暗环境光 + 方向光（远处星云）
    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.25;
        l.color.setHex(0x2a3a6a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.6;
        l.color.setHex(0x88aaff);
        l.position.set(-20, 30, -20);
      }
    });

    // 星空
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.8 });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // Maximal 飞船 — 白蓝配色，流线型
    this.maximalShip = this._buildShip(0xe8f4ff, 0x33aaff, 1.0);
    this.maximalShip.position.set(-8, 2, -5);
    this.maximalShip.rotation.y = -0.3;
    this.scene.add(this.maximalShip);

    // Predacon 飞船 — 紫黑配色，带尖刺
    this.predaconShip = this._buildShip(0x2a1a3a, 0xff3355, -1.0);
    this.predaconShip.position.set(6, 1, -8);
    this.predaconShip.rotation.y = 0.4;
    this.scene.add(this.predaconShip);

    // 远处行星
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(12, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.8 })
    );
    planet.position.set(0, -25, -60);
    this.scene.add(planet);

    return this.scene;
  }

  _buildShip(baseColor, glowColor, directionSign) {
    const group = new THREE.Group();

    // 主体
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.4, metalness: 0.6 })
    );
    group.add(body);

    // 机翼
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.1, 2.4),
      new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.4, metalness: 0.6 })
    );
    wing.position.set(directionSign * 0.6, 0, 0);
    group.add(wing);

    // 驾驶舱
    const cockpit = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 })
    );
    cockpit.rotation.z = Math.PI / 2;
    cockpit.position.set(directionSign * 0.3, 0.35, 0);
    group.add(cockpit);

    // 引擎光
    const engineGeo = new THREE.ConeGeometry(0.25, 1.2, 16, 1, true);
    const engineMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.7 });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.rotation.z = directionSign > 0 ? Math.PI / 2 : -Math.PI / 2;
    engine.position.set(-directionSign * 1.8, 0, 0);
    group.add(engine);

    // 尾焰粒子占位
    const trailGeo = new THREE.BufferGeometry();
    const trailCount = 40;
    const trailPos = new Float32Array(trailCount * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trailMat = new THREE.PointsMaterial({ color: glowColor, size: 0.18, transparent: true, opacity: 0.6 });
    const trail = new THREE.Points(trailGeo, trailMat);
    trail.userData.offsets = Array.from({ length: trailCount }, () => Math.random());
    group.add(trail);

    return group;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.stars) {
      this.stars.rotation.y = time * 0.02;
    }
    if (this.maximalShip) {
      this.maximalShip.position.y = 2 + Math.sin(time * 1.2) * 0.3;
      this.maximalShip.rotation.z = Math.sin(time * 0.8) * 0.05;
    }
    if (this.predaconShip) {
      this.predaconShip.position.y = 1 + Math.sin(time * 1.5 + 1) * 0.35;
      this.predaconShip.rotation.z = Math.sin(time * 1.0 + 2) * 0.06;
    }
  }
}
