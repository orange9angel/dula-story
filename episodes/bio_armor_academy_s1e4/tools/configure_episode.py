"""R3 direction. All dialogue windows derive from script.story."""
from pathlib import Path
import json,hashlib,sys
EP=Path(__file__).resolve().parents[1]
def load(p):return json.loads((EP/p).read_text(encoding='utf-8'))
def save(p,x):(EP/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tl=load('config/timeline.json');a=load('config/audio_direction.json')
if a.get('status')=='reviewed' and '--reset-audio-direction' not in sys.argv:
    raise SystemExit('Reviewed audio direction preserved. Edit the plan directly; --reset-audio-direction explicitly restores historical R3 defaults.')
a['status']='reviewed';a['sources'][0]['sha256']=hashlib.sha256((EP/'script.story').read_bytes()).hexdigest()
a['policies']['musicMode']='directed';a['mix']['bgmVolume']=.16
a['characters']['QianTangKui']['voice']='ICL_uranus_zh_female_tianmeihuopo_tob'
directions={
3:('试探能否恢复正常','害怕被当成标本','calm',1.03,.90),
4:('让他坦白展示受伤的手','已经注意到你的遮掩','happy',1.06,.90),
5:('用玩笑保护自己','先确认你把我当同学','happy',1.02,.92),
6:('用具体事实接住玩笑','可以放松一点','happy',1.05,.90),
7:('擦不掉就想催回去','我还想自己解决','calm',1.08,.95),
8:('发现危险及时提醒','不要再强迫身体','surprised',1.08,.98),
9:('试过后惊慌','身体不听使唤','surprised',1.08,1.0),
10:('叫停并指出代价','这回必须听我的','angry',1.03,.97),
11:('追问未来','玩笑撑不住了','sad',1.01,.87),
13:('诚实交代能力边界','不会骗你说能治好','sad',.96,.90),
14:('主动停止尝试','先接受今天这样','calm',1.02,.88),
15:('让他参与日常工作','你是能帮忙的同学','happy',1.02,.92),
16:('试探自己仍被平等看待','这次笑话有了底气','happy',1.00,.90),
17:('给出具体约定','愿意继续陪你观察','happy',.98,.91)}
a['dialogue']=[]
for i,line in enumerate(tl['dialogue']):
    intent,subtext,emotion,pace,volume=directions[line['entry']]
    segment=next(s for s in tl['segments'] if s['entry']==line['entry'])
    a['dialogue'].append({'entry':line['entry'],'character':line['character'],'text':line['text'],
      'startTime':segment['start'],'endTime':segment['end'],'speechWindow':[line['start'],line['end']],
      'scene':'BiologyRoomScene','shotIds':[line['id']],
      'previousEntry':tl['dialogue'][i-1]['entry'] if i else None,
      'nextEntry':tl['dialogue'][i+1]['entry'] if i+1<len(tl['dialogue']) else None,
      'intent':intent,'subtext':subtext,'delivery':{'tone':emotion,'nativeEmotion':emotion,'nativeEmotionScale':2,
      'energy':.55 if line['entry'] in [8,9,10] else .38,'pace':pace,'volume':volume,'pitchSemitones':0,
      'emphasis':'normal','distance':'medium','space':'quiet biology room','pauseBeforeMs':0,'pauseAfterMs':0,'breath':'natural'}})
a['ambience'][0].update(startTime=2.4,endTime=79)
a['music']=[{'id':'leaf_theme','startTime':0,'endTime':82,'asset':'assets3d/music/leaf_theme_r3.wav',
 'prompt':'生成一段82秒的原创校园奇幻动画纯器乐配乐。放学后生物活动室，两个少年从担忧走向有限但真实的信任。0到22秒：柔和钢琴呈现四音短动机，木质拨弦轻轻回答，稀疏而有记忆点。22到36秒：和声短暂转小调，低音大提琴轻奏不安，不能出现惊吓爆音。36到44秒：乐器逐一退出，悬而未决。44到53秒：极疏钢琴尾音，留下大段安静空间。53到73秒：四音动机温暖再现，长笛轻轻应答，钢琴和弦展开，像重新开始一件普通的小事。73到82秒：回到钢琴独奏，以安静完整终止式收束。约76BPM，自由呼吸，无鼓组，无人声，无吟唱，无环境音，无音效，无电音，无宏大高潮。旋律每句有停顿；从pp到mp再回pp，对白场景配乐，不要写成广告音乐。',
 'reason':'四音动机连接遮掩与接纳；44.5至53.2秒混音明确留白','targetRmsDb':-30}]
a['sfx']=[
 {'id':'step','asset':'assets3d/sfx/soft_step.wav','prompt':'生成3秒单个音效：一个穿软底帆布鞋的学生在木地板上轻轻落下一步，单次短促干燥的鞋底接触声。只一步，近距离，安静室内，无混响拖尾，无走路循环，无人声，无音乐，无其他声响。','times':[2.9,3.55,4.2,4.85,62.4,63.2],'gain':.12,'trimSeconds':.30},
 {'id':'glass_slide','asset':'assets3d/sfx/glass_slide.wav','prompt':'生成3秒单个音效：一个小玻璃标本罐在木桌面上缓慢滑动约一秒，轻柔细腻的玻璃底摩擦木头声，末尾轻轻停稳。无碎裂，无敲打，无尖啸，无人声，无音乐，无其他声音。','times':[60.4],'gain':.12,'trimSeconds':1.4},
 {'id':'cloth','asset':'assets3d/sfx/cloth_sleeve.wav','prompt':'生成3秒单个音效：棉质校服短袖和手臂轻轻摩擦，短而细的衣料窸窣声约半秒，近距离干声，无人声，无呼吸，无音乐，无冲击声。','times':[12.4,25.6,32.7,54.4,65.4],'gain':.08,'trimSeconds':.45}]
a['exclusions']=[{'id':'no_magic_whoosh','reason':'蚀纹附着皮肤缓慢扩大，不制造电击或能量爆发错觉'}]
anchors=load('config/foley_anchors.json')
for cue in a['sfx']:
    if cue['id']=='step':cue['times']=[round(row['time']-.03,6) for row in anchors['landings']]
    if cue['id']=='glass_slide':cue['times']=[anchors['slideStart']]
    cue.update(startTime=min(cue['times']),endTime=max(cue['times'])+cue['trimSeconds'],role='event',priority='storySfx')
save('config/audio_direction.json',a)
c=load('config/scene_contract.json')
c['intent']['designPriorities']=['继承第三集画面与声音基线','真实走动和道具交互','算法预筛后按风险做视觉与听觉检查']
c['intent']['premise']='雷晓强行收回蚀纹反使其扩大，主动停手后，用同一只手帮同学拿标本罐'
c['scenes'][0]['intent']['visualRules']=['文生图墙面与程序几何统一透视和光线','真实桌面接触、持物约束和脚底支撑','底部描边分色字幕，无气泡']
c['scenes'][0]['stage']['anchors']['leafJar']['position']=[.4,1.005,.30]
save('config/scene_contract.json',c)
print('R3: 14 performances, 1 score, 3 Foley sources; existing room tone reused')
