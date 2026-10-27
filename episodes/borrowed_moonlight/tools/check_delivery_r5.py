from pathlib import Path
import hashlib,json,re,subprocess
EP=Path(__file__).resolve().parents[1];B=EP/'storyboard/cinema_r5'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
a=read(B/'assembly.json');video=EP/a['output'];m=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]));v=next(s for s in m['streams'] if s['codec_type']=='video')
checks={'assembly':a['passed'],'acting_coverage':read(B/'acting/report.json')['passed'],'feature_guards':read(B/'preview/report.json')['passed'],'spatial_probe':read(B/'probe.json')['passed'],'local_audio_patch':read(B/'audio_patch.json')['passed'],'aac_and_other_voice_timing':read(B/'audio_delivery.json')['passed'],'final_hash':sha(video)==a['output_sha256'],'frames':int(v['nb_frames'])==14340,'duration':float(v['duration'])==478,'size':(v['width'],v['height'])==(1280,720)}
before=(EP/'config/cinema_r5_previous/script.story').read_text(encoding='utf-8');after=(EP/'script.story').read_text(encoding='utf-8');checks['dialogue_words_preserved']=re.findall(r'^\[\w+\].*$',before,re.M)==re.findall(r'^\[\w+\].*$',after,re.M)
for i in range(5):
 c=read(EP/f'hybrid/config/cinema_r5_act_{i}.json');b=read(EP/c['pilot']['board']/'build.json');checks[f'act_{i}_config_current']=c==b['pipeline']['config'];checks[f'act_{i}_sources_current']=all(sha(EP/x['path'])==x['sha256'] for x in b['source'])
old=read(EP/'hybrid/config/cinema_staging_r4.json');new=read(EP/'hybrid/config/cinema_staging_r5.json');checks['walk_staging_unchanged']=all(s==new['shots'][k] for k,s in old['shots'].items() if k not in ['m43','m44'])
r={'passed':all(checks.values()),'checks':checks,'video':a['output'],'sha256':sha(video),'size_bytes':video.stat().st_size,'media':m,'note':'Technical verification, not full real-time screening or emotional listening acceptance.'};(B/'delivery.json').write_text(json.dumps(r,indent=2),encoding='utf-8');print(json.dumps({k:r[k] for k in ['passed','checks','sha256','size_bytes']},indent=2))
if not r['passed']:raise SystemExit(1)
