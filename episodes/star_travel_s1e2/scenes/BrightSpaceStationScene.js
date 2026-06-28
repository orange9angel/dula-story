import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

function createLCDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // dark screen background
  ctx.fillStyle = '#061024';
  ctx.fillRect(0, 0, 512, 256);

  // grid
  ctx.strokeStyle = 'rgba(80, 160, 255, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // radar rings
  ctx.strokeStyle = 'rgba(80, 200, 255, 0.35)';
  for (let r = 30; r <= 110; r += 30) {
    ctx.beginPath(); ctx.arc(256, 128, r, 0, Math.PI * 2); ctx.stroke();
  }

  // data bars
  ctx.fillStyle = 'rgba(60, 180, 255, 0.45)';
  for (let i = 0; i < 16; i++) {
    const h = 10 + Math.random() * 60;
    ctx.fillRect(20 + i * 28, 220 - h, 18, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * BrightSpaceStationScene — 高亮度的飞船对接舱
 * 确保角色面部与细节在室内环境中清晰可见。
 */

export class BrightSpaceStationScene extends SceneBase {
  constructor() {
    super('BrightSpaceStationScene');
    this.holograms = [];
  }

  build() {
    super.build();

    // 明亮的蓝灰背景
    this.scene.background = new THREE.Color(0x424d66);

    // 提升引擎默认光
    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 1.8;
        l.color.setHex(0x98a6bf);
      }
      if (l.isDirectionalLight) {
        l.intensity = 2.0;
        l.color.setHex(0xfffbf0);
        l.position.set(2, 10, 8);
        l.castShadow = true;
      }
    });

    // 大面积半球填充光
    const fill = new THREE.HemisphereLight(0xf0f6ff, 0x6a768c, 1.5);
    this.scene.add(fill);

    // 天花板发光软箱（视觉+补光）
    const ceilingPanelGeo = new THREE.PlaneGeometry(20, 12);
    const ceilingPanelMat = new THREE.MeshBasicMaterial({
      color: 0xe8f0ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ceilingPanel = new THREE.Mesh(ceilingPanelGeo, ceilingPanelMat);
    ceilingPanel.rotation.x = Math.PI / 2;
    ceilingPanel.position.set(0, 5.48, 0);
    this.scene.add(ceilingPanel);

    // 顶部主光源
    const overhead = new THREE.PointLight(0xffffff, 3.5, 24, 0.9);
    overhead.position.set(0, 4.8, 0);
    this.scene.add(overhead);

    // 正面补光（照亮面部）
    const key = new THREE.PointLight(0xfff8e7, 3.0, 20, 1.0);
    key.position.set(0, 2.2, 5);
    this.scene.add(key);

    const front = new THREE.PointLight(0xfff4dd, 2.5, 18, 1.1);
    front.position.set(0, 1.5, 4);
    this.scene.add(front);

    // 从相机方向打来的聚光灯，确保正面细节
    const faceSpot = new THREE.SpotLight(0xffffff, 2.5);
    faceSpot.position.set(0, 2.5, 8);
    faceSpot.target.position.set(0, 1.2, 0);
    faceSpot.angle = Math.PI / 3;
    faceSpot.penumbra = 0.4;
    faceSpot.distance = 18;
    faceSpot.castShadow = false;
    this.scene.add(faceSpot);
    this.scene.add(faceSpot.target);

    // 左右轮廓光
    const rimL = new THREE.PointLight(0xaaccff, 1.8, 16, 1.2);
    rimL.position.set(-5, 2.5, -2);
    this.scene.add(rimL);

    const rimR = new THREE.PointLight(0xffddee, 1.6, 16, 1.2);
    rimR.position.set(5, 2.5, -2);
    this.scene.add(rimR);

    // 地面：浅灰金属
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x5c6478,
      roughness: 0.5,
      metalness: 0.45,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 天花板
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x6a7285,
      roughness: 0.6,
      metalness: 0.35,
    });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5.5;
    this.scene.add(ceil);

    // 墙壁：明亮的蓝灰
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x5c667c,
      roughness: 0.55,
      metalness: 0.35,
    });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 5.5, 0.3), wallMat);
    backWall.position.set(0, 2.75, -8);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 16), wallMat);
    leftWall.position.set(-12, 2.75, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 16), wallMat);
    rightWall.position.set(12, 2.75, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // 舷窗
    const windowFrame = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xc8d4e0, metalness: 0.7, roughness: 0.3 })
    );
    windowFrame.position.set(0, 2.8, -7.8);
    this.scene.add(windowFrame);

    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x12182a, side: THREE.DoubleSide })
    );
    glass.position.set(0, 2.8, -7.75);
    this.scene.add(glass);

    // 窗外星点
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 40; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), starMat);
      star.position.set(
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8,
        0.02
      );
      star.position.add(new THREE.Vector3(0, 2.8, -7.74));
      this.scene.add(star);
    }

    // 墙板条纹
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x6a7690, roughness: 0.5, metalness: 0.45 });
    for (let i = -2; i <= 2; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.05), panelMat);
      panel.position.set(i * 2.5, 2.5, -7.82);
      this.scene.add(panel);
    }

    // 全息桌
    const holoBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x4a5468, metalness: 0.8, roughness: 0.3 })
    );
    holoBase.position.set(0, 0.05, -4);
    this.scene.add(holoBase);

    const holoScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    holoScreen.position.set(0, 1.3, -4);
    this.scene.add(holoScreen);
    this.holograms.push(holoScreen);

    // 全息星球
    this.holoPlanet = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.45, wireframe: true })
    );
    this.holoPlanet.position.set(0, 1.4, -4);
    this.scene.add(this.holoPlanet);

    const holoRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.55, 32),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    holoRing.rotation.x = Math.PI / 2;
    holoRing.position.set(0, 1.4, -4);
    this.scene.add(holoRing);
    this.holoRing = holoRing;

    // 地面中央标志
    const emblem = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 1.75, 48),
      new THREE.MeshStandardMaterial({ color: 0x7a55cc, emissive: 0x5a35aa, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.4 })
    );
    emblem.rotation.x = -Math.PI / 2;
    emblem.position.set(0, 0.01, 0);
    emblem.receiveShadow = true;
    this.scene.add(emblem);

    const emblemInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.015, 6),
      new THREE.MeshStandardMaterial({ color: 0x9d7bff, emissive: 0x7a55cc, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.4 })
    );
    emblemInner.position.set(0, 0.01, 0);
    this.scene.add(emblemInner);

    // 天花板灯格
    const ceilLightMat = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.55 });
    for (let x = -10; x <= 10; x += 5) {
      for (let z = -6; z <= 6; z += 5) {
        const lightPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), ceilLightMat);
        lightPanel.rotation.x = Math.PI / 2;
        lightPanel.position.set(x, 5.46, z);
        this.scene.add(lightPanel);
      }
    }

    // 墙板发光饰条
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x88aaff });
    const backTrim = new THREE.Mesh(new THREE.BoxGeometry(22, 0.04, 0.02), trimMat);
    backTrim.position.set(0, 2.6, -7.84);
    this.scene.add(backTrim);

    const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 14), trimMat);
    sideTrim.position.set(-11.84, 2.6, 0);
    this.scene.add(sideTrim);

    const sideTrim2 = sideTrim.clone();
    sideTrim2.position.set(11.84, 2.6, 0);
    this.scene.add(sideTrim2);

    // 后墙监控屏
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x223355 });
    for (let i = -1; i <= 1; i++) {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), screenMat);
      screen.position.set(i * 3.5, 2.7, -7.84);
      this.scene.add(screen);

      const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.12 }));
      screenGlow.position.set(i * 3.5, 2.7, -7.83);
      this.scene.add(screenGlow);
      this.holograms.push(screenGlow);
    }

    // 侧墙控制台
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x3a4558, metalness: 0.7, roughness: 0.35 });
    for (const side of [-1, 1]) {
      const console = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 3.5), consoleMat);
      console.position.set(side * 10.5, 0.55, 2);
      console.castShadow = true;
      console.receiveShadow = true;
      this.scene.add(console);

      // 控制台全息图
      const holo = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.6),
        new THREE.MeshBasicMaterial({ color: side === -1 ? 0x44ffaa : 0xff66aa, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
      );
      holo.position.set(side * 10.18, 1.25, 2);
      holo.rotation.y = side * Math.PI / 2;
      this.scene.add(holo);
      this.holograms.push(holo);

      // 控制台按钮
      for (let z = 0.5; z <= 3.5; z += 0.6) {
        const btn = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xaaccff })
        );
        btn.position.set(side * 10.2, 1.05, z);
        this.scene.add(btn);
      }
    }

    // 角落立柱
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x505a6e, metalness: 0.5, roughness: 0.45 });
    for (const x of [-10.5, 10.5]) {
      for (const z of [-6.5, 6.5]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 5.5, 16), pillarMat);
        pillar.position.set(x, 2.75, z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.scene.add(pillar);

        const pillarGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 16), new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.5 }));
        pillarGlow.position.set(x, 4.2, z);
        this.scene.add(pillarGlow);
      }
    }

    // 舷窗细节：窗框十字
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc8d4e0, metalness: 0.7, roughness: 0.3 });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.02), frameMat);
    crossV.position.set(0, 2.8, -7.74);
    this.scene.add(crossV);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.02), frameMat);
    crossH.position.set(0, 2.8, -7.74);
    this.scene.add(crossH);

    // 驾驶室区域（两个飞行员座椅 + 控制台 + 弧形液晶大屏）
    const cockpitGroup = new THREE.Group();
    cockpitGroup.position.set(-6, 0, -4);

    const platform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 3), consoleMat);
    platform.position.set(0, 0.075, 0);
    platform.receiveShadow = true;
    cockpitGroup.add(platform);

    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a3444, roughness: 0.7, metalness: 0.3 });
    for (const side of [-1, 1]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), seatMat);
      seat.position.set(side * 0.8, 0.45, 0.4);
      seat.castShadow = true;
      cockpitGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.15), seatMat);
      back.position.set(side * 0.8, 0.85, -0.05);
      back.rotation.x = -0.15;
      cockpitGroup.add(back);
    }

    const consoleDesk = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.0, 0.5), consoleMat);
    consoleDesk.position.set(0, 0.5, -0.9);
    consoleDesk.castShadow = true;
    cockpitGroup.add(consoleDesk);

    const lcdTex = createLCDTexture();
    for (const side of [-1, 1]) {
      const lcd = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ map: lcdTex.clone(), transparent: true, opacity: 0.9 }));
      lcd.position.set(side * 1.0, 1.15, -1.15);
      lcd.rotation.x = -0.15;
      lcd.userData.baseOpacity = 0.9;
      cockpitGroup.add(lcd);
      this.holograms.push(lcd);
    }
    const centerLcd = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshBasicMaterial({ map: lcdTex.clone(), transparent: true, opacity: 0.9 }));
    centerLcd.position.set(0, 1.2, -1.15);
    centerLcd.rotation.x = -0.15;
    centerLcd.userData.baseOpacity = 0.9;
    cockpitGroup.add(centerLcd);
    this.holograms.push(centerLcd);

    const curvedLcdGeo = new THREE.CylinderGeometry(2.6, 2.6, 1.4, 24, 1, true, Math.PI * 0.7, Math.PI * 1.6);
    const curvedLcd = new THREE.Mesh(curvedLcdGeo, new THREE.MeshBasicMaterial({ map: lcdTex.clone(), transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    curvedLcd.position.set(0, 1.8, -2.2);
    curvedLcd.rotation.y = Math.PI;
    curvedLcd.userData.baseOpacity = 0.85;
    cockpitGroup.add(curvedLcd);
    this.holograms.push(curvedLcd);

    this.scene.add(cockpitGroup);

    // 侧墙大型液晶屏幕阵列
    for (const side of [-1, 1]) {
      const wallLcd = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 1.6),
        new THREE.MeshBasicMaterial({ map: lcdTex.clone(), transparent: true, opacity: 0.85 })
      );
      wallLcd.position.set(side * 11.78, 2.4, 0);
      wallLcd.rotation.y = side * Math.PI / 2;
      wallLcd.userData.baseOpacity = 0.85;
      this.scene.add(wallLcd);
      this.holograms.push(wallLcd);
    }

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    for (const holo of this.holograms) {
      if (!holo.material) continue;
      if (holo.material.map) {
        // LCD screens: keep their original brightness and just scroll the UI
        holo.material.opacity = holo.userData.baseOpacity || 0.85;
        holo.material.map.offset.x += delta * 0.04;
      } else {
        // Holographic projections: gentle opacity pulse
        holo.material.opacity = 0.18 + Math.sin(time * 3 + (holo.position.x || 0)) * 0.1;
      }
    }
    if (this.holoPlanet) {
      this.holoPlanet.rotation.y += delta * 0.4;
      this.holoPlanet.rotation.x = Math.sin(time * 0.5) * 0.08;
    }
    if (this.holoRing) {
      this.holoRing.rotation.z += delta * 0.25;
    }
  }
}
