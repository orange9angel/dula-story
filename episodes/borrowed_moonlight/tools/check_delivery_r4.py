from pathlib import Path
import json,hashlib,subprocess
EP=Path(__file__).resolve().parents[1];B=EP/'storyboard/cinema_r4'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assembly=json.loads((B/'assembly.json').read_text());acting=json.loads((B/'acting/report.json').read_text());probe=json.loads((B/'probe.json').read_text());contacts=json.loads((B/'contact_timing.json').read_text())
video=EP/assembly['output'];media=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]));v=next(x for x in media['streams'] if x['codec_type']=='video')
checks={'assembly':assembly['passed'],'visible_dialogue_and_patch_pixels':acting['passed'],'shot_probe':probe['passed'],'contact_clock':contacts['passed'],'final_digest':sha(video)==assembly['output_sha256'],'frame_count':int(v['nb_frames'])==14340,'size':(v['width'],v['height'])==(1280,720),'duration':abs(float(v['duration'])-478)<.001}
for i in range(5):
 c=json.loads((EP/f'hybrid/config/cinema_r4_act_{i}.json').read_text());b=json.loads((EP/c['pilot']['board']/'build.json').read_text());checks[f'act_{i}_config_current']=c==b['pipeline']['config']
report={'passed':all(checks.values()),'checks':checks,'video':assembly['output'],'sha256':sha(video),'media':media,'size_bytes':video.stat().st_size,'note':'Technical delivery; see R4_REVIEW.md for observed improvements and limits.'};(B/'delivery.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({'passed':report['passed'],'checks':checks},indent=2))
if not report['passed']:raise SystemExit(1)
