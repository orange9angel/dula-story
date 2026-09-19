"""Record the reviewed sound intent and scene contract, with source hashes."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def dump(p,v):(ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
def main():
    tl=read('config/timeline.json');plan=read('config/audio_direction.json')
    plan['status']='reviewed'
    plan['reviewNote']='Agent contextual review of existing performances; audience voice and lip-sync acceptance remains pending.'
    for s in plan['sources']:s['sha256']=hashlib.sha256((ROOT/s['path']).read_bytes()).hexdigest()
    plan['policies'].update(musicMode='directed',ambienceMode='directed')
    for c in plan['characters'].values():c['locale']='zh-CN'
    intentions=[('质问失踪零食','我知道你有嫌疑，但还没有物证','angry',.75),
        ('装作听不懂','先卖萌，看能否蒙混过关','deadpan',.28),
        ('轻声亮出嘴角证据','别急着认，先让你自己看','teasing',.5),
        ('硬把碎屑解释成艺术','被抓住也要保持体面','deadpan',.32),
        ('认命接受洗碗','零食好吃，代价太大','defeated',.24)]
    for d,(intent,subtext,tone,energy) in zip(plan['dialogue'],intentions):
        d.update(intent=intent,subtext=subtext)
        d['delivery'].update(tone=tone,energy=energy,space='home-kitchen',pitchSemitones=0)
        d['sourcePolicy']='Reuse existing native TTS clip; delivery fields describe the performance, not a new synthesis request.'
    plan['music']=[{'id':s['id'],'startTime':s['start'],'endTime':s['end'],'mood':'comic-playful',
        'purpose':'年糕四句狡辩' if s['id']=='songA' else '小雪四句揭底与判决','baseVolume':1,
        'fadeIn':.05,'fadeOut':.3} for s in tl['segments'] if s['kind']=='song']
    plan['mix'].update(bgmVolume=10**(-18/20),useDucking=True)
    plan['exclusions']=[{'id':'no-canned-laughter','scope':'whole-episode','sound':'audience-laughter','reason':'让观众从嘴角物证和冷面回应自己读到包袱。'},
        {'id':'no-appliance-hum','scope':'whole-episode','sound':'appliance-hum','reason':'保留安静家居氛围，不额外叠加干扰对白的电器声。'}]
    dump('config/audio_direction.json',plan)
    contract=read('config/scene_contract.json');sc=contract['scenes'][0]
    contract['intent']={'premise':'年糕唱歌否认偷吃，嘴角鱼干碎屑却成为物证，最终认命洗碗。','audience':'轻喜剧与角色动画观众','designPriorities':['物证可读','唱白交替','双人表演与反应']}
    sc['intent']={'location':'小雪家的日常厨房','timeOfDay':'窗边日间柔光','tone':['轻快','温暖','生活化'],
        'storyFunction':'空盘提出问题，嘴角碎屑反驳狡辩，餐盘堆收尾','visualRules':['近景对准当前唱者或证据','全景保留双人脚底与空盘','口型覆盖表情笑嘴']}
    sc['stage']={'bounds':{'min':[-3,-.1,-2],'max':[3,4,7]},'zones':[{'id':'mainStage','bounds':{'min':[-1.65,-.1,-.8],'max':[1.65,2.5,.9]},'walkable':True,'purpose':['厨房柜台前的日常对话与短唱']}],'anchors':{}}
    sc['lighting']={'mood':'固定自然窗光与柔和室内补光','readabilityRules':['歌唱不触发聚光灯或灯光脉冲','保留猫眼瞳孔和人脸层次']}
    sc['cameraObstacles']=[{'id':'backWall','type':'box','space':'world','center':[0,1.72,-1.92],'size':[6,3.5,.1]},
        {'id':'counter','type':'box','space':'world','center':[.39,.405,-1.47],'size':[2.45,.77,.54]}]
    contract['entities']=[e for e in contract['entities'] if e['kind']=='character']
    for e in contract['entities']:
        e['visualForwardAxis']='+Z';e['focusPoints']={'body':[0,.45,0],'face':[0,.60,.22]} if e['id']=='Mochi' else {'body':[0,.85,0],'face':[0,1.28,0]}
    for ident,binding,parent,pos,state in [('MochiHead','mochiHead','Mochi',[0,.60,.22],'attached'),('EmptyDish','emptyDish','$scene',[.08,.024,.38],'empty'),('Crumbs','crumbs','MochiHead',[.063,-.062,.254],'visible'),('Dishes','dishes','$scene',[.85,.047,.53],'stacked')]:
        contract['entities']=[e for e in contract['entities'] if e['id']!=ident]
        contract['entities'].append({'id':ident,'scene':'HomeKitchenScene','kind':'prop','binding':binding,'parent':parent,'initialPresence':'onstage','focusPoints':{'body':[0,0,0]},
            'initial':{'visible':True,'transform':{'space':'world' if parent=='$scene' else 'local','relativeTo':parent,'position':pos}},'states':[state],'initialState':state})
    for b in contract['blocking']:b['purpose']='两人在厨房柜台前说话，根部保持至少1米距离；前方保留空盘。'
    contract['shotChecks']=[]
    for ident,entry,offset,purpose,entity,focus in [('emptyDish',2,.5,'空盘与两名角色一起建立案件','EmptyDish','body'),('catSings',6,1,'年糕实际张口而非缩放笑嘴','Mochi','face'),('evidence',11,1,'嘴角碎屑可从自然近景读出','Crumbs','body'),('art',13,1,'死不认账的反应近景','Mochi','face'),('wash',21,1,'餐盘、海绵与年糕认命动作可读','Mochi','body')]:
        contract['shotChecks'].append({'id':ident,'scene':'HomeKitchenScene','entry':entry,'offsetSeconds':offset,'purpose':purpose,
            'mustSee':[{'entity':entity,'focus':focus,'minFrameArea':.0001 if entity in ('Crumbs','EmptyDish') else .02,'maxOcclusion':.05,'safeMargin':.01}],
            'mustHavePresence':[],'mustShowTogether':[]})
    checked={s['entry'] for s in contract['shotChecks']}
    def seconds(s):
        h,m,tail=s.split(':');return int(h)*3600+int(m)*60+float(tail.replace(',','.'))
    for block in (ROOT/'script.story').read_text(encoding='utf-8').strip().split('\n\n'):
        rows=block.splitlines();entry=int(rows[0])
        if entry in checked:continue
        st,en=map(seconds,rows[1].split(' --> '))
        entity='Mochi' if '|shot=cat|' in block else 'Yuki'
        contract['shotChecks'].append({'id':f'entry{entry}','scene':'HomeKitchenScene','entry':entry,'offsetSeconds':round((en-st)/2,3),
            'purpose':'实际自定义 viewer 中点构图与表情检查','mustSee':[{'entity':entity,'focus':'face','minFrameArea':.01,'maxOcclusion':.1,'safeMargin':.01}],
            'mustHavePresence':[],'mustShowTogether':[]})
    contract['acceptance']['runtimeChecks']=['episode-render-check','full-frame-trace','visual-review','model-assisted-av-review']
    dump('config/scene_contract.json',contract)
    print('Reviewed audio plan and scene contract written')
if __name__=='__main__':main()
