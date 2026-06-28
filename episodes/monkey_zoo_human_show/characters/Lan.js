import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

export default class Lan extends CharacterBase {
  build() {
    super.build();
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x552222, roughness: 0.6 });
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), mouthMat);
    this.mouth.position.set(0, -0.11, 0.2);
    this.mouth.scale.set(1.35, 0.6, 0.8);
    this.mouthBaseScaleX = 1.35;
    this.mouthBaseScaleY = 0.6;
    this.mouthBaseScaleZ = 0.8;
  }
}
