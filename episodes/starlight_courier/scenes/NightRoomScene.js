import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class NightRoomScene extends SceneBase {
  constructor() {
    super('NightRoomScene');
    this.starTwinkle = [];
  }

  build() {
    super.build();

    // Very dark room background
    this.scene.background = new THREE.Color(0x080810);

    // Override default lights for intimate night atmosphere
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.08;
        l.color.setHex(0x222244);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.15;
        l.color.setHex(0x8899cc);
        l.position.set(2, 8, -3);
      }
    });

    // ---- Floor (dark wood) ----
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.7, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // ---- Walls (dark, cozy) ----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2a, roughness: 0.95 });
    const wallGeo = new THREE.PlaneGeometry(20, 10);

    // Back wall
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 5, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-10, 5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(10, 5, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.95 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10;
    this.scene.add(ceiling);

    // ---- Skylight / Attic window (source of starlight) ----
    const windowFrameGeo = new THREE.BoxGeometry(5, 4, 0.15);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.3 });
    const windowFrame = new THREE.Mesh(windowFrameGeo, frameMat);
    windowFrame.position.set(0, 7, -4.9);
    this.scene.add(windowFrame);

    // Glass pane (slightly blue, transparent)
    const glassGeo = new THREE.PlaneGeometry(4.5, 3.5);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a4a,
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.3,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 7, -4.82);
    this.scene.add(glass);

    // Moonlight streaming through window
    const moonLight = new THREE.DirectionalLight(0x8899ff, 0.6);
    moonLight.position.set(0, 8, -8);
    moonLight.target.position.set(0, 0, 0);
    moonLight.castShadow = true;
    this.scene.add(moonLight);
    this.scene.add(moonLight.target);

    // Window glow (subtle)
    const windowGlow = new THREE.PointLight(0x6688cc, 2, 8);
    windowGlow.position.set(0, 7, -4);
    this.scene.add(windowGlow);

    // ---- Star map projection on wall (glowing constellation) ----
    const starMapCanvas = document.createElement('canvas');
    starMapCanvas.width = 512;
    starMapCanvas.height = 512;
    const smCtx = starMapCanvas.getContext('2d');
    smCtx.fillStyle = '#0a0a15';
    smCtx.fillRect(0, 0, 512, 512);

    // Draw constellation lines
    smCtx.strokeStyle = '#4488cc';
    smCtx.lineWidth = 1.5;
    smCtx.beginPath();
    smCtx.moveTo(150, 120);
    smCtx.lineTo(220, 180);
    smCtx.lineTo(280, 150);
    smCtx.lineTo(350, 200);
    smCtx.lineTo(300, 280);
    smCtx.lineTo(200, 300);
    smCtx.lineTo(150, 250);
    smCtx.lineTo(150, 120);
    smCtx.stroke();

    // Draw stars
    const mapStarPositions = [
      [150, 120], [220, 180], [280, 150], [350, 200],
      [300, 280], [200, 300], [150, 250], [180, 200],
      [320, 220], [250, 180], [380, 160], [120, 280],
    ];
    for (const [sx, sy] of mapStarPositions) {
      smCtx.beginPath();
      smCtx.arc(sx, sy, 3 + Math.random() * 2, 0, Math.PI * 2);
      smCtx.fillStyle = '#aaccff';
      smCtx.fill();
      // Glow
      smCtx.beginPath();
      smCtx.arc(sx, sy, 8, 0, Math.PI * 2);
      smCtx.fillStyle = 'rgba(100, 150, 255, 0.15)';
      smCtx.fill();
    }

    const starMapTex = new THREE.CanvasTexture(starMapCanvas);
    const starMapMat = new THREE.MeshStandardMaterial({
      map: starMapTex,
      emissive: 0x2244aa,
      emissiveIntensity: 0.4,
      roughness: 0.9,
    });
    const starMapPlane = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), starMapMat);
    starMapPlane.position.set(0, 4.5, -4.85);
    this.scene.add(starMapPlane);

    // ---- Desk (under the star map) ----
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.6 });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 2), deskMat);
    deskTop.position.set(0, 1.8, -3.5);
    deskTop.castShadow = true;
    this.scene.add(deskTop);

    // Desk legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8);
    for (const [lx, lz] of [[-1.7, -0.8], [1.7, -0.8], [-1.7, 0.8], [1.7, 0.8]]) {
      const leg = new THREE.Mesh(legGeo, deskMat);
      leg.position.set(lx, 0.9, -3.5 + lz);
      leg.castShadow = true;
      this.scene.add(leg);
    }

    // ---- Desk lamp (warm pool of light) ----
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 })
    );
    lampBase.position.set(-1.2, 1.9, -3.5);
    this.scene.add(lampBase);

    const lampPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
    );
    lampPole.position.set(-1.2, 2.15, -3.5);
    this.scene.add(lampPole);

    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.2, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xcc7744, roughness: 0.6, side: THREE.DoubleSide })
    );
    lampShade.position.set(-1.2, 2.35, -3.5);
    this.scene.add(lampShade);

    // Warm desk lamp light
    const deskLampLight = new THREE.PointLight(0xffaa66, 4, 5);
    deskLampLight.position.set(-1.2, 2.3, -3.5);
    deskLampLight.castShadow = true;
    this.scene.add(deskLampLight);

    // Bulb glow
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffddaa })
    );
    bulb.position.set(-1.2, 2.28, -3.5);
    this.scene.add(bulb);

    // ---- Bookshelf (left wall, dark silhouette) ----
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x2a1f15, roughness: 0.8 });
    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 3), shelfMat);
    shelfBack.position.set(-9.9, 2, 1);
    shelfBack.castShadow = true;
    this.scene.add(shelfBack);

    for (let i = 0; i < 4; i++) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.8), shelfMat);
      board.position.set(-9.75, 0.5 + i * 1.0, 1);
      this.scene.add(board);
    }

    // Books (dimly visible)
    const bookColors = [0x442222, 0x224433, 0x223344, 0x443322, 0x333344];
    for (let row = 0; row < 3; row++) {
      for (let b = 0; b < 6; b++) {
        const h = 0.18 + Math.random() * 0.2;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, h, 0.15),
          new THREE.MeshStandardMaterial({ color: bookColors[(row * 6 + b) % bookColors.length], roughness: 0.85 })
        );
        book.position.set(-9.55, 0.5 + row * 1.0 + h / 2, -0.2 + b * 0.22);
        this.scene.add(book);
      }
    }

    // ---- Rug (center, dark) ----
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a2028, roughness: 0.95 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 1);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // ---- Small stool near desk ----
    const stoolSeat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 })
    );
    stoolSeat.position.set(0, 1.0, -2.5);
    stoolSeat.castShadow = true;
    this.scene.add(stoolSeat);

    const stoolLegGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6);
    for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
      const sl = new THREE.Mesh(stoolLegGeo, deskMat);
      sl.position.set(Math.cos(angle) * 0.25, 0.5, -2.5 + Math.sin(angle) * 0.25);
      sl.castShadow = true;
      this.scene.add(sl);
    }

    // ---- Stars visible through skylight (small points above) ----
    const starGeo = new THREE.BufferGeometry();
    const starCount = 50;
    const skyStarPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      skyStarPositions[i * 3] = (Math.random() - 0.5) * 4;
      skyStarPositions[i * 3 + 1] = 9 + Math.random() * 2;
      skyStarPositions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 4;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(skyStarPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.8 });
    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);

    // Twinkle stars through skylight
    if (this.starField) {
      const positions = this.starField.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        const twinkle = Math.sin(time * 2 + i * 1.5) * 0.03;
        // Subtle position shift for twinkle effect
        positions[i * 3 + 1] += twinkle * delta;
      }
      this.starField.geometry.attributes.position.needsUpdate = true;
    }
  }
}
