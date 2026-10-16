"""Fit the complete Suno phrase to the episode, then direct explicit mix dynamics."""
from pathlib import Path
import json,subprocess,hashlib
EP=Path(__file__).resolve().parents[1];source=EP/'assets3d/music/romcom_suno.wav';out=source.with_name('romcom_suno_episode.wav')
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(source)]))
ratio=duration/82
assert .95<ratio<1.10
subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-af',f'atempo={ratio:.12f},apad',
    '-t','82','-ar','48000','-ac','2','-c:a','pcm_s16le',str(out)],check=True)
meta=json.loads(source.with_suffix('.source.json').read_text(encoding='utf-8'))
meta.update(source_asset=str(source.relative_to(EP)).replace('\\','/'),source_sha256=meta['sha256'],
    sha256=hashlib.sha256(out.read_bytes()).hexdigest(),edit={'pitchPreservingTempo':ratio,'duration':82,'reason':'Retain the complete opening and closing cadence without looping or cutting the musical phrase.'})
out.with_suffix('.source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=EP/'config/audio_direction.json';plan=json.loads(p.read_text(encoding='utf-8'))
plan['music']=[{'id':'tomorrows_meeting','provider':'Suno','asset':str(out.relative_to(EP)).replace('\\','/'),
    'sourceMetadata':str(out.with_suffix('.source.json').relative_to(EP)).replace('\\','/'),
    'startTime':0,'endTime':82,'targetRmsDb':-27,'dialogueDuck':.45,'prompt':meta['prompt'],
    'reason':'轻快问答动机；罐子笑话后留反应，承认蚀纹无法消失时留白，结尾回到明天见的期待。',
    'envelope':[[0,1],[17.5,1],[18.4,.38],[20.2,.38],[21.4,1],[42.6,1],[44.5,0],[53.2,0],[55.2,1],[79,1],[82,0]]}]
p.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'provider':'Suno','duration':82,'tempo':ratio,'sha256':meta['sha256']}))
