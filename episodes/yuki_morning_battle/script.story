1
00:00:00,000 --> 00:00:00,100
@YukiRoomScene
{Position:Yuki|x=-6.8|y=0.5|z=-0.5|face=forward}{Position:Mochi|x=-7.2|y=0.5|z=0.0|face=forward}{Position:Gulu|x=2.5|y=0.01|z=0.2|face=left}
{SceneDirector:Gaze|mode=auto}
{Music:Play|name=morning_battle_theme|fadeIn=1.0|baseVolume=0.5|endTime=62}
{SFX:Play|name=morning_birds|endTime=62|baseVolume=0.35}

2
00:00:00,400 --> 00:00:03,600
[Narrator]{Camera:Static|position=-3.4,1.6,1.6|lookAt=-6.9,0.8,-1.6} 清晨七点，闹钟第三次响起。
{SFX:Play|name=alarm_clock|offset=0.3|baseVolume=0.9}{Animation:LieSleep|character=Yuki|duration=14.5}

3
00:00:03,900 --> 00:00:06,900
[Yuki]{FaceHappy}{Camera:Static|position=-5.2,1.5,-0.1|lookAt=-6.8,0.75,-2.0} 嘿嘿……别抢我的鸡腿……
{SceneDirector:Gaze|mode=free}

4
00:00:07,200 --> 00:00:11,000
[Gulu]{Camera:Static|position=-0.6,1.1,3.0|lookAt=-1.6,0.8,0.3} 检测到主人赖床超标，咕噜号出动！
{Event:Move|character=Gulu|x=-1.3|z=0.4|duration=2.2}{Animation:Walk|character=Gulu}{SFX:Play|name=takecopter_spin|offset=0.2|baseVolume=0.5}{Position:Mochi|x=-5.2|y=0.01|z=0.9|face=forward}{SceneDirector:Gaze|mode=auto}

5
00:00:11,300 --> 00:00:14,600
[Gulu]{Camera:Static|position=-0.5,1.1,2.6|lookAt=-1.3,0.8,0.4} 唤醒程序第一阶段：音量攻击！
{SFX:Play|name=alarm_clock|offset=1.4|baseVolume=1.0}{Event:Move|character=Mochi|x=0.1|z=0.6|duration=3.0}{Animation:Walk|character=Mochi}

6
00:00:14,900 --> 00:00:17,400
[Yuki]{SurprisedJump}{Exaggeration:comedy_shock|intensity=0.8}{Camera:Static|position=0,1.1,2.2|lookAt=0,1.0,0.5} 哇啊！地震了吗？！
{Position:Yuki|x=0|y=0.01|z=0.5|face=forward}{SceneDirector:Gaze|mode=free}

7
00:00:17,700 --> 00:00:21,300
[Yuki]{FaceSurprised}{Camera:Static|position=0,1.1,2.2|lookAt=0,1.0,0.5} 几点了几点了？完了，要迟到了！

8
00:00:21,600 --> 00:00:25,000
[Narrator]{Camera:Static|position=0.2,1.3,3.6|lookAt=0.1,0.8,0.5} 小雪以每秒五个动作的速度开始收拾书包。
{Event:Move|character=Yuki|x=-0.8|z=0.7|duration=1.0}{Animation:Run|character=Yuki|legLift=low|stride=0.42|armSwing=0.6|frequency=4.6|lean=0.10}{SFX:Play|name=dash_whoosh|offset=0.3|baseVolume=0.7}{SceneDirector:Gaze|mode=auto}

9
00:00:25,300 --> 00:00:29,300
[Yuki]{FaceAngry}{Camera:Static|position=0.2,1.2,3.0|lookAt=0.2,0.9,0.5} 袜子！书包！年糕你别挡路！
{Event:Move|character=Yuki|x=0.4|z=0.6|duration=1.2}{Animation:Run|character=Yuki|legLift=low|stride=0.42|armSwing=0.6|frequency=4.6|lean=0.10}{SFX:Play|name=whoosh_fast|offset=0.2|baseVolume=0.6}

10
00:00:29,600 --> 00:00:33,900
[Mochi]{Camera:Static|position=0.1,0.5,2.4|lookAt=0.1,0.45,0.6} 吵什么吵。今天，周六。
{SFX:Play|name=record_scratch|offset=0|baseVolume=0.9}{Position:Yuki|x=0|y=0.01|z=0.5|face=forward}{Position:Mochi|x=0.1|y=0.01|z=0.6|face=forward}{Position:Gulu|x=-2.6|y=0.01|z=0.3|face=right}{SceneDirector:Gaze|mode=free}

11
00:00:34,100 --> 00:00:36,800
[Yuki]{FaceSurprised}{Camera:Static|position=0,1.1,2.2|lookAt=0,1.0,0.5} 你……你说什么？
{SceneDirector:Gaze|mode=auto}

12
00:00:37,000 --> 00:00:41,100
[Mochi]{Camera:Static|position=0.1,0.5,2.4|lookAt=0.1,0.45,0.6} 周六。不用上学。喵。
{SceneDirector:Gaze|mode=free}

13
00:00:41,300 --> 00:00:44,600
[Yuki]{FaceAngry}{Animation:StompFoot|character=Yuki}{Camera:Static|position=0.2,1.2,3.0|lookAt=0.2,0.9,0.5} 那我刚才百米冲刺是为了什么？！
{SceneDirector:Gaze|mode=auto}{Position:Gulu|x=-1.3|y=0.01|z=0.4|face=Yuki}

14
00:00:44,800 --> 00:00:48,200
[Gulu]{Camera:Static|position=-0.5,1.1,2.6|lookAt=-1.3,0.8,0.4} 检测到心率爆表，唤醒程序圆满成功！

15
00:00:48,400 --> 00:00:51,400
[Yuki]{FaceAngry}{Animation:PointForward|character=Yuki}{Camera:Static|position=0,1.1,2.2|lookAt=0,1.0,0.5} 你们两个，给我出去——！
{Event:Move|character=Gulu|x=2.6|z=0.3|duration=2.8}{Animation:Walk|character=Gulu}

16
00:00:51,600 --> 00:00:56,200
[Narrator]{Camera:Static|position=0.2,1.3,3.6|lookAt=-1.5,0.8,0.3} 于是小雪钻回被窝，三秒钟后，睡着了。
{Event:Move|character=Yuki|x=-4.6|z=-0.4|duration=2.2}{Animation:Walk|character=Yuki|stride=0.3|legLift=low|frequency=1.7}{FaceHappy}{SFX:Play|name=impact_thud|offset=2.4|baseVolume=0.5}

17
00:00:56,400 --> 00:00:59,300
[Mochi]{Camera:Static|position=0.1,0.5,2.4|lookAt=0.1,0.45,0.6} 可是，我饿了。
{Position:Mochi|x=0.1|y=0.01|z=0.6|face=forward}{SceneDirector:Gaze|mode=free}

18
00:00:59,500 --> 00:01:01,500
[Yuki]{Exaggeration:comedy_shock|intensity=1.0}{Camera:Static|position=0.1,0.5,2.4|lookAt=0.1,0.45,0.6} 啊————！！
{SceneDirector:Gaze|mode=free}

19
00:01:01,300 --> 00:01:02,000
{Transition:Iris|duration=0.7}
