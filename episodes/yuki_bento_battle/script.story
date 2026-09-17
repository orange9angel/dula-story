1
00:00:00,000 --> 00:00:00,100
@YukiRoomScene
{Position:Yuki|x=3.4|y=0.01|z=-0.8|face=right}{Position:Mochi|x=-0.3|y=0.01|z=0.6|face=right}{Position:Gulu|x=-2.2|y=0.01|z=1.8|face=right}{Position:Flash|x=0|y=4.4|z=-4.6|face=forward}{Position:Dodo|x=2.9|y=0.01|z=4.4|face=left}
{SceneDirector:Gaze|mode=auto}
{Music:Play|name=bento_chase_theme|fadeIn=0.8|baseVolume=0.5|endTime=100}
{SFX:Play|name=morning_birds|endTime=100|baseVolume=0.3}

2
00:00:00,400 --> 00:00:06,000
[Narrator]{Camera:Static|position=0.4,1.5,3.8|lookAt=3.6,1.0,-2.2} 周六的早上，小雪的特制便当闪亮登场。

3
00:00:06,300 --> 00:00:11,900
[Yuki]{FaceHappy}{Camera:Static|position=3.4,1.15,0.9|lookAt=3.4,0.95,-0.8} 双层特制便当！放学之前，谁都不许碰！

4
00:00:12,200 --> 00:00:14,200
[Mochi]{Camera:Static|position=-0.3,0.5,2.4|lookAt=-0.3,0.45,0.6} ……喵。

5
00:00:14,500 --> 00:00:18,400
[Yuki]{FaceAngry}{Camera:Static|position=3.4,1.15,0.9|lookAt=3.4,0.95,-0.8} 年糕！口水滴到地毯上了！

6
00:00:18,700 --> 00:00:24,900
[Narrator]{Camera:Static|position=0.4,1.5,3.4|lookAt=0.2,1.8,-2.8} 窗边黑影一闪——老江湖闪电，闻着味儿来了。
{Event:Move|character=Flash|x=0.6|y=0.01|z=-0.3|duration=0.9}{SFX:Play|name=whoosh_fast|offset=0.2|baseVolume=0.7}

7
00:00:25,200 --> 00:00:29,700
[Flash]{Camera:Static|position=0.6,0.55,1.8|lookAt=0.6,0.45,-0.3} 唷。好香的虾。借老哥验验货。

8
00:00:30,000 --> 00:00:34,800
[Yuki]{FaceSurprised}{Camera:Static|position=3.4,1.15,0.9|lookAt=3.4,0.95,-0.8} 啊——！我的便当！年糕，拦住他！

9
00:00:35,100 --> 00:00:37,300
[Mochi]{Camera:Static|position=-0.3,0.5,2.4|lookAt=-0.3,0.45,0.6} 凭什么是我。

10
00:00:37,600 --> 00:00:42,100
[Gulu]{Camera:Static|position=-0.4,1.3,3.4|lookAt=0.6,0.7,0.0} 检测到入侵者！防盗模式，启动！
{Event:Move|character=Flash|x=4.2|z=-1.4|duration=1.1}{Animation:Walk|character=Flash|frequency=3.2|stride=0.5}{Event:Move|character=Yuki|x=1.2|z=0.7|duration=1.2}{Animation:Run|character=Yuki|legLift=low|stride=0.42|armSwing=0.6|frequency=4.6|lean=0.10}{Event:Move|character=Gulu|x=2.3|z=0.5|duration=2.0}{Animation:Walk|character=Gulu}{SFX:Play|name=dash_whoosh|offset=0.3|baseVolume=0.7}{SFX:Play|name=takecopter_spin|offset=0.5|baseVolume=0.4}

11
00:00:42,400 --> 00:00:45,800
[Gulu]{Camera:Static|position=1.2,1.1,2.6|lookAt=2.3,0.8,0.5} 目标锁定——全员恶人！
{SFX:Play|name=alarm_clock|offset=0.3|baseVolume=0.8}

12
00:00:46,100 --> 00:00:50,600
[Dodo]{FaceHappy}{Camera:Static|position=1.2,1.2,3.4|lookAt=1.8,0.7,2.0} 小雪姐姐！玩抓人吗！带我一个！
{Event:Move|character=Dodo|x=1.7|z=1.3|duration=1.3}{Animation:Run|character=Dodo|legLift=low|stride=0.42|armSwing=0.6|frequency=4.6|lean=0.10}

13
00:00:50,900 --> 00:00:54,300
[Yuki]{FaceSurprised}{Camera:Static|position=1.8,1.2,3.0|lookAt=1.8,0.8,-0.2} 豆豆别添乱——哇啊！！
{Event:Move|character=Flash|x=0.4|z=0.5|duration=0.8}{Exaggeration:comedy_shock|intensity=0.7}{SFX:Play|name=whoosh_fast|offset=0.1|baseVolume=0.6}

14
00:00:54,600 --> 00:00:57,400
[Narrator]{Camera:Static|position=0.2,1.0,2.7|lookAt=0.2,0.2,0.9} 便当盒，飞起来了。
{SFX:Play|name=impact_thud|offset=0.6|baseVolume=0.7}

15
00:00:57,700 --> 00:00:59,900
[Flash]{Camera:Static|position=0.7,0.55,2.2|lookAt=0.5,0.35,0.9} 到手——……嗯？
{Event:Move|character=Flash|x=0.75|z=0.85|duration=0.5}{Animation:Walk|character=Flash|frequency=3.2|stride=0.5}{Event:Move|character=Mochi|x=-0.05|z=0.8|duration=0.6}{Animation:Walk|character=Mochi|frequency=3.0|stride=0.4}

16
00:01:00,200 --> 00:01:02,400
[Mochi]{Camera:Static|position=0.2,0.45,2.3|lookAt=0.2,0.35,0.8} 此山是我开。

17
00:01:02,700 --> 00:01:05,500
[Flash]{Camera:Static|position=0.7,0.55,2.2|lookAt=0.7,0.4,0.5} 左边！……右边？……行吧。
{Event:Move|character=Flash|x=1.7|z=0.1|duration=1.4}{Animation:Walk|character=Flash|frequency=2.2|stride=0.4}

18
00:01:05,800 --> 00:01:07,800
{Camera:Static|position=0.2,0.9,2.4|lookAt=0.2,0.15,0.9}

19
00:01:08,100 --> 00:01:12,600
[Yuki]{FaceSurprised}{Camera:Static|position=0.4,0.8,2.3|lookAt=0.3,0.35,0.8} 啊……装错了。这是我的减肥餐。
{Event:Move|character=Yuki|x=0.75|z=0.75|duration=0.8}{Animation:Walk|character=Yuki|stride=0.3|legLift=low|frequency=1.7}{SFX:Play|name=record_scratch|offset=0.5|baseVolume=0.9}{SFX:Play|name=bento_pop|offset=0.3|baseVolume=0.8}

20
00:01:12,900 --> 00:01:16,800
[Dodo]{FaceHappy}{Camera:Static|position=1.6,0.9,2.4|lookAt=1.5,0.6,1.2} 哇！兔子饭！我最爱胡萝卜！
{Event:Move|character=Dodo|x=1.0|z=1.05|duration=1.0}{Animation:Walk|character=Dodo|frequency=2.6|stride=0.4}

21
00:01:17,100 --> 00:01:19,400
[Flash]{Camera:Static|position=0.6,1.5,4.2|lookAt=0.3,1.0,-1.5} 青椒。……告辞。
{Event:Move|character=Flash|x=0|y=4.4|z=-4.6|duration=1.5}{SFX:Play|name=whoosh_fast|offset=0.6|baseVolume=0.7}

22
00:01:19,700 --> 00:01:21,500
[Mochi]{Camera:Static|position=0.6,1.5,4.2|lookAt=0.3,1.0,-1.5} ……同上。
{Event:Move|character=Mochi|x=-3.4|z=0.4|duration=2.4}{Animation:Walk|character=Mochi|frequency=1.4|stride=0.3}

23
00:01:21,800 --> 00:01:26,600
[Yuki]{FaceAngry}{Animation:StompFoot|character=Yuki}{Exaggeration:comedy_shock|intensity=1.0}{Camera:Static|position=1.0,1.15,2.2|lookAt=0.9,0.95,0.6} 你们——！把房间收拾好再走啊！！

24
00:01:26,900 --> 00:01:31,700
[Narrator]{Camera:Static|position=1.3,0.8,2.5|lookAt=1.1,0.4,1.0} 房间没收拾好，但胡萝卜有了归宿。
{SFX:Play|name=carrot_munch|offset=1.0|baseVolume=0.7}

25
00:01:32,000 --> 00:01:35,600
[Dodo]{FaceHappy}{Camera:Static|position=1.3,0.8,2.5|lookAt=1.1,0.5,1.0} 挺甜的呀，姐姐也来一口？

26
00:01:35,900 --> 00:01:39,800
[Yuki]{FaceHappy}{Camera:Static|position=0.7,1.15,2.6|lookAt=0.75,0.9,0.7} ……行吧。下次直接做兔子饭。
{SceneDirector:Gaze|mode=fixed|target=Dodo}

27
00:01:40,100 --> 00:01:41,000
{Transition:Iris|duration=0.8}
