"""Apply the reviewed relationship direction while retaining story text and windows."""
from pathlib import Path
import json,hashlib,shutil
EP=Path(__file__).resolve().parents[1]
p=EP/'config/audio_direction.json';plan=json.loads(p.read_text(encoding='utf-8'))
plan['policies']['relationshipDirection']='校园恋爱喜剧：男主主动逗趣，女主认真接梗、忍笑；蚀纹扩大时短暂紧张，最后落回明天见的期待。'
plan['characters']['LeiXiao'].update(voice='zh_male_shaonianzixin_uranus_bigtts',castingStatus='provisional-romcom-native-recast',identityPolicy='native-voice-no-pitch-manufacture')
male={3:'有精神地向喜欢的女同学求助，像终于找到靠谱的同桌，问句轻巧有期待。',
5:'你先保证，假装认真；不把我泡进罐子里，含着笑逗她。轻快接话，不是真的害怕。',
7:'接住女生刚才的玩笑，边观察边提出一个小主意，有好奇心，后半句问得轻快。',
9:'就一下，得意地抢着试；怎么还长了，突发意外、反应快，像小小逞强翻车，不哭不哀叹。',
11:'刚刚的小实验翻车了，短暂认真地问她，疑问有支撑、尾音向上，不低沉。',
14:'听完解释后主动松下来，笑着决定明天再来找她。今天不试了，干脆轻快，不认命。',
16:'拿罐子时主动调侃自己。贴个标签，带点坏笑问她，期待她接梗；语调有弹性，不卖惨。'}
female={4:'看穿他藏手的小动作，亲近地提醒；藏着那只，轻轻点破，有一点笑意。',
6:'一本正经地接他的玩笑。装叶子的，淡定；你这么大，放不下，忍住笑轻轻补刀，不嘲讽。',
8:'关心地及时提醒他松手，短而明确，不惊慌。',
10:'先清楚说停，再认真观察。语气坚定但不凶，仍在关心这个男生。',
13:'诚实告诉他现在的限制，真诚平实，有陪他想办法的意愿，不阴沉不煽情。',
15:'换个轻松话题，请他帮忙，像自然邀请他加入自己的生活，明亮亲近。',
17:'你不用，温柔接住他的玩笑；明天放学，自己来，带笑意主动约他再见，尾音轻快、稍害羞。'}
for line in plan['dialogue']:
    male_line=line['character']=='LeiXiao';d=line['delivery'];entry=line['entry']
    context=('阳光开朗的少年，正开心地和喜欢的女同学聊天。声音明亮，有明显笑意，语调活泼，亲切自然。' if male_line else
        '青春校园恋爱喜剧现场对白，清爽自然的女高中生，温柔机灵、含着笑意，和喜欢的男生近距离聊天，不播报、不嗲、不夸张喊叫。')
    d.update(nativeContextTexts=[context+(male if male_line else female)[entry]+'只说台词。'],nativeSpeechRate=5 if male_line else 0,
        nativeEmotion=None,nativeEmotionScale=None,pace=1.0,volume=.96 if male_line else .92)
    if male_line and entry in [3,5]:
        source=EP/f'tmp/romcom_revision/voices/sunny_simple_{entry}.mp3'
        selected=json.loads(source.with_suffix('.source.json').read_text(encoding='utf-8'))['request']
        d.update(nativeContextTexts=selected['context_texts'],nativeSpeechRate=selected['speech_rate'])
        target=EP/f'assets3d/dialogue_r3/entry_{entry}.mp3';shutil.copy2(source,target)
        request={**selected,'emotion':None,'emotion_scale':None,'provider':'seed-tts-2.0','wireVersion':2}
        meta={'request':request,'input_sha256':hashlib.sha256(json.dumps(request,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),'audio_sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
        target.with_suffix('.source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
plan['ambience']=[]
plan['exclusions']=[e for e in plan['exclusions'] if e['id']!='no_rustling_room_bed']+[
    {'id':'no_rustling_room_bed','scope':'BiologyRoomScene, entire episode','reason':'实际分轨定位到通风底床；这场安静室内无需持续噪声，去掉而不换成衣料或脚步。'}]
for cue in plan['music']:
    if cue.get('provider')!='Suno':
        cue['provider']='existing-seed-audio';cue['replacementStatus']='Suno requested; pending real generation receipt and listening review'
p.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(EP/'config/voice_config.json').write_text(json.dumps({'provider':'seed-tts-2.0','characters':plan['characters'],
    'review':'Anonymous complete-line comparisons; model observation advisory, pending user review. No pitch/formant shift.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Romcom delivery applied; room bed removed; score replacement pending.')
