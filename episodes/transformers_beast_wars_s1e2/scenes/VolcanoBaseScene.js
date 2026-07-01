import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

function cloneAsset(name) {
  const source = window.__transformerAssets?.[name];
  if (!source) {
    console.warn(`[VolcanoBaseScene] Asset not preloaded: ${name}`);
    return new THREE.Group();
  }
  return source.clone();
}

/**
 * VolcanoBaseScene — Predacon 火山基地
 * 更高细节的火山地表、岩浆裂纹、烟雾与轮廓线。
 */
export class VolcanoBaseScene extends SceneBase {
  constructor() {
    super('VolcanoBaseScene');
    this.smokeParticles = null;
    this.lavaGlow = null;
    this.sparks = null;
    this.lavaCracks = null;
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x1a0a0a);
    this.scene.fog = new THREE.FogExp2(0x2a1010, 0.012);

    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.55;
        l.color.setHex(0x6a2a2a);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.8;
        l.color.setHex(0xffaa88);
        l.position.set(-10, 18, -8);
      }
    });

    // 半球光让暗部不至于死黑
    const hemi = new THREE.HemisphereLight(0x552222, 0x1a0a0a, 0.4);
    this.scene.add(hemi);

    // 地面：带裂纹与余烬的火山岩
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 1024; groundCanvas.height = 1024;
    const ctx = groundCanvas.getContext('2d');
    ctx.fillStyle = '#2a1510'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = Math.random() * 3 + 0.5;
      const v = Math.random();
      ctx.fillStyle = v > 0.6 ? '#3a2018' : '#150a06';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // 裂纹
    ctx.strokeStyle = 'rgba(255, 60, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(10, 10);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    // 起伏火山地表
    const groundGeom = new THREE.PlaneGeometry(160, 160, 32, 32);
    const posAttr = groundGeom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // 中间低、四周高的火山口地形
      const d = Math.sqrt(x * x + y * y);
      const crater = Math.max(0, 1 - d / 18) * -1.8;
      const noise = Math.sin(x * 0.25) * Math.cos(y * 0.2) * 0.25
        + Math.sin(x * 0.6 + y * 0.4) * 0.1
        + (Math.random() - 0.5) * 0.1;
      posAttr.setZ(i, z + crater + noise);
    }
    groundGeom.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeom,
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x3a1a15, roughness: 0.95, emissive: 0x2a0805, emissiveIntensity: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 岩浆池（椭圆，更像真实火山湖）
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    lava.rotation.x = -Math.PI / 2;
    lava.scale.set(1, 0.7, 1);
    lava.position.set(0, 0.05, -10);
    this.scene.add(lava);

    // 岩浆泛光
    this.lavaGlow = new THREE.PointLight(0xff4400, 3.0, 30, 1.4);
    this.lavaGlow.position.set(0, 2.0, -10);
    this.scene.add(this.lavaGlow);

    // 火山口边缘（Kenney 岩石）带轮廓线
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const rock = cloneAsset('rock_tallA');
      rock.position.set(Math.cos(angle) * 9, 0, -10 + Math.sin(angle) * 9);
      rock.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.8 + Math.random() * 0.7;
      rock.scale.set(s, s, s);
      this._addOutlines(rock, 0x2a0a0a, 0.5);
      this.scene.add(rock);
    }

    // 大型陨石/火山口
    const crater = cloneAsset('crater_large');
    crater.position.set(0, -0.2, -10);
    crater.scale.set(2.5, 1.5, 2.5);
    this._addOutlines(crater, 0x2a0a0a, 0.4);
    this.scene.add(crater);

    // 坠机残骸（半块陨石/飞船残骸）
    const wreckage = cloneAsset('meteor_half');
    wreckage.position.set(4, 0.2, -6);
    wreckage.rotation.set(-0.3, -0.4, 0.2);
    wreckage.scale.set(1.8, 1.8, 1.8);
    this._addOutlines(wreckage, 0x2a0a0a, 0.5);
    this.scene.add(wreckage);

    // 散落的小陨石 / 火山石
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.95 });
    for (let i = 0; i < 25; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 20;
      rock.position.set(Math.cos(angle) * dist, 0.2 + Math.random() * 0.4, -10 + Math.sin(angle) * dist);
      const s = 0.3 + Math.random() * 0.7;
      rock.scale.set(s, s * 0.7, s);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = false;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // 远景火山锥剪影
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x1a0806, roughness: 1.0 });
    for (let i = 0; i < 5; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random() * 6, 18 + Math.random() * 12, 12), coneMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 45 + Math.random() * 35;
      cone.position.set(Math.cos(angle) * dist, -2, -10 + Math.sin(angle) * dist);
      cone.scale.z = 0.7 + Math.random() * 0.4;
      this.scene.add(cone);
    }

    // 烟雾粒子
    const smokeGeo = new THREE.BufferGeometry();
    const smokeCount = 120;
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3] = (Math.random() - 0.5) * 12;
      smokePos[i * 3 + 1] = Math.random() * 5;
      smokePos[i * 3 + 2] = -10 + (Math.random() - 0.5) * 8;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x887777,
      size: 1.6,
      map: this._createSoftParticle(),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.smokeParticles.userData.speeds = Array.from({ length: smokeCount }, () => 0.3 + Math.random() * 0.5);
    this.scene.add(this.smokeParticles);

    // 火星
    const sparkGeo = new THREE.BufferGeometry();
    const sparkCount = 90;
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 10;
      sparkPos[i * 3 + 1] = Math.random() * 3;
      sparkPos[i * 3 + 2] = -10 + (Math.random() - 0.5) * 6;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.45,
      map: this._createSoftParticle(),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.sparks = new THREE.Points(sparkGeo, sparkMat);
    this.sparks.userData.speeds = Array.from({ length: sparkCount }, () => 0.5 + Math.random() * 1.0);
    this.scene.add(this.sparks);

    return this.scene;
  }

  _createSoftParticle() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
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
    if (this.lavaGlow) {
      this.lavaGlow.intensity = 2.6 + Math.sin(time * 2.5) * 0.5;
    }
    if (this.smokeParticles) {
      const positions = this.smokeParticles.geometry.attributes.position.array;
      const speeds = this.smokeParticles.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        positions[i * 3 + 1] += speeds[i] * delta;
        if (positions[i * 3 + 1] > 8) {
          positions[i * 3 + 1] = 0;
        }
      }
      this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    }
    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const speeds = this.sparks.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        positions[i * 3 + 1] += speeds[i] * delta;
        positions[i * 3] += (Math.random() - 0.5) * 0.05;
        if (positions[i * 3 + 1] > 4) {
          positions[i * 3 + 1] = 0;
          positions[i * 3] = (Math.random() - 0.5) * 10;
        }
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
    }
  }
}
