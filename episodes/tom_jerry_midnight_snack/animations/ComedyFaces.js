import { AnimationBase, PoseMatrix } from 'dula-engine';

/**
 * FaceMischief — 使坏 / 恶作剧表情
 * 一边眉毛挑起、一边眼睛眯起、嘴角歪向一侧。
 */
export class FaceMischief extends AnimationBase {
  constructor() {
    super('FaceMischief', 0.35);
    this.usePoseMatrix = true;
    this.tags = {
      requires: ['headGroup'],
      suits: ['humanoid', 'cartoon-animal', 'rodent', 'feline'],
      notSuits: [],
      minHeight: 0.3,
      maxHeight: 4.0,
    };
  }

  getPoseMatrix(t) {
    const ease = t < 0.25 ? t / 0.25 : 1;
    const pose = new PoseMatrix();

    pose.eyebrows = {
      left: { py: ease * 0.022, rz: -ease * 0.25 },
      right: { py: -ease * 0.012, rz: ease * 0.35 },
    };

    pose.eyelids = {
      left: { visible: false },
      right: { visible: true, sy: -ease * 0.35 },
    };

    pose.pupils = {
      left: { sx: -ease * 0.15, sy: -ease * 0.15, sz: -ease * 0.15 },
      right: { sx: -ease * 0.15, sy: -ease * 0.15, sz: -ease * 0.15 },
    };

    pose.mouth = { tension: ease * 0.35, sx: ease * 0.15, sy: -ease * 0.1 };

    pose.headGroup = {
      rz: -ease * 0.08,
      rx: -ease * 0.03,
    };

    return pose;
  }
}

/**
 * FaceGloat — 得意洋洋
 * 双眉高挑、双眼放光、嘴巴咧开大笑。
 */
export class FaceGloat extends AnimationBase {
  constructor() {
    super('FaceGloat', 0.4);
    this.usePoseMatrix = true;
    this.tags = {
      requires: ['headGroup'],
      suits: ['humanoid', 'cartoon-animal', 'rodent', 'feline'],
      notSuits: [],
      minHeight: 0.3,
      maxHeight: 4.0,
    };
  }

  getPoseMatrix(t) {
    const ease = t < 0.25 ? t / 0.25 : 1;
    const pose = new PoseMatrix();

    pose.eyebrows = {
      left: { py: ease * 0.032, rz: -ease * 0.35 },
      right: { py: ease * 0.032, rz: ease * 0.35 },
    };

    pose.eyelids = {
      left: { visible: false },
      right: { visible: false },
    };

    pose.pupils = {
      left: { sx: -ease * 0.2, sy: -ease * 0.2, sz: -ease * 0.2 },
      right: { sx: -ease * 0.2, sy: -ease * 0.2, sz: -ease * 0.2 },
    };

    pose.mouth = { tension: 0, sx: ease * 0.45, sy: ease * 0.35 };

    pose.headGroup = {
      rx: -ease * 0.08,
      rz: ease * 0.05,
    };

    return pose;
  }
}

/**
 * FaceShockComedy — 喜剧震惊
 * 眉毛一飞冲天、眼睛瞪圆、嘴巴大张 O 型。
 */
export class FaceShockComedy extends AnimationBase {
  constructor() {
    super('FaceShockComedy', 0.35);
    this.usePoseMatrix = true;
    this.tags = {
      requires: ['headGroup'],
      suits: ['humanoid', 'cartoon-animal', 'rodent', 'feline'],
      notSuits: [],
      minHeight: 0.3,
      maxHeight: 4.0,
    };
  }

  getPoseMatrix(t) {
    const ease = t < 0.2 ? t / 0.2 : 1;
    const pose = new PoseMatrix();

    pose.eyebrows = {
      left: { py: ease * 0.05, rz: -ease * 0.2 },
      right: { py: ease * 0.05, rz: ease * 0.2 },
    };

    pose.eyelids = {
      left: { visible: false },
      right: { visible: false },
    };

    pose.pupils = {
      left: { sx: -ease * 0.45, sy: -ease * 0.45, sz: -ease * 0.45 },
      right: { sx: -ease * 0.45, sy: -ease * 0.45, sz: -ease * 0.45 },
    };

    pose.mouth = { tension: -0.3, sx: ease * 0.55, sy: ease * 0.75 };

    pose.headGroup = {
      rx: -ease * 0.15,
      ry: ease * 0.05,
    };

    return pose;
  }
}
