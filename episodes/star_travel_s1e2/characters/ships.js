import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

// ═════════════════════════════════════════════════════════════════════════════
// Shared GLB-based ship utilities
// ═════════════════════════════════════════════════════════════════════════════

function createGlowMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function getPreloadedModel(key) {
  const models = (typeof window !== 'undefined' && window.__dulaShipModels) || {};
  const model = models[key];
  if (!model) {
    console.warn(`[ships.js] Pre-loaded model "${key}" not found. Falling back to empty group.`);
    return new THREE.Group();
  }
  return model;
}

function prepareModel(model, options = {}) {
  const clone = model.clone();

  // Apply any requested re-orientation before we compute bounds.
  if (options.rotationY) {
    clone.rotation.y = options.rotationY;
  }
  clone.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Wrap the model in a hull group and shift geometry so its bounding-box
  // centre is at the local origin. This makes scaling/steering predictable.
  const hull = new THREE.Group();
  clone.position.sub(center);
  hull.add(clone);

  // Normalise scale so the ship's longest axis is roughly targetLength units.
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetLength = options.targetLength ?? 2.0;
  const scale = targetLength / maxDim;
  hull.scale.setScalar(scale);

  return {
    hull,
    size,
    scale,
    halfLength: (size.z * scale) / 2,
    halfWidth: (size.x * scale) / 2,
    halfHeight: (size.y * scale) / 2,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Base class for GLB spaceships
//
// Subclasses must define:
//   static modelKey      - key in window.__dulaShipModels
//   static shipOptions   - { targetLength, glowColor, rotationY }
// ═════════════════════════════════════════════════════════════════════════════

class GLBShipCharacter extends CharacterBase {
  constructor(name) {
    super(name);
  }

  build() {
    const modelKey = this.constructor.modelKey;
    const shipOptions = this.constructor.shipOptions || {};

    const model = getPreloadedModel(modelKey);
    const { hull, scale, halfLength, halfWidth, halfHeight } = prepareModel(model, shipOptions);

    this.mesh.add(hull);
    this.hull = hull;
    this.halfLength = halfLength;
    this.halfWidth = halfWidth;
    this.halfHeight = halfHeight;

    // Make sure every mesh casts/receives shadows.
    hull.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.boundingRadius = Math.max(halfWidth, halfLength) * 1.1;
    this.baseY = 0;

    // Add engine glow / trail at the rear of the ship.
    const glowColor = shipOptions.glowColor ?? 0x66aaff;
    const rearZ = -halfLength - 0.02;
    const glowRadius = Math.min(halfHeight, halfWidth) * 0.5;

    this.engineGlows = [];
    this.engineTrails = [];
    this.wingTips = [];

    const glow = new THREE.Mesh(new THREE.CircleGeometry(glowRadius, 18), createGlowMaterial(glowColor));
    glow.rotation.y = Math.PI;
    glow.position.set(0, 0, rearZ);
    this.mesh.add(glow);
    this.engineGlows.push(glow);

    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(glowRadius * 0.7, halfLength * 0.6, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    trail.rotation.x = -Math.PI / 2;
    trail.position.set(0, 0, rearZ - halfLength * 0.35);
    this.mesh.add(trail);
    this.engineTrails.push(trail);

    const engineLight = new THREE.PointLight(glowColor, 1.4, 5);
    engineLight.position.set(0, 0, rearZ - 0.1);
    this.mesh.add(engineLight);

    // Small navigation lights near the wingtips.
    if (halfWidth > 0.25) {
      for (const side of [-1, 1]) {
        const tipColor = side > 0 ? 0x33ff33 : 0xff3333;
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(glowRadius * 0.25, 8, 8),
          createGlowMaterial(tipColor)
        );
        tip.position.set(side * halfWidth * 0.85, 0, rearZ + halfLength * 0.15);
        this.mesh.add(tip);
        this.wingTips.push(tip);
      }
    }
  }

  // Ships should sit exactly at the requested y, not 12 cm above it.
  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
    this.baseY = y;
    if (this._actionMatrix) {
      this._actionMatrix.teleportBaselineToCurrent();
    }
  }

  getForward() {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize();
  }

  getMuzzlePosition(side = 1) {
    const forward = this.getForward();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).normalize();
    return this.mesh.position
      .clone()
      .add(forward.multiplyScalar(this.halfLength ?? 1.0))
      .add(right.multiplyScalar(side * (this.halfWidth ?? 0.5)))
      .add(new THREE.Vector3(0, (this.halfHeight ?? 0.25) * 0.2, 0));
  }

  flashHit(duration = 0.2) {
    this._hitFlashEnd = (this._hitFlashEnd || 0) + duration;
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.userData.baseEmissive = child.material.emissive.clone();
        child.userData.baseEmissiveIntensity = child.material.emissiveIntensity;
        child.material.emissive.setHex(0xff3300);
        child.material.emissiveIntensity = 1.5;
      }
    });
  }

  update(time, delta) {
    super.update(time, delta);

    const pulse = 0.7 + Math.sin(time * 8) * 0.25;
    for (const glow of this.engineGlows) {
      if (glow.material) glow.material.opacity = pulse;
    }
    for (const trail of this.engineTrails) {
      if (trail.material) {
        trail.material.opacity = 0.25 + Math.sin(time * 10 + (trail.position.x || 0)) * 0.1;
        trail.scale.setScalar(0.9 + Math.sin(time * 14 + (trail.position.x || 0)) * 0.12);
      }
    }
    for (const tip of this.wingTips) {
      if (tip.material) tip.material.opacity = 0.6 + Math.sin(time * 6 + (tip.position.x || 0)) * 0.3;
    }

    if (this._hitFlashEnd > 0 && time > this._hitFlashEnd) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.userData.baseEmissive) {
          child.material.emissive.copy(child.userData.baseEmissive);
          child.material.emissiveIntensity = child.userData.baseEmissiveIntensity ?? 1;
          child.userData.baseEmissive = null;
          child.userData.baseEmissiveIntensity = null;
        }
      });
      this._hitFlashEnd = 0;
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PurpleShip — 紫晶号（GLB 战斗侦察舰）
// ═════════════════════════════════════════════════════════════════════════════

export class PurpleShip extends GLBShipCharacter {
  static modelKey = 'purple';
  static shipOptions = {
    targetLength: 2.2,
    glowColor: 0x66aaff,
  };

  constructor() {
    super('PurpleShip');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MonkeyShip — 猿星号（GLB 圆胖侦察舰）
// The downloaded model points nose-first along -Z, so rotate 180° to align +Z.
// ═════════════════════════════════════════════════════════════════════════════

export class MonkeyShip extends GLBShipCharacter {
  static modelKey = 'monkey';
  static shipOptions = {
    targetLength: 1.9,
    glowColor: 0xffaa33,
    rotationY: Math.PI,
  };

  constructor() {
    super('MonkeyShip');
  }
}
