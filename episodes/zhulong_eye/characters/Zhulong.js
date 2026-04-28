import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

export class Zhulong extends CharacterBase {
  constructor() {
    super('Zhulong');
  }

  build() {
    // Dark red material for body (almost black, blends into darkness)
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x2a0808 });
    const headMat = new THREE.MeshToonMaterial({ color: 0x3a0a0a });

    // Eye material - emissive controlled for glow effect
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0x110000,
      emissive: 0xff2200,
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.1,
    });

    const mouthMat = new THREE.MeshToonMaterial({ color: 0x1a0505 });

    // Serpentine body made of several capsule segments in an S-curve
    const segmentCount = 5;
    for (let i = 0; i < segmentCount; i++) {
      const radius = 1.2 - i * 0.15;
      const length = 2.5;
      const geo = new THREE.CapsuleGeometry(radius, length, 4, 8);
      const mesh = new THREE.Mesh(geo, bodyMat);

      const angle = (i / segmentCount) * Math.PI * 0.8;
      mesh.position.set(
        Math.sin(angle) * 2,
        i * 1.8,
        Math.cos(angle) * 1.5 - 3
      );
      mesh.rotation.z = Math.sin(angle) * 0.3;
      mesh.rotation.x = 0.2;
      mesh.castShadow = true;
      this.mesh.add(mesh);
    }

    // Head group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, segmentCount * 1.8 + 1, -3);

    // Head sphere (simplified human-like face)
    const headGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Eyes - large, vertical-slit pupils suggested by stretched spheres
    const eyeGeo = new THREE.SphereGeometry(0.5, 32, 32);

    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.leftEye.position.set(-0.6, 0.3, 1.1);
    this.leftEye.scale.set(1, 1.3, 0.6);
    this.headGroup.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.rightEye.position.set(0.6, 0.3, 1.1);
    this.rightEye.scale.set(1, 1.3, 0.6);
    this.headGroup.add(this.rightEye);

    // Point lights for the eye glow that illuminates surroundings
    this.leftEyeLight = new THREE.PointLight(0xff3300, 0, 80);
    this.leftEyeLight.position.set(-0.6, 0.3, 1.5);
    this.headGroup.add(this.leftEyeLight);

    this.rightEyeLight = new THREE.PointLight(0xff3300, 0, 80);
    this.rightEyeLight.position.set(0.6, 0.3, 1.5);
    this.headGroup.add(this.rightEyeLight);

    // Rim light from above to define the head silhouette against the sky
    this.rimLight = new THREE.PointLight(0xff1100, 0, 30);
    this.rimLight.position.set(0, 2.5, -1);
    this.headGroup.add(this.rimLight);

    // Mouth (closed, solemn)
    const mouthGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.5, 1.2);
    mouth.scale.set(1.6, 0.25, 0.5);
    this.headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;

    this.mesh.add(this.headGroup);

    // Scale up the whole being to feel monumental
    this.mesh.scale.set(1.5, 1.5, 1.5);
    this.mesh.position.set(0, 4, -18);
  }

  /**
   * Control eye glow progress (0 = closed/dark, 1 = fully open/blazing)
   */
  setEyeGlow(progress) {
    const p = Math.max(0, Math.min(1, progress));

    // Emissive intensity ramps from 0 to 10
    this.eyeMat.emissiveIntensity = p * 10;

    // Point lights ramp from 0 to 400 (stronger to cut through fog)
    this.leftEyeLight.intensity = p * 400;
    this.rightEyeLight.intensity = p * 400;

    // Rim light ramps with eyes
    this.rimLight.intensity = p * 80;

    // Slight dilation - eyes appear to "open" wider
    const scaleZ = 0.6 + p * 0.4;
    this.leftEye.scale.z = scaleZ;
    this.rightEye.scale.z = scaleZ;

    // Subtle brightening of head material to show reflected light
    if (this.headGroup && this.headGroup.children[0]) {
      const headMesh = this.headGroup.children[0];
      const baseColor = new THREE.Color(0x3a0a0a);
      const litColor = new THREE.Color(0x5a1a1a);
      headMesh.material.color.lerpColors(baseColor, litColor, p * 0.3);
    }
  }
}
