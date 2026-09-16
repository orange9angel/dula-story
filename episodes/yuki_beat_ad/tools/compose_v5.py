"""Five original layered-arrangement beat-edit music auditions using Seed-Audio."""
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
music=ROOT/'assets/audio/music/v5';music.mkdir(parents=True,exist_ok=True)
common='''生成14秒完整的原创短视频卡点音乐，122 BPM，4/4拍。用途：Q版女孩在底鼓重音的瞬间换装、转圈、跳起、换表情，每个造型需要被看清。整体气质俏皮、可爱、糖果感。
编曲必须是清晰的多层结构，各层独立但锁在同一张节拍网格上：
第一层鼓组——短促干脆的底鼓只打在主要落点（大约每0.5秒或每1秒一下），干拍手或军鼓在反拍，闭镲只做极轻的点缀，不要铺满；
第二层贝斯——弹跳式贝斯线，根音跟住底鼓，与鼓严丝合缝；
第三层主旋律——高音区三四个音的断奏hook，音程跳动大、一遍能记住，反复变奏；
第四层点缀——木琴、铃铛、口哨或气泡音效，在主旋律空隙里做“回答”。
节奏上安排至少两处“突然抽空半拍再砸下来”的蓄势；轻重对比夸张。混音要饱满：低频有弹性、各乐器层次分明、整体响度足，不要干巴巴的单层 MIDI 感。
曲式：0-2秒hook动机加指响探头；2-4秒贝斯和鼓进入，4秒前抽空半拍；4-8秒第一轮重音段，底鼓落点清楚可数；8秒前再抽空半拍；8-12秒第二轮加强，点缀层更密；12秒一个最响的利落重击；12-14秒短尾音俏皮收束。无人声歌词，不引用任何已有旋律。'''
styles=[
 ('a','乐器方向：玩具钢琴弹hook，芯片方波贝斯，拍手加rimshot鼓组，口哨和铃铛点缀，8-bit淘气感。'),
 ('b','乐器方向：马林巴弹hook，橡皮筋slap贝斯，底鼓加拍手的干鼓组，木鱼和三角铁点缀，糖果店舞会感。'),
 ('c','乐器方向：玩具铃铛双音hook，短胖弹跳合成贝斯，底鼓加军鼓的bounce鼓组，气泡音和木琴点缀，QQ弹弹的萌感。'),
 ('d','乐器方向：拨弦ukulele弹hook，指拨低音提琴贝斯，刷镲加底鼓的摇摆鼓组，小号断奏点缀，复古俏皮的百老汇感。'),
 ('e','乐器方向：方波合成器弹hook，funky击勾弦贝斯，底鼓拍手加手铃的鼓组，短促人声拟声“嘿！”做点缀，元气满满的偶像舞台感。')]
for name,style in styles:
    out=music/f'audition_{name}.wav'
    prompt=common+'\n'+style
    (music/f'audition_{name}.prompt.txt').write_text(prompt,encoding='utf-8')
    if out.exists():
        print(f'{name}: cached',flush=True);continue
    duration=module.generate(prompt,out,timeout=300)
    (music/f'audition_{name}.json').write_text(json.dumps({'provider':'Seed-Audio 1.0','prompt_file':f'audition_{name}.prompt.txt','billed_seconds':duration,'status':'audition'},indent=2),encoding='utf-8')
    print(f'{name}: complete, {duration}s, {out.stat().st_size} bytes',flush=True)
