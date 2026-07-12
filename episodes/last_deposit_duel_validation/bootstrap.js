/**
 * Last Deposit Duel Validation
 *
 * Independent 1v1 combat-validation episode using Last Deposit S2 characters.
 * Focus: readable weapon aim/fire poses, facial visibility, light effects,
 * weapon muzzle placement, SFX timing, state changes, and combat continuity.
 */

import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterRegistry,
  Storyboard,
  registerAnimation,
  registerCharacter,
  registerScene,
} from 'dula-engine';
import { SpiritGunFire } from '/node_modules/dula-assets/animations/yuyuhakusho/SpiritGunFire.js';
import { SpiritGunCharge } from '/node_modules/dula-assets/animations/yuyuhakusho/SpiritGunCharge.js';
import * as THREE from 'three';

import { TurboOne } from './characters/TurboOne.js';
import { GearShift } from './characters/GearShift.js';
import { SkyRazor } from './characters/SkyRazor.js';
import { Overdrive } from './characters/Overdrive.js';
import { CircuitBurn } from './characters/CircuitBurn.js';
import { Turret } from './characters/Turret.js';

import { PlasmaVaultScene } from './scenes/PlasmaVaultScene.js';
import { SubwayHubScene } from './scenes/SubwayHubScene.js';
import { UndergroundPipeScene } from './scenes/UndergroundPipeScene.js';
import { DuelArenaScene } from './scenes/DuelArenaScene.js';

import { CrouchPlasmaRifle } from './animations/CrouchPlasmaRifle.js';
import { ReadableAimRifle } from './animations/ReadableAimRifle.js';
import { ReadableFireRifle } from './animations/ReadableFireRifle.js';
import { RobotRevert } from './animations/RobotRevert.js';
import { RobotTransform } from './animations/RobotTransform.js';
import { VehicleDrive } from './animations/VehicleDrive.js';

import { registerS2CombatActions } from './combatActions.js';
import { MoodDirector } from './lib/MoodDirector.js';
import { ReadableCombatDirector } from './lib/ReadableCombatDirector.js';
import { attachStateMachine } from './lib/RobotStateMachine.js';
import { bindVoiceToMood } from './lib/VoiceExpressionBinder.js';

class Idle extends AnimationBase {
  constructor() {
    super('Idle', 1.0);
  }
}

class RobotSteadyWalk extends AnimationBase {
  constructor() {
    super('RobotSteadyWalk', 1.0);
  }

  update(t, character) {
    const cycle = Math.sin(t * Math.PI * 8);
    const counter = Math.sin(t * Math.PI * 8 + Math.PI);
    const lift = Math.abs(cycle) * 0.018;

    if (character.leftLeg) character.leftLeg.rotation.x = cycle * 0.18;
    if (character.rightLeg) character.rightLeg.rotation.x = counter * 0.18;
    if (character.leftKnee) character.leftKnee.rotation.x = Math.max(0, counter) * 0.22;
    if (character.rightKnee) character.rightKnee.rotation.x = Math.max(0, cycle) * 0.22;
    if (character.leftArm) character.leftArm.rotation.x = counter * 0.10;
    if (character.rightArm) character.rightArm.rotation.x = cycle * 0.10;
    if (character.headGroup) character.headGroup.rotation.x = Math.abs(cycle) * 0.015;
    if (character.baseY !== undefined) character.mesh.position.y = character.baseY + lift;
  }
}

class DuelOverdrive extends Overdrive {
  build() {
    super.build();
    this._installShoulderCannon();
  }

  _installShoulderCannon() {
    if (!this.robotGroup || this.plasmaRifleGroup) return;

    const cannon = new THREE.Group();
    cannon.name = 'VickShoulderCannon';
    cannon.position.set(0.42, 2.1, 0.18);
    cannon.rotation.set(-0.08, -0.08, -0.12);
    this.robotGroup.add(cannon);

    const bodyMat = this.createMetalMaterial(0x32113f);
    const darkMat = this.createDarkMetalMaterial(0x101018);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff3344,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), bodyMat);
    mount.castShadow = true;
    cannon.add(mount);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.78, 14), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.42);
    barrel.castShadow = true;
    cannon.add(barrel);

    const sideCell = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.34), glowMat.clone());
    sideCell.position.set(-0.08, 0.03, 0.2);
    cannon.add(sideCell);

    const muzzle = new THREE.Group();
    muzzle.position.set(0, 0.01, 0.86);
    cannon.add(muzzle);

    const muzzleCore = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), glowMat.clone());
    muzzle.add(muzzleCore);

    const muzzleLight = new THREE.PointLight(0xff3344, 1.4, 5, 1.8);
    muzzle.add(muzzleLight);

    cannon.visible = false;
    this.plasmaRifleGroup = cannon;
    this.plasmaRifleMuzzle = muzzle;
  }
}

registerAll();
registerS2CombatActions();

registerCharacter('雷恩', TurboOne);
registerCharacter('布洛克', GearShift);
registerCharacter('斯凯', SkyRazor);
registerCharacter('维克', DuelOverdrive);
registerCharacter('达什', CircuitBurn);
registerCharacter('炮塔-左', Turret);
registerCharacter('炮塔-右', Turret);

registerScene('PlasmaVaultScene', PlasmaVaultScene);
registerScene('SubwayHubScene', SubwayHubScene);
registerScene('UndergroundPipeScene', UndergroundPipeScene);
registerScene('DuelArenaScene', DuelArenaScene);

registerAnimation('CrouchPlasmaRifle', CrouchPlasmaRifle);
registerAnimation('ReadableAimRifle', ReadableAimRifle);
registerAnimation('ReadableFireRifle', ReadableFireRifle);
registerAnimation('RobotRevert', RobotRevert);
registerAnimation('RobotTransform', RobotTransform);
registerAnimation('VehicleDrive', VehicleDrive);
registerAnimation('Idle', Idle);
registerAnimation('RobotSteadyWalk', RobotSteadyWalk);
registerAnimation('PlasmaRifle', SpiritGunFire);
registerAnimation('PlasmaRifleCharge', SpiritGunCharge);

const moodDirectorByStoryboard = new WeakMap();

function getMoodDirector(storyboard) {
  if (!moodDirectorByStoryboard.has(storyboard)) {
    moodDirectorByStoryboard.set(storyboard, new MoodDirector(storyboard));
  }
  return moodDirectorByStoryboard.get(storyboard);
}

function installValidationRuntime() {
  if (Storyboard.prototype.__lastDepositDuelValidationInstalled) return;
  Storyboard.prototype.__lastDepositDuelValidationInstalled = true;

  const originalSwitchScene = Storyboard.prototype.switchScene;
  Storyboard.prototype.switchScene = function (...args) {
    const result = originalSwitchScene.apply(this, args);
    const md = getMoodDirector(this);
    const scene = this.currentScene && (this.currentScene.scene || this.currentScene);
    if (scene) md.bindScene(scene);
    return result;
  };

  const originalLoad = Storyboard.prototype.load;
  Storyboard.prototype.load = async function (...args) {
    const result = await originalLoad.apply(this, args);
    const md = getMoodDirector(this);

    this._moodEvents = [];
    this._alertEvents = [];
    this._stateEvents = [];
    this._readableCombatDirector = new ReadableCombatDirector(this);

    for (const ev of this.storyEvents || []) {
      const evName = String(ev.name || ev.type || '').toLowerCase();
      if (evName === 'moodtransition') {
        this._moodEvents.push({
          startTime: ev.startTime,
          to: ev.options.to,
          duration: parseFloat(ev.options.duration) || 0.6,
        });
      }
      if (evName === 'setalert') {
        this._alertEvents.push({
          startTime: ev.startTime,
          level: parseInt(ev.options.level, 10) || 0,
        });
      }
      if (evName === 'damage') {
        this._stateEvents.push({
          startTime: ev.startTime,
          type: 'damage',
          character: ev.options.character,
          amount: parseFloat(ev.options.amount) || 20,
        });
      }
      if (evName === 'overdrive') {
        this._stateEvents.push({
          startTime: ev.startTime,
          type: 'overdrive',
          character: ev.options.character,
        });
      }
      if (evName === 'readableshot' || evName === 'readablemelee') {
        this._readableCombatDirector.addEvent(ev);
      }
    }

    bindVoiceToMood(this, md);
    window.__dulaStoryboard = this;

    for (const [name, char] of this.characters) {
      if (!char._moodSystemBound) {
        char._moodSystemBound = true;
        attachStateMachine(char);
      }
      md.bindCharacter(name, char);
    }

    return result;
  };

  const originalUpdate = Storyboard.prototype.update;
  Storyboard.prototype.update = function (time, delta) {
    this._currentTime = time;

    const md = getMoodDirector(this);
    md.update(time, delta);

    for (const ev of this._moodEvents || []) {
      if (!ev._triggered && time >= ev.startTime) {
        ev._triggered = true;
        md.setMood(ev.to, { duration: ev.duration });
      }
    }

    for (const ev of this._alertEvents || []) {
      if (!ev._triggered && time >= ev.startTime) {
        ev._triggered = true;
        this.currentScene?.setAlertLevel?.(ev.level);
      }
    }

    for (const ev of this._stateEvents || []) {
      if (!ev._triggered && time >= ev.startTime) {
        ev._triggered = true;
        const char = this.characters.get(ev.character);
        if (char?.stateMachine) {
          if (ev.type === 'damage') char.stateMachine.takeDamage(ev.amount);
          if (ev.type === 'overdrive') char.stateMachine.boostEnergy(100);
        }
      }
    }

    for (const char of this.characters.values()) {
      char.stateMachine?.update(time, delta);
      if (md.currentMood?.name) char.stateMachine?.syncWithMood?.(md.currentMood.name);
    }

    this._readableCombatDirector?.update(time, delta);
    return originalUpdate.call(this, time, delta);
  };
}

installValidationRuntime();

for (const name of ['雷恩', '布洛克', '斯凯', '维克', '达什']) {
  const Class = CharacterRegistry[name];
  if (!Class) continue;
  const originalBuild = Class.prototype.build;
  Class.prototype.build = function () {
    originalBuild.call(this);
    if (this.headGroup && !this._validationFaceFillLight) {
      this._validationFaceFillLight = new THREE.PointLight(0xddeeff, 0.65, 4, 2);
      this._validationFaceFillLight.position.set(0, 0.1, 0.62);
      this.headGroup.add(this._validationFaceFillLight);
    }
  };
}
