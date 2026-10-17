from pathlib import Path
import sys,json,shutil
EP=Path(__file__).resolve().parents[1];STORY=EP.parents[1];WORK=STORY.parent
sys.path.insert(0,str(WORK/'dula-assets/lib/audio'))
from separate_vocals import separate_vocals
song=EP/'assets/audio/song/6ad31639-aa42-4a0f-8351-a9024f49a3c8.wav'
cache=STORY/'tmp/models/torch';rel=Path('torchaudio/models/hdemucs_high_trained.pt')
if not(cache/rel).exists():
 (cache/rel).parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(STORY/'episodes/yuki_beat_ad/tmp/models/torch'/rel,cache/rel)
vocal=separate_vocals(song,EP/'assets/audio/song/stems',cache)
from faster_whisper import WhisperModel
import librosa,numpy as np
model=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True)
segments,info=model.transcribe(str(vocal),language='zh',beam_size=5,word_timestamps=True)
data=[{'start':s.start,'end':s.end,'text':s.text,'words':[{'word':w.word,'start':w.start,'end':w.end} for w in s.words]} for s in segments]
(EP/'config/song_asr.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(data,ensure_ascii=False),flush=True)
y,sr=librosa.load(song,sr=22050);tempo,beats=librosa.beat.beat_track(y=y,sr=sr,units='time')
(EP/'config/song_beats.json').write_text(json.dumps({'tempo':float(np.atleast_1d(tempo)[0]),'beats':beats.tolist(),'source':'librosa measured song waveform'},indent=2))
