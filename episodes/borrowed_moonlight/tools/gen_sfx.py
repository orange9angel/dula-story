"""P6 环境音/Foley：全部 Seed-Audio 1.0 单要素生成（监制令：算法合成禁止进正片）。

床：prompt 显式锁"平稳、无阵风、无节律性涌动、音量恒定"（底床三道验收在 remix_audio 的
level_bed 里做：RMS max/mean、0.5-1s 自相关、4-8kHz 嘶声占比）。
事件：每个素材登记 timeline.json 画面事件秒点（摆点在 remix_audio.py）。
skip-if-exists + 逐文件 source.json（provider/prompt/sha256）。
"""
from pathlib import Path
import hashlib, json, os, subprocess, sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
GEN = WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py'
PY = WORKSPACE / 'dula-story/.venv/Scripts/python.exe'
OUT = EP / 'assets3d/sfx'

for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
    raw = raw.strip().removeprefix('export ')
    if raw.startswith('#') or '=' not in raw:
        continue
    k, v = raw.split('=', 1)
    if k.strip().startswith('VOLC_'):
        os.environ.setdefault(k.strip(), v.strip().strip('"\''))

BED_LOCK = '平稳、无阵风、无节律性涌动、音量恒定。'
BEDS = {
    'wind_snowtown': f'生成一段90秒纯环境音，无音乐无人声无事件音效：雪夜小镇的安静低风，空气冷而干净，{BED_LOCK}',
    'gears_bed': f'生成一段90秒纯环境音，无音乐无人声：高挑钟楼工坊里巨型黄铜齿轮缓缓转动的低沉机械底床，缓慢金属摩擦与深远嗡鸣，无敲击、无节奏感，{BED_LOCK}',
    'wind_towertop': f'生成一段90秒纯环境音，无音乐无人声：高空钟楼顶端的稀薄寒风，比地面更细更冷，{BED_LOCK}',
    'palace_hush': f'生成一段90秒纯环境音，无音乐无人声：空旷月宫大殿里近乎无声的空寂空气，极稀疏的结晶般微细闪烁，安静到能听见呼吸，{BED_LOCK}',
    'wind_predawn': f'生成一段60秒纯环境音，无音乐无人声：深夜将尽的雪后小镇，极弱极静的空气声，几乎感觉不到风的起伏，{BED_LOCK}',
    'birds_sunrise': f'生成一段60秒纯环境音，无音乐无人声：清晨日出后远处稀疏的鸟鸣与温暖晨风，鸟鸣稀疏不密集，{BED_LOCK}',
}
EVENTS = {
    'footsteps_wood_r3': '生成一段10秒纯音效，无音乐无人声无混响：一个小孩穿软底短靴，在旧木地板上慢慢走六步。每一步声音短、轻、有身体重量，单步之间保持一秒左右安静。没有嘎吱尖叫，没有金属声，没有其他声音。用于近距离真实拟音。',
    'footsteps_stone_r3': '生成一段10秒纯音效，无音乐无人声：一个小孩穿软皮短靴，在光滑石材地板上轻轻走六步。柔软鞋底轻叩，接触清楚，单步间隔一秒以上，轻微宽敞房间余响。不拖鞋，不敲鼓，不高跟鞋，不含其他声音。',
    'footsteps_snow': '生成一段10秒纯音效，无音乐无人声：短靴踩进新雪的脚步声，一步一个脚印，轻微咯吱，安静冬夜里的独行',
    'wind_gust': '生成一段6秒纯音效，无音乐无人声：一阵突起的寒风掠过，四秒内起落，吹得火苗发颤',
    'lamp_out': '生成一段3秒纯音效，无音乐无人声：油灯灯火被风吹熄的极轻一噗',
    'fireflies_gold': '生成一段8秒纯音效，无音乐无人声：几颗金色萤火在脸旁盘旋的细碎晶莹微响，极轻极稀疏，梦幻',
    'door_creak': '生成一段5秒纯音效，无音乐无人声：老旧厚重的钟楼木门门轴缓慢开启的吱呀声，低沉木质摩擦',
    'metal_tap': '生成一段6秒纯音效，无音乐无人声：修表匠工作台上小锤轻敲黄铜件的细脆金属声，稀疏三两下',
    'star_pulse': '生成一段6秒纯音效，无音乐无人声：玻璃瓶中微弱星核缓慢脉动的低频柔光嗡鸣，起伏两下，神秘温暖',
    'star_wake': '生成一段5秒纯音效，无音乐无人声：沉睡星核苏醒的一声明亮晶莹迸发，金色粒子旋转的细碎光响，惊喜不刺耳',
    'glasses_drop': '生成一段3秒纯音效，无音乐无人声：圆框眼镜从鼻梁滑落到木工作台面的一记轻磕',
    'star_resonance': '生成一段8秒纯音效，无音乐无人声：数百玻璃瓶同时轻颤的共鸣低频涌动，水晶泛音渐次亮起，宏大而安静',
    'gears_stop': '生成一段6秒纯音效，无音乐无人声：巨型黄铜齿轮逐一减速直至停转，金属摩擦渐弱到静止',
    'skylight_open': '生成一段6秒纯音效，无音乐无人声：钟楼顶端石板天窗向两侧滑开的沉重石木摩擦声',
    'moon_shimmer_dim': '生成一段5秒纯音效，无音乐无人声：月光变暗的极轻银沙飘散，微细高频颗粒缓缓减弱',
    'star_rise': '生成一段5秒纯音效，无音乐无人声：一颗星星拖着金色长尾升空的上升光流，明亮渐远',
    'stars_swarm': '生成一段8秒纯音效，无音乐无人声：数百颗星星穿过天窗盘旋的环绕光流，密集细碎晶莹，壮阔不刺耳',
    'stair_form': '生成一段6秒纯音效，无音乐无人声：透明结晶台阶在云端凝结成形的水晶生长声，清脆冰凉',
    'step_ring': '生成一段4秒纯音效，无音乐无人声：短靴踏上透明结晶台阶的一声清响，环形波纹荡开的泛音',
    'one_spark': '生成一段4秒纯音效，无音乐无人声：一颗金色光点从灯芯缓缓浮起的微细铃光，极轻，带希望感',
    'tear_break': '生成一段6秒纯音效，无音乐无人声：一滴悬浮的泪碎成万千银粒——银铃般的一声清裂后，细密银光螺旋洒落，童话感',
    'star_fade': '生成一段5秒纯音效，无音乐无人声：星光台阶缓缓消散的远去光声，细碎晶粒渐弱',
    'petal_touch': '生成一段3秒纯音效，无音乐无人声：一片花瓣落在手背上极轻的一点柔软触碰，几乎无声',
    'snow_to_petal': '生成一段6秒纯音效，无音乐无人声：漫天雪花在空中化作花瓣的柔和空气闪光，细密轻柔',
    'bell_deep': '生成一段8秒纯音效，无音乐无人声：古老钟楼大铜钟一声深沉钟响，金色声波荡开，余韵悠长温暖不刺耳',
    'lamp_relight': '生成一段4秒纯音效，无音乐无人声：熄灭的铜灯重新点亮，一声轻噗转入温暖火苗',
    'star_chest': '生成一段5秒纯音效，无音乐无人声：心口一颗沉睡的星苏醒上升的暖流光声，温柔低频托底加细碎金光',
    'gold_text': '生成一段6秒纯音效，无音乐无人声：金色光粒聚成一行文字的细碎聚集声，密集晶莹，最后安静下来',
}


def main():
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    fails = []
    for group, table in (('bed', BEDS), ('event', EVENTS)):
        for name, prompt in table.items():
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
            meta.write_text(json.dumps({'name': name, 'group': group, 'provider': 'volcano/seed-audio-1.0',
                                        'prompt': prompt,
                                        'sha256': hashlib.sha256(out.read_bytes()).hexdigest()},
                                       ensure_ascii=False, indent=1), encoding='utf-8')
            print(f'gen  {name} ({group})', flush=True)
    print(f'done, fails={fails}')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
