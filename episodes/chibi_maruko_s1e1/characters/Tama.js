import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * Tama — 小玉（小丸子的好朋友）
 * 双马尾、粉色连衣裙、圆脸
 */
export class Tama extends ToonCharacterBase {
  constructor(name) {
    super(name || 'Tama');
    this.boundingRadius = 0.34;
    this.archetypes = ['humanoid', 'child', 'casual'];
    this.trustedBodyAnimations = [
      'Walk', 'Run', 'Idle', 'LookAround',
      'WaveHand', 'Nod', 'ShakeHead', 'PointForward',
      'Jump', 'CrossArms', 'FaceHappy', 'FaceSad'
    ];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const toonGradient = this.createToonGradient();

    const skinMat = new THREE.MeshToonMaterial({ color: 0xffdfc4, gradientMap: toonGradient });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x5c4033, gradientMap: toonGradient });
    const dressMat = new THREE.MeshToonMaterial({ color: 0xf48fb1, gradientMap: toonGradient });
    const sockMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
    const shoeMat = new THREE.MeshToonMaterial({ color: 0x5d4037, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffaaaa, transparent: true, opacity: 0.5 });

    const root = new THREE.Group();

    // 头
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 16), skinMat);
    head.position.y = 1.14;
    root.add(head);

    // 头发主体
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
    hair.position.y = 1.17;
    hair.rotation.x = Math.PI;
    root.add(hair);

    // 双马尾
    const tailGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const leftTail = new THREE.Mesh(tailGeo, hairMat);
    leftTail.position.set(-0.32, 1.12, -0.05);
    root.add(leftTail);
    const rightTail = new THREE.Mesh(tailGeo, hairMat);
    rightTail.position.set(0.32, 1.12, -0.05);
    root.add(rightTail);

    // 刘海
    for (let i = -2; i <= 2; i++) {
      const bang = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.05), hairMat);
      bang.position.set(i * 0.08, 1.3, 0.25);
      root.add(bang);
    }

    // 眼睛
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    leftEye.position.set(-0.09, 1.15, 0.27);
    root.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    rightEye.position.set(0.09, 1.15, 0.27);
    root.add(rightEye);

    // 腮红
    const leftCheek = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), cheekMat);
    leftCheek.position.set(-0.15, 1.07, 0.28);
    leftCheek.rotation.y = -0.3;
    root.add(leftCheek);
    const rightCheek = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), cheekMat);
    rightCheek.position.set(0.15, 1.07, 0.28);
    rightCheek.rotation.y = 0.3;
    root.add(rightCheek);

    // 身体
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.43, 12), dressMat);
    torso.position.y = 0.74;
    root.add(torso);

    // 手臂
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.23, 0.81, 0);
    leftArm.rotation.z = 0.2;
    root.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.23, 0.81, 0);
    rightArm.rotation.z = -0.2;
    root.add(rightArm);

    // 腿
    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.24, 8);
    const leftLeg = new THREE.Mesh(legGeo, sockMat);
    leftLeg.position.set(-0.09, 0.42, 0);
    root.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, sockMat);
    rightLeg.position.set(0.09, 0.42, 0);
    root.add(rightLeg);

    // 鞋子
    const shoeGeo = new THREE.BoxGeometry(0.09, 0.07, 0.15);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.09, 0.29, 0.03);
    root.add(leftShoe);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.09, 0.29, 0.03);
    root.add(rightShoe);

    this.mesh = root;
    this.addOutlines(root);
    return root;
  }
}
