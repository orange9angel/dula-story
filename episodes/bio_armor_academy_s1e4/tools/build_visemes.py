"""Use shared known-text DTW + V17 visemes against final placed dialogue PCM."""
from pathlib import Path
import argparse,hashlib,json,re,sys
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from faster_whisper import WhisperModel
from faster_whisper.tokenizer import Tokenizer
from pypinyin import pinyin,Style
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--episode-dir',type=Path,default=ROOT)
EP=parser.parse_args().episode_dir.resolve()
sys.path.insert(0,str(ROOT.parents[2]/'dula-assets/lib/audio'))
from known_text_alignment import align_text
from viseme_core import build_viseme_track
def load(p):return json.loads(p.read_text(encoding='utf-8'))
timing=load(EP/'config/audio_timing.json');voice=load(EP/'config/voice_features.json')
model=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True)
make_tok=lambda:Tokenizer(model.hf_tokenizer,model.model.is_multilingual,task='transcribe',language='zh')
aligned=[];cache=EP/'tmp/alignment_r3';cache.mkdir(exist_ok=True)
for line in timing['lines']:
    source=EP/line['processed'];text=''.join(re.findall('[\u4e00-\u9fff]',line['text']))
    key=hashlib.sha256(source.read_bytes()+text.encode()).hexdigest();dest=cache/(line['id']+'.json')
    old=load(dest) if dest.exists() else {}
    if old.get('key')==key:chars=old['chars']
    else:
        chars,duration=align_text(model,make_tok,source,text)
        dest.write_text(json.dumps({'key':key,'chars':chars},ensure_ascii=False,indent=2),encoding='utf-8')
    initials=pinyin(text,style=Style.INITIALS,strict=False);finals=pinyin(text,style=Style.FINALS,strict=False)
    for i,c in enumerate(chars):
        aligned.append({**c,'start':c['start']+line['start'],'end':c['end']+line['start'],
          'initial':initials[i][0],'final':finals[i][0],'character':line['character'],'line':line['id']})
    print('DTW',line['id'],len(chars),'characters',flush=True)
for name,info in voice['stems'].items():
    sr,x=wavfile.read(EP/info['path']);x=x.astype(np.float32)/32768;hop=round(sr*.01)
    rms=np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1,hop)**2,axis=1))
    active=rms[rms>.004];scale=float(np.percentile(active,85))
    env=uniform_filter1d(np.clip(rms/max(scale,1e-8),0,1),size=7,mode='nearest')
    gate=np.where(rms>.004,1.,0.)
    amp=lambda t:float(env[min(len(env)-1,max(0,round(t/.01)))])
    chars=sorted([c for c in aligned if c['character']==name],key=lambda c:c['start'])
    track=build_viseme_track(chars,amp,timing['duration'])
    assert all(a['t']<b['t'] for a,b in zip(track,track[1:]))
    obj={'keyframes':track,'step':.01,'gate':gate.tolist()+[0],'sourceStemSha256':info['sha256'],'method':'per-character known-text Whisper DTW; pinyin V17 continuous visemes; final PCM silence gate'}
    (EP/f'config/viseme_{name.lower()}.json').write_text(json.dumps(obj,ensure_ascii=False),encoding='utf-8')
(EP/'config/dialogue_alignment.json').write_text(json.dumps({'sourceStory':timing['sourceStory'],'chars':aligned},ensure_ascii=False,indent=2),encoding='utf-8')
print('DTW and two character viseme tracks complete')
