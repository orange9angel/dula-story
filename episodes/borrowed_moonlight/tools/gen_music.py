"""P6 配乐：Seed-Audio 1.0 单要素作曲（监制令）。三段 cue 对应音乐弧线：

piano_open_a/b：0-229 雪夜童话钢琴独奏（两段 115s 交叉淡化接续，Seed-Audio 上限 120s）。
strings_choir ：227-348 弦乐渐入+无词童声合唱（m31 MUSIC_RISE→m37 CHOIR→276 进宫减弱→345 前收尽）。
spring_return ：400-478 暖金回归→日出高潮→FINALE_DIM 渐暗。

prompt 工艺（episode-scoring/composition-prompt-craft）：写曲式分段、配器分层、动态对比与留白，
不写"结构平稳/激烈动感"类平词。童声合唱走 Seed-Audio 无词哼鸣单要素（监制令火山-only；
volc-song-gen/Suno 抽卡链路本轮未启用，见 NOTES P6）。
"""
from pathlib import Path
import hashlib, json, os, subprocess, sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
GEN = WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py'
PY = WORKSPACE / 'dula-story/.venv/Scripts/python.exe'
OUT = EP / 'assets3d/music'

for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
    raw = raw.strip().removeprefix('export ')
    if raw.startswith('#') or '=' not in raw:
        continue
    k, v = raw.split('=', 1)
    if k.strip().startswith('VOLC_'):
        os.environ.setdefault(k.strip(), v.strip().strip('"\''))

CUES = {
    'piano_open_a': ('生成一段115秒纯器乐，无歌声无人声无音效：雪夜童话钢琴独奏，慢板。'
                     '曲式两段：A段呈示雪夜主题——右手高音区单音旋律，孤而不冷，大段落留白；'
                     'B段左手进入分解和弦低语，情绪稍暖。动态 pp 到 p，无鼓点无节拍器感。'),
    'piano_open_b': ('生成一段115秒纯器乐，无歌声无人声无音效：雪夜童话钢琴独奏的延续，慢板，'
                     '同一性格——温柔单线条旋律在安静和弦上重新生长，结尾处旋律渐渐放慢放轻，'
                     '为即将到来的弦乐留出期待。动态 pp 到 p，留白多，无鼓点。'),
    'strings_choir': ('生成一段118秒纯器乐，无歌词无人声念白无音效：童话高潮的弦乐与童声合唱。'
                      '曲式四段：①大提琴低音垫底缓缓进入；②中提琴律动加入，小提琴旋律升起；'
                      '③无词童声合唱用"啊"哼鸣进入最上方，配弦乐全奏推到温暖的 mf 高点，像在托举一个人走向月亮；'
                      '④高点后合唱先退、弦乐逐渐变薄，安静地收向近乎无声。动态对比明确：p 渐强到 mf 再落到 pp。'),
    'spring_return': ('生成一段80秒纯器乐，无歌声无人声无音效：暖金色调的春天回归。'
                      '曲式三段：①钢琴与弦乐在安静晨光中苏醒（p）；②逐渐推向明亮壮丽的日出高潮——'
                      '弦乐全奏、极轻铜管增色，全片最暖最亮（mf-f，不刺耳）；③高潮后迅速柔化，'
                      '尾声是渐弱到近乎静默的钢琴单音。'),
}


def main():
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    fails = []
    for name, prompt in CUES.items():
        if only and name not in only:
            continue
        out = OUT / f'{name}.wav'
        meta = OUT / f'{name}.source.json'
        if out.exists() and meta.exists():
            print(f'SKIP {name}', flush=True)
            continue
        r = subprocess.run([str(PY), str(GEN), '--prompt', prompt, '--out', str(out)],
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode != 0 or not out.exists():
            print(f'FAIL {name}: {(r.stderr or r.stdout).strip()[:200]}', flush=True)
            fails.append(name)
            continue
        meta.write_text(json.dumps({'name': name, 'provider': 'volcano/seed-audio-1.0', 'prompt': prompt,
                                    'sha256': hashlib.sha256(out.read_bytes()).hexdigest()},
                                   ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'gen  {name}', flush=True)
    print(f'done, fails={fails}')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
