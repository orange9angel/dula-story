"""Reviewed sound direction for the single-palace duel; timings come from .story."""
import json,hashlib,sys
from pathlib import Path
EP=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(EP.parents[2]/'dula-skills/direct-episode-audio/scripts'))
from init_audio_direction import parse_story
read=lambda p:json.loads((EP/p).read_text(encoding='utf-8-sig'))
dlg=read('config/dialogue.json');T=read('config/event_times.json');entries=parse_story(EP/'script.story')
end=read('config/timeline.json')['duration']
chars={who:{'voice':dlg['voices'][who.lower()],'locale':'zh-CN','identityPolicy':'preserve-native-voice'} for who in ['Aoao','Yekari']}
dialogue=[]
for l in dlg['lines']:
    e=next(e for e in entries if e['startTime']==l['t'] and e['character'])
    dialogue.append({'entry':e['index'],'id':l['id'],'character':e['character'],'text':l['text'],
      'startTime':l['t'],'endTime':l['end'],'scene':e['scene'],'intent':l['delivery']['context'],
      'subtext':('守住街区火路，不再把硬挡当作唯一办法。' if l['speaker']=='aoao' else '用强弱解释被遗弃的旧伤，逼对手只护自己。'),
      'delivery':{'energy':.88 if '——' in l['text'] else .48,'pace':1+l['delivery']['rate']/100,'volume':1,'pitchSemitones':0,
      'emphasis':'strong' if '——' in l['text'] else 'normal','distance':'medium','space':'stone-palace','breath':'natural'},'nativeDelivery':l['delivery']})
spec=[('LATCH','shield_bang',.25),('CHAIN_HEARD','chain_tension',.42),('CHARGE1','cosmic_charge',.52),
      ('C1','cosmic_clash',.85),('CHAIN1','chain_tension',.56),('C2','blade_shield',.72),
      ('C3','cosmic_clash',.7),('CHAIN2','chain_tension',.56),('C4','armor_impact',.75),
      ('GATE_ATTACK','sickle_whoosh',.6),('C5','cosmic_clash',.95),('CHARGE2','cosmic_charge',.58),
      ('C6','cosmic_clash',.8),('CHAIN3','chain_tension',.6),('TRAP','blade_shield',.65),('LOCK','shield_bang',.75),
      ('HERO_CHARGE','furnace_rise',.6),('RELEASE','flame_release',.75),('C7','cosmic_detonation',.92),
      ('LAND','armor_impact',.68),('GATE_OPEN','stone_gate',.65),('RESTORE','fire_crackle',.2)]
sfx=[{'id':f'palace-{cue}','name':name,'cue':cue,'offset':0,'startTime':T[cue],'volume':gain,'role':'event','priority':'storySfx'} for cue,name,gain in spec]
for cue in ['C1','C3','C6']:
    sfx.append({'id':f'slash-{cue}','name':'sickle_whoosh','cue':cue,'offset':-.48,'startTime':T[cue]-.48,'volume':.55,'role':'event','priority':'storySfx'})
music=[]
for key,asset,a,b,src,gain in [('watch','bgm_nightwatch',0,20,0,.24),('intruder','bgm_nightwatch',27,51,25,.22),
 ('fight','bgm_nightbattle',51,106,0,.36),('decision','bgm_nightbattle',132,T['HERO_CHARGE'],14,.3),
 ('counter','bgm_nightbattle',T['HERO_CHARGE'],T['C7']+8,40,.43),('warmth','bgm_nightwatch',T['RETREAT']-7,end,4,.25)]:
    music.append({'id':key,'asset':asset,'startTime':a,'endTime':b,'sourceStart':src,'baseVolume':gain,'fadeIn':1.2,'fadeOut':1.6,'preserveAsset':True,'purpose':key})
plan={'version':1,'status':'reviewed','reviewedBy':'palace-episode-director','reviewScope':'creative direction; final listening not yet completed',
 'sources':[{'path':p,'sha256':hashlib.sha256((EP/p).read_bytes()).hexdigest()} for p in ['script.story','config/dialogue.json','config/voices.json']],
 'policies':{'priority':['dialogue','storySfx','ambience','music'],'musicMode':'directed','ambienceMode':'directed','breath':'natural-tts-pauses-no-layered-breath'},
 'mix':{'dialogueVolume':1.3,'useDucking':True,'duckDepth':.42,'peakCeilingDb':-2.2},'characters':chars,'dialogue':dialogue,
 'ambience':[{'id':'stone-wind','name':'night_wind_edited','startTime':0,'endTime':end,'volume':.13,'role':'bed','priority':'ambience'},
 {'id':'fire-channel','name':'fire_crackle','startTime':0,'endTime':end,'volume':.07,'role':'bed','priority':'ambience'}],
 'sfx':sfx,'music':music,'exclusions':[{'id':'no-beast','scope':'entire episode','sound':'beast sounds','reason':'Two human fighters.'}],
 'execution':{'voice':'gen_dialogue.py: original native actor identities + per-line rate/context', 'music':'Preserve existing accepted audio assets; no generation backend change','sfx':'Volcano Seed-Audio; contact cues from script.story'}}
(EP/'config/audio_direction.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
(EP/'config/voice_config.json').write_text(json.dumps(chars,ensure_ascii=False,indent=2),encoding='utf-8')
jobs={
 'cosmic_charge':'5秒，纯战斗音效，无音乐无人声。星力蓄积，细密电弧逐层升高，前3秒渐强，末尾收紧停住。明亮锐利有空气压缩感，不要爆炸。',
 'cosmic_clash':'2秒，纯音效无音乐无人声。开头立刻一记光刃撞击厚金属盾，尖锐金属瞬态叠厚重低频冲击，随后短促电弧碎裂和银色火花滋响，强而干净，只有一次碰撞。',
 'furnace_rise':'7秒，纯音效无音乐无人声。石槽内火流逐渐汇聚到铜盾，低沉火焰涌动上升为高压明亮能量，持续增长，最后短暂吸气般收紧，不含人声。',
 'flame_release':'3秒，纯战斗音效无音乐无人声。开头立刻爆发一股向前飞驰的高压火流，炽热风压和细碎电弧叠加，迅速掠过后消退，不能有第二次起音。',
 'cosmic_detonation':'4秒，纯音效无音乐无人声。开头立即一记炽热能量撞碎金属护甲，深厚低频重击叠清脆碎裂，火光冲击波向外展开，碎片落石后余响消退，只有一次高潮。',
 'stone_gate':'4秒，纯音效无音乐无人声。沉重石闸从卡住到打开，一声铜制锁舌弹响，持续石材摩擦与低沉滚动，最后落定。'}
(EP/'config/palace_sfx_jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'palace direction: {len(dialogue)} voices, {len(sfx)} SFX, {len(music)} preserved score edits')
