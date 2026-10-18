#!/usr/bin/env python3
"""Materialize the reviewed episode direction from canonical story cues."""
from pathlib import Path
import hashlib
import json
import sys

EP=Path(__file__).resolve().parents[1]
WS=EP.parents[2]
sys.path.insert(0,str(WS/'dula-skills/direct-episode-audio/scripts'))
from init_audio_direction import parse_story

def main():
    read=lambda f:json.loads((EP/f).read_text(encoding='utf-8-sig'))
    dlg=read('config/dialogue.json'); cues=read('config/event_times.json')
    entries=parse_story(EP/'script.story')
    end=max(e['endTime'] for e in entries)
    subtext={
        'n01':'担心朋友一味责备自己，先用玩笑打开话题。','n02':'害怕下一次保护不了同伴。',
        'n03':'希望他承认自己也做到了。','n04':'不敢把同伴的付出算成自己的胜利。',
        'n05':'用荒唐的办法反问他不肯分担的习惯。','n06':'把受伤都归到自己的责任。',
        'n07':'我也需要你，不能永远被你挡在外面。','n08':'愿意听见朋友求助。',
        'n09':'求助应该是双向的。','n10':'先答应，是否做到留待战斗检验。',
        'n12':'眼前的值夜人让自己想到从前。','n16':'把抢火解释成强者的责任。',
        'n17':'火后面有具体的人在等。','n19':'成功的判断被身体疼痛推翻。',
        'n20':'先说自己确实看见的证据。','n23':'第一次承认蛮力反而帮助了敌人。',
        'n24':'想立刻证明自己能弥补局面。','n25':'迫使对手在封刀和救同伴之间选择。',
        'n26':'终于无法再隐藏伤势。','n27':'不愿承认自己被遗弃，却忍不住提起。',
        'n28':'不再相信会有人来。','n29':'拒绝让旧伤变成伤害别人的理由。',
        'n30':'重新用强弱理论压住自己的动摇。','n31':'把最危险的一刀明确托付给朋友。',
        'n32':'接受不完美，改变攻击目标。','n34':'让同伴不要再次落入借力的陷阱。',
        'n35':'证明自己学会等和收力。','n37':'败了仍要验证对方的信念会不会破。',
        'n38':'不是依赖别人，也不是拒绝帮助。','n40':'守住同伴比追逐胜利重要。',
        'n41':'不再允许朋友把疼痛藏起来。','n42':'被看穿后仍想笑着遮掩。',
        'n43':'关心一直存在，不需要他表现得很强。','n44':'把力量用于照顾细小的地方。',
        'n45':'接受别人的手，不再独自撑住。','n46':'先交代需要救的人。',
        'n47':'必须尽快打通路线。','n48':'出发之前也想保护身后的人。',
        'n49':'以留守者身份承担责任。','n50':'让朋友保留克制，不重复受伤。',
        'n51':'愿意换办法，不把逞强当勇敢。','n52':'用行动回答没有人来的旧伤。',
        'n53':'人在险境仍尽力给后来者警告。','n54':'从听见警告转为寻找同伴。'}
    chars={e['character']: {'voice':dlg['voices'][e['character'].lower()], 'locale':'zh-CN',
           'identityPolicy':'preserve-native-voice'} for e in entries if e['character']}
    (EP/'config/voice_config.json').write_text(json.dumps(chars,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    directed=[]
    for line in dlg['lines']:
        e=next(e for e in entries if e['startTime']==line['t'] and e['character'])
        shout='——' in line['text'] or line['id'] in ['n13','n21','n31','n34']
        directed.append({'entry':e['index'],'id':line['id'],'character':e['character'],
            'text':line['text'],'startTime':line['t'],'endTime':line['end'],'scene':e['scene'],
            'intent':line['delivery']['context'],'subtext':subtext.get(line['id'],'在眼下窗口向对方采取行动：'+line['delivery']['context']),
            'delivery':{'energy':.88 if shout else .42,'pace':1+line['delivery']['rate']/100,
              'volume':1.,'pitchSemitones':0.,'emphasis':'strong' if shout else 'normal',
              'distance':'medium' if line['t']>=100 else 'near','space':'stone-courtyard',
              'breath':'natural'},'nativeDelivery':line['delivery']})
    def at(name,delta=0):return round(cues[name]+delta,3)
    ambience=[{'id':'night-bed','name':'night_wind_edited','startTime':0,'endTime':end,'volume':.16,'role':'bed','priority':'ambience'},
              {'id':'hearth-bed','name':'fire_crackle','startTime':at('MONO'),'endTime':at('DEPART'),'volume':.10,'role':'bed','priority':'ambience'},
              {'id':'palace-rain','name':'rain_gate','startTime':at('GATE'),'endTime':end,'volume':.28,'role':'bed','priority':'ambience'}]
    event_specs=[('STIR',4,'chain_tension',.48),('REVEAL',1,'boot_step',.35),
        ('RALLY',.5,'shield_bang',.66),('C1',-.36,'sickle_whoosh',.68),('C1',0,'blade_shield',.95),
        ('SECOND_CUT',-.18,'chain_tension',.65),('SECOND_CUT',0,'blade_shield',.62),
        ('C2',-5.1,'sickle_whoosh',.43),('C2',0,'armor_impact',.95),
        ('TEST_SHOT',0,'rain_burst',.40),('DISC_DROP',0,'disc_clatter',.8),
        ('RAIN_RELEASE',0,'rain_burst',.82),('C3',0,'blade_shield',.42),
        ('C4',0,'crater_slam',.92),('BOLT',.3,'cloth_pull',.30),
        ('LETGO',26,'cloth_pull',.38)]
    sfx=[{'id':f'human-event-{i:02}','name':name,'startTime':at(cue,delta),
          'volume':gain,'role':'event','priority':'storySfx','cue':cue,'offset':delta}
          for i,(cue,delta,name,gain) in enumerate(event_specs)]
    # Preserve the accepted score assets; re-edit source regions around dramatic turns.
    music_specs=[('quiet','bgm_nightwatch',at('MONO'),82,0,.28,2.5,'night conversation'),
        ('approach','bgm_nightwatch',at('STIR'),at('FIGHT1'),25,.32,1.8,'human intruder approach'),
        ('first-battle','bgm_nightbattle',at('FIGHT1'),at('VALLEY'),0,.43,1.,'failed attempts'),
        ('decision','bgm_nightbattle',at('EYE2'),at('DOWN'),14,.45,1.2,'shared counterattack'),
        ('road','bgm_nightwatch',at('HESTIA'),at('GATE'),4,.30,2.5,'rescue responsibility')]
    music=[{'id':name,'asset':asset,'startTime':a,'endTime':b,'sourceStart':src,
            'baseVolume':gain,'fadeIn':fade,'fadeOut':fade,'purpose':purpose,'preserveAsset':True}
           for name,asset,a,b,src,gain,fade,purpose in music_specs]
    plan={'version':1,'status':'reviewed','reviewedBy':'episode-director','reviewScope':'creative plan; performance and final mix still require QC',
        'sources':[{'path':p,'sha256':hashlib.sha256((EP/p).read_bytes()).hexdigest()}
                   for p in ['script.story','config/dialogue.json','config/voices.json']],
        'policies':{'priority':['dialogue','storySfx','ambience','music'],'musicMode':'directed',
            'ambienceMode':'directed','breath':'natural-tts-pauses-no-layered-breath'},
        'mix':{'dialogueVolume':1.3,'useDucking':True,'duckDepth':.42,'peakCeilingDb':-2.2},
        'characters':chars,'dialogue':directed,'ambience':ambience,'sfx':sfx,'music':music,
        'exclusions':[{'id':'no-beast-vocals','scope':'entire episode','sound':'beast_* / claw_scrape',
                       'reason':'All opponents are human; replace animal actions and sounds.'}],
        'execution':{'voice':'tools/gen_dialogue.py consumes nativeDelivery materialized in dialogue.json',
                     'mix':'tools/build_audio.py consumes this plan; footsteps derived from actual gait',
                     'musicGeneration':'none; accepted assets preserved; new score would use Suno'}}
    (EP/'config/audio_direction.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Reviewed direction: {len(directed)} lines, {len(sfx)} action cues, {len(music)} score edits')

if __name__=='__main__':main()
