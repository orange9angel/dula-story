"""T4 声画对位校验：mixed.wav 事件 onset 全过（点位=config/contact_events.json 绝对秒）。
纪律：断言"目标点 ±tol 内存在 onset"（不要求最强 onset=事件——对白/BGM onset 可能更强）；
impact 类 ±0.15s，window/slide/缓起类 ±0.30s。另记窗口内最强 onset 供人工复核。
"""
from pathlib import Path
import json
import librosa
import numpy as np

EP = Path(__file__).resolve().parents[1]

# (t, kind, 事件/contact id)；kind: impact=±0.15, soft=±0.30（缓起/滑动/柔声）
EVENTS = [
    (2.0, 'soft', 'v01 EVA 退役程序启动'),
    (18.5, 'soft', 'wheel_roll 车轮吱响起'),
    (30.0, 'impact', 'oil_spray 喷油'),
    (38.0, 'impact', 'leg_squeak 左腿吱响'),
    (51.0, 'impact', 'switch_1'), (54.5, 'impact', 'switch_2'),
    (58.0, 'impact', 'switch_3'), (61.5, 'impact', 'switch_4'),
    (66.0, 'impact', 'scan_drawing 扫描短音'),
    (81.0, 'impact', 'breaker 拉闸'),
    (84.0, 'soft', 'fan_stop 风扇缓停起'),
    (90.0, 'impact', 'screw_drop 螺丝落地'),
    (100.5, 'soft', 'door_creak 门轴起'),
    (130.0, 'soft', 'leaf_air_bend 轻气流'),
    (146.0, 'impact', 'scan_life 扫描滴声'),
    (163.0, 'soft', 'v02 EVA 请关闭温室照明'),
    (180.0, 'soft', 'PIANO_SINGLE 钢琴单音（音乐层）'),
    (181.5, 'impact', 'headlamp_place 头灯放落'),
    (193.5, 'soft', 'drawer_slide_1'), (209.5, 'soft', 'drawer_slide_2'),
    (211.0, 'impact', 'label_peel 揭标签'),
    (213.0, 'soft', 'XYLO_TWO 木琴两音（音乐层）'),
    (218.0, 'impact', 'battery_c_back 放回电池'),
    (225.5, 'soft', 'big_battery_drag 拖动起'),
    (233.0, 'impact', 'parts_scatter 零件散落'),
    (246.0, 'impact', 'screw_ping 清亮叮'),
    (250.0, 'soft', 'screw_pocket 入袋'),
    (256.0, 'soft', 'v03 EVA 档案播报'),
    (277.5, 'soft', 'g01 女孩录音'),
    (288.0, 'soft', 'musicbox_wind 发条'),
    (289.5, 'soft', 'MUSIC_BOX_FRAGMENT 音乐盒片段'),
    (334.5, 'impact', 'chest_open 拆胸板'),
    (335.0, 'impact', 'ALARM_SHORT 短报警'),
    (339.0, 'soft', 'chest_screw_back 装回螺丝'),
    (350.0, 'impact', 'meter_beep 1'), (352.5, 'impact', 'meter_beep 2'),
    (355.0, 'impact', 'meter_beep 3'),
    (367.0, 'impact', 'weld_contact 焊接火星'),
    (384.0, 'soft', 'light_online 灯亮'),
    (400.0, 'impact', 'cup_place_1'), (404.0, 'impact', 'cup_place_2'),
    (408.0, 'impact', 'cup_place_3'),
    (415.0, 'impact', 'habitat_connect 接管'),
    (428.0, 'soft', 'v04 EVA 请立即撤离'),
    (431.0, 'soft', 'GATE_FAR 远处闸门'),
    (434.5, 'soft', 'drawing_pocket 画入口袋'),
    (442.0, 'soft', 'MUSIC_BOX_FULL 完整主题入'),
    (450.0, 'soft', 'last_light_out 末灯熄灭'),
    (462.5, 'soft', 'sit_down 落座'),
]
TOL = {'impact': 0.15, 'soft': 0.30}


def main():
    y, sr = librosa.load(str(EP / 'assets3d/mixed.wav'), sr=48000, mono=True)
    onsets = librosa.onset.onset_detect(y=y, sr=sr, backtrack=True, units='time', delta=0.05)
    strength = librosa.onset.onset_strength(y=y, sr=sr)
    times = librosa.frames_to_time(np.arange(len(strength)), sr=sr)
    fails = []
    for t, kind, name in EVENTS:
        tol = TOL[kind]
        near = [o for o in onsets if abs(o - t) <= tol]
        w = (times >= t - tol) & (times <= t + tol)
        strongest = float(times[w][np.argmax(strength[w])]) if w.any() else None
        ok = bool(near)
        if not ok:
            fails.append((t, kind, name))
        print(f"{'✅' if ok else '❌'} {t:7.2f} {kind:6s} {name:28s} onsets={['%.2f' % o for o in near][:4]} 最强@%.2f" % (strongest or -1))
    print(f"\n汇总：{len(EVENTS) - len(fails)}/{len(EVENTS)} 过；失败 {len(fails)}")
    for t, kind, name in fails:
        print(f'  ❌ {t} {kind} {name}')
    (EP / 'assets3d/stems/sync_check.json').write_text(json.dumps(
        dict(total=len(EVENTS), failed=[dict(t=t, kind=k, name=n) for t, k, n in fails]),
        ensure_ascii=False, indent=1), encoding='utf-8')
    raise SystemExit(1 if fails else 0)


if __name__ == '__main__':
    main()
