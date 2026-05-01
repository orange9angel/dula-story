import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * DrawerScene — 大雄房间书桌抽屉（时光机入口）
 * 支持抽屉关闭→拉开的动画，内部发光，角色依次跳进去
 */
export class DrawerScene extends SceneBase {
  constructor() {
    super('DrawerScene');
    this.glowPulse = 0;
    this.drawerOpenProgress = 1.0; // 0 = closed, 1 = fully open
    this.isDrawerOpening = false;
    this.drawerOpenStartTime = 0;
    this.drawerOpenDuration = 1.2; // seconds to slide open
  }

  build() {
    super.build();

    // Warm room background
    this.scene.background = new THREE.Color(0x1a1815);

    // Override default lights
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.35;
        l.color.setHex(0xffeedd);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.6;
        l.color.setHex(0xffddaa);
        l.position.set(3, 8, 5);
      }
    });

    // Additional warm room light
    const roomLight = new THREE.PointLight(0xffcc88, 2, 12);
    roomLight.position.set(0, 5, 2);
    this.scene.add(roomLight);

    // ---- Floor (tatami-style warm wood) ----
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.6, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // ---- Back wall ----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.9 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    backWall.position.set(0, 4, -4);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // ---- Side walls ----
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6, 4, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(6, 4, 0);
    this.scene.add(rightWall);

    // ---- Desk (where the drawer is) ----
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.5, metalness: 0.1 });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 1.8), deskMat);
    deskTop.position.set(0, 1.6, -2.5);
    deskTop.castShadow = true;
    this.scene.add(deskTop);

    // Desk legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.6, 8);
    for (const [lx, lz] of [[-1.5, -0.7], [1.5, -0.7], [-1.5, 0.7], [1.5, 0.7]]) {
      const leg = new THREE.Mesh(legGeo, deskMat);
      leg.position.set(lx, 0.8, -2.5 + lz);
      leg.castShadow = true;
      this.scene.add(leg);
    }

    // ---- THE DRAWER (animated: closed → open) ----
    this.drawerGroup = new THREE.Group();
    this.drawerGroup.position.set(0, 1.55, -2.2);

    // Drawer frame (outer box — fixed, doesn't move)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1e, roughness: 0.6 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.6), frameMat);
    this.drawerGroup.add(frame);

    // Drawer front panel + handle (this slides out when opened)
    this.drawerFrontGroup = new THREE.Group();

    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.3, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.5 })
    );
    frontPanel.position.set(0, 0, 0);
    this.drawerFrontGroup.add(frontPanel);

    // Drawer handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 })
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0, 0.04);
    this.drawerFrontGroup.add(handle);

    // Initial position: fully closed (z = 0.32, flush with frame front)
    this.drawerFrontGroup.position.set(0, 0, 0.32);
    this.drawerGroup.add(this.drawerFrontGroup);

    // ---- THE GLOWING TIME MACHINE INSIDE ----
    // Inner glow plane (the "portal") — hidden when drawer is closed
    const portalGeo = new THREE.PlaneGeometry(1.0, 0.25);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
    });
    this.portal = new THREE.Mesh(portalGeo, portalMat);
    this.portal.position.set(0, 0, -0.25);
    this.drawerGroup.add(this.portal);

    this.scene.add(this.drawerGroup);

    // Portal glow light — starts at 0 intensity
    this.portalLight = new THREE.PointLight(0x00ffff, 0, 8);
    this.portalLight.position.set(0, 0.5, -2.0);
    this.scene.add(this.portalLight);

    // Additional portal fill light
    this.portalFill = new THREE.PointLight(0x00aaff, 0, 6);
    this.portalFill.position.set(0, 1.5, -1.5);
    this.scene.add(this.portalFill);

    // Outer glow halo — hidden initially
    const haloGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
    });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.set(0, 1.7, -2.0);
    this.scene.add(this.halo);

    // ---- Time Machine platform (visible inside drawer) ----
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2,
    });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.05, 16), platformMat);
    platform.position.set(0, 1.5, -2.0);
    this.scene.add(platform);

    // Platform glow ring
    const ringGeo = new THREE.TorusGeometry(0.42, 0.02, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.platformRing = new THREE.Mesh(ringGeo, ringMat);
    this.platformRing.position.set(0, 1.52, -2.0);
    this.platformRing.rotation.x = Math.PI / 2;
    this.scene.add(this.platformRing);

    // ---- Small stool near desk ----
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 });
    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12), stoolMat);
    stoolSeat.position.set(1.8, 0.85, -2.5);
    this.scene.add(stoolSeat);

    const stoolLeg = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6);
    for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
      const sl = new THREE.Mesh(stoolLeg, stoolMat);
      sl.position.set(1.8 + Math.cos(angle) * 0.2, 0.425, -2.5 + Math.sin(angle) * 0.2);
      this.scene.add(sl);
    }

    // ---- Window (night outside) ----
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    windowFrame.position.set(0, 4.5, -3.95);
    this.scene.add(windowFrame);

    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x0a1525, roughness: 0.05, metalness: 0.3 })
    );
    windowGlass.position.set(0, 4.5, -3.89);
    this.scene.add(windowGlass);

    // Window light (moonlight)
    const moonLight = new THREE.DirectionalLight(0x8899cc, 0.5);
    moonLight.position.set(0, 6, -5);
    this.scene.add(moonLight);

    // ---- Bookshelf (right wall) ----
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 2), shelfMat);
    shelf.position.set(5.9, 2.5, -1);
    this.scene.add(shelf);

    for (let i = 0; i < 3; i++) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 1.8), shelfMat);
      board.position.set(5.75, 1 + i * 0.9, -1);
      this.scene.add(board);
    }

    // Books
    const bookColors = [0x442222, 0x224433, 0x223344, 0x443322];
    for (let row = 0; row < 2; row++) {
      for (let b = 0; b < 5; b++) {
        const h = 0.15 + Math.random() * 0.15;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, h, 0.12),
          new THREE.MeshStandardMaterial({ color: bookColors[(row * 5 + b) % 4], roughness: 0.85 })
        );
        book.position.set(5.65, 1 + row * 0.9 + h / 2, -1.5 + b * 0.2);
        this.scene.add(book);
      }
    }

    return this.scene;
  }

  /**
   * Trigger the drawer opening animation.
   * Called from Storyboard when {Event:OpenDrawer} is encountered.
   */
  openDrawer() {
    if (this.isDrawerOpening) return;
    this.isDrawerOpening = true;
    this.drawerOpenStartTime = performance.now() / 1000;
    this.drawerOpenProgress = 0;
  }

  update(time, delta) {
    super.update(time, delta);

    // Animate drawer opening
    if (this.isDrawerOpening && this.drawerFrontGroup) {
      const elapsed = time - this.drawerOpenStartTime;
      const progress = Math.min(1.0, elapsed / this.drawerOpenDuration);

      // easeOutCubic for smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      this.drawerOpenProgress = ease;

      // Slide front panel forward (out toward camera)
      // Closed: z = 0.32, Fully open: z = 0.32 + 0.45 = 0.77
      const closedZ = 0.32;
      const openZ = 0.77;
      this.drawerFrontGroup.position.z = closedZ + (openZ - closedZ) * ease;

      if (progress >= 1.0) {
        this.isDrawerOpening = false;
        this.drawerOpenProgress = 1.0;
      }
    }

    // Portal glow pulse — only visible when drawer is opening/open
    if (this.portal && this.portalLight && this.halo && this.platformRing) {
      const visibility = this.drawerOpenProgress;

      // Portal opacity ramps up as drawer opens
      this.portal.material.opacity = 0.6 * visibility;

      // Portal light intensity ramps up
      this.portalLight.intensity = (4 + Math.sin(time * 3) * 2) * visibility;
      this.portalFill.intensity = 2 * visibility;

      // Halo visibility
      this.halo.scale.setScalar((1 + Math.sin(time * 2) * 0.15) * visibility);
      this.halo.material.opacity = (0.08 + Math.sin(time * 2) * 0.04) * visibility;

      // Platform ring rotation (always spins, but only visible when open)
      this.platformRing.rotation.z += delta * 2;
      this.platformRing.visible = visibility > 0.1;
    }
  }
}
