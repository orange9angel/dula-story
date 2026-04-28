1
00:00:00,000 --> 00:00:03,000
@RoomScene{Music:Play|name=room_theme|fadeIn=1.0|baseVolume=0.6|endTime=55.0}
{Position:Doraemon|x=-1.5|z=0|face=Nobita}{Position:Nobita|x=1.5|z=0|face=Doraemon}

2
00:00:03,000 --> 00:00:07,000
[Doraemon]{WaveHand}{Camera:TwoShot|characterA=Doraemon|characterB=Nobita|distance=4} 大雄！暑假到了，我们去海边玩吧！

3
00:00:07,000 --> 00:00:14,000
[Nobita]{TriumphPose}{Camera:ZoomIn|characterName=Nobita|distance=2.5} 真的吗？太棒了！我要堆沙堡、捡贝壳、还要游泳！

4
00:00:14,000 --> 00:00:17,000
[Doraemon]{Prop:ball|character=Doraemon}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 我已经准备好游泳圈和沙滩球了！

5
00:00:17,000 --> 00:00:20,000
[Nobita]{Camera:Static|position=-4,2.5,4|lookAt=0,1.2,0} 静香也会去吗？

6
00:00:20,000 --> 00:00:24,000
[Doraemon]{Nod}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 当然！她说要教我们游泳呢！

7
00:00:24,000 --> 00:00:28,000
[Nobita]{Walk}{Event:Move|character=Doraemon|x=0|z=4|duration=2.0}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 太好了！我们快走吧！

8
00:00:28,000 --> 00:00:33,000
@BeachScene{Transition:Fade|duration=1.0}{Music:Play|name=park_theme|fadeIn=1.5|baseVolume=0.7|endTime=55.0}
{Position:Doraemon|x=-3|z=3|face=center}{Position:Nobita|x=3|z=3|face=center}{Position:Shizuka|x=0|z=-3|face=center}
[Shizuka]{WaveHand}{Camera:Static|position=0,5,10|lookAt=0,1.5,0} 你们来啦！这里的沙滩好舒服呢！

9
00:00:33,000 --> 00:00:38,000
[Nobita]{Event:Move|character=Nobita|x=0|y=-0.6|z=-8|duration=2.0|action=Swim}{Camera:Static|position=0,5,10|lookAt=0,1.5,0} 哇——！我要第一个冲进海里——！

10
00:00:38,000 --> 00:00:43,000
[Shizuka]{Camera:CloseUp|characterName=Shizuka|sideAngle=10} 等等！先做好热身运动，不然会抽筋的！

11
00:00:43,000 --> 00:00:48,000
{Position:Shizuka|x=2|z=-2|face=Doraemon}{Event:SharkAppear}
[Doraemon]{PanicSpin}{Camera:Static|position=0,5,10|lookAt=0,1.5,0} 大雄！后面有鲨鱼——！快游回来——！

12
00:00:48,000 --> 00:00:55,000
[Nobita]{Event:Move|character=Nobita|x=0|y=0|z=6|duration=1.5|action=Swim}{RunAway}{Camera:Shake|intensity=0.3} 救命啊——！哆啦A梦救我——！
