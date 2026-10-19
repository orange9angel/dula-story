"""Verify the actual four stems, dialogue envelopes and picture-event alignment."""
from pathlib import Path
import hashlib,json,sys
import numpy as np
import soundfile as sf

EP=Path(__file__).resolve().parents[1]
def read(p):return json.loads((EP/p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    report=read('assets3d/mix_report.json');tl=read('config/timeline.json');cue=read('config/event_times.json')
    env=read('config/voice_envs.json');dlg=read('config/dialogue.json');issues=[];warnings=[]
    stems={k:sf.read(EP/f'assets3d/stems_palace/{k}.wav',always_2d=True)[0] for k in ['voice','music','sfx','ambience']}
    mixed,sr=sf.read(EP/'assets3d/mixed.wav',always_2d=True)
    if abs(len(mixed)/sr-tl['duration'])>.001:issues.append('mix duration differs from story')
    if env['source_sha256']!=sha(EP/'assets3d/mixed.wav'):issues.append('stale lip-sync source')
    if report['source_story_sha256']!=tl['source_sha256']:issues.append('stale sound direction')
    if np.max(np.abs(mixed))>10**(-1.8/20):issues.append('peak exceeds ceiling')
    for name,s in stems.items():
        if s.shape!=mixed.shape:issues.append(f'{name}: missing samples')
    residual=float(np.max(np.abs(mixed-sum(stems.values()))))
    if residual>5/32768:issues.append('mix does not equal exported stems')
    ratios=[]
    background=stems['music']+stems['ambience']+stems['sfx']
    for line,e in zip(dlg['lines'],env['lines']):
        if line['id']!=e['id'] or abs(line['t']-e['t0'])>.001:issues.append(f"{line['id']}: stale voice timing")
        if sha(EP/f"assets3d/dialogue/{line['id']}.wav")!=e['sha256']:issues.append(f"{line['id']}: stale waveform")
        a=round(e['t0']*sr);b=round((e['t0']+e['dur'])*sr)
        v=stems['voice'][a:b];bg=background[a:b]
        level=np.max(np.abs(v),axis=1);mask=level>max(.004,float(level.max())*.08)
        if not np.any(mask):issues.append(f"{line['id']}: no audible voice");continue
        vr=float(np.sqrt(np.mean(v[mask]**2)));br=float(np.sqrt(np.mean(bg[mask]**2)))
        ratio=20*np.log10(vr/max(br,1e-8));ratios.append({'id':line['id'],'voiceOverBackgroundDb':round(ratio,2)})
        if ratio<3:issues.append(f"{line['id']}: speech masked ({ratio:.1f} dB)")
        elif ratio<6:warnings.append(f"{line['id']}: narrow speech margin ({ratio:.1f} dB)")
        if not any(e['jaw']):issues.append(f"{line['id']}: frozen mouth envelope")
    required={'C1':'cosmic_clash','C2':'blade_shield','C3':'cosmic_clash','C4':'armor_impact','C5':'cosmic_clash','C6':'cosmic_clash','TRAP':'blade_shield','LOCK':'shield_bang','RELEASE':'flame_release','C7':'cosmic_detonation'}
    events=[]
    for key,name in required.items():
        matching=[x for x in report['events'] if x['name']==name and abs(x['startTime']-cue[key])<=.04]
        if not matching:issues.append(f'{key}: missing aligned effect');continue
        t=cue[key];a=round(t*sr);b=round((t+.15)*sr)
        peak=float(np.abs(stems['sfx'][a:b]).max())
        if peak<.004:issues.append(f'{key}: no SFX energy at contact')
        events.append({'cue':key,'t':t,'peakFirst150ms':round(peak,5)})
    if any(x['name'].startswith('beast_') or x['name']=='claw_scrape' for x in report['events']):issues.append('animal effect in human episode')
    wind,srw=sf.read(EP/'assets3d/sfx/night_wind_edited.wav',always_2d=True)
    mono=wind.mean(axis=1);n=len(mono)//srw
    rms=np.sqrt(np.mean(mono[:n*srw].reshape(n,srw)**2,axis=1))
    wind_ratio=float(rms.max()/max(rms.mean(),1e-8))
    if wind_ratio>1.4:warnings.append(f'wind bed uneven: max/mean={wind_ratio:.2f}')
    output={'passed':not issues,'duration':len(mixed)/sr,'peak':float(np.abs(mixed).max()),
        'mixStemResidual':residual,'dialogue':ratios,'events':events,'windMaxMeanRms':wind_ratio,
        'warnings':warnings,'failures':issues,'limit':'Numerical audibility and synchronization; aesthetic hearing is separately documented.'}
    (EP/'assets3d/audio_sync_report.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in output.items() if k not in ['dialogue','limit']},ensure_ascii=False))
    return 2 if issues else 0
if __name__=='__main__':sys.exit(main())
