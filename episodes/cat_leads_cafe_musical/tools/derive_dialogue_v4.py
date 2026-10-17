"""Make the opening preview from the finished, verified full visual render.

The report explicitly inherits geometry evidence from that full render; it is
not presented as a second independent GPU rendering or collision audit.
"""
from pathlib import Path
import json,subprocess
EP=Path(__file__).resolve().parents[1]
full=EP/'output/half_beat_sunshine_craft3d_v4.mp4'
report=json.loads((EP/'storyboard/craft3d_full_v4/render.json').read_text(encoding='utf8'))
seek=report['seek'];retry=seek.get('recheck',{})
assert report['duration']==107.5 and not report['errors']
assert not seek['mismatches'] or (retry.get('samples')==seek['samples'] and retry.get('mismatches')==[])
subprocess.run(['ffmpeg','-v','error','-y','-i',str(full),'-i',str(EP/'assets/audio/final/mixed.wav'),'-map','0:v:0','-map','1:a:0','-t','23','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(EP/'output/cafe_3d_dialogue_v4.mp4')],check=True)
report['trace']=[s for s in report['trace'] if s['time']<23]
report['beatHits']=[b for b in report['beatHits'] if b['time']<23]
report['duration']=23
report['derivedFrom']='output/half_beat_sunshine_craft3d_v4.mp4; first 690 frames re-encoded with the unchanged source mix'
report['seek']={'samples':len(report['trace']),'mismatches':[],'source':'Corresponding exact-hash samples from full render and its independently recorded reverse-order recheck'}
report['footAudit']['scope']='Inherited full 107.5s render evidence, including this opening segment: '+report['footAudit']['scope']
out=EP/'storyboard/craft3d_dialogue_v4/render.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('23s preview cut from final full render; inherited runtime evidence identified.')
