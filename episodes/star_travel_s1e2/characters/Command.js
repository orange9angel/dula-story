import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

/**
 * Command — 基地指挥部（仅音频）
 * 没有可见形体，只作为无线电通讯的说话角色。
 */
export class Command extends CharacterBase {
  constructor() {
    super('Command');
    this.archetypes = ['audio'];
    this.boundingRadius = 0.1;
    this.baseY = 0;
    this.allowedBodyAnimations = null;
  }

  build() {
    // 不可见的占位 mesh
    this.mesh = new THREE.Group();
    this.mesh.name = 'Command';
    return this.mesh;
  }

  update() {
    // 无视觉更新
  }
}

export default Command;
