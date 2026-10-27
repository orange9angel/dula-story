#!/usr/bin/env python3
"""《明天还会亮》T4：环境底床 + Foley/事件音效 全走火山 Seed-Audio 1.0。
产出 assets3d/sfx/<name>.wav + 逐支 .source.json 溯源（prompt tag skip-if-exists 缓存）。
用法（dula-story 根目录）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/tomorrow_still_bright/tools/gen_sfx.py
质感基调：克制、安静、旧工业空间站；不要动画片夸张、不要宏大科幻轰鸣。
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
OUT = EP / 'assets3d/sfx'

JOBS = {
    # ── 环境底床（prompt 锁平稳无节律，过三道验收）──
    'bed_station_hum': '生成一段20秒纯环境音，无音乐无人声：退役空间站内舱体低频嗡鸣底床，'
        '持续平稳的低频机械嗡鸣加极轻微空气循环声，老旧安静，'
        '音量恒定、无阵风、无节律性涌动、无静默间隙',
    'bed_ventilation': '生成一段20秒纯环境音，无音乐无人声：空间站温室通风系统底床，'
        '平稳柔和的通风气流声加轻微管道共鸣，'
        '音量恒定、无阵风、无节律性涌动、无静默间隙',
    'bed_powerroom': '生成一段20秒纯环境音，无音乐无人声：空间站能源室低频持续底床，'
        '比机舱更沉的电力设备低频嗡鸣，带极轻微电流颤动，'
        '音量恒定、无节律性涌动、无静默间隙',
    'bed_tape': '生成一段10秒纯环境音，无音乐无人声：旧录音磁带底噪，'
        '均匀的磁带嘶声，无走带咔哒、无节律性机械声、无周期起伏，'
        '平稳怀旧，音量恒定、无静默间隙',
    'bed_cockpit': '生成一段20秒纯环境音，无音乐无人声：小型飞船驾驶舱内底噪，'
        '极轻的生命维持系统气流加远处低沉引擎余振，柔和贴近，'
        '音量恒定、无阵风、无节律性涌动、无周期起伏、无静默间隙',
    # ── Foley / 事件（瞬态与持续；摆点见 config/contact_events.json）──
    'wheel_squeak': '生成一段12秒纯音效，无音乐无人声：旧工具车坏轮子在金属走廊缓慢滚动的吱呀声，'
        '金属轮轴干涩摩擦的节律性吱响，推车速度缓慢，空旷走廊轻混响，旧工业质感',
    'oil_spray': '生成一段1.2秒纯音效，无音乐无人声：小喷雾罐对金属轮轴喷油，'
        '短促气雾嘶声加极轻液体附着声，近景克制',
    'leg_squeak': '生成一段1.5秒纯音效，无音乐无人声：机器人腿部关节干涩金属摩擦吱响，'
        '两声短促机械吱呀，旧工业质感，安静环境里清晰可闻',
    'switch_click': '生成一段0.6秒纯音效，无音乐无人声：老旧墙壁电灯开关拨动的咔哒一声，'
        '干脆短促，空旷走廊轻混响',
    'scan_beep': '生成一段1.2秒纯音效，无音乐无人声：便携扫描仪的短促电子扫描音，'
        '两声温和的嘀嘀，科幻但克制，不刺耳',
    'breaker': '生成一段1.0秒纯音效，无音乐无人声：老式配电箱大闸刀拉下，'
        '沉重金属机械咔锵声加轻微电流断开余响',
    'fan_stop': '生成一段6秒纯音效，无音乐无人声：吊扇断电后逐渐减速停转，'
        '扇叶搅动空气声由快到慢自然衰减至完全静止',
    'screw_drop': '生成一段1.0秒纯音效，无音乐无人声：一颗小螺丝掉在金属地板上的轻响，'
        '叮零两声轻跳，清脆但音量小',
    'door_creak': '生成一段4秒纯音效，无音乐无人声：老旧滑动金属门被缓缓推开，'
        '门轴与滑轨的悠长吱呀声，生锈金属，缓慢克制',
    'air_light': '生成一段3秒纯音效，无音乐无人声：一阵轻柔散热气流拂过，'
        '温和均匀风声渐起渐落，带极轻叶片沙沙',
    'drawer_slide': '生成一段1.5秒纯音效，无音乐无人声：金属抽屉沿滑轨被拉开，'
        '干涩滑轨摩擦声加末端轻磕，旧仓库质感',
    'battery_place': '生成一段0.8秒纯音效，无音乐无人声：小电池被拿起又轻放在金属托盘上，'
        '沉闷轻磕，短促克制',
    'label_peel': '生成一段1.0秒纯音效，无音乐无人声：从电池外壳上慢慢揭开一张贴纸，'
        '粘性纸剥离的细碎声响，轻微',
    'battery_drag': '生成一段7秒纯音效，无音乐无人声：沉重的大电池在金属地板上被奋力拖动，'
        '断续的沉重摩擦声加金属刮擦，吃力缓慢',
    'parts_scatter': '生成一段2秒纯音效，无音乐无人声：金属外壳散架，小零件哗啦啦散落一地，'
        '金属碎片弹跳滚动，凌乱但不大声',
    'screw_roll': '生成一段1.5秒纯音效，无音乐无人声：一颗小螺丝在金属地面滚远，'
        '清脆滚动声渐远渐弱',
    'screw_ping': '生成一段0.8秒纯音效，无音乐无人声：夹起小螺丝时一声清亮的叮，'
        '明亮清脆，短促干净',
    'cloth_rustle': '生成一段0.8秒纯音效，无音乐无人声：布料口袋轻响，'
        '柔软织物摩擦声，短促轻微',
    'paper_rustle': '生成一段1.0秒纯音效，无音乐无人声：一张画纸被折起塞进口袋，'
        '轻微纸张摩擦声，短促',
    'musicbox_wind': '生成一段4秒纯音效，无音乐无人声：老式音乐盒发条被缓慢拧动，'
        '棘轮咔啦咔啦的机械上弦声，均匀缓慢',
    'alarm_short': '生成一段1.5秒纯音效，无音乐无人声：设备短促报警音，'
        '两声温和电子嘀嘀，急促但不刺耳，克制科幻',
    'meter_beep': '生成一段0.7秒纯音效，无音乐无人声：电压表测量通过的单声短滴，'
        '干净温和的电子音',
    'weld_sparks': '生成一段2.5秒纯音效，无音乐无人声：电焊瞬间的细碎火花声，'
        '噼啪电弧加细小金属火星飞溅，短而稀疏',
    'light_online': '生成一段1.5秒纯音效，无音乐无人声：老旧阅读灯接通电源亮起，'
        '轻微电流嗡起加灯丝稳定下来的柔和声，温暖',
    'cup_clink': '生成一段0.6秒纯音效，无音乐无人声：陶瓷杯沿极轻地碰到软垫，'
        '极轻的一声叮，克制、几乎听不见',
    'habitat_connect': '生成一段1.5秒纯音效，无音乐无人声：透明培养罩接上通气管道，'
        '轻咔锁定加短暂气流嘶声，轻柔',
    'gate_far': '生成一段2.5秒纯音效，无音乐无人声：远处舱段闸门关闭的沉重闷响，'
        '低频轰鸣从远处传来，带大空间混响',
    'sit_down': '生成一段1.0秒纯音效，无音乐无人声：小机器人轻轻坐上旧凳子，'
        '轻微金属身体与坐垫接触声，极轻安静',
    'chest_open': '生成一段1.0秒纯音效，无音乐无人声：机器人胸前金属面板被打开，'
        '小铰链轻响加面板松开的轻咔，轻微',
    'screw_back': '生成一段3秒纯音效，无音乐无人声：慌忙把小螺丝拧回金属面板，'
        '快速细碎的小型棘轮拧动声，略急促',
    'power_down_far': '生成一段2秒纯音效，无音乐无人声：远处一区灯光断电，'
        '很轻的继电器咔声加低频轻微下潜，很远很轻',
    'headlamp_place': '生成一段0.8秒纯音效，无音乐无人声：小型金属头灯被轻放在窗台上，'
        '极轻的金属磕碰，克制安静',
    # ── 音乐层单音兜底（首选从 Suno 稀疏段提取；此两支为失败兜底）──
    'piano_single': '生成一段2.5秒纯音乐，无台词无音效：单个柔和钢琴音，'
        '中音区，温暖带自然余韵，安静孤独氛围',
    'xylo_two': '生成一段2.5秒纯音乐，无台词无音效：两声柔和木琴音，'
        '一高一低，温和余韵，带一点点笨拙幽默感',
}


def gen_one(item):
    name, prompt = item
    wav = OUT / f'{name}.wav'
    meta = OUT / f'{name}.source.json'
    tag = hashlib.sha256(prompt.encode()).hexdigest()[:12]
    if wav.exists() and meta.exists() and json.loads(meta.read_text(encoding='utf-8')).get('tag') == tag:
        return name, 'skip'
    spec = importlib.util.spec_from_file_location(
        'seedaudio', WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.generate(prompt, wav)
    meta.write_text(json.dumps({'name': name, 'prompt': prompt, 'tag': tag,
                                'provider': 'volcano-seedaudio',
                                'sha256': hashlib.sha256(wav.read_bytes()).hexdigest()},
                               ensure_ascii=False, indent=1), encoding='utf-8')
    return name, 'gen'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        for name, st in pool.map(gen_one, JOBS.items()):
            print(f'{st} {name}', flush=True)


if __name__ == '__main__':
    main()
