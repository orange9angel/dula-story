import * as THREE from 'three';
import {SceneBase} from 'dula-engine';
import {buildHomeProps} from '../home_props.js';

const material=color=>new THREE.MeshStandardMaterial({color,roughness:.83});
export class HomeKitchenScene extends SceneBase {
  constructor(){super('HomeKitchenScene');}
  build(){
    this.scene.background=new THREE.Color(0xf2ebdf);
    this.scene.add(new THREE.HemisphereLight(0xfffaf0,0xc4b6a0,1.45));
    const sun=new THREE.DirectionalLight(0xfff4df,2.2);
    sun.position.set(3,5,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-3,right:3,top:4,bottom:-2});
    sun.shadow.normalBias=.02;this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xe5efff,.55);fill.position.set(-3,2,2);this.scene.add(fill);
    const group=new THREE.Group();this.scene.add(group);
    const box=(w,h,d,color,x,y,z)=>{
      const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));o.position.set(x,y,z);
      o.castShadow=true;o.receiveShadow=true;group.add(o);return o;
    };
    // Continuous wooden floor, not a raised performance platform.
    const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=512;
    const p=texCanvas.getContext('2d');
    for(let row=0;row<8;row++){
      p.fillStyle=['#d7b58f','#dbbc98','#d2b08a','#dec29f'][row%4];p.fillRect(0,row*64,512,64);
      p.fillStyle='rgba(110,75,44,.17)';p.fillRect(0,row*64,512,1);
      for(let j=0;j<6;j++){p.fillStyle='rgba(120,85,50,.04)';p.fillRect(0,row*64+7+j*9,512,1);}
      p.fillStyle='rgba(110,75,44,.14)';p.fillRect(row%2?330:155,row*64,1,64);
    }
    const texture=new THREE.CanvasTexture(texCanvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,4);texture.anisotropy=4;
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(8,12),new THREE.MeshStandardMaterial({map:texture,roughness:.9}));
    this.floor.rotation.x=-Math.PI/2;this.floor.position.z=1;this.floor.receiveShadow=true;this.scene.add(this.floor);
    box(6,3.5,.10,0xf5ead7,0,1.72,-1.92);
    box(.10,3.5,4,0xe5e5d4,-2.85,1.72,-.05);
    box(6,.10,.05,0xe1ceb3,0,.05,-1.84);
    // Family kitchen cabinets, worktop and a refrigerator at the left.
    box(2.45,.77,.54,0xa9c5bb,.39,.405,-1.47);
    box(2.52,.065,.61,0xf2e5d1,.39,.82,-1.45);
    for(const x of [-.43,.17,.77,1.37]){
      box(.56,.62,.025,0xb9d2c6,x,.42,-1.182);
      box(.11,.025,.03,0x9f9c88,x+.12,.66,-1.156);
    }
    box(.73,1.88,.61,0xe8e7da,-1.36,.95,-1.43);
    box(.68,.46,.022,0xf7f4e9,-1.36,1.59,-1.112);
    box(.68,1.19,.022,0xf3f0e6,-1.36,.72,-1.112);
    box(.022,.23,.036,0x9faea8,-1.09,1.57,-1.09);box(.022,.32,.036,0x9faea8,-1.09,1.03,-1.09);
    box(.18,.23,.008,0xffefbc,-1.44,1.42,-1.087);
    box(.025,.025,.012,0xdd8674,-1.44,1.535,-1.075);
    // Rectangular daylight window, sill and a domestic sink.
    box(1.25,.92,.024,0xc2dfee,.72,1.66,-1.855);
    for(const x of [.07,1.37])box(.065,1.06,.065,0xfffbef,x,1.66,-1.82);
    for(const y of [1.16,2.16])box(1.37,.065,.065,0xfffbef,.72,y,-1.82);
    box(.042,1,.07,0xfffbef,.72,1.66,-1.79);
    box(1.49,.065,.20,0xf7ebd8,.72,1.13,-1.76);
    box(.43,.014,.30,0x829d9a,.77,.861,-1.44);
    box(.36,.016,.24,0x5d7778,.77,.869,-1.44);
    const tap=new THREE.Mesh(new THREE.TorusGeometry(.075,.012,10,24,Math.PI),material(0xaebbb9));
    tap.position.set(.79,.985,-1.58);group.add(tap);box(.024,.11,.024,0xaebbb9,.715,.93,-1.58);
    // A small shelf, mugs, jars and a houseplant make the room lived-in.
    box(.65,.045,.18,0xb59370,-.37,1.53,-1.77);
    for(const [x,color] of [[-.56,0xe6ad93],[-.32,0x90b8c2]]){
      const mug=new THREE.Mesh(new THREE.CylinderGeometry(.047,.043,.095,24),material(color));mug.position.set(x,1.60,-1.72);group.add(mug);
      const handle=new THREE.Mesh(new THREE.TorusGeometry(.031,.009,8,20),material(color));handle.position.set(x+.047,1.61,-1.72);group.add(handle);
    }
    for(const [x,r,h,color] of [[-.42,.07,.15,0xe7c88b],[-.19,.065,.19,0xdcae8e]]){
      const jar=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),material(color));jar.position.set(x,.855+h/2,-1.48);group.add(jar);
      const lid=new THREE.Mesh(new THREE.CylinderGeometry(r+.004,r+.004,.022,24),material(0xb79a76));lid.position.set(x,.866+h,-1.48);group.add(lid);
    }
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.07,.05,.11,24),material(0xc98b6f));pot.position.set(1.20,1.21,-1.71);group.add(pot);
    for(let i=0;i<5;i++){
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(.08,16,12),material(i%2?0x7ca48a:0x91b096));
      leaf.scale.set(.4,1,.18);leaf.position.set(1.2+.038*Math.sin(i*2),1.34,-1.70);leaf.rotation.z=(i-2)*.35;group.add(leaf);
    }
    this.registerCameraObstacle({type:'box',center:new THREE.Vector3(0,1.72,-1.92),size:new THREE.Vector3(6,3.5,.1)});
    this.registerCameraObstacle({type:'box',center:new THREE.Vector3(.39,.405,-1.47),size:new THREE.Vector3(2.45,.77,.54)});
    return this.scene;
  }
  initializeHome(cat){
    this.home=buildHomeProps(this.scene,cat);this.emptyDish=this.home.dish;this.crumbs=this.home.evidence;
    this.dishes=this.home.plates;this.mochiHead=cat.headGroup;return this.home;
  }
}
