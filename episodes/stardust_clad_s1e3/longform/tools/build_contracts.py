"""Document actual longform scene bindings and bounded verification coverage."""
from pathlib import Path
import json,hashlib,subprocess,sys,collections
R=Path(__file__).resolve().parents[1];WS=R.parents[3]
T=json.loads((R/'config/timeline.json').read_text(encoding='utf-8'))
def save(name,data):(R/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
SCENES={
 'market':('WindwardMarket','风铃渡',[-4,-.5,-2.5],[4,4,2.5],'最后一趟货物、返乡与日常修复',{'bell':[0,1.45,-1.7],'basket':[1.6,0,.3]}),
 'courtyard':('WindwardCourt','风筛庭',[-4.5,-.5,-3.5],[4.5,5,3.5],'守卫与敌手的争执、交锋和代价',{'rotor':[0,2.5,-3.4],'plant':[1.9,.7,-.7]}),
 'store':('WindwardStore','旧索仓',[-4,-.5,-3],[4,4.5,4.4],'绞盘救人、旧桥姓名与救索准备',{'winch':[-2,.7,.2],'door':[0,1.1,2.9],'memorial':[.2,2.15,-2.84]}),
 'greenhouse':('WindwardGreenhouse','暖芽温室',[-4,-.5,-3.5],[4,4,3.5],'展示风路受阻对生活的代价',{'plant':[.8,.8,-.6],'pipe':[0,.3,-2.8]}),
 'bridge':('WindwardBridge','折翼桥',[-6.9,-2,-2],[6.9,4,2],'有限踏板上的接力救援',{'cargo':[0,.76,-1.4],'safe':[-4.8,0,0]}),
 'windwell':('WindwardWell','风井',[-5.5,-16,-10],[5.5,6,3],'三点开闸、平台失托和最后抓握',{'gate':[0,1.25,-1.85],'handle':[-1.65,1.18,.1],'lamp':[2.3,2.05,-.58],'rescueLedge':[0,.64,1.7]})
}
C={'contractVersion':'1.0','episode':'stardust_clad_s1e3_longform','sourceStory':'script.story',
 'intent':{'premise':'被丝线锁住的风路迫使守卫在控制与信任之间作出选择。','audience':'中文奇幻动作长剧观众','designPriorities':['各角色外形可辨','受力和救援步骤可读','伤害与道具损坏持续']},
 'registrations':{'bootstrap':'bootstrap.js','scenes':[s[0] for s in SCENES.values()],'characters':['Xiaozao','Jianwang','Weihe','Yabo','Mideng']},
 'scenes':[],'entities':[],'state':{'performanceKind':{'type':'string','initial':'action','binding':'scene.userData.performanceKind'}},
 'events':[],'blocking':[],'shotChecks':[],
 'acceptance':{'staticChecks':['story-tool','scene-tool','node-check'],'runtimeChecks':['tools/audit_runtime.mjs scan','sequential-and-seek-image-check','direct-visual-review']}}
for location,(reg,label,mn,mx,purpose,anchors) in SCENES.items():
 first=next(b for b in T['beats'] if b['scene']==location)
 C['scenes'].append({'registryName':reg,'implementation':{'kind':'episode-local','name':reg,'module':'scenes.js','export':reg+'Scene','bootstrap':'bootstrap.js','readiness':'readyPromise'},
  'intent':{'location':label,'timeOfDay':'下午至暮色','tone':['克制奇幻','生活质感'],'storyFunction':purpose,'visualRules':['面部近景避开柱、闸与同镜人物','粗绳承重，细丝攻击，颜色与材质分开']},
  'coordinates':{'unit':'meter','upAxis':'+Y','horizontalAxes':['X','Z'],'groundY':0},
  'stage':{'bounds':{'min':mn,'max':mx},'zones':[{'id':location+'Volume','bounds':{'min':mn,'max':mx},'walkable':False,'purpose':['场景支持体积；具体踏板和台阶由layout.js与stage.js定义，不把包围盒全当可行走地面']}],
   'anchors':{k:{'space':'world','relativeTo':'$scene','position':p,'purpose':k} for k,p in anchors.items()}},
  'lighting':{'mood':'室外暖侧光与冷天空补光；井内保留冷色压力光','keyDirection':[-5,8,6],'readabilityRules':['眼睛与受力手部不能淹没在暗部']},
  'cameraObstacles':[],'audioAnchors':[{'id':location+'Air','kind':'region','semantic':label+'连续空气环境','position':[0,1,0],'radius':6,'loop':True}],
  'dependencies':[{'id':'sceneModule','type':'module','path':'stage.js','required':True},{'id':'villagePlate','type':'texture','path':'assets/tex/windward_village.png','required':True}]})
 for tag,handler,kind in [('Act','act','dialogue'),('Action','action','action')]:
  C['events'].append({'tag':tag,'scene':reg,'handler':handler,'argumentMode':'none','durationSeconds':0,'requires':[],'effects':[{'op':'setState','state':'performanceKind','value':kind}]})
 bindings={'market':{'bell':'stage.props.marketBell','basket':'stage.props.marketBasket'},
  'courtyard':{'rotor':'stage.dynamic.courtyard.rotor','plant':'stage.props.courtyardPlant'},
  'store':{'winch':'stage.dynamic.store.winch','door':'stage.dynamic.store.door','memorial':"stage.groups.store.getObjectByName('memorial-plaque')"},
  'greenhouse':{'plant':'stage.props.greenhousePlant','pipe':'stage.props.warmPipe'},
  'bridge':{'cargo':'stage.props.bridgeBasket'},
  'windwell':{'gate':'stage.dynamic.windwell.gate','handle':'stage.props.gateHandle','rescueLedge':"stage.groups.windwell.getObjectByName('upper-rescue-ledge')"}}
 for name,binding in bindings[location].items():
  pos=anchors[name]
  eid=location+'-'+name
  C['entities'].append({'id':eid,'scene':reg,'kind':'prop','binding':binding,'parent':'$scene','initialPresence':'onstage',
   'initial':{'visible':True,'transform':{'space':'world','relativeTo':'$scene','position':pos}}})
 # The shot is a declared readability target; static validation does not certify its pixels.
 key=next(iter(anchors));entry=first['entry']
 C['shotChecks'].append({'id':location+'Establish','scene':reg,'entry':entry,'offsetSeconds':1.5,'purpose':purpose,
  'mustSee':[{'entity':location+'-'+key,'minFrameArea':.001,'maxOcclusion':.55,'safeMargin':.02}],
  'mustHavePresence':[],'mustShowTogether':[]})
save('config/scene_contract.json',C)
coverage=[]
for b in T['beats']:
 coverage.append({'beat':b['id'],'scene':b['scene'],'range':[b['start'],b['end']],
  'sampledChecks':['arm-reach','speaker-presence','camera-head-ray','first-action-foot-surface'],
  'notCertified':['continuous-mesh-collision','normal-speed-performance-naturalness','auditory-semantic-review']})
save('config/verification_scope.json',{'storySha256':T['source_sha256'],'coverage':coverage,
 'knownLimits':['Scene contract covers registry and stage semantics. Dynamic prop and performance assertions live in audit_runtime.mjs; it is a sampled check, not the full generic episode_gate.','The generic episode_gate trace schema does not match this longform viewer and is not reported as passed.']})
for name,prompt,source in [
 ('cedar.png','平涂动画可用的原创杉木木板反照率纹理，竖直木纹、克制色差，不烘焙光影。','exec-cffa40a0-4289-4cc7-91aa-c3fe722379eb.png'),
 ('windward_village.png','原创云谷风村环境绘景：岩柱上的青瓦民居、吊桥、索轮、暖芽温室和风塔；下午暖光，无人物无文字。','exec-821354ad-e1cf-43b9-84ae-6071caff8702.png')]:
 p=R/'assets/tex'/name
 save(f'assets/tex/{name}.source.json',{'provider':'native-imagegen','promptSummary':prompt,'generationFile':source,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'role':'original environment bitmap'})
reports={}
commands={
 'story_validation':[sys.executable,str(WS/'dula-skills/story-writer/scripts/story_tool.py'),'validate','--story',str(R/'script.story'),'--episode-dir',str(R)],
 'scene_validation':[sys.executable,str(WS/'dula-skills/scene-designer/scripts/scene_tool.py'),'validate','--contract',str(R/'config/scene_contract.json'),'--episode-dir',str(R)],
 'catalog':[sys.executable,str(WS/'dula-skills/story-writer/scripts/story_tool.py'),'catalog','--episode-dir',str(R)]}
for name,cmd in commands.items():
 p=subprocess.run(cmd,capture_output=True,encoding='utf-8',errors='replace')
 text=p.stdout+p.stderr;(R/'review'/f'{name}.txt').write_text(text,encoding='utf-8')
 reports[name]={'exitCode':p.returncode,'tail':text.splitlines()[-3:]}
 if name=='story_validation':
  reports[name]['warningCounts']=dict(collections.Counter(line.split(']')[0]+']' for line in text.splitlines() if line.startswith('WARNING')))
save('review/static_validation.json',reports);print(json.dumps(reports,ensure_ascii=False,indent=2))
