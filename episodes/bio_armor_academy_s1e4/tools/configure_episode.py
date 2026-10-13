"""Author directed contracts as UTF-8 files, never pipe Chinese through legacy PowerShell."""
from pathlib import Path
import json,hashlib
EP=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((EP/p).read_text(encoding='utf-8'))
def save(p,c):
    text=json.dumps(c,ensure_ascii=False,indent=2)+'\n'
    assert '???' not in text, 'Corrupted Unicode text'
    (EP/p).write_text(text,encoding='utf-8')
tl=load('config/timeline.json');segs={s['entry']:s for s in tl['segments']}
c=load('config/scene_contract.json')
c['intent']={'premise':'两个站定的学生观察左臂蚀纹；雷晓停止主动催动并答应次日复查','audience':'校园奇幻连载观众','designPriorities':['角色与环境有可计算净空','台词因果与低幅动作同步','不依赖视觉检测']}
s=c['scenes'][0]
s['intent']={'location':'青岚学舍生物活动室','timeOfDay':'放学后柔和日光','tone':['安静','克制','纸面色块'],'storyFunction':'引入千堂葵并让雷晓做出停止尝试的选择','visualRules':['角色根位置固定','手臂在各自身侧活动','标本罐与桌子超出触及范围']}
s['stage']['zones'][0]['purpose']=['固定双人站姿观察']
s['stage']['anchors']={'leafJar':{'space':'world','relativeTo':'$scene','position':[1.8,1.12,-1.78],'purpose':'留白镜头的叶片标本'}}
s['lighting']={'mood':'柔和日光','readabilityRules':['脸部正面补光','蚀纹附着于原有手臂表面']}
s['cameraObstacles']=[{'id':name,'type':'box','space':'world','center':center,'size':size} for name,center,size in [
    ('rear_wall',[0,1.7,-2.8],[9,3.4,.16]),('counter_top',[0,.92,-1.9],[5.6,.08,.66]),('cabinet',[-3.65,1.02,-2.1],[1.1,2.04,.62])]]
for entity in c['entities']:
    if entity['id']=='LeafJar':entity['binding']='jar'
c['state']['latestCue']['binding']='scene.latestCue'
for b in c['blocking']:b['purpose']='保留观察空间，根位置固定，外侧前臂在有限范围内抬起'
for shot in c['shotChecks']:shot['purpose']='几何投影及焦点要求；当前数值验收范围以 contact_contract 为准'
save('config/scene_contract.json',c)
a=load('config/audio_direction.json');a['sources'][0]['sha256']=hashlib.sha256((EP/'script.story').read_bytes()).hexdigest()
subtexts={3:('试探印子能否消失','别让她看出我害怕'),4:('指出真正受伤的是左手','我看出来了，但不审问你'),5:('用罐子笑话挡开检查','我不想变成实验材料'),6:('接住玩笑，让他停下','你还没被当成标本'),7:('发现尝试适得其反','为什么不听我的'),8:('及时制止','再试可能更糟'),10:('还想控制结果','只要更小心就可以'),11:('叫停并命名观察到的现象','留下的已经不会自己消掉'),13:('接受今天没有办法','宁可暂时丢脸也不再冒险'),14:('约定次日观察','没有办法保证，但会跟进'),15:('重新开个小玩笑','我会再来'),16:('回应他的信任','不用装得什么都不在乎')}
for line in a['dialogue']:
    line['intent'],line['subtext']=subtexts[line['entry']]
    line['startTime']=segs[line['entry']]['start'];line['endTime']=segs[line['entry']]['end']
a['policies']['ambienceMode']='directed'
a['ambience']=[{'id':'biology_room','startTime':3,'endTime':78,'shotIds':[],'asset':'assets3d/ambience/biology_room.wav',
    'prompt':'生成一段85秒的纯室内环境底声：放学后安静的学校生物活动室，关着窗，极轻的远处通风声。平稳、无阵风、无节律性涌动、音量恒定。没有人声、音乐、脚步、敲击、鸟叫、虫鸣、电流蜂鸣或故事性事件。干净柔和，供低音量对白场景使用。',
    'reason':'维持同一室内空间，让停顿保留空间感'}]
a['exclusions']=[{'id':'no_etch_whoosh','reason':'附着纹路只改变颜色，没有机械或爆发运动'},{'id':'no_steps_contacts','reason':'站定且不拿取道具，不添加未发生的脚步和碰撞声'},{'id':'no_music','reason':'停手决定由对白和沉默承载'}]
save('config/audio_direction.json',a)
print('UTF-8 scene/audio contracts refreshed from script-derived timeline')
