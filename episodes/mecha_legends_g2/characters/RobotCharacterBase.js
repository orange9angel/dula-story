import * as THREE from 'three';
import { CharacterBase, AuraEffect } from 'dula-engine';

/**
 * RobotCharacterBase — 90 年代机械风机器人基类
 * 提供卡通渐变金属材质、黑色描边、机器人/载具双形态切换，
 * 以及一组机甲细节构建工具（散热栅、液压杆、装甲板、铆钉等）。
 */
export class RobotCharacterBase extends CharacterBase {
  createToonGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 8, 0);
    g.addColorStop(0, '#555');
    g.addColorStop(0.25, '#777');
    g.addColorStop(0.5, '#aaa');
    g.addColorStop(0.75, '#ccc');
    g.addColorStop(1, '#eee');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  addOutlines(root = this.mesh, color = 0x111111, threshold = 25) {
    // Much subtler outlines so models look like robots, not toy blocks
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 });
    root.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geomType = child.geometry.type;
      if (geomType === 'PlaneGeometry' || geomType === 'BufferGeometry') return;
      try {
        const edges = new THREE.EdgesGeometry(child.geometry, threshold);
        const line = new THREE.LineSegments(edges, lineMat);
        line.renderOrder = 1;
        line.scale.setScalar(1.005);
        child.add(line);
      } catch (e) {
        // ignore
      }
    });
  }

  createMetalMaterial(colorHex) {
    // Realistic brushed metal instead of cartoon toon shading
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.75,
      roughness: 0.35,
    });
  }

  createGlowMaterial(colorHex, opacity = 0.65) {
    return new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity });
  }

  createDarkMetalMaterial(colorHex = 0x333333) {
    return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.7 });
  }

  createBrushedMetalMaterial(colorHex) {
    // Slightly shinier metal for accent panels
    return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.85 });
  }

  setMode(mode) {
    this.currentMode = mode;
    if (this.robotGroup) this.robotGroup.visible = mode === 'robot';
    if (this.vehicleGroup) this.vehicleGroup.visible = mode === 'vehicle';
  }

  /**
   * 变形插值：0=机器人，1=载具
   */
  transform(progress) {
    const p = Math.max(0, Math.min(1, progress));
    if (!this.robotGroup || !this.vehicleGroup) return;

    this.robotGroup.visible = p < 1;
    this.vehicleGroup.visible = p > 0;

    if (p < 1) {
      this.robotGroup.scale.setScalar(1 - p * 0.3);
      this.robotGroup.position.y = p * -0.2;
      this.robotGroup.rotation.y = p * Math.PI * 0.25;
    }
    if (p > 0) {
      this.vehicleGroup.scale.setScalar(0.7 + p * 0.3);
      this.vehicleGroup.position.y = (1 - p) * 0.3;
      this.vehicleGroup.rotation.y = (1 - p) * Math.PI * 0.25;
    }

    this.transformProgress = p;

    if (this.transformAura) {
      const active = p > 0.05 && p < 0.95;
      this.transformAura.setActive(active);
      if (active) {
        const intensity = Math.sin(p * Math.PI) ** 0.7;
        const scale = 0.7 + 0.6 * intensity;
        this.transformAura.group.scale.setScalar(scale);
      } else {
        this.transformAura.group.scale.setScalar(1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 机甲细节构建工具
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * 在父级上添加一条凹槽/刻线，模拟装甲接缝。
   */
  addPanelLine(parent, position, size, rotation = { x: 0, y: 0, z: 0 }, color = 0x1a1a1a) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({ color })
    );
    line.position.set(position.x, position.y, position.z);
    line.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    parent.add(line);
    return line;
  }

  /**
   * 添加散热栅格。
   */
  addVents(parent, position, size, rotation = { x: 0, y: 0, z: 0 }, color = 0x111111, slats = 5) {
    const group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);
    group.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z * 0.3),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.5 })
    );
    group.add(frame);

    const slatH = size.y / (slats * 2 + 1);
    const slatMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    for (let i = 0; i < slats; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(size.x * 0.85, slatH * 0.7, size.z * 0.35),
        slatMat
      );
      slat.position.y = (i - (slats - 1) / 2) * slatH * 2;
      group.add(slat);
    }
    parent.add(group);
    return group;
  }

  /**
   * 添加铆钉/螺栓头。
   */
  addBolt(parent, position, radius = 0.015, color = 0x888888) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, radius * 0.6, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.9 })
    );
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(position.x, position.y, position.z);
    parent.add(bolt);
    return bolt;
  }

  /**
   * 添加机械球关节，用于肘部/膝盖，避免纯方块积木感。
   */
  addBallJoint(parent, position, radius = 0.06, color = 0x444444) {
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 14, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.85 })
    );
    joint.position.set(position.x, position.y, position.z);
    parent.add(joint);

    // joint seam ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.75, radius * 0.12, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.9 })
    );
    ring.position.set(position.x, position.y, position.z);
    ring.rotation.x = Math.PI / 2;
    parent.add(ring);
    return joint;
  }

  /**
   * 在一排位置添加铆钉线。
   */
  addBoltRow(parent, startPos, endPos, count = 4, radius = 0.012, color = 0x888888) {
    const group = new THREE.Group();
    const dx = (endPos.x - startPos.x) / (count - 1 || 1);
    const dy = (endPos.y - startPos.y) / (count - 1 || 1);
    const dz = (endPos.z - startPos.z) / (count - 1 || 1);
    for (let i = 0; i < count; i++) {
      this.addBolt(group, {
        x: startPos.x + dx * i,
        y: startPos.y + dy * i,
        z: startPos.z + dz * i,
      }, radius, color);
    }
    parent.add(group);
    return group;
  }

  /**
   * 添加液压杆/活塞关节。
   */
  addHydraulic(parent, topPos, bottomPos, radius = 0.035, color = 0x555555) {
    const group = new THREE.Group();
    const dx = bottomPos.x - topPos.x;
    const dy = bottomPos.y - topPos.y;
    const dz = bottomPos.z - topPos.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const midY = (topPos.y + bottomPos.y) / 2;

    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, len, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.7 })
    );
    cylinder.position.set((topPos.x + bottomPos.x) / 2, midY, (topPos.z + bottomPos.z) / 2);
    cylinder.lookAt(bottomPos.x, bottomPos.y, bottomPos.z);
    cylinder.rotateX(Math.PI / 2);
    group.add(cylinder);

    // piston rod
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, len * 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 })
    );
    rod.position.set((topPos.x + bottomPos.x) / 2, midY + len * 0.1, (topPos.z + bottomPos.z) / 2);
    rod.lookAt(bottomPos.x, bottomPos.y, bottomPos.z);
    rod.rotateX(Math.PI / 2);
    group.add(rod);

    parent.add(group);
    return group;
  }

  /**
   * 添加分指机械手。
   */
  addHandFingers(parent, color, darkColor, scale = 1.0) {
    const handGroup = new THREE.Group();
    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.13 * scale, 0.11 * scale, 0.12 * scale),
      this.createMetalMaterial(color)
    );
    handGroup.add(palm);

    const fingerMat = this.createDarkMetalMaterial(darkColor);
    for (let side of [-1, 0, 1]) {
      const finger = new THREE.Mesh(
        new THREE.BoxGeometry(0.028 * scale, 0.09 * scale, 0.03 * scale),
        fingerMat
      );
      finger.position.set(side * 0.035 * scale, -0.08 * scale, 0.02 * scale);
      handGroup.add(finger);

      const fingertip = new THREE.Mesh(
        new THREE.BoxGeometry(0.026 * scale, 0.05 * scale, 0.028 * scale),
        fingerMat
      );
      fingertip.position.set(side * 0.035 * scale, -0.14 * scale, 0.025 * scale);
      handGroup.add(fingertip);
    }
    // thumb
    const thumb = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 * scale, 0.07 * scale, 0.03 * scale),
      fingerMat
    );
    thumb.position.set(0.06 * scale, -0.06 * scale, 0.0);
    thumb.rotation.z = -0.5;
    handGroup.add(thumb);

    parent.add(handGroup);
    return handGroup;
  }

  /**
   * 添加发光胸甲核心。
   */
  addChestCore(parent, position, color = 0x00ffff, size = { x: 0.16, y: 0.12, z: 0.04 }) {
    const coreGroup = new THREE.Group();
    coreGroup.position.set(position.x, position.y, position.z);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 1.25, size.y * 1.25, size.z * 0.6),
      this.createDarkMetalMaterial(0x222222)
    );
    coreGroup.add(housing);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      this.createGlowMaterial(color, 0.9)
    );
    coreGroup.add(glow);

    const light = new THREE.PointLight(color, 1.2, 2.5, 1.5);
    light.position.z = size.z * 2;
    coreGroup.add(light);

    parent.add(coreGroup);
    return coreGroup;
  }

  /**
   * 添加肩部装甲。
   */
  addShoulderPad(parent, side, mainColor, accentColor, width = 0.32, height = 0.24, depth = 0.28) {
    const group = new THREE.Group();
    const mainMat = this.createMetalMaterial(mainColor);
    const accentMat = this.createMetalMaterial(accentColor);

    // Upper plate
    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(width, height * 0.5, depth),
      mainMat
    );
    topPlate.position.y = height * 0.25;
    group.add(topPlate);

    // Front angled plate
    const frontPlate = new THREE.Mesh(
      new THREE.BoxGeometry(width, height * 0.7, depth * 0.35),
      accentMat
    );
    frontPlate.position.set(0, 0, depth * 0.35);
    frontPlate.rotation.x = -0.25;
    group.add(frontPlate);

    // Side skirt
    const sidePlate = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.25, height * 0.6, depth * 0.7),
      mainMat
    );
    sidePlate.position.set(side * width * 0.42, -height * 0.05, 0);
    group.add(sidePlate);

    // Bolt detail
    this.addBolt(group, { x: side * width * 0.35, y: height * 0.35, z: depth * 0.55 }, 0.018, 0xaaaaaa);

    parent.add(group);
    return group;
  }

  /**
   * 添加膝部护甲。
   */
  addKneeGuard(parent, mainColor, accentColor, size = 0.18) {
    const group = new THREE.Group();
    const mainMat = this.createMetalMaterial(mainColor);
    const accentMat = this.createMetalMaterial(accentColor);

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(size, size * 0.85, size * 0.35),
      mainMat
    );
    group.add(plate);

    const center = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.5, size * 0.5, size * 0.4),
      accentMat
    );
    center.position.z = size * 0.05;
    group.add(center);

    this.addBolt(group, { x: -size * 0.3, y: size * 0.25, z: size * 0.2 }, 0.014, 0x888888);
    this.addBolt(group, { x: size * 0.3, y: size * 0.25, z: size * 0.2 }, 0.014, 0x888888);

    parent.add(group);
    return group;
  }

  /**
   * 添加肘部护甲。
   */
  addElbowGuard(parent, color, size = 0.13) {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.45, size * 0.55, size * 0.6, 8),
      this.createMetalMaterial(color)
    );
    plate.rotation.z = Math.PI / 2;
    parent.add(plate);
    return plate;
  }

  /**
   * 添加背部推进器/背包。
   */
  addBackpackThrusters(parent, mainColor, glowColor, count = 2) {
    const group = new THREE.Group();
    const mainMat = this.createMetalMaterial(mainColor);
    const glowMat = this.createGlowMaterial(glowColor);

    for (let i = 0; i < count; i++) {
      const side = i === 0 ? -1 : 1;
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.35, 12),
        mainMat
      );
      housing.rotation.x = Math.PI / 2;
      housing.position.set(side * 0.18, 0, -0.05);
      group.add(housing);

      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.08, 12),
        glowMat
      );
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 0.18, 0, -0.22);
      group.add(nozzle);

      const light = new THREE.PointLight(glowColor, 0.8, 2.0, 1.5);
      light.position.set(side * 0.18, 0, -0.3);
      group.add(light);
    }
    parent.add(group);
    return group;
  }

  /**
   * 添加轮胎纹理的圆柱（用于越野车/重卡元素）。
   */
  addTreadCylinder(parent, radius, length, position, rotation = { x: 0, y: 0, z: 0 }, color = 0x1a1a1a) {
    const group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);
    group.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);

    const tireMat = this.createDarkMetalMaterial(color);
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 18),
      tireMat
    );
    tire.rotation.z = Math.PI / 2;
    group.add(tire);

    // tread ridges
    const ridgeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const ridgeCount = Math.max(6, Math.floor(radius * 120));
    for (let i = 0; i < ridgeCount; i++) {
      const angle = (i / ridgeCount) * Math.PI * 2;
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(length * 0.9, 0.008, radius * 0.25),
        ridgeMat
      );
      ridge.position.set(0, Math.sin(angle) * radius * 0.98, Math.cos(angle) * radius * 0.98);
      ridge.rotation.x = angle;
      group.add(ridge);
    }

    parent.add(group);
    return group;
  }

  update(time, delta) {
    super.update(time, delta);
    this.updateLightEffects(time, delta);
    if (this.currentMode === 'robot' && this.robotGroup) {
      this.robotGroup.position.y = Math.sin(time * 2.5) * 0.005;
    }
  }
}
