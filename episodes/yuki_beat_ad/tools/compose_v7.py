"""Four V7 beat-edit music auditions via Seed-Audio 1.0.

V7 brief (监制): funnier + more explosive than V5; build-drop mandatory;
features learned from top Douyin 卡点 tracks (tmp/douyin/learned_features.md):
accent density ~1-1.3/s with syncopated spacing, pre-drop full-mix silence
gap ~0.2s around 5s, drop lands with 808+bass+brass stabs all-in, post-drop
energy stays high, thick low end, dense hi-hat/FX sprinkles.
"""
from pathlib import Path
import importlib.util
import json
import os

ROOT = Path(__file__).resolve().parents[1]
STORY = ROOT.parents[1]
for line in (STORY / '.env.speech').read_text(encoding='utf-8-sig').splitlines():
    line = line.strip()
    if line.startswith('export '):
        line = line[7:]
    if line.startswith('VOLC_SPEECH_API_KEY='):
        os.environ['VOLC_SPEECH_API_KEY'] = line.split('=', 1)[1].strip().strip('"\'')
spec = importlib.util.spec_from_file_location(
    'seed_audio', STORY / 'episodes/cat_leads_e04_firefly_night/tools/seedaudio_gen.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

music = ROOT / 'assets/audio/music/v7'
music.mkdir(parents=True, exist_ok=True)

common = '''生成14秒完整的原创短视频卡点音乐，105 BPM，4/4拍。用途：Q版女孩换装跳舞卡点广告，人物在底鼓重音瞬间换装、转圈、跳起、做夸张表情。整体气质：搞笑、俏皮、炸、有戏剧性。
编曲必须是清晰的多层结构，各层独立但锁在同一张节拍网格上：
第一层鼓组——短促有弹性的808底鼓只打主要落点，拍手/军鼓在反拍，闭镲和碎镲高密度点缀（每秒至少3下），鼓组本身要有切分，不要节拍器式等距；
第二层贝斯——短胖弹跳的低音，根音锁死底鼓，音尾短促；
第三层主旋律——高音区三四个音的跳音程断奏hook，一遍能记住，反复变奏，可以滑稽；
第四层点缀——铜管断奏、口哨、或拟声“嘿！”“哦~”切片，在hook空隙里密集回答。
结构必须蓄势-释放：0-5秒蓄势段——鼓组抽掉或加低通滤波闷住，贝斯只有根音脉冲，张力逐秒上升，4.5秒起可以加0.3秒间隔的密集鼓roll；约5秒处整轨抽空0.2秒完全静默（所有乐器一起停）；5.05秒drop砸下——底鼓+贝斯+铜管断奏+hook全部同时进场，这是最响的瞬间；5-12秒保持高强度平台不回落，重音落点密集清楚可数（全曲至少15个），间隔有疏有密有切分；12秒一个最响的利落重击；12-14秒俏皮短尾收束。
轻重对比要夸张，动态放开。混音饱满：低频厚而有弹性、层次分明、响度足，不要单层MIDI感。无人声歌词，不引用任何已有旋律。'''
styles = [
    ('a', '乐器方向：玩具钢琴弹hook，808短胖贝斯， bounce鼓组（底鼓+拍手+碎镲），小号断奏和“嘿！”拟声切片点缀，淘气炸裂感。'),
    ('b', '乐器方向：木琴弹hook，指拨低音提琴贝斯加808垫底，摇摆鼓组（刷镲+底鼓+rimshot），铜管组断奏和口哨点缀，复古百老汇混搭现代炸场。'),
    ('c', '乐器方向：方波芯片音弹hook，funky击勾弦贝斯，干底鼓加拍手加手铃鼓组，卡通音效（boing、口哨下滑）点缀，8-bit搞笑感。'),
    ('d', '乐器方向：马林巴弹hook，橡皮筋slap贝斯，底鼓加军鼓的bounce鼓组，萨克斯断奏和气泡音点缀，QQ弹弹的糖果炸场感。')]

for name, style in styles:
    out = music / f'audition_{name}.wav'
    prompt = common + '\n' + style
    (music / f'audition_{name}.prompt.txt').write_text(prompt, encoding='utf-8')
    if out.exists():
        print(f'{name}: cached', flush=True)
        continue
    # output-side risk audit randomly rejects some generations (esp. vocal
    # chops sounding like lyrics) — retry once, then fall back to a
    # no-vocal variant of the same prompt
    duration = None
    for attempt, pr in enumerate([prompt, prompt.replace(
            '或拟声“嘿！”“哦~”切片', '').replace('和“嘿！”拟声切片', '')]):
        try:
            duration = module.generate(pr, out, timeout=300)
            if attempt:
                print(f'{name}: passed on vocal-free retry', flush=True)
            break
        except Exception as e:
            print(f'{name}: attempt {attempt + 1} rejected: {e}', flush=True)
    if duration is None:
        print(f'{name}: FAILED all attempts', flush=True)
        continue
    (music / f'audition_{name}.json').write_text(json.dumps(
        {'provider': 'Seed-Audio 1.0', 'prompt_file': f'audition_{name}.prompt.txt',
         'billed_seconds': duration, 'status': 'audition'}, indent=2),
        encoding='utf-8')
    print(f'{name}: complete, {duration}s, {out.stat().st_size} bytes', flush=True)
