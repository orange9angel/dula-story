"""Refresh R3 staging declarations from the authoritative story timeline."""
from pathlib import Path
import json
EP=Path(__file__).resolve().parents[1]
def load(p):return json.loads((EP/p).read_text(encoding='utf-8'))
def save(p,x):(EP/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tl=load('config/timeline.json');c=load('config/contact_contract.json');end=tl['duration']
c['scope']='R3 sampled rendered surfaces, finite foot contacts, prop grip, tabletop clearance and shot projection; artistic review is separate'
c['surface_clearance']['pairs']=[p for p in c['surface_clearance']['pairs'] if not p['key'].endswith(':skirt')]
for pair in c['surface_clearance']['pairs']:pair['window']=[0,end]
for side in ['left','right']:c['surface_clearance']['pairs'].append({'key':f'aoi:{side}:skirt','window':[0,end],'max_depth':.002,'method':'rendered-vertices/closed-mesh'})
b=c['bounded_staging'];b.update(window=[0,end],min_actor_gap=.05,min_environment_gap=.01,min_camera_distance=1.2,max_root_step=.025,min_self_gap=.002)
# Arm/arm contact during rubbing is checked separately with a declared story window.
b['self_pairs']=['leftHead','rightHead','leftLegs','rightLegs']
b['framing']=[{'entries':[5,10,15,18,19],'target':key} for key in ['lei','aoi']]+[
 {'entries':[3,7,9,11,14,16],'target':'lei'}, {'entries':[4,6,13,17],'target':'aoi'},
 {'entries':[8],'target':'arm','min_pixels':90,'require_unblocked':True},
 {'entries':[12],'target':'jar','min_pixels':180,'require_unblocked':True}]
save('config/contact_contract.json',c)
c=load('config/scene_contract.json');s=c['scenes'][0];name=s['registryName']
s['implementation'].update(module='scenes/BiologyRoomRemakeScene.js',readiness='readyPromise')
s['dependencies']=[{'id':'biology_wall_r3','type':'texture','path':'assets3d/textures/biology_wall_r3.png','required':True}]
s['stage']['bounds']={'min':[-3.2,0,-1.5],'max':[3.2,4.3,4]}
s['stage']['zones'][0].update(bounds={'min':[-2.1,0,-.9],'max':[1.3,2,.2]},purpose=['走入、有限落脚转身、观察蚀纹、递罐与接纳'])
s['cameraObstacles']=[{'id':id,'type':'box','space':'world','center':pos,'size':size} for id,pos,size in [
 ('rear_wall',[0,2.13,-1.56],[6.4,4.26,.10]),('left_wall',[-3.25,1.7,.3],[.1,3.4,4]),('right_wall',[3.25,1.7,.3],[.1,3.4,4])]]
for i,(x,z) in enumerate(( (x,z) for x in [-1.06,1.06] for z in [.30,.66])):
 s['cameraObstacles'].append({'id':f'work_table_leg_{i}','type':'box','space':'world','center':[x,.47,z],'size':[.055,.94,.055]})
initial={'LeiXiao':[-1.7,0,-.55],'QianTangKui':[.60,0,0],'LeafJar':[.4,1.005,.30]}
for entity in c['entities']:entity['initial']['transform']['position']=initial[entity['id']]
tags=[event['type'] for seg in tl['segments'] for event in seg['events']]
c['events']=[{'tag':tag,'scene':name,'handler':tag[0].lower()+tag[1:],'argumentMode':'none','durationSeconds':0,
 'requires':[],'effects':[{'op':'setState','state':'latestCue','value':tag}]} for tag in tags]
c['blocking']=[]
for i,(actor,entry,start,finish,purpose) in enumerate([
 ('LeiXiao',1,initial['LeiXiao'],initial['LeiXiao'],'门侧起位'),
 ('QianTangKui',1,initial['QianTangKui'],initial['QianTangKui'],'整理植物笔记'),
 ('LeiXiao',2,initial['LeiXiao'],[-.68,0,-.10],'走近后转向同学'),
 ('QianTangKui',10,initial['QianTangKui'],[.50,0,.09],'向前一步叫停'),
 ('LeiXiao',15,[-.68,0,-.10],[-.14,0,.025],'走近以左手接罐'),
 ('QianTangKui',15,[.50,0,.09],[.64,0,.02],'递罐后让出空间')]):
 c['blocking'].append({'id':f'block{i+1}','scene':name,'character':actor,'entry':entry,'from':start,'to':finish,'zone':'mainStage','clearance':.05,'purpose':purpose})
c['shotChecks']=[]
for entry,offset,entity,purpose in [(3,1.7,'LeiXiao','遮掩与担心'),(4,1.5,'QianTangKui','观察者明确回应'),(8,1,'LeiXiao','左臂蚀纹特写'),(9,2,'LeiXiao','强收失败的反应'),(12,1.5,'LeafJar','叶片留白'),(15,3.3,'LeafJar','玻璃罐沿桌滑向同学'),(16,2.3,'LeafJar','受蚀的左手接住标本罐'),(17,2,'QianTangKui','回应次日约定')]:
 see={'entity':entity,'minFrameArea':.001,'maxOcclusion':.05,'safeMargin':.05}
 if entity!='LeafJar' and entry!=8:see['focus']='face'
 c['shotChecks'].append({'id':f'shot{entry}','scene':name,'entry':entry,'offsetSeconds':offset,'purpose':purpose,'mustSee':[see],'mustHavePresence':[],'mustShowTogether':[]})
save('config/scene_contract.json',c)
print('R3 contracts refreshed: full duration, actual module/readiness, 13 events and interactive blocking')
