1
00:00:00,000 --> 00:00:01,500
@RoomScene{Music:Play|name=room_theme|fadeIn=2.0|baseVolume=0.68|endTime=35.0}

2
00:00:03,000 --> 00:00:08,500
[Nobita]{Camera:CloseUp|characterName=Nobita|sideAngle=15} 鸟儿好自由啊……能在天上飞来飞去，真好……

3
00:00:09,500 --> 00:00:14,000
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 我也好想体验一下飞翔的感觉啊……

4
00:00:16,000 --> 00:00:21,500
[Doraemon]{WaveHand}{Camera:TwoShot|characterA=Doraemon|characterB=Nobita|distance=4} 大雄！又在发什么呆呢？功课做完了吗？

5
00:00:23,500 --> 00:00:29,000
[Nobita]{Camera:ZoomIn|targetPos=1.5,1.5,0|distance=2.5} 哆啦A梦！你说过你是来自未来的机器人对吧？

6
00:00:31,000 --> 00:00:35,500
[Doraemon]{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 是啊，怎么了？

7
00:00:37,500 --> 00:00:44,000
[Nobita]{Camera:Shake|intensity=0.2} 那未来人肯定有办法让人类飞上天的吧！我想要飞！像鸟一样自由飞翔！

8
00:00:46,000 --> 00:00:51,500
[Doraemon]{ScratchHead}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 飞行啊……让我想想口袋里有什么合适的道具……

9
00:00:53,500 --> 00:00:59,500
[Doraemon]{TakeOutFromPocket}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 找到了！这个给你——竹蜻蜓！

10
00:01:01,500 --> 00:01:07,000
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 竹蜻蜓？就是小时候玩的那种吗？这怎么可能让人飞起来？

11
00:01:09,000 --> 00:01:16,500
[Doraemon]{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 这可不是普通的竹蜻蜓！把它放在头顶，用脑电波控制方向，时速最高八十公里呢！

12
00:01:18,500 --> 00:01:24,000
[Nobita]{TriumphPose}{Camera:ZoomIn|targetPos=1.5,1.5,0|distance=2.5} 真的吗？！太棒了！快给我试试！

13
00:01:26,000 --> 00:01:30,500
[Nobita]{Nod}{Prop:TakeCopter|character=Nobita}{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 好，戴在头顶……这样对吗？

14
00:01:32,500 --> 00:01:39,000
[Doraemon]{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 对！然后身体放松，心里想着"我要往上飞"！

15
00:01:41,000 --> 00:01:48,500
[Nobita]{FlyPose}{Camera:ZoomOut|targetPos=0,1.5,0|distance=15}{Event:Move|character=Nobita|y=3|duration=2.0|relative=true} 我要往上飞——！哇啊啊啊——！

16
00:01:50,500 --> 00:01:57,000
[Nobita]{FlailArms}{Camera:Shake|intensity=0.4} 好痛！天花板好低啊——！

17
00:01:59,000 --> 00:02:05,500
[Doraemon]{Camera:Pan|offset=0,2,0|lookAt=0,3,0} 大雄！冷静一点！慢慢控制高度！

18
00:02:07,500 --> 00:02:15,000
[Nobita]{FlailArms}{Camera:Shake|intensity=0.3}{Event:Move|character=Nobita|x=2|y=-1|z=2|duration=1.5|relative=true} 哇——！往左！不对，往右！啊——！停不下来了——！

19
00:02:17,000 --> 00:02:24,000
[Nobita]{FlailArms}{Camera:Shake|intensity=0.5} 哇啊！我的书架！啊！台灯！

20
00:02:26,000 --> 00:02:32,500
[Doraemon]{Camera:ZoomOut|targetPos=0,1.5,0|distance=12} 小心我的铜锣烧！啊——！我的抽屉也倒了！

21
00:02:34,500 --> 00:02:41,000
[Nobita]{Camera:Static|position=0,3,6|lookAt=0,1.5,0} 呼……呼……好像……掌握一点诀窍了……

22
00:02:43,000 --> 00:02:49,500
[Nobita]{TriumphPose}{Camera:Static|position=0,3,6|lookAt=0,1.5,0} 哼哼！也不过如此嘛！我已经完全会飞了！

23
00:02:51,500 --> 00:02:58,000
[Doraemon]{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 别得意太早了！你才刚学会，先在家里练习一下——

24
00:03:00,000 --> 00:03:07,500
[Nobita]{Camera:ZoomOut|targetPos=0,2,0|distance=20}{Event:Move|character=Nobita|y=5|z=-10|duration=2.0|relative=true} 我要去外面看看世界！拜拜——！

25
00:03:08,500 --> 00:03:09,500
{Transition:ZoomBlur|duration=0.5|intensity=1.5}

26
00:03:09,500 --> 00:03:12,000
@ParkScene{Camera:ZoomOut|targetPos=0,1.5,0|distance=35}{Music:Play|name=park_theme|fadeIn=1.5|baseVolume=0.72|endTime=55.0}{Position:Doraemon|x=-5|y=0.01|z=3|face=center}{Position:Nobita|x=0|y=8|z=0|face=center}{Position:Shizuka|x=5|y=0.01|z=3|face=center}

26
00:03:14,000 --> 00:03:21,500
[Shizuka]{Camera:Static|position=8,3,4|lookAt=0,1.5,0} 今天的天气真好呢。适合在公园里散步。

27
00:03:23,500 --> 00:03:31,000
[Nobita]{FlyPose}{Camera:Static|position=-18,10,0|lookAt=0,1.5,0}{Event:Move|character=Nobita|y=3|duration=2.0|relative=true} 静香——！你看——！我在飞——！

28
00:03:33,000 --> 00:03:39,500
[Shizuka]{Camera:ReactionShot|characterName=Shizuka} 大、大雄？！你怎么在天上？！那是……竹蜻蜓？

29
00:03:41,500 --> 00:03:49,000
[Nobita]{Camera:OverShoulder|subject=Nobita|over=Shizuka|distance=3} 没错！是哆啦A梦的神奇道具！超厉害的对吧！我现在是飞行少年了！

30
00:03:51,000 --> 00:03:56,500
[Shizuka]{Camera:Static|position=8,3,4|lookAt=0,1.5,0} 好厉害……但是看起来很危险啊，你要小心哦。

31
00:03:58,500 --> 00:04:06,000
[Nobita]{FlyPose}{Camera:Orbit|center=0,1.5,0|distance=15}{Event:Move|character=Nobita|y=5|duration=1.5|relative=true} 看我的特技！急速上升——！

32
00:04:08,000 --> 00:04:15,500
[Nobita]{FlyPose}{Camera:Shake|intensity=0.3}{Event:Move|character=Nobita|y=-2|z=3|duration=1.0|relative=true} 再来一个！俯冲——！然后后空翻——！

33
00:04:17,500 --> 00:04:23,000
[Shizuka]{ClapHands}{Camera:Static|position=8,3,4|lookAt=0,1.5,0} 哇！好厉害！

34
00:04:25,000 --> 00:04:32,500
[Doraemon]{Camera:Static|position=18,6,0|lookAt=0,1.5,0} 大雄——！我说过了不要飞太高！竹蜻蜓的电池是有限的！

35
00:04:34,500 --> 00:04:42,000
[Nobita]{FlyPose}{Camera:ZoomOut|targetPos=0,1.5,0|distance=25} 没关系！我还想飞得更高！感受风吹过脸颊的感觉——！

36
00:04:44,000 --> 00:04:51,500
[Nobita]{FlyPose}{Camera:ZoomOut|targetPos=0,1.5,0|distance=40}{Event:Move|character=Nobita|y=8|duration=2.0|relative=true} 哇——！上面的风景好漂亮——！我能看到整个城市——！

37
00:04:53,500 --> 00:05:01,000
[Doraemon]{PanicSpin}{Camera:ZoomIn|targetPos=0,1.5,0|distance=5} 笨蛋！快下来！电池快没电了！到时候你会掉下来的！

38
00:05:03,000 --> 00:05:11,500
[Nobita]{FallPanic}{Camera:TrackingCloseUp|characterName=Nobita}{Music:Play|name=chaos_theme|fadeIn=0.5|baseVolume=0.75|endTime=45.0}{Event:Move|character=Nobita|y=-3|duration=1.0|relative=true} 啊——！怎么回事——！竹蜻蜓转得好慢——！啊——！开始往下掉了——！

39
00:05:13,500 --> 00:05:19,000
[Shizuka]{Camera:Shake|intensity=0.4} 大雄——！不好了大雄——！

40
00:05:21,000 --> 00:05:29,500
[Nobita]{FallPanic}{Camera:Shake|intensity=0.5}{Event:Move|character=Nobita|y=-8|duration=3.0|relative=true} 救命啊——！哆啦A梦——！救我——！

41
00:05:31,500 --> 00:05:40,000
[Doraemon]{ReachHand}{Prop:TakeCopter|character=Doraemon}{Camera:WhipPan|fromTarget=0,10,0|toTarget=0,5,0|duration=0.5} 真是的！每次都这么乱来！备用竹蜻蜓！

42
00:05:42,000 --> 00:05:51,000
[Doraemon]{ReachHand}{Camera:Static|position=0,10,8|lookAt=0,1.5,0}{Event:Move|character=Doraemon|y=10|duration=2.5|relative=true} 大雄！把手给我！

43
00:05:53,000 --> 00:06:01,000
[Nobita]{Camera:Shake|intensity=0.4} 哆啦A梦——！我的手——！快够不到了——！

44
00:06:03,000 --> 00:06:12,000
[Doraemon]{ReachHand}{Camera:ZoomIn|targetPos=0,5,0|distance=4}{Event:Move|character=Nobita|y=-2|duration=2.0|relative=true} 抓紧了！我带你慢慢降落！

45
00:06:14,000 --> 00:06:22,500
[Nobita]{Camera:Static|position=-4,5,4|lookAt=0,1.5,0} 好、好可怕……我再也不敢飞那么高了……

46
00:06:24,500 --> 00:06:32,000
[Nobita]{CrashLand}{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0}{Event:Move|character=Nobita|y=-3|duration=2.0|relative=true} 哇——！终于着地了……

47
00:06:34,000 --> 00:06:41,500
[Nobita]{Tremble}{Camera:Shake|intensity=0.2} 头好晕……腿也软了……天旋地转的……

48
00:06:43,500 --> 00:06:50,000
[Shizuka]{Camera:Static|position=8,3,4|lookAt=0,1.5,0} 大雄，你真的没事吗？要不要去医务室？

49
00:06:52,000 --> 00:06:59,500
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 不用了……我只是……需要休息一下……

50
00:07:01,500 --> 00:07:09,000
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 以后……我还是乖乖走路吧……飞行这种事……太刺激了……

51
00:07:11,000 --> 00:07:18,500
[Doraemon]{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 你每次都这么说。下次看到什么好玩的，还不是一样扑上去。

52
00:07:20,500 --> 00:07:27,000
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 才、才不会呢！这次是真的学乖了！

53
00:07:29,000 --> 00:07:35,500
[Doraemon]{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 好好好，我等着看。
