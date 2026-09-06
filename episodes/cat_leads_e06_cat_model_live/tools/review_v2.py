"""Local media inspection: ffprobe, unretouched contact sheets, audio envelopes."""
import io
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.signal import butter, sosfiltfilt

EP = Path(__file__).resolve().parents[1]
CHAIN = EP / 'tmp/video_chain'
OUT = EP / 'tmp/v2_review'
OUT.mkdir(parents=True, exist_ok=True)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))


def frame(path, t, size=(384,216)):
    data = subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-vf',f'scale={size[0]}:{size[1]}','-f','image2pipe','-vcodec','png','-'])
    return Image.open(io.BytesIO(data)).convert('RGB')


def audio(path, sr=16000):
    data = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vn','-ac','1','-ar',str(sr),'-f','f32le','-'])
    return np.frombuffer(data, dtype='<f4').copy()


def env(x, sr=16000):
    x = sosfiltfilt(butter(3, [200,3800], fs=sr, btype='bandpass', output='sos'), x)
    n = len(x)//160
    return np.sqrt(np.mean(x[:n*160].reshape(n,160)**2, axis=1))


def span(e):
    active = np.flatnonzero(e > max(0.005,float(e.max())*.14))
    return [round(active[0]*.01,3),round((active[-1]+1)*.01,3)] if len(active) else [0,0]


def main():
    paths = sorted(CHAIN.glob('v2_*.mp4'))
    report = []
    for page in range(0,len(paths),5):
        chunk = paths[page:page+5]
        sheet = Image.new('RGB',(1152,246*len(chunk)), '#15191f')
        draw = ImageDraw.Draw(sheet)
        for j,path in enumerate(chunk):
            p = probe(path)
            dur = float(p['format']['duration'])
            a = audio(path)
            e = env(a)
            row = {'file':str(path.relative_to(EP)), 'duration':dur,'streams':[{k:s.get(k) for k in ['codec_type','codec_name','width','height','avg_frame_rate','sample_rate']} for s in p['streams']], 'speechEnergySpan':span(e)}
            report.append(row)
            for k,t in enumerate([.3,dur/2,max(.3,dur-.5)]):
                sheet.paste(frame(path,t),(k*384,j*246+30))
                draw.text((k*384+8,j*246+7),f'{path.stem} / {t:.2f}s',fill='white')
            np.save(OUT/(path.stem+'_env.npy'),e)
        sheet.save(OUT/f'contact_{page//5+1}.jpg',quality=92)
    (OUT/'media_inventory.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps([{k:r[k] for k in ['file','duration','speechEnergySpan']} for r in report],indent=2))


if __name__ == '__main__':
    main()
