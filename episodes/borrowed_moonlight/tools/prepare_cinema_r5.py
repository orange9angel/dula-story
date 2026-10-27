from pathlib import Path
import json,shutil,subprocess
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2];A=EP/'hybrid/assets';O=A/'cinema_r5';C=EP/'hybrid/config'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
gen=Path('C:/Users/orang/.codex/generated_images/01a17d7e-7bf6-79c3-a867-44836e063d22')
for src,dst in [('exec-0118d57d-4881-406d-8e04-ac1cf58ff5d5.png','alder_closed.png'),('exec-9aa9fe59-5416-4864-9a90-04019399ab6b.png','alder_halfblink.png'),('exec-cfd80f97-d412-46f7-b8e6-2b5c10fe0d3a.png','room_mouths.png')]:
 if not (O/dst).exists():shutil.copyfile(gen/src,O/dst)
c=read(C/'art_cast_r4.json'); girl=c['characters']['Eileen']['face']
for key in ['mouth_half','mouth_open']:
 v=girl['variants'][key];v['rect']=[584,580,236,142];v['cores']=[[609,607,168,85,20]]
alder=c['characters']['Alder'];mapping=read(O/'alder_eye_targets.json')['targets']
def atlas_variant(file,rect,cores,target,row=None):
 x,y,w,h=target['crop'];ox,oy,aw,ah=target['atlas']
 if row is not None:oy=row*600
 rx,ry,rw,rh=rect
 return {'img':'cinema_r5/'+file,'rect':rect,'cores':cores,'sourceRect':[ox+(rx-x)*aw/w,oy+(ry-y)*ah/h,rw*aw/w,rh*ah/h],'sourceSize':[1200,1200]}
for i,key in enumerate(['room_attend','room_respond']):
 fr=alder['cels'][key]['faceRig'];t=mapping[i]
 # The raised eye is above the spectacle: separate eye masks leave rims and bridge in place.
 if i==0:
  er=[224,80,55,27];ec=[[232,85,17,13,3],[259,85,10,14,2]];mr=[218,115,34,30];mc=[[226,122,18,14,5]]
 else:
  er=[180,69,60,31];ec=[[186,75,18,14,3],[217,74,13,17,2]];mr=[187,109,32,30];mc=[[192,118,18,13,5]]
 for name,file in [('blink','alder_closed.png'),('blink_half','alder_halfblink.png')]:fr['variants'][name]=atlas_variant(file,er,ec,t)
 fr['blink']={'half':'blink_half','closed':'blink'}
 for name,row in [('half',0),('open',1)]:fr['variants'][name]=atlas_variant('room_mouths.png',mr,mc,t,row)
f=alder['face'];f['blinkByExpression']={}
for i,key in [(2,'shocked'),(3,'relieved')]:
 # Only the eye interior is replaced, never its spectacle frame.
 if key=='shocked':rect=[450,275,370,160];cores=[[486,329,97,84,10],[708,299,95,83,10]]
 else:rect=[450,285,370,150];cores=[[477,351,108,57,8],[704,321,108,58,8]]
 names={}
 for phase,file in [('closed','alder_closed.png'),('half','alder_halfblink.png')]:
  name=f'blink_{key}_{phase}';f['variants'][name]=atlas_variant(file,rect,cores,mapping[i]);names[phase]=name
 f['blinkByExpression']['expr_'+key]=names
# For the default blink, separate eyes avoid changing the spectacle bridge.
f['variants']['blink'].update(rect=[450,285,370,160],cores=[[478,350,110,61,8],[704,320,107,60,8]])
write(C/'art_cast_r5.json',c)
# Keep previous shared inputs for provenance before changing story-derived timing.
archive=EP/'config/cinema_r5_previous';archive.mkdir(exist_ok=True)
for name in ['script.story','config/timeline.json','config/dialogue.json','config/voice_envs.json','config/audio_direction.json']:
 dest=archive/Path(name).name
 if not dest.exists():shutil.copyfile(EP/name,dest)
story=(EP/'script.story').read_text(encoding='utf-8').replace('00:05:15,000 --> 00:05:25,000','00:05:15,000 --> 00:05:29,000').replace('00:05:25,000 --> 00:05:31,000','00:05:29,000 --> 00:05:31,000').replace('id=m03|rate=-8|context=数自己的伤口，平静得让人心疼。','id=m03|rate=-25|context=缓慢袒露伤口，会的之后停一拍，相信明天与仰望天空之后停顿，一颗星轻轻落下。')
(EP/'script.story').write_text(story,encoding='utf-8');subprocess.run(['node',str(EP/'tools/compile_story.mjs')],check=True)
dlg=read(EP/'config/dialogue.json');line=next(x for x in dlg['lines'] if x['id']=='m03');record=read(EP/'assets3d/dialogue/cinema_r5/m03_slow.source.json')
line.update(end=329,window=13.4,segEnd=329,tts_text=record['tts_text']);line['delivery']={'rate':-25,'context':record['context']};write(EP/'config/dialogue.json',dlg)
plan=read(EP/'config/audio_direction.json')
for item in plan['dialogue']:
 if abs(item['startTime']-315)<.01:
  item['endTime']=329;item['intent']='缓慢袒露伤口：先承认，再让每一次失去落下来。';item['delivery']['pace']=.75;item['delivery']['pauseAfterMs']=500
write(EP/'config/audio_direction.json',plan)
s=read(C/'art_shots.json')
for x in s['shots']:
 if x['id']=='m43':x['end']=329
 if x['id']=='m44':x['start']=329
write(C/'art_shots_r5.json',s)
s=read(C/'cinema_staging_r4.json');s['shots']['m43']['end']=329;s['shots']['m44']['start']=329;write(C/'cinema_staging_r5.json',s)
js=(EP/'hybrid/art_pass_r4.js').read_text(encoding='utf-8').replace('art_cast_r4.json','art_cast_r5.json').replace('manifest_r4.json','manifest_r5.json').replace("json('./config/art_shots.json')","json('./config/art_shots_r5.json')").replace('cinema_staging_r4.json','cinema_staging_r5.json')
js=js.replace("blink:'blink',emotions:fc.emotions,","blink:fc.blink??'blink',blinkByExpression:fc.blinkByExpression,emotions:fc.emotions,")
(EP/'hybrid/art_pass_r5.js').write_text(js,encoding='utf-8');(EP/'hybrid/art_pass_r5.html').write_text((EP/'hybrid/art_pass_r4.html').read_text(encoding='utf-8').replace('art_pass_r4.js','art_pass_r5.js'),encoding='utf-8')
manifest=read(A/'manifest_r4.json')
for path in O.glob('*.png'):manifest['assets'].append({'path':'cinema_r5/'+path.name,'role':'same-image facial repair'})
write(A/'manifest_r5.json',manifest)
shutil.copyfile(WORK/'dula-skills/draw-over-animation/assets/feathered-variant-face.js',A/'draw_over_runtime/feathered-variant-face.js')
print('R5 facial inputs and story timing prepared')
