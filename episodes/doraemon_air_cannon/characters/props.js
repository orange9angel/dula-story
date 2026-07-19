import * as THREE from 'three';

/**
 * 剧集本地道具：漫画书与空气炮。
 * 配合 dula-engine 的通用道具挂钩（Storyboard._applyStoryPropsAtTime）：
 * 角色实现 attachProp(type)/detachProp(type) 后，剧本中的
 * {Prop:comic|character=Gian} / {Prop:aircannon|character=Nobita|action=detach}
 * 就会在对应条目时间点挂上/卸下道具。
 *
 * 挂载点约定（与 dula-assets/characters/Nobita.js 相同的骨架）：
 *   - char.rightArm/leftArm 是手臂 Group，沿本地 -Y 延伸
 *   - char.rightArmLength/leftArmLength 是肩到手的距离，手在 (0, -len, 0)
 *   - 手臂本地 +Z 大致朝角色前方
 */

let _toonGradient = null;
function toonGradient() {
  if (_toonGradient) return _toonGradient;
  const canvas = document.createElement('canvas');
  canvas.width = 4; canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 4, 0);
  g.addColorStop(0, '#aaa'); g.addColorStop(0.4, '#ccc'); g.addColorStop(0.7, '#eee'); g.addColorStop(1, '#fff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  _toonGradient = tex;
  return tex;
}

/**
 * 漫画书：薄盒体 + 彩色封面/白色书页/书脊，约 0.19×0.26×0.035。
 * 封面朝 +Z（角色前方），挂在手上时封面朝向镜头一侧。
 */
export function makeComic() {
  const grad = toonGradient();
  const group = new THREE.Group();
  group.name = 'prop_comic';

  // 书页主体（白色）
  const pagesMat = new THREE.MeshToonMaterial({ color: 0xf5f0e0, gradientMap: grad });
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.028), pagesMat);
  group.add(pages);

  // 封面（红色，略大于书页，朝 +Z）
  const coverMat = new THREE.MeshToonMaterial({ color: 0xe04848, gradientMap: grad });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.26, 0.007), coverMat);
  cover.position.z = 0.0175;
  group.add(cover);

  // 封底
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.26, 0.007), coverMat);
  back.position.z = -0.0175;
  group.add(back);

  // 书脊（深蓝色条）
  const spineMat = new THREE.MeshToonMaterial({ color: 0x2a3a8a, gradientMap: grad });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.26, 0.042), spineMat);
  spine.position.x = -0.095;
  group.add(spine);

  // 封面标题色块（黄色矩形，增加远观辨识度）
  const titleMat = new THREE.MeshToonMaterial({ color: 0xffd94d, gradientMap: grad });
  const title = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.005), titleMat);
  title.position.set(0.015, 0.075, 0.023);
  group.add(title);

  return group;
}

/**
 * 空气炮：短圆筒 + 前端喇叭口炮口 + 握把，卡通风格，全长约 0.3。
 * 炮管沿手臂本地 -Y（指向目标方向），挂到手上后随 PointForward 等动作瞄准。
 */
export function makeAirCannon() {
  const grad = toonGradient();
  const group = new THREE.Group();
  group.name = 'prop_aircannon';

  const bodyMat = new THREE.MeshToonMaterial({ color: 0xd84830, gradientMap: grad }); // 红橙炮身
  const muzzleMat = new THREE.MeshToonMaterial({ color: 0xffcc33, gradientMap: grad }); // 黄色炮口
  const gripMat = new THREE.MeshToonMaterial({ color: 0x444455, gradientMap: grad }); // 深灰握把

  // 主炮管（沿 -Y 指向），长约 0.24，手位于 +Y 端
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.24, 16), bodyMat);
  barrel.position.y = -0.09; // 上端没入手中
  group.add(barrel);

  // 喇叭口炮口（前端外扩）
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.08, 0.08, 16), muzzleMat);
  muzzle.position.y = -0.25;
  group.add(muzzle);

  // 炮口黑腔
  const holeMat = new THREE.MeshToonMaterial({ color: 0x222222, gradientMap: grad });
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), holeMat);
  hole.position.y = -0.29;
  group.add(hole);

  // 握把（横向短把，便于读出手持感）
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.10), gripMat);
  grip.position.set(0, 0.0, 0.06);
  group.add(grip);

  // 尾部圆钮
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), muzzleMat);
  knob.position.y = 0.04;
  group.add(knob);

  return group;
}

const PROP_BUILDERS = {
  comic: makeComic,
  aircannon: makeAirCannon,
};

// 每种道具的挂载偏移/朝向（在手臂 Group 局部坐标系内）
const PROP_FIT = {
  comic: {
    position: (len) => [0, -len - 0.04, 0.08],
    rotation: () => [-0.55, 0, 0], // 封面前倾上翻，朝向镜头
  },
  aircannon: {
    position: (len) => [0, -len, 0.06],
    rotation: () => [0, 0, 0], // 炮管沿 -Y 直指
  },
};

/**
 * 把道具挂到角色手上（默认右手 rightArm，可指定 'left'）。
 * 网格缓存在角色实例上，重复 attach 只切换 visible。
 */
export function attachPropTo(char, type, arm = 'right') {
  if (!char || !type) return;
  const builder = PROP_BUILDERS[type];
  const fit = PROP_FIT[type];
  if (!builder || !fit) return;

  const armGroup = arm === 'left' ? char.leftArm : char.rightArm;
  const armLength = (arm === 'left' ? char.leftArmLength : char.rightArmLength) || 0.7;
  if (!armGroup) return;

  if (!char._episodeProps) char._episodeProps = {};
  let mesh = char._episodeProps[type];
  if (!mesh) {
    mesh = builder();
    char._episodeProps[type] = mesh;
  }
  if (mesh.parent !== armGroup) {
    if (mesh.parent) mesh.parent.remove(mesh);
    armGroup.add(mesh);
  }
  const [px, py, pz] = fit.position(armLength);
  const [rx, ry, rz] = fit.rotation(armLength);
  mesh.position.set(px, py, pz);
  mesh.rotation.set(rx, ry, rz);
  mesh.visible = true;
}

/**
 * 卸下道具（保留网格缓存，仅隐藏）。
 */
export function detachPropFrom(char, type) {
  if (!char || !char._episodeProps) return;
  const mesh = char._episodeProps[type];
  if (mesh) mesh.visible = false;
}
