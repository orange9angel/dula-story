import * as THREE from 'three';
import { ToonCharacterBase } from './ToonCharacterBase.js';

/**
 * Maruko — 樱桃小丸子
 * 红色连衣裙、黑色短发、圆脸、豆豆眼
 */
export class Maruko extends ToonCharacterBase {
  constructor(name) {
    super(name || 'Maruko');
    this.boundingRadius = 0.35;
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
    const hairMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const dressMat = new THREE.MeshToonMaterial({ color: 0xe74c3c, gradientMap: toonGradient });
    const sockMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
    const shoeMat = new THREE.MeshToonMaterial({ color: 0x8b0000, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffaaaa, transparent: true, opacity: 0.5 });

    const root = new THREE.Group();

    // 头
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), skinMat);
    head.position.y = 1.15;
    root.add(head);

    // 头发（后半球）
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hairBack.position.y = 1.18;
    hairBack.rotation.x = Math.PI;
    root.add(hairBack);

    // 刘海（几个小方块模拟锯齿刘海）
    for (let i = -2; i <= 2; i++) {
      const bang = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), hairMat);
      bang.position.set(i * 0.09, 1.32, 0.26);
      bang.rotation.z = i * 0.15;
      root.add(bang);
    }

    // 眼睛（豆豆眼）
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    leftEye.position.set(-0.1, 1.16, 0.28);
    root.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    rightEye.position.set(0.1, 1.16, 0.28);
    root.add(rightEye);

    // 腮红
    const leftCheek = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), cheekMat);
    leftCheek.position.set(-0.16, 1.08, 0.29);
    leftCheek.rotation.y = -0.3;
    root.add(leftCheek);
    const rightCheek = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), cheekMat);
    rightCheek.position.set(0.16, 1.08, 0.29);
    rightCheek.rotation.y = 0.3;
    root.add(rightCheek);

    // 身体（连衣裙）
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.45, 12), dressMat);
    torso.position.y = 0.75;
    root.add(torso);

    // 手臂
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.24, 0.82, 0);
    leftArm.rotation.z = 0.2;
    root.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.24, 0.82, 0);
    rightArm.rotation.z = -0.2;
    root.add(rightArm);

    // 腿
    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8);
    const leftLeg = new THREE.Mesh(legGeo, sockMat);
    leftLeg.position.set(-0.1, 0.42, 0);
    root.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, sockMat);
    rightLeg.position.set(0.1, 0.42, 0);
    root.add(rightLeg);

    // 鞋子
    const shoeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.16);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.1, 0.28, 0.03);
    root.add(leftShoe);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.1, 0.28, 0.03);
    root.add(rightShoe);

    this.mesh = root;
    this.addOutlines(root);
    return root;
  }
}
