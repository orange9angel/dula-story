import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * PlasmaVaultScene — 等离子火花核心 vault
 * 深色金属舱室、六边形蜂巢地板、能量导管、核心支撑臂、数据面板。
 */
export class PlasmaVaultScene extends SceneBase {
  constructor() {
    super('PlasmaVaultScene');
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0x04060a);
    this.scene.fog = new THREE.FogExp2(0x04060a, 0.022);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 1.2;
        l.color.setHex(0x2a3a4a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 1.6;
        l.color.setHex(0x88ccff);
        l.position.set(0, 10, 10);
      }
    });

    // 正面补光：照亮角色脸部与正面装甲
    const faceFill = new THREE.DirectionalLight(0xddeeff, 2.0);
    faceFill.position.set(0, 6, 14);
    this.scene.add(faceFill);

    // 六边形蜂巢地板
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512; floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#080c12';
    fctx.fillRect(0, 0, 512, 512);
    fctx.strokeStyle = '#00ccff';
    fctx.lineWidth = 2;
    const hexR = 32;
    for (let y = 0; y < 512 + hexR; y += hexR * 1.73) {
      for (let x = 0; x < 512 + hexR; x += hexR * 3) {
        const offsetX = (Math.round(y / (hexR * 1.73)) % 2) * hexR * 1.5;
        this._drawHex(fctx, x + offsetX, y, hexR);
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.7 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // 墙壁立柱 + 数据面板
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.5, metalness: 0.6 });
    const glowTrimMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x001a2a });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 14;
      const z = Math.sin(angle) * 14;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 9, 1.4), pillarMat);
      pillar.position.set(x, 4.5, z);
      pillar.lookAt(0, 4.5, 0);
      this.scene.add(pillar);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 0.1), glowTrimMat);
      trim.position.set(x, 4.5, z);
      trim.lookAt(0, 4.5, 0);
      this.scene.add(trim);

      // 数据面板
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.06), panelMat);
      panel.position.set(x * 0.95, 3.5, z * 0.95);
      panel.lookAt(0, 3.5, 0);
      this.scene.add(panel);

      // 面板指示灯
      for (let j = 0; j < 5; j++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), this._randomLedMat());
        led.position.set(x * 0.94, 3.1 + j * 0.2, z * 0.94);
        led.lookAt(0, 3.1 + j * 0.2, 0);
        this.scene.add(led);
      }
    }

    // 穹顶
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x0a1018, side: THREE.BackSide });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.y = 9;
    this.scene.add(dome);

    // 天花板管线
    this._createCeilingConduits();

    // 能量核心悬浮平台
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.3, metalness: 0.8 })
    );
    platform.position.y = 0.12;
    this.scene.add(platform);

    // 平台发光环
    const ringGeo = new THREE.RingGeometry(2.8, 3.1, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.13;
    this.scene.add(ring);

    // 等离子火花核心
    this.coreGroup = new THREE.Group();
    this.coreGroup.position.set(0, 2.8, 0);
    this.scene.add(this.coreGroup);

    const coreGeo = new THREE.IcosahedronGeometry(0.55, 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, wireframe: true });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreGroup.add(this.coreMesh);

    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
    );
    this.coreGroup.add(innerCore);

    // 核心支撑臂
    this._createCoreArms();

    // 核心点光源
    this.coreLight = new THREE.PointLight(0x00ffff, 4, 22, 1.2);
    this.coreLight.position.copy(this.coreGroup.position);
    this.scene.add(this.coreLight);

    // 旋转光环
    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.85 + i * 0.4, 0.025, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      this.coreGroup.add(ring);
      this.rings.push(ring);
    }

    // 能量粒子流（减少数量，更有意义）
    this._createEnergyParticles();

    // 地面反射光
    const groundGlow = new THREE.PointLight(0x0088ff, 1.5, 14, 1.4);
    groundGlow.position.set(0, 0.5, 0);
    this.scene.add(groundGlow);

    return this.scene;
  }

  _drawHex(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _randomLedMat() {
    const colors = [0x00ccff, 0xff3300, 0xffff00, 0x00ff00];
    return new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
  }

  _createCeilingConduits() {
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.5, metalness: 0.6 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.6 });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12, 10), conduitMat);
      conduit.rotation.z = Math.PI / 2;
      conduit.rotation.y = angle;
      conduit.position.set(Math.cos(angle) * 6, 8.5, Math.sin(angle) * 6);
      this.scene.add(conduit);

      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 11, 8), glowMat);
      glow.rotation.z = Math.PI / 2;
      glow.rotation.y = angle;
      glow.position.set(Math.cos(angle) * 6, 8.5, Math.sin(angle) * 6);
      this.scene.add(glow);
    }
  }

  _createCoreArms() {
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.4, metalness: 0.7 });
    const jointMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const group = new THREE.Group();

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.8), armMat);
      arm.position.set(Math.cos(angle) * 1.4, 0, Math.sin(angle) * 1.4);
      arm.lookAt(0, 0, 0);
      group.add(arm);

      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), jointMat);
      joint.position.set(Math.cos(angle) * 2.6, 0, Math.sin(angle) * 2.6);
      group.add(joint);

      // 能量导管连接核心
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), jointMat);
      cable.rotation.z = Math.PI / 2;
      cable.rotation.y = angle;
      cable.position.set(Math.cos(angle) * 1.3, 0, Math.sin(angle) * 1.3);
      group.add(cable);

      this.coreGroup.add(group);
    }
  }

  _createEnergyParticles() {
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      radii[i] = 0.7 + Math.random() * 1.3;
      speeds[i] = 0.5 + Math.random() * 1.5;
      positions[i * 3] = Math.cos(angles[i]) * radii[i];
      positions[i * 3 + 1] = 1 + Math.random() * 3;
      positions[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00ffff, size: 0.07, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.particles = new THREE.Points(geo, mat);
    this.particles.userData = { angles, radii, speeds };
    this.coreGroup.add(this.particles);
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.coreMesh) {
      this.coreMesh.rotation.y = time * 0.5;
      this.coreMesh.rotation.z = time * 0.3;
      const pulse = 1 + Math.sin(time * 3) * 0.1;
      this.coreMesh.scale.setScalar(pulse);
    }

    if (this.coreLight) {
      this.coreLight.intensity = 3 + Math.sin(time * 4) * 1.0;
    }

    this.rings.forEach((ring, i) => {
      ring.rotation.x += delta * (0.3 + i * 0.2);
      ring.rotation.y += delta * (0.4 + i * 0.15);
    });

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      const { angles, radii, speeds } = this.particles.userData;
      for (let i = 0; i < angles.length; i++) {
        angles[i] += speeds[i] * delta;
        positions[i * 3] = Math.cos(angles[i]) * radii[i];
        positions[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
        positions[i * 3 + 1] += Math.sin(time * 2 + i) * 0.002;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
