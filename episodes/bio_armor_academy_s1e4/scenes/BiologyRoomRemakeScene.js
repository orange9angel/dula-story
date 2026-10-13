import * as THREE from 'three';
import {SceneBase} from 'dula-engine';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
const EVENTS=['EnterRoom','HideMark','ShowLeft','PressMark','Warning','ForceRetract','StopTrying','QuietLeaf','UnclenchAndShowMark','OfferJar','TakeJarWithMarkedHand','Reassure','StudyLeafTogether'];
export const TABLE_TOP=1.005;
export class BiologyRoomScene extends SceneBase {
  constructor(){super('BiologyRoomScene');this.solids=[];this.cues={};this.interactionSolids=[];}
  build(){
    const s=this.scene;s.background=new THREE.Color('#d8d4bd');
    const ramp=coolShadowRamp(),mat=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
    const box=(name,pos,size,color,parent=s,solid=false)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color));
      o.name=name;o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(solid)this.solids.push(o);return o;};
    const floor=box('floor',[0,-.07,0],[9,.14,8],'#aa9476',s,true);
    const grain=document.createElement('canvas');grain.width=512;grain.height=512;const g=grain.getContext('2d');
    g.fillStyle='#b19e80';g.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=64){g.fillStyle=y%128?'#b9a88a':'#ae9b7c';g.fillRect(0,y,512,63);
      g.fillStyle='rgba(66,58,45,.16)';g.fillRect(0,y,512,1);g.fillRect(y%128?170:340,y,1,64);}
    for(let i=0;i<85;i++){g.strokeStyle=`rgba(74,58,40,${.018+(i%5)*.006})`;g.beginPath();g.moveTo((i*97)%512,(i*43)%512);g.lineTo((i*97)%512+70+(i%4)*30,(i*43)%512+.7);g.stroke();}
    const wood=new THREE.CanvasTexture(grain);wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(6,6);floor.material.map=wood;floor.material.color.set('#dad3c0');
    const wall=box('rear_wall',[0,2.13,-1.56],[6.4,4.26,.10],'#d6d1b5',s,true);
    box('left_wall',[-3.25,1.7,.3],[.1,3.4,4],'#a8ad8c',s,true);
    box('right_wall',[3.25,1.7,.3],[.1,3.4,4],'#cdc4a3',s,true);
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(6.4,4.2667),new THREE.MeshBasicMaterial({color:'#ffffff'}));
    plate.position.set(0,2.1333,-1.502);s.add(plate);this.backdrop=plate;
    this.readyPromise=new THREE.TextureLoader().loadAsync('./assets3d/textures/biology_wall_r3.png').then(tex=>{
      tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;plate.material.map=tex;plate.material.needsUpdate=true;
    });
    box('back_counter',[1.33,.87,-1.20],[2.8,.08,.44],'#806441');
    for(const x of [.12,2.56])box('back_counter_leg',[x,.42,-1.2],[.065,.84,.32],'#5d664f');
    const table=box('work_table',[0,TABLE_TOP-.035,.485],[2.5,.07,.53],'#a58557');
    const tableGrain=wood.clone();tableGrain.repeat.set(1.8,.6);tableGrain.needsUpdate=true;
    table.material.map=tableGrain;table.material.color.set('#b4a17d');
    this.interactionSolids.push(table);this.table=table;
    box('table_front_rim',[0,TABLE_TOP-.075,.755],[2.51,.08,.035],'#695342');
    for(const x of [-1.06,1.06])for(const z of [.30,.66])box('work_table_leg',[x,.47,z],[.055,.94,.055],'#56665c',s,true);
    // A thin botanical notebook is anchored to Aoi's right hand in viewer.js.
    const note=new THREE.Group();note.name='field_notebook';this.notebook=note;s.add(note);
    box('notebook_cover',[0,0,0],[.17,.012,.23],'#4d7064',note);
    box('notebook_paper',[0,.008,0],[.155,.01,.212],'#eee5cc',note);
    const leafDrawing=new THREE.Mesh(new THREE.PlaneGeometry(.12,.17),new THREE.MeshBasicMaterial({map:this.makeNotebookPage(),transparent:true}));
    leafDrawing.rotation.x=-Math.PI/2;leafDrawing.position.y=.014;note.add(leafDrawing);
    // Small, real glass jar and living leaf. Its base has a single authoritative support height.
    const jar=new THREE.Group();jar.name='leaf_jar';this.jar=jar;s.add(jar);
    const glass=new THREE.Mesh(new THREE.CylinderGeometry(.066,.063,.22,32,1,true),new THREE.MeshPhysicalMaterial({
      color:'#cee5dc',transparent:true,opacity:.20,roughness:.24,metalness:0,side:THREE.DoubleSide,depthWrite:false}));
    glass.position.y=.11;jar.add(glass);
    for(const y of [.004,.22]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.064,.0034,8,32),mat('#90b8ab'));ring.rotation.x=Math.PI/2;ring.position.y=y;jar.add(ring);}
    const water=new THREE.Mesh(new THREE.CylinderGeometry(.061,.060,.033,24),new THREE.MeshBasicMaterial({color:'#6da99b',transparent:true,opacity:.24,depthWrite:false}));water.position.y=.02;jar.add(water);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.0024,.0028,.205,8),mat('#567847'));stem.position.y=.114;stem.rotation.z=-.10;jar.add(stem);
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-.061,.046,0,.105);shape.quadraticCurveTo(.052,.065,0,0);
    const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape,20),new THREE.MeshToonMaterial({color:'#618b4b',gradientMap:ramp,side:THREE.DoubleSide}));
    leaf.position.set(.002,.102,.012);leaf.rotation.z=-.48;jar.add(leaf);this.leaf=leaf;
    const vein=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,.001),new THREE.Vector3(0,.09,.001)]),new THREE.LineBasicMaterial({color:'#b3c68a'}));leaf.add(vein);
    // A separate paper label is visibly for the leaf, not for Lei.
    const label=box('specimen_label',[.4,TABLE_TOP+.004,.63],[.19,.006,.07],'#e9dfbf');this.specimenLabel=label;
    // Layered foreground plants retain parallax against the generated wall artwork.
    const plant=(x,z,scale)=>{const root=new THREE.Group();root.position.set(x,0,z);root.scale.setScalar(scale);s.add(root);
      const pot=new THREE.Mesh(new THREE.CylinderGeometry(.18,.12,.27,16),mat('#966e50'));pot.position.y=.135;pot.castShadow=true;root.add(pot);
      for(let i=0;i<8;i++){const angle=i*2.399,height=.26+(i%4)*.07;const l=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat(i%2?'#607c50':'#748e57'));
        l.scale.set(.045,.16,.014);l.position.set(Math.sin(angle)*.11,height,Math.cos(angle)*.11);l.rotation.set(.15*Math.sin(angle),angle,-Math.sin(angle)*.5);root.add(l);}
      return root;};
    this.plants=[plant(-2.05,-.93,1.1),plant(2.22,-.86,1.4)];
    const hemi=new THREE.HemisphereLight('#fff6df','#879486',1.7);s.add(hemi);
    const sun=new THREE.DirectionalLight('#fff0ce',1.7);sun.position.set(3.6,6,4);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:4,bottom:-3,near:.1,far:16});sun.shadow.bias=-.00025;sun.shadow.normalBias=.012;sun.shadow.intensity=.36;s.add(sun);
    const fill=new THREE.DirectionalLight('#cddfe0',.65);fill.position.set(-3,2,3);s.add(fill);
    // Sun patches are on the floor rather than a screen overlay.
    const patch=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),new THREE.MeshBasicMaterial({color:'#f8e3a0',transparent:true,opacity:.15,depthWrite:false}));
    patch.rotation.x=-Math.PI/2;patch.rotation.z=.27;patch.position.set(1.55,.002,.18);s.add(patch);
    const obstacles=this.solids.filter(o=>o.name!=='floor').map(o=>{const b=new THREE.Box3().setFromObject(o);return {type:'box',center:b.getCenter(new THREE.Vector3()),size:b.getSize(new THREE.Vector3())};});
    this.registerCameraObstacle(obstacles[0]);
    this.registerCameraObstacle(obstacles[1]);
    this.registerCameraObstacle(obstacles[2]);
    this.registerCameraObstacle(obstacles[3]);
    this.registerCameraObstacle(obstacles[4]);
    this.registerCameraObstacle(obstacles[5]);
    this.registerCameraObstacle(obstacles[6]);
    return s;
  }
  makeNotebookPage(){const c=document.createElement('canvas');c.width=256;c.height=360;const g=c.getContext('2d');
    g.fillStyle='#eee5cc';g.fillRect(0,0,256,360);g.strokeStyle='#778664';g.lineWidth=3;g.beginPath();g.moveTo(118,265);g.lineTo(133,95);g.stroke();
    for(let i=0;i<5;i++){g.beginPath();g.ellipse(125+(i%2?24:-22),120+i*26,29,11,i%2?-.55:.55,0,Math.PI*2);g.stroke();}
    g.strokeStyle='#b7aa8e';g.lineWidth=2;for(let y=298;y<345;y+=15){g.beginPath();g.moveTo(30,y);g.lineTo(215,y);g.stroke();}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
  cue(name){this.latestCue=name;this.cues[name]=this._sceneTime;}
  enterRoom(){this.cue('EnterRoom');}
  hideMark(){this.cue('HideMark');}
  showLeft(){this.cue('ShowLeft');}
  pressMark(){this.cue('PressMark');}
  warning(){this.cue('Warning');}
  forceRetract(){this.cue('ForceRetract');}
  stopTrying(){this.cue('StopTrying');}
  quietLeaf(){this.cue('QuietLeaf');}
  unclenchAndShowMark(){this.cue('UnclenchAndShowMark');}
  offerJar(){this.cue('OfferJar');}
  takeJarWithMarkedHand(){this.cue('TakeJarWithMarkedHand');}
  reassure(){this.cue('Reassure');}
  studyLeafTogether(){this.cue('StudyLeafTogether');}
  sample(t,timeline){this.cues={};this.latestCue='none';for(const seg of timeline.segments)if(seg.start<=t)for(const event of seg.events){
    if(!EVENTS.includes(event.type))throw new Error(`Unimplemented story event ${event.type}`);this._sceneTime=seg.start;this.cue(event.type);}
    this.leaf.rotation.z=-.48+.018*Math.sin(t*.8);return this.cues;}
}
