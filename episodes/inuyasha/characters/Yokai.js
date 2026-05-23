import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

export class Yokai extends CharacterBase {
  constructor() {
    super('Yokai');
    this.boundingRadius = 0.7;
  }

  build() {
    const toonGradient = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 4, 0);
      g.addColorStop(0, '#555');
      g.addColorStop(0.45, '#888');
      g.addColorStop(0.75, '#bbb');
      g.addColorStop(1, '#eee');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 1);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    })();

    const bodyMat = new THREE.MeshToonMaterial({
      color: 0x2b1c34,
      gradientMap: toonGradient,
      emissive: 0x120018,
      emissiveIntensity: 0.18,
    });
    const bellyMat = new THREE.MeshToonMaterial({ color: 0x443152, gradientMap: toonGradient });
    const hornMat = new THREE.MeshToonMaterial({ color: 0xd8d0b8, gradientMap: toonGradient });
    const clawMat = new THREE.MeshToonMaterial({ color: 0xe8e2c8, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a66 });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x150014 });
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x8a3cff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 22), bodyMat);
    torso.position.y = 0.98;
    torso.scale.set(1.08, 1.35, 0.78);
    torso.castShadow = true;
    this.mesh.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 18), bellyMat);
    belly.position.set(0, 0.9, 0.29);
    belly.scale.set(1.05, 1.2, 0.35);
    this.mesh.add(belly);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.63;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 22), bodyMat);
    head.scale.set(1, 0.92, 0.88);
    head.castShadow = true;
    headGroup.add(head);

    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 7), hornMat);
      horn.position.set(side * 0.18, 0.28, -0.04);
      horn.rotation.z = side * -0.35;
      horn.rotation.x = 0.25;
      headGroup.add(horn);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), eyeMat);
      eye.position.set(side * 0.115, 0.04, 0.28);
      eye.scale.set(1.35, 0.72, 0.38);
      eye.userData.baseX = eye.position.x;
      if (side === -1) this.leftPupil = eye;
      else this.rightPupil = eye;
      headGroup.add(eye);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.016), bodyMat);
      brow.position.set(side * 0.11, 0.12, 0.26);
      brow.rotation.z = side * -0.35;
      headGroup.add(brow);
    }

    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), mouthMat);
    mouth.position.set(0, -0.11, 0.29);
    mouth.scale.set(1.4, 0.38, 0.28);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;

    const fangSpecs = [
      [-0.045, -0.15, 0.31],
      [0.045, -0.15, 0.31],
    ];
    for (const [x, y, z] of fangSpecs) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.075, 6), hornMat);
      fang.position.set(x, y, z);
      fang.rotation.x = Math.PI;
      headGroup.add(fang);
    }

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    const addArm = (side) => {
      const group = new THREE.Group();
      group.position.set(side * 0.4, 1.2, 0.02);
      group.rotation.z = side * -0.5;
      group.rotation.x = -0.25;

      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.48, 5, 14), bodyMat);
      arm.position.y = -0.28;
      group.add(arm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), bodyMat);
      hand.position.y = -0.58;
      group.add(hand);

      for (let i = 0; i < 3; i++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 5), clawMat);
        claw.position.set((i - 1) * 0.032, -0.66, 0.025);
        claw.rotation.x = Math.PI;
        group.add(claw);
      }

      this.mesh.add(group);
      if (side === 1) {
        this.rightArm = group;
        this.rightArmBaseZ = group.rotation.z;
      } else {
        this.leftArm = group;
        this.leftArmBaseZ = group.rotation.z;
      }
    };

    addArm(-1);
    addArm(1);

    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.18, 0.56, 0);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 5, 12), bodyMat);
      leg.position.y = -0.2;
      legGroup.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bodyMat);
      foot.position.set(0, -0.4, 0.08);
      foot.scale.set(1, 0.45, 1.55);
      legGroup.add(foot);
      this.mesh.add(legGroup);
    }

    this.aura = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 20), auraMat);
    this.aura.position.y = 1.15;
    this.aura.scale.set(1.2, 1.45, 0.9);
    this.mesh.add(this.aura);
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.headGroup) {
      this.headGroup.position.y = 1.63 + Math.sin(time * 2.2) * 0.035;
    }
    if (this.leftArm) {
      this.leftArm.rotation.z = this.leftArmBaseZ + Math.sin(time * 3.5) * 0.12;
      this.leftArm.rotation.x = -0.25 + Math.sin(time * 2.1) * 0.08;
    }
    if (this.rightArm) {
      this.rightArm.rotation.z = this.rightArmBaseZ + Math.sin(time * 3.5 + Math.PI) * 0.12;
      this.rightArm.rotation.x = -0.25 + Math.sin(time * 2.1 + Math.PI) * 0.08;
    }
    if (this.aura) {
      this.aura.material.opacity = 0.1 + Math.sin(time * 4) * 0.05;
      this.aura.scale.set(
        1.2 + Math.sin(time * 2.8) * 0.08,
        1.45 + Math.sin(time * 2.1) * 0.1,
        0.9 + Math.cos(time * 2.4) * 0.06
      );
    }
  }
}
