import json
from pathlib import Path
ep=Path(__file__).resolve().parents[1];path=ep/'config/scene_contract.json'
c=json.loads(path.read_text(encoding='utf8'))
c['intent']={'premise':'The same 3D pair chats at a cafe table and then dances in the open floor.','audience':'General audience','designPriorities':['One character rig across speech and song','Continuous face, ear and neck surfaces','Keep existing music and beat choreography']}
c['registrations']['bootstrap']='craft3d/bootstrap.js'
s=c['scenes'][0];s['implementation'].update(module='scenes/CafeTable3D.js',export='CafeTable3D',bootstrap='craft3d/bootstrap.js')
s['intent']={'location':'Sunny Japanese neighborhood cafe','timeOfDay':'Sunny afternoon','tone':['warm','playful'],'storyFunction':'A drawing conversation becomes a duet, then returns to coffee.','visualRules':['Both speakers use the same live 3D actors as the dance','The table and cups are solid props','No painted people in the background']}
s['stage']={'bounds':{'min':[-3.2,0,-2.3],'max':[3.2,3,1.5]},'zones':[{'id':'mainStage','bounds':{'min':[-2.9,0,-1.8],'max':[2.6,2.6,1]},'walkable':True,'purpose':['seated dialogue and foreground dance']}],'anchors':{'table':[-1.3,.74,-.8],'girlSeat':[-1.95,.49,-1.35],'boySeat':[-.65,.49,-1.35]}}
s['lighting']={'mood':'Warm window light','readabilityRules':['Face and ears use the same warm skin response','Preserve original painted window background']}
s['cameraObstacles']=[{'type':'box','center':[-1.3,.38,-.8],'size':[1.9,.76,.65]}]
s['audioAnchors']=[];s['dependencies']=[]
for e in c['entities']:
 e['visualForwardAxis']='+Z';e['initial']['transform']['position']=[-1.95 if e['id']=='Girl' else -.65,0,-1.35]
for name,binding,pos in [('table','table',[-1.3,.74,-.8]),('girlCup','cups.Girl',[-1.68,.82,-.76]),('boyCup','cups.Boy',[-.88,.82,-.76]),('notebook','notebook',[-.65,.785,-.91]),('spoon','spoon',[-1.68,.84,-.76])]:
 c['entities'].append({'id':name,'scene':'CafeMusicalScene','kind':'prop','objectName':name,'binding':binding,'parent':'$scene','initialPresence':'onstage','initial':{'visible':True,'transform':{'space':'world','relativeTo':'$scene','position':pos}},'states':['present'],'initialState':'present'})
c['state']={'phase':{'initial':'table','values':['table','tap','rise','dance','coda']}}
for e in c['events']:
 e['effects']=[{'op':'setState','key':'phase','value':{'CeramicPickup':'tap','SunlightPause':'rise','CafeDuet':'dance','CafeCoda':'coda'}[e['tag']]}]
c['blocking']=[{'character':k,'scene':'CafeMusicalScene','entry':1,'zone':'mainStage','from':[-1.95 if k=='Girl' else -.65,0,-1.35],'to':[-1.95 if k=='Girl' else -.65,0,-1.35],'clearance':.15,'purpose':'Seated conversation; a shot cut implies movement to the foreground dance area.'} for k in ['Girl','Boy']]
c['shotChecks']=[{'entry':e,'offsetSeconds':o,'scene':'CafeMusicalScene','reason':reason,'mustSee':[{'entity':k} for k in ids]} for e,o,reason,ids in [(1,.7,'Same 3D pair seated at opening',['Girl','Boy','table']),(2,.8,'Girl speech and head-neck integration',['Girl']),(3,.8,'Boy listening and speech',['Boy']),(5,.75,'Spoon and ceramic rim contact',['girlCup','spoon']),(8,.7,'Standing from chairs before dance',['Girl','Boy']),(9,21,'The same 3D characters perform a full turn',['Girl','Boy']),(12,.6,'Return to 3D conversation and cold coffee',['Girl','girlCup'])]]
c['acceptance']={'staticChecks':['scene-tool','story-tool','node-check'],'runtimeChecks':['episode viewer sampled render and reverse seek','actual skinned foot and wrist samples','visual-review']}
s['stage']['anchors']={k:{'space':'world','relativeTo':'$scene','position':v,'purpose':k} for k,v in s['stage']['anchors'].items()}
s['cameraObstacles'][0].update(id='tableBounds',space='world')
c['state']={'phase':{'type':'string','binding':'phase','initial':'table'}}
for e in c['events']:e['effects'][0]['state']=e['effects'][0].pop('key')
for b in c['blocking']:b['id']='seated'+b['character']
for i,shot in enumerate(c['shotChecks']):
 shot['id']='shot'+str(i);shot['purpose']=shot.pop('reason');shot['mustHavePresence']=[];shot['mustShowTogether']=[e['entity'] for e in shot['mustSee']]
 for e in shot['mustSee']:e.update(minFrameArea=.001,maxOcclusion=.8,safeMargin=.02)
# Repeated setup remains idempotent.
c['entities']=list({e['id']:e for e in c['entities']}.values())
path.write_text(json.dumps(c,indent=2),encoding='utf8')
