from pathlib import Path
import json, hashlib, subprocess
EP=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
save=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
raw=EP/'assets3d/music/romance_suno.wav';out=EP/'assets3d/music/romance_suno_episode.wav'
# Keep natural tempo. First 44.5 seconds establish the melody; the final source
# cadence is brought in for the invitation after a deliberately silent interval.
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)]))
tail=duration-28.8
filters=f'[0:a]atrim=0:44.5,asetpts=PTS-STARTPTS[a];anullsrc=r=48000:cl=stereo,atrim=duration=8.7[b];[0:a]atrim=start={tail}:end={duration},asetpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=0:a=1[out]'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(raw),'-filter_complex',filters,'-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s16le',str(out)],check=True)
meta=read(raw.with_suffix('.source.json'));meta.update(sourceSha256=meta['sha256'],sha256=hashlib.sha256(out.read_bytes()).hexdigest(),edit={'sourceRanges':[[0,44.5],[tail,duration]],'silence':[44.5,53.2],'duration':82,'tempo':1,'policy':'Natural source tempo; no looping. Source tail supplies complete ending cadence.'})
save(out.with_suffix('.source.json'),meta)
plan=read(EP/'config/audio_direction.json');plan['sources'][0]['sha256']=hashlib.sha256((EP/'script.story').read_bytes()).hexdigest()
plan['music']=[{'id':'after_class_tomorrow','provider':'Suno','asset':out.relative_to(EP).as_posix(),'sourceMetadata':out.with_suffix('.source.json').relative_to(EP).as_posix(),
'startTime':0,'endTime':82,'targetRmsDb':-28,'dialogueDuck':.50,'prompt':meta['prompt'],
'reason':'连贯的钢琴与木吉他承托两人的亲近，笑点由对白和眼神完成；困难答复留白，约定明天时回到温暖旋律。',
'envelope':[[0,1],[42.6,1],[44.5,0],[53.2,0],[55.2,1],[79.5,1],[82,0]]}]
save(EP/'config/audio_direction.json',plan)
print(json.dumps(meta['edit']))
