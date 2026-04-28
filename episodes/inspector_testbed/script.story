1
00:00:00,000 --> 00:00:03,000
@RoomScene{Music:Play|name=room_theme|fadeIn=1.0|baseVolume=0.6|endTime=25.0}
{Position:Doraemon|x=-1.5|z=0|face=Nobita}{Position:Nobita|x=1.5|z=0|face=Doraemon}
质检系统启动中……正在扫描房间场景……

2
00:00:03,000 --> 00:00:08,000
@NonExistentScene
[Doraemon]{WaveHand}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 大雄，我们来测试一下新的自动质检机器人吧！

3
00:00:08,000 --> 00:00:13,000
[Nobita]{FlyLikeSuperman}{Camera:ZoomIn|characterName=Nobita|distance=0.5} 好呀！让我先飞一个——哇，这个镜头好近！

4
00:00:13,000 --> 00:00:18,000
[Doraemon]{Camera:Orbit|center=0,1.5,0|distance=8|endAngle=1.57} 机器人，报告当前状态！

5
00:00:18,000 --> 00:00:23,000
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 它说……检测到动画未注册？还有环绕角度只有四分之一？

6
00:00:23,000 --> 00:00:28,000
[Doraemon]{Camera:TwoShot|characterA=Doraemon|characterB=Nobita|distance=4}{Position:Nobita|face=Nobita} 让我看看……嗯，这个站位也有问题。

7
00:00:28,000 --> 00:00:33,000
[Nobita]{SFX:Play|name=nonexistent_sound|offset=0}{Camera:Shake|intensity=0.2} 啊！什么声音？机器人报错了吗？

8
00:00:33,000 --> 00:00:38,000
@ParkScene{Transition:Fade|duration=1.0}{Music:Play|name=park_theme|fadeIn=1.5|baseVolume=0.7|endTime=40.0}
{Position:Doraemon|x=-3|z=2|face=center}{Position:Nobita|x=3|z=2|face=center}
[Doraemon]{Camera:Static|position=0,3,8|lookAt=0,1.5,0} 我们到公园继续测试吧。

9
00:00:38,000 --> 00:00:43,000
[Nobita]{Camera:LowAngle|targetPos=999,999,999|distance=6} 这里的镜头怎么什么都看不见？

10
00:00:43,000 --> 00:00:48,000
[Doraemon]{Camera:Static|position=0,3,8|lookAt=0,1.5,0} 因为目标位置设到虚空去了。好了，测试完成，机器人记录了十个问题。
