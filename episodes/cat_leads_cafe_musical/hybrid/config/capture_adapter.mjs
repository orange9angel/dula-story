// 烘焙适配器：在 craft3d/viewer.html?full=1 页面上下文逐帧执行（pipeline.mjs bake 步骤）。
// 函数体不得依赖 Node 闭包；页面运行态只有 window.renderAt / window.actors / window.audioStart。
// 关节命名：世界坐标一律用解剖学左右（GLB 骨骼 mixamo 归一化名）。
// 注意 performance 数据里 leftWrist/leftFoot 是角色局部 -x 侧（面向镜头时=解剖学右脚），
// setPose 返回的 joints/feet 以 screenSide 为键：joints.left 实为解剖学右脚。
// 相机与 viewer.js 第 24 行严格同款（正交、z=8、isDance 拍点脉冲 span）。
export async function capture(t, context){
  const THREE = await import('three');
  const c = window.__cafeBake ??= {};
  if(!c.story){
    const {parseStory} = await import('/pilot/performance.js');
    const json = async p => (await fetch(p)).json();
    const [storyText, visemes, beats, timing] = await Promise.all([
      fetch('/script.story').then(r=>r.text()),
      json('/config/visemes.json'), json('/config/song_beats.json'), json('/config/timing.json')]);
    c.story = parseStory(storyText);
    c.song = c.story.find(e=>e.text.includes('CafeDuet'));
    c.cues = {Girl: visemes.filter(x=>x.character==='Girl'), Boy: visemes.filter(x=>x.character==='Boy')};
    c.beats = beats; c.timing = timing;
    c.table = (await import('/performance.js')).performanceAt;
  }
  const r = window.renderAt(t); // 摆姿 + 渲染，之后骨骼 world 矩阵即本帧状态
  const abs = (window.audioStart ?? 0) + t, p = r.state;
  const isDance = abs >= c.song.start && abs < c.song.end;
  const cam = !isDance ? p.camera
    : p.mode === 'turn' ? {x:0, y:1.15, span:2.78}
    : c.table(abs, c.story, c.timing, c.cues, c.beats).camera;
  const span = cam.span * (isDance ? 1 - .012*Math.exp(-(p.beat%1)*8) * (Math.floor(p.beat)%4===0 ? 1 : .25) : 1);
  const W = context.width, H = context.height;
  const camera = new THREE.OrthographicCamera(-span*W/H/2, span*W/H/2, span/2, -span/2, .1, 30);
  camera.position.set(cam.x, cam.y + (isDance ? 0 : .45), 8);
  camera.lookAt(cam.x, cam.y, isDance ? 0 : -.9);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const round = x => Number(x.toFixed(6));
  const actors = {};
  for(const [name, a] of Object.entries(window.actors)){
    a.mesh.updateMatrixWorld(true);
    const pos = o => {const e = o.matrixWorld.elements; return [e[12], e[13], e[14]].map(round);};
    const bones = a.body?.bones ?? {};
    const world = {head: pos(a.bones.head), neck: pos(a.bones.neck)}; // 绘画头骨（CafeKid）
    for(const [joint, bone] of [['pelvis','hips'],['spine','spine'],['chest','spine2'],
      ['leftShoulder','leftarm'],['rightShoulder','rightarm'],
      ['leftElbow','leftforearm'],['rightElbow','rightforearm'],
      ['leftHand','lefthand'],['rightHand','righthand'],
      ['leftHip','leftupleg'],['rightHip','rightupleg'],
      ['leftKnee','leftleg'],['rightKnee','rightleg'],
      ['leftFoot','leftfoot'],['rightFoot','rightfoot'],
      ['leftToe','lefttoebase'],['rightToe','righttoebase']])
      if(bones[bone]) world[joint] = pos(bones[bone]);
    if(!c.jointList) c.jointList = Object.keys(world); // 实际读到的关节清单（写回 NOTES）
    const projected = Object.fromEntries(Object.entries(world).map(([k, v]) => {
      const q = new THREE.Vector3(...v).project(camera);
      return [k, [(q.x+1)*W/2, (1-q.y)*H/2].map(round)];
    }));
    const contacts = r.limbs?.[name]?.joints ?? {}; // screenSide 键：left=解剖右脚
    actors[name] = {
      root: pos(a.mesh), yaw: round(a.mesh.rotation.y),
      world, projected,
      contact: {left: contacts.right?.planted ?? null, right: contacts.left?.planted ?? null}, // 解剖学左右
      soles: (r.limbs?.[name]?.feet ?? []).map((f, i) => ({screen: i===0 ? 'left' : 'right',
        x: round(f.x), y: round(f.y), z: round(f.z), planted: f.planted ?? null}))
    };
  }
  const out = {t, actors, camera: {position: camera.position.toArray().map(round),
    quaternion: camera.quaternion.toArray().map(round), fov: null, orthoSpan: round(span), near: .1, far: 30}};
  if(Number.isFinite(p?.beat)){ out.beat = round(p.beat); out.mode = p.mode; } else out.mode = p?.mode ?? 'dialogue';
  return out;
}
