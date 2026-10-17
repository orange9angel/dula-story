from pathlib import Path
import json,hashlib,sys
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
def load(p):return json.loads((EP/p).read_text(encoding='utf8'))
def write(p,d):(EP/p).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
plan=load('config/audio_direction_schema.json');direction=load('config/voice_direction.json');timing=load('config/timing.json')
plan['status']='reviewed';plan['policies'].update(musicMode='directed',ambienceMode='directed');plan['reviewScope']='Context and native requests reviewed; ASR 9/9 matches. Human listening pending.'
for item in plan['dialogue']:
 source=next(l for l in timing['dialogue'] if l['text']==item['text'] and l['character']==item['character']);d=direction['directions'][str(source['id'])];item.update(intent=d['context'],subtext='在熟悉的同伴面前，用轻松的玩笑延长这个午后。',speechWindow={'start':source['start'],'end':source['end']},nativeRequest=d)
 item['delivery'].update(pace=1,volume=1,pitchSemitones=0,pauseBeforeMs=0,pauseAfterMs=0,space='room',distance='near');item['delivery']['energy']=.56 if d['emotion']=='happy' else .34
plan['characters']={c:{'voice':v,'locale':'zh-CN','identityPolicy':'preserve-accepted-series-voice'} for c,v in {'Girl':'zh_female_vv_uranus_bigtts','Boy':'zh_male_taocheng_uranus_bigtts'}.items()}
plan['ambience']=[{'id':'cafe-room','entry':1,'name':'cafe_roomtone','startTime':0,'endTime':timing['duration'],'role':'bed','priority':'ambience','provider':'Seed-Audio','file':'assets/audio/final/ambience.wav'}]
plan['sfx']=[{'id':f'cup-{i}','entry':5,'name':'ceramic_tap','startTime':t,'endTime':t+.4,'role':'event','priority':'storySfx','provider':'Seed-Audio'} for i,t in enumerate(timing['foley'])]
plan['music']=[{'id':'cafe-duet','entry':9,'startTime':timing['songStart'],'endTime':timing['songEnd'],'purpose':'杯沿节奏带入日常二重唱，保留完整歌句与尾奏','provider':'Suno','clipId':'6ad31639-aa42-4a0f-8351-a9024f49a3c8'}]
plan['exclusions']=[{'id':f'exclude-{i}','reason':v} for i,v in enumerate(direction['exclusions'])];write('config/audio_direction.json',plan)
write('config/voice_config.json',{c:{'default':{'provider':'seedtts','resourceId':'seed-tts-2.0','speaker':v['voice'],'sampleRate':24000}} for c,v in plan['characters'].items()})
sys.path.insert(0,str(WORK/'dula-skills/story-writer/scripts'));from story_tool import discover_catalog,validate_story
catalog=discover_catalog(WORK/'dula-story',EP);entries,issues=validate_story((EP/'script.story').read_text(encoding='utf8'),catalog)
write('config/story_validation.json',{'runtime':'self-contained viewer registry in bootstrap.js; engine registerAll gate not applicable','entries':len(entries),'errors':[i.__dict__ for i in issues if i.severity=='error'],'warnings':[i.__dict__ for i in issues if i.severity=='warning'],'timingEvidence':'Decoded dialogue durations in timing.json supersede speech-rate estimates'})
assert not any(i.severity=='error' for i in issues)
assets=[]
for p in (EP/'assets/images').glob('*.png'):
 selected=p.name in ['cafe_master_v1.png','cafe_table_v1.png','girl_body_v1.png','boy_body_v1.png'];assets.append({'file':str(p.relative_to(EP)),'sha256':sha(p),'provider':'built-in imagegen','usedInSelectedRender':selected})
write('config/image_sources.json',{'references':[{'file':str(p.relative_to(EP)),'sha256':sha(p)} for p in (EP/'assets/references').glob('*.png')],'assets':assets,'unusedReason':'Portrait/hair candidates were tested on procedural 3D body; body simplification rejected for this episode.'})
production=load('config/production.json');production.update(status='107.5s first version rendering',targetDurationSeconds=timing['duration']);production['qualityStatus'].update(animatedIdentity='Illustrated 2D mesh; limited frontal poses visually sampled',continuousActing='Small side-steps; no large turns; seek/contact checks pending',song='75.56s authorized WAV; 14 lyric phrases aligned; singer assignment listening pending',voice='9 lines generated; ASR pinyin 9/9 exact',finalVideo='rendering');write('config/production.json',production)
print('Viewer story:',len(entries),'entries, no structural errors; audio direction materialized')
