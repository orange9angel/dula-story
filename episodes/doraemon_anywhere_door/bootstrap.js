import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterBase,
  PoseMatrix,
  SceneBase,
  SceneRegistry,
  registerAnimation,
  registerCharacter,
  registerScene,
} from 'dula-engine';

registerAll();

const BaseRoomScene = SceneRegistry.RoomScene;

const TAU = Math.PI * 2;

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// 把面部表情幅度放大 1.4 倍，让低多边形角色在远景也能读出情绪
function amplifyFace(pose, factor = 1.4) {
  const faceKeys = ['eyebrows', 'eyelids', 'pupils', 'mouth'];
  for (const key of faceKeys) {
    const section = pose[key];
    if (!section) continue;
    for (const side of Object.keys(section)) {
      const attrs = section[side];
      if (!attrs) continue;
      for (const attr of Object.keys(attrs)) {
        const v = attrs[attr];
        if (typeof v === 'number') {
          attrs[attr] = v * factor;
        }
      }
    }
  }
  return pose;
}

// ─────────────────────────────────────────────────────────────────────────────
// 大雄房间：在默认 RoomScene 基础上添加任意门
// ─────────────────────────────────────────────────────────────────────────────

class NobitaRoomScene extends BaseRoomScene {
  constructor() {
    super();
    this.name = 'NobitaRoom';
    this.door = null;
    this.doorEvents = [];
  }

  build() {
    const scene = super.build();

    // Match the open background to wall color so the missing fourth wall
    // does not show as a black void from off-axis camera angles.
    this.scene.background = new THREE.Color(0xf5f5dc);

    // Add subtle emissive to wall materials so shadowed surfaces never read as black.
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const color = obj.material.color?.getHex();
        if (color === 0xf5f5dc || color === 0xfaf8f0) {
          obj.material.emissive = new THREE.Color(0x333333);
          obj.material.emissiveIntensity = 0.25;
        }
      }
    });

    // Build a front wall (fourth wall) with a large camera opening so the
    // room feels enclosed while still allowing the audience-view shots.
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc,
      roughness: 0.9,
      emissive: 0x333333,
      emissiveIntensity: 0.25,
    });
    const frontZ = 5;
    const opening = { xMin: -4, xMax: 4, yMin: 0.2, yMax: 5.5 };
    // Top
    const topWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10 - opening.yMax, 0.2), wallMat);
    topWall.position.set(0, (opening.yMax + 10) / 2, frontZ);
    topWall.receiveShadow = true;
    scene.add(topWall);
    // Bottom
    const botWall = new THREE.Mesh(new THREE.BoxGeometry(20, opening.yMin, 0.2), wallMat);
    botWall.position.set(0, opening.yMin / 2, frontZ);
    botWall.receiveShadow = true;
    scene.add(botWall);
    // Left
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(10 + opening.xMin, opening.yMax - opening.yMin, 0.2), wallMat);
    leftWall.position.set((opening.xMin - 10) / 2, (opening.yMin + opening.yMax) / 2, frontZ);
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    // Right
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(10 - opening.xMax, opening.yMax - opening.yMin, 0.2), wallMat);
    rightWall.position.set((opening.xMax + 10) / 2, (opening.yMin + opening.yMax) / 2, frontZ);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    this.door = new AnywhereDoor();
    // Place the door on the left side of the room, facing the camera/characters.
    this.door.group.position.set(-3.0, 0, -1.5);
    this.door.group.rotation.y = 0; // face +Z (toward audience / characters)
    scene.add(this.door.group);

    // Expose for DoorOpen/DoorClose animation to control
    window.anywhereDoor = this.door;

    return scene;
  }

  scheduleDoorEvent(event) {
    this.doorEvents.push(event);
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.door) {
      for (const ev of this.doorEvents) {
        if (ev.fired) continue;
        if (time >= ev.startTime) {
          ev.fired = true;
          if (ev.action === 'summon') {
            this.door.summon(ev.startTime, ev.duration || 0.5);
          } else if (ev.action === 'open') {
            this.door.setOpen(true);
          } else if (ev.action === 'close') {
            this.door.setOpen(false);
          } else if (ev.action === 'hide') {
            this.door.hide();
          }
        }
      }
      this.door.update(time, delta);
    }
  }
}

registerScene('NobitaRoom', NobitaRoomScene);

// ─────────────────────────────────────────────────────────────────────────────
// 史前场景：黄褐色大地 + 棕榈树 + 岩石 + 火山
// ─────────────────────────────────────────────────────────────────────────────

class PrehistoricScene extends SceneBase {
  constructor() {
    super('PrehistoricScene');
    this.clouds = [];
    this.door = null;
    this.doorEvents = [];
    this.backgroundDinos = [];
  }

  build() {
    super.build();

    // Hazy prehistoric sky — orange/yellow to match the dialogue
    this.scene.background = new THREE.Color(0xffb366);
    this.scene.fog = new THREE.Fog(0xffcc80, 20, 90);

    // Ground — warm, dusty prehistoric plain
    const groundGeo = new THREE.PlaneGeometry(160, 160, 24, 24);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      posAttr.setZ(i, z + (Math.random() - 0.5) * 0.5);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3a, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Prominent volcano in the distance
    const volcanoGroup = new THREE.Group();
    volcanoGroup.position.set(-20, 0, -45);
    const volcanoGeo = new THREE.ConeGeometry(14, 18, 32, 1, true);
    const volcanoMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1.0 });
    const volcano = new THREE.Mesh(volcanoGeo, volcanoMat);
    volcanoGroup.add(volcano);
    // Lava glow at crater
    const craterGeo = new THREE.CylinderGeometry(3.5, 4, 0.5, 16);
    const craterMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    const crater = new THREE.Mesh(craterGeo, craterMat);
    crater.position.y = 8.75;
    volcanoGroup.add(crater);
    // Crater point light for glow
    this.volcanoLight = new THREE.PointLight(0xff4400, 2.5, 60, 1.5);
    this.volcanoLight.position.set(-20, 22, -45);
    this.scene.add(this.volcanoLight);
    this.scene.add(volcanoGroup);

    // Rising smoke puffs above volcano
    this.smokePuffs = [];
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x887766, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 7; i++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.5 + i * 0.7, 12, 12), smokeMat);
      smoke.position.set(
        -20 + (Math.random() - 0.5) * 3,
        22 + i * 3.5,
        -45 + (Math.random() - 0.5) * 3
      );
      smoke.userData = {
        baseY: smoke.position.y,
        speed: 0.3 + Math.random() * 0.3,
        offset: Math.random() * TAU,
      };
      this.scene.add(smoke);
      this.smokePuffs.push(smoke);
    }

    // Lush tropical forest with full canopies
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3b, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const darkLeafMat = new THREE.MeshStandardMaterial({ color: 0x1a6b1a, roughness: 0.85 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2e8b2e, roughness: 0.9 });

    // Helper: build a palm tree with a full crown of drooping fronds
    function buildPalm(px, py, pz, height) {
      const tree = new THREE.Group();
      tree.position.set(px, py, pz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, height, 9), trunkMat);
      trunk.position.y = height / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Group();
      crown.position.y = height;

      // Central crown mass
      const crownCore = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), darkLeafMat);
      crown.add(crownCore);

      // Drooping fronds
      const frondCount = 18;
      for (let i = 0; i < frondCount; i++) {
        const frondGroup = new THREE.Group();
        frondGroup.rotation.y = (i / frondCount) * TAU + Math.random() * 0.2;

        const segments = 5;
        for (let j = 0; j < segments; j++) {
          const t = j / segments;
          const segLen = 1.1 * (1 - t * 0.6);
          const seg = new THREE.Mesh(new THREE.ConeGeometry(0.18 * (1 - t * 0.7), segLen, 5), leafMat);
          seg.position.set(0, 0.25 + t * 1.1, t * 0.6);
          seg.rotation.x = Math.PI / 2.2 + t * 0.5;
          frondGroup.add(seg);
        }
        crown.add(frondGroup);
      }
      tree.add(crown);
      return tree;
    }

    // Helper: build a broadleaf tree with a large spherical canopy
    function buildBroadleaf(px, py, pz, height, canopyRadius) {
      const tree = new THREE.Group();
      tree.position.set(px, py, pz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, height, 10), trunkMat);
      trunk.position.y = height / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const canopy = new THREE.Group();
      canopy.position.y = height + canopyRadius * 0.4;

      // Main canopy spheres
      const mainSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(canopyRadius, 1), canopyMat);
      mainSphere.castShadow = true;
      canopy.add(mainSphere);

      // Lobe clusters for irregular outline
      for (let i = 0; i < 6; i++) {
        const lobe = new THREE.Mesh(new THREE.IcosahedronGeometry(canopyRadius * (0.5 + Math.random() * 0.25), 0), darkLeafMat);
        const theta = Math.random() * TAU;
        const phi = Math.random() * Math.PI;
        const r = canopyRadius * 0.65;
        lobe.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
        lobe.castShadow = true;
        canopy.add(lobe);
      }

      tree.add(canopy);
      return tree;
    }

    // Palm tree positions
    const palmPositions = [
      [-12, 0, -10], [14, 0, -14], [-18, 0, 6], [20, 0, 4],
      [-8, 0, 18], [24, 0, -8], [-26, 0, -4], [10, 0, 22],
      [-5, 0, -20], [28, 0, 10], [-22, 0, 18], [5, 0, -25],
      [16, 0, 18], [-30, 0, 10], [32, 0, -2], [-14, 0, 28],
      [35, 0, -18], [-35, 0, -22], [8, 0, 30], [-8, 0, -32],
    ];
    for (const [px, py, pz] of palmPositions) {
      this.scene.add(buildPalm(px, py, pz, 5 + Math.random() * 2));
    }

    // Broadleaf trees filling the mid-ground
    const broadleafPositions = [
      [-16, 0, -2], [18, 0, -6], [-20, 0, 12], [22, 0, 8],
      [-4, 0, 14], [6, 0, -16], [-28, 0, -12], [26, 0, -18],
      [12, 0, 14], [-10, 0, 20], [30, 0, 6], [-32, 0, -8],
      [4, 0, 24], [-14, 0, -18], [20, 0, 20], [-24, 0, 24],
    ];
    for (const [px, py, pz] of broadleafPositions) {
      const height = 4 + Math.random() * 3;
      const radius = 1.4 + Math.random() * 0.8;
      this.scene.add(buildBroadleaf(px, py, pz, height, radius));
    }

    // Tropical ferns, bushes and ground cover
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 });
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x32cd32, roughness: 0.8, side: THREE.DoubleSide });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x2f7f2f, roughness: 0.9 });
    const undergrowthPositions = [
      [-2, 0, -2], [3, 0, -1], [-3, 0, 2], [4, 0, 3],
      [-6, 0, -5], [7, 0, -6], [-8, 0, 5], [9, 0, 4],
      [-1, 0, 8], [2, 0, -9], [-5, 0, 10], [6, 0, -8],
      [-10, 0, -12], [11, 0, 11], [-12, 0, 8], [13, 0, -10],
      [0, 0, -5], [5, 0, 5], [-7, 0, 0], [8, 0, -3],
    ];
    for (const [bx, by, bz] of undergrowthPositions) {
      // Bush clump (multiple spheres for volume)
      for (let k = 0; k < 3; k++) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.25, 10, 10), bushMat);
        bush.position.set(bx + (Math.random() - 0.5) * 0.8, by + 0.2 + Math.random() * 0.3, bz + (Math.random() - 0.5) * 0.8);
        bush.scale.set(1, 0.6 + Math.random() * 0.4, 1);
        bush.castShadow = true;
        this.scene.add(bush);
      }

      // Fern fronds
      const fernGroup = new THREE.Group();
      fernGroup.position.set(bx + 0.3, by, bz + 0.3);
      for (let i = 0; i < 7; i++) {
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.0), fernMat);
        frond.rotation.x = -Math.PI / 4;
        frond.rotation.y = (i / 7) * TAU;
        frond.position.y = 0.5;
        fernGroup.add(frond);
      }
      this.scene.add(fernGroup);

      // Low vine / ground creeper near some bushes
      if (Math.random() > 0.6) {
        const vine = new THREE.Mesh(new THREE.TorusGeometry(0.35 + Math.random() * 0.2, 0.06, 6, 12, Math.PI * 1.5), vineMat);
        vine.rotation.x = -Math.PI / 2;
        vine.position.set(bx, 0.05, bz);
        this.scene.add(vine);
      }
    }

    // Rocks covered in moss
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 1.0 });
    const rockPositions = [
      [-4, 0, 6], [7, 0, -4], [-9, 0, -6], [14, 0, 10],
      [5, 0, 12], [-18, 0, 12], [20, 0, -15], [-2, 0, -14],
    ];
    for (const [rx, ry, rz] of rockPositions) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.6), rockMat);
      rock.position.set(rx, ry + 0.3, rz);
      rock.scale.set(1 + Math.random(), 0.6 + Math.random() * 0.4, 1 + Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // Background dinosaur herd — scattered across the distant forest
    const dinoHerd = [
      [-40, 0, -35, 0xa0522d, 0.45], [45, 0, -40, 0xcd853f, 0.4],
      [-35, 0, 35, 0xd2691e, 0.35], [30, 0, 25, 0x8b4513, 0.35],
      [-50, 0, -15, 0xbdb76b, 0.5], [42, 0, 5, 0x556b2f, 0.42],
      [-28, 0, -45, 0x8fbc8f, 0.38], [55, 0, -25, 0xdaa520, 0.33],
      [-15, 0, 40, 0x9acd32, 0.3], [18, 0, 38, 0x6b8e23, 0.36],
      [38, 0, -50, 0x808000, 0.4], [-45, 0, 20, 0x5f9ea0, 0.32],
      [25, 0, -35, 0x2e8b57, 0.37], [-20, 0, -55, 0x3cb371, 0.44],
      [-58, 0, 5, 0x8b4513, 0.48], [50, 0, 30, 0xa0522d, 0.42],
      [-10, 0, -48, 0xcd853f, 0.36], [35, 0, -15, 0xd2691e, 0.34],
      [-48, 0, -30, 0x556b2f, 0.4], [60, 0, -10, 0x6b8e23, 0.38],
      [12, 0, 45, 0x8fbc8f, 0.32], [-30, 0, 48, 0x9acd32, 0.35],
      [48, 0, 40, 0x808000, 0.37], [-55, 0, -5, 0x3cb371, 0.41],
    ];
    for (const [dx, dy, dz, color, scale] of dinoHerd) {
      this._addBackgroundDino(dx, dy, dz, color, scale);
    }

    // Mid-ground large dinosaurs — clearly visible herd behind the characters
    const midHerd = [
      [-12, 0, -22, 0x8b4513, 1.4], [10, 0, -25, 0xa0522d, 1.6],
      [18, 0, -20, 0xcd853f, 1.3], [-8, 0, -30, 0xd2691e, 1.5],
      [6, 0, -35, 0x556b2f, 1.2], [-18, 0, -26, 0x6b8e23, 1.3],
      [22, 0, -32, 0x8fbc8f, 1.1], [-25, 0, -20, 0x8b4513, 1.4],
      [14, 0, -28, 0xa0522d, 1.5], [-2, 0, -24, 0xcd853f, 1.35],
      [28, 0, -24, 0xd2691e, 1.25], [-14, 0, -34, 0x556b2f, 1.15],
    ];
    for (const [dx, dy, dz, color, scale] of midHerd) {
      this._addBackgroundDino(dx, dy, dz, color, scale);
    }

    // Anywhere door for returning home
    this.door = new AnywhereDoor();
    this.door.group.position.set(0, 0, -6);
    this.door.group.rotation.y = Math.PI;
    this.scene.add(this.door.group);

    // Warm prehistoric sun + hazy fill
    this.lights.forEach(l => {
      if (l.isDirectionalLight) {
        l.color.setHex(0xffeebb);
        l.intensity = 1.4;
        l.position.set(20, 30, 15);
      }
      if (l.isAmbientLight) {
        l.color.setHex(0xffd4a3);
        l.intensity = 0.8;
      }
    });

    return this.scene;
  }

  _addBackgroundDino(x, y, z, color, scale) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);
    const skinMat = new THREE.MeshToonMaterial({ color });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), skinMat);
    body.scale.set(1, 0.85, 1.6);
    body.position.y = 1.1;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), skinMat);
    head.scale.set(1, 0.9, 1.2);
    head.position.set(0, 1.8, 1.1);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 12), skinMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.set(0, 1.0, -1.3);
    group.add(tail);
    const legGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.9, 10);
    for (const lx of [-0.4, 0.4]) {
      for (const lz of [0.6, -0.6]) {
        const leg = new THREE.Mesh(legGeo, skinMat);
        leg.position.set(lx, 0.45, lz);
        group.add(leg);
      }
    }
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.backgroundDinos.push({ group, baseY: y, phase: Math.random() * 10 });
  }

  scheduleDoorEvent(event) {
    this.doorEvents.push(event);
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.door) {
      for (const ev of this.doorEvents) {
        if (ev.fired) continue;
        if (time >= ev.startTime) {
          ev.fired = true;
          if (ev.action === 'summon') {
            this.door.summon(ev.startTime, ev.duration || 0.5);
          } else if (ev.action === 'open') {
            this.door.setOpen(true);
          } else if (ev.action === 'close') {
            this.door.setOpen(false);
          } else if (ev.action === 'hide') {
            this.door.hide();
          }
        }
      }
      this.door.update(time, delta);
    }
    // Gentle idle sway for background dinos
    for (const d of this.backgroundDinos) {
      d.group.position.y = d.baseY + Math.sin(time * 2 + d.phase) * 0.02;
      d.group.rotation.y += Math.sin(time + d.phase) * 0.0005;
    }
    // Rising volcano smoke
    if (this.smokePuffs) {
      for (const smoke of this.smokePuffs) {
        const ud = smoke.userData;
        const cycle = (time * ud.speed + ud.offset) % 1;
        smoke.position.y = ud.baseY + cycle * 8;
        smoke.position.x += Math.sin(time + ud.offset) * 0.002;
        const s = 1 + cycle * 0.6;
        smoke.scale.set(s, s, s);
        smoke.material.opacity = 0.35 * (1 - cycle);
      }
    }
    // Pulsing crater light
    if (this.volcanoLight) {
      this.volcanoLight.intensity = 2.2 + Math.sin(time * 3) * 0.4;
    }
  }
}

registerScene('PrehistoricScene', PrehistoricScene);

// ─────────────────────────────────────────────────────────────────────────────
// 任意门道具
// ─────────────────────────────────────────────────────────────────────────────

class AnywhereDoor {
  constructor() {
    this.group = new THREE.Group();
    this.doorGroup = new THREE.Group(); // the swinging part
    this.isOpen = false;
    this.openProgress = 0;
    this.visible = false;
    this.appearProgress = 0;
    this.appearStartTime = -1;
    this.appearDuration = 0.5;
    this.particles = [];

    const frameMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.4 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xff85c1, roughness: 0.5 });
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.6, roughness: 0.3 });

    // Frame
    const frameThick = 0.12;
    const frameDepth = 0.15;
    const w = 1.3;
    const h = 2.4;
    this.doorW = w;
    this.doorH = h;

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth), frameMat);
    topFrame.position.set(0, h + frameThick / 2, 0);
    topFrame.castShadow = true;
    this.group.add(topFrame);

    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, frameDepth), frameMat);
    leftFrame.position.set(-(w / 2 + frameThick / 2), h / 2, 0);
    leftFrame.castShadow = true;
    this.group.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, frameDepth), frameMat);
    rightFrame.position.set(w / 2 + frameThick / 2, h / 2, 0);
    rightFrame.castShadow = true;
    this.group.add(rightFrame);

    // Door panel (pivots on left)
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), doorMat);
    doorPanel.position.set(w / 2, h / 2, 0);
    doorPanel.castShadow = true;
    this.doorGroup.add(doorPanel);

    // Knob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), knobMat);
    knob.position.set(w - 0.2, h / 2, 0.08);
    this.doorGroup.add(knob);

    // Hinge position
    this.doorGroup.position.set(-w / 2, 0, 0);
    this.group.add(this.doorGroup);

    // Glow portal (behind door, revealed when open)
    const portalGeo = new THREE.PlaneGeometry(w * 0.9, h * 0.95);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.portal = new THREE.Mesh(portalGeo, portalMat);
    this.portal.position.set(0, h / 2, -0.1);
    this.group.add(this.portal);

    // Portal light
    this.portalLight = new THREE.PointLight(0x88ffff, 0, 6, 2);
    this.portalLight.position.set(0, h / 2, -0.5);
    this.group.add(this.portalLight);

    // Summon sparkle particles
    const sparkleGeo = new THREE.BufferGeometry();
    const sparkleCount = 40;
    const positions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * w * 1.2;
      positions[i * 3 + 1] = Math.random() * h;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparkleMat = new THREE.PointsMaterial({ color: 0x88ffff, size: 0.06, transparent: true, opacity: 0 });
    this.sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    this.group.add(this.sparkles);

    this.group.visible = false;
    this.group.scale.set(0, 0, 0);
  }

  summon(startTime, duration = 0.5) {
    this.visible = true;
    this.group.visible = true;
    this.appearStartTime = startTime;
    this.appearDuration = duration;
    this.appearProgress = 0;
    this.group.scale.set(0, 0, 0);
    this.sparkles.material.opacity = 1;
    this.pendingOpen = true;
  }

  hide() {
    this.visible = false;
    this.isOpen = false;
    this.pendingOpen = false;
    this.group.visible = false;
    this.group.scale.set(0, 0, 0);
    this.appearProgress = 0;
    this.openProgress = 0;
    this.portal.material.opacity = 0;
    this.portalLight.intensity = 0;
  }

  setOpen(open) {
    this.isOpen = open;
  }

  update(time, delta) {
    // Appear / disappear animation
    if (this.visible && this.appearStartTime >= 0) {
      const t = Math.min(1, Math.max(0, (time - this.appearStartTime) / this.appearDuration));
      this.appearProgress = t;
      const ease = 1 - Math.pow(1 - t, 3);
      this.group.scale.set(ease, ease, ease);
      this.sparkles.material.opacity = t < 0.5 ? t * 2 : (1 - t) * 2;
      this.sparkles.rotation.y += delta * 2;
      if (t >= 1) {
        this.appearStartTime = -1;
        this.sparkles.material.opacity = 0;
        if (this.pendingOpen) {
          this.setOpen(true);
          this.pendingOpen = false;
        }
      }
    } else if (!this.visible) {
      this.group.scale.set(0, 0, 0);
    }

    const target = this.isOpen ? 1 : 0;
    this.openProgress += (target - this.openProgress) * Math.min(1, delta * 6);

    // Door swings inward (-120 deg)
    this.doorGroup.rotation.y = -this.openProgress * (Math.PI * 2 / 3);

    // Portal glow
    this.portal.material.opacity = this.openProgress * 0.85;
    this.portalLight.intensity = this.openProgress * 3;

    // Subtle pulse
    if (this.openProgress > 0.1) {
      const pulse = 1 + Math.sin(time * 6) * 0.05;
      this.portal.scale.set(pulse, pulse, 1);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 小恐龙角色
// ─────────────────────────────────────────────────────────────────────────────

class BabyDino extends CharacterBase {
  constructor() {
    super('BabyDino');
    this.archetypes = ['quadruped', 'dinosaur'];
    this.boundingRadius = 0.7;
  }

  build() {
    const skinMat = new THREE.MeshToonMaterial({ color: 0xe67e22, roughness: 0.85 });
    const backMat = new THREE.MeshToonMaterial({ color: 0xc45c15, roughness: 0.85 });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0xf5cba7, roughness: 0.9 });
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    const cheekMat = new THREE.MeshToonMaterial({ color: 0xffa07a });
    const clawMat = new THREE.MeshToonMaterial({ color: 0x5c3a21 });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 24), skinMat);
    body.scale.set(1.05, 0.88, 1.35);
    body.position.y = 0.72;
    body.castShadow = true;
    this.mesh.add(body);

    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 20), bellyMat);
    belly.scale.set(0.85, 0.72, 1.05);
    belly.position.set(0, 0.62, 0.2);
    this.mesh.add(belly);

    // Back stripe
    const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.0, 6, 8), backMat);
    stripe.position.set(0, 1.15, -0.1);
    stripe.rotation.x = -Math.PI / 2.2;
    this.mesh.add(stripe);

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.2, 0.72);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 22), skinMat);
    head.scale.set(1.05, 0.95, 1.15);
    head.castShadow = true;
    this.headGroup.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
    snout.position.set(0, -0.06, 0.35);
    snout.scale.set(1, 0.82, 1.25);
    this.headGroup.add(snout);

    // Nostrils
    for (const sx of [-0.08, 0.08]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), clawMat);
      nostril.position.set(sx, 0.02, 0.52);
      this.headGroup.add(nostril);
    }

    // Big cute eyes
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), eyeWhiteMat);
      eye.position.set(sx * 0.15, 0.12, 0.3);
      this.headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), pupilMat);
      pupil.position.set(sx * 0.15, 0.12, 0.37);
      this.headGroup.add(pupil);

      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeWhiteMat);
      highlight.position.set(sx * 0.13, 0.16, 0.39);
      this.headGroup.add(highlight);

      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), cheekMat);
      cheek.position.set(sx * 0.22, -0.02, 0.3);
      cheek.scale.set(1, 0.6, 0.4);
      this.headGroup.add(cheek);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), skinMat);
      ear.position.set(sx * 0.28, 0.32, -0.05);
      ear.rotation.z = sx * 0.35;
      this.headGroup.add(ear);
    }

    // Mouth
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), pupilMat);
    this.mouth.position.set(0, -0.1, 0.45);
    this.mouth.scale.set(1.5, 0.45, 0.65);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = this.mouth.scale.x;
    this.mouthBaseScaleY = this.mouth.scale.y;
    this.mouthBaseScaleZ = this.mouth.scale.z;

    // Tiny teeth
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 5), new THREE.MeshToonMaterial({ color: 0xffffee }));
        tooth.position.set(side * (0.08 + i * 0.05), -0.06, 0.48 + i * 0.03);
        this.headGroup.add(tooth);
      }
    }

    // Head crest
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), backMat);
      spike.position.set(0, 0.4 + i * 0.05, -0.2 - i * 0.04);
      spike.rotation.x = -0.35;
      this.headGroup.add(spike);
    }

    this.mesh.add(this.headGroup);

    // Tail with dorsal bumps
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.78, -0.6);
    for (let i = 0; i < 5; i++) {
      const r = 0.19 - i * 0.025;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), skinMat);
      seg.position.set(0, 0, -i * 0.3);
      seg.scale.set(1, 0.82, 1.2);
      seg.castShadow = true;
      this.tail.add(seg);
      if (i < 4) {
        const bump = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), backMat);
        bump.position.set(0, r * 0.9, -i * 0.3 - 0.12);
        bump.rotation.x = -0.3;
        this.tail.add(bump);
      }
    }
    this.mesh.add(this.tail);

    // Legs with tiny claws
    const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.58, 12);
    const positions = [
      [-0.3, 0.29, 0.38], [0.3, 0.29, 0.38],
      [-0.3, 0.29, -0.38], [0.3, 0.29, -0.38],
    ];
    this.legs = [];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.mesh.add(leg);
      this.legs.push(leg);

      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 5), clawMat);
        claw.position.set(x + c * 0.04, 0.02, z + 0.08);
        claw.rotation.x = -0.4;
        this.mesh.add(claw);
      }
    }

    // Tiny arms with claws
    for (const sx of [-1, 1]) {
      const armGroup = new THREE.Group();
      armGroup.position.set(sx * 0.38, 0.9, 0.48);
      const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.28, 8), skinMat);
      armMesh.rotation.z = sx * Math.PI / 2.8;
      armMesh.position.y = -0.1;
      armGroup.add(armMesh);

      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 5), clawMat);
      claw.position.set(sx * 0.1, -0.2, 0.02);
      claw.rotation.z = sx * 0.3;
      armGroup.add(claw);

      this.mesh.add(armGroup);
      if (sx < 0) this.leftArm = armGroup;
      else this.rightArm = armGroup;
    }
  }
}

registerCharacter('BabyDino', BabyDino);

// ─────────────────────────────────────────────────────────────────────────────
// 大恐龙角色（追逐戏）
// ─────────────────────────────────────────────────────────────────────────────

class BigDino extends CharacterBase {
  constructor() {
    super('BigDino');
    this.archetypes = ['quadruped', 'dinosaur', 'round'];
    this.boundingRadius = 1.8;
  }

  build() {
    this.mesh.scale.set(0.6, 0.6, 0.6);

    const skinMat = new THREE.MeshToonMaterial({ color: 0x8b4513, roughness: 0.85 });
    const backMat = new THREE.MeshToonMaterial({ color: 0x6b3410, roughness: 0.85 });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0xd2b48c, roughness: 0.9 });
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xfff8dc });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x110000 });
    const clawMat = new THREE.MeshToonMaterial({ color: 0x2a1a10 });
    const toothMat = new THREE.MeshToonMaterial({ color: 0xffffee });

    // Body with a slightly tapered, muscular torso
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.45, 28, 28), skinMat);
    body.scale.set(1.15, 1.05, 1.85);
    body.position.y = 1.65;
    body.castShadow = true;
    this.mesh.add(body);

    // Darker back ridge
    const backRidge = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 2.2, 8, 12), backMat);
    backRidge.position.set(0, 2.45, -0.15);
    backRidge.rotation.x = -Math.PI / 2.2;
    this.mesh.add(backRidge);

    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 24), bellyMat);
    belly.scale.set(1, 0.85, 1.25);
    belly.position.set(0, 1.4, 0.3);
    this.mesh.add(belly);

    // Back plates / spikes along spine
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const plate = new THREE.Mesh(
        new THREE.ConeGeometry(0.12 + (1 - t) * 0.08, 0.45 + (1 - t) * 0.25, 6),
        backMat
      );
      plate.position.set(0, 2.55 + Math.sin(t * Math.PI) * 0.15, -1.4 + t * 2.6);
      plate.rotation.x = -0.25;
      this.mesh.add(plate);
    }

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.65, 1.6);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.88, 26, 26), skinMat);
    head.scale.set(1.05, 0.95, 1.25);
    head.castShadow = true;
    this.headGroup.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 22), skinMat);
    snout.position.set(0, -0.12, 0.78);
    snout.scale.set(1, 0.88, 1.35);
    this.headGroup.add(snout);

    // Nostrils
    for (const sx of [-0.18, 0.18]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), clawMat);
      nostril.position.set(sx, 0.02, 1.32);
      this.headGroup.add(nostril);
    }

    // Eyes with angry brow ridge
    const browMat = new THREE.MeshToonMaterial({ color: 0x5a2e0e });
    for (const sx of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.42, 6, 8), browMat);
      brow.position.set(sx * 0.34, 0.42, 0.62);
      brow.rotation.z = sx * 0.25;
      brow.rotation.x = 0.2;
      this.headGroup.add(brow);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), eyeWhiteMat);
      eye.position.set(sx * 0.34, 0.26, 0.58);
      this.headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), pupilMat);
      pupil.position.set(sx * 0.34, 0.26, 0.68);
      this.headGroup.add(pupil);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), skinMat);
      ear.position.set(sx * 0.55, 0.55, -0.15);
      ear.rotation.z = sx * 0.4;
      this.headGroup.add(ear);
    }

    // Mouth
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), pupilMat);
    this.mouth.position.set(0, -0.35, 1.05);
    this.mouth.scale.set(1.7, 0.55, 0.85);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = this.mouth.scale.x;
    this.mouthBaseScaleY = this.mouth.scale.y;
    this.mouthBaseScaleZ = this.mouth.scale.z;

    // Teeth (upper + lower)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), toothMat);
        tooth.position.set(side * (0.22 + i * 0.08), -0.18, 1.0 + i * 0.08);
        tooth.rotation.x = side * 0.15;
        this.headGroup.add(tooth);
      }
      for (let i = 0; i < 3; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), toothMat);
        tooth.position.set(side * (0.18 + i * 0.09), -0.48, 0.92 + i * 0.08);
        tooth.rotation.x = Math.PI + side * 0.15;
        this.headGroup.add(tooth);
      }
    }

    // Head crest
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), backMat);
      spike.position.set(0, 0.85 + i * 0.09, -0.45 - i * 0.08);
      spike.rotation.x = -0.4;
      this.headGroup.add(spike);
    }

    this.mesh.add(this.headGroup);

    // Tail with dorsal spines
    this.tail = new THREE.Group();
    this.tail.position.set(0, 1.85, -1.25);
    for (let i = 0; i < 6; i++) {
      const r = 0.48 - i * 0.05;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), skinMat);
      seg.position.set(0, 0, -i * 0.55);
      seg.scale.set(1, 0.85, 1.3);
      seg.castShadow = true;
      this.tail.add(seg);
      if (i < 5) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 6), backMat);
        spine.position.set(0, r * 0.9, -i * 0.55 - 0.2);
        spine.rotation.x = -0.3;
        this.tail.add(spine);
      }
    }
    this.mesh.add(this.tail);

    // Legs with claws
    const legGeo = new THREE.CylinderGeometry(0.38, 0.3, 1.35, 14);
    const positions = [
      [-0.78, 0.68, 0.85], [0.78, 0.68, 0.85],
      [-0.78, 0.68, -0.95], [0.78, 0.68, -0.95],
    ];
    this.legs = [];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.mesh.add(leg);
      this.legs.push(leg);

      // Three claws per foot
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), clawMat);
        claw.position.set(x + c * 0.12, 0.05, z + 0.22);
        claw.rotation.x = -0.4;
        this.mesh.add(claw);
      }
    }

    // Tiny arms with claws
    const armGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.55, 10);
    for (const sx of [-1, 1]) {
      const armGroup = new THREE.Group();
      armGroup.position.set(sx * 0.95, 2.0, 1.15);
      const armMesh = new THREE.Mesh(armGeo, skinMat);
      armMesh.rotation.z = sx * Math.PI / 2.8;
      armMesh.position.y = -0.22;
      armGroup.add(armMesh);

      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), clawMat);
      claw.position.set(sx * 0.22, -0.45, 0.05);
      claw.rotation.z = sx * 0.3;
      armGroup.add(claw);

      this.mesh.add(armGroup);
      if (sx < 0) this.leftArm = armGroup;
      else this.rightArm = armGroup;
    }
  }
}

registerCharacter('BigDino', BigDino);

// ─────────────────────────────────────────────────────────────────────────────
// 自定义动画
// ─────────────────────────────────────────────────────────────────────────────

class DinoWagTail extends AnimationBase {
  constructor(options = {}) { super('DinoWagTail', positiveNumber(options.duration, 1.0)); }
  update(t, character) {
    if (character.tail) {
      character.tail.rotation.y = Math.sin(t * TAU * 3) * 0.25;
      character.tail.rotation.x = Math.sin(t * TAU * 2) * 0.08;
    }
  }
}

class DinoRoar extends AnimationBase {
  constructor(options = {}) { super('DinoRoar', positiveNumber(options.duration, 1.2)); }
  update(t, character) {
    const e = easeOutBack(Math.min(1, t * 1.5));
    if (character.headGroup) {
      character.headGroup.rotation.x = -0.3 * e;
    }
    if (character.mouth) {
      const open = 0.6 + Math.sin(t * TAU * 8) * 0.3;
      character.mouth.scale.set(character.mouthBaseScaleX * (1 + open), character.mouthBaseScaleY * (1 + open * 3), character.mouthBaseScaleZ);
    }
    if (character.tail) character.tail.rotation.y = Math.sin(t * TAU * 6) * 0.2;
  }
}

class DinoWalk extends AnimationBase {
  constructor(options = {}) { super('DinoWalk', positiveNumber(options.duration, 2.0)); }
  update(t, character) {
    if (!character.legs) return;
    const e = Math.sin(t * TAU * 4);
    character.legs[0].rotation.x = e * 0.25;
    character.legs[1].rotation.x = -e * 0.25;
    character.legs[2].rotation.x = -e * 0.25;
    character.legs[3].rotation.x = e * 0.25;
    character.mesh.position.y = Math.abs(e) * 0.03;
  }
}

class BigDinoRun extends AnimationBase {
  constructor(options = {}) { super('BigDinoRun', positiveNumber(options.duration, 2.0)); }
  update(t, character) {
    if (!character.legs) return;
    const e = Math.sin(t * TAU * 6);
    const amp = 0.35;
    character.legs[0].rotation.x = e * amp;
    character.legs[1].rotation.x = -e * amp;
    character.legs[2].rotation.x = -e * amp;
    character.legs[3].rotation.x = e * amp;
    character.mesh.position.y = Math.abs(e) * 0.08;
    if (character.tail) {
      character.tail.rotation.y = Math.sin(t * TAU * 5) * 0.15;
      character.tail.rotation.x = Math.sin(t * TAU * 3) * 0.05;
    }
  }
}

class BigDinoRoar extends AnimationBase {
  constructor(options = {}) { super('BigDinoRoar', positiveNumber(options.duration, 1.5)); }
  update(t, character) {
    const e = easeOutBack(Math.min(1, t * 1.2));
    if (character.headGroup) {
      character.headGroup.rotation.x = -0.45 * e;
    }
    if (character.mouth) {
      const open = 0.8 + Math.sin(t * TAU * 6) * 0.2;
      character.mouth.scale.set(character.mouthBaseScaleX * (1 + open), character.mouthBaseScaleY * (1 + open * 3), character.mouthBaseScaleZ);
    }
    if (character.tail) character.tail.rotation.y = Math.sin(t * TAU * 5) * 0.25;
  }
}

function restoreNeutralArms(character) {
  if (character.name !== 'Doraemon') return;
  if (character.rightArm?.userData?.neutralArmRot) {
    character.rightArm.rotation.copy(character.rightArm.userData.neutralArmRot);
  }
  if (character.leftArm?.userData?.neutralArmRot) {
    character.leftArm.rotation.copy(character.leftArm.userData.neutralArmRot);
  }
}

class DoorOpen extends AnimationBase {
  // Long duration so the door stays "openable" even if the renderer seeks mid-entry.
  constructor(options = {}) { super('DoorOpen', positiveNumber(options.duration, 30.0)); }
  update(t, character) {
    if (window.anywhereDoor) {
      window.anywhereDoor.setOpen(true);
      // Snap fully open immediately so seeking/verify still shows the open door.
      window.anywhereDoor.openProgress = 1;
    }
    // Reset Doraemon's arms to neutral so TakeOutFromPocket doesn't leave them stuck.
    restoreNeutralArms(character);
  }
}

class DoorClose extends AnimationBase {
  constructor(options = {}) { super('DoorClose', positiveNumber(options.duration, 30.0)); }
  update(t, character) {
    if (window.anywhereDoor) {
      window.anywhereDoor.setOpen(false);
      window.anywhereDoor.openProgress = 0;
    }
    restoreNeutralArms(character);
  }
}

class TakeCopter extends AnimationBase {
  constructor(options = {}) { super('TakeCopter', positiveNumber(options.duration, 2.0)); }
  update(t, character) {
    // Attach on first visible update (engine does not call start()).
    if (character.attachTakeCopter) character.attachTakeCopter();
    if (character.takeCopter && character.takeCopter.visible) {
      // Spin all blade meshes (BoxGeometry children at the top of the propeller).
      for (const child of character.takeCopter.children) {
        if (child.geometry && child.geometry.type === 'BoxGeometry') {
          child.rotation.y += 0.6;
        }
      }
    }
  }
}

class TakeCopterOff extends AnimationBase {
  constructor(options = {}) { super('TakeCopterOff', positiveNumber(options.duration, 0.5)); }
  update(t, character) {
    if (character.detachTakeCopter) character.detachTakeCopter();
  }
}

registerAnimation('DinoWagTail', DinoWagTail);
registerAnimation('DinoRoar', DinoRoar);
registerAnimation('DinoWalk', DinoWalk);
registerAnimation('BigDinoRun', BigDinoRun);
registerAnimation('BigDinoRoar', BigDinoRoar);
registerAnimation('DoorOpen', DoorOpen);
registerAnimation('DoorClose', DoorClose);
registerAnimation('TakeCopter', TakeCopter);
registerAnimation('TakeCopterOff', TakeCopterOff);

// ─────────────────────────────────────────────────────────────────────────────
// PoseMatrix-based facial expressions (compatible with the engine lip-sync)
// FaceHappy / FaceSurprised / FaceReset are already provided by dula-assets;
// we only add the missing FaceScared and FaceProud used by this episode.
// ─────────────────────────────────────────────────────────────────────────────

class FaceScared extends AnimationBase {
  constructor(options = {}) {
    super('FaceScared', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    // Inner eyebrows down, outer up; pupils shrink; mouth falls open.
    pose.eyebrows = {
      left: { py: e * 0.005, rz: e * 0.25 },
      right: { py: e * 0.005, rz: -e * 0.25 },
    };
    pose.pupils = {
      left: { sx: -e * 0.15, sy: -e * 0.15, sz: -e * 0.15 },
      right: { sx: -e * 0.15, sy: -e * 0.15, sz: -e * 0.15 },
    };
    pose.mouth = { tension: -e * 0.15 };
    pose.headGroup = { rx: e * 0.05, ry: e * 0.05 };
    return amplifyFace(pose);
  }
}

class FaceProud extends AnimationBase {
  constructor(options = {}) {
    super('FaceProud', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    // Raised brows, slight smile, chin up.
    pose.eyebrows = {
      left: { py: e * 0.015, rz: -e * 0.1 },
      right: { py: e * 0.015, rz: e * 0.1 },
    };
    pose.pupils = {
      left: { sx: e * 0.05, sy: e * 0.05, sz: e * 0.05 },
      right: { sx: e * 0.05, sy: e * 0.05, sz: e * 0.05 },
    };
    pose.mouth = { tension: e * 0.25 };
    pose.headGroup = { rx: -e * 0.05 };
    return amplifyFace(pose);
  }
}

class FaceSad extends AnimationBase {
  constructor(options = {}) {
    super('FaceSad', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    // Eyebrows slant up at the inner ends, mouth droops, head hangs.
    pose.eyebrows = {
      left: { py: e * 0.008, rz: -e * 0.25 },
      right: { py: e * 0.008, rz: e * 0.25 },
    };
    pose.pupils = {
      left: { py: -e * 0.01 },
      right: { py: -e * 0.01 },
    };
    pose.mouth = { tension: -e * 0.25 };
    pose.headGroup = { rx: e * 0.12 };
    return amplifyFace(pose);
  }
}

class FaceCry extends AnimationBase {
  constructor(options = {}) {
    super('FaceCry', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    // Sad eyebrows, squeezed-shut eyes, downturned open mouth.
    pose.eyebrows = {
      left: { py: e * 0.012, rz: -e * 0.35 },
      right: { py: e * 0.012, rz: e * 0.35 },
    };
    pose.eyelids = {
      left: { visible: true, sy: -e * 0.45 },
      right: { visible: true, sy: -e * 0.45 },
    };
    pose.pupils = {
      left: { sx: -e * 0.1, sy: -e * 0.1, sz: -e * 0.1 },
      right: { sx: -e * 0.1, sy: -e * 0.1, sz: -e * 0.1 },
    };
    pose.mouth = { tension: -e * 0.25 };
    pose.headGroup = { rx: e * 0.15 };
    return amplifyFace(pose);
  }
}

class FaceWorried extends AnimationBase {
  constructor(options = {}) {
    super('FaceWorried', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.015, rz: e * 0.2 },
      right: { py: e * 0.015, rz: -e * 0.2 },
    };
    pose.pupils = {
      left: { sx: -e * 0.12, sy: -e * 0.12, sz: -e * 0.12 },
      right: { sx: -e * 0.12, sy: -e * 0.12, sz: -e * 0.12 },
    };
    pose.mouth = { tension: -e * 0.1 };
    pose.headGroup = { rx: e * 0.05, ry: e * 0.05 };
    return amplifyFace(pose);
  }
}

class FaceExcited extends AnimationBase {
  constructor(options = {}) {
    super('FaceExcited', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.015, rz: -e * 0.1 },
      right: { py: e * 0.015, rz: e * 0.1 },
    };
    pose.pupils = {
      left: { sx: e * 0.08, sy: e * 0.08, sz: e * 0.08 },
      right: { sx: e * 0.08, sy: e * 0.08, sz: e * 0.08 },
    };
    pose.mouth = { tension: e * 0.3 };
    pose.headGroup = { rx: -e * 0.05 };
    return amplifyFace(pose);
  }
}

class FaceAngry extends AnimationBase {
  constructor(options = {}) {
    super('FaceAngry', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: -e * 0.005, rz: e * 0.2 },
      right: { py: -e * 0.005, rz: -e * 0.2 },
    };
    pose.pupils = {
      left: { sx: -e * 0.1, sy: -e * 0.1, sz: -e * 0.1 },
      right: { sx: -e * 0.1, sy: -e * 0.1, sz: -e * 0.1 },
    };
    pose.mouth = { tension: -e * 0.2 };
    pose.headGroup = { rx: -e * 0.05, ry: e * 0.05 };
    return amplifyFace(pose);
  }
}

class FaceRelieved extends AnimationBase {
  constructor(options = {}) {
    super('FaceRelieved', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.005, rz: -e * 0.05 },
      right: { py: e * 0.005, rz: e * 0.05 },
    };
    pose.eyelids = {
      left: { visible: true, sy: -e * 0.25 },
      right: { visible: true, sy: -e * 0.25 },
    };
    pose.mouth = { tension: e * 0.15 };
    pose.headGroup = { rx: e * 0.03 };
    return amplifyFace(pose);
  }
}

class FaceAmazed extends AnimationBase {
  constructor(options = {}) {
    super('FaceAmazed', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.018, rz: -e * 0.15 },
      right: { py: e * 0.018, rz: e * 0.15 },
    };
    pose.pupils = {
      left: { sx: -e * 0.2, sy: -e * 0.2, sz: -e * 0.2 },
      right: { sx: -e * 0.2, sy: -e * 0.2, sz: -e * 0.2 },
    };
    pose.mouth = { tension: -e * 0.25 };
    pose.headGroup = { rx: -e * 0.08 };
    return amplifyFace(pose);
  }
}

class FaceSmile extends AnimationBase {
  constructor(options = {}) {
    super('FaceSmile', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.005, rz: -e * 0.08 },
      right: { py: e * 0.005, rz: e * 0.08 },
    };
    pose.mouth = { tension: e * 0.3 };
    return amplifyFace(pose);
  }
}

class FaceGrin extends AnimationBase {
  constructor(options = {}) {
    super('FaceGrin', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.008, rz: -e * 0.12 },
      right: { py: e * 0.008, rz: e * 0.12 },
    };
    pose.pupils = {
      left: { sx: -e * 0.05, sy: -e * 0.05, sz: -e * 0.05 },
      right: { sx: -e * 0.05, sy: -e * 0.05, sz: -e * 0.05 },
    };
    pose.mouth = { tension: e * 0.35 };
    pose.headGroup = { ry: e * 0.08 };
    return amplifyFace(pose);
  }
}

class FaceLaugh extends AnimationBase {
  constructor(options = {}) {
    super('FaceLaugh', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.012, rz: -e * 0.1 },
      right: { py: e * 0.012, rz: e * 0.1 },
    };
    pose.eyelids = {
      left: { visible: true, sy: -e * 0.35 },
      right: { visible: true, sy: -e * 0.35 },
    };
    pose.mouth = { tension: e * 0.4 };
    pose.headGroup = { rx: -e * 0.05 };
    return amplifyFace(pose);
  }
}

class FaceTired extends AnimationBase {
  constructor(options = {}) {
    super('FaceTired', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.003, rz: e * 0.15 },
      right: { py: e * 0.003, rz: -e * 0.15 },
    };
    pose.eyelids = {
      left: { visible: true, sy: -e * 0.45 },
      right: { visible: true, sy: -e * 0.45 },
    };
    pose.pupils = {
      left: { py: -e * 0.01 },
      right: { py: -e * 0.01 },
    };
    pose.mouth = { tension: -e * 0.15 };
    pose.headGroup = { rx: e * 0.1 };
    return amplifyFace(pose);
  }
}

class FaceRelaxed extends AnimationBase {
  constructor(options = {}) {
    super('FaceRelaxed', positiveNumber(options.duration, 0.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.eyebrows = {
      left: { py: e * 0.003, rz: -e * 0.03 },
      right: { py: e * 0.003, rz: e * 0.03 },
    };
    pose.eyelids = {
      left: { visible: true, sy: -e * 0.15 },
      right: { visible: true, sy: -e * 0.15 },
    };
    pose.mouth = { tension: e * 0.1 };
    pose.headGroup = { rx: e * 0.02 };
    return amplifyFace(pose);
  }
}

// ── Tear visibility helpers (non-matrix so they can run alongside face anims) ──

class ShowTears extends AnimationBase {
  constructor(options = {}) {
    super('ShowTears', positiveNumber(options.duration, 1.0));
  }
  update(t, character) {
    const show = Math.min(1, t * 3);
    if (character.leftTear) {
      character.leftTear.visible = true;
      character.leftTear.scale.set(1.0, 1.8 + show * 0.4, 0.8);
      character.leftTear.position.y = character.leftTear.userData.baseY - t * 0.02;
    }
    if (character.rightTear) {
      character.rightTear.visible = true;
      character.rightTear.scale.set(1.0, 1.8 + show * 0.4, 0.8);
      character.rightTear.position.y = character.rightTear.userData.baseY - t * 0.02;
    }
  }
}

class HideTears extends AnimationBase {
  constructor(options = {}) {
    super('HideTears', positiveNumber(options.duration, 0.3));
  }
  update(t, character) {
    if (character.leftTear) {
      character.leftTear.visible = false;
      character.leftTear.scale.set(1.0, 1.8, 0.8);
      character.leftTear.position.y = character.leftTear.userData.baseY;
    }
    if (character.rightTear) {
      character.rightTear.visible = false;
      character.rightTear.scale.set(1.0, 1.8, 0.8);
      character.rightTear.position.y = character.rightTear.userData.baseY;
    }
  }
}

// ── Extra body-language animations ──

class Cry extends AnimationBase {
  constructor(options = {}) {
    super('Cry', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    // Slumped shoulders, arms hanging inward, head bowed.
    pose.rightShoulder = { rz: e * 0.35, rx: e * 0.2 };
    pose.leftShoulder = { rz: -e * 0.35, rx: e * 0.2 };
    pose.headGroup = { rx: e * 0.15 };
    pose.mesh = { y: -e * 0.03 };
    return amplifyFace(pose);
  }
}

class HandsOnHips extends AnimationBase {
  constructor(options = {}) {
    super('HandsOnHips', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 1;
    if (t < 0.2) e = t / 0.2;
    else if (t > 0.8) e = 1 - (t - 0.8) / 0.2;
    pose.rightShoulder = { rz: e * 0.45, rx: e * 0.55 };
    pose.leftShoulder = { rz: -e * 0.45, rx: e * 0.55 };
    pose.rightElbow = { rz: e * 0.35 };
    pose.leftElbow = { rz: -e * 0.35 };
    return amplifyFace(pose);
  }
}

class ThumbsUp extends AnimationBase {
  constructor(options = {}) {
    super('ThumbsUp', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 1;
    if (t < 0.2) e = t / 0.2;
    else if (t > 0.8) e = 1 - (t - 0.8) / 0.2;
    pose.rightShoulder = { rz: e * 0.6, rx: -e * 0.8 };
    pose.rightElbow = { rz: e * 0.3 };
    pose.headGroup = { rx: -e * 0.05 };
    return amplifyFace(pose);
  }
}

class Facepalm extends AnimationBase {
  constructor(options = {}) {
    super('Facepalm', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 1;
    if (t < 0.2) e = t / 0.2;
    else if (t > 0.8) e = 1 - (t - 0.8) / 0.2;
    pose.rightShoulder = { rz: e * 0.25, rx: -e * 0.95 };
    pose.rightElbow = { rz: e * 0.5 };
    pose.headGroup = { rx: e * 0.1 };
    return amplifyFace(pose);
  }
}

class ExcitedJump extends AnimationBase {
  constructor(options = {}) {
    super('ExcitedJump', positiveNumber(options.duration, 0.6));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const y = Math.sin(t * Math.PI) * 0.4;
    const fling = Math.sin(t * Math.PI);
    pose.mesh = { y };
    pose.rightShoulder = { rz: fling * 1.0 };
    pose.leftShoulder = { rz: -fling * 1.0 };
    pose.headGroup = { rx: -fling * 0.2 };
    return amplifyFace(pose);
  }
}

class JumpForJoy extends AnimationBase {
  constructor(options = {}) {
    super('JumpForJoy', positiveNumber(options.duration, 0.8));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.25;
    const arms = Math.sin(t * Math.PI * 2);
    pose.mesh = { y };
    pose.rightShoulder = { rz: arms * 0.9 };
    pose.leftShoulder = { rz: -arms * 0.9 };
    pose.headGroup = { rx: -arms * 0.1 };
    return amplifyFace(pose);
  }
}

class ShakeHead extends AnimationBase {
  constructor(options = {}) {
    super('ShakeHead', positiveNumber(options.duration, 0.8));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    pose.headGroup = { ry: Math.sin(t * Math.PI * 6) * 0.25 };
    return amplifyFace(pose);
  }
}

class Bow extends AnimationBase {
  constructor(options = {}) {
    super('Bow', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 1;
    if (t < 0.2) e = t / 0.2;
    else if (t > 0.8) e = 1 - (t - 0.8) / 0.2;
    pose.headGroup = { rx: e * 0.35 };
    pose.mesh = { rx: e * 0.1 };
    return amplifyFace(pose);
  }
}

class SlumpShoulders extends AnimationBase {
  constructor(options = {}) {
    super('SlumpShoulders', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    pose.rightShoulder = { rz: e * 0.25, rx: e * 0.15 };
    pose.leftShoulder = { rz: -e * 0.25, rx: e * 0.15 };
    pose.headGroup = { rx: e * 0.1 };
    pose.mesh = { y: -e * 0.02 };
    return amplifyFace(pose);
  }
}

class Sigh extends AnimationBase {
  constructor(options = {}) {
    super('Sigh', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = t < 0.3 ? t / 0.3 : 1;
    const breathe = Math.sin(t * Math.PI) * 0.08;
    pose.rightShoulder = { rz: (e * 0.2) + breathe };
    pose.leftShoulder = { rz: -(e * 0.2) - breathe };
    pose.headGroup = { rx: e * 0.08 + breathe * 0.5 };
    pose.mesh = { y: -e * 0.015 };
    return amplifyFace(pose);
  }
}

class WipeForehead extends AnimationBase {
  constructor(options = {}) {
    super('WipeForehead', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 0;
    if (t < 0.25) e = t / 0.25;
    else if (t < 0.55) e = 1 - (t - 0.25) / 0.3;
    else if (t < 0.8) e = (t - 0.55) / 0.25;
    else e = 1 - (t - 0.8) / 0.2;
    pose.rightShoulder = { rz: e * 0.3, rx: -e * 0.85 };
    pose.rightElbow = { rz: e * 0.4 };
    pose.headGroup = { rx: e * 0.1 };
    return amplifyFace(pose);
  }
}

registerAnimation('FaceScared', FaceScared);
registerAnimation('FaceProud', FaceProud);
registerAnimation('FaceSad', FaceSad);
registerAnimation('FaceCry', FaceCry);
registerAnimation('FaceWorried', FaceWorried);
registerAnimation('FaceExcited', FaceExcited);
registerAnimation('FaceAngry', FaceAngry);
registerAnimation('FaceRelieved', FaceRelieved);

registerAnimation('ShowTears', ShowTears);
registerAnimation('HideTears', HideTears);
registerAnimation('Cry', Cry);
registerAnimation('HandsOnHips', HandsOnHips);
registerAnimation('ThumbsUp', ThumbsUp);
registerAnimation('Facepalm', Facepalm);
registerAnimation('ExcitedJump', ExcitedJump);
registerAnimation('JumpForJoy', JumpForJoy);
registerAnimation('ShakeHead', ShakeHead);
registerAnimation('Bow', Bow);
registerAnimation('SlumpShoulders', SlumpShoulders);
registerAnimation('Sigh', Sigh);
registerAnimation('WipeForehead', WipeForehead);
registerAnimation('FaceAmazed', FaceAmazed);
registerAnimation('FaceSmile', FaceSmile);
registerAnimation('FaceGrin', FaceGrin);
registerAnimation('FaceLaugh', FaceLaugh);
registerAnimation('FaceTired', FaceTired);
registerAnimation('FaceRelaxed', FaceRelaxed);

const universalFaceAnims = ['FaceHappy', 'FaceSurprised', 'FaceScared', 'FaceProud', 'FaceSad', 'FaceCry', 'FaceWorried', 'FaceExcited', 'FaceAngry', 'FaceRelieved', 'FaceAmazed', 'FaceSmile', 'FaceGrin', 'FaceLaugh', 'FaceTired', 'FaceRelaxed'];
const customBodyAnims = ['TakeOutFromPocket', 'DoorOpen', 'DoorClose', 'TakeCopter', 'TakeCopterOff', 'ShowTears', 'HideTears', 'Cry', 'HandsOnHips', 'ThumbsUp', 'Facepalm', 'ExcitedJump', 'JumpForJoy', 'ShakeHead', 'Bow', 'SlumpShoulders', 'Sigh', 'WipeForehead', 'DinoWagTail', 'DinoRoar', 'DinoWalk', 'BigDinoRun', 'BigDinoRoar'];

function addTearMeshes(character) {
  if (!character.headGroup || character.leftTear) return;
  const tearGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const tearMat = new THREE.MeshToonMaterial({ color: 0x88ccff, transparent: true, opacity: 0.85 });
  const positions = {
    Nobita: { left: [-0.12, -0.09, 0.34], right: [0.12, -0.09, 0.34] },
    Shizuka: { left: [-0.11, -0.08, 0.32], right: [0.11, -0.08, 0.32] },
    Doraemon: { left: [-0.18, 0.16, 0.67], right: [0.18, 0.16, 0.67] },
  };
  const pos = positions[character.name];
  if (!pos) return;
  const leftTear = new THREE.Mesh(tearGeo, tearMat);
  leftTear.position.set(...pos.left);
  leftTear.scale.set(1.0, 1.8, 0.8);
  leftTear.visible = false;
  leftTear.userData.baseY = pos.left[1];
  character.headGroup.add(leftTear);
  character.leftTear = leftTear;

  const rightTear = new THREE.Mesh(tearGeo, tearMat);
  rightTear.position.set(...pos.right);
  rightTear.scale.set(1.0, 1.8, 0.8);
  rightTear.visible = false;
  rightTear.userData.baseY = pos.right[1];
  character.headGroup.add(rightTear);
  character.rightTear = rightTear;
}

function addEyelidMeshes(character) {
  if (!character.headGroup || character.leftEyelid) return;
  const configs = {
    Nobita: { left: [-0.12, 0.04, 0.325], right: [0.12, 0.04, 0.325], len: 0.10 },
    Shizuka: { left: [-0.11, 0.04, 0.315], right: [0.11, 0.04, 0.315], len: 0.12 },
    Doraemon: { left: [-0.18, 0.35, 0.645], right: [0.18, 0.35, 0.645], len: 0.32 },
  };
  const cfg = configs[character.name];
  if (!cfg) return;
  const lidGeo = new THREE.CapsuleGeometry(0.003, cfg.len, 4, 8);
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

  const leftLid = new THREE.Mesh(lidGeo, lidMat);
  leftLid.position.set(...cfg.left);
  leftLid.rotation.z = Math.PI / 2;
  leftLid.visible = false;
  character.headGroup.add(leftLid);
  character.leftEyelid = leftLid;

  const rightLid = new THREE.Mesh(lidGeo, lidMat);
  rightLid.position.set(...cfg.right);
  rightLid.rotation.z = Math.PI / 2;
  rightLid.visible = false;
  character.headGroup.add(rightLid);
  character.rightEyelid = rightLid;
}

function createTakeCopterForCharacter(character) {
  const group = new THREE.Group();
  const isDoraemon = character.name === 'Doraemon';
  const headTopY = isDoraemon ? 0.72 : (character.name === 'Nobita' ? 0.38 : 0.36);
  group.position.y = headTopY;

  const yellowMat = new THREE.MeshToonMaterial({ color: 0xffd700 });
  const propMat = new THREE.MeshToonMaterial({ color: 0xdddddd });
  const bladeMat = new THREE.MeshToonMaterial({ color: 0xffcc33 });

  const baseRadius = isDoraemon ? 0.18 : 0.11;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(baseRadius, baseRadius, 0.025, 16), yellowMat);
  group.add(base);

  const shaftLen = isDoraemon ? 0.35 : 0.25;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, shaftLen, 8), propMat);
  shaft.position.y = shaftLen / 2 + 0.01;
  group.add(shaft);

  const bladeLen = isDoraemon ? 1.0 : 0.7;
  const bladeW = isDoraemon ? 0.22 : 0.16;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeLen, 0.012, bladeW), bladeMat);
    blade.position.y = shaftLen + 0.02;
    blade.rotation.y = (i / 3) * Math.PI * 2;
    group.add(blade);
  }

  const cap = new THREE.Mesh(new THREE.SphereGeometry(isDoraemon ? 0.035 : 0.025, 8, 8), yellowMat);
  cap.position.y = shaftLen + 0.04;
  group.add(cap);

  group.visible = false;
  return group;
}

function addTakeCopterIfMissing(character) {
  if (!character.headGroup || character.takeCopter) return;
  character.takeCopter = createTakeCopterForCharacter(character);
  character.headGroup.add(character.takeCopter);
  if (!character.attachTakeCopter) {
    character.attachTakeCopter = function () {
      if (this.takeCopter) this.takeCopter.visible = true;
    };
  }
  if (!character.detachTakeCopter) {
    character.detachTakeCopter = function () {
      if (this.takeCopter) this.takeCopter.visible = false;
    };
  }
}

import { CharacterRegistry } from 'dula-engine';
['Doraemon', 'Nobita', 'Shizuka'].forEach(name => {
  const CharClass = CharacterRegistry[name];
  if (!CharClass) return;
  const proto = CharClass.prototype;
  if (!proto._anywhereDoorPatched) {
    proto._anywhereDoorPatched = true;
    const origBuild = proto.build;
    proto.build = function () {
      origBuild.call(this);
      // Characters without an allowlist can play any animation by default.
      // If they already have one, extend it with our custom animations.
      const extraAnims = [...universalFaceAnims, ...customBodyAnims];
      if (this.allowedBodyAnimations) {
        const set = this.allowedBodyAnimations instanceof Set
          ? this.allowedBodyAnimations
          : new Set(this.allowedBodyAnimations);
        for (const a of extraAnims) set.add(a);
        this.allowedBodyAnimations = set;
      }

      // Capture Doraemon's neutral arm rotations so door animations can reset
      // the arms after TakeOutFromPocket leaves them in a stretched pose.
      if (this.name === 'Doraemon') {
        if (this.rightArm) this.rightArm.userData.neutralArmRot = this.rightArm.rotation.clone();
        if (this.leftArm) this.leftArm.userData.neutralArmRot = this.leftArm.rotation.clone();

        // Doraemon has no built-in eyebrows; add simple ones so the common
        // PoseMatrix face animations can raise/slant them.
        if (this.headGroup && !this.leftEyebrow) {
          const browGeo = new THREE.CapsuleGeometry(0.015, 0.12, 4, 8);
          const browMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
          const leftBrow = new THREE.Mesh(browGeo, browMat);
          leftBrow.position.set(-0.18, 0.52, 0.60);
          leftBrow.rotation.z = Math.PI / 2;
          this.headGroup.add(leftBrow);
          this.leftEyebrow = leftBrow;
          const rightBrow = new THREE.Mesh(browGeo, browMat);
          rightBrow.position.set(0.18, 0.52, 0.60);
          rightBrow.rotation.z = Math.PI / 2;
          this.headGroup.add(rightBrow);
          this.rightEyebrow = rightBrow;
        }
      }

      // All three main characters get reusable tear meshes for crying scenes.
      addTearMeshes(this);
      addEyelidMeshes(this);
      // Ensure everyone has a take-copter (Shizuka is missing one in dula-assets).
      addTakeCopterIfMissing(this);
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 暴露 AnywhereDoor 类，方便 scene 在加载后把门挂到场景里
// ─────────────────────────────────────────────────────────────────────────────
export { AnywhereDoor };
