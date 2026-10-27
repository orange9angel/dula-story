"""P6 音频导演 pass：draft audio_direction.json + timeline.json 的 {Event:Act} → reviewed 计划。

- dialogue：37 句逐句 intent/subtext（导演判断）+ delivery（pace 由 act.rate 映射，
  tone 由 act.emotion 映射；演绎指令 context 在 gen_dialogue 阶段进 seed-tts additions.context_texts）。
- ambience/sfx：按 timeline cues 摆点（事件音登记画面事件秒点，混音后 onset 对位验证）。
- music：钢琴独奏→弦乐+无词童声合唱→静默区(m47-m49/348-400)→回暖→日出→渐暗。
- exclusions：TEAR_FALL 静止三秒、FADE、运镜 whoosh、m50-53 配乐——负空间是刻意的。
"""
from pathlib import Path
import json

EP = Path(__file__).resolve().parents[1]

# act id → (intent, subtext, energy, emphasis, distance)
DIRECTION = {
    'n01': ('开卷定调，炉火边缓缓开口', '讲故事的人珍爱这个故事，想讲给愿意听的人', .42, 'normal', 'medium'),
    'n02': ('接着铺民间说法', '惋惜里带一点神秘，为真相留台阶', .42, 'normal', 'medium'),
    'n03': ('揭开真正原因', '遗忘才是全片的题眼，声音放低是把分量放重', .38, 'soft', 'medium'),
    'e01': ('天真地关切月亮', '她把自己的孤独投射到月亮身上', .5, 'normal', 'intimate'),
    'e02': ('压低声音共情', '说的是月亮，也是她自己', .4, 'soft', 'intimate'),
    'e03': ('安慰灯', '也在安慰自己——她熟悉害怕的滋味', .38, 'soft', 'intimate'),
    'e04': ('坦白自己的小秘密', '信任月亮才说得出口', .4, 'soft', 'intimate'),
    'e05': ('天真的质问', '孩子的世界里没有"关起来"的正当理由，不带指责', .55, 'normal', 'medium'),
    'a01': ('平静里有旧伤', '他把自己也算进"忘记怎么发光"的人里', .4, 'normal', 'medium'),
    'e06': ('继续追问', '她不接受大人们的"没办法"', .55, 'normal', 'medium'),
    'a02': ('回避，声音更低', '说的是镇上人，也是他自己和女儿', .36, 'soft', 'medium'),
    'e07': ('压低声音的欢呼', '她当场证明了自己是对的，但不想吓着星星', .7, 'normal', 'near'),
    'a03': ('难以置信，声音发颤', '三十年的死寂被一个女孩打破', .6, 'normal', 'medium'),
    'e08': ('温柔而笃定地解释', '她懂"太久没人说话"是什么滋味', .45, 'normal', 'medium'),
    'a04': ('沉重的宣判，一字一顿', '他心里其实还想被反驳', .42, 'strong', 'medium'),
    'e09': ('脱口而出，毫不迟疑', '孩子的行动力不经过犹豫', .68, 'strong', 'medium'),
    'a05': ('疲惫的现实主义者', '他试过，且失败过太多年', .36, 'soft', 'medium'),
    'e10': ('带着答案的反问', '她其实已经在召集星星了', .58, 'normal', 'medium'),
    'a06': ('一生的信念在眼前复活', '气声——他怕声音大一点梦就碎了', .55, 'soft', 'near'),
    'e11': ('笑着纠正，前半句', '温柔地否定"魔法"这个框架', .55, 'normal', 'medium'),
    'e12': ('后半句，轻而确定', '把功劳还给星星们', .45, 'normal', 'medium'),
    'm01': ('超然、疲惫地开口', '等了太久，近乎麻木，像从很远的地方传来', .35, 'soft', 'far'),
    'e13': ('小心的关切', '她的第一反应是照顾对方', .45, 'soft', 'near'),
    'm02': ('平静的告别预告', '她已经接受消失，慈爱里带着放下', .35, 'soft', 'far'),
    'e14': ('认真地困惑', '孩子在学习"遗忘"这个词的重量', .5, 'normal', 'medium'),
    'm03': ('数自己的伤口', '平静得让人心疼——每一缕光都是一个人', .35, 'normal', 'far'),
    'e15': ('献出自己最宝贵的东西', '干脆利落，没有不舍的表演', .58, 'normal', 'medium'),
    'm04': ('慈爱地拒绝', '她不忍收下孩子最后的火', .35, 'soft', 'far'),
    'e16': ('最轻的一句，全片最重的一句', '她自己就是那颗还没熄的火种', .45, 'soft', 'intimate'),
    'e17': ('一口气说完的心里话', '带哭腔但不哭出声——为所有偷偷哭泣的人请愿', .6, 'normal', 'intimate'),
    'm05': ('被等了一千年的声音', '叹息般的释然：她可以重新爱人了', .35, 'soft', 'far'),
    'a07': ('对空无一人的街道问', '不敢抱希望——怕听见没有回答', .35, 'soft', 'medium'),
    'a08': ('又惊又喜，哑着嗓子喊', '压抑一晚的释放', .7, 'strong', 'medium'),
    'e18': ('平静地纠正，不居功', '爱不是功绩，她只是做了该做的', .45, 'normal', 'medium'),
    'a09': ('哽咽着说完', '三十年后重新承认自己：像重新活过来', .5, 'soft', 'near'),
    'n04': ('收书的声音', '把故事的解释权温柔地交给听者', .42, 'normal', 'medium'),
    'e19': ('对老朋友的晚安，带笑', '一个约定：明天见，春天会再来', .5, 'normal', 'intimate'),
}

SPACE = {'snowtown': 'outdoor', 'clocktower': 'room', 'towertop': 'outdoor', 'moonpalace': 'hall'}


def pace_of(rate):
    return round(1 + rate / 100, 2)


def main():
    plan = json.loads((EP / 'config/audio_direction.json').read_text(encoding='utf-8'))
    tl = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
    acts = {s['act']['id']: (s['act'], s) for s in tl['segments'] if s.get('act')}
    for item in plan['dialogue']:
        # 找回该 entry 的 act（按时间窗匹配）
        seg = next(s for s in tl['segments'] if s.get('act')
                   and abs(s['start'] - item['startTime']) < .01 and s['act']['id'] in DIRECTION)
        aid = seg['act']['id']
        act = seg['act']
        intent, subtext, energy, emphasis, distance = DIRECTION[aid]
        item['intent'] = f"{act['context'] or ''}（{intent}）".strip('（）')
        item['subtext'] = subtext
        item['shotIds'] = [seg['id']]
        item['delivery'] = {
            'tone': act['emotion'], 'energy': energy,
            'pace': pace_of(rate_of(seg)),
            'volume': 1.0, 'pitchSemitones': 0.0, 'emphasis': emphasis,
            'distance': distance, 'space': SPACE[seg['scene']],
            'pauseBeforeMs': 0, 'pauseAfterMs': 0, 'breath': 'natural',
        }
    plan['policies']['musicMode'] = 'directed'
    plan['policies']['ambienceMode'] = 'directed'
    plan['mix'] = {'dialogueVolume': 1.0, 'bgmVolume': 0.3, 'sfxVolume': 0.8,
                   'useDucking': True, 'duckDepth': 0.3,
                   'note': '对白峰一化.5；音乐 RMS=人声-12dB、对白 duck 再-7dB；成片峰值≤-2dBFS'}
    plan['ambience'] = [
        {'id': 'wind-snowtown', 'name': 'wind_snowtown', 'entry': 1, 'startTime': 0, 'endTime': 91,
         'volume': .14, 'role': 'bed', 'priority': 'ambience', 'prompt': '雪夜小镇的静风底'},
        {'id': 'gears-bed', 'name': 'gears_bed', 'entry': 13, 'startTime': 91, 'endTime': 184,
         'volume': .12, 'role': 'bed', 'priority': 'ambience', 'prompt': '巨型黄铜齿轮缓缓运转'},
        {'id': 'wind-towertop', 'name': 'wind_towertop', 'entry': 25, 'startTime': 184, 'endTime': 276,
         'volume': .16, 'role': 'bed', 'priority': 'ambience', 'prompt': '高处稀薄寒风'},
        {'id': 'palace-hush', 'name': 'palace_hush', 'entry': 38, 'startTime': 276, 'endTime': 374,
         'volume': .10, 'role': 'bed', 'priority': 'ambience', 'prompt': '月宫空寂，极稀疏结晶感'},
        {'id': 'wind-predawn', 'name': 'wind_predawn', 'entry': 50, 'startTime': 374, 'endTime': 407,
         'volume': .10, 'role': 'bed', 'priority': 'ambience', 'prompt': '深夜将尽的静风'},
        {'id': 'birds-sunrise', 'name': 'birds_sunrise', 'entry': 58, 'startTime': 422, 'endTime': 478,
         'volume': .18, 'role': 'bed', 'priority': 'ambience', 'prompt': '日出后的清晨鸟鸣'},
    ]
    plan['sfx'] = [dict(id=k[0], entry=k[1], name=k[2], startTime=k[3], volume=k[4],
                        role='event', priority='storySfx', shotIds=[k[5]], note=k[6])
                   for k in SFX]
    plan['music'] = MUSIC
    plan['exclusions'] = [
        {'id': 'silence-tear-fall', 'scope': 'm49/TEAR_FALL@366-369', 'sound': 'any',
         'reason': '泪落静止三秒是全片静默设计的核心，只有呼吸级空气声（palace_hush 床）'},
        {'id': 'silence-fade', 'scope': 'm64/FADE@473', 'sound': 'any',
         'reason': '黑场收束，声音先于画面退净'},
        {'id': 'no-camera-whoosh', 'scope': 'all', 'sound': 'camera_whoosh',
         'reason': '运镜不配风声——童话片非抖音风格'},
        {'id': 'no-music-m50-53', 'scope': '374-400', 'sound': 'music',
         'reason': '高潮后收回安静：老人独等段只有风声，MUSIC_RETURN@400 才准回归'},
    ]
    plan['status'] = 'reviewed'
    (EP / 'config/audio_direction.json').write_text(
        json.dumps(plan, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"reviewed plan: {len(plan['dialogue'])} dialogue, {len(plan['ambience'])} ambience, "
          f"{len(plan['sfx'])} sfx, {len(plan['music'])} music, {len(plan['exclusions'])} exclusions")


def rate_of(seg):
    import re
    # act.rate 在 timeline.json 里没展开，从 script.story 对应拍拿——已在 compile 时丢字段，
    # 这里直接查 script.story 的 Event:Act rate
    return RATES.get(seg['act']['id'], 0)


# 从 script.story 摘的 act.rate 表（timeline.json 未保留 rate 字段）
RATES = {'n01': -8, 'n02': -8, 'n03': -8, 'n04': -8,
         'e01': 0, 'e02': 0, 'e03': 0, 'e04': -3, 'e05': 0, 'e06': 0, 'e07': 8, 'e08': 0,
         'e09': 5, 'e10': 0, 'e11': 0, 'e12': 0, 'e13': 0, 'e14': 0, 'e15': 0, 'e16': -3,
         'e17': -3, 'e18': 0, 'e19': -3,
         'a01': -8, 'a02': -8, 'a03': -5, 'a04': -5, 'a05': -5, 'a06': -8, 'a07': -5, 'a08': 0, 'a09': -8,
         'm01': -8, 'm02': -8, 'm03': -8, 'm04': -8, 'm05': -8}

# (id, entry, 素材名, 秒点, 音量, 拍号, 备注)
SFX = [
    ('footsteps-snow-1', 4, 'footsteps_snow', 27.0, .5, 'm04', '艾琳踩雪脚步（走拍 27-34.3，步频实测 2-3.6/s）'),
    ('moon-dim', 6, 'moon_shimmer_dim', 44.0, .2, 'm06', '月光收缩的极轻银沙'),
    ('wind-gust', 7, 'wind_gust', 51.0, .5, 'm07', '一阵风，火苗颤动'),
    ('lamp-out', 8, 'lamp_out', 58.0, .3, 'm08', '灯火熄灭的轻噗'),
    ('fireflies', 8, 'fireflies_gold', 58.5, .25, 'm08', '金色萤火盘旋的细碎铃光'),
    ('footsteps-snow-2', 11, 'footsteps_snow', 78.0, .45, 'm11', '走向钟楼木门'),
    ('door-creak', 12, 'door_creak', 85.0, .6, 'm12', '老木门轴开启'),
    ('metal-tap', 14, 'metal_tap', 102.0, .35, 'm14', '修星星的小铜敲'),
    ('star-pulse', 20, 'star_pulse', 150.0, .3, 'm20', '星核微弱脉冲'),
    ('star-wake', 21, 'star_wake', 156.0, .5, 'm21', '星核苏醒的亮闪涌'),
    ('glasses-drop', 22, 'glasses_drop', 163.0, .3, 'm22', '眼镜滑落的轻磕'),
    ('resonance', 24, 'star_resonance', 178.0, .4, 'm24', '星瓶共鸣低频涌'),
    ('gears-stop', 24, 'gears_stop', 179.0, .5, 'm24', '齿轮逐一停转'),
    ('skylight-open', 25, 'skylight_open', 184.0, .5, 'm25', '天窗石板向两侧滑开'),
    ('moon-fade', 26, 'moon_shimmer_dim', 193.0, .2, 'm26', '月亮边缘银粉飘散'),
    ('wind-high-gust', 28, 'wind_gust', 206.0, .5, 'm28', '高处寒风掠过'),
    ('star-rise', 30, 'star_rise', 220.0, .45, 'm30', '第一颗星离瓶上升'),
    ('stars-swarm', 31, 'stars_swarm', 227.0, .4, 'm31', '群星穿天窗的涡流光声'),
    ('stair-form', 32, 'stair_form', 235.0, .5, 'm32', '星阶结晶成形'),
    ('step-ring', 36, 'step_ring', 263.0, .4, 'm36', '靴落星阶的环形波纹'),
    ('moonlight-dim', 43, 'moon_shimmer_dim', 317.0, .2, 'm43', '殿内月光逐缕熄灭'),
    ('one-spark', 47, 'one_spark', 348.0, .25, 'm47', '灯芯浮起一颗金点'),
    ('tear-break', 49, 'tear_break', 369.0, .6, 'm49', '泪碎银铃质感，螺旋扩散'),
    ('stair-fade', 51, 'star_fade', 382.0, .3, 'm51', '星阶消散的远光'),
    ('first-petal', 53, 'petal_touch', 396.0, .2, 'm53', '花瓣落手背，极轻'),
    ('snow-to-petal', 54, 'snow_to_petal', 400.0, .4, 'm54', '漫天雪化花的空气闪光'),
    ('bell-1', 55, 'bell_deep', 408.0, .8, 'm55', '钟第一响：指针启动，金色声波'),
    ('bell-2', 56, 'bell_deep', 413.0, .8, 'm56', '钟第二响：枯树抽芽'),
    ('bell-3', 57, 'bell_deep', 418.0, .85, 'm57', '钟第三响：窗灯依次亮起'),
    ('lamp-relight', 59, 'lamp_relight', 430.0, .4, 'm59', '铜灯重燃'),
    ('star-chest', 61, 'star_chest', 446.0, .35, 'm61', '胸口升星的暖流'),
    ('gold-text', 63, 'gold_text', 466.0, .3, 'm63', '金粒聚成文字的细碎光'),
]

MUSIC = [
    {'id': 'piano-open', 'mood': '雪夜童话钢琴独奏：慢、温、孤而不冷', 'startTime': 0, 'endTime': 229,
     'fadeIn': 2.0, 'fadeOut': 2.0, 'baseVolume': .30,
     'purpose': '开场到 m30 的叙事底；钢琴独奏单线条，给旁白留足空间'},
    {'id': 'strings-choir-rise', 'mood': '弦乐渐入+无词童声合唱托举，温暖上升', 'startTime': 227, 'endTime': 348,
     'fadeIn': 3.0, 'fadeOut': 6.0, 'baseVolume': .34,
     'purpose': 'm31 MUSIC_RISE 起渐入，m37 合唱进入托住登阶；276 进宫后减弱变薄，345 前收尽——m47-m49 静默让位'},
    {'id': 'spring-return', 'mood': '暖金弦乐+钢琴回归，422 日出推到全片最高潮后渐暗', 'startTime': 400, 'endTime': 478,
     'fadeIn': 2.5, 'fadeOut': 6.0, 'baseVolume': .36,
     'purpose': 'MUSIC_RETURN 回归→日出高潮→FINALE_DIM 起渐暗收束，尾声退到近乎静默'},
]


if __name__ == '__main__':
    main()
