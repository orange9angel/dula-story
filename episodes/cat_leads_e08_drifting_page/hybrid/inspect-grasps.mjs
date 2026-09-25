import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4200/hybrid/viewer.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready===true');
  const captures=await page.evaluate(async()=>{
    const THREE=await import('three'),{EpisodeScene}=await import('./scene.js'),{penLocal,worldPoint}=await import('./performance.js');
    const scene=new EpisodeScene(window.plan),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(1280,720);renderer.outputColorSpace=THREE.SRGBColorSpace;
    const camera=new THREE.PerspectiveCamera(35,1280/720,.01,100),V=(x,y,z)=>new THREE.Vector3(x,y,z),out=[];
    for(const [name,t,kind,offset] of [
      ['pen_top',42.76,'pen',[.04,.40,.06]],['pen_thumb',42.76,'pen',[-.30,.18,.22]],['pen_back',42.76,'pen',[.28,.20,.23]],
      ['paper_front',49.5,'paper',[.05,.03,.45]],['paper_back',49.5,'paper',[-.10,.04,-.45]],['paper_side',49.5,'paper',[.42,.08,.04]],['handoff',47,'paper',[.05,.03,.70]]
    ]){
      camera.position.set(0,2,3);const state=scene.update(t,camera);
      const target=kind==='pen'?worldPoint(state.boy,penLocal(state.boy,t,window.plan).grip):scene.girl.hands.left.getWorldPosition(V(0,0,0)).add(V(0,.055,0));
      const delta=V(...offset);if(kind==='paper')delta.applyAxisAngle(V(0,1,0),state.girl.yaw);
      camera.position.copy(target).add(delta);camera.lookAt(target);camera.updateMatrixWorld(true);scene.update(t,camera);renderer.render(scene.scene,camera);
      const kid=kind==='pen'?scene.boy:scene.girl,side=kind==='pen'?'right':'left',pose=kind==='pen'?state.boy:state.girl;
      const arm=pose[side+'Arm'],hand=kid.hands[side],forearm=V(arm[2].x-arm[1].x,arm[2].y-arm[1].y,arm[2].z-arm[1].z).normalize();
      const handForward=V(1,0,0).applyQuaternion(hand.quaternion);
      out.push({name,t,character:kid.kind,side,wristAngle:forearm.angleTo(handForward)*180/Math.PI,girlError:state.girl.leftGripError,boyError:state.boy.leftGripError,data:renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1]});
    }
    return out;
  });
  for(const c of captures)fs.writeFileSync(path.join(here,`storyboard/grasp_${c.name}.jpg`),Buffer.from(c.data,'base64'));
  const metrics=captures.map(({data,...c})=>c);fs.writeFileSync(path.join(here,'storyboard/grasp_views.json'),JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
}finally{await browser.close();}
