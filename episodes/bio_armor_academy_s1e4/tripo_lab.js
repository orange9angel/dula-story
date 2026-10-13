import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {computeMikkTSpaceTangents} from 'three/addons/utils/BufferGeometryUtils.js';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
await MikkTSpace.ready;
const params=new URLSearchParams(location.search),both=params.get('actors')==='both';
const selectedSource=params.get('source')||'lod160k';
const staticSource=selectedSource==='original';
const lodSource=selectedSource==='lod160k';
if(params.has('capture'))document.body.classList.add('capture');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#eeeae1');
scene.add(new THREE.HemisphereLight('#f5f7ff','#b8afa0',2));
const key=new THREE.DirectionalLight('#fff1d9',2.5);key.position.set(2.8,5,4);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;key.shadow.bias=-.00015;scene.add(key);
const fill=new THREE.DirectionalLight('#d7e6ff',1.1);fill.position.set(-4,2,2);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#ddd9cc',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.PerspectiveCamera(31,innerWidth/innerHeight,.02,100);camera.position.set(0,1.08,both?4.9:4.0);camera.lookAt(0,.88,0);
const loader=new GLTFLoader(),actors=[];
const normal=n=>n.replace(/[^a-z]/gi,'').toLowerCase().replace(/^mixamorig/,'');
function aim(bone,child,target){
  scene.updateMatrixWorld(true);
  const origin=bone.getWorldPosition(new THREE.Vector3()),old=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const desired=target.clone().sub(origin).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(old,desired).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  scene.updateMatrixWorld(true);
}
async function loadActor(id,height,x){
  const walk=await loader.loadAsync(`./assets3d/tripo_${id}_trial/${id}_h31_${staticSource?'original_v1':lodSource?'lod160k_v2':'walk_v1'}.glb`);
  // The skeleton-only export's JOINTS_0 assigns 24733/24736 vertices to Hips.
  // Use the animated export, whose limb weights were actually verified.
  const neutral=clone(walk.scene);neutral.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();});neutral.updateMatrixWorld(true);
  const entry={id,height,x,rig:neutral,walk:walk.scene,clips:walk.animations,bones:{},rest:[],metrics:{}};
  neutral.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
  const box=new THREE.Box3().setFromObject(neutral),size=box.getSize(new THREE.Vector3()),scale=height/size.y;
  const center=box.getCenter(new THREE.Vector3());
  for(const root of [entry.rig,entry.walk]){
    // Both exports use the same source coordinates. Never rescale the walk from
    // a bent-knee animation frame: that enlarges it and crops the feet.
    root.scale.multiplyScalar(scale);root.position.set(x-center.x*scale,-box.min.y*scale,-center.z*scale);
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const m=o.material;m.userData.originalNormal=m.normalMap;m.userData.originalRoughness=m.roughnessMap;m.userData.originalMetalness=m.metalnessMap;m.map.anisotropy=renderer.capabilities.getMaxAnisotropy();}if(o.isBone&&root===entry.rig){entry.bones[normal(o.name)]=o;entry.rest.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone()]);}if(o.isBone&&root===entry.walk&&normal(o.name)==='hips')entry.walkHips=o;});
    scene.add(root);
  }
  entry.mixer=new THREE.AnimationMixer(entry.walk);if(entry.clips[0])entry.mixer.clipAction(entry.clips[0]).play();
  entry.mixer.setTime(0);entry.walkOrigin=entry.walkHips?.position.clone();
  entry.metrics={boneNames:Object.keys(entry.bones),clips:entry.clips.map(c=>({name:c.name,duration:c.duration})),height,sourceHeight:size.y,scale};
  actors.push(entry);return entry;
}
function renderAt(t){
  for(const a of actors){
    a.rig.visible=staticSource||t<3.5||t>=8.5;a.walk.visible=!staticSource&&t>=3.5&&t<8.5;
    for(const [bone,pos,q,s] of a.rest){bone.position.copy(pos);bone.quaternion.copy(q);bone.scale.copy(s);}
    a.rig.rotation.y=t<3.5?Math.PI*2*t/3.5:0;a.walk.rotation.y=0;
    if(a.walk.visible){a.mixer.setTime(t-3.5);if(a.walkHips){a.walkHips.position.x=a.walkOrigin.x;a.walkHips.position.z=a.walkOrigin.z;}}
    if(t>=8.5){
      const u=(t-8.5)/3.5,s=Math.sin(Math.PI*u)**2;
      scene.updateMatrixWorld(true);
      const arm=a.bones.rightarm,fore=a.bones.rightforearm,hand=a.bones.righthand;
      if(arm&&fore&&hand){
        const p=arm.getWorldPosition(new THREE.Vector3()),e=fore.getWorldPosition(new THREE.Vector3()),w=hand.getWorldPosition(new THREE.Vector3());
        const sign=Math.sign(p.x-a.x)||-1,l1=p.distanceTo(e),l2=e.distanceTo(w);
        const target=w.clone().lerp(p.clone().add(new THREE.Vector3(sign*.17,-.14,.28)),s);
        if(p.distanceTo(target)>l1+l2-.001)target.sub(p).setLength(l1+l2-.001).add(p);
        // twoBone takes a bend direction, not a world-space pole point.
        const pole=new THREE.Vector3(sign*.45,-1,.1);
        const elbow=twoBone(p,target,pole,l1,l2);
        aim(arm,fore,new THREE.Vector3(elbow.x,elbow.y,elbow.z));aim(fore,hand,target);
      }
      const head=a.bones.head;if(head)head.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.05*s,.28*Math.sin(u*Math.PI*2),0)));
    }
  }
  document.querySelector('#phase').textContent=t<3.5?'转面检查':t<8.5?'导出的走路动作':'本地抬手与转头控制';
  scene.updateMatrixWorld(true);renderer.render(scene,camera);
  return {t,phase:t<3.5?'turntable':t<8.5?'walk':'local_ik',actors:actors.map(a=>({id:a.id,...a.metrics}))};
}
window.renderAt=renderAt;window.duration=12;
window.labConfigure=({normalStrength=1,normalY=1,flatRoughness=false,closeup=false,exposure=1.05,tangents=false}={})=>{
  for(const a of actors)for(const root of [a.rig,a.walk])root.traverse(o=>{if(o.isMesh){o.userData.originalGeometry??=o.geometry;if(tangents){o.userData.tangentGeometry??=computeMikkTSpaceTangents(o.userData.originalGeometry.clone(),MikkTSpace);o.geometry=o.userData.tangentGeometry;}else o.geometry=o.userData.originalGeometry;}});
  for(const a of actors)for(const root of [a.rig,a.walk])root.traverse(o=>{if(o.isMesh){const m=o.material;m.normalMap=normalStrength===0?null:m.userData.originalNormal;m.normalScale?.set(normalStrength,normalStrength*normalY);m.roughnessMap=flatRoughness?null:m.userData.originalRoughness;m.metalnessMap=flatRoughness?null:m.userData.originalMetalness;m.roughness=flatRoughness?.85:1;m.metalness=flatRoughness?0:1;m.needsUpdate=true;}});
  renderer.toneMappingExposure=exposure;
  camera.position.set(0,closeup?1.50:1.08,closeup?1.0:(both?4.9:4));camera.lookAt(0,closeup?1.46:.88,0);
};
try{await loadActor('aoi',1.65,both?-.65:0);if(both)await loadActor('lei',1.78,.65);renderAt(0);window.ready=true;}catch(e){document.querySelector('#note').textContent=e.message;console.error(e);window.loadError=e.message;}
let playing=!params.has('capture'),start=performance.now();
document.querySelector('#play').onclick=()=>{playing=!playing;start=performance.now()-Number(document.querySelector('#time').value)*1000;};
document.querySelector('#time').oninput=e=>{playing=false;renderAt(Number(e.target.value));};
function frame(now){if(playing&&window.ready){const t=((now-start)/1000)%12;document.querySelector('#time').value=t;renderAt(t);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
