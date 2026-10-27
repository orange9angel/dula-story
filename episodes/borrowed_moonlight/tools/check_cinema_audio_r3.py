"""Validate delivered PCM, exact contact events and intentional musical silence."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
import soundfile as sf
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
subprocess.run(['node',str(WORK/'dula-skills/walk-director/scripts/export_painted_contacts.mjs'),str(EP/'hybrid/config/cinema_staging.json'),str(EP/'tmp/current_contacts_probe.json')],check=True)
expected=json.loads((EP/'tmp/current_contacts_probe.json').read_text())['contacts']
placed=json.loads((EP/'assets3d/sfx/contact_foley_r3.source.json').read_text())['events']
checks={'contacts_match_final_drive':len(expected)==len(placed) and all(a['shot']==b['shot'] and abs(a['time']-b['time'])<1e-6 for a,b in zip(expected,placed))}
mix,sr=sf.read(EP/'assets3d/mixed_r3.wav');checks['duration']=len(mix)==478*sr;checks['peak_below_minus_2_2db']=float(np.abs(mix).max())<=10**(-2.2/20)
music,_=sf.read(EP/'assets3d/stems_r3/music_stem.wav');checks['music_silent_348_400']=bool(np.max(np.abs(music[348*sr:400*sr]))==0)
foley,_=sf.read(EP/'assets3d/sfx/contact_foley_r3.wav');windows=[]
for e in expected:
 at=round(e['time']*sr);x=foley[max(0,at-round(.15*sr)):at+round(.15*sr)]
 windows.append({'time':e['time'],'shot':e['shot'],'peak_in_contact_window':float(np.abs(x).max())})
checks['audible_energy_at_all_contacts']=all(w['peak_in_contact_window']>.0005 for w in windows)
env=json.loads((EP/'config/voice_envs.json').read_text());checks['voice_envelopes_current']=all(env['source_files'][l['id']]==hashlib.sha256((EP/f"assets3d/dialogue/{l['id']}.wav").read_bytes()).hexdigest() for l in env['lines'])
manifest=json.loads((EP/'assets3d/stems_r3/mix_manifest.json').read_text());checks['all_beds_pass']=all(b['after']['rms_max_mean']<1.4 and b['after']['envelope_corr_05_1s']<.15 and b['after']['high_band_4_8k']<.2 for b in manifest['bed_qc'].values())
checks['mix_sources_current']=all(hashlib.sha256((EP/p).read_bytes()).hexdigest()==v['sha256'] for p,v in manifest['source_files'].items())
report={'passed':all(checks.values()),'checks':checks,'peak':float(np.abs(mix).max()),'contacts':windows,'limit':'Energy near a planned contact does not alone prove the perceived attack frame. Model audio observation is advisory, not human listening.'}
(EP/'storyboard/cinema_r3/audio_check.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k!='contacts'},indent=2))
if not report['passed']:raise SystemExit(1)
