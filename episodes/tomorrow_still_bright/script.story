1
00:00:00,000 --> 00:00:18,000
@SpaceStationExtScene{Event:Beat|id=s01|move=push_slow|shot=station_far|scene=exterior|action=空间站悬浮蓝色星球上方，外环灯逐段熄灭；低频嗡鸣}
{Event:Cue|name=OPEN|offset=0}
{Event:Cue|name=HUM_LOW|offset=0}
{Event:Act|id=v01|rate=0|context=温柔而程序化的空间站播报音，只报告程序。|emotion=neutral|gaze=none|camera=narration}
[Eva]退役程序启动。距离最终关闭，还有四十分钟。

2
00:00:18,000 --> 00:00:34,000
@CorridorScene{Event:Beat|id=s02|move=follow|shot=corridor_track|scene=corridor|action=M-07推工具车穿过空廊，车轮吱响，停下给轮子喷油}
{Event:Cue|name=WHEEL_SQUEAK|offset=1}
{Event:Cue|name=OIL_SPRAY|offset=12}

3
00:00:34,000 --> 00:00:48,000
{Event:Beat|id=s03|move=hold|shot=legs_mid|scene=corridor|action=车轮终于安静；机器人自己的左腿又吱响；低头停两秒（车轮静后留1秒静默再出腿响）}
{Event:Cue|name=LEG_SQUEAK|offset=4}

4
00:00:48,000 --> 00:01:04,000
{Event:Beat|id=s04|move=pan|shot=lights_off|scene=corridor|action=横移中景：机器人逐一关掉生活区灯光，空椅、杯子慢慢隐入黑暗}
{Event:Cue|name=SWITCH_CLICK|offset=3}

5
00:01:04,000 --> 00:01:20,000
{Event:Beat|id=s05|move=hold|shot=drawing_close|scene=corridor|action=画纸特写：儿童太阳画上写着 SEE YOU TOMORROW；扫描为非必要物品但未取下}
{Event:Cue|name=SCAN_BEEP|offset=2}
{Event:Cue|name=OSD_NONESSENTIAL|offset=3}

6
00:01:20,000 --> 00:01:36,000
{Event:Beat|id=s06|move=montage|shot=shutdown_cuts|scene=corridor|action=组接特写：拉闸、风扇停转、松动螺丝轻轻落地}
{Event:Cue|name=BREAKER|offset=1}
{Event:Cue|name=FAN_STOP|offset=4}
{Event:Cue|name=SCREW_DROP|offset=10}

7
00:01:36,000 --> 00:01:52,000
{Event:Beat|id=s07|move=push_slow|shot=greenhouse_door|scene=corridor|action=中远景缓推：机器人推开 BOTANICAL EXPERIMENT 温室门}
{Event:Cue|name=DOOR_CREAK|offset=6}

8
00:01:52,000 --> 00:02:08,000
@GreenhouseScene{Event:Beat|id=s08|move=pov|shot=finger_switch|scene=greenhouse|action=主观镜头：指尖接近总开关，窗边光斑里一片叶子晃动；手停住}
{Event:Cue|name=VENTILATION|offset=0}

9
00:02:08,000 --> 00:02:24,000
{Event:Beat|id=s09|move=macro|shot=sprout_macro|scene=greenhouse|action=微距：嫩叶水珠映出机械眼，散热风吹弯叶片；机器人立刻后退}
{Event:Cue|name=AIR_LIGHT|offset=2}

10
00:02:24,000 --> 00:02:40,000
{Event:Beat|id=s10|move=hold|shot=eye_close|scene=greenhouse|action=眼部特写：扫描发现生命，复查存活概率仍只有2.1%}
{Event:Cue|name=SCAN_LIFE|offset=2}
{Event:Cue|name=OSD_LIFE|offset=3}

11
00:02:40,000 --> 00:02:56,000
{Event:Beat|id=s11|move=hold|shot=hand_hesitate|scene=greenhouse|action=中景固定：手伸向开关又缩回，第一次不按任务执行}
{Event:Cue|name=MUSIC_HALT|offset=2}
{Event:Act|id=v02|rate=0|context=播报音，只报告程序，不解释情感。|emotion=neutral|gaze=none|camera=narration}
[Eva]请关闭温室照明。

12
00:02:56,000 --> 00:03:12,000
{Event:Beat|id=s12|move=hold|shot=lamp_side|scene=greenhouse|action=侧面近景：取下头灯放在杯旁，太亮便用手挡住半边光}
{Event:Cue|name=PIANO_SINGLE|offset=4}

13
00:03:12,000 --> 00:03:28,000
@WarehouseScene{Event:Beat|id=s13|move=follow|shot=drawers|scene=warehouse|action=仓库跟拍：打开抽屉，前两块电池均为0%}
{Event:Cue|name=DRAWER_SLIDE|offset=2}

14
00:03:28,000 --> 00:03:44,000
{Event:Beat|id=s14|move=hold|shot=battery_close|scene=warehouse|action=特写：第三块贴着100%标签，揭开才发现电量0%；眼光先亮再缩，静止三秒后才放回}
{Event:Cue|name=XYLO_TWO|offset=5}

15
00:03:44,000 --> 00:04:00,000
{Event:Beat|id=s15|move=hold|shot=big_battery|scene=warehouse|action=全景：奋力拖大电池上工具车，电池外壳散架}
{Event:Cue|name=PARTS_SCATTER|offset=9}

16
00:04:00,000 --> 00:04:14,000
{Event:Beat|id=s16|move=low|shot=screw_pickup|scene=warehouse|action=低机位近景：机器人认真捡起唯一滚远的螺丝放进口袋}
{Event:Cue|name=SCREW_PING|offset=6}

17
00:04:14,000 --> 00:04:30,000
@LoungeScene{Event:Beat|id=s17|move=push_slow|shot=holo_photo|scene=lounge|action=休息室慢推：发现全息旧照片：女孩在窗边照顾植物}
{Event:Cue|name=TAPE_NOISE|offset=1}
{Event:Act|id=v03|rate=0|context=档案播报，平静。|emotion=neutral|gaze=none|camera=narration}
[Eva]档案：植物观察日志，第一百八十七天。

18
00:04:30,000 --> 00:04:46,000
{Event:Beat|id=s18|move=hold|shot=photo_close|scene=lounge|action=照片特写：女孩笑着把杯子放在窗边，机器人静止观看；录音戛然而止}
{Event:Cue|name=TAPE_CUT|offset=13}
{Event:Act|id=g01|rate=0|context=旧录音里的女孩，明亮、带笑、有憧憬。|emotion=happy|gaze=none|camera=narration}
[Girl]如果它能长大……我就带它去看真正的太阳。

19
00:04:46,000 --> 00:05:00,000
{Event:Beat|id=s19|move=hold|shot=music_box|scene=lounge|action=音乐盒近景：机器人转动发条，四五个钢琴音响起又停止}
{Event:Cue|name=MUSIC_BOX_FRAGMENT|offset=3}

20
00:05:00,000 --> 00:05:16,000
@PowerRoomScene{Event:Beat|id=s20|move=hold|shot=aux_battery|scene=powerroom|action=能源室中景：逃生舱辅助电池38%，机器人伸手欲拆}
{Event:Cue|name=HUM_POWER|offset=0}
{Event:Cue|name=OSD_SHUTTLE|offset=2}

21
00:05:16,000 --> 00:05:32,000
{Event:Beat|id=s21|move=hold|shot=hand_retract|scene=powerroom|action=手部特写：发现拆电池会使飞船无法起飞，手指缓慢收回}
{Event:Cue|name=OSD_DISABLES|offset=2}
{Event:Cue|name=SILENCE_BEAT|offset=4}

22
00:05:32,000 --> 00:05:48,000
{Event:Beat|id=s22|move=hold|shot=chest_panel|scene=powerroom|action=胸部特写：尝试拆自身电池，眼灯闪烁报警；慌忙装回螺丝}
{Event:Cue|name=OSD_CRITICAL|offset=2}
{Event:Cue|name=ALARM_SHORT|offset=3}

23
00:05:48,000 --> 00:06:04,000
@WarehouseScene{Event:Beat|id=s23|move=hold|shot=workbench|scene=warehouse|action=工作台中景：从旧设备筛出可用电芯，逐一测压}
{Event:Cue|name=METER_BEEP|offset=2}

24
00:06:04,000 --> 00:06:20,000
{Event:Beat|id=s24|move=hold|shot=welding|scene=warehouse|action=焊台特写：制作缓冲储能包；焊接火星飞出瞬间下意识伸手保护不在场的小苗，意识到后缓慢收回}
{Event:Cue|name=WELD_SPARKS|offset=3}

25
00:06:20,000 --> 00:06:36,000
@CockpitScene{Event:Beat|id=s25|move=hold|shot=reading_light|scene=cockpit|action=驾驶舱中景：修好阅读灯，接入低功耗供电母线，暖光稳定亮起}
{Event:Cue|name=LIGHT_ONLINE|offset=4}
{Event:Cue|name=OSD_LOWPOWER|offset=5}

26
00:06:36,000 --> 00:06:52,000
{Event:Beat|id=s26|move=hold|shot=cup_foam|scene=cockpit|action=杯子近景：给陶瓷杯垫减震泡棉，试放两次倾斜，第三次固定稳固}
{Event:Cue|name=CUP_CLINK|offset=4}

27
00:06:52,000 --> 00:07:06,000
{Event:Beat|id=s27|move=hold|shot=habitat|scene=cockpit|action=培养罩近景：接好通气温控，调低灯光，确认小苗安全}
{Event:Cue|name=STRINGS_IN|offset=3}
{Event:Cue|name=OSD_HABITAT|offset=5}

28
00:07:06,000 --> 00:07:20,000
{Event:Beat|id=s28|move=hold|shot=look_back|scene=cockpit|action=中远景：最后回望温室方向，折回取下儿童太阳画，放进胸前口袋}
{Event:Cue|name=GATE_FAR|offset=5}
{Event:Act|id=v04|rate=0|context=播报音，催促但不严厉。|emotion=neutral|gaze=none|camera=narration}
[Eva]请立即撤离。

29
00:07:20,000 --> 00:07:34,000
@SpaceStationExtScene{Event:Beat|id=s29|move=hold|shot=departure|scene=exterior|action=空间外景：飞船缓缓离开，空间站最后一盏灯熄灭}
{Event:Cue|name=MUSIC_BOX_FULL|offset=2}

30
00:07:34,000 --> 00:07:46,000
@CockpitScene{Event:Beat|id=s30|move=hold|shot=sit_beside|scene=cockpit|action=驾驶舱中景：机器人望向旧站，再望向小苗，轻轻靠近坐下（先窗外再植物，身体微转，肩部放松）}
{Event:Cue|name=PIANO_SOFT|offset=2}

31
00:07:46,000 --> 00:07:55,000
{Event:Beat|id=s31|move=hold|shot=hand_leaf|scene=cockpit|action=手叶特写：三指手伸到距叶一厘米处停住（伸1.2秒停0.8秒收1.8秒），没有碰，轻放杯旁}
{Event:Cue|name=OSD_SUNRISE|offset=6}

32
00:07:55,000 --> 00:08:00,000
@SpaceStationExtScene{Event:Beat|id=s32|move=pull_far|shot=dawn_final|scene=exterior|action=极远景拉远：蓝色星球边缘泛金，飞船驶向晨光，舱内小灯仍亮；片名出现}
{Event:Cue|name=PIANO_OUTRO|offset=0}
{Event:Cue|name=TITLE_CARD|offset=2}
{Event:Cue|name=FADE|offset=4.5}
