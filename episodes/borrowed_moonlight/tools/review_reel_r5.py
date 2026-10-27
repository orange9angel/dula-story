"""A short review extract from the final delivery, not an alternate story edit."""
from pathlib import Path
import subprocess,json,hashlib
EP=Path(__file__).resolve().parents[1];src=EP/'output/borrowed_moonlight_cinema_r5_final.mp4';out=EP/'output/borrowed_moonlight_r5_review_clips.mp4'
windows=[(117,125),(240.8,246),(247.8,257),(314.5,331),(435,442.5)]
filters=[];parts=[]
for i,(a,b) in enumerate(windows):
 filters += [f'[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]',f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]'];parts.append(f'[v{i}][a{i}]')
filters.append(''.join(parts)+f'concat=n={len(windows)}:v=1:a=1[v][a]')
subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-c:v','libx264','-crf','18','-preset','fast','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out)],check=True)
(EP/'storyboard/cinema_r5/review_reel.json').write_text(json.dumps({'source':str(src.relative_to(EP)),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'windows':windows,'duration':sum(b-a for a,b in windows),'output':str(out.relative_to(EP))},indent=2));print(out)
