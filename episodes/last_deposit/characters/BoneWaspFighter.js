import * as THREE from 'three';

function makeGlowSprite(color = '#ff2200', size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2 - 1);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.18, color);
  grad.addColorStop(0.55, 'rgba(255,40,10,0.18)');
  grad.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
}

/**
 * 克洛斯公司 Viper 无人战机 —— 自定义程序化模型
 * 造型：修长黑色机身、前掠角翼、单眼红传感器、下腹双联机炮。
 * 避免下载模型的廉价感，全由基础几何体组合，风格统一且可迭代。
 */
export function createViperDrone({ searchBeam = true } = {}) {
  const group = new THREE.Group();
  group.name = 'ViperDrone';

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2a2528, roughness: 0.35, metalness: 0.82 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e1a1d, roughness: 0.38, metalness: 0.78 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6a1a1a, roughness: 0.4, metalness: 0.65 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.45, metalness: 0.75 });
  const sensorMat = new THREE.MeshBasicMaterial({ color: 0xff1a0a, blending: THREE.AdditiveBlending });

  // 主机体：长梭形，尖头朝 +z
  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.2, 12), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.25;
  group.add(fuselage);

  // 机身中段加宽，让侧面有体积感
  const midHull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 1.2), hullMat);
  midHull.position.set(0, -0.02, -0.25);
  group.add(midHull);

  // 前掠翼：从后段向前下方掠出
  for (const side of [-1, 1]) {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(side * 1.55, -0.55);
    wingShape.lineTo(side * 1.35, -0.95);
    wingShape.lineTo(side * 0.22, -0.55);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.rotation.x = Math.PI / 2;
    wing.rotation.z = side * Math.PI / 2;
    wing.position.set(side * 0.18, 0.02, -0.35);
    group.add(wing);

    // 翼尖红色航行灯
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), sensorMat.clone());
    nav.position.set(side * 1.48, 0.05, -0.72);
    group.add(nav);

    // 引擎舱
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.55, 12), darkMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.46, -0.05, -0.65);
    group.add(pod);

    // 引擎喷口发光
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.12, 12), sensorMat.clone());
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(side * 0.46, -0.05, -0.95);
    group.add(nozzle);

    const engineLight = new THREE.PointLight(0xff2200, 1.2, 4.5, 1.4);
    engineLight.position.set(side * 0.46, -0.05, -1.05);
    group.add(engineLight);

    // 引擎尾焰
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.10, 0.72, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff3a12,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(side * 0.46, -0.05, -1.35);
    group.add(flame);
    group.userData.engineFlames ??= [];
    group.userData.engineFlames.push(flame);
  }

  // 垂直尾翼
  const vStab = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.55), accentMat);
  vStab.position.set(0, 0.55, -0.55);
  vStab.rotation.x = -0.22;
  group.add(vStab);

  // 单眼红传感器（“眼”在机鼻下方）
  const eyeHousing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.16), darkMat);
  eyeHousing.position.set(0, -0.12, 0.95);
  group.add(eyeHousing);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), sensorMat);
  eye.position.set(0, -0.12, 1.04);
  group.add(eye);

  const eyeGlow = makeGlowSprite('#ff1a0a', 64);
  eyeGlow.scale.set(0.55, 0.55, 1);
  eyeGlow.position.set(0, -0.12, 1.06);
  group.add(eyeGlow);

  const eyeLight = new THREE.PointLight(0xff1a0a, 1.6, 3.5, 1.6);
  eyeLight.position.copy(eye.position);
  group.add(eyeLight);

  // 下腹双联机炮
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.28, 0.35);
  group.add(weaponMount);

  for (const side of [-1, 1]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 0.75, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(side * 0.14, 0, 0.32);
    weaponMount.add(barrel);
  }

  // 枪口位置（开火时光效原点）
  const muzzle = new THREE.Group();
  muzzle.position.set(0, 0, 0.72);
  weaponMount.add(muzzle);

  const muzzleCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  muzzle.add(muzzleCore);
  const muzzleHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xff2a0a, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  muzzle.add(muzzleHalo);
  const muzzleRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.016, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xff8a55, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
  );
  muzzle.add(muzzleRing);
  const muzzleLight = new THREE.PointLight(0xff2a0a, 0, 6, 1.6);
  muzzle.add(muzzleLight);
  muzzle.visible = false;

  // 红色扫描锥（让敌机在深色背景中轮廓分明）
  if (searchBeam) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 3.8, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff1a0a,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    cone.position.set(0, -2.0, 0.15);
    group.add(cone);
    group.userData.searchBeam = cone;
  }

  // 机身外缘辉光 billboard
  const glow = makeGlowSprite('#ff1a0a', 96);
  glow.scale.set(5.0, 5.0, 1);
  glow.position.set(0, 0, -0.2);
  group.add(glow);

  group.userData.weaponMount = weaponMount;
  group.userData.muzzle = muzzle;
  group.userData.muzzleCore = muzzleCore;
  group.userData.muzzleHalo = muzzleHalo;
  group.userData.muzzleRing = muzzleRing;
  group.userData.muzzleLight = muzzleLight;

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

export function updateViperDrone(group, time, seed = 0) {
  if (!group?.userData) return;

  const pulse = 0.84 + Math.sin(time * 18 + seed * 1.7) * 0.10 + Math.sin(time * 37 + seed) * 0.04;
  for (const flame of group.userData.engineFlames || []) {
    flame.scale.set(0.92 + pulse * 0.14, 0.85 + pulse * 0.28, 0.92 + pulse * 0.14);
    flame.material.opacity = 0.22 + pulse * 0.16;
  }

  const scan = 0.72 + Math.sin(time * 5.5 + seed) * 0.28;
  if (group.userData.searchBeam) {
    group.userData.searchBeam.material.opacity = 0.035 + scan * 0.035;
    group.userData.searchBeam.rotation.z = Math.sin(time * 0.7 + seed) * 0.08;
  }

  const muzzle = group.userData.muzzle;
  if (muzzle?.visible) {
    const firePulse = 0.88 + Math.sin(time * 32) * 0.12;
    muzzle.scale.setScalar(firePulse);
    group.userData.muzzleRing.rotation.z = time * 11;
    group.userData.muzzleLight.intensity = 2.0 + firePulse * 4.0;
  }
}
