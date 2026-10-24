import './viewer_palace.js';
import * as THREE from 'three';
import {createPaintedBackplateStage} from './assets3d/art_pass_runtime/painted-backplate-stage.js';
import {createParticleEffectsStage} from './assets3d/art_pass_runtime/particle-effects-stage.js';
import {particleCloud,combustionBurst,hearthFire} from 'dula-assets/lib/craft3d/combustion-particles.js';
import {prepareFirePlate,environmentFires,restoreLampBars} from './config/painted_environment_r2.js';
window.ready=false;
const {scene,actors,camera,renderer}=window.__dbg,W=1280,H=720;
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
const [paint,clean]=await Promise.all([load('./assets3d/art_pass_r2/background.png'),load('./assets3d/art_pass_full_r2/background_flames_removed.png')]);
const plate=prepareFirePlate(paint,clean),bg=document.createElement('canvas');bg.width=W;bg.height=H;const bgctx=bg.getContext('2d');
const particleRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});particleRenderer.setSize(W,H);particleRenderer.outputColorSpace=THREE.SRGBColorSpace;
const particles=createParticleEffectsStage({THREE,renderer:particleRenderer,particleCloud,combustionBurst,hearthFire,width:W,height:H});
const stage=createPaintedBackplateStage({THREE,scene:scene.scene,actors:Object.values(actors),canvas:bg,shadowOpacity:.30});
const output=document.querySelector('body > canvas'),ctx=output.getContext('2d'),rect=[0,0,W,H],view={cx:640,cy:360,z:1};
const sourceStep=window.stepAt;
window.setFreeCamera({pos:[.5,1.7,5.1],lookAt:[.5,1.4,-1.0],fov:43});
window.renderAt=t=>{
 // Settle source world-space portrait caches at this exact time before capture.
 sourceStep(t);const state=sourceStep(t);
 bgctx.drawImage(plate,...rect);particles.drawFire(bgctx,t,view,environmentFires(plate,rect));restoreLampBars(bgctx,plate,rect);
 stage.update();renderer.render(scene.scene,camera);renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
 state.route='original 3D characters / fixed painted scene';
 return{image:output.toDataURL('image/png').split(',')[1],state};
};
window.ready=true;
