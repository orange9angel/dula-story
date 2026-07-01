import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

/**
 * ClassroomScene — 樱桃小丸子风格教室
 */
export class ClassroomScene extends SceneBase {
  constructor() {
    super('ClassroomScene');
  }

  build() {
    const scene = new THREE.Group();

    const toonGradient = this.createToonGradient();
    const floorMat = new THREE.MeshToonMaterial({ color: 0xd4a373, gradientMap: toonGradient });
    const wallMat = new THREE.MeshToonMaterial({ color: 0xf5f5dc, gradientMap: toonGradient });
    const blackboardMat = new THREE.MeshToonMaterial({ color: 0x2d4a3e, gradientMap: toonGradient });
    const deskMat = new THREE.MeshToonMaterial({ color: 0x8b5a2b, gradientMap: toonGradient });
    const chairMat = new THREE.MeshToonMaterial({ color: 0x5d4037, gradientMap: toonGradient });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
    const frameMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });

    // 地板
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 后墙（带黑板）
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 0.5), wallMat);
    backWall.position.set(0, 4, -8);
    scene.add(backWall);

    // 黑板
    const blackboard = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 0.1), blackboardMat);
    blackboard.position.set(0, 3.5, -7.7);
    scene.add(blackboard);

    // 侧墙
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 20), wallMat);
    leftWall.position.set(-10, 4, 0);
    scene.add(leftWall);

    // 窗户
    for (let i = 0; i < 3; i++) {
      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 2), frameMat);
      windowFrame.position.set(-9.7, 4, -4 + i * 4);
      scene.add(windowFrame);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.3), windowMat);
      glass.position.set(-9.6, 4, -4 + i * 4);
      glass.rotation.y = Math.PI / 2;
      scene.add(glass);
    }

    // 课桌椅（几排）
    for (let row = 0; row < 3; row++) {
      for (let col = -1; col <= 1; col++) {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), deskMat);
        desk.position.set(col * 2.5, 0.8, -2 + row * 2.5);
        scene.add(desk);

        const deskLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), deskMat);
        deskLeg1.position.set(col * 2.5 - 0.5, 0.4, -2 + row * 2.5 - 0.3);
        scene.add(deskLeg1);
        const deskLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), deskMat);
        deskLeg2.position.set(col * 2.5 + 0.5, 0.4, -2 + row * 2.5 - 0.3);
        scene.add(deskLeg2);

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.5), chairMat);
        chair.position.set(col * 2.5, 0.45, -2 + row * 2.5 + 0.7);
        scene.add(chair);
        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), chairMat);
        chairBack.position.set(col * 2.5, 0.7, -2 + row * 2.5 + 0.9);
        scene.add(chairBack);
      }
    }

    // 明亮光源：正面补光 + 侧上方主光，让角色脸部清晰
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
    dirLight.position.set(2, 6, 5);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 4, 4);
    scene.add(fillLight);

    this.scene = scene;
    return scene;
  }

  createToonGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 4, 0);
    g.addColorStop(0, '#bbbbbb');
    g.addColorStop(0.4, '#cccccc');
    g.addColorStop(0.7, '#e0e0e0');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }
}
