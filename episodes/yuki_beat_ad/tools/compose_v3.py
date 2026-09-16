"""Three original short transformation-edit music auditions using Seed-Audio."""
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
music=ROOT/'assets/audio/music/v3';music.mkdir(parents=True,exist_ok=True)
common='''生成14秒完整的原创短视频变装卡点音乐，120 BPM，4/4拍。用途：Q版女孩在强拍瞬间戴上墨镜、换成不同风格服装并摆一个新表情。声音必须有非常明确的“等一下——啪！变样”的期待与兑现。绝对不能做成连续铺陈的背景配乐，绝对不能用健身操直白咚次打次鼓循环。每次主要鼓击之后留出短空隙，让一个造型被看见。鼓头尖锐清脆、低频短而弹，干声、近距离，节奏切分、有前后轻重。
曲式：0-2秒只用一个可记住的三音短动机和指响，留空；2-4秒短动机回应加弹跳低音，4秒前突然抽空半拍；4秒开始drop，用短促底鼓和干拍手强调每整秒的变装点，期间穿插轻弱的双连音，强弱分明；8秒前再抽空半拍，8-11秒第二轮drop加强，11-12秒安排两组短短长节奏，12秒最后一个利落重击，12-14秒短尾音收束。主要击打要有停顿和不同音色的辨识度，不要满屏hi-hat和连续琶音。主旋律三四个音反复变奏，听一遍能记住；不要大段和弦铺底、长混响、弦乐和流水钢琴。无人声歌词，无口播，不引用任何已有旋律。'''
styles=[
 ('a','风格：俏皮的kawaii future funk，橡皮筋一样的slap贝斯、木质敲击、干指响，糖果色短合成器hook，甜但带一点装酷。'),
 ('b','风格：可爱变装的bounce club edit，短胖的808低音、清脆rimshot、两个音的玩具铃铛hook，强烈的停走节奏，每个重击像盖一个俏皮的章。'),
 ('c','风格：俏皮的electro swing breakbeat，拨弦贝斯、拍手、铜管短促断奏的三音hook，强调轻轻两下然后重重一下的反差，混音清晰干净。')]
for name,style in styles:
    out=music/f'audition_{name}.wav'
    prompt=common+'\n'+style
    (music/f'audition_{name}.prompt.txt').write_text(prompt,encoding='utf-8')
    if out.exists():
        print(f'{name}: cached',flush=True);continue
    duration=module.generate(prompt,out,timeout=300)
    (music/f'audition_{name}.json').write_text(json.dumps({'provider':'Seed-Audio 1.0','prompt_file':f'audition_{name}.prompt.txt','billed_seconds':duration,'status':'audition'},indent=2),encoding='utf-8')
    print(f'{name}: complete, {duration}s, {out.stat().st_size} bytes',flush=True)
