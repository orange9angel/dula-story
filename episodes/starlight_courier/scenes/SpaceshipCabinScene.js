import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * SpaceshipCabinScene — 星际快递飞船驾驶舱内部
 * 科幻风格：圆形舱室、全息控制台、舷窗看星空、柔和舱内照明
 */
export class SpaceshipCabinScene extends SceneBase {
  constructor() {
    super('SpaceshipCabinScene');
    this.holograms = [];
    this.starField = null;
  }

  build() {
    super.build();

    // Dark space background visible through windows
    this.scene.background = new THREE.Color(0x151530);

    // Override lights for sci-fi cabin atmosphere
    this.lights.forEach(l => {
      if (l.isAmbientLight) {
        l.intensity = 0.6;
        l.color.setHex(0x6644cc);
      }
      if (l.isDirectionalLight) {
        l.intensity = 0.8;
        l.color.setHex(0xccbbee);
        l.position.set(0, 5, 3);
      }
    });

    // Hemisphere light (same as FutureCityScene)
    const cityGlow = new THREE.HemisphereLight(0x8866cc, 0x2a1540, 0.5);
    this.scene.add(cityGlow);

    // Strong character fill light (same as FutureCityScene)
    this.charLight = new THREE.PointLight(0xddccff, 3, 20);
    this.charLight.position.set(0, 6, 8);
    this.scene.add(this.charLight);

    // Rim light for characters (same as FutureCityScene)
    this.rimLight = new THREE.PointLight(0x00ffff, 2, 15);
    this.rimLight.position.set(0, 4, -5);
    this.scene.add(this.rimLight);

    // ---- Floor (metallic grating) ----
    const floorGeo = new THREE.CircleGeometry(5, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a55,
      roughness: 0.4,
      metalness: 0.6
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Floor ring detail
    const ringGeo = new THREE.RingGeometry(4.5, 4.8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0044aa,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.8
    });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.01;
    this.scene.add(floorRing);

    // ---- Ceiling (domed) ----
    const ceilingGeo = new THREE.SphereGeometry(5.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.3);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a45,
      roughness: 0.5,
      metalness: 0.4,
      side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = 0;
    this.scene.add(ceiling);

    // ---- Walls (curved panels) ----
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x454550,
      roughness: 0.6,
      metalness: 0.3
    });

    // Back wall (behind console)
    const backWallGeo = new THREE.CylinderGeometry(5, 5, 4, 32, 1, true, -Math.PI * 0.25, Math.PI * 0.5);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 2, -1);
    backWall.rotation.y = Math.PI;
    this.scene.add(backWall);

    // Side wall panels with glow strips
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const panelGeo = new THREE.BoxGeometry(0.8, 2.5, 0.1);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 0.5,
        metalness: 0.5
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(Math.cos(angle) * 4.9, 1.8, Math.sin(angle) * 4.9);
      panel.rotation.y = -angle;
      this.scene.add(panel);

      // Glow strip on panel
      const stripGeo = new THREE.BoxGeometry(0.6, 0.05, 0.02);
      const stripMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.5
      });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(Math.cos(angle) * 4.95, 2.8, Math.sin(angle) * 4.95);
      strip.rotation.y = -angle;
      this.scene.add(strip);
    }

    // ---- Windows (portholes) ----
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      // Window frame
      const frameGeo = new THREE.TorusGeometry(0.6, 0.08, 8, 24);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x444455,
        roughness: 0.3,
        metalness: 0.8
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(Math.cos(angle) * 5, 2.5, Math.sin(angle) * 5);
      frame.rotation.y = -angle;
      this.scene.add(frame);

      // Window glass (dark with star reflection)
      const glassGeo = new THREE.CircleGeometry(0.6, 24);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a1a,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.7
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(Math.cos(angle) * 5, 2.5, Math.sin(angle) * 5);
      glass.rotation.y = -angle + Math.PI / 2;
      this.scene.add(glass);
    }

    // ---- Main Console (center-back, lower and further back) ----
    const consoleBaseGeo = new THREE.BoxGeometry(2.5, 0.6, 0.6);
    const consoleBaseMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.4,
      metalness: 0.6
    });
    const consoleBase = new THREE.Mesh(consoleBaseGeo, consoleBaseMat);
    consoleBase.position.set(0, 0.3, -4.2);
    this.scene.add(consoleBase);

    // Console top (slanted)
    const consoleTopGeo = new THREE.BoxGeometry(2.7, 0.08, 0.8);
    const consoleTopMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.3,
      metalness: 0.7
    });
    const consoleTop = new THREE.Mesh(consoleTopGeo, consoleTopMat);
    consoleTop.position.set(0, 0.65, -4.1);
    consoleTop.rotation.x = -0.2;
    this.scene.add(consoleTop);

    // Holographic display (glowing blue plane, smaller and lower)
    const holoGeo = new THREE.PlaneGeometry(1.5, 0.6);
    const holoMat = new THREE.MeshStandardMaterial({
      color: 0x00ccff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const holoDisplay = new THREE.Mesh(holoGeo, holoMat);
    holoDisplay.position.set(0, 1.3, -4.0);
    this.scene.add(holoDisplay);
    this.holograms.push(holoDisplay);

    // Console buttons
    for (let i = 0; i < 5; i++) {
      const btnGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8);
      const btnMat = new THREE.MeshStandardMaterial({
        color: i === 2 ? 0xff4444 : 0x00aaff,
        emissive: i === 2 ? 0xff0000 : 0x0088ff,
        emissiveIntensity: 0.6
      });
      const btn = new THREE.Mesh(btnGeo, btnMat);
      btn.position.set(-0.8 + i * 0.4, 0.92, -3.95);
      this.scene.add(btn);
    }

    // ---- Pilot Seats (two side by side) ----
    for (let side of [-1, 1]) {
      // Seat base
      const seatBaseGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
      const seatMat = new THREE.MeshStandardMaterial({
        color: 0x6a6a7a,
        roughness: 0.7,
        metalness: 0.2
      });
      const seatBase = new THREE.Mesh(seatBaseGeo, seatMat);
      seatBase.position.set(side * 1.2, 0.15, -1.5);
      this.scene.add(seatBase);

      // Seat back
      const seatBackGeo = new THREE.BoxGeometry(0.8, 1.2, 0.15);
      const seatBack = new THREE.Mesh(seatBackGeo, seatMat);
      seatBack.position.set(side * 1.2, 0.75, -1.85);
      seatBack.rotation.x = -0.15;
      this.scene.add(seatBack);

      // Seat headrest
      const headrestGeo = new THREE.BoxGeometry(0.5, 0.3, 0.12);
      const headrest = new THREE.Mesh(headrestGeo, seatMat);
      headrest.position.set(side * 1.2, 1.45, -1.9);
      this.scene.add(headrest);

      // Armrest
      const armrestGeo = new THREE.BoxGeometry(0.12, 0.08, 0.5);
      const armrest = new THREE.Mesh(armrestGeo, seatMat);
      armrest.position.set(side * 1.6, 0.5, -1.5);
      this.scene.add(armrest);
    }

    // ---- Central pillar (supports ceiling, moved to back) ----
    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.2, 5, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a65,
      roughness: 0.4,
      metalness: 0.6
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(0, 2.5, -3.5);
    this.scene.add(pillar);

    // Keep fake stand-ins as fallback characters
    this.fakeXiaoyue = new THREE.Group();
    const xBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.4, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff69b4 })
    );
    xBody.position.y = 0.7;
    this.fakeXiaoyue.add(xBody);
    const xHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe8d6 })
    );
    xHead.position.y = 1.6;
    this.fakeXiaoyue.add(xHead);
    this.fakeXiaoyue.position.set(-1.2, 0.1, 1.5);
    this.scene.add(this.fakeXiaoyue);

    this.fakeXingzai = new THREE.Group();
    const zBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.4, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x4169e1 })
    );
    zBody.position.y = 0.7;
    this.fakeXingzai.add(zBody);
    const zHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb })
    );
    zHead.position.y = 1.6;
    this.fakeXingzai.add(zHead);
    this.fakeXingzai.position.set(1.2, 0.1, 1.5);
    this.scene.add(this.fakeXingzai);

    // Pillar glow ring
    const pillarRingGeo = new THREE.TorusGeometry(0.3, 0.03, 8, 24);
    const pillarRingMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.5
    });
    const pillarRing = new THREE.Mesh(pillarRingGeo, pillarRingMat);
    pillarRing.position.set(0, 3, -3.5);
    pillarRing.rotation.x = Math.PI / 2;
    this.scene.add(pillarRing);

    // ---- Star field outside windows ----
    const starGeo = new THREE.BufferGeometry();
    const starCount = 200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 10;
      const height = Math.random() * 8 - 2;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = height;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });
    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);
  }

  update(delta) {
    super.update(delta);

    // Animate holographic display
    for (const holo of this.holograms) {
      holo.material.opacity = 0.3 + Math.sin(Date.now() * 0.002) * 0.15;
    }

    // Slowly rotate star field
    if (this.starField) {
      this.starField.rotation.y += delta * 0.02;
    }

    // DEBUG: Log real character state
    const xiaoyue = this.characters.find(c => c.name === 'Xiaoyue');
    const xingzai = this.characters.find(c => c.name === 'Xingzai');
    if (xiaoyue) {
      const wp = new THREE.Vector3();
      xiaoyue.mesh.getWorldPosition(wp);
      console.log('[CabinDebug] update Xiaoyue visible=', xiaoyue.mesh.visible, 'localPos=', xiaoyue.mesh.position.x, xiaoyue.mesh.position.y, xiaoyue.mesh.position.z, 'worldPos=', wp.x, wp.y, wp.z, 'scale=', xiaoyue.mesh.scale.x, 'parent=', xiaoyue.mesh.parent ? xiaoyue.mesh.parent.name : 'null');
    }
  }

  addCharacter(character) {
    super.addCharacter(character);
    // Scale characters to fit cabin proportions
    const scales = {
      Nobita: 0.7,
      Xingzai: 0.75,
      Xiaoyue: 0.8,
      Doraemon: 0.85,
    };
    const name = character.constructor.name;
    if (scales[name]) {
      character.mesh.scale.setScalar(scales[name]);
    }
    // CRITICAL FIX: Ensure character is visible (may have been hidden by previous scene's Hide event)
    character.mesh.visible = true;
    let matCount = 0;
    character.mesh.traverse(child => {
      if (child.isMesh) {
        child.visible = true;
        // Replace dark toon material with bright basic material for cabin visibility
        if (child.material && child.material.type === 'MeshToonMaterial') {
          const baseColor = child.material.color ? child.material.color.getHex() : 0xffffff;
          child.material = new THREE.MeshBasicMaterial({ color: baseColor });
          matCount++;
        }
      }
    });
    // CRITICAL FIX: Clear pending moves/teleports from previous scene to prevent position override
    // Previous scene's moves (e.g. FutureCityScene Event:Move) would overwrite setPosition after switchScene
    if (character.moves && character.moves.length > 0) {
      let cleared = 0;
      for (const move of character.moves) {
        if (!move.completed) {
          move.completed = true;
          cleared++;
        }
      }
      if (cleared > 0) {
        console.log('[CabinDebug] cleared', cleared, 'pending moves for', name);
      }
    }
    if (character.teleportEvents && character.teleportEvents.length > 0) {
      const oldLen = character.teleportEvents.length;
      character.teleportEvents = [];
      console.log('[CabinDebug] cleared', oldLen, 'teleport events for', name);
    }
    console.log('[CabinDebug] addCharacter done', name, 'toonMatsReplaced=', matCount, 'parent=', character.mesh.parent ? character.mesh.parent.name || character.mesh.parent.type : 'null', 'visible=', character.mesh.visible, 'pos=', character.mesh.position.x, character.mesh.position.y, character.mesh.position.z);
  }
}
