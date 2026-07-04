import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';
import { createViperDrone, updateViperDrone } from './BoneWaspFighter.js';

/** 克洛斯公司 Viper 无人战机。 */
export class Drone extends CharacterBase {
  constructor(name) {
    super(name || 'Viper');
    this.boundingRadius = 1.1;
    this.archetypes = ['fighter', 'floating', 'vehicle'];
    this.allowedBodyAnimations = new Set([
      'Idle', 'PlasmaRifle', 'PlasmaRifleCharge', 'SpiritGunFire', 'SpiritGunCharge',
      'FightingStance', 'HitStagger', 'Knockdown',
    ]);
  }

  build() {
    this.mesh = createViperDrone({ searchBeam: true });
    this.mesh.name = this.name;
    this.rightArm = this.mesh.userData.weaponMount;
    this.muzzleGroup = this.mesh.userData.muzzle;
    this.weaponBeam = this.mesh.userData.weaponBeam;
    this.muzzleLight = this.mesh.userData.muzzleLight;
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.08, 0.82);
    this.mesh.add(this.headGroup);
    this._plasmaIntensity = 0;
    this._plasmaBeamExtend = 0;
  }

  showPlasmaMuzzle() {
    if (this.muzzleGroup) this.muzzleGroup.visible = true;
  }

  hidePlasmaMuzzle() {
    if (this.muzzleGroup) this.muzzleGroup.visible = false;
    if (this.muzzleLight) this.muzzleLight.intensity = 0;
  }

  showPlasmaBeam() {
    if (this.weaponBeam) this.weaponBeam.visible = true;
  }

  hidePlasmaBeam() {
    if (this.weaponBeam) this.weaponBeam.visible = false;
  }

  setPlasmaIntensity(value) {
    this._plasmaIntensity = THREE.MathUtils.clamp(value, 0, 1);
    if (!this.muzzleGroup) return;
    const scale = 0.55 + this._plasmaIntensity * 1.65;
    this.muzzleGroup.scale.setScalar(scale);
    this.mesh.userData.muzzleHalo.material.opacity = 0.12 + this._plasmaIntensity * 0.48;
    this.muzzleLight.intensity = this._plasmaIntensity * 8;
  }

  setPlasmaBeamExtend(value) {
    this._plasmaBeamExtend = THREE.MathUtils.clamp(value, 0, 1);
    if (this.weaponBeam) this.weaponBeam.scale.z = Math.max(0.001, this._plasmaBeamExtend);
  }

  getPlasmaRifleMuzzleWorldPosition() {
    const pos = new THREE.Vector3();
    const source = this.muzzleGroup || this.rightArm || this.mesh;
    source.updateWorldMatrix(true, false);
    source.getWorldPosition(pos);
    return pos;
  }

  getPlasmaBeamVolume() {
    if (!this.weaponBeam?.visible) return null;
    this.weaponBeam.updateWorldMatrix(true, false);
    const extend = Math.max(0.01, this._plasmaBeamExtend || 1);
    const start = new THREE.Vector3(0, 0, 0).applyMatrix4(this.weaponBeam.matrixWorld);
    const end = new THREE.Vector3(0, 0, 18 * extend).applyMatrix4(this.weaponBeam.matrixWorld);
    return {
      type: 'capsule',
      source: 'ViperPlasmaBeam',
      start,
      end,
      radius: 0.18,
      length: start.distanceTo(end),
    };
  }

  update(time, delta) {
    super.update(time, delta);
    if (!this.mesh) return;
    const seed = this.name.codePointAt(this.name.length - 1) || 0;
    this.mesh.position.y = this.baseY + Math.sin(time * 2.2 + seed) * 0.10;
    this.mesh.rotation.z = Math.sin(time * 1.35 + seed) * 0.055;
    this.mesh.rotation.x = 0.04 + Math.sin(time * 0.8 + seed) * 0.025;
    updateViperDrone(this.mesh, time, seed);
  }
}
