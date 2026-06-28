import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

/**
 * ToonCharacterBase — 为角色提供卡通渐变贴图的基类
 */
export class ToonCharacterBase extends CharacterBase {
  createToonGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 4, 0);
    g.addColorStop(0, '#888');
    g.addColorStop(0.4, '#aaa');
    g.addColorStop(0.7, '#d0d0d0');
    g.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }
}
