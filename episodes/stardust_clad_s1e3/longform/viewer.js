import * as THREE from 'three';
import {createWindwardCast} from 'dula-assets/characters/stardust/windward-cast.js';
import {WindwardStage} from './stage.js';
import {createSceneAdapters} from './scenes.js';
import {applyPose,updateFace,ease,mix,clamp} from './pose.js';
import {createPerformance,CAST_NAMES} from './performance.js';
import {createStoryProps} from './props.js';
import {createCinematography} from './cinematography.js';
import {createEffects} from './effects.js';
const W=1280,H=720,V=a=>new THREE.Vector3(...a),params=new URLSearchParams(location.search);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const stage=new WindwardStage();await stage.load();
const sceneAdapters=createSceneAdapters(stage);
const {actors}=await createWindwardCast(renderer,'../assets3d/tex/armor_engraved_r20.png');
for(const a of Object.values(actors))stage.scene.add(a.mesh);
const [timeline,envelopes]=await Promise.all(['timeline','voice_envs'].map(f=>fetch(`./config/${f}.json`).then(r=>r.json())));
const performance=createPerformance(actors,timeline,envelopes);
const props=await createStoryProps(stage,actors,renderer,'../assets3d/tex/armor_engraved_r20.png');
const cinematography=createCinematography(actors,stage,props),effects=createEffects(stage,actors,performance);
const camera=new THREE.PerspectiveCamera(36,W/H,.04,140);
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');let free=null;
function pose(t){
 const state=performance.sample(t),traces={};
 const sceneAdapter=sceneAdapters[state.beat.scene].bindState(state,timeline.duration);
 if(state.action)sceneAdapter.action();else sceneAdapter.act();
 for(const[name,a]of Object.entries(actors)){
  const s=state.states[name];a.mesh.visible=s.visible&&!state.story.cutaway;if(s.visible)traces[name]=applyPose(a,s);
 }
 for(const[name,a]of Object.entries(actors)){
  const s=state.states[name];if(!s.visible)continue;
  const target=s.target?actors[s.target].headGroup.getWorldPosition(new THREE.Vector3()):V([0,1.6,4]);
  updateFace(a,s,t,s.jaw??0,target);
 }
 stage.scene.updateMatrixWorld(true);state.traces=traces;return state;
}
const contactAnchors={};
for(const e of performance.eventTimes.impacts){
 pose(e.time);contactAnchors[e.id]=(e.type==='kick'?actors[e.attacker].feet[e.side??'right'].localToWorld(V([0,0,.10])):actors[e.attacker].hands[e.side??'right'].localToWorld(V([.065,0,0]))).toArray();
}
effects.setImpacts(contactAnchors);
const locations={market:'风铃渡',courtyard:'风筛庭',store:'旧索仓',greenhouse:'暖芽温室',bridge:'折翼桥',windwell:'风井'};
const roleColors={xiaozao:'#e2f0f4',jianwang:'#dbcee9',weihe:'#f1d3b4',yabo:'#dfd5b5',mideng:'#d3e8dd'};
function wrap(text,maxWidth){
 const lines=[];let row='';
 for(const c of text){if(ctx.measureText(row+c).width>maxWidth){lines.push(row);row=c;}else row+=c;}
 if(row)lines.push(row);return lines;
}
function overlay(state){
 ctx.save();ctx.textBaseline='alphabetic';
 const {beat,lt,bt,t,n,spoken}=state;
 const shade=ctx.createRadialGradient(640,330,300,640,330,780);shade.addColorStop(0,'rgba(12,19,28,0)');shade.addColorStop(1,'rgba(12,19,28,.13)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#10151c';ctx.fillRect(0,0,W,29);ctx.fillRect(0,H-29,W,29);
 if(spoken&&!params.has('no-subtitles')){
  ctx.font='500 25px Microsoft YaHei';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  const rows=wrap(spoken.text,1060),base=H-64-(rows.length-1)*29;
  ctx.fillStyle=roleColors[spoken.speaker]??'#fff';ctx.strokeStyle='rgba(10,17,22,.9)';ctx.lineWidth=4.5;
  rows.forEach((line,i)=>{ctx.strokeText(line,640,base+i*29);ctx.fillText(line,640,base+i*29);});
 }
 if(lt<3.5&&[1,2,7,9,14].includes(n)){
  ctx.globalAlpha=ease(lt/.7)*(1-ease((lt-2.5)/1));ctx.textAlign='left';ctx.fillStyle='#e3e3d2';ctx.font='24px Microsoft YaHei';ctx.fillText(locations[beat.scene],68,93);ctx.globalAlpha=1;
 }
 if(n===6&&lt<5.0){
  ctx.globalAlpha=ease(lt/.7)*(1-ease((lt-4)/1));ctx.textAlign='center';ctx.fillStyle='#f3eee0';ctx.shadowColor='#172633';ctx.shadowBlur=8;
  ctx.font='24px Microsoft YaHei';ctx.fillText('星 屑 战 壳   第 三 集',640,214);ctx.font='54px STKaiti, KaiTi, Microsoft YaHei';ctx.fillText('借 风 的 人',640,291);ctx.shadowBlur=0;ctx.globalAlpha=1;
 }
 if(n===49){
  const cards=[
   ['星屑战壳 · 借风的人','风筛宫篇'],['人物','小凿  /  苇禾  /  缄网','崖伯  /  弥灯'],
   ['剧本 · 场景 · 角色 · 动作','Dula 制作工作流'],['角色对白','Volcano Seed TTS'],
   ['环境与动作声音','Volcano Seed-Audio'],['本集原创配乐','Suno'],
   ['制作与审片','Codex · Dula skills'],['风停过，路还要继续修。','第三集  完']
  ];
  const index=Math.min(cards.length-1,Math.floor(lt/(bt/cards.length))),rows=cards[index],age=lt%(bt/cards.length),alpha=ease(age/.7)*(1-ease((age-bt/cards.length+1)/1));
  ctx.globalAlpha=.68;ctx.fillStyle='#14222b';ctx.fillRect(820,29,460,H-58);ctx.globalAlpha=alpha;ctx.textAlign='center';
  rows.forEach((row,i)=>{ctx.fillStyle=i===0?'#cfbf9f':'#f0e9d8';ctx.font=`${i===0?21:25}px Microsoft YaHei`;ctx.fillText(row,1043,285+i*47);});ctx.globalAlpha=1;
 }
 const fadeIn=1-ease(t/.8),fadeOut=ease((t-timeline.duration+2)/2);
 if(fadeIn||fadeOut){ctx.fillStyle=`rgba(10,15,21,${Math.max(fadeIn,fadeOut)})`;ctx.fillRect(0,0,W,H);}
 ctx.restore();
}
function draw(t,capture=true){
 const state=pose(t);cinematography.update(camera,state,free);const propState=props.update(state,camera);
 stage.scene.updateMatrixWorld(true);const shot=cinematography.update(camera,state,free);effects.update(state,camera);
 const data={t,beat:state.beat.id,scene:state.story.cutaway??state.beat.scene,storyScene:state.beat.scene,shot,active:state.spoken?.id??null,
  actors:Object.fromEntries(Object.entries(state.states).filter(([k,s])=>s.visible).map(([k,s])=>[k,{root:[s.rootX,s.rootY??0,s.rootZ],yaw:s.yaw,head:[s.headYaw,s.headPitch],jaw:s.jaw??0,
   walkKey:s.walk?JSON.stringify([s.walk.from,s.walk.to,s.walk.facingYaw]):null,...state.traces[k]}])),
  props:propState,contactAnchors};
 if(!capture)return data;
 renderer.render(stage.scene,camera);ctx.drawImage(renderer.domElement,0,0);overlay(state);
 return{image:canvas.toDataURL('image/jpeg',.94).split(',')[1],state:data};
}
window.duration=timeline.duration;window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.checkTimes=[...timeline.beats.flatMap(b=>[b.start+.6,(b.start+b.end)*.5,b.end-.5]),
 ...performance.eventTimes.impacts.flatMap(e=>[e.time-.15,e.time+.10]),
 performance.eventTimes.jump,performance.eventTimes.catch,performance.eventTimes.catch+1].sort((a,b)=>a-b);
window.setFreeCamera=c=>free=c;
window.__dbg={actors,stage,camera,renderer,draw,performance,props,timeline,contactAnchors};
await document.fonts.ready;draw(0);window.ready=true;
