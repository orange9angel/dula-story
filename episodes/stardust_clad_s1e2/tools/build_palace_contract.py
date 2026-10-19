"""Scene declaration plus explicit viewer compilation contract, not fake scene callbacks."""
from pathlib import Path
import json
EP=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
p=EP/'config/scene_contract.json';c=read(p);scene='EmberTierPalaceScene'
c['intent']={'premise':'阿鏊守住焰阶宫向街区供火的闸门，以卡链和回火反制夜刈。','audience':'少年战斗动画观众','designPriorities':['单宫双人战场','盾沿卡槽可见','战损延续','接触点声光同源']}
s=c['scenes'][0]
s['implementation'].update(module='../../../dula-assets/scenes/stardust/EmberTierPalaceScene.js',readiness='readyPromise')
s['intent']={'location':'焰阶宫九阶铜闸前庭及下方街区','timeOfDay':'清晨前，火山红光映天','tone':['紧张','铜金与紫银对立'],'storyFunction':'守火民生与强者独占的选择交锋','visualRules':['只有阿鏊和夜刈在战场','无总坛大锅','腕伤与裂盾不恢复','盾沿抵住固定闸槽']}
s['intent']['visualRules']+=['宫门连接封闭暗内殿，不能透出后方天空','圣衣刻纹与金属反射，脸部沿用现有版本']
s['stage']={'bounds':{'min':[-18,-1.2,-30],'max':[18,9,10]},'zones':[{'id':'duel','bounds':{'min':[-1.8,0,-.9],'max':[3.8,3,.9]},'walkable':True,'purpose':['双人对战，铜闸与卡槽另验接触']},{'id':'entryBay','bounds':{'min':[3.8,0,.8],'max':[5.8,3,2.7]},'walkable':True,'purpose':['前侧柱间入场']},{'id':'exitBay','bounds':{'min':[3.8,0,-2.7],'max':[5.8,3,-.8]},'walkable':True,'purpose':['后侧柱间退场，止于栏杆内']}],'anchors':{'notch':{'space':'world','relativeTo':'$scene','position':[-.968,.334,.45],'purpose':'卡住盾沿与暗链的固定铜槽'},'gate':{'space':'world','relativeTo':'$scene','position':[-2.7,0,-1.25],'purpose':'保住中央闸心和外侧火路'}}}
s['lighting']={'mood':'冷石、暖火、局部碰撞光','readabilityRules':['白核只覆盖接触局部','保留两人轮廓','脸部不随蓄力过曝']}
s['cameraObstacles']=[{'id':'gateFrame','type':'box','space':'world','center':[-2.7,.9,-1.25],'size':[1.65,1.8,.4]}]
s['audioAnchors']=[{'id':'fire','kind':'point','semantic':'铜闸内火流与锁舌','position':[-2.7,1,-1.25],'radius':6,'loop':True}]
s['dependencies']=[{'id':'palaceStone','type':'texture','path':'assets3d/tex/palace_stone.png','required':True}]
c['entities']=[e for e in c['entities'] if e['kind']=='character']
for e in c['entities']:
    enemy=e['id']=='Yekari';e['visualForwardAxis']='+Z';e['initialPresence']='offstage' if enemy else 'onstage';e['initial']['visible']=not enemy;e['initial']['transform']['position']=[5.5,0,1.85] if enemy else [-.95,0,.15]
for name,binding,pos,states in [('gate','gate',[-2.7,0,-1.25],['closed','open']),('tongue','tongue',[-.968,.294,.45],['latched','drawn'])]:
    c['entities'].append({'id':name,'scene':scene,'kind':'prop','binding':binding,'parent':'$scene','initialPresence':'onstage','initial':{'visible':True,'transform':{'space':'world','relativeTo':'$scene','position':pos}},'states':states,'initialState':states[0]})
c['events']=[]
c['shotChecks']=[{'id':'heroIdentity','scene':scene,'entry':2,'offsetSeconds':2,'purpose':'铜鳞甲与导火盾辨识','mustSee':[{'entity':'Aoao','minFrameArea':.15,'maxOcclusion':.2,'safeMargin':.04}],'mustHavePresence':[{'character':'Yekari','value':'offstage'}],'mustShowTogether':[]}]
c['acceptance']={'staticChecks':['JSON schema','story-tool catalog and validate','viewer compilation manifest'],'runtimeChecks':['60Hz full trace and numeric seek','check_palace.py','audio_sync_report','exact-time visual samples','representative video']}
c['acceptance']['runtimeChecks']+=['palace_stage_contract.json: 70 named navigation solids with visible-actor pair coverage','known old route must collide with column_1_1_shaft','27 portal enclosure rays from three viewpoints']
p.write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8')
manifest={'mode':'compiled-viewer','source':'script.story','compiler':'tools/compile_story.py','entry':'viewer_palace.js','events':{'Beat':{'output':'config/timeline.json','consumer':'duel_performance.js:poseAt'},'Cue':{'output':'config/event_times.js','consumer':'viewer_palace.js:draw + scene.update'},'Act':{'output':'config/dialogue.json','consumer':'viewer_palace.js:lineAt + draw'}},'scope':'These tags are authoring metadata compiled before rendering, not SceneBase callbacks. scene_tool generic event dispatch validation does not cover this mode.'}
(EP/'config/palace_runtime_contract.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
from jsonschema import Draft202012Validator
schema=read(EP.parents[2]/'dula-skills/scene-designer/references/scene-contract.schema.json')
Draft202012Validator(schema).validate(c)
print('Scene schema valid; compiled-viewer events declared separately.')
