import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * VacantLotScene（空地）— 哆啦A梦经典空地：开阔泥土地、后方矮混凝土围墙、
 * 侧后方三根叠放的水泥管（两下一大）、两棵树、蓝天散云与远处房子剪影。
 *
 * 设计要点：表演区（原点周围 ±4）保持空旷——无桌椅灯柱花坛等障碍物，
 * 避免运镜穿模/遮挡。所有装饰物都在表演区外（后方或两侧）。
 * 光照/天空风格与 ParkScene 一致（明亮卡通）。
 */
export class VacantLotScene extends SceneBase {
  constructor() {
    super('VacantLotScene');
    this.clouds = [];
  }

  build() {
    super.build();

    // Sky blue background (与 ParkScene 一致)
    this.scene.background = new THREE.Color(0x87ceeb);

    // ---- 草地基底（略哑光的绿） ----
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x69a84f, roughness: 1.0 });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // ---- 中央泥土地（空地主体，覆盖表演区） ----
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0xbfa06e, roughness: 1.0 });
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(13, 40), dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.012;
    dirt.receiveShadow = true;
    this.scene.add(dirt);

    // 泥土地上的几笔浅色干土斑（增加质感，贴片不挡镜头）
    const dryMat = new THREE.MeshStandardMaterial({ color: 0xcdb183, roughness: 1.0 });
    for (const [px, pz, pr] of [[-6, 3, 1.8], [5, -4, 2.4], [1, 7, 1.5], [-8, -5, 2.0]]) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(pr, 16), dryMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(px, 0.016, pz);
      patch.receiveShadow = true;
      this.scene.add(patch);
    }

    // ---- 后方矮混凝土围墙（z=-8，表演区外） ----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xa8a8a0, roughness: 0.9 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 0.4), wallMat);
    wall.position.set(0, 0.6, -8);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    // 墙顶压顶条
    const capMat = new THREE.MeshStandardMaterial({ color: 0x8f8f88, roughness: 0.9 });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(30.2, 0.12, 0.5), capMat);
    cap.position.set(0, 1.26, -8);
    this.scene.add(cap);
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.65, -8), size: new THREE.Vector3(30, 1.3, 0.6) });

    // ---- 水泥管（管径 1.2，能进小孩上半身） ----
    // 三根叠放堆移到更靠边后；一根单管横放在表演区边缘（管口朝 +x，供胖虎卡进去）
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.85, side: THREE.DoubleSide });
    const pipeInnerMat = new THREE.MeshStandardMaterial({ color: 0x3a3f42, roughness: 1.0 });
    const pipeRimMat = new THREE.MeshStandardMaterial({ color: 0x84888b, roughness: 0.9 });
    const makePipe = (px, py, pz, { axis = 'z', openEnd = null } = {}) => {
      const group = new THREE.Group();
      group.position.set(px, py, pz);
      // 管体（轴沿 axis，openEnded）
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 24, 1, true), pipeMat);
      if (axis === 'x') tube.rotation.z = Math.PI / 2;
      else tube.rotation.x = Math.PI / 2;
      tube.castShadow = true;
      tube.receiveShadow = true;
      group.add(tube);
      // 两端管口环沿与管内暗影（openEnd 端不加暗影圆盘，保持贯通可见）
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 10, 24), pipeRimMat);
        if (axis === 'x') {
          rim.rotation.y = Math.PI / 2;
          rim.position.x = side * 1.2;
        } else {
          rim.position.z = side * 1.2;
        }
        group.add(rim);
        const isOpenEnd = (openEnd === '+x' && axis === 'x' && side === 1) || (openEnd === '-x' && axis === 'x' && side === -1);
        if (isOpenEnd) continue;
        const inner = new THREE.Mesh(new THREE.CircleGeometry(0.52, 24), pipeInnerMat);
        if (axis === 'x') {
          inner.position.x = side * 1.18;
          inner.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          inner.position.z = side * 1.18;
          if (side === -1) inner.rotation.y = Math.PI;
        }
        group.add(inner);
      }
      this.scene.add(group);
      const size = axis === 'x' ? new THREE.Vector3(2.6, 1.4, 1.4) : new THREE.Vector3(1.4, 1.4, 2.6);
      this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(px, py, pz), size });
    };
    // 叠放管堆（更靠边后，不挡 E8 机位）
    makePipe(-8.6, 0.6, -7.5);
    makePipe(-6.4, 0.6, -7.5);
    makePipe(-7.5, 1.64, -7.5);
    // 单管（管口朝 +x 表演区；胖虎第二炮被轰进去）
    makePipe(-4.2, 0.6, 1.0, { axis: 'x', openEnd: '+x' });

    // ---- 树（两棵，均在表演区外） ----
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
    const makeTree = (tx, tz, scale = 1) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 1.8 * scale, 12), trunkMat);
      trunk.position.set(tx, 0.9 * scale, tz);
      trunk.castShadow = true;
      this.scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.5 * scale, 16, 16), leavesMat);
      leaves.position.set(tx, 2.6 * scale, tz);
      leaves.castShadow = true;
      this.scene.add(leaves);
      this.registerCameraObstacle({
        type: 'capsule',
        start: new THREE.Vector3(tx, 0, tz),
        end: new THREE.Vector3(tx, 3.4 * scale, tz),
        radius: 1.6 * scale,
      });
    };
    makeTree(7.5, -7.0, 1.1);
    makeTree(-11.0, -1.0, 0.9);

    // ---- 远处房子剪影（墙后，z≈-16~-20） ----
    const houseWalls = [0xd8c8b0, 0xc8d0d8, 0xe0d0b8];
    const roofColors = [0xa05038, 0x707880, 0x986040];
    const makeHouse = (hx, hz, w, h, d, i) => {
      const group = new THREE.Group();
      group.position.set(hx, 0, hz);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: houseWalls[i % 3], roughness: 0.95 })
      );
      body.position.y = h / 2;
      group.add(body);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.75, h * 0.55, 4),
        new THREE.MeshStandardMaterial({ color: roofColors[i % 3], roughness: 0.9 })
      );
      roof.position.y = h + h * 0.27;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      this.scene.add(group);
    };
    makeHouse(-9, -17, 4, 2.6, 3.4, 0);
    makeHouse(1, -19, 5, 3.0, 4, 1);
    makeHouse(10, -16, 3.6, 2.4, 3, 2);

    // ---- 泥土边缘杂草与小石（都在表演区外圈） ----
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0x5a9443, roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + 0.3;
      const r = 10.5 + (i % 3);
      const tx = Math.cos(angle) * r;
      const tz = Math.sin(angle) * r;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 6), tuftMat);
      tuft.position.set(tx, 0.17, tz);
      this.scene.add(tuft);
    }
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.95 });
    for (const [rx, rz, rs] of [[7, 2.5, 0.28], [-6.5, 4.5, 0.22], [8.5, -2.5, 0.34]]) {
      const rock = new THREE.Mesh(new THREE.SphereGeometry(rs, 10, 10), rockMat);
      rock.position.set(rx, rs * 0.5, rz);
      rock.scale.y = 0.55;
      rock.castShadow = true;
      this.scene.add(rock);
    }

    // ---- 云（少量，缓慢漂移，同 ParkScene 风格） ----
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, roughness: 1.0 });
    const cloudPositions = [
      [-12, 15, -22], [8, 17, -26], [18, 14, -18], [-4, 18, -30],
    ];
    for (const [cx, cy, cz] of cloudPositions) {
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(cx, cy, cz);
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < puffs; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 1.2, 12, 12), cloudMat);
        puff.position.set((Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2);
        cloudGroup.add(puff);
      }
      this.scene.add(cloudGroup);
      this.clouds.push({ group: cloudGroup, speed: 0.3 + Math.random() * 0.4 });
    }

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    for (const cloud of this.clouds) {
      cloud.group.position.x += cloud.speed * delta;
      if (cloud.group.position.x > 50) {
        cloud.group.position.x = -50;
      }
    }
  }
}
