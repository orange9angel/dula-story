from pathlib import Path
import hashlib,json,subprocess
EP=Path(__file__).resolve().parents[1];BOARD=EP/'storyboard/palace_r25';OUT=EP/'output'
SOURCE=OUT/'stardust_clad_s1e2_palace_r25.mp4'
segments=[(27,7),(58,4),(106,4),(155,3),(163,5)]
filters=[]
for i,(start,duration) in enumerate(segments):
    filters += [f'[0:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS[v{i}]',f'[0:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS[a{i}]']
filters.append(''.join(f'[v{i}][a{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=1[v][a]')
subprocess.run(['ffmpeg','-y','-v','error','-i',str(SOURCE),'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(OUT/'palace_expression_preview_r25.mp4')],check=True)
subprocess.run(['ffmpeg','-y','-v','error','-ss','148','-i',str(SOURCE),'-t','26','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(OUT/'palace_duel_preview_r25.mp4')],check=True)
for name,source,filter in [
    ('expression_sequence',OUT/'palace_expression_preview_r25.mp4','fps=1/2,scale=426:240,tile=3x4'),
    ('combat_sequence',OUT/'palace_duel_preview_r25.mp4','fps=1/2,scale=426:240,tile=3x5'),
    ('comparison_sequence',OUT/'character_metal_comparison_r25.mp4','fps=1/2,scale=720:360,tile=2x6'),
]:
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-vf',filter,'-frames:v','1',str(BOARD/f'{name}.jpg')],check=True)
record={'source':str(SOURCE.relative_to(EP)),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'expressionSegments':segments,'expressionSeconds':sum(d for _,d in segments),'combatSegment':[148,26],'limits':'Hard-cut excerpts of the delivered master with its existing audio; no new acting or replacement dialogue.'}
(BOARD/'preview_build.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps(record))
