import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

/**
 * AutoTurret — 克洛斯公司 ceiling-mounted 自动炮塔
 *
 * 悬挂在地铁站台天花板，双管等离子机炮，红色独眼。
 * 受击时通过自定义后坐力动画反馈，不需要复杂骨骼。
 */
export class Turret extends CharacterBase {
  constructor(name) {
    super(name || 'AutoTurret');
    this.boundingRadius = 0.45;
    this.disableIdleMotion = true;
    this.disableIdle = true;
    this.archetypes = ['turret', 'floating'];
    this.allowedBodyAnimations = new Set([
      'Idle', 'FightingStance', 'PlasmaRifle', 'PlasmaRifleCharge',
      'HitStagger', 'Knockdown', 'GetUp'
    ]);
    this.baseY = 4.2;
    this._recoilEndTime = -1;
    this._muzzleFlashEndTime = -1;
  }

  build() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.5 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    this.mesh = new THREE.Group();
    this.mesh.name = this.name;
    this.userData = this.mesh.userData;

    // 天花板挂载座
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), darkMat);
    mount.rotation.x = Math.PI;
    mount.position.y = 0.35;
    this.mesh.add(mount);

    // 主体
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.55, 16), bodyMat);
    body.rotation.x = Math.PI;
    body.position.y = -0.05;
    this.mesh.add(body);

    // 红色独眼
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, -0.12, 0.24);
    this.mesh.add(eyeGroup);
    this.headGroup = eyeGroup;

    const eyeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), darkMat);
    eyeHousing.rotation.x = Math.PI / 2;
    eyeGroup.add(eyeHousing);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), glowMat);
    eye.position.z = 0.05;
    eyeGroup.add(eye);

    const eyeLight = new THREE.PointLight(0xff2200, 1.2, 4.0, 1.4);
    eyeLight.position.z = 0.12;
    eyeGroup.add(eyeLight);
    this.eyeMeshes = [eye];

    // 双管机炮
    this.barrels = [];
    this.muzzles = [];
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });
    for (const side of [-1, 1]) {
      const barrelGroup = new THREE.Group();
      barrelGroup.position.set(side * 0.14, -0.22, 0.18);
      this.mesh.add(barrelGroup);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 10), barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.2;
      barrelGroup.add(barrel);

      const muzzle = new THREE.Group();
      muzzle.position.set(0, 0, 0.52);
      barrelGroup.add(muzzle);
      this.muzzles.push(muzzle);

      const muzzleGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending })
      );
      muzzle.add(muzzleGlow);

      this.barrels.push(barrelGroup);
    }

    // 受击火花占位
    this._hitSpark = new THREE.PointLight(0xffaa00, 0, 3.0, 1.2);
    this._hitSpark.position.set(0, -0.1, 0.2);
    this.mesh.add(this._hitSpark);

    this._captureFaceBaseState();
  }

  playAnimation(AnimClass, startTime, duration, options = {}) {
    // 实例化一次以读取动画名
    let animName = '';
    try {
      const inst = new AnimClass(options);
      animName = inst.name || '';
    } catch (e) {
      animName = AnimClass.name || '';
    }

    if (animName === 'HitStagger' || animName === 'Knockdown' || animName === 'GetUp') {
      this._recoilEndTime = startTime + 0.35;
      this._hitSpark.intensity = 1.5;
      return;
    }

    if (animName === 'PlasmaRifle' || animName === 'PlasmaRifleCharge' || animName === 'SpiritGunFire') {
      this._muzzleFlashEndTime = startTime + 0.2;
      return;
    }

    // Idle / FightingStance 等无需处理
    if (animName.startsWith('Idle') || animName.startsWith('FightingStance')) {
      return;
    }

    // 兜底：走默认动画系统（一般不会用到）
    super.playAnimation(AnimClass, startTime, duration, options);
  }

  getPlasmaRifleMuzzleWorldPosition() {
    const muzzle = this.muzzles?.[0];
    if (muzzle) {
      muzzle.updateWorldMatrix(true, false);
      return new THREE.Vector3().setFromMatrixPosition(muzzle.matrixWorld);
    }
    const pos = new THREE.Vector3(0, -0.5, 0.5);
    pos.applyMatrix4(this.mesh.matrixWorld);
    return pos;
  }

  update(time, delta) {
    super.update(time, delta);

    // 后坐力：受击时短暂上仰
    if (this._recoilEndTime > time) {
      const t = 1 - (this._recoilEndTime - time) / 0.35;
      const kick = Math.sin(t * Math.PI) * 0.25;
      this.mesh.rotation.x = Math.PI - kick;
    } else {
      this.mesh.rotation.x = Math.PI;
      this._hitSpark.intensity = Math.max(0, this._hitSpark.intensity - delta * 4);
    }

    // 枪口焰
    if (this._muzzleFlashEndTime > time) {
      this.muzzles.forEach((m) => {
        m.children.forEach((c) => {
          if (c.material && c.material.transparent) c.material.opacity = 0.9;
        });
      });
    } else {
      this.muzzles.forEach((m) => {
        m.children.forEach((c) => {
          if (c.material && c.material.transparent) c.material.opacity = 0.15;
        });
      });
    }
  }
}
