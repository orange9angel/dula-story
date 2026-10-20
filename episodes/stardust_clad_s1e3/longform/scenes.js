import {SceneBase} from 'dula-engine';
import {WindwardStage} from './stage.js';

function build(s){
  if(!s.stage){s.stage=new WindwardStage();s.readyPromise=s.stage.load();}
  else s.readyPromise=Promise.resolve(s.stage);
  s.scene=s.stage.scene;return s.scene;
}
function bind(s,state,duration){
  if(state.beat.scene!==s.constructor.location)throw new Error('Scene binding mismatch');
  s.pending=state;s.duration=duration;return s;
}
function present(s,kind){
  if(!s.pending)throw new Error('Longform scene needs its compiled story state');
  s.stage.setLocation(s.pending.story.cutaway??s.constructor.location,s.pending.t,s.pending.t/s.duration,s.pending.story);
  s.scene.userData.storyEntry=s.pending.active?.id??s.pending.action?.id;
  s.scene.userData.performanceKind=kind;
}
// Explicit registered classes share the actual stage implementation. The viewer
// binds compiled state before the same act/action methods documented by the contract.
export class WindwardMarketScene extends SceneBase{
  static location='market';
  constructor(stage=null){super('WindwardMarket');this.stage=stage;}
  build(){return build(this);}
  bindState(state,duration){return bind(this,state,duration);}
  act(){present(this,'dialogue');}
  action(){present(this,'action');}
}
export class WindwardCourtScene extends SceneBase{
  static location='courtyard';
  constructor(stage=null){super('WindwardCourt');this.stage=stage;}
  build(){return build(this);}
  bindState(state,duration){return bind(this,state,duration);}
  act(){present(this,'dialogue');}
  action(){present(this,'action');}
}
export class WindwardStoreScene extends SceneBase{
  static location='store';
  constructor(stage=null){super('WindwardStore');this.stage=stage;}
  build(){return build(this);}
  bindState(state,duration){return bind(this,state,duration);}
  act(){present(this,'dialogue');}
  action(){present(this,'action');}
}
export class WindwardGreenhouseScene extends SceneBase{
  static location='greenhouse';
  constructor(stage=null){super('WindwardGreenhouse');this.stage=stage;}
  build(){return build(this);}
  bindState(state,duration){return bind(this,state,duration);}
  act(){present(this,'dialogue');}
  action(){present(this,'action');}
}
export class WindwardBridgeScene extends SceneBase{
  static location='bridge';
  constructor(stage=null){super('WindwardBridge');this.stage=stage;}
  build(){return build(this);}
  bindState(state,duration){return bind(this,state,duration);}
  act(){present(this,'dialogue');}
  action(){present(this,'action');}
}
export class WindwardWellScene extends SceneBase{
  static location='windwell';
  constructor(stage=null){super('WindwardWell');this.stage=stage;}
  build(){return build(this);}
  bindState(state,duration){return bind(this,state,duration);}
  act(){present(this,'dialogue');}
  action(){present(this,'action');}
}
export function createSceneAdapters(stage){
 return Object.fromEntries([WindwardMarketScene,WindwardCourtScene,WindwardStoreScene,WindwardGreenhouseScene,WindwardBridgeScene,WindwardWellScene].map(C=>{
  const s=new C(stage);s.build();return[C.location,s];
 }));
}
