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

    this.door = new AnywhereDoor();
    // Place the door to the side of the room so characters don't have to walk through the desk.
    this.door.group.position.set(2.5, 0, -3.5);
    this.door.group.rotation.y = Math.PI; // face into the room
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

    // Foreground small dinosaurs grazing near the ferns
    const foregroundHerd = [
      [5.5, 0, -6.5, 0x9acd32, 0.55], [-6, 0, -7, 0x6b8e23, 0.5],
      [7, 0, -5, 0x556b2f, 0.48], [-4.5, 0, -5.5, 0x8fbc8f, 0.52],
      [3.5, 0, -8.0, 0x8b4513, 0.45], [-2.0, 0, -9.0, 0xa0522d, 0.5],
      [8.5, 0, -7.5, 0xcd853f, 0.42], [-7.5, 0, -5.0, 0xd2691e, 0.47],
      [1.5, 0, -6.0, 0x556b2f, 0.44], [-8.5, 0, -8.5, 0x6b8e23, 0.49],
    ];
    for (const [dx, dy, dz, color, scale] of foregroundHerd) {
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
    const skinMat = new THREE.MeshToonMaterial({ color: 0xe67e22 });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0xf5cba7 });
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x111111 });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), skinMat);
    body.scale.set(1, 0.85, 1.3);
    body.position.y = 0.7;
    body.castShadow = true;
    this.mesh.add(body);

    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), bellyMat);
    belly.scale.set(0.8, 0.7, 1.0);
    belly.position.set(0, 0.6, 0.18);
    this.mesh.add(belly);

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.15, 0.7);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 20), skinMat);
    head.scale.set(1, 0.9, 1.1);
    head.castShadow = true;
    this.headGroup.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
    snout.position.set(0, -0.05, 0.32);
    snout.scale.set(1, 0.8, 1.2);
    this.headGroup.add(snout);

    // Eyes
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeWhiteMat);
    leftEye.position.set(-0.14, 0.1, 0.28);
    this.headGroup.add(leftEye);
    const rightEye = leftEye.clone();
    rightEye.position.set(0.14, 0.1, 0.28);
    this.headGroup.add(rightEye);

    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pupilMat);
    leftPupil.position.set(-0.14, 0.1, 0.34);
    this.headGroup.add(leftPupil);
    const rightPupil = leftPupil.clone();
    rightPupil.position.set(0.14, 0.1, 0.34);
    this.headGroup.add(rightPupil);

    // Mouth
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), pupilMat);
    this.mouth.position.set(0, -0.12, 0.42);
    this.mouth.scale.set(1.4, 0.4, 0.6);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = this.mouth.scale.x;
    this.mouthBaseScaleY = this.mouth.scale.y;
    this.mouthBaseScaleZ = this.mouth.scale.z;

    // Small crest
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 6), skinMat);
      spike.position.set(0, 0.35 + i * 0.06, -0.18 - i * 0.05);
      spike.rotation.x = -0.3;
      this.headGroup.add(spike);
    }

    this.mesh.add(this.headGroup);

    // Tail
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.75, -0.55);
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.18 - i * 0.03, 12, 12), skinMat);
      seg.position.set(0, 0, -i * 0.28);
      seg.scale.set(1, 0.8, 1.2);
      this.tail.add(seg);
    }
    this.mesh.add(this.tail);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.55, 12);
    const positions = [
      [-0.28, 0.28, 0.35], [0.28, 0.28, 0.35],
      [-0.28, 0.28, -0.35], [0.28, 0.28, -0.35],
    ];
    this.legs = [];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.mesh.add(leg);
      this.legs.push(leg);
    }

    // Tiny arms
    const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 0.85, 0.45);
    const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
    leftArmMesh.rotation.z = Math.PI / 3;
    leftArmMesh.position.y = -0.12;
    this.leftArm.add(leftArmMesh);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 0.85, 0.45);
    const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    rightArmMesh.rotation.z = -Math.PI / 3;
    rightArmMesh.position.y = -0.12;
    this.rightArm.add(rightArmMesh);
    this.mesh.add(this.rightArm);
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

    const skinMat = new THREE.MeshToonMaterial({ color: 0x8b4513 });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0xd2b48c });
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xfff8dc });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x220000 });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 28, 28), skinMat);
    body.scale.set(1.1, 1, 1.8);
    body.position.y = 1.6;
    body.castShadow = true;
    this.mesh.add(body);

    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 24), bellyMat);
    belly.scale.set(1, 0.8, 1.2);
    belly.position.set(0, 1.35, 0.25);
    this.mesh.add(belly);

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.6, 1.6);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 24), skinMat);
    head.scale.set(1, 0.9, 1.2);
    head.castShadow = true;
    this.headGroup.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 20), skinMat);
    snout.position.set(0, -0.15, 0.75);
    snout.scale.set(1, 0.85, 1.3);
    this.headGroup.add(snout);

    // Eyes
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), eyeWhiteMat);
    leftEye.position.set(-0.32, 0.25, 0.55);
    this.headGroup.add(leftEye);
    const rightEye = leftEye.clone();
    rightEye.position.set(0.32, 0.25, 0.55);
    this.headGroup.add(rightEye);

    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), pupilMat);
    leftPupil.position.set(-0.32, 0.25, 0.65);
    this.headGroup.add(leftPupil);
    const rightPupil = leftPupil.clone();
    rightPupil.position.set(0.32, 0.25, 0.65);
    this.headGroup.add(rightPupil);

    // Mouth
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), pupilMat);
    this.mouth.position.set(0, -0.35, 1.0);
    this.mouth.scale.set(1.6, 0.5, 0.8);
    this.headGroup.add(this.mouth);
    this.mouthBaseScaleX = this.mouth.scale.x;
    this.mouthBaseScaleY = this.mouth.scale.y;
    this.mouthBaseScaleZ = this.mouth.scale.z;

    // Teeth
    const toothMat = new THREE.MeshToonMaterial({ color: 0xffffee });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), toothMat);
        tooth.position.set(side * 0.25, -0.28, 0.95 + i * 0.12);
        tooth.rotation.x = side * 0.2;
        this.headGroup.add(tooth);
      }
    }

    // Crest
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6), skinMat);
      spike.position.set(0, 0.75 + i * 0.1, -0.4 - i * 0.08);
      spike.rotation.x = -0.35;
      this.headGroup.add(spike);
    }

    this.mesh.add(this.headGroup);

    // Tail
    this.tail = new THREE.Group();
    this.tail.position.set(0, 1.8, -1.2);
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.45 - i * 0.06, 14, 14), skinMat);
      seg.position.set(0, 0, -i * 0.55);
      seg.scale.set(1, 0.85, 1.3);
      this.tail.add(seg);
    }
    this.mesh.add(this.tail);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.35, 0.28, 1.3, 14);
    const positions = [
      [-0.75, 0.65, 0.8], [0.75, 0.65, 0.8],
      [-0.75, 0.65, -0.9], [0.75, 0.65, -0.9],
    ];
    this.legs = [];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.mesh.add(leg);
      this.legs.push(leg);
    }

    // Tiny arms
    const armGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.6, 10);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.9, 1.9, 1.1);
    const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
    leftArmMesh.rotation.z = Math.PI / 3;
    leftArmMesh.position.y = -0.25;
    this.leftArm.add(leftArmMesh);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.9, 1.9, 1.1);
    const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    rightArmMesh.rotation.z = -Math.PI / 3;
    rightArmMesh.position.y = -0.25;
    this.rightArm.add(rightArmMesh);
    this.mesh.add(this.rightArm);
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

registerAnimation('DinoWagTail', DinoWagTail);
registerAnimation('DinoRoar', DinoRoar);
registerAnimation('DinoWalk', DinoWalk);
registerAnimation('BigDinoRun', BigDinoRun);
registerAnimation('BigDinoRoar', BigDinoRoar);
registerAnimation('DoorOpen', DoorOpen);
registerAnimation('DoorClose', DoorClose);

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
const customBodyAnims = ['TakeOutFromPocket', 'DoorOpen', 'DoorClose', 'ShowTears', 'HideTears', 'Cry', 'HandsOnHips', 'ThumbsUp', 'Facepalm', 'ExcitedJump', 'JumpForJoy', 'ShakeHead', 'Bow', 'SlumpShoulders', 'Sigh', 'WipeForehead', 'DinoWagTail', 'DinoRoar', 'DinoWalk', 'BigDinoRun', 'BigDinoRoar'];

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
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 暴露 AnywhereDoor 类，方便 scene 在加载后把门挂到场景里
// ─────────────────────────────────────────────────────────────────────────────
export { AnywhereDoor };
