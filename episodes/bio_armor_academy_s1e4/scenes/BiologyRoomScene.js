import * as THREE from 'three';
import {SceneBase} from 'dula-engine';
import {mesh,mat} from 'dula-assets/lib/craft3d/surface.js';
const E=['ShowRight','ShowLeft','TestMark','ObserveMark','TryAgain','StopTrying','QuietLeaf','ReleaseHand'];
export class BiologyRoomScene extends SceneBase {
  constructor(){super('BiologyRoomScene');this.solids=[];this.cues={};}
  build(){
    const s=this.scene;s.background=new THREE.Color('#dce8dd');
    const box=(name,pos,size,color)=>{const o=mesh(s,new THREE.BoxGeometry(...size),color,false);o.position.set(...pos);o.name=name;this.solids.push(o);return o;};
    box('floor',[0,-.07,0],[9,.14,8],'#c6c3af');
    box('rear_wall',[0,1.7,-2.8],[9,3.4,.16],'#dadcbe');
    box('wall_band',[0,.58,-2.69],[9,1.16,.04],'#7f9a89');
    box('counter_top',[0,.92,-1.9],[5.6,.08,.66],'#ab9272');
    for(const x of [-2.5,2.5])box(`counter_leg_${x}`,[x,.43,-1.9],[.09,.86,.5],'#5a7165');
    box('cabinet',[-3.65,1.02,-2.1],[1.1,2.04,.62],'#6c8a7e');
    const obstacle=name=>{const b=new THREE.Box3().setFromObject(s.getObjectByName(name));return {type:'box',center:b.getCenter(new THREE.Vector3()),size:b.getSize(new THREE.Vector3())};};
    this.registerCameraObstacle(obstacle('rear_wall'));
    this.registerCameraObstacle(obstacle('counter_top'));
    this.registerCameraObstacle(obstacle('cabinet'));
    for(const y of [.55,1.12,1.72])box(`shelf_${y}`,[-3.65,y,-1.75],[.94,.04,.035],'#dccfa5');
    // Window is a bright inset above the counter, with a genuine opening between jambs.
    box('window_sky',[1.4,2.08,-2.69],[3.25,1.58,.02],'#c7e4df');
    for(const x of [-.25,1.4,3.05])box(`window_vertical_${x}`,[x,2.08,-2.64],[.04,1.66,.07],'#718e83');
    for(const y of [1.26,2.9])box(`window_horizontal_${y}`,[1.4,y,-2.64],[3.34,.04,.07],'#718e83');
    const label=(text,pos,w,h)=>{const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');
      g.fillStyle='#eee7cf';g.fillRect(0,0,768,192);g.fillStyle='#36564d';g.font='bold 66px "Microsoft YaHei"';g.textAlign='center';g.textBaseline='middle';g.fillText(text,384,96);
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));o.position.set(...pos);s.add(o);};
    label('青岚学舍 · 生物部',[-1.6,2.25,-2.69],1.8,.45);
    // A small jar holds a leaf, completely beyond both characters' reachable volumes.
    const jar=new THREE.Group();jar.name='leaf_jar';jar.position.set(1.8,.96,-1.78);s.add(jar);this.jar=jar;this.solids.push(jar);
    const glass=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.32,32,1,true),new THREE.MeshBasicMaterial({color:'#93c5b7',transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false}));
    glass.position.y=.16;jar.add(glass);
    for(const y of [.01,.32]){const r=new THREE.Mesh(new THREE.TorusGeometry(.13,.008,8,32),mat('#7f9e8f'));r.rotation.x=Math.PI/2;r.position.y=y;jar.add(r);}
    const stem=mesh(jar,new THREE.CylinderGeometry(.004,.004,.24,8),'#5f805b',false);stem.position.y=.13;
    this.leaf=mesh(jar,new THREE.SphereGeometry(1,20,12),'#6c9a67',false);this.leaf.scale.set(.078,.038,.009);this.leaf.position.set(.034,.20,.018);this.leaf.rotation.z=.4;
    label('叶 片 采 样',[1.8,1.07,-1.62],.32,.08);
    const hemi=new THREE.HemisphereLight('#eaf8ed','#929073',2.2);s.add(hemi);
    const sun=new THREE.DirectionalLight('#fff1c8',2);sun.position.set(3,5,4);s.add(sun);
    this.readyPromise=Promise.resolve();return s;
  }
  // Event methods also serve the normal scene dispatch contract.
  cue(name){this.latestCue=name;this.cues[name]=this._sceneTime;}
  showRight(){this.cue('ShowRight');}
  showLeft(){this.cue('ShowLeft');}
  testMark(){this.cue('TestMark');}
  observeMark(){this.cue('ObserveMark');}
  tryAgain(){this.cue('TryAgain');}
  stopTrying(){this.cue('StopTrying');}
  quietLeaf(){this.cue('QuietLeaf');}
  releaseHand(){this.cue('ReleaseHand');}
  sample(t,timeline){
    this.cues={};this.latestCue='none';
    for(const seg of timeline.segments)if(seg.start<=t)for(const event of seg.events){
      if(!E.includes(event.type))throw new Error(`Unimplemented story event ${event.type}`);
      this._sceneTime=seg.start;this[event.type[0].toLowerCase()+event.type.slice(1)]();
    }
    this.leaf.rotation.z=.4+.025*Math.sin(t*.9);return this.cues;
  }
}
