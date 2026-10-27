from pathlib import Path
import subprocess,json,re,hashlib
EP=Path(__file__).resolve().parents[1];out=EP/'output/borrowed_moonlight_cinema_r3_final.mp4'
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out)]));v=next(s for s in info['streams'] if s['codec_type']=='video')
r=subprocess.run(['ffmpeg','-v','info','-i',str(out),'-vn','-af','astats=metadata=1:reset=0','-f','null','NUL'],capture_output=True,text=True)
peaks=[float(x) for x in re.findall(r'Peak level dB:\s*(-?[\d.]+)',r.stderr)];peak=max(peaks)
base=json.loads((EP/'storyboard/cinema_r3/full/full_delivery.json').read_text());assembly=json.loads((EP/'storyboard/cinema_r3b/assembly.json').read_text());audio=json.loads((EP/'storyboard/cinema_r3/audio_check.json').read_text())
checks={'base_full_verified':base['passed'],'repairs_verified':assembly['passed'],'audio_plan_verified':audio['passed'],'frames':int(v['nb_frames'])==14340,'format':v['width']==1280 and v['height']==720 and v['r_frame_rate']=='30/1','duration':abs(float(v['duration'])-478)<1e-6,'aac_peak_safe':peak<=-1.9,'final_file_matches_assembly':hashlib.sha256(out.read_bytes()).hexdigest()==assembly['output_sha256']}
report={'passed':all(checks.values()),'checks':checks,'output':str(out),'size_bytes':out.stat().st_size,'aac_peak_dbfs':peak,'sha256':assembly['output_sha256'],'visual_review':'R3_REVIEW.md','note':'Technical verification, not aesthetic approval.'};(EP/'storyboard/cinema_r3b/delivery.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2));assert report['passed']
