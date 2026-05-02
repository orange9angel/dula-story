1
00:00:00,000 --> 00:00:04,000
@NightStreetScene
{Position:Xiaoyue|x=-2|z=0|face=Xingzai}{Position:Xingzai|x=2|z=0|face=Xiaoyue}
[Xiaoyue]{Nod} （环顾四周）

2
00:00:04,000 --> 00:00:08,000
[Xiaoyue]{WaveHand}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=6}{Voice:happy} 星仔！我们好像掉错地方了？
{Position:Xiaoyue|x=-2|z=0|face=Xingzai}{Position:Xingzai|x=2|z=0|face=Xiaoyue}

3
00:00:08,000 --> 00:00:15,000
[Xingzai]{LookUp}{Camera:CloseUp|characterName=Xingzai|sideAngle=0|distance=4.0}{Voice:calm} 时光机显示，这里是21世纪的地球。能量只剩3%了。

4
00:00:15,000 --> 00:00:18,500
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=0|distance=4.0}{Voice:excited} 3%？！那我们要怎么回未来啊！

5
00:00:18,500 --> 00:00:24,500
[Xingzai]{PointForward}{Camera:CloseUp|characterName=Xingzai|sideAngle=0|distance=4.0}{Voice:worried} 等等，我的探测器有反应！这附近有另一台时光机的信号！

6
00:00:24,500 --> 00:00:29,500
[Xiaoyue]{FlailArms}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=-10|distance=4.0}{Voice:panic} 真的吗？！在哪里在哪里？！快带我去！

7
00:00:29,500 --> 00:00:38,000
[Xingzai]{ReachOut}{Camera:CloseUp|characterName=Xingzai|sideAngle=-5|distance=4.0}{Voice:worried} 信号来自那边那栋房子。但是小月，我们这样冒昧拜访，会不会被当成入侵者？

8
00:00:38,000 --> 00:00:47,000
[Xiaoyue]{ScratchHead}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=-5|distance=4.0}{Voice:defiant} 怕什么！我们可是来自3026年的星际旅行者！虽然现在是步行旅行者。

9
00:00:47,000 --> 00:00:52,500
[Xingzai]{Think}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=6}{Voice:exasperated} 步行旅行者，说出去会被别的星际旅行者笑一千年。

10
00:00:52,500 --> 00:00:56,500
@NightRoomScene{Transition:Fade|duration=1.5}
{Position:Xiaoyue|x=-3|z=2|face=right}{Position:Xingzai|x=3|z=2|face=left}{Position:Doraemon|x=0|z=0|face=forward}
[Xiaoyue]{Nod}{Camera:TwoShot|left=Xiaoyue|right=Doraemon|distance=5}{Voice:happy} 请问，这里是野比大雄家吗？

11
00:00:56,500 --> 00:01:01,000
[Doraemon]{SurprisedJump}{Camera:Static|position=0,3,8|lookAt=0,1.5,0}{Voice:excited} 诶？！你们是谁？！怎么知道大雄的名字？！

12
00:01:01,000 --> 00:01:09,000
[Xingzai]{TakeOutFromPocket}{Camera:CloseUp|characterName=Xingzai|sideAngle=0|distance=4.0}{Voice:proud} 我们是来自3026年的星际旅行者！我的探测器显示，您这里有一台时光机！

13
00:01:09,000 --> 00:01:15,000
[Doraemon]{ScratchHead}{Camera:Static|position=0,3,10|lookAt=0,1.5,0}{Voice:exasperated} 3026年，时光机，你们该不会是未来百货公司派来的吧？

14
00:01:15,000 --> 00:01:18,500
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=5|distance=4.0}{Voice:excited} 未来百货公司？！您也知道？！

15
00:01:18,500 --> 00:01:26,500
[Doraemon]{HandsOnHips}{Camera:CloseUp|characterName=Doraemon|sideAngle=5|distance=4.0}{Voice:proud} 当然！我的时光机就是从22世纪的未来百货公司买的！说吧，你们要去哪里？

16
00:01:26,500 --> 00:01:33,500
[Xingzai]{FlyPose}{Camera:Static|position=0,3,8|lookAt=0,1.5,0}{Voice:excited} 哆啦A梦先生，您能送我们去3026年的仙女座星际港吗？我们的能量快用完了！

17
00:01:37,500 --> 00:01:45,500
[Doraemon]{ReachOut}{Camera:Static|position=-2,3,6|lookAt=2,1.5,0}{Voice:happy} 没问题！跟我来！时光机就在大雄房间的抽屉里！坐我的时光机送你们回去！
{Event:OpenDoor}{Event:Move|character=Doraemon|x=11|z=2|duration=6.0}{Event:Move|character=Xiaoyue|x=11|z=2|duration=6.0}{Event:Move|character=Xingzai|x=11|z=2|duration=6.0}

18
00:01:49,500 --> 00:01:53,500
@DrawerScene{Transition:Fade|duration=1.5}
{Position:Doraemon|x=-1.2|y=0|z=2|face=back}{Position:Xiaoyue|x=0|y=0|z=2.5|face=back}{Position:Xingzai|x=1.2|y=0|z=2|face=back}
[Doraemon]{PointForward}{Camera:Static|position=0,3,6|lookAt=0,1.5,0}{Voice:happy} 时光机就在这个抽屉里！看我的！

19
00:01:53,500 --> 00:01:55,500
{Event:OpenDrawer}
[Doraemon]{PullOpenDrawer}{Camera:Static|position=0,3,5|lookAt=0,1.5,-2}{SFX:Play|name=slide_wood|offset=0.0}
（拉开抽屉——）

20
00:01:55,500 --> 00:01:59,500
[Xiaoyue]{SurprisedJump}{Camera:Static|position=0,3,6|lookAt=0,1.5,0}{Voice:excited} 抽屉？！这么小？！里面在发光？！

21
00:01:59,500 --> 00:02:03,500
[Xingzai]{Nod}{Camera:Static|position=0,3,6|lookAt=0,1.5,0}{Voice:calm} 小月，时光机是四次元道具，里面比外面大得多。

22
00:02:03,500 --> 00:02:06,000
[Doraemon]{Jump}{Event:Move|character=Doraemon|x=-0.5|y=0|z=-2|duration=0.8}{Camera:Static|position=0,3,6|lookAt=0,1.5,-1}{SFX:Play|name=whoosh_fast|offset=0.2} 那我先跳了！

23
00:02:05,000 --> 00:02:07,500
[Xiaoyue]{Jump}{Event:Move|character=Xiaoyue|x=0|y=0|z=-2|duration=0.8}{Voice:happy} 哇——！等等我！
{Position:Doraemon|x=-0.5|y=1.5|z=-2|face=back}

24
00:02:07,500 --> 00:02:10,500
[Xingzai]{Jump}{Event:Move|character=Xingzai|x=0.5|y=0|z=-2|duration=0.8}{Voice:exasperated} 等等我！
{Position:Doraemon|x=-0.5|y=1.5|z=-2|face=back}

25
00:02:10,500 --> 00:02:18,000
@TimeTunnelScene{Transition:Fade|duration=1.0}
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=3.0|z=-1.5|face=forward}{Event:Hide|character=Nobita}
[Xiaoyue]{Celebrate}{Camera:Static|position=0,3,8|lookAt=0,1,0}{Voice:happy} 哇！星星变成面条了！不对，是线条！

26
00:02:18,000 --> 00:02:23,000
{Event:Show|character=Nobita}{Event:Move|character=Nobita|x=1.0|y=0.1|z=-1.5|duration=0.8}{SFX:Play|name=fall_whistle|offset=0.0}{SFX:Play|name=impact_thud|offset=0.7}
[Nobita]{SurprisedJump}{Camera:CloseUp|characterName=Nobita|sideAngle=0|distance=4.0}{Voice:panic} 哎哟！疼死我了！这是哪儿啊？
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}

27
00:02:23,000 --> 00:02:26,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Doraemon]{SurprisedJump}{Camera:CloseUp|characterName=Doraemon|sideAngle=0|distance=4.0}{Voice:exasperated} 大雄？！你怎么也跟来了？！

28
00:02:26,500 --> 00:02:33,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Nobita]{ScratchHead}{Camera:CloseUp|characterName=Nobita|sideAngle=5|distance=4.0}{Voice:whiny} 我上厕所听到你们要去3026年，我想来看看未来有没有考试……

29
00:02:33,500 --> 00:02:39,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Xingzai]{Nod}{Camera:CloseUp|characterName=Xingzai|sideAngle=0|distance=4.0}{Voice:calm} 3026年没有考试，知识都是直接下载到大脑的。

30
00:02:39,500 --> 00:02:44,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Nobita]{Celebrate}{Camera:CloseUp|characterName=Nobita|sideAngle=0|distance=4.0}{Voice:excited} 真的吗？！那我也要留下来！

31
00:02:44,500 --> 00:02:51,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Doraemon]{HandsOnHips}{Camera:TwoShot|left=Doraemon|right=Nobita|distance=5}{Voice:exasperated} 不行！时光机快没电了！快回去！而且这里没有铜锣烧吃！

32
00:02:51,500 --> 00:02:55,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Nobita]{FlailArms}{Camera:CloseUp|characterName=Nobita|sideAngle=-5|distance=4.0}{Voice:whiny} 那好吧……铜锣烧比较重要……

33
00:02:55,500 --> 00:03:01,500
{Position:Doraemon|x=-2.0|y=0.1|z=1.5|face=forward}{Position:Xiaoyue|x=2.0|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=-1.0|y=0.1|z=-1.5|face=forward}{Position:Nobita|x=1.0|y=0.1|z=-1.5|face=forward}
[Xingzai]{ClapHands}{Camera:CloseUp|characterName=Xingzai|sideAngle=0|distance=4.0}{Voice:exasperated} 哆啦A梦先生，您的时光机好像比我们的快十倍，我要晕机了……
{Event:Move|character=Xingzai|y=10|duration=2.0}

34
00:03:01,500 --> 00:03:10,500
@FutureCityScene{Transition:Fade|duration=2.0}
{Position:Xiaoyue|x=-2|z=3|face=forward}{Position:Xingzai|x=2|z=3|face=forward}{Position:Doraemon|x=-1|z=5|face=forward}{Position:Nobita|x=1|z=5|face=forward}
[Xiaoyue]{WaveHand}{Camera:Static|position=0,2,10|lookAt=0,1.5,0}{Voice:happy} 星仔快看！我们到3026年了！仙女座星际港！比我想象的还要大！

35
00:03:10,500 --> 00:03:15,000
{Position:Xiaoyue|x=-2|z=3|face=forward}{Position:Xingzai|x=2|z=3|face=forward}{Position:Doraemon|x=-1|z=5|face=forward}{Position:Nobita|x=1|z=5|face=forward}
[Doraemon]{WaveHand}{Camera:Static|position=0,3,8|lookAt=0,1.5,0}{Voice:happy} 那我带大雄回去了！常来星际港玩啊！
{Event:Move|character=Doraemon|x=-4|y=3|z=6|duration=0.6}{Event:Move|character=Nobita|x=4|y=3|z=6|duration=0.6}

36
00:03:15,000 --> 00:03:20,000
{Position:Xiaoyue|x=-2|z=3|face=forward}{Position:Xingzai|x=2|z=3|face=forward}
[Xiaoyue]{WaveHand}{Camera:Static|position=0,2,10|lookAt=0,1.5,0}{Voice:happy} 再见！谢谢你们！
{Event:Move|character=Xiaoyue|x=-1|z=2|duration=1.5}{Event:Move|character=Xingzai|x=1|z=2|duration=1.5}

37
00:03:20,000 --> 00:03:26,000
{Event:SummonCourierShip}{Camera:Static|position=0,3,10|lookAt=0,1.5,0}
[Xingzai]{LookUp}{Camera:Static|position=0,3,10|lookAt=0,1.5,0}{Voice:excited} 我们的星际飞船来了！来得真准时！
{Position:Xiaoyue|x=-1|z=2|face=forward}{Position:Xingzai|x=1|z=2|face=forward}

38
00:03:26,000 --> 00:03:33,000
{Event:Move|character=Xiaoyue|x=-4|z=-3|duration=2.0}{Event:Move|character=Xingzai|x=4|z=-3|duration=2.0}
[Xiaoyue]{Celebrate}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=6}{Voice:happy} 哆啦A梦先生，后会有期！3026年再见！

39
00:03:33,000 --> 00:03:40,000
[Xingzai]{WaveHand}{Camera:Static|position=0,4,12|lookAt=0,2,-3}{Voice:happy} 起飞！目标仙女座主星！

40
00:03:40,000 --> 00:03:47,000
{Event:Move|character=Xiaoyue|x=-3.5|y=1.4|z=-4|duration=1.5}{Event:Move|character=Xingzai|x=3.5|y=1.4|z=-4|duration=1.5}
[Xiaoyue]{WaveHand}{Camera:FollowCharacter|characterName=Xiaoyue|distance=8|height=3}{Voice:happy} 再见——！

41
00:03:47,000 --> 00:03:55,000
{Event:DepartCourierShip}{Event:Move|character=Xiaoyue|x=-3.5|y=1.4|z=-4|duration=0.1}{Event:Move|character=Xingzai|x=3.5|y=1.4|z=-4|duration=0.1}{Camera:Static|position=0,8,18|lookAt=0,5,-5}

42
00:03:55,000 --> 00:04:02,000
@SpaceshipCabinScene{Transition:Fade|duration=1.5}
{Position:Xiaoyue|x=-1.2|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=1.2|y=0.1|z=1.5|face=forward}
[Xiaoyue]{Celebrate}{Camera:Static|position=-1.2,1.5,4|lookAt=-1.2,1,1.5}{Voice:happy} 我们成功起飞了！这艘飞船比我想象的还要酷！

43
00:04:02,000 --> 00:04:08,000
{Position:Xiaoyue|x=-1.2|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=1.2|y=0.1|z=1.5|face=forward}
[Xingzai]{Nod}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=4}{Voice:calm} 目标仙女座主星，预计航行时间三天。小月，准备好开始我们的星际快递之旅了吗？

44
00:04:08,000 --> 00:04:15,000
{Position:Xiaoyue|x=-1.2|y=0.1|z=1.5|face=forward}{Position:Xingzai|x=1.2|y=0.1|z=1.5|face=forward}
[Xiaoyue]{WaveHand}{Camera:Static|position=0,2,8|lookAt=0,1,1.5}{Voice:happy} 准备好了！出发——！
