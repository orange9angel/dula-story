"""Episode-specific source preparation; never overwrites a completed video."""
from pathlib import Path
import json,re,hashlib,shutil,sys
EP=Path(__file__).resolve().parents[1]
ROOT=EP.parents[1]
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def story_fix():
 p=EP/'script.story';s=p.read_text(encoding='utf-8').replace('@Scene:WindSievePalaceScene','@WindSievePalaceScene')
 def gap(m):
  hh,mm,ss=map(int,m.groups())
  total=hh*3600+mm*60+ss
  if total==136:return m.group(0)
  total-=1
  return f' --> {total//3600:02}:{total//60%60:02}:{total%60:02},950'
 s=re.sub(r' --> (\d\d):(\d\d):(\d\d),000',gap,s);p.write_text(s,encoding='utf-8')
def prepare():
 from compile_story import compile_story
 story_fix();compile_story()
 dlg=read(EP/'config/dialogue.json')
 plan=read(EP/'config/audio_direction.json')
 plan['sources']=[{'path':'script.story','sha256':hashlib.sha256((EP/'script.story').read_bytes()).hexdigest()}]
 plan['status']='reviewed';plan['policies'].update(musicMode='directed',ambienceMode='directed')
 for k,c in plan['characters'].items():c.update(voice=dlg['voices'][k.lower()],locale='zh-CN')
 assert len(plan['dialogue'])==len(dlg['lines']), 'Rebuild direction when entries change'
 for d,l in zip(plan['dialogue'],dlg['lines']):
  assert d['character'].lower()==l['speaker']
  d.update(text=l['text'],startTime=l['t'],endTime=l['end'],scene='WindSievePalaceScene',shotIds=[next(s['id'] for s in read(EP/'config/timeline.json')['segments'] if s['start']<=l['t']<s['end'])])
  d['intent']=l['delivery']['context'];d['subtext']='担心失控却试图保护同伴' if l['speaker']=='xiaozao' else '把控制当作保护' if l['speaker']=='jianwang' else '保护药箱并相信同伴'
  d['delivery'].update(tone='contextual',space='outdoor',distance='near',pace=1+l['delivery']['rate']/100,pauseBeforeMs=0)
  d['nativeContext']=l['delivery']
 plan['ambience']=[dict(id='gorge-bed',entry=1,name='wind_gorge',startTime=0,endTime=136,volume=.12,role='bed',priority='ambience')]
 cues=read(EP/'config/event_times.json')
 sounds={'entry_pull':'chain_tension','step_one':'boot_step','step_two':'boot_step','step_three':'boot_step','snare':'cloth_pull','punch':'sickle_whoosh','bind_hit':'armor_impact','crack':'bridge_crack','disc_break':'blade_shield','catch':'cloth_pull','haul_land':'boot_step','counter_step':'boot_step','counter_swing':'sickle_whoosh','thread_cut':'string_snap','enemy_land':'armor_impact','final_step':'boot_step'}
 plan['sfx']=[dict(id=k,name=n,entry=next(i+1 for i,s in enumerate(read(EP/'config/timeline.json')['segments']) if s['start']<=cues[k]<s['end']),startTime=cues[k],endTime=min(136,cues[k]+1.2),volume=.30 if 'step' in k else .40,priority='storySfx',anchor=k) for k,n in sounds.items()]
 plan['music']=[dict(id='watch',entry=1,asset='bgm_nightwatch',startTime=0,endTime=15,sourceStart=0,baseVolume=.16,fadeIn=1.5,fadeOut=2,preserveAsset=True),
 dict(id='bind',entry=4,asset='bgm_nightbattle',startTime=15,endTime=55,sourceStart=0,baseVolume=.13,fadeIn=1,fadeOut=3,preserveAsset=True),
 dict(id='decision',entry=16,asset='bgm_nightbattle',startTime=77,endTime=111,sourceStart=20,baseVolume=.17,fadeIn=2,fadeOut=4,preserveAsset=True),
 dict(id='warmth',entry=23,asset='bgm_nightwatch',startTime=117,endTime=136,sourceStart=5,baseVolume=.13,fadeIn=2,fadeOut=3,preserveAsset=True)]
 plan['exclusions']=[{'id':f'exclude-{i}','reason':s} for i,s in enumerate(['55–77 秒无配乐，保留思考与求援间的空白','不把普通抬手配成攻击','不增加通用喘息替代角色本人的发力'])]
 plan['execution']={'dialogue':'tools/gen_dialogue.py consumes compiled native context/rate','music':'reuse accepted prior score with file-level provenance; no new backend chosen','ambience':'Volcano Seed-Audio','auditoryReview':'not yet listened'}
 write(EP/'config/audio_direction.json',plan)
 (EP/'assets3d/sfx').mkdir(parents=True,exist_ok=True)
 previous=ROOT/'episodes/stardust_clad_s1e2/assets3d/sfx'
 for name in sorted(set(sounds.values())|{'bgm_nightwatch','bgm_nightbattle'}):
  if name in {'bridge_crack','string_snap'}:continue
  for suffix in ['.wav','.source.json']:
   p=previous/(name+suffix)
   if p.exists():shutil.copy2(p,EP/'assets3d/sfx'/p.name)
 write(EP/'config/sfx_jobs.json',{'wind_gorge':'生成12秒纯环境音，无音乐无人声。高山峡谷中的远处空气流动和极轻悬桥绳索低频摩擦，平稳、无阵风、无节律性涌动、音量恒定、无静默间隙。没有尖锐哨声，没有鼓点，没有撞击。',
 'bridge_crack':'生成3秒纯音效，无音乐无人声。紧绷的老木悬桥支座突然裂开，一次干脆的木头开裂，伴随一小段粗绳磨动，迅速停止，无爆炸。',
 'string_snap':'生成2秒纯音效，无音乐无人声。一根拉得很紧的细金属丝被切断，一次短促清晰的绷断与轻微弹回，干燥无音乐音高滑音。'})
 write(EP/'config/voice_envs.json',{'lines':[]})
 print('Prepared reviewed direction and accepted source copies.')
if __name__=='__main__':prepare()
