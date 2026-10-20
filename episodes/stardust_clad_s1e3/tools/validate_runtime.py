"""Validate the actual custom viewer route; generic engine dispatch is unused."""
from pathlib import Path
import json,hashlib,re
import jsonschema
EP=Path(__file__).resolve().parents[1];ROOT=EP.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
story=EP/'script.story';digest=hashlib.sha256(story.read_bytes()).hexdigest()
contract=read(EP/'config/scene_contract.json')
schema=read(ROOT/'dula-skills/scene-designer/references/scene-contract.schema.json')
jsonschema.Draft202012Validator(schema).validate(contract)
for n in ['timeline','dialogue','editorial_cuts']:
 assert read(EP/f'config/{n}.json')['source_sha256']==digest,n
events=set(re.findall(r'\{Event:([^|}]+)',story.read_text(encoding='utf-8')))
assert events<= {'Beat','Act','Cue','EditCut'},events
segments=read(EP/'config/timeline.json')['segments']
assert len(segments)==25 and segments[-1]['end']==136
assert [s['start'] for s in segments]==sorted(set(s['start'] for s in segments))
bootstrap=(EP/'bootstrap.js').read_text(encoding='utf-8')
for name in contract['registrations']['characters']+contract['registrations']['scenes']:
 assert name in bootstrap,name
mix=read(EP/'assets3d/mix_report.json')
assert hashlib.sha256((EP/'assets3d/mixed.wav').read_bytes()).hexdigest()==mix['mixed_sha256']
assert len(mix['dialogue'])==19 and all(x['end']<=x['window_end'] for x in mix['dialogue'])
report={'passed':True,'route':'tools/compile_story.py -> performance.js/viewer.js -> render.mjs','schema':True,'story_sha256':digest,
 'events':sorted(events),'duration':136,'dialogue':19,
 'generic_scene_tool':'Not applicable to custom Beat/Cue/Act execution. Its EVT001 errors are retained as an integration limitation; no dummy scene handlers added.',
 'limitations':['No engine custom-event dispatch','No full mesh collision certification','No listening or real-time viewing acceptance','Artistic acceptance is separate']}
(EP/'storyboard/runtime_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
