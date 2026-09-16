"""Three original playful/cute beat-edit music auditions using Seed-Audio."""
from pathlib import Path
import importlib.util
import json
import os

ROOT=Path(__file__).resolve().parents[1]
STORY=ROOT.parents[1]
for line in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
    line=line.strip()
    if line.startswith('export '):line=line[7:]
    if line.startswith('VOLC_SPEECH_API_KEY='):
        os.environ['VOLC_SPEECH_API_KEY']=line.split('=',1)[1].strip().strip('\"\'')
spec=importlib.util.spec_from_file_location('seed_audio',STORY/'episodes/cat_leads_e04_firefly_night/tools/seedaudio_gen.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
music=ROOT/'assets/audio/music/v4';music.mkdir(parents=True,exist_ok=True)
common='''生成14秒完整的原创短视频卡点音乐，122 BPM，4/4拍。用途：Q版女孩在音乐重音的瞬间换装、转身、跳起、摆出新表情，每个造型需要被看清。整体气质：俏皮、可爱、糖果感，像一支让人想跟着点头的卖萌舞曲，而不是健身房鼓点。
旋律：高音区一个三四个音的跳跃式短hook（断奏、音程跳动大、一遍就能记住），反复变奏；hook 之间留空隙，形成“问一句、答一句”的对话感。
节奏：底鼓和拍手只打在关键落点上，落点之间有明显留白和切分；安排至少两处“突然抽空半拍再砸下来”的蓄势；强弱对比要夸张，轻的地方像踮着脚走路，重的地方像盖章。不要连续满铺的hi-hat、不要平均用力的咚次打次循环、不要长混响。
曲式：0-2秒只有hook动机加指响，俏皮地探头；2-4秒加入弹跳低音回应，4秒前抽空半拍；4秒起第一轮重音段，每个整秒附近一个清脆的重击落点，中间穿插轻弱的双连音；8秒前再抽空半拍，8-12秒第二轮加强，可以加入口哨或更高的hook变奏；12秒一个最响的利落重击，之后2秒短尾音俏皮收束（例如一个上行的滑音或一个气泡音）。无人声歌词，不引用任何已有旋律。'''
styles=[
 ('d','音色方向：明亮木琴和马林巴演奏hook，橡皮筋般的slap贝斯，干拍手和指响，偶尔一声短口哨；像糖果店里跳舞。'),
 ('e','音色方向：玩具钢琴和方波芯片音演奏hook，短胖有弹性的合成低音，清脆rimshot和儿童玩具打击乐，带一点8-bit的淘气感。'),
 ('f','音色方向：拨弦贝斯和 ukulele 断奏，铜管短促断奏回应hook，摇摆 groove 的刷镲，复古又俏皮的舞会感。')]
for name,style in styles:
    out=music/f'audition_{name}.wav'
    prompt=common+'\n'+style
    (music/f'audition_{name}.prompt.txt').write_text(prompt,encoding='utf-8')
    if out.exists():
        print(f'{name}: cached',flush=True);continue
    duration=module.generate(prompt,out,timeout=300)
    (music/f'audition_{name}.json').write_text(json.dumps({'provider':'Seed-Audio 1.0','prompt_file':f'audition_{name}.prompt.txt','billed_seconds':duration,'status':'audition'},indent=2),encoding='utf-8')
    print(f'{name}: complete, {duration}s, {out.stat().st_size} bytes',flush=True)
