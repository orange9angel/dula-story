/**
 * SubwayHubScene — 废弃的旧地铁站台
 *
 * 环境叙事重点：
 *   - 阴暗、潮湿的站台，远处隧道漆黑一片
 *   - 锈迹钢轨、破碎瓷砖、混凝土立柱
 *   - 天花板残破的荧光灯偶尔闪烁
 *   - 可随 MoodDirector 切换的警报灯（alert/combat 变红闪烁）
 *   - 与 S1 的霓虹高速公路/无人机战斗完全不同
 */

import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class SubwayHubScene extends SceneBase {
  constructor() {
    super('SubwayHubScene');
    this.time = 0;
    this.alertLights = [];
    this.fluorescentLights = [];
    this.dripEmitters = [];
  }

  build() {
    super.build();

    // 深褐/青灰背景
    this.scene.background = new THREE.Color(0x040507);
    this.scene.fog = new THREE.FogExp2(0x040507, 0.022);

    // 提升基础亮度：环境光 + 冷色方向光
    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 0.90;
        l.color.setHex(0x304050);
      }
      if (l.isDirectionalLight) {
        l.intensity = 1.30;
        l.color.setHex(0x667788);
        l.position.set(0, 8, 12);
      }
    });

    // 正面补光：让角色脸部清晰可见
    const faceFill = new THREE.DirectionalLight(0xddeeff, 4.5);
    faceFill.position.set(0, 4, 14);
    this.scene.add(faceFill);

    // 侧后方轮廓光：让角色从黑暗背景中分离
    const rimLight = new THREE.DirectionalLight(0x88aaff, 1.5);
    rimLight.position.set(0, 3, -8);
    this.scene.add(rimLight);

    // 半球光：补充间接漫反射
    const hemiLight = new THREE.HemisphereLight(0x334455, 0x111116, 0.5);
    this.scene.add(hemiLight);

    // ═══════════════════════════════════════════════════════════════════
    // 站台地面：肮脏瓷砖
    // ═══════════════════════════════════════════════════════════════════
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 512;
    tileCanvas.height = 512;
    const tctx = tileCanvas.getContext('2d');
    tctx.fillStyle = '#0a0b10';
    tctx.fillRect(0, 0, 512, 512);
    tctx.strokeStyle = '#1a1c24';
    tctx.lineWidth = 2;
    const tileSize = 64;
    for (let y = 0; y <= 512; y += tileSize) {
      tctx.beginPath(); tctx.moveTo(0, y); tctx.lineTo(512, y); tctx.stroke();
    }
    for (let x = 0; x <= 512; x += tileSize) {
      tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, 512); tctx.stroke();
    }
    for (let i = 0; i < 6000; i++) {
      tctx.fillStyle = Math.random() > 0.5 ? '#101218' : '#050508';
      tctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(12, 8);

    const platformMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.75,
      metalness: 0.15,
      color: 0x33333a,
    });
    const platform = new THREE.Mesh(new THREE.PlaneGeometry(36, 24), platformMat);
    platform.rotation.x = -Math.PI / 2;
    platform.position.set(0, 0, 0);
    platform.receiveShadow = true;
    this.scene.add(platform);

    // 站台边缘安全线
    const edgeLine = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.55 })
    );
    edgeLine.rotation.x = -Math.PI / 2;
    edgeLine.position.set(0, 0.005, 3.6);
    this.scene.add(edgeLine);

    // ═══════════════════════════════════════════════════════════════════
    // 钢轨与枕木
    // ═══════════════════════════════════════════════════════════════════
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.4, metalness: 0.75 });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.9 });
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.95 });

    // 碎石道床
    const ballast = new THREE.Mesh(new THREE.PlaneGeometry(12, 60), ballastMat);
    ballast.rotation.x = -Math.PI / 2;
    ballast.position.set(0, -0.12, 0);
    this.scene.add(ballast);

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 60), railMat);
      rail.position.set(side * 1.6, 0.05, 0);
      this.scene.add(rail);
    }

    for (let z = -28; z < 28; z += 0.8) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.35), sleeperMat);
      sleeper.position.set(0, -0.05, z);
      this.scene.add(sleeper);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 混凝土立柱
    // ═══════════════════════════════════════════════════════════════════
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x33343a, roughness: 0.85, metalness: 0.15 });
    for (let z = -18; z <= 18; z += 9) {
      for (const x of [-6, 6]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.5, 0.9), pillarMat);
        pillar.position.set(x, 3.75, z);
        this.scene.add(pillar);

        // 立柱底部积水反光
        const puddle = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.6),
          new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.6 })
        );
        puddle.rotation.x = -Math.PI / 2;
        puddle.position.set(x, 0.01, z + 0.8);
        this.scene.add(puddle);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 天花板与荧光灯
    // ═══════════════════════════════════════════════════════════════════
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.9 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(36, 60), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 7.5, 0);
    this.scene.add(ceiling);

    for (let z = -20; z <= 20; z += 5) {
      const fixture = new THREE.Group();
      fixture.position.set(0, 7.3, z);

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.12, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.5 })
      );
      fixture.add(housing);

      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.02, 0.28),
        new THREE.MeshBasicMaterial({ color: 0xccffee, transparent: true, opacity: 0.55 })
      );
      tube.position.y = -0.05;
      fixture.add(tube);

      const light = new THREE.PointLight(0xaaddcc, 1.00, 14, 1.5);
      light.position.set(0, -0.4, 0);
      fixture.add(light);

      this.scene.add(fixture);
      this.fluorescentLights.push({ group: fixture, tube, light, phase: Math.random() * Math.PI * 2, broken: Math.random() > 0.65 });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 警报灯（可随 Mood 变红闪烁）
    // ═══════════════════════════════════════════════════════════════════
    for (const z of [-18, -9, 0, 9, 18]) {
      for (const x of [-5.4, 5.4]) {
        const alertGeo = new THREE.SphereGeometry(0.14, 12, 12);
        const alertMat = new THREE.MeshBasicMaterial({ color: 0x331111 });
        const alertMesh = new THREE.Mesh(alertGeo, alertMat);
        alertMesh.position.set(x, 6.8, z);
        this.scene.add(alertMesh);

        const alertLight = new THREE.PointLight(0xff0000, 0, 14, 1.6);
        alertLight.position.set(x, 6.4, z);
        this.scene.add(alertLight);

        this.alertLights.push({ mesh: alertMesh, light: alertLight, phase: Math.random() * Math.PI * 2 });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 远端隧道：漆黑洞口 + 微弱远光
    // ═══════════════════════════════════════════════════════════════════
    const tunnelCanvas = document.createElement('canvas');
    tunnelCanvas.width = 256;
    tunnelCanvas.height = 128;
    const tunCtx = tunnelCanvas.getContext('2d');
    const tunGrad = tunCtx.createLinearGradient(0, 0, 0, 128);
    tunGrad.addColorStop(0, 'rgba(0,0,0,0)');
    tunGrad.addColorStop(0.5, 'rgba(40,60,80,0.25)');
    tunGrad.addColorStop(1, 'rgba(0,0,0,0)');
    tunCtx.fillStyle = tunGrad;
    tunCtx.fillRect(0, 0, 256, 128);
    const tunnelTex = new THREE.CanvasTexture(tunnelCanvas);
    const tunnelGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      new THREE.MeshBasicMaterial({ map: tunnelTex, transparent: true, opacity: 0.5, depthWrite: false })
    );
    tunnelGlow.position.set(0, 2.5, -28);
    this.scene.add(tunnelGlow);

    // 隧道口黑幕
    const tunnelVoid = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    tunnelVoid.position.set(0, 2.5, -28.1);
    this.scene.add(tunnelVoid);

    // ═══════════════════════════════════════════════════════════════════
    // 环境细节：废弃指示牌 / 涂鸦墙
    // ═══════════════════════════════════════════════════════════════════
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256; signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#0a0a0f';
    sctx.fillRect(0, 0, 256, 128);
    sctx.fillStyle = '#ff3333';
    sctx.font = 'bold 40px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('CLOSED', 128, 55);
    sctx.fillStyle = '#88ccff';
    sctx.font = '24px sans-serif';
    sctx.fillText('EXIT → REACTOR', 128, 95);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.4),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true, opacity: 0.7 })
    );
    sign.position.set(-6.8, 2.8, -5);
    sign.rotation.y = Math.PI / 2;
    this.scene.add(sign);

    // 墙体（站台两侧）
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.5, 60), wallMat);
      wall.position.set(side * 11, 3.75, 0);
      this.scene.add(wall);
    }

    return this.scene;
  }

  setAlertLevel(level, color = 0xff0000) {
    this.alertLevel = level;
    this.alertColor = new THREE.Color(color);
    for (const alert of this.alertLights) {
      alert.mesh.material.color.setHex(level > 0 ? color : 0x331111);
      alert.light.color.setHex(color);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    this.time = time;

    // 荧光灯闪烁
    this.fluorescentLights.forEach((fl) => {
      if (fl.broken) {
        const flicker = Math.sin(time * 12 + fl.phase) > 0.7 ? 0.55 : 0.08;
        fl.tube.material.opacity = flicker;
        fl.light.intensity = flicker * 1.5;
      } else {
        const hum = 0.9 + 0.1 * Math.sin(time * 6 + fl.phase);
        fl.tube.material.opacity = 0.55 * hum;
        fl.light.intensity = 0.70 * hum;
      }
    });

    // 警报灯
    if (this.alertLevel > 0) {
      const speed = this.alertLevel === 2 ? 10 : 4;
      for (const alert of this.alertLights) {
        const intensity = Math.max(0, Math.sin(time * speed + alert.phase));
        alert.light.intensity = intensity * 2.4;
        alert.mesh.material.color.setHex(intensity > 0.5 ? this.alertColor.getHex() : 0x331111);
      }
    }
  }
}
