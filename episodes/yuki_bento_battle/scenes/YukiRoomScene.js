import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

// 小雪家 —— 少女卧室。布局与 RoomScene（大雄家）刻意不同：
// 床在左墙（粉色寝具 + 兔子玩偶）、床头柜上有闹钟（剧情道具）、
// 右后侧白色书桌 + 粉色椅子、后墙窗户挂粉丝窗帘 + 海报 + 猫脸挂钟、
// 中央粉色圆地毯。演戏区（x -3..3, z 0..1）保持空旷。
export class YukiRoomScene extends SceneBase {
  constructor() {
    super('YukiRoomScene');
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0xfde8ef);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfde8ef, roughness: 0.9 });
    const whiteWood = new THREE.MeshStandardMaterial({ color: 0xfaf3f0, roughness: 0.7 });
    const pinkWood = new THREE.MeshStandardMaterial({ color: 0xe8b4c4, roughness: 0.7 });
    const pinkFabric = new THREE.MeshStandardMaterial({ color: 0xf6a8c0, roughness: 0.95 });

    // Floor — 浅暖木地板
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0xe9c9a8, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0xfdfaf7, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10;
    this.scene.add(ceiling);

    // Walls
    const wallGeo = new THREE.PlaneGeometry(20, 10);
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 5, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-10, 5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(10, 5, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const frontWall = new THREE.Mesh(wallGeo, wallMat);
    frontWall.position.set(0, 5, 5);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    // ── 床（左墙，粉色寝具） ─────────────────────────────────────────
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 3.2), whiteWood);
    bedFrame.position.set(-6.8, 0.175, -1.2);
    bedFrame.castShadow = true;
    this.scene.add(bedFrame);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.25, 3.0),
      new THREE.MeshStandardMaterial({ color: 0xfff8f5, roughness: 0.9 })
    );
    mattress.position.set(-6.8, 0.475, -1.2);
    mattress.castShadow = true;
    this.scene.add(mattress);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.28, 1.8), pinkFabric);
    blanket.position.set(-6.8, 0.49, -0.4);
    this.scene.add(blanket);

    // 枕头 + 爱心抱枕
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xfdf6f8, roughness: 0.9 })
    );
    pillow.position.set(-6.8, 0.63, -2.3);
    pillow.castShadow = true;
    this.scene.add(pillow);

    const heart = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xe8546d, roughness: 0.8 })
    );
    heart.scale.set(1, 0.6, 0.9);
    heart.position.set(-6.2, 0.72, -2.45);
    this.scene.add(heart);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.1), whiteWood);
    headboard.position.set(-6.8, 0.8, -2.75);
    headboard.castShadow = true;
    this.scene.add(headboard);

    // 床上兔子玩偶（靠着床头板角落，不占小雪躺的位置）
    const bunnyMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.95 });
    const bunnyBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bunnyMat);
    bunnyBody.position.set(-7.5, 0.73, -2.2);
    this.scene.add(bunnyBody);
    const bunnyHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), bunnyMat);
    bunnyHead.position.set(-7.5, 0.95, -2.2);
    this.scene.add(bunnyHead);
    for (const dx of [-0.06, 0.06]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.02), bunnyMat);
      ear.position.set(-7.5 + dx, 1.11, -2.2);
      this.scene.add(ear);
    }

    // ── 床头柜 + 闹钟（剧情道具） ─────────────────────────────────────
    const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), pinkWood);
    nightstand.position.set(-4.6, 0.3, -2.6);
    nightstand.castShadow = true;
    this.scene.add(nightstand);

    const clockYellow = new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.5 });
    const alarmBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 20), clockYellow);
    alarmBody.rotation.x = Math.PI / 2;
    alarmBody.position.set(-4.6, 0.72, -2.6);
    this.scene.add(alarmBody);
    const alarmFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    alarmFace.position.set(-4.6, 0.72, -2.54);
    this.scene.add(alarmFace);
    for (const dx of [-0.08, 0.08]) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), clockYellow);
      bell.position.set(-4.6 + dx, 0.82, -2.6);
      this.scene.add(bell);
    }

    // ── 书桌 + 椅子（右后侧，白 + 粉） ────────────────────────────────
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 1.5), whiteWood);
    deskTop.position.set(5.8, 1.15, -3.8);
    deskTop.castShadow = true;
    this.scene.add(deskTop);

    const deskLegGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.15, 16);
    for (const [x, z] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]]) {
      const leg = new THREE.Mesh(deskLegGeo, pinkWood);
      leg.position.set(5.8 + x, 0.575, -3.8 + z);
      leg.castShadow = true;
      this.scene.add(leg);
    }

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), pinkFabric);
    chairSeat.position.set(5.8, 0.7, -2.3);
    chairSeat.castShadow = true;
    this.scene.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), pinkFabric);
    chairBack.position.set(5.8, 1.2, -2.75);
    chairBack.castShadow = true;
    this.scene.add(chairBack);
    const chairLegGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16);
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
      const leg = new THREE.Mesh(chairLegGeo, pinkWood);
      leg.position.set(5.8 + x, 0.35, -2.3 + z);
      leg.castShadow = true;
      this.scene.add(leg);
    }

    // 台灯（粉色灯罩）
    const lampMetal = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.5 });
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.06, 16), lampMetal);
    lampBase.position.set(4.9, 1.28, -3.8);
    this.scene.add(lampBase);
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), lampMetal);
    lampPole.position.set(4.9, 1.53, -3.8);
    this.scene.add(lampPole);
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.22, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf6a8c0, roughness: 0.5, side: THREE.DoubleSide })
    );
    lampShade.position.set(4.9, 1.75, -3.8);
    this.scene.add(lampShade);

    // 笔筒 + 课本堆
    const pencilCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.06, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x8fd3c7, roughness: 0.6 })
    );
    pencilCup.position.set(6.7, 1.31, -3.8);
    this.scene.add(pencilCup);
    const bookColors = [0xe8546d, 0x5b8dd9, 0xffc93c];
    for (let i = 0; i < 3; i++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.045, 0.24),
        new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.8 })
      );
      book.position.set(6.1, 1.25 + i * 0.05, -3.9);
      book.rotation.y = (i - 1) * 0.12;
      this.scene.add(book);
    }

    // ── 书架（后墙偏左，漫画） ────────────────────────────────────────
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xd8a0b0, roughness: 0.7 });
    const shelfFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.35), shelfMat);
    shelfFrame.position.set(-3.2, 1.1, -4.55);
    shelfFrame.castShadow = true;
    this.scene.add(shelfFrame);
    const mangaColors = [0xe8546d, 0x5b8dd9, 0x66bb6a, 0xffc93c, 0xab7bd8, 0xff8a65];
    for (let row = 0; row < 3; row++) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.3), whiteWood);
      board.position.set(-3.2, 0.45 + row * 0.62, -4.5);
      this.scene.add(board);
      for (let b = 0; b < 7; b++) {
        const h = 0.3 + ((row * 7 + b) % 4) * 0.06;
        const manga = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, h, 0.2),
          new THREE.MeshStandardMaterial({ color: mangaColors[(row * 7 + b) % mangaColors.length], roughness: 0.8 })
        );
        manga.position.set(-3.85 + b * 0.22, 0.45 + row * 0.62 + h / 2 + 0.03, -4.45);
        this.scene.add(manga);
      }
    }

    // ── 衣柜（右后角，粉白） ──────────────────────────────────────────
    const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 1.0), pinkWood);
    wardrobe.position.set(8.2, 1.6, -4.2);
    wardrobe.castShadow = true;
    this.scene.add(wardrobe);
    const wardrobeLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 3.0, 1.02),
      new THREE.MeshStandardMaterial({ color: 0xfaf3f0, roughness: 0.8 })
    );
    wardrobeLine.position.set(8.2, 1.6, -4.2);
    this.scene.add(wardrobeLine);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.3 });
    for (const x of [7.85, 8.55]) {
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), handleMat);
      handle.position.set(x, 1.6, -3.68);
      this.scene.add(handle);
    }

    // ── 窗户 + 粉色窗帘（后墙中央） ───────────────────────────────────
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xfaf3f0, roughness: 0.4 })
    );
    windowFrame.position.set(0, 4.5, -4.95);
    this.scene.add(windowFrame);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.45, roughness: 0.1 })
    );
    glass.position.set(0, 4.5, -4.9);
    this.scene.add(glass);
    for (const x of [-2.25, 2.25]) {
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.08), pinkFabric);
      curtain.position.set(x, 4.5, -4.85);
      this.scene.add(curtain);
    }

    // ── 海报（后墙，窗两侧） ──────────────────────────────────────────
    const poster1 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xffd9e8, roughness: 0.9 })
    );
    poster1.position.set(-4.9, 4.4, -4.93);
    this.scene.add(poster1);
    // 海报上的猫咪脸
    const posterCat = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0xffb066, roughness: 0.9 })
    );
    posterCat.position.set(-4.9, 4.4, -4.9);
    this.scene.add(posterCat);

    const poster2 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xd0e8ff, roughness: 0.9 })
    );
    poster2.position.set(4.9, 4.6, -4.93);
    this.scene.add(poster2);
    const posterStar = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 5),
      new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.9 })
    );
    posterStar.position.set(4.9, 4.6, -4.9);
    this.scene.add(posterStar);

    // ── 猫脸挂钟（后墙右侧高处） ──────────────────────────────────────
    const clockFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0xfffaf0 })
    );
    clockFace.position.set(7.2, 5.8, -4.92);
    this.scene.add(clockFace);
    for (const dx of [-0.22, 0.22]) {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: 0xe8b4c4 })
      );
      ear.position.set(7.2 + dx, 6.1, -4.92);
      this.scene.add(ear);
    }
    const handMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.01), handMat);
    hourHand.position.set(7.2, 5.86, -4.9);
    hourHand.rotation.z = -1.8; // 指向 7 点
    this.scene.add(hourHand);
    const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.24, 0.01), handMat);
    minuteHand.position.set(7.2, 5.9, -4.9);
    minuteHand.rotation.z = 0.1;
    this.scene.add(minuteHand);

    // ── 中央圆形地毯（粉边白心） ──────────────────────────────────────
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 32),
      new THREE.MeshStandardMaterial({ color: 0xf3b8cc, roughness: 0.95 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 1);
    rug.receiveShadow = true;
    this.scene.add(rug);
    const rugInner = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 32),
      new THREE.MeshStandardMaterial({ color: 0xfdeef3, roughness: 0.95 })
    );
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.set(0, 0.015, 1);
    rugInner.receiveShadow = true;
    this.scene.add(rugInner);

    // ── 角落毛绒熊（右前角） ──────────────────────────────────────────
    const bearMat = new THREE.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.95 });
    const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), bearMat);
    bearBody.position.set(8.3, 0.4, 2.8);
    bearBody.castShadow = true;
    this.scene.add(bearBody);
    const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), bearMat);
    bearHead.position.set(8.3, 0.95, 2.8);
    bearHead.castShadow = true;
    this.scene.add(bearHead);
    for (const dx of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), bearMat);
      ear.position.set(8.3 + dx, 1.18, 2.8);
      this.scene.add(ear);
    }

    // ── 兔子拖鞋（床前） ──────────────────────────────────────────────
    for (const z of [0.5, 0.95]) {
      const slipper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.18, 4, 12), bunnyMat);
      slipper.rotation.x = Math.PI / 2;
      slipper.position.set(-4.9, 0.07, z);
      this.scene.add(slipper);
    }

    // ── 便当盒（本集主角道具，三个时间态：桌上带盖 → 地毯带盖 → 地毯开盖） ──
    // 换态由 update(time) 驱动；剧情：55.2s 追逐中被碰落，68.1s 小雪打开翻车。
    const bentoBoxMat = new THREE.MeshStandardMaterial({ color: 0xfaf0e6, roughness: 0.7 });
    const bentoBandMat = new THREE.MeshStandardMaterial({ color: 0xe8546d, roughness: 0.8 });
    const bentoLidMat = new THREE.MeshStandardMaterial({ color: 0xf6a8c0, roughness: 0.7 });

    const makeClosedBento = () => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.34), bentoBoxMat);
      g.add(box);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.36), bentoBandMat);
      g.add(band);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.36), bentoLidMat);
      lid.position.y = 0.1;
      g.add(lid);
      return g;
    };
    this.bentoOnDesk = makeClosedBento();
    this.bentoOnDesk.position.set(5.5, 1.33, -3.7);
    this.scene.add(this.bentoOnDesk);

    this.bentoOnFloor = makeClosedBento();
    this.bentoOnFloor.position.set(0.2, 0.09, 0.9);
    this.bentoOnFloor.rotation.y = 0.4;
    this.bentoOnFloor.visible = false;
    this.scene.add(this.bentoOnFloor);

    // 开盖态：盖子歪在旁边，露出减肥餐（米饭/青椒/胡萝卜/鸡胸肉色块）
    const openG = new THREE.Group();
    const openBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.34), bentoBoxMat);
    openG.add(openBox);
    const rice = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.05, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xfdfbf3, roughness: 0.9 })
    );
    rice.position.set(-0.12, 0.09, 0);
    openG.add(rice);
    const greens = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.05, 0.13),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3a, roughness: 0.9 })
    );
    greens.position.set(0.13, 0.09, -0.08);
    openG.add(greens);
    const carrot = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.05, 0.13),
      new THREE.MeshStandardMaterial({ color: 0xe8873a, roughness: 0.9 })
    );
    carrot.position.set(0.13, 0.09, 0.08);
    openG.add(carrot);
    const lidOff = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.36), bentoLidMat);
    lidOff.position.set(0.45, 0.03, 0.15);
    lidOff.rotation.y = 0.5;
    openG.add(lidOff);
    this.bentoOpen = openG;
    this.bentoOpen.position.set(0.2, 0.09, 0.9);
    this.bentoOpen.rotation.y = 0.4;
    this.bentoOpen.visible = false;
    this.scene.add(this.bentoOpen);

    // Camera collision proxies
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(-6.8, 0.6, -1.2), size: new THREE.Vector3(2.4, 1.2, 3.4) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(-4.6, 0.5, -2.6), size: new THREE.Vector3(1.0, 1.0, 0.8) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(5.8, 0.9, -3.8), size: new THREE.Vector3(3.2, 1.8, 1.7) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(5.8, 0.8, -2.3), size: new THREE.Vector3(1.2, 1.6, 1.2) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(-3.2, 1.1, -4.55), size: new THREE.Vector3(2.0, 2.3, 0.6) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(8.2, 1.6, -4.2), size: new THREE.Vector3(1.8, 3.2, 1.2) });

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    // 便当盒时间态：桌上（0-55.2）→ 地毯带盖（55.2-68.1）→ 地毯开盖（68.1-）
    // （55.2 = 条14 追逐碰落，68.1 = 条19 小雪打开翻车，与 script.story 对齐）
    if (this.bentoOnDesk) this.bentoOnDesk.visible = time < 55.2;
    if (this.bentoOnFloor) this.bentoOnFloor.visible = time >= 55.2 && time < 68.1;
    if (this.bentoOpen) this.bentoOpen.visible = time >= 68.1;
  }
}
