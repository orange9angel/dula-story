"""Build the authoritative story, final stems, aligned mouth cues and subtitles."""
from pathlib import Path
import sys,json,re,hashlib,subprocess,difflib
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt
from pypinyin import lazy_pinyin,Style
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2];sys.path.insert(0,str(WORK/'dula-assets/lib/audio'))
from known_text_alignment import align_text
from viseme_core import build_viseme_track
from faster_whisper import WhisperModel
from faster_whisper.tokenizer import Tokenizer
SR=48000;SONG_START=19.0;SONG_FILE=EP/'assets/audio/song/6ad31639-aa42-4a0f-8351-a9024f49a3c8.wav';OUT=EP/'assets/audio/final';OUT.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','2','-ar',str(SR),'pipe:1']);return np.frombuffer(raw,np.float32).reshape(-1,2).copy()
def norm(x,db):
 rms=np.sqrt(np.mean(x*x));return x*(10**(db/20)/max(rms,1e-7))
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
def pure(s):return ''.join(re.findall('[一-鿿]',s))
source={}
for block in (EP/'script.story.draft').read_text(encoding='utf8').strip().split('\n\n'):
 lines=block.splitlines();m=re.search(r'\[(Girl|Boy)\](.*)',block)
 if m:source[int(lines[0])]={'character':m[1],'text':re.sub(r'\{[^}]+\}','',m[2]).strip(),'tagged':lines[2]}
song=read(SONG_FILE);song_duration=len(song)/SR;song_end=SONG_START+song_duration;duration=round(song_end+12.94,2);n=round(duration*SR)
stems={k:np.zeros((n,2),np.float32) for k in ['Girl','Boy','music','ambience','foley']};entries=[];subtitles=[];chars={k:[] for k in ['Girl','Boy']};lines=[]
def event(a,b,text):entries.append({'start':a,'end':b,'text':text})
def put(key,audio,t,gain=1):
 a=round(t*SR);b=min(n,a+len(audio));stems[key][a:b]+=audio[:b-a]*gain
event(0,2.6,'@CafeMusicalScene')
schedule={2:2.6,3:6.6,4:9.7,6:14.4,7:15.85,10:song_end+.74,11:song_end+2.79,12:song_end+4.94,13:song_end+7.04}
model=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True);tokenizer=lambda:Tokenizer(model.hf_tokenizer,model.model.is_multilingual,task='transcribe',language='zh')
qc=[]
for ident,t in schedule.items():
 d=source[ident];p=EP/f'assets/audio/dialogue/{ident}.mp3';audio=read(p);audio=sosfilt(butter(2,70,'highpass',fs=SR,output='sos'),audio,axis=0).astype(np.float32);audio=norm(audio,-20)
 put(d['character'],audio,t);end=t+len(audio)/SR;event(t,end+.10,d['tagged']);subtitles.append({'start':t,'end':end+.2,'text':d['text'],'character':d['character'],'kind':'dialogue'})
 c,_=align_text(model,tokenizer,p,pure(d['text']));chars[d['character']]+=[{**v,'start':v['start']+t,'end':v['end']+t} for v in c]
 segs,_=model.transcribe(str(p),language='zh',beam_size=3);actual=''.join(s.text for s in segs);ratio=difflib.SequenceMatcher(None,lazy_pinyin(pure(actual)),lazy_pinyin(pure(d['text']))).ratio();qc.append({'id':ident,'expected':d['text'],'asr':actual,'pinyinSimilarity':ratio,'duration':len(audio)/SR});print('dialogue',ident,round(ratio,3),flush=True)
 lines.append({'id':ident,**d,'start':t,'end':end,'sourceSha256':sha(p)})
event(11.9,14.2,'{Event:CeramicPickup}');event(17.85,19,'{Event:SunlightPause}');event(SONG_START,song_end,'{Event:CafeDuet}');event(song_end+8.9,duration,'{Event:CafeCoda}')
entries.sort(key=lambda x:x['start']);story='\n\n'.join(f'{i+1}\n{stamp(e["start"])} --> {stamp(e["end"])}\n{e["text"]}' for i,e in enumerate(entries))+'\n';(EP/'script.story').write_text(story,encoding='utf8')
vocals=read(EP/'assets/audio/song/stems/vocals.wav');asr=json.loads((EP/'config/song_asr.json').read_text(encoding='utf8'));lyrics=[l.strip() for l in (EP/'config/song_lyrics.txt').read_text(encoding='utf8').splitlines() if re.search('[一-鿿]',l)]
assert len(lyrics)==len(asr),(len(lyrics),len(asr))
song_gain=10**(-19.5/20)/np.sqrt(np.mean(song*song));put('music',song,SONG_START,song_gain)
lyric_events=[]
for i,(text,segment) in enumerate(zip(lyrics,asr)):
 start=max(0,segment['start']-.12);end=min(song_duration,segment['end']+.18);chunk=EP/'tmp/audio'/f'lyric_{i:02}.wav';chunk.parent.mkdir(parents=True,exist_ok=True);sf.write(chunk,vocals[round(start*SR):round(end*SR)],SR)
 aligned,_=align_text(model,tokenizer,chunk,pure(text));roles=['Girl'] if i<4 else ['Boy'] if i<8 else ['Girl','Boy']
 for c in aligned:c['start']+=start;c['end']+=start
 # Snap each known-text onset to a local rising vocal-energy edge; silence
 # gating remains independent of the sustained vowel envelope.
 mono=np.mean(vocals,axis=1);hop=480;env=np.array([np.sqrt(np.mean(mono[j:j+hop]**2)) for j in range(0,len(mono),hop)])
 for c in aligned:
  center=round(c['start']/.01);lo=max(1,center-12);hi=min(len(env)-1,center+13);diff=np.maximum(0,np.diff(env[lo-1:hi]));best=lo+int(np.argmax(diff)) if len(diff) and diff.max()>.002 else center;c['start']=max(start,best*.01-.03)
 for k,c in enumerate(aligned):
  if k+1<len(aligned):c['end']=min(c['end'],aligned[k+1]['start'])
  c['end']=max(c['start']+.025,c['end'])
  for actor in roles:chars[actor].append({**c,'start':c['start']+SONG_START,'end':c['end']+SONG_START})
 a=max(0,round((segment['start']-.06)*SR));b=min(len(vocals),round((segment['end']+.06)*SR))
 for actor in roles:put(actor,vocals[a:b],SONG_START+a/SR,song_gain)
 e={'start':SONG_START+aligned[0]['start'],'end':SONG_START+max(c['end'] for c in aligned),'text':text,'character':'+'.join(roles),'kind':'song'};subtitles.append(e);lyric_events.append(e);print('lyric',i,text,flush=True)
ambient=read(EP/'assets/audio/foley/ambience.wav');ambient=sosfilt(butter(2,[70,1800],'bandpass',fs=SR,output='sos'),ambient,axis=0).astype(np.float32)
# Flatten long-term bed swells and crossfade repetition rather than butt-loop.
hop=24000;rms=np.array([np.sqrt(np.mean(ambient[j:j+hop]**2)) for j in range(0,len(ambient),hop)]);gain=np.interp(np.arange(len(ambient)),np.arange(len(rms))*hop+hop/2,np.median(rms)/np.maximum(rms,1e-7));ambient=norm(ambient*gain[:,None],-43);fade=SR
for a in range(0,n,len(ambient)-fade):
 clip=ambient.copy();clip[:fade]*=np.linspace(0,1,fade)[:,None];clip[-fade:]*=np.linspace(1,0,fade)[:,None];put('ambience',clip,a/SR)
foley=read(EP/'assets/audio/foley/foley.wav');mono=np.max(np.abs(foley),axis=1);onset=max(0,np.flatnonzero(mono>mono.max()*.1)[0]-round(.01*SR));foley=foley[onset:];foley=norm(foley,-26)
for t in [12.65,13.25]:put('foley',foley,t)
# Per-actor stems are mouth drivers; music already contains those vocals.
dialogue_mix=np.zeros((n,2),np.float32)
for d in lines:
 a=round(d['start']*SR);b=round(d['end']*SR);dialogue_mix[a:b]+=stems[d['character']][a:b]
mixed=dialogue_mix+stems['music']+stems['ambience']+stems['foley'];peak=float(np.max(np.abs(mixed)));master_gain=min(1,.94/max(peak,1e-9));mixed*=master_gain
sf.write(OUT/'mixed.wav',mixed,SR,subtype='PCM_16');cue=[];reports={}
for actor in ['Girl','Boy']:
 data=stems[actor];sf.write(OUT/(actor+'.wav'),data,SR,subtype='PCM_16');mono=np.mean(data,axis=1);rms=np.array([np.sqrt(np.mean(mono[j:j+480]**2)) for j in range(0,len(mono),480)]);threshold=max(.002,float(np.percentile(rms[rms>.001],12))*.35);raw=np.clip(rms/max(.001,np.percentile(rms,92)),0,1);env=[];prev=0
 for value in raw:prev+=(1-np.exp(-.01/(.015 if value>prev else .25)))*(value-prev);env.append(prev)
 ch=sorted(chars[actor],key=lambda c:c['start'])
 for i,c in enumerate(ch):
  if i+1<len(ch):c['end']=min(c['end'],ch[i+1]['start'])
  c['initial']=lazy_pinyin(c['ch'],style=Style.INITIALS,strict=False)[0];c['final']=lazy_pinyin(c['ch'],style=Style.FINALS,strict=False)[0]
 amp=lambda t:float(env[min(len(env)-1,max(0,round(t/.01)))])
 track=build_viseme_track(ch,amp,duration);ts=np.array([k['t'] for k in track]);jaw=np.array([k['jaw'] for k in track]);width=np.array([k['width'] for k in track]);assert np.all(np.diff(ts)>=0)
 for j in range(len(rms)):
  t=j*.01;gate=rms[j]>threshold;v=float(np.interp(t,ts,jaw)) if gate else 0;cue.append({'character':actor,'start':round(t,2),'end':round(t+.01,2),'jaw':round(v*.90,4),'width':round(1+float(np.interp(t,ts,width))*.25,4)})
 reports[actor]={'sourceSha256':sha(OUT/(actor+'.wav')),'silenceThreshold':threshold,'silentFrames':int(np.sum(rms<=threshold)),'method':'Demucs + known-text DTW + local onset snap + V17 jaw/width; original singers not voice-converted','chars':ch}
for name in ['ambience','foley','music']:sf.write(OUT/(name+'.wav'),stems[name],SR,subtype='PCM_16')
(EP/'config/visemes.json').write_text(json.dumps(cue,separators=(',',':')),encoding='utf8');(EP/'config/alignment.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf8')
(EP/'config/subtitles.json').write_text(json.dumps(sorted(subtitles,key=lambda x:x['start']),ensure_ascii=False,indent=2),encoding='utf8')
(EP/'config/timing.json').write_text(json.dumps({'duration':duration,'songStart':SONG_START,'songEnd':song_end,'dialogue':lines,'lyrics':lyric_events,'foley':[12.65,13.25],'masterGain':master_gain,'peakBeforeMaster':peak,'storySha256':sha(EP/'script.story'),'singerRoleReview':'Prompt assignments pending human listening; ASR checks lyrics only'},ensure_ascii=False,indent=2),encoding='utf8')
(EP/'config/dialogue_qc.json').write_text(json.dumps(qc,ensure_ascii=False,indent=2),encoding='utf8')
print('FINAL',duration,'seconds, peak',float(np.max(np.abs(mixed))),flush=True)
