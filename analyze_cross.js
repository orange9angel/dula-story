// 分析 BroadcastStretch crossFront 姿势 - 验证新参数

const TORSO_RADIUS = 0.21;
const TORSO_Z_SCALE = 0.65;
const SHOULDER_X = 0.26;
const SHOULDER_Y = 1.3;
const SHOULDER_Z = 0;
const UPPER_LEN = 0.28;
const LOWER_LEN = 0.26;

// ========== 新 crossFront 姿势参数 ==========
const RIGHT_CLAVICLE_ROT = { rx: 0, ry: 0.30, rz: 0 };
const LEFT_CLAVICLE_ROT = { rx: 0, ry: -0.30, rz: 0 };
const RIGHT_SHOULDER_ROT = { rx: -1.57, ry: -0.40, rz: 0.35 };
const LEFT_SHOULDER_ROT = { rx: -1.57, ry: 0.40, rz: -0.35 };
const RIGHT_ELBOW_ROT = { rx: 0.8, ry: 0, rz: 0 };
const LEFT_ELBOW_ROT = { rx: 0.8, ry: 0, rz: 0 };

function mat4Multiply(a, b) {
  const out = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i * 4 + j] = 0;
      for (let k = 0; k < 4; k++) {
        out[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
      }
    }
  }
  return out;
}

function createTranslation(x, y, z) {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
}

function createRotationXYZ(rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const mx = [1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1];
  const my = [cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1];
  const mz = [cz,sz,0,0, -sz,cz,0,0, 0,0,1,0, 0,0,0,1];
  return mat4Multiply(mz, mat4Multiply(my, mx));
}

function transformPoint(mat, p) {
  const x = mat[0]*p[0] + mat[4]*p[1] + mat[8]*p[2] + mat[12];
  const y = mat[1]*p[0] + mat[5]*p[1] + mat[9]*p[2] + mat[13];
  const z = mat[2]*p[0] + mat[6]*p[1] + mat[10]*p[2] + mat[14];
  const w = mat[3]*p[0] + mat[7]*p[1] + mat[11]*p[2] + mat[15];
  return [x/w, y/w, z/w];
}

function analyzeArm(side, clavicleR, shoulderR, elbowR) {
  const claviclePos = side === 'right' ? [SHOULDER_X, SHOULDER_Y, SHOULDER_Z] : [-SHOULDER_X, SHOULDER_Y, SHOULDER_Z];
  const clavicleTrans = createTranslation(claviclePos[0], claviclePos[1], claviclePos[2]);
  const clavicleRotM = createRotationXYZ(clavicleR.rx, clavicleR.ry, clavicleR.rz);
  const clavicleMat = mat4Multiply(clavicleTrans, clavicleRotM);

  const shoulderRotM = createRotationXYZ(shoulderR.rx, shoulderR.ry, shoulderR.rz);
  const shoulderMat = mat4Multiply(clavicleMat, shoulderRotM);

  const upperArmTrans = createTranslation(0, -UPPER_LEN/2, 0);
  const upperArmMat = mat4Multiply(shoulderMat, upperArmTrans);

  const elbowTrans = createTranslation(0, -UPPER_LEN/2 - 0.01, 0);
  const elbowRotM = createRotationXYZ(elbowR.rx, elbowR.ry, elbowR.rz);
  const elbowLocalMat = mat4Multiply(elbowTrans, elbowRotM);
  const elbowMat = mat4Multiply(upperArmMat, elbowLocalMat);

  const forearmTrans = createTranslation(0, -LOWER_LEN/2 - 0.02, 0);
  const forearmMat = mat4Multiply(elbowMat, forearmTrans);

  const wristTrans = createTranslation(0, -LOWER_LEN - 0.04, 0);
  const wristMat = mat4Multiply(forearmMat, wristTrans);

  const shoulderWorld = transformPoint(shoulderMat, [0,0,0]);
  const elbowWorld = transformPoint(elbowMat, [0,0,0]);
  const wristWorld = transformPoint(wristMat, [0,0,0]);

  const upperDir = [
    elbowWorld[0] - shoulderWorld[0],
    elbowWorld[1] - shoulderWorld[1],
    elbowWorld[2] - shoulderWorld[2]
  ];
  const upperLen = Math.sqrt(upperDir[0]**2 + upperDir[1]**2 + upperDir[2]**2);
  upperDir[0] /= upperLen; upperDir[1] /= upperLen; upperDir[2] /= upperLen;

  return {
    side,
    shoulder: { x: shoulderWorld[0], y: shoulderWorld[1], z: shoulderWorld[2] },
    elbow: { x: elbowWorld[0], y: elbowWorld[1], z: elbowWorld[2] },
    wrist: { x: wristWorld[0], y: wristWorld[1], z: wristWorld[2] },
    upperDir: { x: upperDir[0], y: upperDir[1], z: upperDir[2] },
  };
}

function checkCollisionWithTorso(point, torsoCenterY = 1.24) {
  const dx = point[0];
  const dy = point[1] - torsoCenterY;
  const dz = point[2];
  const rx = TORSO_RADIUS;
  const rz = TORSO_RADIUS * TORSO_Z_SCALE;
  const ellipseValue = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
  const inYRange = dy >= -0.25 && dy <= 0.25;
  const inEllipse = ellipseValue <= 1.0;
  return { inside: inYRange && inEllipse, ellipseValue, inYRange, inEllipse };
}

function checkArmTorsoCollision(armData, segments = 10) {
  const shoulder = [armData.shoulder.x, armData.shoulder.y, armData.shoulder.z];
  const elbow = [armData.elbow.x, armData.elbow.y, armData.elbow.z];
  const wrist = [armData.wrist.x, armData.wrist.y, armData.wrist.z];

  const collisions = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = [
      shoulder[0] + (elbow[0] - shoulder[0]) * t,
      shoulder[1] + (elbow[1] - shoulder[1]) * t,
      shoulder[2] + (elbow[2] - shoulder[2]) * t,
    ];
    const col = checkCollisionWithTorso(point);
    if (col.inside) collisions.push({ segment: 'upperArm', t, point });
  }
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = [
      elbow[0] + (wrist[0] - elbow[0]) * t,
      elbow[1] + (wrist[1] - elbow[1]) * t,
      elbow[2] + (wrist[2] - elbow[2]) * t,
    ];
    const col = checkCollisionWithTorso(point);
    if (col.inside) collisions.push({ segment: 'forearm', t, point });
  }
  return collisions;
}

function dist3d(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

console.log('=== 新参数 crossFront 姿势分析 ===\n');

const rightArm = analyzeArm('right', RIGHT_CLAVICLE_ROT, RIGHT_SHOULDER_ROT, RIGHT_ELBOW_ROT);
const leftArm = analyzeArm('left', LEFT_CLAVICLE_ROT, LEFT_SHOULDER_ROT, LEFT_ELBOW_ROT);

console.log('右臂坐标:');
console.log('  肩膀: (' + rightArm.shoulder.x.toFixed(3) + ', ' + rightArm.shoulder.y.toFixed(3) + ', ' + rightArm.shoulder.z.toFixed(3) + ')');
console.log('  肘部: (' + rightArm.elbow.x.toFixed(3) + ', ' + rightArm.elbow.y.toFixed(3) + ', ' + rightArm.elbow.z.toFixed(3) + ')');
console.log('  手腕: (' + rightArm.wrist.x.toFixed(3) + ', ' + rightArm.wrist.y.toFixed(3) + ', ' + rightArm.wrist.z.toFixed(3) + ')');
console.log('  上臂方向: (' + rightArm.upperDir.x.toFixed(3) + ', ' + rightArm.upperDir.y.toFixed(3) + ', ' + rightArm.upperDir.z.toFixed(3) + ')');

console.log('\n左臂坐标:');
console.log('  肩膀: (' + leftArm.shoulder.x.toFixed(3) + ', ' + leftArm.shoulder.y.toFixed(3) + ', ' + leftArm.shoulder.z.toFixed(3) + ')');
console.log('  肘部: (' + leftArm.elbow.x.toFixed(3) + ', ' + leftArm.elbow.y.toFixed(3) + ', ' + leftArm.elbow.z.toFixed(3) + ')');
console.log('  手腕: (' + leftArm.wrist.x.toFixed(3) + ', ' + leftArm.wrist.y.toFixed(3) + ', ' + leftArm.wrist.z.toFixed(3) + ')');
console.log('  上臂方向: (' + leftArm.upperDir.x.toFixed(3) + ', ' + leftArm.upperDir.y.toFixed(3) + ', ' + leftArm.upperDir.z.toFixed(3) + ')');

const rightCollisions = checkArmTorsoCollision(rightArm);
const leftCollisions = checkArmTorsoCollision(leftArm);

console.log('\n=== 与躯干碰撞检测 ===');
console.log('右臂碰撞点数: ' + rightCollisions.length);
if (rightCollisions.length > 0) {
  rightCollisions.forEach(c => {
    console.log('  ' + c.segment + ' t=' + c.t.toFixed(2) + ': (' + c.point[0].toFixed(3) + ', ' + c.point[1].toFixed(3) + ', ' + c.point[2].toFixed(3) + ')');
  });
}
console.log('左臂碰撞点数: ' + leftCollisions.length);
if (leftCollisions.length > 0) {
  leftCollisions.forEach(c => {
    console.log('  ' + c.segment + ' t=' + c.t.toFixed(2) + ': (' + c.point[0].toFixed(3) + ', ' + c.point[1].toFixed(3) + ', ' + c.point[2].toFixed(3) + ')');
  });
}

console.log('\n=== 前后位置判断 (z > 0 = 身前, z < 0 = 身后) ===');
console.log('右臂手腕 z = ' + rightArm.wrist.z.toFixed(3) + (rightArm.wrist.z > 0.05 ? ' 【在身前】' : rightArm.wrist.z > 0 ? ' 【略偏前】' : ' 【在身后！】'));
console.log('左臂手腕 z = ' + leftArm.wrist.z.toFixed(3) + (leftArm.wrist.z > 0.05 ? ' 【在身前】' : leftArm.wrist.z > 0 ? ' 【略偏前】' : ' 【在身后！】'));

const rMidUpper = [(rightArm.shoulder.x + rightArm.elbow.x) / 2, (rightArm.shoulder.y + rightArm.elbow.y) / 2, (rightArm.shoulder.z + rightArm.elbow.z) / 2];
const lMidUpper = [(leftArm.shoulder.x + leftArm.elbow.x) / 2, (leftArm.shoulder.y + leftArm.elbow.y) / 2, (leftArm.shoulder.z + leftArm.elbow.z) / 2];
console.log('右臂上臂中点 z = ' + rMidUpper[2].toFixed(3) + (rMidUpper[2] > 0.05 ? ' 【在身前】' : rMidUpper[2] > 0 ? ' 【略偏前】' : ' 【在身后！】'));
console.log('左臂上臂中点 z = ' + lMidUpper[2].toFixed(3) + (lMidUpper[2] > 0.05 ? ' 【在身前】' : lMidUpper[2] > 0 ? ' 【略偏前】' : ' 【在身后！】'));

// 两臂交叉点分析
console.log('\n=== 两臂间距分析 ===');
for (let i = 0; i <= 10; i++) {
  const t = i / 10;
  const rShoulder = [rightArm.shoulder.x, rightArm.shoulder.y, rightArm.shoulder.z];
  const rElbow = [rightArm.elbow.x, rightArm.elbow.y, rightArm.elbow.z];
  const rWrist = [rightArm.wrist.x, rightArm.wrist.y, rightArm.wrist.z];
  const lShoulder = [leftArm.shoulder.x, leftArm.shoulder.y, leftArm.shoulder.z];
  const lElbow = [leftArm.elbow.x, leftArm.elbow.y, leftArm.elbow.z];
  const lWrist = [leftArm.wrist.x, leftArm.wrist.y, leftArm.wrist.z];

  let rPoint, lPoint;
  if (t <= 0.5) {
    const t2 = t * 2;
    rPoint = [rShoulder[0] + (rElbow[0]-rShoulder[0])*t2, rShoulder[1] + (rElbow[1]-rShoulder[1])*t2, rShoulder[2] + (rElbow[2]-rShoulder[2])*t2];
    lPoint = [lShoulder[0] + (lElbow[0]-lShoulder[0])*t2, lShoulder[1] + (lElbow[1]-lShoulder[1])*t2, lShoulder[2] + (lElbow[2]-lShoulder[2])*t2];
  } else {
    const t2 = (t - 0.5) * 2;
    rPoint = [rElbow[0] + (rWrist[0]-rElbow[0])*t2, rElbow[1] + (rWrist[1]-rElbow[1])*t2, rElbow[2] + (rWrist[2]-rElbow[2])*t2];
    lPoint = [lElbow[0] + (lWrist[0]-lElbow[0])*t2, lElbow[1] + (lWrist[1]-lElbow[1])*t2, lElbow[2] + (lWrist[2]-lElbow[2])*t2];
  }

  const dist = dist3d(rPoint, lPoint);
  if (i % 2 === 0) {
    console.log('  t=' + t.toFixed(1) + ': 距离=' + dist.toFixed(3) + 'm' + (dist < 0.05 ? ' 【穿模！】' : dist < 0.09 ? ' 【非常近】' : ''));
  }
}

console.log('\n=== 交叉判断 ===');
console.log('右臂手腕 x = ' + rightArm.wrist.x.toFixed(3) + ', 左臂手腕 x = ' + leftArm.wrist.x.toFixed(3));
const crossed = rightArm.wrist.x < leftArm.wrist.x;
console.log('是否形成交叉: ' + (crossed ? '是 ✓' : '否'));

const rForearmDir = [rightArm.wrist.x - rightArm.elbow.x, rightArm.wrist.y - rightArm.elbow.y, rightArm.wrist.z - rightArm.elbow.z];
const lForearmDir = [leftArm.wrist.x - leftArm.elbow.x, leftArm.wrist.y - leftArm.elbow.y, leftArm.wrist.z - leftArm.elbow.z];
console.log('\n右前臂方向: (' + rForearmDir[0].toFixed(3) + ', ' + rForearmDir[1].toFixed(3) + ', ' + rForearmDir[2].toFixed(3) + ')');
console.log('左前臂方向: (' + lForearmDir[0].toFixed(3) + ', ' + lForearmDir[1].toFixed(3) + ', ' + lForearmDir[2].toFixed(3) + ')');
console.log('右前臂是否向左: ' + (rForearmDir[0] < -0.05 ? '是 ✓' : '否'));
console.log('左前臂是否向右: ' + (lForearmDir[0] > 0.05 ? '是 ✓' : '否'));
